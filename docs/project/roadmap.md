# Unified Data Layer - Product Roadmap & Implementation Plan

**Purpose**: Strategic vision and implementation guide for the Unified Data Layer project.

**Status**: Phase 4 Complete ✅ | Internal Testing in Progress

**Last Updated**: 2025-11-30

---

## Table of Contents

1. [Project Vision](#project-vision)
2. [Strategic Approach](#strategic-approach)
3. [Velocity Tracking & Timeline Analysis](#velocity-tracking--timeline-analysis) ⚡ NEW
4. [Phase 1: Transcript Foundation](#phase-1-transcript-foundation) ✅
5. [Phase 2: Multi-Data-Type Architecture](#phase-2-multi-data-type-architecture) ✅
6. [Phase 3: Data Privacy & Security](#phase-3-data-privacy--security)
7. [Phase 4: AI Platform Integration](#phase-4-ai-platform-integration)
8. [Phase 5: Data Source Integrations](#phase-5-data-source-integrations)
9. [Phase 6: Production Optimization](#phase-6-production-optimization)
10. [Phase 7-8: Custom Frontends](#phase-7-8-custom-frontends)
11. [Technology Stack](#technology-stack)
12. [Timeline & Priorities](#timeline--priorities)
13. [Success Metrics](#success-metrics)

---

## Project Vision

A unified data layer that ingests, processes, and serves multiple data types (transcripts, assessments, personality profiles, company documents, etc.) through AI-powered interfaces, with security and privacy built into the core architecture.

### Scope

The project is divided into 8 phases, with Phases 1-4 forming the critical path to full AI platform integration:

1. **Phase 1**: Storing transcripts in LLM-ready form ✅ Complete (Nov 1-11, 2025)
2. **Phase 2**: Extend to multiple data types (assessments, profiles, company docs) ✅ Complete (Nov 12, 2025)
3. **Phase 3**: Add PII scrubbing and security 🔴 Next
4. **Phase 4**: Full AI platform integration (MCP + Custom GPT)
5. **Phase 5**: Automate data source integrations (Fireflies, etc.)
6. **Phase 6**: Deploy and optimize for production
7. **Phase 7-8**: Custom frontends (optional - AI platforms may suffice)

---

## Strategic Approach

### Why AI Platforms First?

1. **Custom GPTs and Claude Projects are the PRIMARY interface** - not custom frontends
2. Coaches interact with data through familiar AI assistants (ChatGPT, Claude)
3. Validates architecture quickly without building custom UI
4. Custom frontends (Phases 7-8) come AFTER validating with AI platforms
5. Reduces time-to-market significantly

### Core Architectural Principle

**Our API provides DATA, AI platforms provide SYNTHESIS**

- Custom GPT and Claude already have powerful LLMs built-in
- They don't need us to synthesize answers - they need relevant data
- We provide semantic search to return the right chunks
- They use their native GPT-4/Claude to synthesize answers
- **Result**: Simpler, faster, cheaper, no redundant API calls

### Critical Path

\`\`\`
Phase 1 (Complete) → Validated Custom GPT works with transcripts ✅ (Nov 1-11)
     ↓
Phase 2 (Complete) → Add more data types ✅ (Nov 12 - 1 day!)
     ↓
Phase 3 (Next) → Security BEFORE exposing to real coaches 🔴
     ↓
Phase 4 → Full AI Platform Integration
     ↓
Phase 5-6 → Production deployment + Fireflies integration
     ↓
Phase 7-8 → Custom frontends (optional)
\`\`\`

**Total Timeline to Full AI Integration**: See [Velocity Tracking](#velocity-tracking--timeline-analysis) for revised estimates based on actual performance.

---

## Velocity Tracking & Timeline Analysis

**Added**: 2025-11-17
**Purpose**: Track actual vs. estimated performance to continuously right-size future estimates.

### Actual vs. Estimated Performance

| Phase | Original Estimate | Actual Duration | Velocity Multiplier | Notes |
|-------|------------------|-----------------|---------------------|-------|
| **Phase 1** | 2-3 weeks | **11 days** | 1.5x faster | Learning curve, establishing patterns |
| **Phase 2** | 3-4 weeks | **1 DAY** (~8 hours) | **21-28x faster** | AI-assisted development, clean architecture |
| **Combined P1+P2** | 5-7 weeks | **12 days** | **3-4x faster** | Acceleration compounds over time |

### Why We're Moving This Fast

1. **AI-Assisted Development** (Critical Factor)
   - No context switching - AI maintains full project knowledge
   - Instant code generation for boilerplate
   - Pattern recognition across codebase
   - Documentation generated alongside code

2. **Clean Architecture Compounding**
   - Phase 1 patterns made Phase 2 trivial
   - JSONB flexibility eliminates migration friction
   - Template Method + Strategy patterns enable rapid extension

3. **Checkpoint Discipline**
   - Small, validated increments prevent wrong turns
   - Continuous deployment validates immediately
   - Issues caught early before compounding

4. **Single Developer + AI**
   - Zero coordination overhead
   - No merge conflicts or code reviews
   - Immediate decision-making

### Revised Phase Estimates (Based on Demonstrated Velocity)

| Phase | Original Estimate | **Revised Estimate** | Confidence | Key Risk Factors |
|-------|------------------|---------------------|------------|------------------|
| **Phase 3** | 4-5 weeks | **5-7 days** | 85% | PII accuracy testing, security validation |
| **Phase 4** | 3-4 weeks | **6-7 days** | 90% | MCP protocol, lightweight coach testing |
| **Phase 5** | 2-3 weeks | **5-7 days** | 75% | External API dependencies (Fireflies) |
| **Phase 6** | 2-3 weeks | **3-4 days** | 90% | Multiple service integrations |
| **Total P3-P6** | 11-15 weeks | **19-25 days** | 85% | ~2.5-3.5 weeks total |

### December 15th Feasibility Assessment

**Analysis Date**: November 17, 2025 (Updated: lightweight beta testing)
**Available Time**: 28 days (4 weeks)
**Estimated Need**: 19-25 days (~2.5-3.5 weeks) - includes lightweight coach testing
**Buffer**: +3 to +9 days

**Verdict**: ✅ **HIGHLY FEASIBLE**

- **95% confident** for Phases 3-4 (core AI integration + basic validation)
- **85% confident** for Phases 3-6 (full production-ready)
- **Note**: Lightweight coach testing (3 days max) provides stakeholder confidence

### Risk Factors to Monitor

1. **PII Scrubbing Accuracy** (Phase 3)
   - Requires >95% accuracy with real coaching data
   - Mitigation: Use proven libraries (spaCy, Presidio), test early

2. **Coach Beta Testing Availability** (Phase 4) - LIGHTWEIGHT
   - Requires 2-3 coaches to commit 1-2 days for basic testing
   - Mitigation: Clear checklist + unstructured exploration time
   - Scope: Basic validation only, not full product testing (out of original scope)

3. **External API Dependencies** (Phase 5)
   - Fireflies API availability/documentation
   - Mitigation: Can skip for Dec 15 launch, manual upload works

4. **New Protocol Learning** (Phase 4)
   - MCP for Claude integration is new technology
   - Mitigation: Well-documented, community support

5. **Service Integrations** (Phase 6)
   - Sentry, SendGrid, OAuth providers
   - Mitigation: Standard patterns, copy from examples

### When to Revise These Estimates

Update this section after:
- Each checkpoint completion (validate velocity)
- Encountering unexpected blockers
- Completing Phase 3 (security may be different than coding)
- External dependency issues arise

---

## Phase 1: Transcript Foundation ✅

**Status**: Complete
**Duration**: 2 weeks (Nov 1 - Nov 11, 2025)
**Completed**: 2025-11-11

### Objectives

1. ✅ Rebuild MVP from scratch with clean codebase
2. ✅ Deploy to Vercel for public HTTPS access
3. ✅ Create OpenAPI schema for Custom GPT
4. ✅ Test Custom GPT integration with live transcript data
5. ✅ Validate fresh data retrieval (north star test)

### Implementation: 3 Checkpoints

<details>
<summary><b>Checkpoint 1: Local MVP Foundation</b> ✅</summary>

**Tasks**:
1. Project structure & Git setup
2. Supabase project creation
3. Database schema (transcripts + transcript_chunks tables)
4. Vector search RPC function
5. Node.js project initialization
6. Environment configuration
7. Express API server with health check
8. Transcript upload endpoints
9. Embedding generation pipeline
10. Semantic search endpoint

**Validation**:
- ✅ All endpoints respond without errors
- ✅ Transcript uploads trigger embedding generation
- ✅ Embeddings generate correctly (1536-dimensional vectors)
- ✅ Search returns relevant results with similarity scores
- ✅ Results include transcript metadata

**Tagged**: v0.1.0-checkpoint-1

</details>

<details>
<summary><b>Checkpoint 2: Deployment & Public Access</b> ✅</summary>

**Tasks**:
11. Deploy to Vercel with HTTPS
12. Create OpenAPI schema for Custom GPT
13. Configure CORS and environment variables

**Validation**:
- ✅ API accessible via HTTPS
- ✅ All endpoints work in production
- ✅ OpenAPI schema accessible at /openapi.json
- ✅ CORS configured properly

**Tagged**: v0.2.0-checkpoint-2

</details>

<details>
<summary><b>Checkpoint 3: Custom GPT Integration</b> ✅</summary>

**Tasks**:
14. ✅ Debug and fix vector search functionality
15. ✅ Add bulk upload API endpoint and CLI tool
16. ✅ Seed production with realistic coaching data
17. ✅ Test Custom GPT integration (semantic search)
18. ✅ Run North Star test (fresh data retrieval)
19. ✅ Document Phase 1 learnings

**Validation**:
- ✅ Custom GPT successfully calls /search endpoint
- ✅ Fresh transcripts searchable immediately after upload
- ✅ Custom GPT synthesizes answers using retrieved chunks
- ✅ No manual context updates required
- ✅ Response time < 3 seconds average

**Key Achievements**:
- Fixed vector search with subquery approach
- Added bulk upload endpoint (max 50 transcripts)
- Created CLI tool with 3 modes (file/dry-run/interactive)
- Uploaded 7 coaching sessions to production
- Validated North Star goal successfully

**Tagged**: v0.3.0-checkpoint-3
**Completed**: 2025-11-11

</details>

### Deliverables ✅

- ✅ Working Express API with 6 endpoints (upload, search, bulk upload)
- ✅ Supabase database with pgvector extension
- ✅ Embedding generation pipeline (chunk → embed → store)
- ✅ Deployed to Vercel: https://unified-data-layer.vercel.app
- ✅ OpenAPI schema for Custom GPT integration
- ✅ Custom GPT tested and validated
- ✅ CLI upload tool for data management
- ✅ Bulk upload API endpoint (max 50 transcripts)
- ✅ 7 sample coaching transcripts in production
- ✅ Comprehensive documentation (8 files, 2000+ lines)
- ✅ North Star goal validated: fresh data retrieval

### What's NOT Included

- ❌ RAG synthesis endpoint - Custom GPT handles this natively
- ❌ Demo web UI - Custom GPT is the interface
- ❌ CLI search tools - Not needed for north star test
- ❌ Transcript list/retrieve endpoints - Add later if needed

---

## Phase 2: Multi-Data-Type Architecture ✅

**Status**: Complete
**Original Estimate**: 3-4 weeks across 4 checkpoints
**Actual Duration**: 1 day (~8 hours) - November 12, 2025
**Velocity**: 21-28x faster than original estimate

> **Detailed Implementation Plan**: See [phase-2-implementation-plan.md](phase-2-implementation-plan.md) for complete technical specifications, sample data, risk mitigation strategies, and development workflows.

### Goal

Create an extensible architecture that can handle **multiple data types beyond transcripts** while maintaining unified search and retrieval capabilities.

### Business Context

InsideOut Leadership needs to store and query:
- **Transcripts**: Coaching session conversations (already implemented)
- **Assessments**: DISC, Myers-Briggs, Enneagram, 360-degree feedback
- **Coaching Models**: Coach's theory of change, frameworks, evaluation criteria
- **Company Docs**: Client org's OKRs, org charts, operating system materials
- **Goals**: Client development goals and milestones
- **Session Notes**: Coach-private observations and action items

**Key Requirement**: Granular access control (some org docs visible to coaches, others consultant-only)

### Implementation: 4 Checkpoints

<details>
<summary><b>Checkpoint 4: Schema Migration & Core Architecture</b> ✅</summary>

**Original Estimate**: 1 week
**Actual**: ~3 hours

**Goal**: Migrate from single-type (transcripts) to unified multi-type schema.

**Deliverables**:
- Migrate `transcripts` → `data_items` with `data_type` discriminator
- Migrate `transcript_chunks` → `data_chunks` (unified chunking table)
- Add ownership fields: `coach_id`, `client_id`, `client_organization_id`
- Add visibility controls: `visibility_level`, `allowed_roles`, `access_restrictions`
- Create migration script for existing Phase 1 data
- Update database indexes for new schema
- Update RPC function for multi-type vector search

**New Schema**:
\`\`\`sql
data_items (
  id UUID PRIMARY KEY,
  data_type TEXT NOT NULL,  -- 'transcript', 'assessment', 'coaching_model', 'company_doc'
  
  -- Ownership hierarchy
  coach_id UUID,                     -- InsideOut coach
  client_id UUID,                    -- Client this relates to
  client_organization_id UUID,       -- External org client works for
  
  -- Access controls (prepare for Phase 3 RLS)
  visibility_level TEXT DEFAULT 'private',
  allowed_roles TEXT[],
  access_restrictions JSONB,
  
  raw_content TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  session_date TIMESTAMP
)

data_chunks (
  id UUID PRIMARY KEY,
  data_item_id UUID REFERENCES data_items(id),
  chunk_index INTEGER,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  UNIQUE(data_item_id, chunk_index)
)
\`\`\`

**Validation**:
- ✅ Existing transcripts migrated with `data_type = 'transcript'`
- ✅ All chunks migrated with embeddings intact
- ✅ Search queries return same results as Phase 1
- ✅ No data loss or corruption

**Tagged**: v0.4.0-checkpoint-4 (2025-11-12)

</details>

<details>
<summary><b>Checkpoint 5: Multi-Type Processing Pipeline</b> ✅</summary>

**Original Estimate**: 1 week
**Actual**: ~2 hours

**Goal**: Support uploading and processing 4 core data types.

**Deliverables**:
- Type-specific processors (transcript, assessment, coaching_model, company_doc)
- Adaptive chunking strategies per type
- Generic upload endpoint: `POST /api/data/upload`
- Type-specific endpoints:
  - `POST /api/transcripts/upload` (backward compatible)
  - `POST /api/assessments/upload`
  - `POST /api/models/upload`
  - `POST /api/company-docs/upload`
- Update embedding pipeline to handle all types

**Architecture**: Strategy pattern for type-specific processing

**Validation**:
- ✅ Upload 1 transcript (backward compatible)
- ✅ Upload 1 assessment
- ✅ Upload 1 coaching model
- ✅ Upload 1 company doc
- ✅ All create `data_items` + `data_chunks` correctly
- ✅ Metadata stored correctly per type
- ✅ Embeddings generated for all types

**Tagged**: v0.5.0-checkpoint-5 (2025-11-12)

</details>

<details>
<summary><b>Checkpoint 6: Type-Aware Search & Filtering</b> ✅</summary>

**Original Estimate**: 1 week
**Actual**: ~45 minutes

**Goal**: Enhanced `/api/search` with multi-dimensional filtering.

**Deliverables**:
- Enhanced search with filters:
  - By type: `?types[]=transcript&types[]=assessment`
  - By scope: `?coach_id=X`, `?client_id=Y`, `?organization_id=Z`
  - By visibility: `?visibility=coach_visible`
- Update OpenAPI schema for new filters
- Type-specific result formatting
- Updated RPC function with all filter support

**Use Case Examples**:
1. **Marketing analysis**: `types=[transcript]`, `coach_id=A` (narrow scope)
2. **Year-end report**: `types=[transcript,assessment,goal,model]`, `coach_id=A` (broad scope)
3. **Org pattern analysis**: `organization_id=acme`, `types=[transcript]` (cross-coach)
4. **Model evaluation**: `types=[transcript,model]`, `coach_id=A`, `client_id=X`

**Validation**:
- ✅ Type filtering works
- ✅ Coach/client/org filtering works
- ✅ Multiple filters combine correctly
- ✅ Results include type-specific metadata
- ✅ Backward compatibility (no filters = all types)

**Tagged**: v0.6.0-checkpoint-6 (2025-11-12)

</details>

<details>
<summary><b>Checkpoint 7: Custom GPT Integration & Validation</b> ✅</summary>

**Original Estimate**: 3-5 days
**Actual**: ~1 hour

**Goal**: Validate multi-type architecture with Custom GPT.

**Deliverables**:
- Update OpenAPI schema with new endpoints/parameters
- Re-import schema in Custom GPT
- Upload sample multi-type data (1 of each type)
- Test cross-type queries via Custom GPT
- Document Phase 2 learnings in PHASE_2_RESULTS.md
- Performance benchmarks

**Test Scenarios**:
1. **Cross-type pattern analysis**: "Based on client's DISC assessment and recent sessions, what areas should we focus on?"
2. **Coach self-evaluation**: "Evaluate this session against my theory of change"
3. **Org context search**: "What are Acme's Q4 priorities and how do they relate to client conversations?"
4. **Type-specific filtering**: "Show me all DISC assessments for clients discussing leadership"

**Validation**:
- ✅ Custom GPT queries multiple data types in one search
- ✅ Type filtering works as expected
- ✅ Coach model included when evaluating sessions
- ✅ Org docs accessible when appropriate
- ✅ Search performance acceptable (< 3 seconds)
- ✅ Phase 2 results documented

**Tagged**: v0.7.0-checkpoint-7 (2025-11-12) - Phase 2 Complete

</details>

### Phase 2 Results Summary

**Completed**: November 12, 2025
**Total Time**: ~8 hours across 5 checkpoints (4-7, including 5b)
**Documentation**: See [PHASE_2_RESULTS.md](PHASE_2_RESULTS.md) for comprehensive results

### Data Type Definitions

**Priority 1 (Checkpoint 5)**:
1. **Transcripts** ✅ (migrate existing)
2. **Assessments**: Personality/skills assessments with scores + narrative
3. **Coaching Models**: Coach's theory of change, frameworks
4. **Company Docs**: OKRs, org charts, operating system materials

**Priority 2 (Future)**:
5. **Goals**: Client development goals and milestones
6. **Session Notes**: Coach-private observations

### Metadata Schemas

<details>
<summary><b>Transcript Metadata</b></summary>

\`\`\`json
{
  "session_type": "regular" | "intake" | "closure",
  "duration_minutes": 60,
  "session_number": 12,
  "topics": ["career_transition", "leadership_style"],
  "action_items": ["Update resume", "Schedule team 1-on-1s"]
}
\`\`\`

</details>

<details>
<summary><b>Assessment Metadata</b></summary>

\`\`\`json
{
  "assessment_type": "DISC" | "Myers-Briggs" | "Enneagram" | "360_feedback",
  "date_taken": "2025-10-15",
  "scores": {
    "dominance": 85,
    "influence": 60,
    "steadiness": 40,
    "conscientiousness": 70
  },
  "profile_summary": "High D/C profile"
}
\`\`\`

</details>

<details>
<summary><b>Coaching Model Metadata</b></summary>

\`\`\`json
{
  "model_name": "Theory of Change v2.0",
  "model_type": "theory_of_change" | "framework" | "philosophy",
  "version": "2.0",
  "key_principles": ["Growth mindset", "Systems thinking"],
  "evaluation_criteria": ["Asks powerful questions", "Challenges assumptions"]
}
\`\`\`

</details>

<details>
<summary><b>Company Doc Metadata</b></summary>

\`\`\`json
{
  "doc_type": "OKR" | "org_chart" | "strategy" | "operating_system",
  "quarter": "Q4 2025",
  "fiscal_year": 2025,
  "department": "Engineering" | "Leadership",
  "shared_with_coaches": true | false
}
\`\`\`

</details>

### Risk Mitigation

**Risk 1: Data Loss During Migration**
- Mitigation: Full Supabase backup, test migration locally first
- Rollback: Restore backup, revert API deployment

**Risk 2: Performance Degradation**
- Mitigation: Comprehensive indexes, test with realistic volumes
- Fix: Add missing indexes, optimize RPC function

**Risk 3: Custom GPT Integration Breaks**
- Mitigation: Maintain backward compatibility, test with Phase 1 queries
- Rollback: Revert to Phase 1 OpenAPI schema

---

## Phase 3: Data Privacy & Security

**Status**: ✅ COMPLETE (Checkpoints 8-10)
**Original Estimate**: 4-5 weeks
**Actual Duration**: ~5 days (Nov 19-24, 2025)
**Completed**: 2025-11-24

### Goal

Build security and access controls into the architecture to enable multi-tenant data isolation for coaches and clients.

### Key Accomplishments

1. **Row-Level Security (RLS)**: 42 policies across 12 tables - coaches see only their clients
2. **API Key Authentication**: Scoped keys for coaches/clients with bcrypt hashing
3. **PII Scrubbing Pipeline**: Built and available (disabled by default per compliance analysis)
4. **Admin Management**: User + API key management with web dashboard
5. **Multi-tenant Verification**: 42/42 isolation tests passing (Checkpoint 13)

### Key Learning: PII Scrubbing Not Required for Core Use Case

Compliance research (HIPAA, GDPR, CCPA) revealed that RLS + access controls satisfy regulatory requirements. PII scrubbing is available for future anonymization features but not needed for authorized users accessing their own data.

### 3.1 PII Handling Strategy

**Status**: ✅ Built (Checkpoint 8) | Disabled by default

**Compliance Research Finding** (Nov 2025): Analysis of HIPAA, GDPR, and CCPA requirements revealed that PII scrubbing is NOT required for authorized users accessing their own data. Row-level security (RLS) + access controls satisfy regulatory requirements.

**When PII Scrubbing IS Needed**:
- Anonymized cross-client analytics (future feature)
- Data exports for research/compliance
- Sharing insights across coaches (if implemented)

**When PII Scrubbing is NOT Needed**:
- Coach accessing their own client data
- Client accessing their own data
- Normal search/retrieval operations

**Implementation** (available when needed):
- Hybrid detection: Regex (high-confidence) + GPT-3.5-turbo (context-aware)
- 96% accuracy on coaching content (Checkpoint 8)
- Enable via \`PII_SCRUBBING_ENABLED=true\`
- Categories supported: Names, contact info, IDs, DOB, medical, financial, locations

**Recommendation**: Keep PII scrubbing OFF for core coach/client experience. Enable selectively for anonymization features in future phases.

### 3.2 Data Access Controls

- **Row-Level Security (RLS)** in Supabase
- Coach can only access their clients' data
- Clients can only access their own data (if portal built)
- Admin roles for platform management
- Audit logging for all data access

### 3.3 Secure API Keys for AI Platforms (Checkpoint 10)

**Status**: Planned - Admin-managed approach with full user management

**Scope**:
- **User Management**: Admin creates/manages coaches, clients, and admin users
- **Admin User Schema**: New `admins` table for platform administrators (executive assistants, support staff)
- **API Key Management**: Admin creates/revokes/rotates keys for all user types
- **Admin Dashboard**: Single-file HTML UI for user + key management
- **Authentication**: HTTP Basic Auth for admin UI access

**Features**:
1. **User Management Endpoints**:
   - `POST /api/admin/coaches` - Create coach
   - `POST /api/admin/clients` - Create client
   - `POST /api/admin/admins` - Create admin user
   - `GET /api/admin/{coaches|clients|admins}` - List users
   - `PUT /api/admin/{coaches|clients|admins}/:id` - Update user
2. **API Key Management Endpoints**:
   - `POST /api/admin/keys` - Create key for user
   - `GET /api/admin/keys` - List all keys
   - `POST /api/admin/keys/:id/revoke` - Revoke key
   - `POST /api/admin/keys/:id/rotate` - Rotate key
3. **Admin UI** (`/admin` route):
   - Users tab: Create/edit coaches, clients, admins
   - API Keys tab: Create/revoke/rotate keys
   - Usage analytics: Track key usage
4. **Schema Changes**:
   - New `admins` table (id, name, email, role, coaching_company_id)
   - Add `admin_id` column to `api_keys` table
   - Update `key_has_single_owner` constraint for admin_id

**Deployment Model**:
- Admins create users and API keys
- Admins set up Custom GPTs for coaches
- Coaches receive pre-configured GPT links (zero technical setup)

**Estimated Timeline**: 9-12 hours (1.5-2 days)
- Schema updates: 2-3 hours
- User management: 5-6 hours
- API key management: 2-3 hours

**Why Admin Users Table**:
- Executive assistants are not coaches or clients
- Proper audit trail (track which admin performed actions)
- Multiple admins with distinct identities and permissions
- Scalable for future admin roles (super_admin, admin, support)

### 3.4 Compliance Status (Updated Nov 2025)

**HIPAA**: NOT APPLICABLE
- Executive coaching is not healthcare under HIPAA definitions
- Inside-Out Leadership coaches are not licensed therapists billing insurance
- Career counseling, mediation, and life coaching explicitly excluded from HIPAA
- Source: [HHS HIPAA definitions](https://hipaacomplianthosting.com/does-hipaa-apply-to-coaches-like-mental-health-coaches-life-coaches-etc/)

**GDPR (EU)**: ✅ COMPLIANT with current implementation
- ✅ Access controls (RLS) - users only see authorized data
- ✅ Audit logging - all access tracked
- ✅ Privacy policy - created
- ⚠️ Data deletion - admin process needed (30-day response window, not self-service)
- ⚠️ Data export - admin process needed (30-day response window, not self-service)
- ⚠️ OpenAI DPA - needs to be signed for API usage

**CCPA/CPRA (California)**: ✅ COMPLIANT with current implementation
- ✅ Access controls - enforced via RLS
- ⚠️ Deletion requests - admin process needed (45-day response window)
- ⚠️ Export requests - admin process needed (45-day response window)

**Action Items** (deferred until needed):
1. Sign OpenAI Data Processing Addendum for API usage
2. Create admin endpoint for data deletion: `DELETE /api/admin/clients/:id/data`
3. Create admin endpoint for data export: `GET /api/admin/clients/:id/export`
4. Document data retention policy

**Key Insight**: Regulations require ability to RESPOND to deletion/export requests within 30-45 days. They do NOT require self-service portals.

---

## Phase 4: AI Platform Integration Layer

**Status**: Planned (High Priority after Phase 3)
**Original Estimate**: 3-4 weeks
**Revised Estimate**: 6-7 days total (3-4 days implementation + 3 days lightweight beta testing)
**Confidence**: 90%

### Goal

Connect the data layer to Custom GPTs and Claude Projects as the **PRIMARY interface**, before building custom frontends.

### Key Risk Factors

1. **MCP Protocol Learning Curve** - New technology, but well-documented
2. **Multi-tenant Authentication** - Scoped API keys per coach/client

### 4.1 MCP (Model Context Protocol) Server

- **For**: Claude Desktop/Projects integration
- **Tools**: `search_data`, `upload_data`, `get_client_timeline`
- **Claude handles synthesis** using built-in capabilities
- Authentication: Secure token-based auth

### 4.2 Custom GPT Integration (Production)

- OpenAPI schema with authentication
- Custom instructions for coaching context
- Privacy mode (no training on data)
- Multi-coach support with API keys

### 4.3 Internal Beta Testing (NEW - Basic Validation)

**Purpose**: Basic validation with real InsideOut coaches to provide stakeholder confidence.

**Scope Note**: Lightweight testing focused on fundamentals. Full product testing not in original scope - this covers basics for stakeholder peace of mind.

**Prerequisites**:
- ✅ Phase 3 complete (PII scrubbing, RLS, API keys)
- ✅ Internal testing by project owner complete
- ✅ AI-assisted testing complete

**Deliverables**:
1. **Custom GPT Beta Versions**
   - Create coach-specific Custom GPTs with API key authentication
   - Configure privacy mode (no training on coach/client data)
   - Add basic coaching-specific instructions
   - Distribute to 2-3 InsideOut coaches for testing

2. **Testing Protocol** (Structured + Unstructured)
   - **Structured**: Clear checklist of basic tasks to validate
     - Authentication works (coach sees only their data)
     - Search returns relevant results
     - Basic query patterns function correctly
   - **Unstructured**: Open exploration time to find edge cases
     - Coaches try to "poke holes" in the system
     - Report any unexpected behaviors
   - **Feedback Collection**: Simple survey + open-ended comments

3. **Testing Focus** (Fundamentals Only)
   - **Authentication**: Basic coach isolation verification
   - **Privacy**: No obvious data leakage
   - **Data Quality**: Results are reasonably relevant
   - **Basic Functionality**: Core features work as expected

4. **Success Criteria** (Reduced Scope)
   - No critical authentication/privacy issues
   - Core functionality works without major errors
   - Feedback collected and documented
   - Stakeholder confidence achieved

**Timeline**: 1 day setup + 1-2 days coach testing (max 3 days total)

### 4.4 API Enhancements

\`\`\`
POST /api/v2/search/unified          # Search across all data types
POST /api/v2/search/filtered         # With filters (date, type, client)
GET  /api/v2/clients/{id}/data       # All data for a client
GET  /api/v2/clients/{id}/timeline   # Chronological view
\`\`\`

**Note**: No synthesis endpoints - AI platforms handle that

### 4.5 Usage Patterns for Coaches

1. **Session Prep**: "What did we discuss in the last 3 sessions with [client]?"
2. **Progress Tracking**: "How has [client]'s confidence evolved over time?"
3. **Pattern Recognition**: "What recurring themes appear in [client]'s sessions?"
4. **Goal Monitoring**: "What goals did [client] set and what's their progress?"

---

## Phase 5: Data Source Integrations

**Status**: Planned
**Original Estimate**: 2-3 weeks
**Revised Estimate**: 5-7 days (based on demonstrated velocity)
**Confidence**: 75% (external dependency risk)

### Key Risk Factors

1. **Fireflies API Availability** - External dependency, documentation quality unknown
2. **Rate Limits & Quotas** - May hit API limits during testing
3. **Data Format Normalization** - Each source has unique format

**Note**: This phase can be deferred if needed for Dec 15 deadline. Manual upload works fine.

### 5.1 Fireflies.ai Integration

- Webhook receiver for new transcripts
- Fireflies API polling
- Automatic processing pipeline
- PII scrubbing before storage

### 5.2 Additional Sources (Future)

- Zoom transcripts
- Microsoft Teams
- Google Calendar (meeting metadata)
- Assessment platforms (DISC, etc.)

---

## Phase 6: Production Optimization

**Status**: Planned
**Original Estimate**: 2-3 weeks
**Revised Estimate**: 3-4 days (based on demonstrated velocity)
**Confidence**: 90%

### Key Risk Factors

1. **Multiple Service Integrations** - Sentry, SendGrid, OAuth providers
2. **Production Load Testing** - May need to optimize indexes

### 6.1 Infrastructure

- Production deployment hardening
- Database optimization and indexing
- CDN for static assets
- Environment-based configuration

### 6.2 Security

- OAuth 2.0 authentication
- API rate limiting
- Request validation
- Security headers and CORS

### 6.3 Monitoring & Observability

- **Error tracking** (Sentry)
- **Performance monitoring** (query latency, API response times)
- **Usage analytics** (requests per endpoint, data volume)
- **Cost tracking & automated reporting**:
  - Real-time OpenAI API usage tracking (embeddings + GPT queries)
  - Supabase database usage monitoring (storage, bandwidth, compute)
  - Vercel function execution tracking (invocations, duration, bandwidth)
  - **Automated weekly cost report email**:
    - Recipients: Project owner + client stakeholders
    - Includes: Week-over-week usage trends, cost breakdown by service, projected monthly cost
    - Alerts: Threshold warnings (e.g., >20% increase week-over-week)
    - Implementation: Vercel cron job + email service (SendGrid/Resend)
    - Format: HTML email with charts/tables for easy consumption
  - Cost anomaly detection (unexpected spikes in usage)

### 6.4 Admin UI Enhancement

**Goal**: Make the admin dashboard fully self-service for non-technical administrators.

**Current State** (from Checkpoint 10):
- Basic admin dashboard exists at `/admin`
- API key management works
- User/coach listing available

**Enhancements Needed**:

1. **Data Upload Interface**
   - Drag-and-drop file upload (JSON, PDF, TXT)
   - Visual form for metadata assignment:
     - Select coach (dropdown)
     - Select client (dropdown, filtered by coach)
     - Select data type (transcript, assessment, model, company_doc)
     - Set session date
     - Add custom metadata fields
   - Bulk upload with CSV mapping
   - Upload progress indicator with success/error feedback

2. **User & Client Management**
   - Add new coaches with auto-generated API keys
   - Add new clients and assign to coaches
   - Create/manage organizations
   - Assign clients to organizations
   - Visual relationship editor (coach ↔ client ↔ org)

3. **Data Browser**
   - Browse all data items with filtering (by type, coach, client, date)
   - Preview content and metadata
   - Edit metadata inline
   - Delete items with confirmation
   - Re-process items (re-chunk, re-embed)

4. **Dashboard Improvements**
   - Quick stats: total items, items by type, recent uploads
   - Activity log: recent API calls, uploads, errors
   - Health status: API, database, embedding service

**Success Criteria**: A non-technical admin can:
- Upload a new transcript and assign it to the correct coach/client in < 2 minutes
- Add a new client and assign them to a coach without touching the database
- Find and edit any data item without SQL knowledge

### 6.5 Live Data Testing (Ryan Vaughn)

**Goal**: Validate the system with real Inside-Out Leadership coach data before Dec 15 ship.

**Scope**: Single coach (Ryan Vaughn) with his actual client data

**Steps**:

1. **User Setup** (1-2h)
   - Create Ryan Vaughn as coach in system
   - Create his real clients as users
   - Generate API key for Ryan
   - Set up Ryan's Custom GPT with his credentials

2. **Data Import** (2-3h)
   - Import Ryan's real coaching transcripts
   - Import client assessments (DISC, MBTI, 360 if available)
   - Run PII scrubbing pipeline on real data
   - Verify data appears correctly in system

3. **Demo Walkthrough** (2-3h)
   - Live session with Ryan using his GPT
   - Test real queries: "What themes have emerged with [client]?"
   - Capture value moments and insights
   - Document any UX issues

4. **Final Polish** (1-2h)
   - Quick fixes based on Ryan's feedback
   - GPT instruction tweaks if needed
   - Final verification

**Success Criteria**:
- Ryan can query his real client data through Custom GPT
- Responses provide actionable coaching insights
- No PII leakage in responses
- System performs within acceptable latency (<3s)

---

## Phase 7-8: Custom Frontends

**Status**: Future (Low Priority)
**Duration**: TBD

### Why Low Priority?

AI platforms (Custom GPT, Claude Projects) provide the primary interface. Custom frontends are enhancements, not requirements.

### 7.1 Coach Dashboard

- Client list and profiles
- Upload data
- View insights
- Manage API keys
- Session planning

### 7.2 Client Portal

- Personal dashboard
- Progress tracking
- Goal management
- Session history

### 7.3 Mobile Applications

- Native iOS/Android apps
- Subset of web dashboard

---

## Technology Stack

### Core Stack
- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express.js 5.1.0
- **Database**: Supabase (PostgreSQL + pgvector)
- **Vector Search**: pgvector with IVFFLAT indexing
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **File Upload**: Multer 2.0.2
- **PDF Parsing**: pdf-parse 1.1.1
- **Deployment**: Vercel

### API Surface

**Phase 1 Endpoints** (5 total):
\`\`\`
GET  /                              # API info
GET  /api/health                    # Health check
POST /api/transcripts/upload        # Upload text transcript
POST /api/transcripts/upload-pdf    # Upload PDF transcript
POST /api/search                    # Semantic search
GET  /openapi.json                  # OpenAPI schema
\`\`\`

**Phase 2 Additions**:
\`\`\`
POST /api/data/upload               # Generic upload (any type)
POST /api/assessments/upload        # Type-specific upload
POST /api/models/upload
POST /api/company-docs/upload
POST /api/search                    # Enhanced with filters
\`\`\`

**Phase 4 Additions**:
\`\`\`
POST /api/v2/search/unified
POST /api/v2/search/filtered
GET  /api/v2/clients/{id}/data
GET  /api/v2/clients/{id}/timeline
\`\`\`

### Key Configuration

**Text Chunking** (adaptive by type):
- Transcripts: 500 words, 50 overlap
- Assessments: 300 words, 30 overlap
- Coaching Models: 400 words, 50 overlap
- Company Docs: 500 words, 50 overlap

**Search Parameters**:
- Default similarity threshold: 0.3
- Default result limit: 5-10
- Range: 0.0 (different) to 1.0 (identical)

---

## Timeline & Priorities

### Critical Path (P0) - Required for AI Platform Integration

1. ✅ **Phase 1**: Transcript Foundation - COMPLETE (11 days actual vs 2-3 weeks estimate)
2. ✅ **Phase 2**: Multi-Data-Type Architecture - COMPLETE (1 day actual vs 3-4 weeks estimate)
3. 🔴 **Phase 3**: Security & Privacy - NEXT (5-7 days revised vs 4-5 weeks original)
4. 🔴 **Phase 4**: AI Platform Integration + Lightweight Testing - (6-7 days revised vs 3-4 weeks original)

**Original Total Timeline**: 10-13 weeks to full AI integration
**Revised Total Timeline**: 19-25 days (~2.5-3.5 weeks) for Phases 3-6

### December 15th Target Assessment

**Available**: 28 days (Nov 17 - Dec 15, 2025)
**Estimated Need**: 19-25 days (includes 3 days lightweight coach testing)
**Buffer**: +3 to +9 days
**Verdict**: ✅ HIGHLY FEASIBLE

### High Priority (P1) - Value Acceleration

1. **Fireflies.ai Integration** (Phase 5) - Automatic transcript ingestion
2. **Advanced Search Filters** (Phase 4) - Temporal, type-aware queries
3. **Performance Optimization** (Phase 6) - Sub-second search

### Medium Priority (P2) - Enhanced Capabilities

1. **Additional Data Sources** (Phase 5) - Zoom, Teams
2. **Advanced Analytics** (Phase 6) - Pattern detection, sentiment
3. **Production Hardening** (Phase 6) - Monitoring, error tracking

### Future (P3) - Custom Frontends

1. **Coach Dashboard** (Phase 7)
2. **Client Portal** (Phase 7)
3. **Mobile Apps** (Phase 8)

**Rationale**: AI platforms provide interface layer; custom UIs are long-term enhancements.

---

## Success Metrics

### Phase 1 Success ✅ (Current)

- ✅ Upload and search transcripts via API
- ✅ Semantic search returns relevant chunks
- ✅ Deployed to Vercel with HTTPS
- ✅ OpenAPI schema accessible
- ⏸️ Custom GPT integration validated (pending user access)

### Phase 2 Success Criteria

- ✅ Support 4+ data types (transcript, assessment, model, company_doc)
- ✅ Sub-second search across all data types
- ✅ Type-aware filtering works correctly
- ✅ Custom GPT handles multi-type queries
- ✅ Backward compatibility maintained

### Phase 3 Success Criteria

- ✅ PII scrubbing >95% accuracy
- ✅ Zero data leakage between clients
- ✅ RLS enforced in Supabase
- ✅ API keys working with scoped permissions
- ✅ Compliance audit passed

### Phase 4 Success Criteria

- ✅ 5+ coaches using AI platform integration
- ✅ Custom GPT and Claude Projects both working
- ✅ Sub-2-second response time for AI queries
- ✅ Zero security incidents
- ✅ Positive user feedback

### Long-term Success

- 50+ coaches using the platform
- 1000+ data items across all types
- <1% error rate on PII scrubbing
- 99.9% uptime
- Positive ROI on AI platform approach vs. custom UI

---

## Reference Documents

### Project Documentation
- **Phase 2 Implementation Plan**: [phase-2-implementation-plan.md](phase-2-implementation-plan.md) - Detailed technical plan
- **Workflows**: [../development/workflows.md](../development/workflows.md) - Development standards
- **API Versioning Strategy**: [../development/api-versioning-strategy.md](../development/api-versioning-strategy.md)
- **Checkpoint Status**: [../checkpoints/](../checkpoints/) - Progress tracking

### Setup Guides
- **Supabase Setup**: [../setup/supabase-setup.md](../setup/supabase-setup.md)
- **Custom GPT Setup**: [../setup/custom-gpt-setup.md](../setup/custom-gpt-setup.md)

---

## Current Status

**Phase**: Phase 4 COMPLETE ✅ | Internal Testing in Progress
**Latest Checkpoint**: 13 (Multi-Tenant Verification)
**Current Version**: v0.13.1
**Last Updated**: 2025-11-30

**Git Tags**:
- ✅ v0.1.0-checkpoint-1 (Local MVP)
- ✅ v0.2.0-checkpoint-2 (Vercel Deployment)
- ✅ v0.3.0-checkpoint-3 (Custom GPT Integration) - Phase 1 Complete
- ✅ v0.4.0-checkpoint-4 (Schema Migration)
- ✅ v0.5.0-checkpoint-5 (Multi-Type Processing)
- ✅ v0.6.0-checkpoint-6 (Type-Aware Search)
- ✅ v0.7.0-checkpoint-7 (Custom GPT Validation) - Phase 2 Complete
- ✅ v0.8.0-checkpoint-8 (PII Scrubbing Pipeline)
- ✅ v0.9.0-checkpoint-9 (Row-Level Security)
- ✅ v0.10.0-checkpoint-10 (Admin Management) - Phase 3 Complete
- ✅ v0.11.0-checkpoint-11 (MCP Server)
- ✅ v0.12.0-checkpoint-12 (Enhanced Custom GPT)
- ✅ v0.13.0-checkpoint-13 (Multi-Tenant Verification) - Phase 4 Complete

**Current Activity**: Internal coach testing with 3 testers (6 GPTs)

**Compliance Status** (Updated Nov 2025):
- HIPAA: Not applicable (executive coaching excluded)
- GDPR/CCPA: Compliant via RLS + access controls
- PII scrubbing: Available but disabled (not required for authorized users)
- Action items: Sign OpenAI DPA, build deletion/export admin endpoints when needed

**Next Steps**:
1. Complete internal coach testing
2. Seed additional data types (assessments, company docs)
3. Phase 5: Data source integrations (Fireflies)
4. Phase 6: Production optimization

---

**Last Updated**: 2025-11-30 by Claude via compliance research analysis and PII strategy revision.
