# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.10.0](https://github.com/leadinsideout/unified-data-layer/compare/v0.9.0...v0.10.0) (2025-11-24)

### Features

* **api:** implement admin user and API key management ([867a0ce](https://github.com/leadinsideout/unified-data-layer/commit/867a0ce))
* **api:** add admin web UI dashboard ([7763a39](https://github.com/leadinsideout/unified-data-layer/commit/7763a39))
* **security:** add email/password authentication for admin dashboard ([5100962](https://github.com/leadinsideout/unified-data-layer/commit/5100962))

### Documentation

* add Checkpoint 10 migration instructions ([7577357](https://github.com/leadinsideout/unified-data-layer/commit/7577357))
* add Checkpoint 10 results and update checkpoint index ([16238e7](https://github.com/leadinsideout/unified-data-layer/commit/16238e7))

## [0.9.0](https://github.com/leadinsideout/unified-data-layer/compare/v0.9.0-checkpoint-9...v0.9.0) (2025-11-20)

## [0.8.0](https://github.com/leadinsideout/unified-data-layer/compare/v0.8.0-checkpoint-8...v0.8.0) (2025-11-19)

## [0.7.0](https://github.com/leadinsideout/unified-data-layer/compare/v0.7.0-checkpoint-7...v0.7.0) (2025-11-12)


### Documentation

* update CLAUDE.md for Phase 2 completion ([c783b70](https://github.com/leadinsideout/unified-data-layer/commit/c783b70c99b2e49bf6d5d91bf696fbed7858d38e))

## [0.4.0](https://github.com/leadinsideout/unified-data-layer/compare/v0.4.0-checkpoint-4...v0.4.0) (2025-11-12)


### Documentation

* update Slack setup guide with team webhook and release notifications ([473e257](https://github.com/leadinsideout/unified-data-layer/commit/473e257ed643d8df8705288c854317930ffa5899))

### 0.1.1 (2025-11-11)


### Features

* **db:** add multi-company architecture and company-owned coaching models ([1069540](https://github.com/leadinsideout/unified-data-layer/commit/10695400bfe7956db75f215e0ae1da7b6580783e))
* **mcp:** add Supabase and Notion MCP servers for direct database and project management access ([4cd7bab](https://github.com/leadinsideout/unified-data-layer/commit/4cd7babe99e6d62c990f73465d3d327db0d472fb))
* **mcp:** add Vercel MCP server for deployment management ([54df525](https://github.com/leadinsideout/unified-data-layer/commit/54df5252dae34d233d4a3937d64c9f1798084f4c))
* **mcp:** enable all project MCP servers in Claude Code settings ([da6cea2](https://github.com/leadinsideout/unified-data-layer/commit/da6cea288890aacdb93ccdb64f8b10318c661fe6))
* merge Checkpoints 1 & 2 - Local MVP + Vercel Deployment + Tier 1 Automation ([196b247](https://github.com/leadinsideout/unified-data-layer/commit/196b2478700c6fd590998629acfeb63d61978be5))
* **test:** add sample coaching data for realistic testing ([a5dfced](https://github.com/leadinsideout/unified-data-layer/commit/a5dfcedc71bd1f29666d2feb058d2adba3468f1d))
* **upload:** add bulk upload API and CLI tool for efficient data management ([7a8d353](https://github.com/leadinsideout/unified-data-layer/commit/7a8d35377b591e72e0afacbcd7686e2618aa419e))
* **workflow:** add API versioning strategy and schema change automation ([a764b17](https://github.com/leadinsideout/unified-data-layer/commit/a764b17f16312c711cac1cb6a00bdd081bef1da3))
* **workflow:** add automated weekly cost monitoring email to Phase 6 roadmap ([775ff21](https://github.com/leadinsideout/unified-data-layer/commit/775ff2112fd15f4f25283b0495f0522d7807243c))


### Bug Fixes

* **api:** add root endpoint handler to prevent 404 errors ([2ff9268](https://github.com/leadinsideout/unified-data-layer/commit/2ff92687faffa7dfd908a795caf5126698aa24fc))
* **custom-gpt:** update OpenAPI schema version from 3.0.0 to 3.1.0 for Custom GPT compatibility ([3f035ed](https://github.com/leadinsideout/unified-data-layer/commit/3f035edcffb3c6a21c40ebab7bb81d15d88dd724))
* **search:** resolve vector embedding search precision and RPC function issues ([1f34895](https://github.com/leadinsideout/unified-data-layer/commit/1f34895cbcf35c25c83500888c5f541d7e046259))


### Tests

* **deploy:** bump version to test auto-deployment from main ([11872f5](https://github.com/leadinsideout/unified-data-layer/commit/11872f54aceb05a885919ec652fcb9e783fb0e1e))


### Documentation

* complete Phase 1 with Checkpoint 3 - Custom GPT integration ([ee54ee7](https://github.com/leadinsideout/unified-data-layer/commit/ee54ee7568d36caf035e4970eda889a9bc64f4e2))
* consolidate roadmap.md and rebuild-plan.md into single source of truth ([de9e5af](https://github.com/leadinsideout/unified-data-layer/commit/de9e5afea91016a877eba1b40f975f9fb7e41597))
* **custom-gpt:** add comprehensive Custom GPT setup guide ([ada1846](https://github.com/leadinsideout/unified-data-layer/commit/ada1846e0f596dfd7196a54a393d0ba2c290dc76))
* **db:** add user/org tables and comprehensive scalability analysis to Phase 2 plan ([3d1c9e5](https://github.com/leadinsideout/unified-data-layer/commit/3d1c9e5288cbf67955edbd6dc7546332df98c113))
* **mcp:** add automated Notion project management workflow to CLAUDE.md ([ab96659](https://github.com/leadinsideout/unified-data-layer/commit/ab96659b8027dcc2c51cfc86638d19098ad2fe29))
* **mcp:** document MCP tool usage preferences in CLAUDE.md ([e73e07a](https://github.com/leadinsideout/unified-data-layer/commit/e73e07a39c645f555fdc88f800b789a29bbe41d9))
* update CLAUDE.md with data management features and current status ([64feac4](https://github.com/leadinsideout/unified-data-layer/commit/64feac49ca3c578c8a4cf79b143a139f3daf64d8))
* update CLAUDE.md with production branching strategy ([0427245](https://github.com/leadinsideout/unified-data-layer/commit/0427245e170386f3646d99d1bc3b1b70761d299d))
* update README with Checkpoint 2 completion and deployment info ([99c6a97](https://github.com/leadinsideout/unified-data-layer/commit/99c6a970cbfc0b4e919b6807302a41e0b5d1b0ce))
* **workflow:** clarify main as production branch ([8fa5091](https://github.com/leadinsideout/unified-data-layer/commit/8fa5091d16689c8229763c03bc630894fdd0ca6f))
