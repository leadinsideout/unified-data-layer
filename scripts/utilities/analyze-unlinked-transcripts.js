#!/usr/bin/env node

/**
 * Analyze Transcripts with Missing Client Links
 * Scans for transcripts that have a coach but no client assigned
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeUnlinkedTranscripts() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 SCANNING FOR TRANSCRIPTS WITH MISSING CLIENT LINKS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Query transcripts that have coach but NO client
  const { data: unlinked, error } = await supabase
    .from('data_items')
    .select('id, data_type, coach_id, client_id, metadata, created_at')
    .eq('data_type', 'transcript')
    .not('coach_id', 'is', null)
    .is('client_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${unlinked.length} transcripts with coach but NO client\n`);

  if (unlinked.length === 0) {
    console.log('✅ All transcripts have client links!\n');
    process.exit(0);
  }

  // Get coach details
  const coachIds = [...new Set(unlinked.map(t => t.coach_id))];
  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, name, email')
    .in('id', coachIds);

  const coachMap = {};
  coaches?.forEach(c => { coachMap[c.id] = c; });

  // Get existing clients
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id, name, email, primary_coach_id');

  const clientByEmail = {};
  existingClients?.forEach(c => {
    if (c.email) clientByEmail[c.email.toLowerCase()] = c;
  });

  // Analyze metadata
  const analysis = [];
  const proposedLinks = [];

  for (const transcript of unlinked) {
    const meta = typeof transcript.metadata === 'string'
      ? JSON.parse(transcript.metadata)
      : (transcript.metadata || {});

    const coach = coachMap[transcript.coach_id];

    // Extract potential client emails
    const clientEmails = [];

    if (meta.attendee_emails && Array.isArray(meta.attendee_emails)) {
      // Filter out coach email
      const filtered = meta.attendee_emails.filter(e => e !== coach?.email);
      clientEmails.push(...filtered);
    }

    if (meta.organizer_email && meta.organizer_email !== coach?.email) {
      if (!clientEmails.includes(meta.organizer_email)) {
        clientEmails.push(meta.organizer_email);
      }
    }

    if (meta.host_email && meta.host_email !== coach?.email) {
      if (!clientEmails.includes(meta.host_email)) {
        clientEmails.push(meta.host_email);
      }
    }

    // Check if any of these emails match existing clients
    let matchedClient = null;
    for (const email of clientEmails) {
      const existing = clientByEmail[email.toLowerCase()];
      if (existing) {
        matchedClient = existing;
        break;
      }
    }

    const item = {
      transcriptId: transcript.id,
      created: transcript.created_at,
      coach: coach?.name || 'Unknown',
      coachId: transcript.coach_id,
      coachEmail: coach?.email,
      meetingTitle: meta.title || 'No title',
      clientEmails,
      meetingId: meta.meeting_id,
      matchedClient
    };

    analysis.push(item);

    // If we found a match, create a proposed link
    if (matchedClient) {
      proposedLinks.push({
        transcriptId: transcript.id,
        clientId: matchedClient.id,
        clientName: matchedClient.name,
        clientEmail: matchedClient.email,
        confidence: 'high'
      });
    } else if (clientEmails.length > 0) {
      // Propose creating a new client
      proposedLinks.push({
        transcriptId: transcript.id,
        clientId: null,
        clientEmail: clientEmails[0], // Use first email as primary
        clientName: null, // Will need to extract from metadata or create placeholder
        confidence: 'medium',
        action: 'create_new_client'
      });
    }
  }

  // Display results grouped by coach
  const byCoach = {};
  analysis.forEach(a => {
    if (!byCoach[a.coach]) byCoach[a.coach] = [];
    byCoach[a.coach].push(a);
  });

  Object.entries(byCoach).forEach(([coachName, transcripts]) => {
    console.log(`\n👤 Coach: ${coachName}`);
    console.log(`   Unlinked transcripts: ${transcripts.length}\n`);

    transcripts.slice(0, 10).forEach((t, idx) => {
      console.log(`   ${idx + 1}. ${t.meetingTitle}`);
      console.log(`      Created: ${t.created.split('T')[0]}`);
      console.log(`      Transcript ID: ${t.transcriptId.slice(0, 8)}...`);

      if (t.matchedClient) {
        console.log(`      ✅ MATCHED: ${t.matchedClient.name} (${t.matchedClient.email})`);
        console.log(`      💡 Action: Link to existing client ${t.matchedClient.id.slice(0, 8)}...`);
      } else if (t.clientEmails.length > 0) {
        console.log(`      📧 Client emails: ${t.clientEmails.join(', ')}`);
        console.log(`      ⚠️  Action: Create new client with email ${t.clientEmails[0]}`);
      } else {
        console.log(`      ❌ No client emails in metadata - needs manual review`);
      }
      console.log();
    });

    if (transcripts.length > 10) {
      console.log(`   ... and ${transcripts.length - 10} more\n`);
    }
  });

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY & PROPOSED ACTIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const canLinkNow = proposedLinks.filter(p => p.clientId !== null);
  const needNewClient = proposedLinks.filter(p => p.action === 'create_new_client');
  const noAction = analysis.length - proposedLinks.length;

  console.log(`✅ Can link immediately: ${canLinkNow.length} transcripts`);
  console.log(`   (Match existing clients in database)\n`);

  console.log(`⚠️  Need new client creation: ${needNewClient.length} transcripts`);
  console.log(`   (Client email found, but no client record exists)\n`);

  console.log(`❌ Need manual review: ${noAction} transcripts`);
  console.log(`   (No client email found in metadata)\n`);

  // Show unique emails that need clients
  if (needNewClient.length > 0) {
    const newClientEmails = [...new Set(needNewClient.map(p => p.clientEmail))];
    console.log('📧 New client emails to create:');
    newClientEmails.forEach(email => {
      const count = needNewClient.filter(p => p.clientEmail === email).length;
      console.log(`   - ${email} (${count} transcripts)`);
    });
    console.log();
  }

  // Generate SQL for immediate links
  if (canLinkNow.length > 0) {
    console.log('💡 PROPOSED SQL - Link to existing clients:\n');
    console.log('-- Execute these updates to link transcripts to existing clients\n');

    canLinkNow.forEach(link => {
      console.log(`UPDATE data_items`);
      console.log(`SET client_id = '${link.clientId}'`);
      console.log(`WHERE id = '${link.transcriptId}';`);
      console.log(`-- Links to: ${link.clientName} (${link.clientEmail})\n`);
    });
  }

  console.log('\n✅ ANALYSIS COMPLETE\n');
}

analyzeUnlinkedTranscripts().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
