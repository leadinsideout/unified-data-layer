#!/usr/bin/env node

/**
 * Merge Duplicate Client Records
 *
 * Consolidates multiple client records for the same person into a single
 * canonical record. Moves all data_items, coach relationships, and API keys
 * to the canonical client, then deletes the source duplicates.
 *
 * The operations are ordered for safety:
 *   1. Move data_items (before deleting source, to prevent CASCADE data loss)
 *   2. Copy coach_clients relationships (upsert to handle duplicates)
 *   3. Move API keys and usage references
 *   4. Delete source client records (CASCADE cleans up remaining coach_clients)
 *   5. Update canonical metadata with merge history
 *
 * Usage:
 *   node scripts/utilities/merge-duplicate-clients.js --canonical <UUID> --sources <UUID,UUID,...>
 *   node scripts/utilities/merge-duplicate-clients.js --canonical <UUID> --sources <UUID,UUID,...> --dry-run
 *
 * Output:
 *   data/client-merge-report.json — audit trail of the merge operation
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Parse CLI args ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const canonicalId = getArg('--canonical');
const sourcesRaw = getArg('--sources');

if (!canonicalId || !sourcesRaw) {
  console.error('Usage: node scripts/utilities/merge-duplicate-clients.js --canonical <UUID> --sources <UUID,UUID,...> [--dry-run]');
  process.exit(1);
}

const sourceIds = sourcesRaw.split(',').map(s => s.trim()).filter(Boolean);

if (sourceIds.length === 0) {
  console.error('Error: At least one source client ID is required.');
  process.exit(1);
}

if (sourceIds.includes(canonicalId)) {
  console.error('Error: Canonical ID cannot also be a source ID.');
  process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchClient(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, primary_coach_id, client_organization_id, metadata, created_at')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

async function countDataItems(clientId) {
  const { count, error } = await supabase
    .from('data_items')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  return error ? 0 : count;
}

async function countCoachClients(clientId) {
  const { count, error } = await supabase
    .from('coach_clients')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  return error ? 0 : count;
}

async function listDataItems(clientId) {
  const { data, error } = await supabase
    .from('data_items')
    .select('id, data_type, metadata, session_date, created_at')
    .eq('client_id', clientId)
    .order('session_date', { ascending: true, nullsFirst: false });

  return error ? [] : (data || []);
}

function itemTitle(item) {
  return item.metadata?.title || item.metadata?.meeting_title || item.metadata?.source_file || item.data_type;
}

async function getCoachClients(clientId) {
  const { data, error } = await supabase
    .from('coach_clients')
    .select('coach_id, client_id')
    .eq('client_id', clientId);

  return error ? [] : data;
}

// ─── Merge operations ───────────────────────────────────────────────────────

async function moveDataItems(sourceId, canonicalId) {
  const { data, error, count } = await supabase
    .from('data_items')
    .update({ client_id: canonicalId, updated_at: new Date().toISOString() })
    .eq('client_id', sourceId)
    .select('id', { count: 'exact' });

  if (error) throw new Error(`Failed to move data_items from ${sourceId}: ${error.message}`);
  return data?.length || 0;
}

async function copyCoachRelationships(sourceId, canonicalId) {
  const sourceRelationships = await getCoachClients(sourceId);
  let added = 0;

  for (const rel of sourceRelationships) {
    const { error } = await supabase
      .from('coach_clients')
      .upsert(
        { coach_id: rel.coach_id, client_id: canonicalId },
        { onConflict: 'coach_id,client_id', ignoreDuplicates: true }
      );

    if (error) {
      console.warn(`   ⚠️  Could not copy coach relationship ${rel.coach_id}: ${error.message}`);
    } else {
      added++;
    }
  }

  return added;
}

async function moveApiKeys(sourceId, canonicalId) {
  const { data, error } = await supabase
    .from('api_keys')
    .update({ client_id: canonicalId })
    .eq('client_id', sourceId)
    .select('id');

  if (error && !error.message.includes('0 rows')) {
    console.warn(`   ⚠️  api_keys move: ${error.message}`);
  }
  return data?.length || 0;
}

async function moveApiUsage(sourceId, canonicalId) {
  const { data, error } = await supabase
    .from('api_usage')
    .update({ client_id: canonicalId })
    .eq('client_id', sourceId)
    .select('id');

  if (error && !error.message.includes('0 rows')) {
    console.warn(`   ⚠️  api_usage move: ${error.message}`);
  }
  return data?.length || 0;
}

async function deleteClient(sourceId) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', sourceId);

  if (error) throw new Error(`Failed to delete client ${sourceId}: ${error.message}`);
}

async function updateCanonicalMetadata(canonicalId, mergeHistory) {
  const canonical = await fetchClient(canonicalId);
  const existingMetadata = canonical?.metadata || {};
  const updatedMetadata = {
    ...existingMetadata,
    merge_history: {
      ...(existingMetadata.merge_history || {}),
      ...mergeHistory
    }
  };

  const { error } = await supabase
    .from('clients')
    .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
    .eq('id', canonicalId);

  if (error) throw new Error(`Failed to update canonical metadata: ${error.message}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Client Merge Tool ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Validate canonical client
  const canonical = await fetchClient(canonicalId);
  if (!canonical) {
    console.error(`❌ Canonical client not found: ${canonicalId}`);
    process.exit(1);
  }

  const canonicalItems = await countDataItems(canonicalId);
  const canonicalCoaches = await countCoachClients(canonicalId);

  console.log('📌 CANONICAL (keep):');
  console.log(`   ID:    ${canonical.id}`);
  console.log(`   Name:  ${canonical.name}`);
  console.log(`   Email: ${canonical.email}`);
  console.log(`   Data:  ${canonicalItems} items, ${canonicalCoaches} coach relationships`);
  console.log(`   Since: ${canonical.created_at}\n`);

  // Validate and display source clients
  const sources = [];
  for (const sourceId of sourceIds) {
    const source = await fetchClient(sourceId);
    if (!source) {
      console.error(`❌ Source client not found: ${sourceId}`);
      process.exit(1);
    }

    const sourceItems = await countDataItems(sourceId);
    const sourceCoaches = await countCoachClients(sourceId);
    const items = await listDataItems(sourceId);

    sources.push({ ...source, itemCount: sourceItems, coachCount: sourceCoaches, items });

    console.log(`🔀 SOURCE (merge & delete):`);
    console.log(`   ID:    ${source.id}`);
    console.log(`   Name:  ${source.name}`);
    console.log(`   Email: ${source.email}`);
    console.log(`   Data:  ${sourceItems} items, ${sourceCoaches} coach relationships`);
    console.log(`   Since: ${source.created_at}`);
    if (items.length > 0) {
      console.log('   Items:');
      items.forEach(item => {
        console.log(`     - [${item.data_type}] ${itemTitle(item)} (${item.session_date || 'no date'})`);
      });
    }
    console.log();
  }

  // Summary
  const totalItemsToMove = sources.reduce((sum, s) => sum + s.itemCount, 0);
  console.log('─── MERGE SUMMARY ──────────────────────────────────────');
  console.log(`   Items to move:     ${totalItemsToMove}`);
  console.log(`   Clients to delete: ${sources.length}`);
  console.log(`   Canonical keeps:   ${canonicalItems} existing items`);
  console.log(`   Post-merge total:  ${canonicalItems + totalItemsToMove} items\n`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no changes made. Remove --dry-run to execute.\n');
    process.exit(0);
  }

  // Execute merge step by step
  console.log('🚀 Executing merge...\n');

  const results = {
    data_items_moved: 0,
    coach_clients_added: 0,
    api_keys_moved: 0,
    api_usage_moved: 0,
    clients_deleted: 0,
    sources_merged: []
  };

  const mergeHistory = {};

  for (const source of sources) {
    console.log(`── Merging ${source.name} (${source.email}) ──`);

    // Step 1: Move data_items FIRST (before delete to prevent CASCADE loss)
    console.log('   1. Moving data_items...');
    const itemsMoved = await moveDataItems(source.id, canonicalId);
    console.log(`      Moved ${itemsMoved} items`);
    results.data_items_moved += itemsMoved;

    // Step 2: Copy coach relationships
    console.log('   2. Copying coach relationships...');
    const coachesAdded = await copyCoachRelationships(source.id, canonicalId);
    console.log(`      Added ${coachesAdded} relationships`);
    results.coach_clients_added += coachesAdded;

    // Step 3: Move API keys
    console.log('   3. Moving API keys...');
    const keysMoved = await moveApiKeys(source.id, canonicalId);
    console.log(`      Moved ${keysMoved} keys`);
    results.api_keys_moved += keysMoved;

    // Step 4: Move API usage
    console.log('   4. Moving API usage...');
    const usageMoved = await moveApiUsage(source.id, canonicalId);
    console.log(`      Moved ${usageMoved} usage records`);
    results.api_usage_moved += usageMoved;

    // Step 5: Delete source client
    console.log('   5. Deleting source client...');
    await deleteClient(source.id);
    console.log('      Deleted');
    results.clients_deleted++;

    // Record merge history
    mergeHistory[source.id] = {
      name: source.name,
      email: source.email,
      original_metadata: source.metadata || {},
      items_moved: itemsMoved,
      merged_at: new Date().toISOString()
    };

    results.sources_merged.push({
      id: source.id,
      name: source.name,
      email: source.email,
      items_moved: itemsMoved
    });

    console.log();
  }

  // Step 6: Update canonical metadata with merge history
  console.log('📝 Updating canonical metadata with merge history...');
  await updateCanonicalMetadata(canonicalId, mergeHistory);
  console.log('   Done\n');

  // Display results
  console.log('✅ Merge complete!\n');
  console.log('─── RESULTS ────────────────────────────────────────────');
  console.log(`   Data items moved:      ${results.data_items_moved}`);
  console.log(`   Coach links added:     ${results.coach_clients_added}`);
  console.log(`   API keys moved:        ${results.api_keys_moved}`);
  console.log(`   API usage moved:       ${results.api_usage_moved}`);
  console.log(`   Clients deleted:       ${results.clients_deleted}\n`);

  // Write report
  const report = {
    canonical: {
      id: canonicalId,
      name: canonical.name,
      email: canonical.email
    },
    ...results,
    executed_at: new Date().toISOString(),
    command: `node scripts/utilities/merge-duplicate-clients.js --canonical ${canonicalId} --sources ${sourceIds.join(',')}`
  };

  writeFileSync('data/client-merge-report.json', JSON.stringify(report, null, 2));
  console.log('📄 Report saved to data/client-merge-report.json\n');

  // Post-merge verification
  console.log('─── VERIFICATION ───────────────────────────────────────');
  const postMergeItems = await listDataItems(canonicalId);
  console.log(`   Canonical now has ${postMergeItems.length} items:`);
  postMergeItems.forEach(item => {
    console.log(`     - [${item.data_type}] ${item.title || '(untitled)'} (${item.session_date || 'no date'})`);
  });

  for (const source of sources) {
    const orphaned = await countDataItems(source.id);
    const stillExists = await fetchClient(source.id);
    console.log(`\n   Source ${source.email}:`);
    console.log(`     Deleted: ${stillExists ? '❌ NO' : '✅ YES'}`);
    console.log(`     Orphaned items: ${orphaned}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Done! Ryan\'s GPT should now find all Brandon sessions.');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
