#!/usr/bin/env node
/**
 * Blog Post Extraction Script
 *
 * Extracts individual blog posts from Ryan Vaughn's Lead Inside Out Newsletter Archive PDF.
 *
 * Usage:
 *   node scripts/extract-blog-posts.js [input-pdf] [output-json]
 *
 * Defaults:
 *   input:  ~/Downloads/Lead_Inside_Out_Newsletter_Archive.pdf
 *   output: data/ryan-blog-posts.json
 *
 * Output format:
 *   [
 *     {
 *       "title": "Post Title",
 *       "publish_date": "2024-11-15",
 *       "content": "Full post content...",
 *       "word_count": 1250
 *     }
 *   ]
 */

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default paths
const DEFAULT_INPUT = path.join(process.env.HOME, 'Downloads', 'Lead_Inside_Out_Newsletter_Archive.pdf');
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'data', 'ryan-blog-posts.json');

/**
 * Parse various date formats into ISO date string
 */
function parseDate(dateStr) {
  // Handle formats like:
  // - "11/15/2024" (MM/DD/YYYY)
  // - "10/08/2024" (with leading zeros)
  // - "May 3, 2024" (Month DD, YYYY)
  // - "April 19, 2024"
  // - "1/29/20" (M/DD/YY)

  const trimmed = dateStr.trim();

  // Try MM/DD/YYYY or M/DD/YY format
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    // Handle 2-digit year
    if (year.length === 2) {
      year = year > '50' ? '19' + year : '20' + year;
    }
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toISOString().split('T')[0];
  }

  // Try "Month DD, YYYY" format
  const monthMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (monthMatch) {
    const [, monthName, day, year] = monthMatch;
    const date = new Date(`${monthName} ${day}, ${year}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Fallback: try JavaScript's date parser
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  console.warn(`  Warning: Could not parse date: "${dateStr}"`);
  return null;
}

/**
 * Extract blog posts from PDF text
 */
function extractPosts(text) {
  const posts = [];

  // Split by "Date Posted:" pattern - this marks the start of each post's metadata
  // The title is on the line before "Date Posted:"
  const segments = text.split(/\n\s*(?=.+\nDate Posted:)/);

  // Skip the first segment (header/intro text)
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i].trim();

    // Extract title (first line)
    const lines = segment.split('\n');
    const title = lines[0].trim();

    // Extract date (second line contains "Date Posted: ...")
    const dateLine = lines[1];
    const dateMatch = dateLine.match(/Date Posted:\s*(.+)/);
    if (!dateMatch) {
      console.warn(`  Warning: No date found for post: "${title.substring(0, 50)}..."`);
      continue;
    }

    const publishDate = parseDate(dateMatch[1]);

    // Extract content (everything after the date line)
    const contentLines = lines.slice(2);
    const content = contentLines.join('\n').trim();

    // Skip if content is too short (likely parsing error)
    if (content.length < 100) {
      console.warn(`  Warning: Skipping short content for: "${title}"`);
      continue;
    }

    // Calculate word count
    const wordCount = content.split(/\s+/).length;

    posts.push({
      title,
      publish_date: publishDate,
      content,
      word_count: wordCount
    });
  }

  return posts;
}

/**
 * Main execution
 */
async function main() {
  const inputPath = process.argv[2] || DEFAULT_INPUT;
  const outputPath = process.argv[3] || DEFAULT_OUTPUT;

  console.log('Blog Post Extraction Script');
  console.log('===========================');
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log('');

  // Check input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read and parse PDF
  console.log('Reading PDF...');
  const dataBuffer = fs.readFileSync(inputPath);
  const pdfData = await pdf(dataBuffer);

  console.log(`  Pages: ${pdfData.numpages}`);
  console.log(`  Characters: ${pdfData.text.length.toLocaleString()}`);
  console.log('');

  // Extract posts
  console.log('Extracting blog posts...');
  const posts = extractPosts(pdfData.text);

  console.log(`  Found ${posts.length} blog posts`);
  console.log('');

  // Validate extraction
  const postsWithDates = posts.filter(p => p.publish_date);
  const postsWithoutDates = posts.filter(p => !p.publish_date);

  console.log('Validation:');
  console.log(`  Posts with valid dates: ${postsWithDates.length}`);
  console.log(`  Posts without dates: ${postsWithoutDates.length}`);

  if (postsWithoutDates.length > 0) {
    console.log('  Posts missing dates:');
    postsWithoutDates.forEach(p => console.log(`    - ${p.title}`));
  }
  console.log('');

  // Sort by date (newest first)
  posts.sort((a, b) => {
    if (!a.publish_date) return 1;
    if (!b.publish_date) return -1;
    return b.publish_date.localeCompare(a.publish_date);
  });

  // Calculate statistics
  const totalWords = posts.reduce((sum, p) => sum + p.word_count, 0);
  const avgWords = Math.round(totalWords / posts.length);
  const minWords = Math.min(...posts.map(p => p.word_count));
  const maxWords = Math.max(...posts.map(p => p.word_count));

  console.log('Statistics:');
  console.log(`  Total words: ${totalWords.toLocaleString()}`);
  console.log(`  Average words per post: ${avgWords}`);
  console.log(`  Shortest post: ${minWords} words`);
  console.log(`  Longest post: ${maxWords} words`);

  // Date range
  const dates = posts.filter(p => p.publish_date).map(p => p.publish_date);
  if (dates.length > 0) {
    console.log(`  Date range: ${dates[dates.length - 1]} to ${dates[0]}`);
  }
  console.log('');

  // Write output
  console.log(`Writing to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2));
  console.log('Done!');
  console.log('');

  // Show sample
  console.log('Sample posts:');
  posts.slice(0, 3).forEach((post, i) => {
    console.log(`  ${i + 1}. "${post.title}" (${post.publish_date}, ${post.word_count} words)`);
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
