# Phase 2 Implementation Plan: Multi-Data-Type Architecture

**Purpose**: Detailed checkpoint-based plan for expanding from single data type (transcripts) to flexible multi-type architecture with granular access controls.

**Status**: Planning Complete - Ready for Implementation

**Timeline**: 3-4 weeks across 4 checkpoints

**Last Updated**: 2025-11-10

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema Design](#database-schema-design)
5. [Checkpoint 4: Schema Migration](#checkpoint-4-schema-migration--core-architecture)
6. [Checkpoint 5: Multi-Type Processing](#checkpoint-5-multi-type-processing-pipeline)
7. [Checkpoint 6: Type-Aware Search](#checkpoint-6-type-aware-search--filtering)
8. [Checkpoint 7: Integration Validation](#checkpoint-7-custom-gpt-integration--phase-2-validation)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Metrics](#success-metrics)

---

## Executive Summary

### Problem Statement

Phase 1 established a working transcript search API integrated with Custom GPT. However, the current architecture only supports one data type (coaching transcripts). InsideOut Leadership needs to:

1. Store and search **multiple data types** (assessments, coaching models, company docs, goals)
2. Support **granular access control** (coach-level, client-level, org-level visibility)
3. Enable **flexible, context-aware queries** (e.g., "evaluate coach against their model" or "find patterns across client org")
4. **Prepare for Phase 3 security** (PII scrubbing, Row-Level Security, multi-tenant isolation)

### Solution Approach

Migrate to unified `data_items` + `data_chunks` schema that:
- Supports any data type via `data_type` discriminator
- Establishes ownership hierarchy (coach → client → client_organization)
- Implements granular visibility controls per data item
- Maintains backward compatibility with Phase 1 Custom GPT integration

### Strategic Decisions

Based on user requirements gathering:

1. ✅ **Full schema migration** (not in production yet, safe to migrate)
2. ✅ **Flat ownership model** with smart filtering (vs. explicit relationships table)
3. ✅ **Granular per-item access controls** (org docs can be coach-visible or restricted)
4. ✅ **Unified data hierarchy**: InsideOut → Coaches → Client Orgs → Clients → Data

### Timeline

| Checkpoint | Duration | Key Deliverable |
|------------|----------|-----------------|
| Checkpoint 4 | 1 week | Schema migration complete, existing data migrated |
| Checkpoint 5 | 1 week | Multi-type upload working, 4 data types supported |
| Checkpoint 6 | 1 week | Type-aware search with filters operational |
| Checkpoint 7 | 3-5 days | Custom GPT validated with multi-type data |

**Total**: 3-4 weeks

---

## Business Context

### InsideOut Leadership's Business Model

**Who InsideOut Is**:
- Leadership coaching organization
- All coaches are InsideOut employees
- Serves external client organizations

**Service Model**:
- **1-on-1 Executive Coaching**: InsideOut coach works with individual clients (executives at external orgs)
- **Operating System Installation**: Consultants work with leadership teams on organizational systems
- **Multi-Coach Engagements**: Multiple InsideOut coaches may work with different clients at the same external org

**Example Engagement**:
```
InsideOut Leadership
  ├─ Coach A → Coaches "Client 1" (executive at Acme Media)
  ├─ Coach B → Coaches "Client 2" (executive at Acme Media)
  └─ Consultant C → Works with Acme Media leadership team

Acme Media (external client organization)
  ├─ Client 1 (executive, coached by Coach A)
  ├─ Client 2 (executive, coached by Coach B)
  └─ Company Docs:
      ├─ OKRs (visible to coaches? configurable)
      ├─ Org chart (visible to coaches? configurable)
      └─ Operating system materials (consultant-only? configurable)
```

### Data Relationship Requirements

**Ownership Hierarchy**:
1. **InsideOut Level** (implied - all coaches belong here)
2. **Coach Level** - Coach-owned data (coaching models, theory of change)
3. **Client Organization Level** - Org-owned data (OKRs, org charts, company strategy)
4. **Client Level** - Client-owned data (assessments, goals, development plans)
5. **Session Level** - Coach-client interaction data (transcripts, notes)

**Visibility Requirements**:
- **Granular per-item control** - Not all org data is coach-visible
- **Configurable by engagement** - Org A may allow coach visibility, Org B may not
- **Role-based access** - Coaches, consultants, leadership have different permissions
- **Privacy-first** - Default to restrictive, explicitly grant access

### Use Case Examples

#### Use Case 1: Marketing Analysis (Narrow Scope)
**Goal**: Find patterns in Coach A's client conversations to identify coaching niche

**Query Scope**:
- Data types: `transcript` only
- Scope: `coach_id = coach_a`
- Timeframe: Last 12 months

**Excluded**: Assessments, goals, company docs (unnecessary for this analysis)

#### Use Case 2: Year-End Coach Report (Broad Scope)
**Goal**: Comprehensive report of Coach A's impact across all clients

**Query Scope**:
- Data types: `transcript`, `assessment`, `goal`, `coaching_model`
- Scope: `coach_id = coach_a`
- Includes: Coach A's theory of change (for self-evaluation)

**Excluded**: Company docs (unless explicitly shared with coach)

#### Use Case 3: Organizational Pattern Analysis (Org-Scoped)
**Goal**: Identify leadership development patterns across Acme Media

**Query Scope**:
- Data types: `transcript`, `assessment`, `company_doc`
- Scope: `client_organization_id = acme_media`
- Cross-coach: Includes data from all InsideOut coaches working with Acme clients

**Visibility**: Only includes org docs marked as `coach_visible = true`

#### Use Case 4: Session Evaluation Against Coaching Model
**Goal**: Evaluate how well Coach A's session aligned with their stated theory of change

**Query Scope**:
- Data types: `transcript` (specific session) + `coaching_model` (Coach A's model)
- Scope: `coach_id = coach_a` AND `session_id = specific_session`
- Relationship: Coach's model provides evaluation framework

**Key Requirement**: Automatic inclusion of coach's model when analyzing their sessions

---

## Architecture Overview

### Current State (Phase 1)

**Database Schema**:
```sql
transcripts (
  id UUID PRIMARY KEY,
  raw_text TEXT,
  meeting_date TIMESTAMP,
  created_at TIMESTAMP,
  metadata JSONB,
  coach_id UUID,
  client_id UUID,
  fireflies_meeting_id TEXT
)

transcript_chunks (
  id UUID PRIMARY KEY,
  transcript_id UUID REFERENCES transcripts(id),
  chunk_index INTEGER,
  content TEXT,
  embedding vector(1536),
  created_at TIMESTAMP,
  UNIQUE(transcript_id, chunk_index)
)
```

**API Endpoints**:
- `POST /api/transcripts/upload` - Upload transcripts
- `POST /api/search` - Search transcripts via vector similarity

**Limitations**:
- Single data type only
- No client organization concept
- No visibility/access controls
- No relationship to other coaching artifacts

### Target State (Phase 2)

**Database Schema**:
```sql
data_items (
  id UUID PRIMARY KEY,
  data_type TEXT NOT NULL,

  -- Ownership hierarchy
  coach_id UUID,
  client_id UUID,
  client_organization_id UUID,

  -- Access controls
  visibility_level TEXT DEFAULT 'private',
  allowed_roles TEXT[],
  access_restrictions JSONB,

  -- Content
  raw_content TEXT,
  metadata JSONB,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
)

data_chunks (
  id UUID PRIMARY KEY,
  data_item_id UUID REFERENCES data_items(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_item_id, chunk_index)
)
```

**API Endpoints (Enhanced)**:
```
# Generic upload (type in body)
POST /api/data/upload

# Type-specific uploads
POST /api/transcripts/upload
POST /api/assessments/upload
POST /api/models/upload
POST /api/company-docs/upload

# Enhanced search with filters
POST /api/search
  ?types[]=transcript&types[]=assessment
  &coach_id=xyz
  &client_id=abc
  &organization_id=def
  &include_org_docs=true
  &visibility=coach_visible

# Type-specific retrieval
GET /api/data?data_type=assessment&client_id=xyz
```

### Key Architectural Principles

1. **Unified Storage, Flexible Access**
   - Single `data_items` table for all types
   - Type-specific logic in application layer, not database
   - JSONB metadata for type-specific fields

2. **Implicit Relationships via IDs**
   - Coach → Client relationship via `coach_id` + `client_id`
   - Client → Org relationship via `client_id` + `client_organization_id`
   - No explicit join tables (keeps queries simple)

3. **Granular Access Control**
   - `visibility_level`: 'private', 'coach_only', 'org_visible', 'public'
   - `allowed_roles`: ['coach', 'consultant', 'leadership']
   - `access_restrictions`: Flexible JSONB for per-item rules

4. **Type-Agnostic Core, Type-Aware Edges**
   - Core storage/chunking/embedding logic works for any type
   - Upload/processing/formatting logic is type-specific
   - Easy to add new types without schema changes

---

## Database Schema Design

### ⚠️ Schema Implementation Note (Updated 2025-11-12)

**The actual implemented schema uses a slug + JSONB metadata pattern** instead of individual columns for optional fields. This provides greater flexibility without requiring migrations for new fields.

**Key Differences from Original Plan**:
- User/org tables use `slug` fields for URL-friendly references
- Optional fields (active, size, department, etc.) stored in JSONB `metadata`
- GIN indexes added for frequently-queried metadata keys

**For actual schema structure**, see:
- [Schema Reference Documentation](../development/schema-reference.md) - Complete actual schema
- [Schema Validation Audit](../checkpoints/schema-validation-audit.md) - Compatibility analysis

**Impact**: The schemas shown below represent the original plan. Actual implementation is compatible but more flexible. All roadmap checkpoints remain valid with minor query pattern adjustments (JSONB operators).

---

### Primary Tables

#### `data_items` Table

**Purpose**: Unified storage for all data types

**Schema**:
```sql
CREATE TABLE data_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,

  -- Ownership hierarchy (all nullable for flexibility)
  coach_id UUID,                      -- InsideOut coach who owns/created this
  client_id UUID,                     -- Client this relates to (if applicable)
  client_organization_id UUID,        -- External org the client works for

  -- Access control (prepare for Phase 3 RLS)
  visibility_level TEXT DEFAULT 'private'
    CHECK (visibility_level IN ('private', 'coach_only', 'org_visible', 'public')),
  allowed_roles TEXT[],               -- e.g., ['coach', 'consultant', 'leadership']
  access_restrictions JSONB,          -- Granular per-item access rules

  -- Content
  raw_content TEXT,                   -- Full text content
  metadata JSONB,                     -- Type-specific metadata

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,                    -- User who created (Phase 3: auth user ID)

  -- Optional session-specific data
  session_id UUID,                    -- For session-level data (transcripts, notes)
  session_date TIMESTAMP              -- When session occurred
);

-- Indexes for common query patterns
CREATE INDEX idx_data_items_type ON data_items(data_type);
CREATE INDEX idx_data_items_coach ON data_items(coach_id);
CREATE INDEX idx_data_items_client ON data_items(client_id);
CREATE INDEX idx_data_items_org ON data_items(client_organization_id);
CREATE INDEX idx_data_items_visibility ON data_items(visibility_level);
CREATE INDEX idx_data_items_created_at ON data_items(created_at DESC);

-- Composite indexes for common filter combinations
CREATE INDEX idx_data_items_coach_type ON data_items(coach_id, data_type);
CREATE INDEX idx_data_items_org_type ON data_items(client_organization_id, data_type);
```

**Field Definitions**:

| Field | Type | Description | Example Values |
|-------|------|-------------|----------------|
| `data_type` | TEXT | Type discriminator | 'transcript', 'assessment', 'coaching_model', 'company_doc', 'goal', 'note' |
| `coach_id` | UUID | InsideOut coach who owns/created | Coach A's UUID |
| `client_id` | UUID | Client this relates to | Executive at Acme Media |
| `client_organization_id` | UUID | External org client works for | Acme Media's org ID |
| `visibility_level` | TEXT | Base visibility setting | 'private', 'coach_only', 'org_visible', 'public' |
| `allowed_roles` | TEXT[] | Roles that can access | ['coach', 'consultant'] |
| `access_restrictions` | JSONB | Granular rules | `{"exclude_coaches": ["coach_b_id"], "require_org_permission": true}` |
| `metadata` | JSONB | Type-specific fields | See metadata schemas below |

**Visibility Levels**:

- `private`: Only creator can access (e.g., coach's private notes)
- `coach_only`: Creator coach + authorized coaches can access
- `org_visible`: Any coach working with clients from this org can access
- `public`: Accessible to all InsideOut coaches (rare, maybe templates)

#### `data_chunks` Table

**Purpose**: Chunked text with embeddings for vector search

**Schema**:
```sql
CREATE TABLE data_chunks (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,

  -- Content
  content TEXT NOT NULL,              -- Chunk text (500 words)
  embedding vector(1536) NOT NULL,    -- OpenAI text-embedding-3-small

  -- Metadata (optional type-specific context)
  metadata JSONB,                     -- e.g., {"section": "strengths", "page": 2}

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique chunk ordering
  UNIQUE(data_item_id, chunk_index)
);

-- Indexes for vector search
CREATE INDEX idx_data_chunks_item ON data_chunks(data_item_id);
CREATE INDEX idx_data_chunks_embedding ON data_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Chunking Strategy** (adaptive by type):

| Data Type | Chunk Size | Overlap | Notes |
|-----------|----------|---------|-------|
| `transcript` | 500 words | 50 words | Maintains conversation context |
| `assessment` | 300 words | 30 words | Shorter for structured content |
| `coaching_model` | 400 words | 50 words | Preserve conceptual continuity |
| `company_doc` | 500 words | 50 words | Standard document chunking |
| `goal` | 200 words | 20 words | Goals are concise, less overlap needed |
| `note` | 300 words | 30 words | Notes are brief |

### Supporting Tables (User & Organization Management)

**Added in Phase 2 Checkpoint 4** to establish foundation for authentication, multi-tenancy, and data integrity.

**Updated 2025-11-11**: Schema revised to support multi-company architecture and company-owned coaching models based on client feedback.

#### `coaching_companies` Table

**Purpose**: Coaching companies that use this platform (InsideOut Leadership is the first, but architecture supports multiple companies)

**Schema**:
```sql
CREATE TABLE coaching_companies (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,           -- URL-friendly name (e.g., 'insideout-leadership')

  -- Company configuration
  model_sharing_enabled BOOLEAN DEFAULT true,  -- Can coaches share coaching models within company?

  -- Status
  active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coaching_companies_slug ON coaching_companies(slug);
CREATE INDEX idx_coaching_companies_active ON coaching_companies(active);
```

**Key Design Decision**:
- **Multi-Company Support**: Architecture allows multiple coaching companies (InsideOut can start, others can join later)
- **Model Sharing**: Companies can enable/disable model sharing among their coaches

#### `coaches` Table

**Purpose**: Coaches employed by coaching companies

**Schema**:
```sql
CREATE TABLE coaches (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company relationship (NEW - supports multi-company architecture)
  coaching_company_id UUID REFERENCES coaching_companies(id) ON DELETE CASCADE,

  -- Authentication (Phase 3 integration)
  auth_provider_id TEXT UNIQUE,        -- Supabase Auth user ID
  email TEXT UNIQUE NOT NULL,

  -- Profile
  name TEXT NOT NULL,
  bio TEXT,
  coaching_style TEXT,
  certifications TEXT[],

  -- Role & Status
  role TEXT DEFAULT 'coach' CHECK (role IN ('coach', 'consultant', 'admin')),
  active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coaches_email ON coaches(email);
CREATE INDEX idx_coaches_company ON coaches(coaching_company_id);
CREATE INDEX idx_coaches_active ON coaches(active);
CREATE INDEX idx_coaches_auth_provider ON coaches(auth_provider_id);
```

**Key Design Decision**:
- Each coach belongs to **one coaching company** (`coaching_company_id`)
- Supports future scenario where multiple companies use the platform

#### `client_organizations` Table

**Purpose**: External organizations that are clients of InsideOut

**Schema**:
```sql
CREATE TABLE client_organizations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Profile
  name TEXT UNIQUE NOT NULL,
  industry TEXT,
  size_category TEXT CHECK (size_category IN ('startup', 'small', 'medium', 'large', 'enterprise')),

  -- Engagement defaults
  visibility_default TEXT DEFAULT 'consultant_only'
    CHECK (visibility_default IN ('consultant_only', 'coach_visible', 'public')),

  -- Status
  active BOOLEAN DEFAULT true,
  engagement_start_date DATE,
  engagement_end_date DATE,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_client_orgs_name ON client_organizations(name);
CREATE INDEX idx_client_orgs_active ON client_organizations(active);
```

#### `clients` Table

**Purpose**: Individual coaching clients (executives at external orgs)

**Schema**:
```sql
CREATE TABLE clients (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication (Phase 3 - client portal access)
  auth_provider_id TEXT UNIQUE,        -- Supabase Auth user ID (optional)
  email TEXT UNIQUE,

  -- Profile
  name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,

  -- Organization relationship
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,

  -- Coaching relationship
  primary_coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  coaching_start_date DATE,
  coaching_end_date DATE,

  -- Status
  active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_org ON clients(client_organization_id);
CREATE INDEX idx_clients_coach ON clients(primary_coach_id);
CREATE INDEX idx_clients_active ON clients(active);
```

#### `coaching_models` Table

**Purpose**: Coaching models owned by companies (not individual coaches) - enables model sharing

**Schema**:
```sql
CREATE TABLE coaching_models (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (company owns the model, not individual coach)
  coaching_company_id UUID REFERENCES coaching_companies(id) ON DELETE CASCADE,

  -- Model details
  name TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  model_type TEXT CHECK (model_type IN ('theory_of_change', 'framework', 'evaluation_rubric', 'competency_model')),

  -- Content
  description TEXT,
  full_content TEXT,                   -- Full model text (also embedded in data_items)

  -- Metadata
  metadata JSONB,

  -- Status
  active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES coaches(id) ON DELETE SET NULL,

  UNIQUE(coaching_company_id, name, version)
);

CREATE INDEX idx_coaching_models_company ON coaching_models(coaching_company_id);
CREATE INDEX idx_coaching_models_active ON coaching_models(active);
CREATE INDEX idx_coaching_models_type ON coaching_models(model_type);
```

**Key Design Decision**:
- **Company Ownership**: Models belong to the coaching company, not individual coaches
- **Model Sharing**: All coaches in a company can access company models (if model_sharing_enabled)
- **Versioning**: Models can have versions (v1.0, v2.0) for evolution tracking
- **Coach Association**: Separate table tracks which coaches are trained/certified in which models

#### `coach_model_associations` Table

**Purpose**: Many-to-many relationship between coaches and coaching models (tracks training/certification)

**Schema**:
```sql
CREATE TABLE coach_model_associations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  coaching_model_id UUID REFERENCES coaching_models(id) ON DELETE CASCADE,

  -- Association metadata
  proficiency_level TEXT CHECK (proficiency_level IN ('learning', 'competent', 'expert', 'certified')),
  certification_date DATE,
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(coach_id, coaching_model_id)
);

CREATE INDEX idx_coach_model_coach ON coach_model_associations(coach_id);
CREATE INDEX idx_coach_model_model ON coach_model_associations(coaching_model_id);
CREATE INDEX idx_coach_model_proficiency ON coach_model_associations(proficiency_level);
```

**Key Design Decision**:
- Tracks which coaches are **trained/qualified/associated** with which models
- **Proficiency levels**: Learning → Competent → Expert → Certified
- Enables queries like "Which coaches are certified in Theory of Change v2.0?"

#### Updated `data_items` Table (with Foreign Keys)

**Changes from original design**:
- Add foreign key constraints to coaches, clients, client_organizations, coaching_models
- Add `coaching_model_id` for linking coaching model content
- Ensures referential integrity
- Enables cascading deletes/updates

**Schema**:
```sql
CREATE TABLE data_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,

  -- Ownership hierarchy (NOW WITH FOREIGN KEYS)
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,

  -- Coaching model reference (NEW - for data_type = 'coaching_model')
  coaching_model_id UUID REFERENCES coaching_models(id) ON DELETE SET NULL,

  -- Access control (prepare for Phase 3 RLS)
  visibility_level TEXT DEFAULT 'private'
    CHECK (visibility_level IN ('private', 'coach_only', 'org_visible', 'public')),
  allowed_roles TEXT[],
  access_restrictions JSONB,

  -- Content
  raw_content TEXT,
  metadata JSONB,

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES coaches(id) ON DELETE SET NULL,

  -- Optional session-specific data
  session_id UUID,
  session_date TIMESTAMP
);

-- Indexes
CREATE INDEX idx_data_items_type ON data_items(data_type);
CREATE INDEX idx_data_items_coach ON data_items(coach_id);
CREATE INDEX idx_data_items_client ON data_items(client_id);
CREATE INDEX idx_data_items_org ON data_items(client_organization_id);
CREATE INDEX idx_data_items_coaching_model ON data_items(coaching_model_id);
CREATE INDEX idx_data_items_visibility ON data_items(visibility_level);
CREATE INDEX idx_data_items_created_at ON data_items(created_at DESC);

-- Composite indexes for common filter combinations
CREATE INDEX idx_data_items_coach_type ON data_items(coach_id, data_type);
CREATE INDEX idx_data_items_org_type ON data_items(client_organization_id, data_type);
```

**Usage Pattern for Coaching Models**:
- When `data_type = 'coaching_model'`, populate `coaching_model_id` to link to `coaching_models` table
- The `coaching_models` table stores metadata (name, version, type)
- The `data_items` table stores the embedded content for vector search
- Example query: "Get all data items related to Theory of Change v2.0"
  ```sql
  SELECT di.* FROM data_items di
  JOIN coaching_models cm ON di.coaching_model_id = cm.id
  WHERE cm.name = 'Theory of Change' AND cm.version = '2.0';
  ```

**Benefits of Adding User Tables in Phase 2**:

1. **Data Integrity**: Foreign key constraints prevent orphaned records
2. **Authentication Foundation**: Ready for Supabase Auth integration in Phase 3
3. **Multi-Tenancy**: Clear tenant boundaries (coaching company, coach, client, org)
4. **Multi-Company Support**: Architecture ready for multiple coaching companies on same platform
5. **Model Sharing**: Company-owned coaching models enable knowledge sharing among coaches
6. **Metadata Storage**: Coach bios, client job titles, org engagement details, model versions
7. **Easier Queries**: Can join to get coach names, client orgs, coach certifications, etc.
8. **RLS Preparation**: Phase 3 policies can reference `coaches.auth_provider_id` and `coaching_company_id`

### Data Relationship Diagram

```
coaching_companies (Platform Level)
  ├─ "InsideOut Leadership"
  ├─ "Future Coaching Co" (future)
  └─ ...

  ↓ (owns)

coaches (Employee Level)
  ├─ Coach A (InsideOut)
  ├─ Coach B (InsideOut)
  └─ ...

  ↓ (coaches)

clients (Individual Level)
  ├─ Client 1 @ Acme Media
  ├─ Client 2 @ Acme Media
  └─ ...

  ↓ (work for)

client_organizations (External Org Level)
  ├─ Acme Media
  ├─ TechCorp Inc
  └─ ...

coaching_models (Company-Owned)
  ├─ Theory of Change v2.0 (InsideOut)
  ├─ Leadership Framework v1.0 (InsideOut)
  └─ ...

  ↓ (many-to-many via coach_model_associations)

coaches
  ├─ Coach A → certified in Theory of Change v2.0
  ├─ Coach B → learning Leadership Framework v1.0
  └─ ...

data_items (Search Index)
  ├─ Transcript (coach_id, client_id, client_organization_id)
  ├─ Assessment (client_id, client_organization_id)
  ├─ Coaching Model (coaching_model_id) ← links to coaching_models table
  ├─ Company Doc (client_organization_id)
  └─ ...
```

**Key Relationships**:

1. **Company → Coaches**: One-to-Many
   - Each coach belongs to one coaching company
   - Supports multi-company platform architecture

2. **Company → Coaching Models**: One-to-Many
   - Models are owned by the company, not individual coaches
   - Enables model sharing among all company coaches

3. **Coaches ↔ Coaching Models**: Many-to-Many (via coach_model_associations)
   - Tracks which coaches are trained/certified in which models
   - Includes proficiency level (learning, competent, expert, certified)

4. **Coach → Clients**: One-to-Many
   - Each client has a primary coach
   - Coaches can have multiple clients

5. **Client Organization → Clients**: One-to-Many
   - Clients work for external organizations
   - Multiple clients from same org can be coached by different coaches

6. **Data Items → Everything**: Links to coaches, clients, orgs, coaching models
   - Transcripts link to coach + client + org
   - Assessments link to client + org
   - Coaching models link to coaching_models table
   - Company docs link to client org

### Metadata Schemas by Data Type

**Flexible JSONB structure per type**:

#### Transcript Metadata
```json
{
  "meeting_date": "2025-11-10T15:00:00Z",
  "duration_minutes": 60,
  "session_number": 12,
  "session_type": "regular" | "intake" | "closure",
  "fireflies_meeting_id": "abc123",
  "participants": ["coach_id", "client_id"],
  "topics": ["career_transition", "leadership_style"],
  "action_items": ["Update resume", "Schedule team 1-on-1s"]
}
```

#### Assessment Metadata
```json
{
  "assessment_type": "DISC" | "Myers-Briggs" | "Enneagram" | "360_feedback" | "skills",
  "assessment_name": "DISC Personality Assessment",
  "date_taken": "2025-10-15",
  "assessor": "coach_id" | "third_party",
  "scores": {
    "dominance": 85,
    "influence": 60,
    "steadiness": 40,
    "conscientiousness": 70
  },
  "profile_summary": "High D/C profile",
  "interpretation_included": true
}
```

#### Coaching Model Metadata
```json
{
  "model_name": "Theory of Change v2.0",
  "model_type": "theory_of_change" | "framework" | "philosophy",
  "version": "2.0",
  "last_updated": "2025-09-01",
  "key_principles": ["Growth mindset", "Systems thinking", "Emotional intelligence"],
  "evaluation_criteria": ["Asks powerful questions", "Challenges assumptions", "Facilitates insight"],
  "applies_to": "all_clients" | "specific_client_id"
}
```

#### Company Doc Metadata
```json
{
  "doc_type": "OKR" | "org_chart" | "strategy" | "operating_system" | "KPI" | "P&L",
  "quarter": "Q4 2025",
  "fiscal_year": 2025,
  "department": "Engineering" | "Leadership" | "Sales",
  "confidentiality": "high" | "medium" | "low",
  "last_updated": "2025-11-01",
  "author": "leadership_team",
  "shared_with_coaches": true | false
}
```

#### Goal Metadata
```json
{
  "goal_type": "career" | "leadership" | "skills" | "relationship" | "health",
  "status": "not_started" | "in_progress" | "achieved" | "abandoned",
  "target_date": "2026-03-01",
  "progress_percentage": 65,
  "milestones": [
    {"name": "Complete training", "status": "achieved"},
    {"name": "Lead first project", "status": "in_progress"}
  ],
  "related_assessments": ["assessment_id_1"],
  "accountability_partner": "coach_id"
}
```

#### Note Metadata
```json
{
  "note_type": "session_prep" | "post_session" | "observation" | "action_item",
  "related_session_id": "session_uuid",
  "visibility": "coach_only" | "shared_with_client",
  "tags": ["leadership_development", "conflict_resolution"],
  "priority": "high" | "medium" | "low",
  "follow_up_required": true | false,
  "follow_up_date": "2025-11-15"
}
```

---

## Checkpoint 4: Schema Migration & Core Architecture

**Duration**: 1 week

**Goal**: Migrate existing Phase 1 schema to unified Phase 2 schema with user/org tables for authentication foundation.

### Tasks

#### Task 1: Create Migration SQL Scripts

**File**: `scripts/migrations/002_multi_type_schema.sql`

**Steps**:
1. Create `coaching_companies` table
2. Create `coaches` table (with FK to coaching_companies)
3. Create `client_organizations` table
4. Create `clients` table (with FKs to coaches and orgs)
5. Create `coaching_models` table (with FK to coaching_companies)
6. Create `coach_model_associations` table (many-to-many)
7. Create new `data_items` table (with FKs to all tables)
8. Create new `data_chunks` table
9. Migrate existing `transcripts` → `data_items` with `data_type = 'transcript'`
10. Migrate existing `transcript_chunks` → `data_chunks`
11. Add indexes
12. Create RPC function for multi-type vector search
13. Drop old tables (after validation)

**Migration Script Outline**:
```sql
-- Step 1: Create coaching company tables (must come first for FKs)
CREATE TABLE coaching_companies (...);

-- Step 2: Create user & organization tables
CREATE TABLE coaches (...);  -- FK to coaching_companies
CREATE TABLE client_organizations (...);
CREATE TABLE clients (...);  -- FK to coaches, client_organizations

-- Step 3: Create coaching model tables
CREATE TABLE coaching_models (...);  -- FK to coaching_companies
CREATE TABLE coach_model_associations (...);  -- FK to coaches, coaching_models

-- Step 2: Create data tables (with FKs to user tables)
CREATE TABLE data_items (...);
CREATE TABLE data_chunks (...);

-- Step 3: Seed initial user data (if migrating from Phase 1 with existing IDs)
-- Option A: If Phase 1 had coach/client IDs in metadata, extract them
-- Option B: Create placeholder records for migration, update later with real data

-- Step 4: Migrate transcript data
INSERT INTO data_items (id, data_type, coach_id, client_id, raw_content, metadata, created_at, session_date)
SELECT
  id,
  'transcript' AS data_type,
  coach_id,
  client_id,
  raw_text AS raw_content,
  metadata,
  created_at,
  meeting_date AS session_date
FROM transcripts;

INSERT INTO data_chunks (id, data_item_id, chunk_index, content, embedding, created_at)
SELECT
  id,
  transcript_id AS data_item_id,
  chunk_index,
  content,
  embedding,
  created_at
FROM transcript_chunks;

-- Step 3: Create indexes
CREATE INDEX ... (see schema section)

-- Step 4: Update RPC function
CREATE OR REPLACE FUNCTION match_data_chunks(
  query_embedding vector(1536),
  filter_types TEXT[] DEFAULT NULL,
  filter_coach_id UUID DEFAULT NULL,
  filter_client_id UUID DEFAULT NULL,
  filter_org_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  data_item_id UUID,
  content TEXT,
  similarity FLOAT,
  data_type TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.data_item_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    di.data_type,
    di.metadata
  FROM data_chunks dc
  JOIN data_items di ON dc.data_item_id = di.id
  WHERE
    (filter_types IS NULL OR di.data_type = ANY(filter_types))
    AND (filter_coach_id IS NULL OR di.coach_id = filter_coach_id)
    AND (filter_client_id IS NULL OR di.client_id = filter_client_id)
    AND (filter_org_id IS NULL OR di.client_organization_id = filter_org_id)
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Step 5: Validate migration
SELECT
  (SELECT COUNT(*) FROM transcripts) AS old_transcripts_count,
  (SELECT COUNT(*) FROM data_items WHERE data_type = 'transcript') AS new_transcripts_count,
  (SELECT COUNT(*) FROM transcript_chunks) AS old_chunks_count,
  (SELECT COUNT(*) FROM data_chunks) AS new_chunks_count;

-- Step 6: Drop old tables (only after validation passes!)
-- DROP TABLE transcript_chunks;
-- DROP TABLE transcripts;
```

#### Task 2: Update API Server for New Schema

**File**: `api/server.js`

**Changes**:
1. Update database queries to use `data_items` instead of `transcripts`
2. Update chunking functions to write to `data_chunks`
3. Update search endpoint to call new `match_data_chunks` RPC
4. Maintain backward compatibility (existing `/api/transcripts/upload` still works)

**Code Changes**:
```javascript
// Before (Phase 1)
const { data, error } = await supabase
  .from('transcripts')
  .insert({
    raw_text: text,
    meeting_date: meetingDate,
    coach_id: coachId,
    client_id: clientId
  });

// After (Phase 2)
const { data, error } = await supabase
  .from('data_items')
  .insert({
    data_type: 'transcript',
    raw_content: text,
    session_date: meetingDate,
    coach_id: coachId,
    client_id: clientId,
    visibility_level: 'coach_only',  // Default for transcripts
    metadata: {
      session_type: 'regular',
      duration_minutes: metadata?.duration_minutes
    }
  });
```

#### Task 3: Test Migration with Existing Data

**Validation Steps**:
1. Run migration script on local Supabase
2. Verify data counts match (transcripts → data_items, chunks → chunks)
3. Test existing `/api/search` endpoint (should still work)
4. Upload new transcript via `/api/transcripts/upload` (should write to new schema)
5. Search for newly uploaded transcript (should find it)
6. Compare search results before/after migration (should be identical)

#### Task 4: Deploy Migration to Production

**Steps**:
1. Create Supabase database backup
2. Run migration script via Supabase dashboard or MCP tool
3. Verify production data migrated successfully
4. Deploy updated API server code to Vercel
5. Test production endpoints

### Validation Criteria

- ✅ All existing transcripts migrated to `data_items` with `data_type = 'transcript'`
- ✅ All chunks migrated to `data_chunks` with embeddings intact
- ✅ Existing search queries return same results as Phase 1
- ✅ New transcript uploads work via updated API
- ✅ No data loss or corruption

### Rollback Plan

If migration fails:
1. Restore Supabase backup
2. Revert API server deployment
3. Investigate migration errors
4. Fix and retry

---

## Checkpoint 5: Multi-Type Processing Pipeline

**Duration**: 1 week

**Goal**: Support uploading and processing 4 core data types beyond transcripts.

### Data Types to Implement

1. ✅ **Transcripts** (already migrated)
2. 🆕 **Assessments** (personality, 360, skills)
3. 🆕 **Coaching Models** (theory of change, frameworks)
4. 🆕 **Company Docs** (OKRs, org charts, strategy docs)

### Architecture: Type-Specific Processors

**Pattern**: Strategy pattern for type-specific processing

**Structure**:
```javascript
// processors/base-processor.js
class BaseDataProcessor {
  async process(rawContent, metadata) {
    // 1. Validate input
    this.validate(rawContent, metadata);

    // 2. Type-specific processing
    const processed = await this.typeSpecificProcessing(rawContent, metadata);

    // 3. Chunk content
    const chunks = this.chunkContent(processed.content, this.getChunkConfig());

    // 4. Generate embeddings
    const embeddedChunks = await this.generateEmbeddings(chunks);

    return {
      dataItem: processed.dataItem,
      chunks: embeddedChunks
    };
  }

  // Override in subclasses
  validate(rawContent, metadata) { throw new Error('Not implemented'); }
  typeSpecificProcessing(rawContent, metadata) { throw new Error('Not implemented'); }
  getChunkConfig() { return { chunkSize: 500, overlap: 50 }; }
}

// processors/transcript-processor.js
class TranscriptProcessor extends BaseDataProcessor {
  validate(rawContent, metadata) {
    if (!rawContent || rawContent.length < 50) {
      throw new Error('Transcript must be at least 50 characters');
    }
  }

  async typeSpecificProcessing(rawContent, metadata) {
    return {
      dataItem: {
        data_type: 'transcript',
        raw_content: rawContent,
        session_date: metadata.meeting_date || new Date(),
        coach_id: metadata.coach_id,
        client_id: metadata.client_id,
        visibility_level: 'coach_only',
        metadata: {
          session_type: metadata.session_type || 'regular',
          duration_minutes: metadata.duration_minutes,
          topics: metadata.topics || []
        }
      },
      content: rawContent
    };
  }

  getChunkConfig() {
    return { chunkSize: 500, overlap: 50 };
  }
}

// processors/assessment-processor.js
class AssessmentProcessor extends BaseDataProcessor {
  validate(rawContent, metadata) {
    if (!metadata.assessment_type) {
      throw new Error('assessment_type required in metadata');
    }
  }

  async typeSpecificProcessing(rawContent, metadata) {
    // Extract structured data if present
    const structuredData = this.extractStructuredData(rawContent, metadata.assessment_type);

    return {
      dataItem: {
        data_type: 'assessment',
        raw_content: rawContent,
        client_id: metadata.client_id,
        coach_id: metadata.coach_id,
        visibility_level: metadata.visibility_level || 'coach_only',
        metadata: {
          assessment_type: metadata.assessment_type,
          date_taken: metadata.date_taken || new Date(),
          scores: structuredData.scores,
          profile_summary: structuredData.summary
        }
      },
      content: rawContent
    };
  }

  getChunkConfig() {
    return { chunkSize: 300, overlap: 30 };  // Shorter chunks for assessments
  }

  extractStructuredData(rawContent, assessmentType) {
    // Type-specific parsing logic
    // E.g., for DISC, extract D/I/S/C scores
    return { scores: {}, summary: '' };
  }
}

// processors/coaching-model-processor.js
class CoachingModelProcessor extends BaseDataProcessor {
  validate(rawContent, metadata) {
    if (!metadata.model_name) {
      throw new Error('model_name required in metadata');
    }
  }

  async typeSpecificProcessing(rawContent, metadata) {
    return {
      dataItem: {
        data_type: 'coaching_model',
        raw_content: rawContent,
        coach_id: metadata.coach_id,  // Owned by coach
        visibility_level: metadata.visibility_level || 'private',  // Default private
        metadata: {
          model_name: metadata.model_name,
          model_type: metadata.model_type || 'theory_of_change',
          version: metadata.version || '1.0',
          key_principles: metadata.key_principles || [],
          evaluation_criteria: metadata.evaluation_criteria || []
        }
      },
      content: rawContent
    };
  }

  getChunkConfig() {
    return { chunkSize: 400, overlap: 50 };
  }
}

// processors/company-doc-processor.js
class CompanyDocProcessor extends BaseDataProcessor {
  validate(rawContent, metadata) {
    if (!metadata.doc_type) {
      throw new Error('doc_type required in metadata');
    }
    if (!metadata.client_organization_id) {
      throw new Error('client_organization_id required for company docs');
    }
  }

  async typeSpecificProcessing(rawContent, metadata) {
    return {
      dataItem: {
        data_type: 'company_doc',
        raw_content: rawContent,
        client_organization_id: metadata.client_organization_id,
        visibility_level: metadata.shared_with_coaches ? 'org_visible' : 'private',
        allowed_roles: metadata.allowed_roles || ['consultant'],  // Default consultant-only
        metadata: {
          doc_type: metadata.doc_type,
          quarter: metadata.quarter,
          fiscal_year: metadata.fiscal_year,
          department: metadata.department,
          confidentiality: metadata.confidentiality || 'high',
          shared_with_coaches: metadata.shared_with_coaches || false
        }
      },
      content: rawContent
    };
  }
}

// Registry
const processors = {
  transcript: new TranscriptProcessor(),
  assessment: new AssessmentProcessor(),
  coaching_model: new CoachingModelProcessor(),
  company_doc: new CompanyDocProcessor()
};

export function getProcessor(dataType) {
  const processor = processors[dataType];
  if (!processor) {
    throw new Error(`Unsupported data type: ${dataType}`);
  }
  return processor;
}
```

### Tasks

#### Task 1: Implement Processor Classes

**Files**:
- `processors/base-processor.js`
- `processors/transcript-processor.js`
- `processors/assessment-processor.js`
- `processors/coaching-model-processor.js`
- `processors/company-doc-processor.js`
- `processors/index.js` (registry)

#### Task 2: Create Upload Endpoints

**Generic Upload Endpoint**:
```javascript
// POST /api/data/upload
app.post('/api/data/upload', async (req, res) => {
  try {
    const { data_type, raw_content, metadata } = req.body;

    // Get appropriate processor
    const processor = getProcessor(data_type);

    // Process data
    const { dataItem, chunks } = await processor.process(raw_content, metadata);

    // Store in database
    const { data: item, error: itemError } = await supabase
      .from('data_items')
      .insert(dataItem)
      .select()
      .single();

    if (itemError) throw itemError;

    // Store chunks
    const chunksWithItemId = chunks.map((chunk, index) => ({
      data_item_id: item.id,
      chunk_index: index,
      content: chunk.content,
      embedding: chunk.embedding
    }));

    const { error: chunkError } = await supabase
      .from('data_chunks')
      .insert(chunksWithItemId);

    if (chunkError) throw chunkError;

    res.status(201).json({
      success: true,
      data_item_id: item.id,
      chunks_created: chunks.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});
```

**Type-Specific Endpoints** (convenience wrappers):
```javascript
// POST /api/transcripts/upload (backward compatible)
app.post('/api/transcripts/upload', async (req, res) => {
  req.body.data_type = 'transcript';
  req.body.raw_content = req.body.text;  // Map old field name
  // Forward to generic endpoint
  return uploadData(req, res);
});

// POST /api/assessments/upload
app.post('/api/assessments/upload', async (req, res) => {
  req.body.data_type = 'assessment';
  req.body.raw_content = req.body.text;
  return uploadData(req, res);
});

// POST /api/models/upload
app.post('/api/models/upload', async (req, res) => {
  req.body.data_type = 'coaching_model';
  req.body.raw_content = req.body.text;
  return uploadData(req, res);
});

// POST /api/company-docs/upload
app.post('/api/company-docs/upload', async (req, res) => {
  req.body.data_type = 'company_doc';
  req.body.raw_content = req.body.text;
  return uploadData(req, res);
});
```

#### Task 3: Update OpenAPI Schema

**Add new endpoints to** `api/server.js` OpenAPI section:
```javascript
paths: {
  '/api/data/upload': {
    post: {
      summary: 'Upload any data type',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['data_type', 'raw_content'],
              properties: {
                data_type: {
                  type: 'string',
                  enum: ['transcript', 'assessment', 'coaching_model', 'company_doc']
                },
                raw_content: { type: 'string' },
                metadata: { type: 'object' }
              }
            }
          }
        }
      }
    }
  },
  // ... type-specific endpoints
}
```

### Validation Criteria

- ✅ Upload transcript via `/api/transcripts/upload` (backward compatible)
- ✅ Upload assessment via `/api/assessments/upload`
- ✅ Upload coaching model via `/api/models/upload`
- ✅ Upload company doc via `/api/company-docs/upload`
- ✅ All uploads create `data_items` + `data_chunks` correctly
- ✅ Metadata stored correctly per type
- ✅ Embeddings generated for all types

### Testing Checklist

- [ ] Upload sample transcript (100 words)
- [ ] Upload sample DISC assessment (500 words)
- [ ] Upload sample coaching model (800 words)
- [ ] Upload sample OKR document (300 words)
- [ ] Verify all stored in `data_items` table
- [ ] Verify chunks created with correct chunk sizes
- [ ] Verify embeddings generated

---

## Checkpoint 6: Type-Aware Search & Filtering

**Duration**: 1 week

**Goal**: Enhance `/api/search` to support multi-dimensional filtering and type-aware results.

### Enhanced Search API

#### Request Parameters

```typescript
POST /api/search

{
  // Query
  "query": "leadership development patterns",

  // Type filters
  "types": ["transcript", "assessment"],  // Optional, default: all types

  // Scope filters
  "coach_id": "uuid",           // Optional, filter by coach
  "client_id": "uuid",          // Optional, filter by client
  "organization_id": "uuid",    // Optional, filter by client org

  // Visibility filters (Phase 3, but prep schema now)
  "include_org_docs": true,     // Optional, include org-level docs
  "visibility": "coach_visible", // Optional, filter by visibility level

  // Search parameters
  "threshold": 0.3,             // Optional, similarity threshold
  "limit": 10                   // Optional, max results
}
```

#### Response Format

```typescript
{
  "query": "leadership development patterns",
  "results": [
    {
      "id": "chunk_uuid",
      "data_item_id": "item_uuid",
      "data_type": "transcript",
      "content": "...",
      "similarity": 0.87,

      // Context from data_items
      "coach_id": "coach_uuid",
      "client_id": "client_uuid",
      "client_organization_id": "org_uuid",
      "session_date": "2025-11-10T15:00:00Z",

      // Type-specific metadata
      "metadata": {
        "session_type": "regular",
        "duration_minutes": 60
      }
    },
    {
      "id": "chunk_uuid_2",
      "data_item_id": "item_uuid_2",
      "data_type": "assessment",
      "content": "...",
      "similarity": 0.82,

      "client_id": "client_uuid",
      "metadata": {
        "assessment_type": "DISC",
        "date_taken": "2025-10-15",
        "profile_summary": "High D/C"
      }
    }
  ],
  "count": 2,
  "filters_applied": {
    "types": ["transcript", "assessment"],
    "coach_id": "coach_uuid"
  }
}
```

### Implementation

#### Task 1: Update Search Endpoint

**File**: `api/server.js`

```javascript
app.post('/api/search', async (req, res) => {
  try {
    const {
      query,
      types = null,  // null = all types
      coach_id = null,
      client_id = null,
      organization_id = null,
      include_org_docs = false,
      visibility = null,
      threshold = 0.3,
      limit = 10
    } = req.body;

    // Validate query
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query is required'
      });
    }

    // Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Call enhanced RPC function
    const { data: results, error } = await supabase.rpc('match_data_chunks', {
      query_embedding: queryEmbedding,
      filter_types: types,
      filter_coach_id: coach_id,
      filter_client_id: client_id,
      filter_org_id: organization_id,
      filter_visibility: visibility,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) throw error;

    res.json({
      query,
      results: results.map(r => ({
        id: r.id,
        data_item_id: r.data_item_id,
        data_type: r.data_type,
        content: r.content,
        similarity: r.similarity,
        coach_id: r.coach_id,
        client_id: r.client_id,
        client_organization_id: r.client_organization_id,
        session_date: r.session_date,
        metadata: r.metadata
      })),
      count: results.length,
      filters_applied: {
        types,
        coach_id,
        client_id,
        organization_id,
        visibility
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});
```

#### Task 2: Update RPC Function (Already in Checkpoint 4)

**See Checkpoint 4** for `match_data_chunks` RPC function that supports all filters.

#### Task 3: Add Result Formatting Logic

**Type-specific result formatting**:

```javascript
function formatResult(result) {
  const base = {
    id: result.id,
    data_item_id: result.data_item_id,
    data_type: result.data_type,
    content: result.content,
    similarity: result.similarity
  };

  // Add type-specific context
  switch (result.data_type) {
    case 'transcript':
      return {
        ...base,
        session_date: result.session_date,
        session_type: result.metadata?.session_type,
        topics: result.metadata?.topics
      };

    case 'assessment':
      return {
        ...base,
        assessment_type: result.metadata?.assessment_type,
        date_taken: result.metadata?.date_taken,
        profile_summary: result.metadata?.profile_summary
      };

    case 'coaching_model':
      return {
        ...base,
        model_name: result.metadata?.model_name,
        version: result.metadata?.version,
        key_principles: result.metadata?.key_principles
      };

    case 'company_doc':
      return {
        ...base,
        doc_type: result.metadata?.doc_type,
        quarter: result.metadata?.quarter,
        department: result.metadata?.department
      };

    default:
      return base;
  }
}
```

### Use Case Validation

#### Scenario 1: Marketing Analysis (Narrow Scope)

**Query**:
```json
POST /api/search
{
  "query": "common challenges clients face",
  "types": ["transcript"],
  "coach_id": "coach_a_uuid",
  "limit": 20
}
```

**Expected**: Only transcripts from Coach A, no assessments/models/docs.

#### Scenario 2: Year-End Report (Broad Scope)

**Query**:
```json
POST /api/search
{
  "query": "client progress and development",
  "types": ["transcript", "assessment", "goal", "coaching_model"],
  "coach_id": "coach_a_uuid",
  "limit": 50
}
```

**Expected**: All data types for Coach A's clients + Coach A's model.

#### Scenario 3: Org Pattern Analysis (Cross-Coach)

**Query**:
```json
POST /api/search
{
  "query": "leadership challenges",
  "types": ["transcript"],
  "organization_id": "acme_media_uuid",
  "limit": 30
}
```

**Expected**: Transcripts from ALL coaches working with Acme Media clients.

#### Scenario 4: Model-Based Evaluation

**Query**:
```json
POST /api/search
{
  "query": "facilitating insight and asking powerful questions",
  "types": ["transcript", "coaching_model"],
  "coach_id": "coach_a_uuid",
  "client_id": "client_x_uuid",
  "limit": 10
}
```

**Expected**:
- Coach A's coaching model (theory of change)
- Specific session transcript with Client X
- Model provides evaluation framework for session

### Validation Criteria

- ✅ Type filtering works (`types` parameter)
- ✅ Coach filtering works (`coach_id` parameter)
- ✅ Client filtering works (`client_id` parameter)
- ✅ Org filtering works (`organization_id` parameter)
- ✅ Multiple filters can be combined
- ✅ Results include type-specific metadata
- ✅ Backward compatibility: no filters = search all types

### Testing Checklist

- [ ] Upload 2 transcripts, 1 assessment, 1 model (4 items total)
- [ ] Search all types (should return 4)
- [ ] Search only transcripts (should return 2)
- [ ] Search by coach_id (should return items for that coach)
- [ ] Search by client_id (should return items for that client)
- [ ] Combine filters: coach + type (should return subset)

---

## Checkpoint 7: Custom GPT Integration & Phase 2 Validation

**Duration**: 3-5 days

**Goal**: Validate multi-type architecture works with Custom GPT and document Phase 2 results.

### Tasks

#### Task 1: Update OpenAPI Schema

**Update** `api/server.js` OpenAPI section with all new endpoints and parameters.

**Key Changes**:
```javascript
'/api/search': {
  post: {
    requestBody: {
      content: {
        'application/json': {
          schema: {
            properties: {
              query: { type: 'string' },
              types: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['transcript', 'assessment', 'coaching_model', 'company_doc']
                }
              },
              coach_id: { type: 'string', format: 'uuid' },
              client_id: { type: 'string', format: 'uuid' },
              organization_id: { type: 'string', format: 'uuid' },
              threshold: { type: 'number', minimum: 0, maximum: 1 },
              limit: { type: 'integer', minimum: 1, maximum: 50 }
            }
          }
        }
      }
    }
  }
}
```

#### Task 2: Re-Import Schema in Custom GPT

**Follow** `docs/setup/custom-gpt-setup.md` update process:
1. Go to Custom GPT settings
2. Actions → Edit
3. Re-import from: `https://unified-data-layer.vercel.app/openapi.json`
4. Save

**Expected**: Custom GPT now aware of new search parameters.

#### Task 3: Upload Sample Multi-Type Data

**Upload dataset**:
```bash
# Transcript
curl -X POST https://unified-data-layer.vercel.app/api/transcripts/upload \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Client discussed their leadership challenges, particularly around giving difficult feedback to their team. We explored their DISC profile (High D) and how that impacts their communication style.",
    "metadata": {
      "coach_id": "coach_a_uuid",
      "client_id": "client_1_uuid",
      "session_type": "regular"
    }
  }'

# Assessment
curl -X POST https://unified-data-layer.vercel.app/api/assessments/upload \
  -H "Content-Type: application/json" \
  -d '{
    "text": "DISC Assessment Results: Dominance: 85, Influence: 60, Steadiness: 40, Conscientiousness: 70. Profile Summary: High D/C indicates a results-oriented, analytical leader who values efficiency and accuracy. May struggle with patience and delegation.",
    "metadata": {
      "client_id": "client_1_uuid",
      "coach_id": "coach_a_uuid",
      "assessment_type": "DISC",
      "date_taken": "2025-09-15"
    }
  }'

# Coaching Model
curl -X POST https://unified-data-layer.vercel.app/api/models/upload \
  -H "Content-Type: application/json" \
  -d '{
    "text": "My Theory of Change: Effective coaching facilitates insight by asking powerful questions rather than providing answers. Key principles: 1) Trust the client has their own answers, 2) Challenge assumptions with curiosity, 3) Create space for reflection, 4) Hold the client accountable to their commitments.",
    "metadata": {
      "coach_id": "coach_a_uuid",
      "model_name": "Theory of Change v2.0",
      "model_type": "theory_of_change",
      "visibility_level": "private"
    }
  }'

# Company Doc
curl -X POST https://unified-data-layer.vercel.app/api/company-docs/upload \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Q4 2025 OKRs for Engineering: Objective 1 - Scale platform to 10M users. KR1: Reduce API latency to <100ms. KR2: Achieve 99.9% uptime. Objective 2 - Improve developer productivity. KR1: Reduce deploy time to <5min. KR2: Increase test coverage to 80%.",
    "metadata": {
      "client_organization_id": "acme_media_uuid",
      "doc_type": "OKR",
      "quarter": "Q4 2025",
      "department": "Engineering",
      "shared_with_coaches": true,
      "visibility_level": "org_visible"
    }
  }'
```

#### Task 4: Test Custom GPT with Multi-Type Queries

**Test Scenarios**:

**Test 1: Cross-Type Pattern Analysis**
```
Ask Custom GPT: "Based on this client's DISC assessment and recent sessions, what leadership development areas should we focus on?"
```

**Expected**:
- GPT searches for assessment + transcripts
- Finds High D/C profile
- Finds feedback conversation in transcript
- Synthesizes: "Focus on patience, delegation, and softening communication style"

**Test 2: Coach Self-Evaluation**
```
Ask Custom GPT: "Evaluate this coaching session against my stated theory of change. Did I ask powerful questions and facilitate insight?"
```

**Expected**:
- GPT searches for coach's model + specific transcript
- Compares session against principles
- Provides evaluation: "Yes, you asked 'What would it look like if...' which aligns with principle of challenging assumptions"

**Test 3: Org Context Search**
```
Ask Custom GPT: "What are Acme Media's Q4 priorities in Engineering, and how do those relate to conversations with clients from that org?"
```

**Expected**:
- GPT searches for Acme org docs + transcripts from Acme clients
- Finds OKR document
- Finds relevant transcript mentions of scaling/performance
- Synthesizes connection

**Test 4: Type-Specific Search**
```
Ask Custom GPT: "Show me all DISC assessments for clients discussing leadership challenges"
```

**Expected**:
- GPT filters to assessment type only
- Searches for "leadership challenges"
- Returns assessment results (not transcripts)

#### Task 5: Document Phase 2 Results

**Create**: `docs/project/PHASE_2_RESULTS.md`

**Include**:
1. What worked well
2. Challenges encountered
3. Performance metrics (search latency, embedding costs)
4. Custom GPT integration learnings
5. Recommendations for Phase 3
6. Known limitations

**Template**:
```markdown
# Phase 2 Results: Multi-Data-Type Architecture

## Summary
[Brief overview of Phase 2 outcomes]

## Achievements
- [x] Migrated to unified schema
- [x] Implemented 4 data types
- [x] Type-aware search working
- [x] Custom GPT integration validated

## Performance Metrics
| Metric | Phase 1 (Transcripts Only) | Phase 2 (Multi-Type) |
|--------|----------------------------|----------------------|
| Search latency (avg) | Xms | Yms |
| Embedding cost per upload | $X | $Y |
| Database query time | Xms | Yms |

## What Worked Well
- Unified schema simplified queries
- Type-specific processors kept code organized
- Granular access controls prepared for Phase 3

## Challenges
- [List challenges encountered]

## Recommendations for Phase 3
- [Security/privacy recommendations]
- [Performance optimizations]
- [Feature suggestions]

## Known Limitations
- [List any current limitations]
```

### Validation Criteria

- ✅ Custom GPT can query multiple data types in one search
- ✅ Type filtering works as expected
- ✅ Coach model included when evaluating coach's sessions
- ✅ Org docs accessible when appropriate
- ✅ Search performance acceptable (< 3 seconds)
- ✅ Phase 2 results documented

### Testing Checklist

- [ ] Re-import OpenAPI schema in Custom GPT
- [ ] Upload 4 sample data items (1 of each type)
- [ ] Run Test 1: Pattern analysis across types
- [ ] Run Test 2: Coach self-evaluation with model
- [ ] Run Test 3: Org context search
- [ ] Run Test 4: Type-specific filtering
- [ ] Measure search performance
- [ ] Document results in PHASE_2_RESULTS.md

---

## Risk Mitigation

### Risk 1: Data Loss During Migration

**Likelihood**: Low
**Impact**: Critical

**Mitigation**:
- Full Supabase backup before migration
- Validation queries to compare counts
- Test migration on local database first
- Rollback plan documented

**Rollback**:
- Restore Supabase backup
- Revert API deployment
- Investigate errors before retry

### Risk 2: Performance Degradation

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Comprehensive indexes on new schema
- Test with realistic data volumes (100+ items)
- Monitor query performance
- EXPLAIN ANALYZE on slow queries

**If Performance Issues**:
- Add missing indexes
- Optimize RPC function
- Consider caching layer (Phase 3)

### Risk 3: Custom GPT Integration Breaks

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Maintain backward compatibility on `/api/search`
- Test with Phase 1 queries before updating schema
- Incremental OpenAPI schema updates

**Rollback**:
- Revert to Phase 1 OpenAPI schema
- Custom GPT continues working with transcripts only
- Fix issues before re-importing schema

### Risk 4: Type-Specific Logic Becomes Unwieldy

**Likelihood**: Medium
**Impact**: Low

**Mitigation**:
- Clean processor architecture (strategy pattern)
- Unit tests for each processor
- Refactor if complexity grows

**If Complexity Grows**:
- Extract common logic to base class
- Consider moving type logic to configuration files
- Evaluate if additional types need subtypes

### Risk 5: Access Control Complexity

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Start simple (visibility_level only)
- Add granular controls (allowed_roles) incrementally
- Phase 3 will implement full RLS

**If Too Complex**:
- Simplify to fewer visibility levels
- Defer granular controls to Phase 3
- Document access patterns for later

---

## Success Metrics

### Technical Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Migration success rate | 100% | All transcripts migrated to data_items |
| Data integrity | 100% | Chunk counts match before/after |
| Search latency (multi-type) | < 3 seconds | Time from API call to response |
| Embedding cost per item | < $0.01 | OpenAI API costs / items uploaded |
| API uptime | > 99% | Vercel monitoring |

### Functional Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Data types supported | 4+ | transcript, assessment, model, company_doc |
| Type filters working | 100% | All filter combinations tested |
| Custom GPT multi-type queries | Success | GPT retrieves multiple types correctly |
| Backward compatibility | 100% | Phase 1 queries still work |

### User Experience Metrics (Custom GPT)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Query response time | < 5 seconds | End-to-end (GPT + API) |
| Result relevance | > 80% | Manual evaluation of top 5 results |
| Type-appropriate results | 100% | No transcripts when filtering to assessments |
| Cross-type synthesis | Qualitative | GPT combines assessment + transcript insights |

### Code Quality Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Test coverage | > 70% | Jest/Vitest (Phase 3) |
| Code duplication | < 10% | Manual review |
| Documentation completeness | 100% | All endpoints in OpenAPI |

---

## Scalability Analysis: Breaking Points & Mitigation Strategies

### Overview

This section analyzes architectural bottlenecks at three scale horizons:
1. **50-100 users**: Early adoption (InsideOut's initial coach cohort)
2. **100-1,000 users**: Growth phase (expanding coach team + multi-org clients)
3. **1,000-100,000 users**: Enterprise scale (large coaching organization or platform)

For each horizon, we identify:
- **Database bottlenecks** (query performance, storage, connections)
- **API bottlenecks** (request throughput, memory, rate limits)
- **Embedding bottlenecks** (OpenAI API limits, cost, latency)
- **Search bottlenecks** (vector search performance, index scaling)
- **Cost scaling** (infrastructure, API costs, storage)

---

### Horizon 1: 50-100 Users (InsideOut's Initial Scale)

**Assumptions**:
- 50 coaches, 50-100 clients
- ~5 transcripts/coach/week = 250 transcripts/week
- ~10 assessments/client/year = 100 assessments/year
- Data volume: ~50k chunks after 1 year

#### Database Bottlenecks

**UNLIKELY to break** at this scale, but watch for:

1. **Vector Search Performance**
   - **Symptom**: Queries > 3 seconds with 50k chunks
   - **Root Cause**: pgvector IVFFlat index tuned for wrong dataset size
   - **Fix**: Adjust IVFFlat `lists` parameter:
     ```sql
     -- Current: lists = 100 (good for 10k-100k vectors)
     -- If slow, increase: lists = sqrt(50000) ≈ 224
     CREATE INDEX idx_data_chunks_embedding ON data_chunks
       USING ivfflat (embedding vector_cosine_ops) WITH (lists = 224);
     ```
   - **Prevention**: Monitor query latency, EXPLAIN ANALYZE slow searches

2. **Connection Pool Exhaustion**
   - **Symptom**: "too many connections" errors during peak usage
   - **Root Cause**: Supabase free tier = 50 connections, Vercel serverless = new connection per request
   - **Fix**: Use Supabase connection pooler (Supavisor) in transaction mode
   - **Prevention**: Configure Vercel to use pooled connection string
   - **Upgrade Path**: Supabase Pro (200 connections) if needed

3. **Foreign Key Lookup Overhead**
   - **Symptom**: Slow queries when joining `data_items` → `coaches` → `clients`
   - **Root Cause**: Missing indexes on FK columns
   - **Fix**: Already mitigated (indexes on coach_id, client_id, org_id)
   - **Prevention**: Use EXPLAIN ANALYZE to verify index usage

**Cost at 50-100 users**:
- Supabase: Free tier (up to 500 MB database) → **$0/month**
- Likely need Pro tier for connection pooling → **$25/month**

#### API Bottlenecks

**UNLIKELY to break** at this scale:

1. **Vercel Serverless Function Timeout**
   - **Symptom**: Requests timeout at 10 seconds (Hobby tier)
   - **Root Cause**: Embedding generation + search takes > 10s for large uploads
   - **Fix**: Upgrade to Pro tier (60s timeout) → **$20/month**
   - **Alternative**: Break upload into async chunks (background job)

2. **Memory Limits**
   - **Symptom**: Function crashes when processing large PDFs
   - **Root Cause**: Vercel Hobby tier = 1 GB memory per function
   - **Fix**: Stream large files, chunk before loading into memory
   - **Prevention**: Limit upload size to 5 MB in API validation

3. **Rate Limiting**
   - **Symptom**: Users get 429 errors during peak usage
   - **Root Cause**: No rate limiting configured yet
   - **Fix**: Implement simple rate limiting (Phase 3)
   - **Prevention**: Not critical at 50-100 users

**Cost at 50-100 users**:
- Vercel: Hobby tier ($0) → likely need Pro tier ($20/month)

#### Embedding Bottlenecks

**MOST LIKELY to break**:

1. **OpenAI Rate Limits**
   - **Symptom**: 429 errors from OpenAI during batch uploads
   - **Root Cause**: Tier 1 rate limit = 200 RPM, 40k TPM
   - **Breaking Point**: ~15-20 transcripts uploaded simultaneously
   - **Fix**: Implement request queuing with retry logic
   - **Prevention**: Batch embeddings (embed multiple chunks per request)
   - **Upgrade Path**: OpenAI Tier 2 ($50/month spent) → 5k RPM, 450k TPM

2. **Embedding Cost**
   - **Symptom**: Unexpected OpenAI bills
   - **Assumptions**: 250 transcripts/week × 10 chunks/transcript = 2,500 chunks/week
   - **Cost Calculation**:
     - text-embedding-3-small = $0.02 / 1M tokens
     - Average chunk = 500 words ≈ 666 tokens
     - Weekly cost: (2,500 × 666 tokens) / 1M × $0.02 = **$0.03/week** = **$1.50/month**
   - **Breaking Point**: Not a cost concern at this scale
   - **Prevention**: Monitor usage, set budget alerts

**Cost at 50-100 users**:
- OpenAI embeddings: **~$2/month**
- OpenAI GPT (Custom GPT queries): **~$10-20/month** (depends on query frequency)

#### Search Bottlenecks

**UNLIKELY to break**:

1. **IVFFlat Index Build Time**
   - **Symptom**: Adding 1,000 new chunks takes > 30 seconds
   - **Root Cause**: Index rebuild on bulk insert
   - **Fix**: Use batch inserts, not individual INSERTs
   - **Prevention**: Already using batch inserts in embed.js

2. **Query Latency with Filters**
   - **Symptom**: Multi-filter queries (type + coach + org) are slow
   - **Root Cause**: No composite index for common filter combinations
   - **Fix**: Already mitigated (composite indexes in schema)
   - **Prevention**: Monitor slow queries

**Summary for 50-100 Users**:
- ✅ **Low Risk**: Database, API, search all scale fine
- ⚠️ **Medium Risk**: OpenAI rate limits during batch uploads
- 💰 **Cost**: ~$50-60/month total (Supabase Pro + Vercel Pro + OpenAI)

---

### Horizon 2: 100-1,000 Users (Growth Phase)

**Assumptions**:
- 200 coaches, 800 clients
- ~1,000 transcripts/week
- Data volume: ~500k chunks after 1 year

#### Database Bottlenecks

**LIKELY to break without intervention**:

1. **Vector Search Degradation**
   - **Symptom**: Queries > 5 seconds with 500k chunks
   - **Root Cause**: IVFFlat index doesn't scale well > 100k vectors
   - **Breaking Point**: ~300k-500k vectors
   - **Fix Option 1**: Upgrade to pgvector HNSW index (better for large datasets)
     ```sql
     -- HNSW scales better but uses more memory
     CREATE INDEX idx_data_chunks_embedding_hnsw ON data_chunks
       USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
     ```
   - **Fix Option 2**: Partition data by coach or org, search within partition
   - **Fix Option 3**: Offload vector search to dedicated service (Pinecone, Weaviate)
   - **Prevention**: Monitor p95 latency, upgrade index before degradation

2. **Database Storage Limits**
   - **Symptom**: Approaching 8 GB limit (Supabase Pro tier)
   - **Assumptions**: 500k chunks × 666 tokens/chunk × 2 bytes/char ≈ **1 GB text**
   - **Embeddings**: 500k vectors × 1536 dimensions × 4 bytes/float = **3 GB**
   - **Total**: ~5 GB (safe margin on Pro tier)
   - **Breaking Point**: ~800k chunks (would need Team tier: $599/month)
   - **Fix**: Archive old data, implement data retention policy
   - **Prevention**: Monitor database size, set alerts at 6 GB

3. **Connection Pool Exhaustion (Critical)**
   - **Symptom**: Frequent connection errors during peak hours
   - **Root Cause**: 200 coaches × 5 requests/coach = 1,000 concurrent connections
   - **Supabase Pro**: 200 connections max
   - **Fix**: Use Supavisor connection pooler (10,000+ connections)
   - **Prevention**: Already using pooled connections (if configured)
   - **Upgrade Path**: Supabase Team tier (400 connections) if pooler insufficient

4. **Index Bloat**
   - **Symptom**: Queries slow despite indexes
   - **Root Cause**: Frequent updates/deletes cause index fragmentation
   - **Fix**: VACUUM and REINDEX monthly
   - **Prevention**: Automate maintenance via Supabase scheduled functions

#### API Bottlenecks

**LIKELY to break**:

1. **Vercel Function Concurrent Execution Limits**
   - **Symptom**: Requests queued, users see latency spikes
   - **Root Cause**: Vercel Pro = 100 concurrent executions/region
   - **Breaking Point**: 1,000 users × 10 requests/hour / 60 minutes ≈ **166 requests/min** = need 2-3 concurrent functions
   - **Fix**: Still safe on Pro tier at this scale
   - **Prevention**: Monitor concurrent execution metrics

2. **Cold Start Latency**
   - **Symptom**: First request after idle takes 3-5 seconds
   - **Root Cause**: Serverless function cold start
   - **Fix**: Vercel Pro has better cold start times (~300ms vs 1s)
   - **Alternative**: Keep functions warm with cron ping

3. **Response Payload Size**
   - **Symptom**: Slow responses for large result sets
   - **Root Cause**: Returning 50+ chunks in one response
   - **Fix**: Implement pagination, limit to 10-20 results
   - **Prevention**: Already limited to 10 results in search

**Cost at 100-1,000 users**:
- Vercel Pro: **$20/month** → may need Team tier (**$100/month**) for better monitoring

#### Embedding Bottlenecks

**WILL break without intervention**:

1. **OpenAI Rate Limits (Critical)**
   - **Symptom**: Consistent 429 errors during business hours
   - **Root Cause**: 1,000 transcripts/week = 200 transcripts/day = **~8-10 transcripts/hour**
   - **Peak Load**: Assume 50 transcripts uploaded in 1 hour (Monday morning) = **500 chunks**
   - **Tier 1 Limits**: 200 RPM, 40k TPM
   - **Breaking Point**: 500 chunks × 1 request each = 500 RPM → **EXCEEDS TIER 1**
   - **Fix Option 1**: Upgrade to Tier 2 (5k RPM) via $50/month spend
   - **Fix Option 2**: Batch embed requests (embed 10 chunks per API call)
   - **Fix Option 3**: Implement queue with rate limiting
   - **Prevention**: Implement #2 + #3 proactively

2. **Embedding Cost Scaling**
   - **Weekly Volume**: 1,000 transcripts × 10 chunks = 10k chunks
   - **Cost**: (10k × 666 tokens) / 1M × $0.02 = **$0.13/week** = **$7/month**
   - **Breaking Point**: Not a concern (linear scaling)
   - **Prevention**: Set budget alerts

**Cost at 100-1,000 users**:
- OpenAI embeddings: **~$10/month**
- OpenAI GPT queries: **~$50-100/month**

#### Search Bottlenecks

**LIKELY to break**:

1. **Vector Index Memory Usage**
   - **Symptom**: Out of memory errors during index build
   - **Root Cause**: HNSW index requires significant RAM
   - **Estimate**: 500k vectors × 1536 dims × 4 bytes = 3 GB + index overhead ≈ **5-6 GB**
   - **Supabase Pro**: 8 GB RAM
   - **Breaking Point**: ~500k chunks (would need Team tier: 16 GB RAM)
   - **Fix**: Optimize index parameters (reduce `m`, `ef_construction`)
   - **Alternative**: Partition search by coach/org

2. **Multi-Filter Query Performance**
   - **Symptom**: Queries with 3+ filters take > 5 seconds
   - **Root Cause**: Index not optimized for complex WHERE clauses
   - **Fix**: Add materialized views for common filter patterns
   - **Prevention**: Monitor slow query log

**Summary for 100-1,000 Users**:
- ⚠️ **High Risk**: Vector search performance, OpenAI rate limits
- 🔧 **Required Upgrades**:
  - Upgrade to HNSW index or partition data
  - Implement embedding request queue
  - Upgrade to OpenAI Tier 2
- 💰 **Cost**: ~$200-300/month (Supabase Pro $25 + Vercel Team $100 + OpenAI $100-150)

---

### Horizon 3: 1,000-100,000 Users (Enterprise Scale)

**Assumptions**:
- 10,000 coaches, 90,000 clients
- ~50,000 transcripts/week
- Data volume: **25M chunks** after 1 year

#### Database Bottlenecks

**WILL BREAK - Fundamental Architecture Changes Needed**:

1. **PostgreSQL Storage Limits**
   - **Data Size**: 25M chunks × 1 KB/chunk = **25 GB text** + **150 GB embeddings** = **175 GB**
   - **Supabase Team**: 8 GB included (would cost **$1,000+/month** for 175 GB overage)
   - **Breaking Point**: Database storage becomes prohibitively expensive
   - **Fix**: **Offload vector embeddings to specialized vector database**
     - Option A: Pinecone (managed vector DB) → $70/month per pod, need ~5 pods = **$350/month**
     - Option B: Weaviate (self-hosted) → $200-500/month on AWS
     - Option C: Qdrant (open-source) → $300-600/month managed
   - **Architecture Change**:
     ```
     Supabase (metadata, user tables, relationships)
       ↓
     Separate Vector DB (embeddings only)
       ↓
     Search: Query vector DB → Get data_item_ids → Fetch metadata from Supabase
     ```

2. **Vector Search Performance Collapse**
   - **Symptom**: Queries take 30+ seconds with 25M vectors
   - **Root Cause**: pgvector not designed for this scale
   - **Breaking Point**: ~1-2M vectors (well before 25M)
   - **Fix**: **Must migrate to dedicated vector database**
   - **Prevention**: Plan migration at 500k-1M vector mark

3. **Connection Pool Saturation**
   - **Symptom**: Constant connection errors
   - **Root Cause**: 10,000 concurrent users × variable connection usage
   - **Fix**: Implement connection pooling middleware (PgBouncer in transaction mode)
   - **Upgrade Path**: Self-hosted PostgreSQL with tuned connection limits

4. **Index Maintenance Downtime**
   - **Symptom**: REINDEX takes hours, blocks writes
   - **Root Cause**: 25M row indexes take significant time to rebuild
   - **Fix**: Implement zero-downtime index rebuilds (CREATE INDEX CONCURRENTLY)
   - **Prevention**: Automate with monitoring alerts

#### API Bottlenecks

**WILL BREAK - Need Architectural Changes**:

1. **Vercel Serverless Limits**
   - **Symptom**: Requests queued, 504 gateway timeouts
   - **Root Cause**: Vercel Team = 1,000 concurrent executions
   - **Peak Load**: 10,000 users × 10 requests/hour / 60 = **1,666 requests/min**
   - **Breaking Point**: Exceed Vercel's concurrency limits
   - **Fix**: **Migrate to dedicated infrastructure**
     - Option A: AWS Lambda + API Gateway (higher limits)
     - Option B: Kubernetes cluster (full control)
     - Option C: Hybrid (Vercel frontend + AWS backend)

2. **API Rate Limiting Required**
   - **Symptom**: Abuse/spam causes service degradation
   - **Root Cause**: No rate limiting implemented
   - **Fix**: Implement per-user rate limits (Redis + Upstash)
   - **Prevention**: Add to Phase 3 requirements

3. **Response Time SLA Violations**
   - **Symptom**: p95 latency > 10 seconds
   - **Root Cause**: Synchronous embedding + search
   - **Fix**: Implement async job queue (BullMQ + Redis)
   - **Architecture**:
     ```
     Upload → Queue job → Return job_id
     User polls /api/jobs/{id} for status
     ```

#### Embedding Bottlenecks

**WILL BREAK - Cost & Rate Limits**:

1. **OpenAI Rate Limits (Catastrophic)**
   - **Weekly Volume**: 50k transcripts × 10 chunks = **500k chunks/week**
   - **Peak Hour**: Assume 10,000 uploads/hour = **100k chunks/hour** = **1,666 chunks/min**
   - **Tier 2 Limits**: 5k RPM, 450k TPM
   - **Breaking Point**: **Far exceeds Tier 2**, even with batching
   - **Fix**: **Use OpenAI Batch API** (50% cost reduction, asynchronous)
     - Upload chunks in batches of 50,000
     - Process overnight (24-hour SLA)
     - Requires async upload workflow
   - **Alternative**: Fine-tune smaller model, self-host embeddings

2. **Embedding Cost Explosion**
   - **Monthly Volume**: 500k chunks/week × 4 weeks = **2M chunks/month**
   - **Cost**: (2M × 666 tokens) / 1M × $0.02 = **$27/month** (embeddings)
   - **GPT Queries**: 100k users × 10 queries/month × $0.01/query = **$10,000/month**
   - **Breaking Point**: Custom GPT queries become dominant cost
   - **Fix**: Implement caching, query deduplication, result reuse
   - **Prevention**: Monitor cost per user, set alerts

**Cost at 1,000-100,000 users**:
- OpenAI embeddings: **~$50/month**
- OpenAI GPT queries: **~$10,000-15,000/month** 🚨

#### Search Bottlenecks

**WILL BREAK - Must Use Specialized Vector DB**:

1. **Query Performance**
   - **Symptom**: All queries > 10 seconds
   - **Root Cause**: PostgreSQL not optimized for billion-scale vector search
   - **Fix**: **Migrate to Pinecone/Weaviate/Qdrant**
   - **Expected Performance**:
     - Pinecone: <100ms for 25M vectors
     - Weaviate: <200ms with tuning
     - Qdrant: <150ms with quantization

2. **Index Build Time**
   - **Symptom**: Adding 100k new vectors takes hours
   - **Root Cause**: HNSW index rebuild
   - **Fix**: Dedicated vector DB handles incremental index updates efficiently

#### Cost Scaling

**Total Infrastructure Cost at 100,000 Users**:

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| **Database** | $500-1,000 | Supabase Team or self-hosted PostgreSQL |
| **Vector DB** | $300-500 | Pinecone/Weaviate/Qdrant managed |
| **Compute** | $500-1,000 | AWS Lambda or Kubernetes cluster |
| **OpenAI Embeddings** | $50-100 | Batch API reduces cost |
| **OpenAI GPT Queries** | $10,000-15,000 | Dominant cost driver 🚨 |
| **Redis/Caching** | $50-100 | Upstash or ElastiCache |
| **Monitoring** | $100-200 | Datadog/New Relic |
| **TOTAL** | **$11,500-17,000/month** | |

**Cost Optimization Strategies**:
1. **Implement aggressive caching** (reduce duplicate GPT queries by 50%)
2. **Use OpenAI Batch API** (50% cost reduction on embeddings)
3. **Self-host embedding model** (one-time cost, eliminates API fees)
4. **Tier-based access** (limit query volume for free users)

#### Required Architectural Changes

**Cannot reach 100k users without these changes**:

1. ✅ **Migrate embeddings to dedicated vector database** (Pinecone/Weaviate/Qdrant)
2. ✅ **Implement async job queue** for uploads (BullMQ + Redis)
3. ✅ **Add caching layer** for frequent queries (Redis/Upstash)
4. ✅ **Migrate to dedicated infrastructure** (AWS/GCP, not serverless)
5. ✅ **Implement robust rate limiting** (per-user, per-org)
6. ✅ **Database sharding** or **read replicas** for metadata queries
7. ✅ **CDN for static assets** and API responses
8. ✅ **Multi-region deployment** for global latency

**Summary for 1,000-100,000 Users**:
- 🚨 **Critical**: Current architecture fundamentally cannot scale
- 🔧 **Required**: Major re-architecture (dedicated vector DB, async workflows, caching)
- 💰 **Cost**: $11k-17k/month (GPT query costs dominate)
- ⏱️ **Timeline**: 3-6 months of engineering work to re-architect

---

## Scalability Recommendations by Phase

### Phase 2 (Current): Build for Horizon 1 (50-100 users)
- ✅ Use pgvector with IVFFlat index
- ✅ Stay on Supabase Pro + Vercel Pro
- ✅ Implement basic error handling for OpenAI rate limits
- ⚠️ Monitor vector search latency, set alerts at 2s

### Phase 3: Prepare for Horizon 2 (100-1,000 users)
- 🔧 Upgrade to HNSW index when reaching 100k chunks
- 🔧 Implement embedding request queue with batching
- 🔧 Add database connection pooling (Supavisor)
- 🔧 Implement basic caching for frequent queries
- 📊 Set up comprehensive monitoring (query latency, costs, errors)

### Phase 4-5: Re-architect for Horizon 3 (1,000-100,000 users)
- 🏗️ Migrate to dedicated vector database (Pinecone/Weaviate)
- 🏗️ Implement async job queue for all background processing
- 🏗️ Add Redis caching layer
- 🏗️ Migrate from serverless to dedicated infrastructure
- 🏗️ Implement multi-tenant isolation (RLS + org partitioning)
- 💰 Negotiate OpenAI enterprise pricing or self-host embeddings

---

## Appendix: Example Data for Testing

### Sample Transcript
```
Coach: What's been on your mind this week?

Client: I've been struggling with giving feedback to my team. Specifically, one of my engineers isn't meeting deadlines, and I've avoided addressing it because I don't want to come across as too harsh.

Coach: What makes you think you'd be too harsh?

Client: I know from my DISC assessment that I'm high D - I tend to be direct and results-oriented. I'm worried I'll demotivate them.

Coach: If you could give feedback in a way that feels aligned with who you are AND motivating, what would that look like?

Client: Hmm... I think it's about being clear on expectations but also curious about what's getting in their way. Not assuming they're lazy.

Coach: That sounds like a powerful shift. What's one way you could test that approach this week?

Client: I could schedule a 1-on-1 and start by asking what challenges they're facing with the project, rather than leading with my frustration.

Coach: Love it. Let's check in next week on how that conversation goes.
```

### Sample Assessment
```
DISC Assessment Results for Client

Assessment Date: September 15, 2025
Assessor: Coach A

Profile Scores:
- Dominance (D): 85 - High
- Influence (I): 60 - Moderate
- Steadiness (S): 40 - Low
- Conscientiousness (C): 70 - High

Profile Summary: High D/C

Interpretation:
You have a High D (Dominance) / High C (Conscientiousness) profile, which indicates:

Strengths:
- Results-oriented and goal-focused
- Analytical and detail-oriented
- Efficient decision-maker
- High standards for yourself and others
- Values accuracy and thoroughness

Challenges:
- May come across as blunt or overly direct
- Can be impatient with processes or people who move slowly
- May struggle with delegation (prefer to do it yourself to ensure quality)
- Can be perceived as critical or demanding
- May need to work on empathy and relationship-building

Leadership Development Focus:
- Practice patience and active listening
- Soften communication style when giving feedback
- Delegate more and trust team members
- Balance task focus with people focus
- Ask more questions, give fewer directives
```

### Sample Coaching Model
```
My Theory of Change: Facilitating Insight Through Powerful Questions

Version 2.0
Last Updated: October 1, 2025

Core Philosophy:
I believe that clients have their own answers. My role as a coach is not to provide solutions but to facilitate the client's own insight and discovery. Transformation happens when clients connect their own dots, not when I connect them.

Key Principles:

1. Trust the Client's Wisdom
   - Clients are the experts on their own lives
   - Resist the urge to fix or advise
   - Ask "What do you think?" before sharing my perspective

2. Ask Powerful Questions
   - Questions that provoke thought, not yes/no answers
   - "What would it look like if...?"
   - "What's getting in the way of...?"
   - "If you could wave a magic wand...?"

3. Challenge Assumptions with Curiosity
   - When client says "I can't...", ask "What makes you say that?"
   - When client says "They should...", ask "What would happen if they didn't?"
   - Surface limiting beliefs through inquiry, not confrontation

4. Create Space for Reflection
   - Comfortable with silence
   - Don't rush to fill gaps
   - Allow client to think deeply

5. Hold Accountability
   - Client commits to actions
   - Follow up on commitments
   - Explore what got in the way if not completed

Evaluation Criteria:
I evaluate my coaching effectiveness by:
- Did I ask more than I told?
- Did the client have their own insights?
- Did I challenge assumptions without being confrontational?
- Did I create space for reflection?
- Did I hold the client accountable to their commitments?

When I'm at my best:
- Client says "I never thought of it that way"
- Client identifies their own next steps
- Client feels empowered, not dependent on my wisdom
```

### Sample Company Doc
```
Acme Media - Q4 2025 OKRs
Engineering Department

Objective 1: Scale Platform to Support 10M Active Users
Key Results:
- KR1: Reduce API latency from 250ms to <100ms (99th percentile)
- KR2: Achieve 99.9% uptime (currently 99.5%)
- KR3: Scale database to handle 10K queries/second

Owner: VP Engineering
Status: In Progress (60% complete)

Objective 2: Improve Developer Productivity
Key Results:
- KR1: Reduce deploy time from 15 minutes to <5 minutes
- KR2: Increase automated test coverage from 60% to 80%
- KR3: Reduce bug escape rate to production by 30%

Owner: Engineering Manager
Status: In Progress (40% complete)

Objective 3: Enhance Security Posture
Key Results:
- KR1: Complete SOC 2 Type II certification by Dec 31
- KR2: Implement zero-trust architecture across all services
- KR3: Conduct quarterly penetration tests with no critical findings

Owner: Security Lead
Status: On Track (75% complete)

Strategic Context:
These OKRs support Acme Media's company-wide goal of becoming the market leader in digital media distribution. The scaling objective addresses our recent influx of enterprise customers. The productivity objective enables faster feature delivery to compete with emerging competitors. The security objective is critical for landing Fortune 500 clients who require SOC 2 compliance.

Leadership Team Priorities:
- Scaling is #1 priority (customer experience cannot degrade)
- Security is table stakes (blocks big deals)
- Productivity improvements will pay dividends in 2026
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-10 | Initial creation | Claude (via user requirements gathering) |
