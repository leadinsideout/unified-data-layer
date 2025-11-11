/**
 * Seed sample coaching transcripts for testing
 *
 * Creates a realistic coaching journey for a fictional client (Sarah)
 * across multiple sessions covering different topics and showing progression.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Sample transcripts following Sarah's coaching journey
const sampleTranscripts = [
  {
    meeting_date: '2025-11-01T10:00:00',
    raw_text: `This is a coaching session focused on executive presence and authentic leadership. The client, Sarah, is a VP of Engineering struggling with imposter syndrome after a recent promotion. We discussed the concept of conscious leadership and how vulnerability can be a strength rather than weakness. Sarah shared a breakthrough moment where she realized her team respects her technical expertise but she has been hiding her uncertainty about strategic decisions. We explored the Inside Out Leadership framework, specifically the principle that self-awareness precedes effective leadership. Sarah committed to practicing transparent communication in her next all-hands meeting, sharing both what she knows and what she is still figuring out. This session marked a significant shift in her willingness to lead authentically rather than projecting false confidence.`,
    metadata: {
      client_name: 'Sarah Chen',
      session_number: 1,
      topics: ['executive presence', 'imposter syndrome', 'authentic leadership', 'vulnerability']
    }
  },
  {
    meeting_date: '2025-11-08T10:00:00',
    raw_text: `Follow-up session with Sarah focusing on delegation and trust. Sarah reported success from last week's transparent all-hands communication - her team responded positively to her honesty. However, she's now struggling with micromanagement tendencies, especially with junior engineers. We explored her fear of failure and how it manifests as over-control. Sarah recognized that her perfectionism stems from wanting to protect her team from mistakes, but it's actually limiting their growth. We practiced the GROW coaching model to help her coach rather than direct. She committed to identifying three tasks she can fully delegate this week, including giving clear outcomes but not dictating the process. We also discussed the concept of 'productive failure' and how learning from mistakes builds stronger teams.`,
    metadata: {
      client_name: 'Sarah Chen',
      session_number: 2,
      topics: ['delegation', 'trust', 'micromanagement', 'perfectionism', 'team development']
    }
  },
  {
    meeting_date: '2025-11-15T10:00:00',
    raw_text: `Session focused on strategic thinking and executive visibility. Sarah successfully delegated the three tasks from last week and was surprised by the creative solutions her team developed. Now facing a new challenge: she's been invited to present to the board but feels unprepared for strategic conversations. We explored the difference between tactical execution (her comfort zone) and strategic vision (required at VP level). Sarah tends to dive into technical details when nervous, losing the bigger picture. We practiced elevator pitches and the pyramid principle for executive communication. She realized she needs to shift from 'how we build it' to 'why it matters for the business'. We developed a framework for translating engineering work into business impact metrics. Sarah will practice presenting her Q4 roadmap using this framework before the board meeting.`,
    metadata: {
      client_name: 'Sarah Chen',
      session_number: 3,
      topics: ['strategic thinking', 'executive communication', 'board presentations', 'business impact']
    }
  },
  {
    meeting_date: '2025-11-22T14:00:00',
    raw_text: `Crisis coaching session. Sarah's board presentation went well, but she's dealing with unexpected team conflict. Two senior engineers had a public disagreement in Slack about architectural decisions, and Sarah froze instead of addressing it. We explored her conflict avoidance patterns and fear of being disliked. Sarah admitted she wants everyone to get along and struggles with the authority aspects of leadership. We discussed the concept of 'radical candor' - caring personally while challenging directly. The real issue isn't the technical disagreement but the public nature and lack of psychological safety. We role-played difficult conversations and Sarah practiced holding space for disagreement without trying to immediately solve or smooth things over. She committed to having separate conversations with both engineers today and then facilitating a structured technical discussion tomorrow.`,
    metadata: {
      client_name: 'Sarah Chen',
      session_number: 4,
      topics: ['conflict resolution', 'difficult conversations', 'psychological safety', 'radical candor', 'leadership authority']
    }
  },
  {
    meeting_date: '2025-11-29T10:00:00',
    raw_text: `Progress review and focus on work-life integration. Sarah successfully resolved the team conflict and reported feeling more confident in addressing issues directly. However, she's burning out - working 12-hour days and feeling guilty about not being available on weekends. We explored her beliefs about what it means to be a 'good leader' and discovered she's equating availability with value. Sarah shared that she checks Slack at 11pm 'just in case' and cancels personal plans when work comes up. We discussed the research on sustainable leadership and how modeling healthy boundaries is actually more important than being always-on. She realized her behavior is setting an unhealthy example for her team. We created a boundary experiment: no work communications after 7pm or on Saturdays for two weeks. Sarah will delegate her 'backup' role to a rotating on-call schedule. She acknowledged her fear that people will think she's not committed, but understands this is about long-term sustainability.`,
    metadata: {
      client_name: 'Sarah Chen',
      session_number: 5,
      topics: ['work-life balance', 'burnout prevention', 'boundaries', 'sustainable leadership', 'modeling behavior']
    }
  },
  {
    meeting_date: '2025-12-06T10:00:00',
    raw_text: `Session on building a leadership team and developing others. Sarah maintained her boundaries successfully and reported feeling more energized. Now focusing on Q1 planning and realized she needs to develop her senior engineers into leaders. We explored the difference between being a great individual contributor and developing other leaders. Sarah tends to solve problems herself rather than coaching her team through solutions. We introduced the 'coaching habit' framework and practiced asking powerful questions instead of giving answers. She identified three senior engineers ready for more leadership responsibility and we created development plans for each. Sarah committed to spending 30% of her 1-on-1 time on career development conversations rather than just project updates. We also discussed succession planning and how developing her team is actually what will allow her own career growth.`,
    metadata: {
      client_name: 'Sarah Chen',
      session_number: 6,
      topics: ['leadership development', 'coaching others', 'succession planning', 'career development', 'delegation']
    }
  },
  {
    meeting_date: '2025-12-13T10:00:00',
    raw_text: `Year-end reflection and 2026 goal setting. Sarah reviewed her growth over the past six sessions - from hiding uncertainty to leading authentically, from micromanaging to empowering, from conflict avoidance to direct communication, from burnout to boundaries, and from doing to developing others. She's most proud of her team's growth and the psychological safety they've built. For 2026, Sarah wants to focus on strategic influence beyond her organization. She's been invited to join the company's strategic planning committee and wants to have more impact on company direction. We explored her hesitation about 'playing politics' and reframed influence as advocating for her team and values. We discussed the concept of 'strategic relationships' and mapped key stakeholders. Sarah committed to having coffee with one leader from another function each month. Her biggest insight: leadership isn't about having all the answers, it's about asking better questions and creating space for others to grow.`,
    metadata: {
      client_name: 'Sarah Chen',
      session_number: 7,
      topics: ['reflection', 'goal setting', 'strategic influence', 'stakeholder management', 'leadership philosophy']
    }
  }
];

async function seedDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('🌱 SEEDING SAMPLE COACHING DATA');
  console.log('='.repeat(60) + '\n');

  console.log(`Creating ${sampleTranscripts.length} coaching sessions for Sarah Chen...\n`);

  let successCount = 0;

  for (let i = 0; i < sampleTranscripts.length; i++) {
    const transcript = sampleTranscripts[i];
    console.log(`[${i + 1}/${sampleTranscripts.length}] Session ${transcript.metadata.session_number} - ${transcript.meeting_date}`);
    console.log(`  Topics: ${transcript.metadata.topics.join(', ')}`);

    // Insert transcript
    const { data, error } = await supabase
      .from('transcripts')
      .insert({
        raw_text: transcript.raw_text,
        meeting_date: transcript.meeting_date,
        metadata: transcript.metadata
      })
      .select()
      .single();

    if (error) {
      console.log(`  ❌ Failed: ${error.message}\n`);
      continue;
    }

    console.log(`  ✅ Created transcript: ${data.id}`);
    successCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully created ${successCount}/${sampleTranscripts.length} transcripts`);
  console.log('='.repeat(60));

  if (successCount > 0) {
    console.log('\n📝 Next steps:');
    console.log('   1. Run: node scripts/embed.js');
    console.log('      This will generate embeddings for all transcripts');
    console.log('   2. Test your Custom GPT with queries like:');
    console.log('      - "Show me Sarah\'s progress with delegation"');
    console.log('      - "Find sessions about work-life balance"');
    console.log('      - "How did Sarah handle conflict?"');
    console.log('      - "What topics were covered in November?"');
  }

  console.log('\n');
}

seedDatabase().catch(console.error);
