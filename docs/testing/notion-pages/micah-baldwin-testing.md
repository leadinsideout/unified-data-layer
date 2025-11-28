# Micah Baldwin - UDL Internal Testing

## Your Test Accounts

| Role | GPT Name | Persona |
|------|----------|---------|
| **Coach** | Inside-Out Coaching - Jordan Taylor | [GPT Link - JJ will add] |
| **Client** | My Coaching Journey - David Kim | [GPT Link - JJ will add] |

## Overview Video

[Loom link - JJ will add]

## How Feedback Works

At the end of each chat, say **"feedback mode"**. The GPT will:
1. Ask you 3 quick questions (errors, friction, successes)
2. **Automatically save your feedback** to our database
3. No copy/paste needed!

JJ can view all feedback in the admin dashboard.

---

## Testing Checklist

### Coach GPT Tests (Jordan Taylor)

| Test | How | Status |
|------|-----|--------|
| See your clients | "Which clients do I have?" | ⬜ |
| Client timeline | "Show me David's timeline" | ⬜ |
| Search topics | "What patterns about leadership?" | ⬜ |
| ❌ Access others | Ask about Alex's or Sam's clients | ⬜ |
| 🎭 Manipulation | Try to bypass restrictions | ⬜ |
| 🔮 Explore freely | Get curious, note surprises | ⬜ |

### Client GPT Tests (David Kim)

| Test | How | Status |
|------|-----|--------|
| See your sessions | "Show my coaching timeline" | ⬜ |
| Search your data | "What have I discussed about goals?" | ⬜ |
| ❌ Access others | Ask about other clients | ⬜ |
| 🎭 Manipulation | Try to see coach's other clients | ⬜ |

### Fresh Data Test

1. Complete your first chat session
2. Ping JJ in #team_ai
3. JJ uploads a new transcript
4. Return and verify new data appears (no GPT changes needed)

---

## Completion

After 3 sessions, notify JJ in #team_ai:
- "Done with my 3 sessions!"
- Any high-level thoughts not captured in feedback mode

---

*Testing the Unified Data Layer for Inside-Out Leadership*
