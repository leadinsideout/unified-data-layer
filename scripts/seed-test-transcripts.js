/**
 * Seed fresh test transcripts for Matt Thieleman's validation testing
 *
 * Creates unique coaching transcripts for each coach persona with
 * distinct isolation markers to validate multi-tenant separation.
 *
 * Run: node scripts/seed-test-transcripts.js
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Coach and client mappings from database
const coaches = {
  alex: {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Alex Rivera',
    clients: [
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Emily Zhang' },
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Sarah Williams' }
    ]
  },
  jordan: {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'Jordan Taylor',
    clients: [
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'David Kim' },
      { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Lisa Park' }
    ]
  },
  sam: {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Sam Chen',
    clients: [
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Michael Torres' },
      { id: '550e8400-e29b-41d4-a716-44665544000b', name: 'Rachel Adams' }
    ]
  }
};

// Generate unique timestamp for this batch
const batchTimestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

// Fresh transcripts with unique isolation markers
const testTranscripts = [
  // ========== ALEX RIVERA's CLIENTS ==========
  {
    coach: coaches.alex,
    client: coaches.alex.clients[0], // Emily Zhang
    sessionDate: '2025-12-06',
    title: `ALEX-EMILY-${batchTimestamp}-001: Leadership Transition`,
    content: `[ISOLATION MARKER: ALEX-RIVERA-EXCLUSIVE-${batchTimestamp}]

Coaching session with Emily Zhang facilitated by Alex Rivera.

Today we focused on Emily's transition from senior engineer to engineering manager. She expressed anxiety about losing her technical identity while taking on people management responsibilities.

Key discussion points:
- Emily's fear of becoming "just a manager" who loses touch with code
- The identity shift from individual contributor to multiplier
- How to maintain technical credibility while delegating execution

Emily shared a specific incident where she rewrote a junior engineer's PR instead of providing feedback. We explored the pattern and she recognized her perfectionism is limiting team growth.

Framework introduced: The Leadership Ladder concept from Inside Out Development - moving from "doing" to "leading through others."

Commitments:
1. Emily will practice "coaching through code reviews" - asking questions instead of rewriting
2. She will schedule dedicated "technical deep dive" time to maintain her skills
3. Next session: Focus on difficult feedback conversations

Session energy: Started anxious, ended with clarity and optimism.

[END MARKER: ALEX-RIVERA-TRANSCRIPT]`
  },
  {
    coach: coaches.alex,
    client: coaches.alex.clients[1], // Sarah Williams
    sessionDate: '2025-12-07',
    title: `ALEX-SARAH-${batchTimestamp}-001: Executive Communication`,
    content: `[ISOLATION MARKER: ALEX-RIVERA-EXCLUSIVE-${batchTimestamp}]

Coaching session with Sarah Williams facilitated by Alex Rivera.

Sarah came to today's session energized after a breakthrough in her last board presentation. She received feedback that she's finally "speaking the language of the business" rather than getting lost in technical details.

We explored what changed:
- Sarah practiced the pyramid principle (conclusion first, supporting details second)
- She focused on business outcomes rather than engineering process
- She prepared for questions by thinking "what would the CFO ask?"

Challenge discussed: Sarah struggles with a peer VP who consistently talks over her in leadership meetings. She tends to shut down rather than assert her position.

We role-played several scenarios:
- Interrupting the interrupter gracefully
- Using "building on what Mike said..." to reclaim the conversation
- Pre-meeting alignment to reduce public conflicts

Insight: Sarah realized she conflates assertiveness with aggression due to past experiences. We discussed the difference and practiced assertive but collaborative language.

Next session: Deep dive on stakeholder mapping and influence strategies.

[END MARKER: ALEX-RIVERA-TRANSCRIPT]`
  },

  // ========== JORDAN TAYLOR's CLIENTS ==========
  {
    coach: coaches.jordan,
    client: coaches.jordan.clients[0], // David Kim
    sessionDate: '2025-12-06',
    title: `JORDAN-DAVID-${batchTimestamp}-001: Team Restructuring`,
    content: `[ISOLATION MARKER: JORDAN-TAYLOR-EXCLUSIVE-${batchTimestamp}]

Coaching session with David Kim facilitated by Jordan Taylor.

David is facing a significant challenge: he needs to restructure his team of 12 engineers into two pods, which means promoting one person to lead the second pod and potentially disappointing others.

Current state:
- Two strong candidates: Maya (senior, 4 years tenure) and Chris (newer, but exceptional leadership potential)
- David is avoiding the decision, hoping "it will become clear"
- Team is already sensing uncertainty and productivity is dropping

We explored David's decision-making patterns:
- He tends to delay hard decisions hoping for more data
- He fears disappointing people and being seen as unfair
- He hasn't clearly defined what "leadership readiness" means for this role

Framework applied: The Inside Out "Values-Based Decision Making" model. We identified David's core values (fairness, growth, excellence) and examined how each candidate aligns.

Breakthrough: David realized he was conflating "fairness" with "equal treatment" when fairness actually means giving people what they need to succeed.

Action items:
1. Define the pod lead role requirements in writing this week
2. Have transparent conversations with both candidates about their aspirations
3. Make the decision by Friday - no more delays

[END MARKER: JORDAN-TAYLOR-TRANSCRIPT]`
  },
  {
    coach: coaches.jordan,
    client: coaches.jordan.clients[1], // Lisa Park
    sessionDate: '2025-12-07',
    title: `JORDAN-LISA-${batchTimestamp}-001: Burnout Recovery`,
    content: `[ISOLATION MARKER: JORDAN-TAYLOR-EXCLUSIVE-${batchTimestamp}]

Coaching session with Lisa Park facilitated by Jordan Taylor.

Lisa came to this session visibly exhausted. She's been working 60+ hour weeks for three months straight on a critical product launch. The launch was successful, but Lisa admitted she's running on empty.

Signs of burnout we identified:
- Cynicism about work that used to energize her
- Physical symptoms: headaches, poor sleep, skipped meals
- Emotional detachment from her team
- Difficulty making simple decisions

We explored the root causes:
- Lisa said yes to too many things during the launch
- She didn't delegate because "it was faster to do it myself"
- She stopped all personal activities (gym, seeing friends, hobbies)
- She's been in "crisis mode" so long it feels normal

The Inside Out recovery framework we discussed:
1. Immediate triage: What can be canceled or delegated THIS WEEK
2. Boundaries: Define non-negotiable personal time
3. Recovery activities: Rebuild the things that restore energy
4. Systemic changes: How to prevent this pattern from recurring

Lisa's realizations:
- Her identity is too tied to being "the person who delivers"
- She equates rest with laziness (family of origin pattern)
- Her team can do more than she gives them credit for

Commitments:
1. Take two full days off next week (no Slack, no email)
2. Delegate three ongoing projects to senior team members
3. Schedule a physical with her doctor
4. We'll do weekly check-ins for the next month to support recovery

This is serious. I'm concerned about Lisa and want to monitor closely.

[END MARKER: JORDAN-TAYLOR-TRANSCRIPT]`
  },

  // ========== SAM CHEN's CLIENTS ==========
  {
    coach: coaches.sam,
    client: coaches.sam.clients[0], // Michael Torres
    sessionDate: '2025-12-06',
    title: `SAM-MICHAEL-${batchTimestamp}-001: Conflict with CEO`,
    content: `[ISOLATION MARKER: SAM-CHEN-EXCLUSIVE-${batchTimestamp}]

Coaching session with Michael Torres facilitated by Sam Chen.

Michael is in a difficult situation: he fundamentally disagrees with a strategic direction the CEO is pushing, and he's struggling with whether to voice his concerns or comply.

The situation:
- CEO wants to pivot the product toward enterprise customers
- Michael believes this will alienate their core SMB base
- He has data supporting his position but fears being seen as "not a team player"
- The leadership team seems to be going along with the CEO

We explored the dynamics:
- Michael's fear of conflict and authority figures (pattern from earlier career)
- The difference between disagreeing and being disloyal
- His responsibility as a leader to voice concerns constructively

Framework introduced: "Disagree and Commit" vs. "Quiet Disagreement"
- The goal is to ensure your perspective is heard, then fully commit to the decision
- Silent compliance while harboring doubts undermines both you and the team

Role-play: We practiced how Michael could raise his concerns in the next leadership meeting:
- Leading with shared goals ("We all want the company to succeed...")
- Presenting data without attacking the CEO's idea
- Asking questions that surface risks without being confrontational
- Expressing willingness to commit once heard

Key insight: Michael realized he's never actually shared his full analysis with the CEO. He's been complaining to peers but not bringing solutions to the decision-maker.

Next steps:
1. Request a 1:1 with the CEO to share his analysis
2. Prepare a structured presentation with data and recommendations
3. Accept that the final decision isn't his to make, but his input is valuable

[END MARKER: SAM-CHEN-TRANSCRIPT]`
  },
  {
    coach: coaches.sam,
    client: coaches.sam.clients[1], // Rachel Adams
    sessionDate: '2025-12-07',
    title: `SAM-RACHEL-${batchTimestamp}-001: Imposter Syndrome`,
    content: `[ISOLATION MARKER: SAM-CHEN-EXCLUSIVE-${batchTimestamp}]

Coaching session with Rachel Adams facilitated by Sam Chen.

Rachel was recently promoted to VP of Product, making her one of the youngest VPs in company history. Instead of celebrating, she's paralyzed by imposter syndrome.

How it's manifesting:
- She's over-preparing for every meeting (spending 3-4 hours prepping for 30-min syncs)
- She's deferring to more experienced peers even when she has the expertise
- She's having anxiety dreams about being "found out"
- She mentioned considering turning down the promotion

We explored the cognitive distortions:
- "They only promoted me because they needed diversity" (discounting accomplishment)
- "Everyone else seems to know what they're doing" (comparing insides to outsides)
- "I'll be exposed any day now" (catastrophizing)

Reframes we worked on:
- She was promoted based on a track record of delivery, not a single moment
- Other leaders also have doubts - they're just not showing it
- The company has more information about her capabilities than she gives them credit for

The Inside Out "Evidence Log" exercise:
Rachel will keep a daily log of:
1. Decisions she made that worked out
2. Positive feedback received (written or verbal)
3. Moments where her unique perspective added value

We also discussed the "confidence gap" research - how high performers often underestimate themselves while mediocre performers overestimate.

Homework:
1. Start the evidence log immediately
2. Interview 2-3 peers about why they think she was promoted
3. Reduce meeting prep time by 50% as an experiment
4. Practice one "confident behavior" per day (speaking first, taking up space, etc.)

Rachel left the session lighter. She said naming the imposter syndrome and seeing it as a pattern rather than truth was helpful.

[END MARKER: SAM-CHEN-TRANSCRIPT]`
  }
];

// Chunking function
function chunkText(text, maxChunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];
  let wordCount = 0;

  for (const word of words) {
    currentChunk.push(word);
    wordCount++;

    if (wordCount >= maxChunkSize) {
      chunks.push(currentChunk.join(' '));
      // Keep overlap words for context
      currentChunk = currentChunk.slice(-overlap);
      wordCount = currentChunk.length;
    }
  }

  if (currentChunk.length > overlap) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

// Generate embedding
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

async function seedTranscripts() {
  console.log('\n' + '='.repeat(70));
  console.log('🌱 SEEDING FRESH TEST TRANSCRIPTS FOR MATT THIELEMAN');
  console.log('='.repeat(70));
  console.log(`\nBatch timestamp: ${batchTimestamp}`);
  console.log(`Total transcripts to create: ${testTranscripts.length}\n`);

  let successCount = 0;

  for (const transcript of testTranscripts) {
    console.log(`\n📝 Creating: ${transcript.title}`);
    console.log(`   Coach: ${transcript.coach.name}`);
    console.log(`   Client: ${transcript.client.name}`);

    try {
      // 1. Create data_item
      const { data: dataItem, error: itemError } = await supabase
        .from('data_items')
        .insert({
          data_type: 'transcript',
          raw_content: transcript.content,
          metadata: {
            title: transcript.title,
            session_date: transcript.sessionDate,
            coach_name: transcript.coach.name,
            client_name: transcript.client.name,
            batch_id: batchTimestamp,
            test_data: true
          },
          coach_id: transcript.coach.id,
          client_id: transcript.client.id,
          session_date: transcript.sessionDate
        })
        .select()
        .single();

      if (itemError) {
        console.log(`   ❌ Failed to create data_item: ${itemError.message}`);
        continue;
      }

      console.log(`   ✅ Created data_item: ${dataItem.id}`);

      // 2. Chunk the content
      const chunks = chunkText(transcript.content);
      console.log(`   📦 Created ${chunks.length} chunks`);

      // 3. Generate embeddings and insert chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`   🔄 Processing chunk ${i + 1}/${chunks.length}...`);

        const embedding = await generateEmbedding(chunk);

        const { error: chunkError } = await supabase
          .from('data_chunks')
          .insert({
            data_item_id: dataItem.id,
            chunk_index: i,
            content: chunk,
            embedding: embedding,
            metadata: {
              coach_id: transcript.coach.id,
              client_id: transcript.client.id,
              batch_id: batchTimestamp
            }
          });

        if (chunkError) {
          console.log(`   ⚠️ Chunk ${i + 1} failed: ${chunkError.message}`);
        }
      }

      console.log(`   ✅ All chunks embedded successfully`);
      successCount++;

    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Successfully created ${successCount}/${testTranscripts.length} transcripts`);
  console.log('='.repeat(70));

  console.log('\n📋 TESTING GUIDE:');
  console.log('─'.repeat(50));
  console.log('\n🔵 ALEX RIVERA (alex.rivera@insideoutdev.com):');
  console.log('   Should see: Emily Zhang, Sarah Williams transcripts');
  console.log('   Should NOT see: David, Lisa, Michael, Rachel');
  console.log(`   Search for: "ALEX-RIVERA-EXCLUSIVE-${batchTimestamp}"`);

  console.log('\n🟢 JORDAN TAYLOR (jordan.taylor@insideoutdev.com):');
  console.log('   Should see: David Kim, Lisa Park transcripts');
  console.log('   Should NOT see: Emily, Sarah, Michael, Rachel');
  console.log(`   Search for: "JORDAN-TAYLOR-EXCLUSIVE-${batchTimestamp}"`);

  console.log('\n🟡 SAM CHEN (sam.chen@insideoutdev.com):');
  console.log('   Should see: Michael Torres, Rachel Adams transcripts');
  console.log('   Should NOT see: Emily, Sarah, David, Lisa');
  console.log(`   Search for: "SAM-CHEN-EXCLUSIVE-${batchTimestamp}"`);

  console.log('\n🧪 ISOLATION TEST QUERIES:');
  console.log('─'.repeat(50));
  console.log('Each coach should search for ALL three markers:');
  console.log(`   1. "ALEX-RIVERA-EXCLUSIVE-${batchTimestamp}"`);
  console.log(`   2. "JORDAN-TAYLOR-EXCLUSIVE-${batchTimestamp}"`);
  console.log(`   3. "SAM-CHEN-EXCLUSIVE-${batchTimestamp}"`);
  console.log('\nExpected: Each coach only finds their own marker, others return empty.');

  console.log('\n');
}

seedTranscripts().catch(console.error);
