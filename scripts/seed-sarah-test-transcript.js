/**
 * Seed a test transcript for Sarah Williams
 *
 * Creates a coaching session dated within the past week to test
 * that Custom GPT can retrieve fresh data automatically.
 *
 * Sarah Williams:
 * - client_id: 550e8400-e29b-41d4-a716-446655440001
 * - coach_id: 550e8400-e29b-41d4-a716-446655440010 (Alex Rivera)
 * - client_organization_id: 550e8400-e29b-41d4-a716-446655440200 (Acme Media)
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

// Sarah Williams' IDs
const SARAH_CLIENT_ID = '550e8400-e29b-41d4-a716-446655440001';
const ALEX_COACH_ID = '550e8400-e29b-41d4-a716-446655440010';
const ACME_MEDIA_ORG_ID = '550e8400-e29b-41d4-a716-446655440200';

// Generate a date within the past week
function getRecentDate() {
  const today = new Date();
  // 3-5 days ago to ensure it's clearly "this week"
  const daysAgo = 3 + Math.floor(Math.random() * 3);
  today.setDate(today.getDate() - daysAgo);
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Chunk text into smaller pieces for embedding
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (words.length <= chunkSize) {
    return [text.trim()];
  }

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start += chunkSize - overlap;
    if (start + overlap >= words.length) break;
  }

  return chunks;
}

// Test transcript content - a realistic coaching session
const sessionDate = getRecentDate();

const transcriptContent = `
Coaching Session - Sarah Williams and Alex Rivera
Date: ${sessionDate}
Session Focus: Navigating Q4 Performance Reviews and Setting 2026 Goals

Alex: Good morning Sarah! How are you feeling as we head into the final stretch of the year?

Sarah: Morning Alex. Honestly, I'm feeling a mix of excitement and anxiety. Q4 is always intense at Acme Media, and with the performance review cycle starting next week, there's a lot on my plate.

Alex: That's understandable. Performance reviews can bring up a lot of emotions. Let's unpack that a bit. What specifically is causing the anxiety?

Sarah: I think it's two things. First, I have to deliver feedback to two team members who haven't been performing at the level I need. And second, my own review with leadership is coming up, and I want to make sure I'm advocating for myself effectively.

Alex: Both are significant. Let's start with the feedback conversations since those are more time-sensitive. Tell me about the two team members and what's been happening.

Sarah: So, one is Marcus. He's technically brilliant but has been increasingly dismissive in team meetings. People are starting to avoid working with him. The other is Jennifer - she's been missing deadlines consistently for the past two months, and the quality of her work has dropped.

Alex: These are two very different situations. With Marcus, it sounds like a behavior issue affecting team dynamics. With Jennifer, it could be performance but might also signal something else going on. Have you had any preliminary conversations with either of them?

Sarah: I talked to Marcus briefly about the meeting behavior, but I think I was too gentle. I said something like "it would be great if we could be more collaborative" and he just nodded and nothing changed. With Jennifer, I haven't addressed it directly yet. I've been hoping it would resolve itself.

Alex: Let's pause there. What do you notice about your approach in both cases?

Sarah: [pause] I'm avoiding the hard conversation. With Marcus, I softened it so much it didn't land. With Jennifer, I haven't even started.

Alex: That's a really honest observation. What do you think is behind that avoidance?

Sarah: I think... I want people to like me. And I worry that having these tough conversations will damage the relationship. What if Marcus gets defensive? What if Jennifer cries? I don't know how to handle that.

Alex: This is a really common challenge for leaders, especially those who value relationships highly. Here's what I want you to consider: by avoiding these conversations, are you actually protecting the relationship, or are you protecting yourself from discomfort?

Sarah: Ouch. That lands. I think I'm protecting myself. And in the meantime, the problems are getting worse, which isn't fair to Marcus, Jennifer, or the rest of the team.

Alex: Exactly. And here's the paradox - having direct, honest conversations often deepens trust and respect, even if they're uncomfortable in the moment. People generally want to know where they stand. Let's work on preparing for these conversations. Which one feels more urgent?

Sarah: Marcus, I think. The team dynamic is suffering, and I have two major projects launching in January that need cross-functional collaboration.

Alex: Okay. Let's use the SBI model - Situation, Behavior, Impact. Can you describe a specific situation where Marcus was dismissive?

Sarah: Last Tuesday's product roadmap meeting. When our junior designer, Priya, presented her user research, Marcus interrupted her twice and said "we don't have time for academic exercises." Priya went quiet for the rest of the meeting and hasn't spoken up since.

Alex: That's a clear example. Now, what was the impact of that behavior?

Sarah: Priya felt shut down. The team didn't get the benefit of her research. Other junior team members probably took note that it's not safe to share ideas. And honestly, the decision we made in that meeting wasn't as strong because we didn't have all the input.

Alex: Excellent. Now you have the elements for a direct conversation. How would you open it?

Sarah: "Marcus, I need to talk to you about what happened in Tuesday's meeting when you interrupted Priya."

Alex: Good start. What if he gets defensive or denies it?

Sarah: I stay with the facts. I saw it happen. I name the specific behavior and the impact. And I ask him to commit to a different approach going forward.

Alex: What's the outcome you're looking for from this conversation?

Sarah: I want Marcus to understand that his behavior is hurting the team and that it needs to change. I want him to agree to specific changes - like not interrupting in meetings, or if he disagrees with something, to ask questions instead of dismissing ideas.

Alex: And what's your commitment to follow up?

Sarah: I'll watch for the behavior in meetings and address it immediately if it happens again. And I'll check in with him in two weeks to see how it's going.

Alex: This is solid, Sarah. How are you feeling about having this conversation now?

Sarah: Nervous, but prepared. I think having the specific example makes it harder for him to deflect.

Alex: When will you have this conversation?

Sarah: Tomorrow. I'll schedule a one-on-one with him for the morning.

Alex: Perfect. Now let's briefly touch on your own performance review. What do you want to walk away with?

Sarah: A clear understanding of where I stand, recognition for the AI integration project success, and a conversation about my path to Senior Director.

Alex: What evidence will you bring to support your case?

Sarah: The AI project delivered 40% efficiency gains and came in under budget. I'll bring the metrics, the stakeholder feedback, and the timeline showing we delivered two weeks early.

Alex: Strong. And what about the areas where you know you need to grow?

Sarah: Executive presence and strategic communication. I've been working on those, but I want to acknowledge them proactively rather than wait for feedback.

Alex: That's a mature approach. Being able to name your own development areas demonstrates self-awareness, which is a key leadership trait.

Sarah: This has been really helpful, Alex. I feel like I have a clear plan for both the Marcus conversation and my own review.

Alex: You've done the hard work of honest self-reflection today. That's what makes the difference. Let's check in next week after both conversations have happened.

Sarah: Sounds good. Thanks, Alex.

Alex: Thank you, Sarah. Remember - courage isn't the absence of fear, it's taking action despite the fear. You've got this.
`;

async function seedTranscript() {
  console.log('\n' + '='.repeat(60));
  console.log('SEEDING TEST TRANSCRIPT FOR SARAH WILLIAMS');
  console.log('='.repeat(60) + '\n');

  console.log(`Session Date: ${sessionDate}`);
  console.log(`Client: Sarah Williams (${SARAH_CLIENT_ID})`);
  console.log(`Coach: Alex Rivera (${ALEX_COACH_ID})`);
  console.log(`Organization: Acme Media (${ACME_MEDIA_ORG_ID})`);
  console.log('');

  try {
    // 1. Create the data item
    console.log('1. Creating data item...');

    const { data: dataItem, error: itemError } = await supabase
      .from('data_items')
      .insert({
        data_type: 'transcript',
        raw_content: transcriptContent.trim(),
        metadata: {
          title: `Coaching Session - ${sessionDate} - Q4 Reviews and Goal Setting`,
          slug: `sarah-williams-${sessionDate}-q4-reviews`,
          topics: ['performance reviews', 'difficult conversations', 'leadership', 'goal setting', 'executive presence'],
          session_number: 'test-seed',
          source: 'test-seed'
        },
        coach_id: ALEX_COACH_ID,
        client_id: SARAH_CLIENT_ID,
        client_organization_id: ACME_MEDIA_ORG_ID,
        session_date: sessionDate
      })
      .select()
      .single();

    if (itemError) {
      throw new Error(`Failed to create data item: ${itemError.message}`);
    }

    console.log(`   Created data_item: ${dataItem.id}`);

    // 2. Chunk the content
    console.log('\n2. Chunking content...');
    const chunks = chunkText(transcriptContent.trim());
    console.log(`   Created ${chunks.length} chunks`);

    // 3. Generate embeddings and store chunks
    console.log('\n3. Generating embeddings and storing chunks...');
    let chunksProcessed = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk
      });
      const embedding = embeddingResponse.data[0].embedding;

      // Store chunk with embedding
      const { error: chunkError } = await supabase
        .from('data_chunks')
        .insert({
          data_item_id: dataItem.id,
          chunk_index: i,
          content: chunk,
          embedding,
          metadata: {
            source: 'test-seed',
            session_date: sessionDate
          }
        });

      if (chunkError) {
        console.error(`   Failed to store chunk ${i}: ${chunkError.message}`);
      } else {
        chunksProcessed++;
        process.stdout.write(`   Processing chunk ${i + 1}/${chunks.length}\r`);
      }
    }

    console.log(`\n   Stored ${chunksProcessed}/${chunks.length} chunks with embeddings`);

    // 4. Verify the data
    console.log('\n4. Verifying data...');

    const { data: verifyItem } = await supabase
      .from('data_items')
      .select('id, data_type, session_date, client_id, coach_id')
      .eq('id', dataItem.id)
      .single();

    const { count: chunkCount } = await supabase
      .from('data_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('data_item_id', dataItem.id);

    console.log(`   Data item verified: ${verifyItem.id}`);
    console.log(`   Session date: ${verifyItem.session_date}`);
    console.log(`   Chunks stored: ${chunkCount}`);

    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS - Test transcript seeded!');
    console.log('='.repeat(60));
    console.log('\nThe Sarah Williams GPT should now return this session');
    console.log('when asking about recent sessions or Q4 performance reviews.');
    console.log('');
    console.log('Test queries to try:');
    console.log('  - "What did we discuss in our most recent session?"');
    console.log('  - "Tell me about our conversation on performance reviews"');
    console.log('  - "What advice did Alex give about difficult conversations?"');
    console.log('');

  } catch (error) {
    console.error('\nERROR:', error.message);
    process.exit(1);
  }
}

seedTranscript();
