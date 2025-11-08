## Vision

A unified data layer that ingests, processes, and serves multiple data types (transcripts, assessments, personality profiles, etc.) through AI-powered interfaces, with security and privacy built into the core architecture.

## Scope

This project is broken into phases.

1. **Phase 1 - Storing Transcripts in an LLM-retrieval ready form.**
    1. Basic storage tables and a processing pipeline that will make the data ready to be read and used by LLMs when prompting them.
2. **Phase 2 - Same as Phase 1 for data other than Transcripts**
    1. Assessments, personality profiles, company information/OKRs, etc.
3. **Phase 3 - Adding a Personal Identifiable Information scrubbing process**
    1. This will anonymize transcripts and other sensitive data, while tagging that data in a way that it can still be connected with the correct clients and coaches.
4. **Phase 4 - AI Platform Integration Layer**
    1. Creating a way to connect Claude and/or Custom GPTs to the database, likely with an MCP server for ease of setup.
5. **Phase 5 - Data Source Integration**
    1. Create an automatic transcript saving pipeline from [Fireflies.ai](http://Fireflies.ai) and lay groundwork for other data sources
6. **Phase 6 - Deploy + Optimize for Production**
    1. This will move the project from a local development environment (my computer) to a hosted service (Vercel) with optimizations for performance and security. This allows the data layer to be accessed from any application with correct credentials.

### Additional Phases

All phases shown beyond Phase 6 are outside of scope for the initial build, but outline future feature possibilities, should they prove valuable.

## Current Status: MVP Complete ✅

- Semantic search with vector embeddings
- RAG-based conversational Q&A
- REST API with demo interface
- Multi-client transcript storage and upload (text & PDF)

---

## Phase 1: Transcript Foundation

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

The first step is setting up the database and an API (Application Programming Interface) that allows us to make REQUESTS to the database (adding and retrieving data). 

In order for the database to be optimized for use with an LLM, we add a processing sequence that allows data being added to the database to be CHUNKED (split into smaller parts) and EMBEDDED (taking each chunk and adding a number to them, called a vector, that allows LLMs to quickly examine data with a given prompt and predict what chunks of data will be most relevant to that prompt). 

Basically, it makes data that an LLM is NOT trained on readable to that LLM in ways that allow the data to be useful.

Semantic search means we can take that data and AUGMENT an LLM’s existing training data when prompting. For example, the latest GPT model is NOT trained on our client transcripts, but adding a semantic search to our own API allows us to send prompts to the latest GPT model in a way that allows that GPT to reference the transcripts when generating output.

</aside>

### 1.1 Transcript Upload System

- **Status**: In Progress
- **Goal**: Enable easy upload of multiple transcripts
- **Implementation**:
    - POST `/api/transcripts/upload` endpoint
    - POST `/api/transcripts/upload-pdf` endpoint for PDF transcripts
    - Automatic chunking and embedding generation
    - **NEEDED Support for better metadata (date, participants, etc.), search across multiple data fields**
    - Multi-client support via coach_id and client_id

### 1.2 Semantic Search & RAG

- **Status**: In Progress
- **Goal**: Enable semantic search and conversational Q&A
- **Implementation**:
    - Vector similarity search with configurable thresholds
    - RAG-based question answering with temporal context
    - Source attribution with meeting dates
    - Demo UI for testing

**Key Learning**: Transcripts are the **first data type**, not the only one. The architecture needs to support multiple data types.

<aside>
⚠️

Need to add logging to the system to track OpenAPI usage so we can gauge how scaling users will impact it. 

</aside>

---

## Phase 2: Data Type Framework & Architecture

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

Transcripts will always be tied to a coach and client, with some other information attached to them. Other types of data, like assessments, company info, coach notes, and others, will have other fields that need to be attached to them that may not match what is needed for transcripts. This phase will involve designing the database in such a way that all of the necessary data is captured, while optimizing for QUERY PERFORMANCE - reducing the amount of time it takes between a prompt in the user interface and the data being retrieved, then sent back to the user interface. 

Poor data design results in sluggish performance, so time spent here can save a lot of headache and poor user experience.

</aside>

### Goal

Create an extensible architecture that can handle multiple data types beyond transcripts (assessments, personality profiles, notes, etc.) while maintaining unified search and retrieval capabilities.

### 2.1 Multi-Data-Type Schema Design

- **Status**: Planned (High Priority)
- **Goal**: Design database schema to support heterogeneous data types
- **Architecture Options**:

**Option A: Single Table with Type Discriminator** (Recommended for MVP)

```sql
data_items (
  id,
  data_type ENUM('transcript', 'assessment', 'personality_profile', 'note'),
  coach_id,
  client_id,
  created_at,
  metadata JSONB,  -- Flexible structure per data type  raw_content TEXT
)
data_chunks (
  id,
  data_item_id,
  content TEXT,
  embedding VECTOR,
  chunk_index INTEGER,
  metadata JSONB  -- Type-specific metadata)
```

**Option B: Abstract Base + Type-Specific Tables** (Future consideration)
- More structured but complex
- Better for highly specialized data types

### 2.2 Data Type Definitions

**Priority Data Types**:

1. **Transcripts** (In Progress)
    - Coaching session conversations
    - Already implemented
    - Metadata: meeting_date, participants, duration
2. **Assessment Results** 
    - Personality assessments (DISC, Myers-Briggs, Enneagram, etc.)
    - Skills assessments
    - 360-degree feedback
    - Metadata: assessment_type, score, date_taken, assessor
    - **Challenge**: Structured data + narrative interpretation
3. **Personality Profiles**
    - Custom personality content created for clients
    - Profile narratives and insights
    - Strengths/weaknesses documentation
    - Metadata: profile_type, dimensions, created_by
4. **Session Notes** 
    - Coach’s private notes about sessions
    - Action items and follow-ups
    - Observations and insights
    - **Security**: Coach-only, not shared with clients
5. **Goal Tracking**
    - Client goals and progress
    - Milestones and achievements
    - Temporal tracking
    - Metadata: goal_type, status, target_date
    - Company strategy documents (OKRs, KPIs, Cashflow, P&L, etc)
6. Company Info
    1. Organizational chart, OKRs, etc

### 2.3 Unified Processing Pipeline

- **Goal**: Single pipeline that handles all data types
- **Implementation**:
    
    ```
    Ingest → Type Detection → Type-Specific Processing →
    Chunking (adaptive by type) → Embedding → Storage → Indexing
    ```
    

### 2.4 Type-Aware Search & Retrieval

- Filters by data type (e.g., “search only assessments”)
- Combined search across types
- Type-specific result formatting
- Weighted relevance by recency and type

### 2.5 API Endpoints for New Data Types

```
POST /api/data/upload/{type}        # Generic upload
POST /api/assessments/upload        # Type-specific
POST /api/profiles/upload
GET  /api/data?type=assessment      # Filtered retrieval
POST /api/search?types[]=transcript&types[]=assessment
```

---

## Phase 3: Data Privacy & Security (Critical)

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

This phase involves creating the data protection elements of the system to make sure that only the people that SHOULD be able to access data can, with the correct credentials.

</aside>

### Goal

Build security and privacy into the architecture from the ground up. This is **essential before exposing the data layer to AI platforms** (Custom GPTs, Claude Projects) where data protection is paramount.

### 3.1 Universal PII Scrubbing Pipeline

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

This step will create a processing step when data is stored in the database to anonymize information in documents like transcripts. It will also make sure the information is tied to the correct coaches and/or clients so the data remains useful.

</aside>

- **Status**: Planned (High Priority)
- **Goal**: Automatically remove personally identifiable information across **all data types**
- **Architecture**:
    
    ```
    Upload (any type) → Type Detection → Type-Aware PII Detection →
    Redaction → Storage → Embedding Generation
    ```
    
- **Applies to**: Transcripts, assessments, profiles, notes, goals

### 3.2 PII Detection Strategy

**Categories to Scrub**:
- Names (people, organizations)
- Contact information (email, phone, address)
- Identification numbers (SSN, credit cards, IDs)
- Dates of birth
- Medical/health information
- Financial information
- Location data (specific addresses, GPS coordinates)

**Implementation Options**:
1. **Named Entity Recognition (NER)**
- Use spaCy or similar NLP library
- Custom-trained models for coaching context
- Real-time processing before database insertion

1. **LLM-Based Detection** (Recommended)
    - Use GPT-4 with specialized prompt for PII detection
    - More context-aware and accurate
    - Can handle nuanced cases
    - Example prompt:
        
        ```
        Identify and redact all personally identifiable information
        in this transcript. Replace with generic placeholders like
        [NAME], [EMAIL], [PHONE], [ADDRESS], etc.
        ```
        
2. **Hybrid Approach**
    - Fast regex/pattern matching for obvious PII (emails, phones)
    - NER for names and entities
    - LLM for final verification and edge cases

### 3.3 PII Scrubbing Workflow

```
┌─────────────────┐
│ Raw Transcript  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PII Detection   │ ← Pattern matching, NER, or LLM
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Redaction       │ ← Replace PII with placeholders
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in DB     │ ← Save scrubbed version
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │ ← Create embeddings from scrubbed text
│ Embeddings      │
└─────────────────┘
```

### 3.4 Data Access Controls

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

This happens in the database itself - essentially requiring credentials to access any data being stored. When the database is first created, you don’t need to have those types of credentials because it makes it easier to develop the software. We implement these controls in this step before moving any further.

</aside>

- **Status**: Planned (High Priority)
- **Goal**: Implement fine-grained access control across all data types
- **Implementation**:
    - Row-level security (RLS) in Supabase
    - Coach can only access their clients’ data
    - Clients can only access their own data (if client portal is built)
    - Admin roles for platform management
    - Audit logging for all data access

### 3.5 PII Mapping (Optional)

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

Likely not needed at first when this information is first being used, but in the case where a coach is trying to remember a specific name or piece of information that was mentioned in a conversation that has now been redacted (for example, COMPANY is what is currently readable in the database, but coach needs to know that it is BANK OF AMERICA). This step would allow us to create a separate data store with that information so you can “un-redact” some information as needed.

</aside>

- **Status**: Future Enhancement
- **Goal**: Maintain encrypted mapping for authorized un-redaction
- **Use Case**: Coach needs to reference actual names in secure context
- **Implementation**:
    - Encrypted key-value store
    - [NAME_1] → Encrypted(“John Smith”)
    - Only accessible with proper authentication
    - Separate from main transcript database

### 3.6 Secure API Keys for AI Platforms

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

This step will add a process for creating credentials for every login that happens from a client/coach-facing experience. 

For example, if I were to log into a Custom GPT for the first time, and it has access to the data layer, a new set of credentials (called an API key) would be generated that is specific to my login. That allows the Custom GPT to “handshake” with the data layer and make sure that I can only access the information I’m supposed to. We would likely set up accounts on the admin side first and determine what information can be tied to which individual.

</aside>

- **Status**: Planned (Critical for Phase 4)
- **Goal**: Secure authentication for Custom GPTs and Claude Projects
- **Implementation**:
    - API key generation per coach/client
    - Scoped permissions (read-only, write, admin)
    - Key rotation policies
    - Rate limiting per key
    - Revocation mechanisms

### 3.7 Compliance Considerations

- **HIPAA**: If handling health information
- **GDPR**: If handling EU resident data
- **CCPA**: If handling California resident data
- **Data retention policies**: Auto-deletion after X months
- **Audit logging**: Track who accessed what data when

---

## Phase 4: AI Platform Integration Layer (Primary Interface)

### Goal

**Connect the data layer to Custom GPTs and Claude Projects as the PRIMARY interface**, before building custom frontends. This allows coaches to interact with their client data through AI assistants while maintaining security and privacy.

### Strategic Priority

This phase is critical because:
- AI platforms (Custom GPTs, Claude Projects) provide immediate value without custom UI development
- Coaches can use familiar interfaces (ChatGPT, Claude) to query their data
- Validates the data layer architecture before investing in custom frontends
- Reduces time-to-market significantly

### 4.1 MCP (Model Context Protocol) Server

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

An MCP server is an application that tells an LLM how to use another application (like our data layer) to perform tasks. 

For example, we want any LLM (GPT, Claude, Grok, whatever) to be able to access our data layer and perform actions: as an example, searching for all transcripts tied to Coach A. An MCP server will define those actions using a common protocol that most LLM wrappers know how to interact with. 

The hope is that with a common protocol like MCP, we can easily plug a Custom GPT, a Claude account, or a custom frontend interface into our data layer without having to write any additional code to make the data layer work with different interfaces.

</aside>

- **Status**: Planned (High Priority)
- **Goal**: Implement MCP server for Claude Desktop/Projects integration
- **Why MCP**: Native protocol for Claude integration, more capable than REST APIs
- **Implementation**:
    - Build MCP server exposing data layer functionality
    - Tools: `search_data`, `ask_question`, `get_client_summary`, `list_data_items`
    - Context: Automatic client context awareness
    - Authentication: Secure token-based auth
- **User Experience**:
    
    ```
    Coach: "What progress has [client] made on their confidence goals?"
    Claude: *Uses MCP to search transcripts and assessments, returns insights*
    ```
    

### 4.2 Custom GPT Integration (OpenAI)

- **Status**: Planned
- **Goal**: Create Custom GPT that connects to the data layer
- **Implementation**:
    - OpenAPI schema for data layer endpoints
    - OAuth or API key authentication
    - Custom instructions for coaching context
    - Privacy mode (no training on data)
- **Capabilities**:
    - Search client transcripts
    - Answer questions about client progress
    - Generate session summaries
    - Track patterns over time

### 4.3 API Enhancements for AI Platforms

<aside>
<img src="/icons/view_orange.svg" alt="/icons/view_orange.svg" width="40px" />

In some cases, a platform like a Custom GPT may be able to access our API directly without needing an additional layer, like an MCP server, to give it the tools to access the database. This step would add “endpoints” (functions that structure access to the database - for example, one endpoint would allow you to retrieve all transcripts for a given client, and the requesting application would need to supply the ID for a client. 

Think of a set of endpoints like a menu system. In all the infinite ways data can be accessed, an API supplies a set number of options for retrieving and updating a database so the data is used as intended.

</aside>

- **Status**: Planned
- **Goal**: Optimize REST API for AI platform consumption
- **Enhancements**:
    
    ```
    POST /api/v2/search/unified      # Search across all data types
    POST /api/v2/clients/{id}/summary # Client data summary for context
    POST /api/v2/insights/patterns   # Identify patterns across sessions
    POST /api/v2/insights/progress   # Track progress on specific topics
    GET  /api/v2/clients/{id}/timeline # Chronological view of all data
    ```
    

### 4.4 Authentication & Authorization for AI Platforms

- **Status**: Planned (Critical)
- **Goal**: Secure multi-tenant access for AI platforms
- **Implementation**:
    - Coach-specific API keys
    - Automatic client isolation (coach can only access their clients)
    - Webhook for key revocation
    - Usage tracking per coach/key
- **Security Model**:
    
    ```
    API Key → Coach ID → Filtered data access (only their clients)
    ```
    

### 4.5 AI Platform Usage Patterns

**For Coaches**:
1. **Session Prep**: “What did we discuss in the last 3 sessions with [client]?”
2. **Progress Tracking**: “How has [client]’s confidence evolved over time?”
3. **Pattern Recognition**: “What recurring themes appear in [client]’s sessions?”
4. **Goal Monitoring**: “What goals did [client] set and what’s their progress?”

**For Clients** (Future):
1. “What insights emerged from my recent sessions?”
2. “Show me my progress on [goal](about:blank#goal)”
3. “What patterns do you see in my challenges?”

### 4.6 Testing & Validation

- **Status**: Planned
- **Goal**: Ensure AI platforms work correctly with data layer
- **Test Cases**:
    - Multi-client data isolation
    - Cross-data-type queries
    - Temporal queries (progress over time)
    - Privacy validation (no PII leakage)
    - Performance under realistic query load

### 4.7 Documentation for AI Platform Setup

- **Status**: Planned
- **Goal**: Make it easy for coaches to set up Custom GPT / Claude Project
- **Deliverables**:
    - Step-by-step Custom GPT setup guide
    - MCP server installation guide
    - Example prompts and use cases
    - Troubleshooting guide

---

## Phase 5: Data Source Integrations

### 5.1 Fireflies.ai Integration

- **Status**: Planned
- **Goal**: Automatic transcript sync from Fireflies
- **Implementation**:
    - Webhook receiver for new transcripts
    - Fireflies API polling
    - Automatic processing pipeline
    - PII scrubbing before storage

---

## Phase 6: Production Optimization

### 6.1 Infrastructure

- Production deployment (Vercel/Railway)
- Database optimization and indexing
- CDN for static assets
- Environment-based configuration

### 6.2 Security

- Authentication (OAuth, JWT)
- API rate limiting
- Request validation and sanitization
- Security headers and CORS policies

### 6.3 Monitoring & Observability

- Error tracking (Sentry)
- Performance monitoring
- Usage analytics
- Cost tracking (OpenAI API usage)

### 6.4 Documentation

- API documentation (OpenAPI/Swagger)
- User guides
- Integration tutorials
- Architecture documentation

---

# Future Feature Possibilities

## Phase 7: Advanced Features

### 7.1 Google Calendar Integration

- **Status**: Planned
- **Goal**: Link transcripts to calendar events
    - Trigger events, like preemptively sending alerts (breath before this meeting, remember your current field work/commitments)
- **Features**:
    - Automatic meeting metadata
    - Participant information
    - Meeting context and tags

### 7.2 Possible Additional Sources

- Zoom transcripts
- Microsoft Teams
- Custom upload formats
- Email transcripts
- Voice recordings (with transcription)

### 7.2 Smart Analytics

- Topic extraction and clustering
- Sentiment analysis
- Action item detection
- Key insights summarization
- Progress tracking over time

### 7.3 Enhanced Search

- Filters (date range, topic, sentiment)
- Multi-transcript aggregation
- Cross-client insights (anonymized)
- Saved searches and alerts

### 7.4 Reporting & Insights

- Coach dashboard
- Client progress reports
- Trend analysis
- Export capabilities

---

## Phase 8: Custom Frontend Interfaces (Long-term)

### Goal

Build custom web/mobile interfaces **after** validating the architecture with AI platforms. This phase comes later because AI platforms (Phase 4) provide immediate value without custom UI development.

### 8.1 Coach Dashboard

- **Status**: Future
- **Goal**: Web dashboard for coaches to manage clients and data
- **Features**:
    - Client list and profiles
    - Upload transcripts and assessments
    - View insights and analytics
    - Manage API keys for AI platforms
    - Session notes and planning

### 8.2 Client Portal

- **Status**: Future
- **Goal**: Self-service portal for clients to view their progress
- **Features**:
    - Personal dashboard
    - Progress tracking
    - Goal management
    - Session history
    - Insights and patterns

### 8.3 Mobile Applications

- **Status**: Future
- **Goal**: Native mobile apps for on-the-go access
- **Platforms**: iOS, Android
- **Features**: Subset of web dashboard optimized for mobile

---

## Technical Debt & Improvements

### Code Quality

- Add TypeScript for type safety
- Comprehensive test suite (unit, integration, e2e)
- Code linting and formatting
- CI/CD pipeline

### Performance

- Caching layer (Redis)
- Batch processing for embeddings
- Optimize vector search queries
- Lazy loading and pagination

### Developer Experience

- Local development setup script
- Docker containerization
- Seed data for testing
- API client libraries

---

## Priority Matrix

### Critical Path (P0) - Required for AI Platform Integration

1. **Data Type Framework** (Phase 2) - Architecture to support multiple data types
2. **Data Privacy & Security** (Phase 3) - PII scrubbing, access controls, secure API keys
3. **AI Platform Integration** (Phase 4) - MCP server, Custom GPT setup, API enhancements
4. **Authentication/Authorization** - Secure multi-tenant access for AI platforms

**Rationale**: Must complete these before exposing data to AI platforms. Security cannot be an afterthought.

### High Priority (P1) - Value Acceleration

1. **Assessment Data Type** (Phase 2) - Second data type after transcripts
2. **Personality Profile Data Type** (Phase 2) - Third data type
3. **Fireflies.ai Integration** (Phase 5) - Automatic transcript ingestion
4. **API v2 Enhancements** (Phase 4) - Optimized endpoints for AI platforms

**Rationale**: These unlock immediate value through AI platforms without custom UI development.

### Medium Priority (P2) - Enhanced Capabilities

1. **Advanced Analytics** (Phase 6) - Pattern detection, sentiment analysis
2. **Additional Data Sources** (Phase 5) - Zoom, Teams, assessment platforms
3. **Session Notes Data Type** (Phase 2) - Coach’s private notes
4. **Production Infrastructure** (Phase 8) - Scalability and reliability

**Rationale**: Valuable but not blocking for core functionality.

### Future (P3) - Custom Frontends

1. **Coach Dashboard** (Phase 7) - Custom web UI
2. **Client Portal** (Phase 7) - Self-service for clients
3. **Mobile Applications** (Phase 7) - Native iOS/Android apps
4. **Real-time Collaboration** - Live session features

**Rationale**: AI platforms provide interface layer; custom UIs are long-term enhancements.

---

## Timeline Estimate

### Path to AI Platform Integration (Critical Path)

- **Phase 2** (Data Type Framework): 3-4 weeks
    - Multi-data-type schema design and migration
    - Assessment and personality profile data types
    - Unified processing pipeline
- **Phase 3** (Security): 4-5 weeks (cannot rush security)
    - PII scrubbing pipeline (LLM-based approach)
    - Access controls and RLS
    - Secure API key management
    - Compliance audit
- **Phase 4** (AI Platform Integration): 3-4 weeks
    - MCP server implementation
    - Custom GPT setup and testing
    - API v2 enhancements
    - Documentation

---

## Success Metrics

### Phase 1 (Current) ✅

- Upload and search transcripts
- RAG-based Q&A working
- Multi-client support in place

### Phase 2-3 Success Criteria

- Support 3+ data types (transcripts, assessments, profiles)
- PII scrubbing rate >95% accuracy
- Sub-second search across all data types
- Zero data leakage between clients

### Phase 4+ Success Criteria

- Coach can query data via Custom GPT
- Coach can query data via Claude Project (MCP)
- Sub-2-second response time for AI queries
- 5+ coaches actively using AI platform integration
- Zero security incidents

### Long-term Success

- 50+ coaches using the platform
- 1000+ data items across all types
- <1% error rate on PII scrubbing
- 99.9% uptime
- Positive ROI on AI platform approach vs. custom UI