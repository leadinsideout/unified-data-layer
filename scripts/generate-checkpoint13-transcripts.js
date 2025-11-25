#!/usr/bin/env node

/**
 * Checkpoint 13: Multi-Tenant Verification Transcript Generator
 *
 * Generates realistic coaching transcripts for each coach-client pair
 * with unique identifying content for isolation testing.
 *
 * Each transcript contains:
 * - Client-specific unique markers (for isolation verification)
 * - Realistic startup founder coaching themes
 * - Searchable keywords for positive tests
 */

// Client data with unique themes and markers
const clientData = {
  // Alex Rivera's clients (4)
  'sarah-williams': {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Sarah Williams',
    title: 'VP of Product',
    org: 'Acme Media',
    coachId: '550e8400-e29b-41d4-a716-446655440010',
    coachName: 'Alex Rivera',
    themes: ['product strategy', 'team scaling', 'executive presence'],
    uniqueMarker: 'SARAH_ACME_UNIQUE_MARKER_7X9K',
    secretProject: 'Project Nexus - Q1 product roadmap overhaul'
  },
  'emily-zhang': {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Emily Zhang',
    title: 'CEO',
    org: 'TechCorp Inc',
    coachId: '550e8400-e29b-41d4-a716-446655440010',
    coachName: 'Alex Rivera',
    themes: ['fundraising', 'board management', 'strategic vision'],
    uniqueMarker: 'EMILY_TECHCORP_UNIQUE_MARKER_3M2P',
    secretProject: 'Series B preparation - $50M target'
  },
  'priya-sharma': {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Priya Sharma',
    title: 'Co-founder & CTO',
    org: 'GrowthLabs',
    coachId: '550e8400-e29b-41d4-a716-446655440010',
    coachName: 'Alex Rivera',
    themes: ['technical leadership', 'engineering culture', 'co-founder dynamics'],
    uniqueMarker: 'PRIYA_GROWTHLABS_UNIQUE_MARKER_8T4V',
    secretProject: 'Platform migration to Kubernetes'
  },
  'marcus-johnson': {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Marcus Johnson',
    title: 'Founder & CEO',
    org: 'ScaleUp Ventures',
    coachId: '550e8400-e29b-41d4-a716-446655440010',
    coachName: 'Alex Rivera',
    themes: ['fintech regulations', 'investor relations', 'personal brand'],
    uniqueMarker: 'MARCUS_SCALEUP_UNIQUE_MARKER_2R6Y',
    secretProject: 'Banking license application'
  },

  // Jordan Taylor's clients (3)
  'david-kim': {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'David Kim',
    title: 'VP of Sales',
    org: 'TechCorp Inc',
    coachId: '550e8400-e29b-41d4-a716-446655440012',
    coachName: 'Jordan Taylor',
    themes: ['sales leadership', 'quota management', 'enterprise deals'],
    uniqueMarker: 'DAVID_TECHCORP_UNIQUE_MARKER_5N1Q',
    secretProject: 'Enterprise expansion - Fortune 500 strategy'
  },
  'lisa-park': {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Lisa Park',
    title: 'VP of Engineering',
    org: 'GrowthLabs',
    coachId: '550e8400-e29b-41d4-a716-446655440012',
    coachName: 'Jordan Taylor',
    themes: ['engineering management', 'technical debt', 'hiring strategy'],
    uniqueMarker: 'LISA_GROWTHLABS_UNIQUE_MARKER_9W3Z',
    secretProject: 'AI/ML team buildout'
  },
  'james-wilson': {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'James Wilson',
    title: 'Managing Partner',
    org: 'Innovate Partners',
    coachId: '550e8400-e29b-41d4-a716-446655440012',
    coachName: 'Jordan Taylor',
    themes: ['partnership dynamics', 'client acquisition', 'thought leadership'],
    uniqueMarker: 'JAMES_INNOVATE_UNIQUE_MARKER_4H8B',
    secretProject: 'European market expansion'
  },

  // Sam Chen's clients (4)
  'michael-torres': {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Michael Torres',
    title: 'Director of Engineering',
    org: 'Acme Media',
    coachId: '550e8400-e29b-41d4-a716-446655440011',
    coachName: 'Sam Chen',
    themes: ['career advancement', 'stakeholder management', 'technical influence'],
    uniqueMarker: 'MICHAEL_ACME_UNIQUE_MARKER_6L2D',
    secretProject: 'VP promotion path - 18 month plan'
  },
  'amanda-foster': {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: 'Amanda Foster',
    title: 'COO',
    org: 'ScaleUp Ventures',
    coachId: '550e8400-e29b-41d4-a716-446655440011',
    coachName: 'Sam Chen',
    themes: ['operational excellence', 'scaling processes', 'CEO succession'],
    uniqueMarker: 'AMANDA_SCALEUP_UNIQUE_MARKER_1F7J',
    secretProject: 'SOC 2 compliance initiative'
  },
  'kevin-chen': {
    id: '550e8400-e29b-41d4-a716-44665544000a',
    name: 'Kevin Chen',
    title: 'Director of Strategy',
    org: 'Innovate Partners',
    coachId: '550e8400-e29b-41d4-a716-446655440011',
    coachName: 'Sam Chen',
    themes: ['strategic planning', 'cross-functional leadership', 'M&A integration'],
    uniqueMarker: 'KEVIN_INNOVATE_UNIQUE_MARKER_0G5K',
    secretProject: 'Acquisition target analysis'
  },
  'rachel-adams': {
    id: '550e8400-e29b-41d4-a716-44665544000b',
    name: 'Rachel Adams',
    title: 'Head of Product',
    org: 'GrowthLabs',
    coachId: '550e8400-e29b-41d4-a716-446655440011',
    coachName: 'Sam Chen',
    themes: ['product-market fit', 'user research', 'roadmap prioritization'],
    uniqueMarker: 'RACHEL_GROWTHLABS_UNIQUE_MARKER_3C9M',
    secretProject: 'Enterprise pivot strategy'
  }
};

// Session templates for realistic coaching content
const sessionTemplates = [
  {
    type: 'quarterly-review',
    template: (client) => `
Coaching Session: Quarterly Review
Client: ${client.name}, ${client.title} at ${client.org}
Coach: ${client.coachName}
Date: {{DATE}}
Session Marker: ${client.uniqueMarker}

${client.coachName}: Welcome back, ${client.name.split(' ')[0]}. I've been looking forward to our quarterly review. How are you feeling about the progress we've made?

${client.name.split(' ')[0]}: Thank you, ${client.coachName.split(' ')[0]}. It's been an intense quarter. ${client.secretProject} has consumed most of my bandwidth, but I feel like we're making real progress.

${client.coachName}: Tell me more about ${client.secretProject}. What's working well?

${client.name.split(' ')[0]}: The team is finally aligned. We had some resistance initially, especially around ${client.themes[0]}, but after our last session where you helped me reframe the narrative, things clicked.

${client.coachName}: I'm glad that ${client.themes[0]} framework is paying off. What challenges remain?

${client.name.split(' ')[0]}: Honestly, the biggest challenge is ${client.themes[1]}. As we scale, I'm finding it harder to maintain the quality of interactions with my team.

${client.coachName}: Let's dig into that. When you say ${client.themes[1]}, what specifically concerns you?

${client.name.split(' ')[0]}: I used to have weekly 1:1s with everyone. Now with the growth, it's impossible. I'm worried about losing touch with the pulse of the organization.

${client.coachName}: This is a common inflection point for leaders at your stage. Let me share a model that's helped other executives I've worked with...

[Session continues with detailed discussion of leadership scaling strategies, action items, and next steps related to ${client.themes.join(', ')}]

Action Items:
1. Implement skip-level meetings every two weeks
2. Create a "listening tour" schedule for Q2
3. Document ${client.secretProject} milestones for board presentation
4. Practice ${client.themes[2]} exercises before next town hall

Next session: Focus on ${client.themes[2]} development
`
  },
  {
    type: 'challenge-session',
    template: (client) => `
Coaching Session: Challenge Deep-Dive
Client: ${client.name}, ${client.title} at ${client.org}
Coach: ${client.coachName}
Date: {{DATE}}
Unique Identifier: ${client.uniqueMarker}

${client.coachName}: ${client.name.split(' ')[0]}, you mentioned in your pre-session notes that you're facing a significant challenge with ${client.themes[0]}. Walk me through what's happening.

${client.name.split(' ')[0]}: ${client.coachName.split(' ')[0]}, I'm at a crossroads. ${client.secretProject} has hit a major roadblock. The board is asking tough questions, and I'm not sure I have the answers.

${client.coachName}: Let's break this down. What exactly is the board concerned about?

${client.name.split(' ')[0]}: They want to see faster progress on ${client.themes[1]}. Our metrics aren't where we projected them to be.

${client.coachName}: When you think about ${client.themes[1]} in the context of ${client.org}'s current stage, what does success actually look like?

${client.name.split(' ')[0]}: That's a good question. I think I've been measuring myself against industry benchmarks that don't apply to our unique situation.

${client.coachName}: Exactly. Let's redefine success metrics that align with ${client.org}'s specific context. What would you say are the three most critical indicators?

${client.name.split(' ')[0]}: For ${client.secretProject} specifically, I'd say: customer retention, team velocity, and stakeholder confidence.

${client.coachName}: Now we're getting somewhere. How do these connect to your work on ${client.themes[2]}?

${client.name.split(' ')[0]}: ${client.themes[2]} is the thread that ties it all together. If I can improve that, everything else follows.

${client.coachName}: What's one action you could take this week that would move the needle on ${client.themes[2]}?

${client.name.split(' ')[0]}: I've been avoiding a difficult conversation with my leadership team about expectations. That needs to happen.

${client.coachName}: Tell me about your hesitation around that conversation.

[Detailed exploration of communication patterns, stakeholder management, and executive presence development]

Key Insights:
- ${client.name} recognizes the need for clearer metrics alignment
- ${client.secretProject} requires reframing for stakeholder buy-in
- ${client.themes[2]} is the critical development area for next quarter

Follow-up: Schedule role-play session for difficult conversation practice
`
  },
  {
    type: 'goal-setting',
    template: (client) => `
Coaching Session: Goal Alignment & Planning
Client: ${client.name}, ${client.title} at ${client.org}
Coach: ${client.coachName}
Date: {{DATE}}
Session ID: ${client.uniqueMarker}

${client.coachName}: ${client.name.split(' ')[0]}, as we enter this new planning cycle, I want to make sure our coaching goals are aligned with what matters most to you professionally and personally.

${client.name.split(' ')[0]}: ${client.coachName.split(' ')[0]}, that's perfect timing. ${client.org} is going through major changes, and I need to recalibrate.

${client.coachName}: What's driving that need for recalibration?

${client.name.split(' ')[0]}: ${client.secretProject} is entering its critical phase. My role is expanding, and I need to develop new capabilities, particularly in ${client.themes[0]}.

${client.coachName}: Let's map out what ${client.themes[0]} looks like at the next level. Where do you feel most confident, and where do you see gaps?

${client.name.split(' ')[0]}: I'm confident in the tactical execution. Where I need growth is in ${client.themes[1]} - specifically, how to influence without direct authority.

${client.coachName}: That's a sophisticated leadership challenge. At ${client.org}, who are the key stakeholders you need to influence?

${client.name.split(' ')[0]}: The executive team, board members, and increasingly, external partners. It's a different game than what got me here.

${client.coachName}: You're right - what got you here won't get you there. Let's design a development plan that addresses ${client.themes[1]} and ${client.themes[2]}.

${client.name.split(' ')[0]}: I appreciate that you understand the nuances of my situation. The complexity at ${client.org} isn't always obvious to outsiders.

${client.coachName}: That's why our work together goes beyond generic leadership advice. We're crafting a path that's specific to ${client.name}'s journey at ${client.org}.

[Goal-setting framework discussion with SMART goals, accountability structures, and milestone planning]

Goals Established:
1. Master ${client.themes[0]} fundamentals by end of Q1
2. Build ${client.themes[1]} influence map and engagement strategy
3. Develop ${client.themes[2]} through deliberate practice
4. ${client.secretProject} - achieve key milestone by month-end

Support Needed:
- Weekly check-ins during critical ${client.secretProject} phases
- Access to peer coaching cohort for ${client.themes[0]} practitioners
- Book recommendations on ${client.themes[1]}
`
  },
  {
    type: 'breakthrough',
    template: (client) => `
Coaching Session: Breakthrough Moment
Client: ${client.name}, ${client.title} at ${client.org}
Coach: ${client.coachName}
Date: {{DATE}}
Reference: ${client.uniqueMarker}

${client.coachName}: ${client.name.split(' ')[0]}! I can tell from your energy that something significant has happened. What's going on?

${client.name.split(' ')[0]}: ${client.coachName.split(' ')[0]}, I had a breakthrough! Everything we've been working on around ${client.themes[0]} finally clicked in yesterday's board meeting.

${client.coachName}: Tell me everything. What made the difference?

${client.name.split(' ')[0]}: Remember how we practiced reframing ${client.secretProject} as a strategic opportunity rather than a challenge? I used that exact framework.

${client.coachName}: How did the board respond?

${client.name.split(' ')[0]}: They were engaged in a way I haven't seen before. For the first time, they asked follow-up questions that showed they actually understood the vision.

${client.coachName}: That's the power of ${client.themes[2]} - when you communicate with confidence and clarity, people lean in. What else contributed to this success?

${client.name.split(' ')[0]}: The preparation work we did on ${client.themes[1]}. I anticipated their concerns and addressed them proactively.

${client.coachName}: You've integrated multiple aspects of our work - ${client.themes.join(', ')}. This is what mastery looks like.

${client.name.split(' ')[0]}: I feel like I've leveled up. The imposter syndrome that used to plague me before these meetings is significantly diminished.

${client.coachName}: Let's anchor this win. What specific behaviors will you continue that led to this breakthrough?

${client.name.split(' ')[0]}: Pre-meeting preparation with stakeholder mapping, practicing my key messages out loud, and arriving with an abundance mindset rather than defensiveness.

${client.coachName}: Those are powerful practices. How can you apply them to ${client.secretProject}'s next phase?

[Discussion of applying breakthrough lessons to upcoming challenges]

Celebration:
- Board meeting success demonstrates growth in ${client.themes.join(' and ')}
- ${client.name} has internalized coaching frameworks
- Ready for increased challenge level in future sessions

Next Steps:
- Document the breakthrough process for future reference
- Apply same preparation framework to ${client.secretProject} stakeholder presentations
- Schedule debrief after next major ${client.org} milestone
`
  }
];

// Generate dates for sessions (spread over past 6 months)
function generateSessionDates(numSessions) {
  const dates = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));

  for (let i = 0; i < numSessions; i++) {
    const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
    dates.push(new Date(randomTime));
  }

  return dates.sort((a, b) => a - b);
}

// Generate all transcripts
function generateAllTranscripts() {
  const transcripts = [];

  for (const [clientKey, client] of Object.entries(clientData)) {
    // Generate 4 sessions per client (44 total)
    const dates = generateSessionDates(4);

    sessionTemplates.forEach((template, index) => {
      const sessionDate = dates[index] || dates[dates.length - 1];
      let content = template.template(client);
      content = content.replace('{{DATE}}', sessionDate.toISOString().split('T')[0]);

      transcripts.push({
        clientId: client.id,
        clientName: client.name,
        coachId: client.coachId,
        coachName: client.coachName,
        org: client.org,
        sessionDate: sessionDate.toISOString(),
        sessionType: template.type,
        content: content.trim(),
        uniqueMarker: client.uniqueMarker,
        secretProject: client.secretProject,
        themes: client.themes
      });
    });
  }

  return transcripts;
}

// Output JSON for upload
const transcripts = generateAllTranscripts();

console.log(JSON.stringify({
  metadata: {
    generated: new Date().toISOString(),
    purpose: 'Checkpoint 13 Multi-Tenant Verification',
    totalTranscripts: transcripts.length,
    clientCount: Object.keys(clientData).length,
    uniqueMarkers: Object.values(clientData).map(c => ({
      client: c.name,
      marker: c.uniqueMarker,
      coach: c.coachName
    }))
  },
  transcripts: transcripts
}, null, 2));
