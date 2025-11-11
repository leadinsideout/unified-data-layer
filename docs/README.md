# Documentation

**Welcome to the Unified Data Layer documentation!**

This directory contains all project documentation, organized by purpose.

---

## 🚀 Quick Links

**New to the project?**
- Start with the [main README](../README.md)
- Follow [setup guides](setup/) to get running

**Looking for something specific?**
- **Roadmap & Implementation Plan**: [project/roadmap.md](project/roadmap.md)
- **Phase 2 Implementation**: [project/phase-2-implementation-plan.md](project/phase-2-implementation-plan.md)
- **Current Status**: [checkpoints/README.md](checkpoints/README.md)
- **Development Workflows**: [development/workflows.md](development/workflows.md)

---

## 📁 Documentation Structure

### [project/](project/)
**Strategic & Planning Documents**

Strategic vision, product roadmap, and implementation plans.

- `roadmap.md` - 8-phase product vision with checkpoint implementation plan
- `phase-2-implementation-plan.md` - Detailed Phase 2 implementation plan
- `architecture.md` - Architecture decisions (future)

### [development/](development/)
**Developer Guides & Workflows**

Standards, workflows, and contribution guidelines.

- `workflows.md` - Git branching, commits, testing, deployment
- `workflow-tracker.md` - When to implement each workflow component
- `contributing.md` - How to contribute (future)

### [checkpoints/](checkpoints/)
**Checkpoint Status Reports**

Track progress through implementation checkpoints.

- `README.md` - Checkpoint index and overview
- `checkpoint-1.md` - Phase 1, Checkpoint 1 status
- `checkpoint-2.md` - Phase 1, Checkpoint 2 status (future)
- `checkpoint-3.md` - Phase 1, Checkpoint 3 status (future)

### [setup/](setup/)
**Setup & Configuration Guides**

Step-by-step guides for setting up services and tools.

- `supabase-setup.md` - Set up Supabase database with pgvector
- `github-branch-protection.md` - Configure branch protection
- `openai-setup.md` - Get OpenAI API key (future)
- `vercel-deployment.md` - Deploy to Vercel (future)

### [api/](api/)
**API Documentation**

API endpoint reference and OpenAPI schema.

- `endpoints.md` - Complete API reference (future)
- `openapi.json` - OpenAPI 3.0 schema (future - or serve from API)

### [architecture/](architecture/)
**Architecture & Design Docs**

Technical architecture decisions and patterns.

- `database-schema.md` - Database design and rationale (future)
- `vector-search.md` - How semantic search works (future)
- `chunking-strategy.md` - Text chunking approach (future)

---

## 🎯 Finding What You Need

### "I want to..."

**...get started quickly**
→ [../README.md](../README.md)

**...set up my development environment**
→ [setup/](setup/)

**...understand the project vision**
→ [project/roadmap.md](project/roadmap.md)

**...know what's been built so far**
→ [checkpoints/README.md](checkpoints/README.md)

**...learn the development workflow**
→ [development/workflows.md](development/workflows.md)

**...see the implementation plan**
→ [project/roadmap.md](project/roadmap.md)

**...deploy to production**
→ [setup/vercel-deployment.md](setup/vercel-deployment.md) (future)

**...integrate with Custom GPT**
→ [project/roadmap.md](project/roadmap.md) → Checkpoint 3

**...understand the architecture**
→ [architecture/](architecture/) (future)

---

## 📊 Documentation Standards

### When to Create Docs

**Immediately**:
- New API endpoints → Update api/endpoints.md
- Breaking changes → Create migration guide
- Setup/configuration changes → Update setup/
- Architecture decisions → Document in architecture/

**At Checkpoint Completion**:
- Checkpoint status → checkpoints/checkpoint-X.md
- Update checkpoints/README.md index

**Can Defer**:
- Internal implementation details
- Temporary experimental code
- TODO comments (track in issues instead)

### Doc File Naming

- Use kebab-case: `database-schema.md`
- Be descriptive: `supabase-setup.md` not `db.md`
- Add dates for time-sensitive docs: `migration-2025-11.md`

### Doc Format

All docs should include:
```markdown
# Title

**Purpose**: One sentence description

**Last Updated**: YYYY-MM-DD

---

## Content sections...
```

---

## 🔄 Keeping Docs Updated

**When code changes**:
- Update relevant docs in same PR/commit
- Breaking changes MUST include migration guide
- New endpoints MUST be documented

**When completing checkpoints**:
- Create checkpoint-X.md status report
- Update checkpoints/README.md index
- Tag git commit with version

**Quarterly maintenance**:
- Review all docs for accuracy
- Archive outdated docs
- Update "Last Updated" dates

---

## 🤝 Contributing to Docs

See [development/contributing.md](development/contributing.md) (future) for contribution guidelines.

**Quick tips**:
- Use clear, concise language
- Include code examples
- Add troubleshooting sections
- Link to related docs
- Keep up-to-date

---

## 📝 Documentation Roadmap

**Phase 1** (Current):
- ✅ Setup guides (Supabase, GitHub)
- ✅ Checkpoint tracking system
- ✅ Workflows documentation
- 🟡 API endpoint reference (in progress)

**Phase 2**:
- Database schema docs
- Architecture decision records
- Multi-data-type design docs

**Phase 3**:
- Security documentation
- PII scrubbing guide
- Authentication setup

**Phase 4**:
- MCP server documentation
- Custom GPT integration guide
- API v2 reference

---

## 💡 Tips

- **Can't find something?** Check the project README or this index
- **Docs out of date?** Create an issue or update them
- **New to project?** Start with README → Setup guides → Rebuild plan
- **Need help?** Check troubleshooting sections in relevant docs

---

**Last Updated**: 2025-11-08
