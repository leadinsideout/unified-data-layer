#!/usr/bin/env node

/**
 * Apply Client Links from Audit Report
 *
 * Reads data/coaching-audit-report.json and applies client links in 3 tiers:
 *   Tier 1: Auto-apply high-confidence email matches
 *   Tier 2: Interactive medium-confidence name matches
 *   Tier 3: New client creation proposals
 *
 * Usage:
 *   node scripts/utilities/apply-client-links.js            # Interactive mode
 *   node scripts/utilities/apply-client-links.js --dry-run   # Preview only
 *
 * Output:
 *   data/client-links-applied.json   — log of all changes made
 *   data/manual-review-queue.json    — remaining items needing human review
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Readline helper ────────────────────────────────────────────────────────

function createPrompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask(question) {
      return new Promise(resolve => rl.question(question, resolve));
    },
    close() {
      rl.close();
    }
  };
}

// ─── Link application ───────────────────────────────────────────────────────

async function linkTranscriptToClient(transcriptId, clientId, dryRun) {
  if (dryRun) {
    console.log(`    [DRY RUN] UPDATE data_items SET client_id = '${clientId}' WHERE id = '${transcriptId}' AND client_id IS NULL;`);
    return { success: true, dry_run: true };
  }

  const { error } = await supabase
    .from('data_items')
    .update({ client_id: clientId })
    .eq('id', transcriptId)
    .is('client_id', null); // Safety: only update if still null

  if (error) {
    console.log(`    ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function ensureCoachClientRelationship(coachId, clientId, dryRun) {
  if (!coachId || !clientId) return;

  if (dryRun) {
    console.log(`    [DRY RUN] UPSERT coach_clients (coach_id='${coachId}', client_id='${clientId}')`);
    return;
  }

  await supabase
    .from('coach_clients')
    .upsert({ coach_id: coachId, client_id: clientId }, { onConflict: 'coach_id,client_id', ignoreDuplicates: true });
}

async function createNewClient({ email, name, coachId, organizationId }, dryRun) {
  if (dryRun) {
    console.log(`    [DRY RUN] INSERT INTO clients (email, name, primary_coach_id) VALUES ('${email}', '${name}', '${coachId}')`);
    return { id: 'dry-run-id', name, email };
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      email,
      name,
      primary_coach_id: coachId,
      client_organization_id: organizationId || null
    })
    .select('id, name, email')
    .single();

  if (error) {
    console.log(`    ERROR creating client: ${error.message}`);
    return null;
  }

  return data;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  APPLY CLIENT LINKS ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load report
  let report;
  try {
    report = JSON.parse(readFileSync('data/coaching-audit-report.json', 'utf-8'));
  } catch (err) {
    console.error('ERROR: Could not read data/coaching-audit-report.json');
    console.error('Run scan-unlinked-coaching-transcripts.js first.');
    process.exit(1);
  }

  console.log(`  Report generated: ${report.generated_at}`);
  console.log(`  Total unlinked transcripts in report: ${report.all_transcripts.length}\n`);

  const appliedLinks = [];
  const manualReview = [];
  const prompt = createPrompt();

  // ─── Tier 1: Auto-apply high confidence email matches ─────────────────

  const highConfidence = report.all_transcripts.filter(t =>
    t.linking.action === 'link_existing' && t.linking.confidence === 'high' && t.linking.method === 'email_match'
  );

  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  TIER 1: HIGH CONFIDENCE EMAIL MATCHES (${highConfidence.length})`);
  console.log('───────────────────────────────────────────────────────────────\n');

  if (highConfidence.length === 0) {
    console.log('  No high-confidence email matches found.\n');
  } else {
    for (const t of highConfidence) {
      console.log(`  Linking: "${t.title}" (${t.coach_name})`);
      console.log(`    -> ${t.linking.proposed_client_name} (${t.linking.proposed_client_email})`);

      const result = await linkTranscriptToClient(t.id, t.linking.proposed_client_id, DRY_RUN);
      if (result.success) {
        await ensureCoachClientRelationship(t.coach_id, t.linking.proposed_client_id, DRY_RUN);
        appliedLinks.push({
          transcript_id: t.id,
          title: t.title,
          coach: t.coach_name,
          client_id: t.linking.proposed_client_id,
          client_name: t.linking.proposed_client_name,
          method: 'email_match',
          tier: 1,
          dry_run: DRY_RUN
        });
      }
    }
    console.log();
  }

  // ─── Tier 2: Interactive medium confidence matches ────────────────────

  const mediumConfidence = report.all_transcripts.filter(t =>
    t.linking.action === 'link_existing' && t.linking.confidence === 'medium'
  );

  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  TIER 2: MEDIUM CONFIDENCE NAME MATCHES (${mediumConfidence.length})`);
  console.log('───────────────────────────────────────────────────────────────\n');

  if (mediumConfidence.length === 0) {
    console.log('  No medium-confidence matches found.\n');
  } else {
    let skipAll = false;

    for (const t of mediumConfidence) {
      if (skipAll) {
        manualReview.push(t);
        continue;
      }

      const date = (t.session_date || '').substring(0, 10);
      console.log(`  "${t.title}" (${date})`);
      console.log(`    Coach: ${t.coach_name}`);
      console.log(`    Speakers: ${t.speakers.join(', ')}`);
      console.log(`    Extracted name: "${t.linking.extracted_name || ''}"`);
      console.log(`    Proposed match: ${t.linking.proposed_client_name} (${t.linking.proposed_client_email}) — ${t.linking.match_score}% score`);

      if (t.linking.alternative_matches?.length > 0) {
        console.log(`    Alternatives:`);
        for (const alt of t.linking.alternative_matches) {
          console.log(`      - ${alt.client_name} (${alt.client_email}) — ${alt.score}%`);
        }
      }

      if (DRY_RUN) {
        console.log(`    [DRY RUN] Would prompt for confirmation`);
        manualReview.push(t);
        console.log();
        continue;
      }

      const answer = await prompt.ask('    Apply this link? [y/n/s(kip all)] > ');
      const choice = answer.trim().toLowerCase();

      if (choice === 'y') {
        const result = await linkTranscriptToClient(t.id, t.linking.proposed_client_id, false);
        if (result.success) {
          await ensureCoachClientRelationship(t.coach_id, t.linking.proposed_client_id, false);
          appliedLinks.push({
            transcript_id: t.id,
            title: t.title,
            coach: t.coach_name,
            client_id: t.linking.proposed_client_id,
            client_name: t.linking.proposed_client_name,
            method: 'name_fuzzy',
            tier: 2
          });
          console.log('    LINKED\n');
        }
      } else if (choice === 's') {
        skipAll = true;
        manualReview.push(t);
        console.log('    Skipping all remaining medium-confidence matches.\n');
      } else {
        manualReview.push(t);
        console.log('    Skipped.\n');
      }
    }
  }

  // ─── Tier 3: New client creation proposals ────────────────────────────

  const newClientProposals = report.all_transcripts.filter(t =>
    t.linking.action === 'create_new_client'
  );

  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  TIER 3: NEW CLIENT CREATION (${newClientProposals.length} transcripts)`);
  console.log('───────────────────────────────────────────────────────────────\n');

  if (newClientProposals.length === 0) {
    console.log('  No new client creation proposals.\n');
  } else {
    // Group by email to avoid duplicate creation
    const byEmail = {};
    for (const t of newClientProposals) {
      const email = t.linking.proposed_email;
      if (!byEmail[email]) {
        byEmail[email] = {
          email,
          name: t.linking.extracted_name,
          coach_name: t.coach_name,
          coach_id: t.coach_id,
          transcripts: []
        };
      }
      byEmail[email].transcripts.push(t);
    }

    for (const [email, group] of Object.entries(byEmail)) {
      console.log(`  Email: ${email}`);
      console.log(`    Proposed name: ${group.name || '(unknown)'}`);
      console.log(`    Coach: ${group.coach_name}`);
      console.log(`    Transcripts: ${group.transcripts.length}`);
      for (const t of group.transcripts.slice(0, 3)) {
        console.log(`      - ${t.title}`);
      }
      if (group.transcripts.length > 3) {
        console.log(`      ... and ${group.transcripts.length - 3} more`);
      }

      if (DRY_RUN) {
        console.log(`    [DRY RUN] Would prompt for client creation`);
        manualReview.push(...group.transcripts);
        console.log();
        continue;
      }

      const answer = await prompt.ask(`    Create client "${group.name || email}" and link ${group.transcripts.length} transcripts? [y/n] > `);

      if (answer.trim().toLowerCase() === 'y') {
        const client = await createNewClient({
          email,
          name: group.name || `Client (${email})`,
          coachId: group.coach_id
        }, false);

        if (client) {
          for (const t of group.transcripts) {
            const result = await linkTranscriptToClient(t.id, client.id, false);
            if (result.success) {
              appliedLinks.push({
                transcript_id: t.id,
                title: t.title,
                coach: t.coach_name,
                client_id: client.id,
                client_name: client.name,
                client_email: email,
                method: 'new_client_created',
                tier: 3
              });
            }
          }
          await ensureCoachClientRelationship(group.coach_id, client.id, false);
          console.log(`    CREATED client "${client.name}" and linked ${group.transcripts.length} transcripts.\n`);
        }
      } else {
        manualReview.push(...group.transcripts);
        console.log('    Skipped.\n');
      }
    }
  }

  // ─── Remaining manual review items ────────────────────────────────────

  const pureManualReview = report.all_transcripts.filter(t =>
    t.linking.action === 'manual_review'
  );
  manualReview.push(...pureManualReview);

  // ─── Summary & Output ─────────────────────────────────────────────────

  prompt.close();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`  Links applied:        ${appliedLinks.length}`);
  console.log(`    Tier 1 (auto):      ${appliedLinks.filter(l => l.tier === 1).length}`);
  console.log(`    Tier 2 (confirmed): ${appliedLinks.filter(l => l.tier === 2).length}`);
  console.log(`    Tier 3 (new):       ${appliedLinks.filter(l => l.tier === 3).length}`);
  console.log(`  Manual review queue:  ${manualReview.length}\n`);

  // Write results
  const appliedPath = 'data/client-links-applied.json';
  writeFileSync(appliedPath, JSON.stringify({
    applied_at: new Date().toISOString(),
    dry_run: DRY_RUN,
    total_applied: appliedLinks.length,
    links: appliedLinks
  }, null, 2));
  console.log(`  Applied log: ${appliedPath}`);

  const reviewPath = 'data/manual-review-queue.json';
  writeFileSync(reviewPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total: manualReview.length,
    by_coach: groupByCoach(manualReview),
    transcripts: manualReview
  }, null, 2));
  console.log(`  Manual review: ${reviewPath}`);

  console.log('\n  DONE\n');
}

function groupByCoach(items) {
  const groups = {};
  for (const t of items) {
    const coach = t.coach_name || 'Unknown';
    if (!groups[coach]) groups[coach] = 0;
    groups[coach]++;
  }
  return groups;
}

main().catch(err => {
  console.error('\nError:', err.message);
  console.error(err.stack);
  process.exit(1);
});
