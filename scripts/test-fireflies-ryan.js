/**
 * Test script to debug Fireflies API access for Ryan Vaughn's transcripts
 *
 * Usage: FIREFLIES_API_KEY=your_key node scripts/test-fireflies-ryan.js
 */

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY;

if (!FIREFLIES_API_KEY) {
  console.error('ERROR: FIREFLIES_API_KEY environment variable is required');
  console.error('Usage: FIREFLIES_API_KEY=your_key node scripts/test-fireflies-ryan.js');
  process.exit(1);
}

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(FIREFLIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIREFLIES_API_KEY}`
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

async function main() {
  console.log('='.repeat(60));
  console.log('FIREFLIES API DEBUG - Looking for Ryan Vaughn\'s transcripts');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Get current user info
  console.log('1. Checking API user info...');
  try {
    const userQuery = `
      query {
        user {
          user_id
          email
          name
          minutes_consumed
          is_admin
        }
      }
    `;
    const userData = await fetchGraphQL(userQuery);
    console.log('   API User:', JSON.stringify(userData.user, null, 2));
    console.log();
  } catch (error) {
    console.log('   Could not fetch user info:', error.message);
    console.log();
  }

  // Step 2: List all transcripts (most recent 100)
  console.log('2. Fetching recent transcripts (limit 100)...');
  const listQuery = `
    query {
      transcripts(limit: 100) {
        id
        title
        date
        dateString
        host_email
        organizer_email
        participants
        meeting_attendees {
          email
          name
          displayName
        }
      }
    }
  `;

  const listData = await fetchGraphQL(listQuery);
  const transcripts = listData.transcripts || [];
  console.log(`   Found ${transcripts.length} transcripts total`);
  console.log();

  // Step 3: Analyze emails to find Ryan's transcripts
  console.log('3. Analyzing transcripts for ryan@leadinsideout.io...');
  console.log();

  const ryanEmail = 'ryan@leadinsideout.io';
  const ryanTranscripts = [];
  const allEmails = new Set();
  const emailCounts = {};

  for (const t of transcripts) {
    // Collect all emails
    if (t.host_email) {
      allEmails.add(t.host_email.toLowerCase());
      emailCounts[t.host_email.toLowerCase()] = (emailCounts[t.host_email.toLowerCase()] || 0) + 1;
    }
    if (t.organizer_email) {
      allEmails.add(t.organizer_email.toLowerCase());
      emailCounts[t.organizer_email.toLowerCase()] = (emailCounts[t.organizer_email.toLowerCase()] || 0) + 1;
    }
    if (t.meeting_attendees) {
      for (const a of t.meeting_attendees) {
        if (a.email) {
          allEmails.add(a.email.toLowerCase());
          emailCounts[a.email.toLowerCase()] = (emailCounts[a.email.toLowerCase()] || 0) + 1;
        }
      }
    }

    // Check if Ryan is involved
    const emails = [
      t.host_email?.toLowerCase(),
      t.organizer_email?.toLowerCase(),
      ...(t.meeting_attendees?.map(a => a.email?.toLowerCase()) || [])
    ].filter(Boolean);

    if (emails.includes(ryanEmail)) {
      ryanTranscripts.push(t);
    }
  }

  console.log('   All unique emails in Fireflies workspace:');
  const sortedEmails = Object.entries(emailCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  for (const [email, count] of sortedEmails) {
    const marker = email === ryanEmail ? ' *** RYAN ***' : '';
    console.log(`     ${email}: ${count} transcripts${marker}`);
  }
  console.log();

  // Step 4: Show Ryan's transcripts
  console.log('4. Ryan\'s transcripts found:');
  if (ryanTranscripts.length === 0) {
    console.log('   *** NONE FOUND ***');
    console.log();
    console.log('   This explains why sync is failing!');
    console.log('   Ryan\'s email (ryan@leadinsideout.io) is not appearing in any transcripts.');
    console.log();
    console.log('   Possible causes:');
    console.log('   - Ryan\'s meetings are in a different Fireflies workspace');
    console.log('   - Ryan uses a different email for Fireflies');
    console.log('   - Ryan\'s meetings are recorded by someone else (bot owner != attendee)');
  } else {
    console.log(`   Found ${ryanTranscripts.length} transcripts involving Ryan:`);
    console.log();
    for (const t of ryanTranscripts.slice(0, 10)) {
      console.log(`   - [${t.id}] ${t.title}`);
      console.log(`     Date: ${t.dateString}`);
      console.log(`     Host: ${t.host_email}`);
      console.log(`     Organizer: ${t.organizer_email}`);
      console.log();
    }
  }

  // Step 5: Check for any leadinsideout.io emails
  console.log('5. All @leadinsideout.io emails found:');
  const lioEmails = [...allEmails].filter(e => e.includes('leadinsideout.io'));
  if (lioEmails.length === 0) {
    console.log('   None found');
  } else {
    for (const email of lioEmails.sort()) {
      const count = emailCounts[email];
      console.log(`   - ${email}: ${count} transcripts`);
    }
  }
  console.log();

  console.log('='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
