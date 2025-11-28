# Custom GPT Distribution Strategy: Analysis & Recommendations

**Document Created**: 2025-11-26
**Status**: Strategic Reference Document
**Context**: Analysis for 2026 client-facing product launch

---

## Executive Summary

This document analyzes distribution strategies for providing AI chat access to coaches and clients, given these constraints:

- **No credentials visible in chat** (OpenAI not trusted with client data)
- **Auth must be controlled via API key or external login mechanism**
- **Primary focus**: Client-facing product launching 2026

### Key Technical Insight

Custom GPTs **cannot read URL query parameters**. There's no way to seamlessly pass a token from a portal to a GPT. This is a fundamental limitation that shapes all multi-user GPT architectures.

### Decision Matrix

| Approach | Dev Time | Trust Requirement | User Friction | Scales To |
|----------|----------|------------------|---------------|-----------|
| Per-client GPTs | 0 hours | ✅ Met | None | ~50 users |
| Portal + Session Code | 35-50 hours | ✅ Met | Medium | Unlimited |
| Claude Desktop + MCP | 0 hours | ✅ Met (best) | Config file | Unlimited |
| Custom Chat Frontend | 60-100 hours | ✅ Met (best) | None | Unlimited |

---

## Approach A: One Custom GPT Per User

### How It Works
- Create a separate Custom GPT instance for each coach/client
- Each GPT has its own API key pre-configured
- User receives a link, opens it, and immediately has access to their data

### Current State: Already Supported (0 development)

The system already supports this:
1. Admin creates API key via `/api/admin/api-keys`
2. Admin creates Custom GPT in ChatGPT with that API key
3. Admin shares GPT link with user
4. User opens link → immediately sees their data

### Scaling Considerations

| Users | Initial Setup | Schema Update Time | Viable? |
|-------|---------------|-------------------|---------|
| 10 | 3 hours | 1-2 hours | ✅ Easy |
| 25 | 8 hours | 4-5 hours | ✅ Manageable |
| 50 | 15 hours | 8-10 hours | ⚠️ Painful |
| 100+ | 30+ hours | 15+ hours | ❌ Unsustainable |

### Pros
- Zero development required
- Best user experience (no login needed)
- API key never visible to user
- Works today

### Cons
- Manual GPT creation per user
- Schema changes require updating every GPT
- No programmatic GPT management (OpenAI limitation)

---

## Approach B: Single Shared GPT with Dynamic Login

### Why In-Chat Auth Is Rejected

Options B1-B3 (API key in chat, email/password, magic codes) are **rejected** because they expose sensitive data in ChatGPT conversation history.

### Option B4: OAuth 2.0
**Not feasible** - Custom GPTs don't support OAuth redirect flows.

### Option B5: Portal + Session Code (35-50 hours)

**Architecture:**
```
User Experience:
1. Client visits portal.insideoutleadership.com
2. Logs in with email/password (or SSO)
3. Clicks "Launch Coaching Assistant"
4. Portal displays: "Your session code: COACH-7X9K2M (expires in 1 hour)"
5. Portal opens GPT in new tab
6. GPT's first message: "Enter your session code"
7. User pastes: COACH-7X9K2M
8. GPT sends code to API, API returns temporary API key
9. GPT uses that key for all subsequent requests
```

**Flow Diagram:**
```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT PORTAL                            │
│  ┌─────────────┐    ┌──────────────────────────────────┐   │
│  │   Login     │───▶│  Your Session Code: COACH-7X9K2M │   │
│  │  (email/pw) │    │  [Copy] [Launch GPT →]           │   │
│  └─────────────┘    │  Expires in 58 minutes           │   │
│                     └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOM GPT                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Welcome! Please enter your session code to continue. │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  User: COACH-7X9K2M                                        │
│                                                             │
│  GPT: ✓ Session verified! You're logged in as Sarah.       │
└─────────────────────────────────────────────────────────────┘
```

**Security Model:**
- Code expires in 1 hour, single-use
- Code is opaque (no PII, no credentials)
- Portal login is the real auth gate

**Why This Is Still Problematic:**
- Code is visible in chat history (though useless after expiry)
- Extra friction: login → copy code → paste in GPT
- If user shares chat, code is visible

**Development Breakdown:**
- Portal frontend: 12-16 hours
- Portal auth: 8-12 hours
- Session code API: 6-8 hours
- GPT updates + testing: 4-6 hours
- Database migrations: 2-4 hours
- **Total: 35-50 hours**

---

## Option C: Custom Chat Frontend (Recommended for Scale)

### The Case For Building Custom

The portal+GPT architecture is clunky because you're fighting against Custom GPT limitations. A custom chat frontend solves all stated problems.

**Architecture:**
```
Client Browser → Your Chat UI → Your API → OpenAI/Anthropic API
                     │              │
                     │              └── Retrieves context from Supabase
                     │                  Uses RAG pattern
                     └── Handles auth via your existing system
```

### Head-to-Head Comparison

| Factor | Portal + Custom GPT | Custom Chat Frontend |
|--------|--------------------|--------------------|
| **Auth UX** | Login → Copy code → Paste in GPT | Login → Chat (seamless) |
| **Data in OpenAI?** | Yes (all chats stored) | Only API calls (you control) |
| **Chat history** | Owned by OpenAI | Owned by you |
| **Branding** | OpenAI's UI | Fully branded |
| **Cost per message** | $20/user/mo (Plus) or API | Direct API (~$0.01-0.03/msg) |
| **Development time** | 35-50 hours | 60-100 hours |

### Development Breakdown: Custom Chat

1. **Chat UI** (20-30 hours)
   - React/Next.js frontend
   - Vercel AI SDK for streaming
   - Responsive design

2. **Auth Integration** (8-12 hours)
   - Login page
   - Session management
   - API key association

3. **Chat API Backend** (15-20 hours)
   - Message handling
   - RAG integration
   - Conversation history

4. **LLM Integration** (10-15 hours)
   - Claude or GPT-4 API
   - System prompt management
   - Token tracking

5. **Polish & Testing** (10-15 hours)

**Total: 60-100 hours**

### Cost Analysis at Scale

**50 Clients, 100 messages/month = 5,000 messages/month**

| Approach | Monthly Cost |
|----------|-------------|
| ChatGPT Plus (all users) | $1,000/mo |
| Custom + GPT-4 API | $50-150/mo |
| Custom + Claude API | $75-200/mo |
| Custom + GPT-4o-mini | $5-15/mo |

**At scale, custom frontend is 10-100x cheaper.**

### Recommended Tech Stack

```
Frontend:
  - Next.js 14 (App Router)
  - Vercel AI SDK
  - Tailwind CSS
  - shadcn/ui components

Backend:
  - Existing Express API (extend)
  - Add /api/chat endpoint
  - RAG: query Supabase, inject context

LLM:
  - Claude API (trust factor) or GPT-4o-mini (cost)
  - Easy to swap later

Hosting:
  - Vercel (same as current)
```

---

## Alternative: Claude Desktop + MCP

**Already built. 0 additional development.**

**How it works:**
1. Client installs Claude Desktop (free)
2. You provide config file with their API key
3. They add config to Claude Desktop settings
4. They use Claude with full data access

**Advantages:**
- Anthropic > OpenAI (trust factor)
- No per-user GPT management
- Config file is on their machine
- MCP is more powerful than GPT Actions
- Schema changes don't require updates

**Disadvantages:**
- Requires Claude Desktop installation
- Config file setup is slightly technical

---

## Recommendation Summary

### Decision Tree

```
Q: How many clients in 2026?
├── < 25 clients
│   └── Use per-client GPTs (0 dev hours)
│       Best UX, no friction, works today
│
├── 25-50 clients
│   └── Evaluate Claude Desktop as alternative
│       - Tech-comfortable clients → MCP
│       - Others → Per-client GPTs
│
└── 50+ clients OR want seamless UX + data ownership
    └── Build custom chat frontend (60-100 hours)
        - Solves all trust/UX/cost issues
        - 2 extra weeks but permanent solution
```

### The Honest Trade-off

| Approach | Auth in Chat? | User Friction | Scales? |
|----------|---------------|---------------|---------|
| Per-client GPT | No | None | To ~50 |
| Portal + Code | Yes (opaque) | Medium | Unlimited |
| Claude + MCP | No | Config setup | Unlimited |
| Custom Frontend | No | None | Unlimited |

**There's no magic solution that gives you: (1) single GPT, (2) nothing in chat, (3) zero friction. You must pick 2 of 3.**

Custom frontend picks all 3, but costs 60-100 hours of development.

---

## Timeline Comparison

| Approach | To MVP | To Production |
|----------|--------|---------------|
| Per-client GPTs | Today | Today |
| Portal + GPT | 2-3 weeks | 3-4 weeks |
| Custom Frontend | 3-4 weeks | 5-6 weeks |

---

## Version History

| Date | Change |
|------|--------|
| 2025-11-26 | Initial analysis created during Checkpoint 13 |
