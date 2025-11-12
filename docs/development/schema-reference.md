# Database Schema Reference

**Purpose**: Comprehensive reference for the actual database schema structure

**Last Updated**: 2025-11-12

**Architecture Pattern**: Slug + JSONB Metadata

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [User & Organization Tables](#user--organization-tables)
3. [Data Storage Tables](#data-storage-tables)
4. [JSONB Metadata Conventions](#jsonb-metadata-conventions)
5. [Indexes](#indexes)
6. [Query Patterns](#query-patterns)

---

## Architecture Overview

### Design Philosophy

The schema uses a **hybrid approach**:
- **Required/frequently-queried fields**: Regular columns with indexes
- **Optional/flexible fields**: JSONB `metadata` with GIN indexes
- **URL-friendly references**: `slug` columns for clean paths

### Benefits

1. **Schema flexibility** - Add fields without migrations
2. **Performance** - Core fields indexed traditionally, JSONB fields indexed with GIN
3. **Type safety** - Application layer enforces metadata structure
4. **Clean queries** - Simple FK relationships, no deep joins

---

## User & Organization Tables

### `coaching_companies`

**Purpose**: Coaching organizations (e.g., InsideOut Leadership)

**Schema**:
```sql
CREATE TABLE coaching_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Columns**:
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `name` | TEXT | Yes | Company name (e.g., "InsideOut Leadership") |
| `slug` | TEXT | Yes | URL-friendly identifier (e.g., "insideout-leadership") |
| `metadata` | JSONB | No | Optional fields (see below) |
| `created_at` | TIMESTAMP | Yes | Record creation time |
| `updated_at` | TIMESTAMP | Yes | Last update time |

**Metadata Schema**:
```json
{
  "website": "https://insideoutdev.com",
  "active": true,
  "logo_url": "https://...",
  "contact_email": "info@insideoutdev.com"
}
```

**Example Query**:
```sql
-- Get active coaching companies
SELECT * FROM coaching_companies
WHERE metadata->>'active' = 'true';

-- Get company by slug
SELECT * FROM coaching_companies
WHERE slug = 'insideout-leadership';
```

---

### `coaches`

**Purpose**: Individual coaches employed by coaching companies

**Schema**:
```sql
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_company_id UUID NOT NULL REFERENCES coaching_companies(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Columns**:
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `coaching_company_id` | UUID | Yes | FK to coaching company |
| `email` | TEXT | Yes | Coach email (unique) |
| `name` | TEXT | Yes | Full name |
| `bio` | TEXT | No | Professional bio |
| `metadata` | JSONB | No | Optional fields |

**Metadata Schema**:
```json
{
  "active": true,
  "experience_years": 15,
  "specializations": ["C-suite", "organizational transformation"],
  "certifications": ["ICF-PCC", "DISC"],
  "timezone": "America/Los_Angeles"
}
```

**Example Queries**:
```sql
-- Get active coaches with 10+ years experience
SELECT * FROM coaches
WHERE metadata->>'active' = 'true'
  AND (metadata->>'experience_years')::int >= 10;

-- Get coaches by company
SELECT c.* FROM coaches c
JOIN coaching_companies cc ON c.coaching_company_id = cc.id
WHERE cc.slug = 'insideout-leadership';
```

---

### `client_organizations`

**Purpose**: External organizations that receive coaching services

**Schema**:
```sql
CREATE TABLE client_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Columns**:
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `name` | TEXT | Yes | Organization name |
| `slug` | TEXT | Yes | URL-friendly identifier |
| `industry` | TEXT | No | Industry category |
| `metadata` | JSONB | No | Optional fields |

**Metadata Schema**:
```json
{
  "size": "mid-market",
  "active": true,
  "employee_count": 250,
  "headquarters": "San Francisco, CA",
  "website": "https://acmemedia.com"
}
```

**Common Values**:
- `size`: "startup", "mid-market", "enterprise"

**Example Queries**:
```sql
-- Get enterprise clients in tech industry
SELECT * FROM client_organizations
WHERE industry = 'Technology'
  AND metadata->>'size' = 'enterprise';

-- Get active client orgs
SELECT * FROM client_organizations
WHERE metadata->>'active' = 'true';
```

---

### `clients`

**Purpose**: Individual executives/leaders being coached

**Schema**:
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_organization_id UUID NOT NULL REFERENCES client_organizations(id),
  primary_coach_id UUID REFERENCES coaches(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Columns**:
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `client_organization_id` | UUID | Yes | FK to client org |
| `primary_coach_id` | UUID | No | FK to primary coach |
| `email` | TEXT | Yes | Client email (unique) |
| `name` | TEXT | Yes | Full name |
| `title` | TEXT | No | Job title |
| `metadata` | JSONB | No | Optional fields |

**Metadata Schema**:
```json
{
  "department": "Product",
  "active": true,
  "start_date": "2025-01-15",
  "goals": ["leadership presence", "strategic thinking"],
  "timezone": "America/New_York"
}
```

**Example Queries**:
```sql
-- Get clients by coach
SELECT c.* FROM clients c
WHERE c.primary_coach_id = 'coach-uuid-here';

-- Get clients by organization and department
SELECT c.* FROM clients c
WHERE c.client_organization_id = 'org-uuid-here'
  AND c.metadata->>'department' = 'Engineering';

-- Get active clients with their coach and org
SELECT
  c.name as client_name,
  c.title,
  coach.name as coach_name,
  org.name as org_name
FROM clients c
JOIN coaches coach ON c.primary_coach_id = coach.id
JOIN client_organizations org ON c.client_organization_id = org.id
WHERE c.metadata->>'active' = 'true';
```

---

### `coaching_models`

**Purpose**: Coaching frameworks and methodologies

**Schema**:
```sql
CREATE TABLE coaching_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_company_id UUID NOT NULL REFERENCES coaching_companies(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Columns**:
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `coaching_company_id` | UUID | Yes | FK to coaching company |
| `name` | TEXT | Yes | Model name |
| `slug` | TEXT | Yes | URL-friendly identifier |
| `description` | TEXT | No | Short description |
| `content` | TEXT | Yes | Full model content |
| `metadata` | JSONB | No | Optional fields |

**Metadata Schema**:
```json
{
  "version": "2.0",
  "model_type": "framework",
  "active": true,
  "author": "InsideOut Leadership",
  "tags": ["leadership", "adaptive", "systems-thinking"]
}
```

---

### `coach_model_associations`

**Purpose**: Link coaches to the models they use

**Schema**:
```sql
CREATE TABLE coach_model_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id),
  coaching_model_id UUID NOT NULL REFERENCES coaching_models(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(coach_id, coaching_model_id)
);
```

---

## Data Storage Tables

### `data_items`

**Purpose**: Unified storage for all data types (transcripts, assessments, models, docs)

**Schema**:
```sql
CREATE TABLE data_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,

  -- Ownership hierarchy
  coach_id UUID REFERENCES coaches(id),
  client_id UUID REFERENCES clients(id),
  client_organization_id UUID REFERENCES client_organizations(id),

  -- Access control
  visibility_level TEXT DEFAULT 'private',

  -- Content
  raw_content TEXT,
  metadata JSONB,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Data Types**:
- `transcript` - Coaching session transcripts
- `assessment` - Client assessments (DISC, MBTI, etc.)
- `coaching_model` - Coaching frameworks (also in `coaching_models` table)
- `company_doc` - Client org documents (OKRs, org charts, etc.)

**Visibility Levels**:
- `private` - Only creator can access
- `coach_only` - Coach and creator can access
- `org_visible` - Visible to org members
- `public` - Publicly accessible

---

### `data_chunks`

**Purpose**: Chunked, embedded content for semantic search

**Schema**:
```sql
CREATE TABLE data_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_item_id, chunk_index)
);
```

---

## JSONB Metadata Conventions

### Naming Conventions

- Use `snake_case` for keys
- Use descriptive names (e.g., `experience_years` not `exp`)
- Boolean values as JSON booleans (`true`/`false`)
- Dates as ISO 8601 strings (`"2025-01-15"`)
- Arrays for lists (`["tag1", "tag2"]`)

### Common Keys Across Tables

| Key | Type | Description | Example |
|-----|------|-------------|---------|
| `active` | boolean | Whether record is active | `true` |
| `tags` | array | Classification tags | `["leadership", "coaching"]` |
| `created_by_user_id` | string | User who created (Phase 3) | `"user-uuid"` |

### Table-Specific Keys

**coaches.metadata**:
- `experience_years` (number) - Years of coaching experience
- `specializations` (array) - Areas of expertise
- `certifications` (array) - Professional certifications
- `timezone` (string) - Coach's timezone

**clients.metadata**:
- `department` (string) - Department within org
- `start_date` (string) - Coaching start date
- `goals` (array) - Coaching goals

**client_organizations.metadata**:
- `size` (string) - Company size category
- `employee_count` (number) - Number of employees
- `headquarters` (string) - Location

---

## Indexes

### Standard Indexes

```sql
-- Primary keys (automatic)
-- Unique constraints on slugs and emails (automatic)

-- Foreign keys
CREATE INDEX idx_coaches_company ON coaches(coaching_company_id);
CREATE INDEX idx_clients_org ON clients(client_organization_id);
CREATE INDEX idx_clients_coach ON clients(primary_coach_id);
```

### JSONB GIN Indexes

**Purpose**: Optimize queries on JSONB metadata fields

```sql
-- Coaches
CREATE INDEX idx_coaches_metadata_active ON coaches
  USING GIN ((metadata -> 'active'));
CREATE INDEX idx_coaches_metadata_experience ON coaches
  USING GIN ((metadata -> 'experience_years'));

-- Client Organizations
CREATE INDEX idx_orgs_metadata_size ON client_organizations
  USING GIN ((metadata -> 'size'));
CREATE INDEX idx_orgs_metadata_active ON client_organizations
  USING GIN ((metadata -> 'active'));

-- Clients
CREATE INDEX idx_clients_metadata_department ON clients
  USING GIN ((metadata -> 'department'));
CREATE INDEX idx_clients_metadata_active ON clients
  USING GIN ((metadata -> 'active'));
```

### Data Storage Indexes

```sql
-- data_items
CREATE INDEX idx_data_items_type ON data_items(data_type);
CREATE INDEX idx_data_items_coach ON data_items(coach_id);
CREATE INDEX idx_data_items_client ON data_items(client_id);
CREATE INDEX idx_data_items_org ON data_items(client_organization_id);
CREATE INDEX idx_data_items_created_at ON data_items(created_at DESC);

-- Composite indexes for common patterns
CREATE INDEX idx_data_items_coach_type ON data_items(coach_id, data_type);
CREATE INDEX idx_data_items_org_type ON data_items(client_organization_id, data_type);

-- data_chunks (for vector search)
CREATE INDEX idx_data_chunks_item ON data_chunks(data_item_id);
CREATE INDEX idx_data_chunks_embedding ON data_chunks
  USING ivfflat (embedding vector_cosine_ops);
```

---

## Query Patterns

### Filtering by JSONB Fields

**Pattern**: Use `->` for JSON objects, `->>` for text values

```sql
-- Get active coaches
SELECT * FROM coaches
WHERE metadata->>'active' = 'true';

-- Get senior coaches (10+ years)
SELECT * FROM coaches
WHERE (metadata->>'experience_years')::int >= 10;

-- Get enterprise clients
SELECT co.* FROM client_organizations co
WHERE co.metadata->>'size' = 'enterprise';

-- Get clients in Engineering department
SELECT c.* FROM clients c
WHERE c.metadata->>'department' = 'Engineering';
```

### Combining JSONB with Regular Columns

```sql
-- Get active coaches at InsideOut
SELECT c.* FROM coaches c
JOIN coaching_companies cc ON c.coaching_company_id = cc.id
WHERE cc.slug = 'insideout-leadership'
  AND c.metadata->>'active' = 'true';

-- Get assessments for active clients
SELECT di.* FROM data_items di
JOIN clients cl ON di.client_id = cl.id
WHERE di.data_type = 'assessment'
  AND cl.metadata->>'active' = 'true';
```

### Handling NULL/Missing Metadata Keys

```sql
-- Use COALESCE for defaults
SELECT
  name,
  COALESCE(metadata->>'active', 'true')::boolean as active,
  COALESCE((metadata->>'experience_years')::int, 0) as experience_years
FROM coaches;

-- Check if key exists
SELECT * FROM coaches
WHERE metadata ? 'experience_years';

-- Check if key is missing
SELECT * FROM coaches
WHERE NOT (metadata ? 'certifications');
```

### Complex JSONB Queries

```sql
-- Get coaches with specific specializations (array contains)
SELECT * FROM coaches
WHERE metadata->'specializations' @> '["C-suite"]'::jsonb;

-- Get coaches with any certifications
SELECT * FROM coaches
WHERE jsonb_array_length(metadata->'certifications') > 0;

-- Update JSONB field
UPDATE coaches
SET metadata = metadata || '{"timezone": "America/New_York"}'::jsonb
WHERE id = 'coach-uuid-here';
```

### Performance Tips

1. **Use GIN indexes** for frequently-queried JSONB keys
2. **Cast types explicitly** when using JSONB numeric/boolean values
3. **Use `->` for JSON extraction** when staying in JSON, `->>` for text
4. **Index expressions** match your WHERE clauses exactly

---

## Migration Strategy

### Adding New JSONB Keys

**No migration needed** - just start writing new keys:

```sql
-- Add new field to existing records
UPDATE coaches
SET metadata = metadata || '{"primary_model_id": "model-uuid"}'::jsonb
WHERE id = 'coach-uuid';
```

### Backfilling Data

```sql
-- Set default value for missing keys
UPDATE coaches
SET metadata = metadata || '{"active": true}'::jsonb
WHERE NOT (metadata ? 'active');
```

### Promoting JSONB Field to Column

If a JSONB field becomes heavily used and needs better performance:

```sql
-- 1. Add new column
ALTER TABLE coaches ADD COLUMN active BOOLEAN;

-- 2. Backfill from JSONB
UPDATE coaches SET active = (metadata->>'active')::boolean;

-- 3. Set default
ALTER TABLE coaches ALTER COLUMN active SET DEFAULT true;

-- 4. (Optional) Remove from JSONB
UPDATE coaches SET metadata = metadata - 'active';
```

---

## Best Practices

### DO:
✅ Use JSONB for optional/flexible fields
✅ Index frequently-queried JSONB keys with GIN indexes
✅ Use slugs for URL-friendly references
✅ Cast JSONB values to proper types in queries
✅ Use COALESCE for default values

### DON'T:
❌ Store critical business logic in JSONB without validation
❌ Use JSONB for high-cardinality foreign keys
❌ Forget to index JSONB fields you query frequently
❌ Mix data types in the same JSONB key across records
❌ Store large binary data in JSONB

---

## See Also

- [Phase 2 Implementation Plan](../project/phase-2-implementation-plan.md) - Overall architecture
- [Schema Validation Audit](../checkpoints/schema-validation-audit.md) - Compatibility analysis
- [API Documentation](./api-reference.md) - API endpoints and usage

---

**Last Updated**: 2025-11-12

**Version**: 1.0.0 (Phase 2, Post-Checkpoint 5b)
