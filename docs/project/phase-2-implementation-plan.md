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

### Supporting Tables (Phase 3)

**Phase 3 will add**:
- `organizations` table (InsideOut + external orgs)
- `clients` table (with org relationships)
- `coaches` table (InsideOut employees)
- `users` table (authentication)

**For Phase 2**: These relationships are tracked via UUIDs in `data_items`, but no foreign key constraints yet.

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

**Goal**: Migrate existing Phase 1 schema to unified Phase 2 schema without data loss.

### Tasks

#### Task 1: Create Migration SQL Scripts

**File**: `scripts/migrations/002_multi_type_schema.sql`

**Steps**:
1. Create new `data_items` table
2. Create new `data_chunks` table
3. Migrate existing `transcripts` → `data_items` with `data_type = 'transcript'`
4. Migrate existing `transcript_chunks` → `data_chunks`
5. Add indexes
6. Create RPC function for multi-type vector search
7. Drop old tables (after validation)

**Migration Script Outline**:
```sql
-- Step 1: Create new tables
CREATE TABLE data_items (...);
CREATE TABLE data_chunks (...);

-- Step 2: Migrate data
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
