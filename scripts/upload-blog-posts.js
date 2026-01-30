#!/usr/bin/env node
/**
 * Blog Post Upload Script
 *
 * Uploads extracted blog posts to the Unified Data Layer database.
 *
 * Usage:
 *   node scripts/upload-blog-posts.js [input-json] [--dry-run]
 *
 * Options:
 *   --dry-run    Preview uploads without making changes
 *   --limit N    Only upload first N posts (for testing)
 *
 * Defaults:
 *   input: data/ryan-blog-posts.json
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 *   - OPENAI_API_KEY in .env
 *   - blog_post data type added to database (migration 018)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { BlogPostProcessor } from '../api/processors/blog-post-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RYAN_COACH_ID = '9185bd98-a828-414f-b335-c607b4ac3d11';
const BATCH_TAG = 'ryan-blog-posts-2026-01';
const DEFAULT_INPUT = path.join(__dirname, '..', 'data', 'ryan-blog-posts.json');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Format embedding for PostgreSQL vector type
 */
function formatEmbeddingForDB(embedding) {
  const formatted = embedding.map(val => {
    const str = val.toPrecision(10);
    return parseFloat(str);
  });
  return '[' + formatted.join(',') + ']';
}

/**
 * Check if a blog post already exists (by title and date)
 */
async function checkExists(title, publishDate) {
  const { data, error } = await supabase
    .from('data_items')
    .select('id')
    .eq('data_type', 'blog_post')
    .eq('coach_id', RYAN_COACH_ID)
    .eq('metadata->>title', title)
    .limit(1);

  if (error) {
    console.error('Error checking existence:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Upload a single blog post
 */
async function uploadPost(post, processor, dryRun = false) {
  const metadata = {
    coach_id: RYAN_COACH_ID,
    title: post.title,
    publish_date: post.publish_date,
    author: 'Ryan Vaughn',
    source: 'newsletter',
    batch_tag: BATCH_TAG,
    skipPIIScrubbing: true // Blog posts are public content, no PII scrubbing needed
  };

  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      title: post.title,
      word_count: post.word_count
    };
  }

  try {
    // Process the blog post (validate, chunk, embed)
    const result = await processor.process(post.content, metadata);

    // Insert data_item
    const { data: dataItem, error: itemError } = await supabase
      .from('data_items')
      .insert({
        data_type: result.dataItem.data_type,
        coach_id: result.dataItem.coach_id,
        client_id: result.dataItem.client_id,
        client_organization_id: result.dataItem.client_organization_id,
        visibility_level: result.dataItem.visibility_level,
        allowed_roles: result.dataItem.allowed_roles,
        raw_content: result.dataItem.raw_content,
        metadata: result.dataItem.metadata,
        session_date: result.dataItem.session_date,
        created_at: result.dataItem.created_at,
        updated_at: result.dataItem.updated_at,
        created_by: result.dataItem.created_by
      })
      .select('id')
      .single();

    if (itemError) {
      throw new Error(`Failed to insert data_item: ${itemError.message}`);
    }

    // Insert chunks
    const chunkInserts = result.chunks.map((chunk, index) => ({
      data_item_id: dataItem.id,
      chunk_index: index,
      content: chunk.content,
      embedding: formatEmbeddingForDB(chunk.embedding),
      metadata: {
        title: post.title,
        publish_date: post.publish_date,
        chunk_number: index + 1,
        total_chunks: result.chunks.length
      }
    }));

    const { error: chunksError } = await supabase
      .from('data_chunks')
      .insert(chunkInserts);

    if (chunksError) {
      // Rollback: delete the data_item
      await supabase.from('data_items').delete().eq('id', dataItem.id);
      throw new Error(`Failed to insert chunks: ${chunksError.message}`);
    }

    return {
      success: true,
      data_item_id: dataItem.id,
      chunks_created: result.chunks.length,
      title: post.title
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      title: post.title
    };
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(args[args.indexOf(limitArg) + 1]) : null;
  const inputPath = args.find(a => !a.startsWith('--') && a.endsWith('.json')) || DEFAULT_INPUT;

  console.log('Blog Post Upload Script');
  console.log('=======================');
  console.log(`Input:   ${inputPath}`);
  console.log(`Coach:   Ryan Vaughn (${RYAN_COACH_ID})`);
  console.log(`Batch:   ${BATCH_TAG}`);
  console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}`);
  if (limit) console.log(`Limit:   ${limit} posts`);
  console.log('');

  // Read input file
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const posts = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const postsToUpload = limit ? posts.slice(0, limit) : posts;

  console.log(`Total posts in file: ${posts.length}`);
  console.log(`Posts to upload: ${postsToUpload.length}`);
  console.log('');

  // Initialize processor
  const processor = new BlogPostProcessor(openai);

  // Check for existing posts
  console.log('Checking for existing posts...');
  const existingPosts = [];
  const newPosts = [];

  for (const post of postsToUpload) {
    const exists = await checkExists(post.title, post.publish_date);
    if (exists) {
      existingPosts.push(post);
    } else {
      newPosts.push(post);
    }
  }

  console.log(`  Already uploaded: ${existingPosts.length}`);
  console.log(`  New posts to upload: ${newPosts.length}`);
  console.log('');

  if (newPosts.length === 0) {
    console.log('No new posts to upload. Done!');
    return;
  }

  // Upload posts
  console.log('Uploading posts...');
  const results = {
    success: [],
    failed: [],
    skipped: existingPosts.map(p => p.title)
  };

  let totalChunks = 0;

  for (let i = 0; i < newPosts.length; i++) {
    const post = newPosts[i];
    const progress = `[${i + 1}/${newPosts.length}]`;

    process.stdout.write(`${progress} "${post.title.substring(0, 40)}..." `);

    const result = await uploadPost(post, processor, dryRun);

    if (result.success) {
      results.success.push(result);
      totalChunks += result.chunks_created || 0;
      console.log(dryRun ? '(dry run)' : `OK (${result.chunks_created} chunks)`);
    } else {
      results.failed.push(result);
      console.log(`FAILED: ${result.error}`);
    }

    // Small delay to avoid rate limiting
    if (!dryRun && i < newPosts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Summary
  console.log('');
  console.log('Upload Summary');
  console.log('==============');
  console.log(`Successful: ${results.success.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Skipped (existing): ${results.skipped.length}`);
  console.log(`Total chunks created: ${totalChunks}`);

  if (results.failed.length > 0) {
    console.log('');
    console.log('Failed posts:');
    results.failed.forEach(f => {
      console.log(`  - ${f.title}: ${f.error}`);
    });
  }

  // Write report
  const reportPath = path.join(__dirname, '..', 'data', 'blog-upload-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    dry_run: dryRun,
    batch_tag: BATCH_TAG,
    coach_id: RYAN_COACH_ID,
    results
  }, null, 2));

  console.log('');
  console.log(`Report written to: ${reportPath}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
