# Graph Report - FND_Backend  (2026-06-24)

## Corpus Check
- 76 files · ~20,414 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 430 nodes · 713 edges · 29 communities (12 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28bb7cb4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Reports & Saved Articles|Reports & Saved Articles]]
- [[_COMMUNITY_Auth Controller|Auth Controller]]
- [[_COMMUNITY_Environment Config|Environment Config]]
- [[_COMMUNITY_DB & Constants|DB & Constants]]
- [[_COMMUNITY_Architecture & Docs|Architecture & Docs]]
- [[_COMMUNITY_Admin Controller|Admin Controller]]
- [[_COMMUNITY_Admin Service|Admin Service]]
- [[_COMMUNITY_Middleware & Rate Limits|Middleware & Rate Limits]]
- [[_COMMUNITY_Admin Validation|Admin Validation]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Claim Extraction Service|Claim Extraction Service]]
- [[_COMMUNITY_User Controller|User Controller]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_News Service|News Service]]
- [[_COMMUNITY_Graphify Tooling|Graphify Tooling]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `AdminController` - 22 edges
2. `AdminService` - 21 edges
3. `logger` - 17 edges
4. `Fake News Detection Backend` - 14 edges
5. `AGENT_NAMES` - 10 edges
6. `config` - 9 edges
7. `BadRequestError` - 9 edges
8. `EvidenceAgent` - 8 edges
9. `VERDICTS` - 8 edges
10. `Fake News Detection System Backend` - 8 edges

## Surprising Connections (you probably didn't know these)
- `seedAdmin()` --calls--> `connectDB()`  [EXTRACTED]
  seedAdmin.js → src/config/db.js
- `seedNews()` --calls--> `connectDB()`  [EXTRACTED]
  seedNews.js → src/config/db.js
- `Fake News Detection Backend` --IMPLEMENTS--> `Ponytail Principles`  [EXTRACTED]
  README.md → agents.md
- `Fake News Detection Backend` --CONTAINS--> `LLM Provider Abstraction`  [EXTRACTED]
  README.md → agents.md
- `Clean Architecture` --CONTAINS--> `Controller Layer Rule`  [EXTRACTED]
  README.md → agents.md

## Import Cycles
- None detected.

## Communities (29 total, 17 thin omitted)

### Community 0 - "Package Dependencies"
Cohesion: 0.07
Nodes (29): author, dependencies, axios, bcryptjs, cors, dotenv, express, express-rate-limit (+21 more)

### Community 1 - "Reports & Saved Articles"
Cohesion: 0.06
Nodes (18): AuthController, ReportController, UserController, SavedArticle, savedArticleSchema, User, userSchema, UserService (+10 more)

### Community 2 - "Auth Controller"
Cohesion: 0.27
Nodes (4): NewsController, analyzeSchema, checkSchema, urlCheckSchema

### Community 3 - "Environment Config"
Cohesion: 0.10
Nodes (11): connectDB(), config, __dirname, envVarsSchema, __filename, { value: envVars, error }, seedAdmin(), seedNews() (+3 more)

### Community 5 - "Architecture & Docs"
Cohesion: 0.06
Nodes (37): Auth Routes, Claim Extraction, Clean Architecture, Controller Layer Rule, Credibility Scoring, Express.js Framework, Fake News Detection Backend, Google Fact Check API (+29 more)

### Community 8 - "Middleware & Rate Limits"
Cohesion: 0.17
Nodes (14): API_LIMITS, ROLES, adminMiddleware(), authMiddleware(), authLimiter, globalLimiter, verificationLimiter, router (+6 more)

### Community 9 - "Admin Validation"
Cohesion: 0.13
Nodes (15): REPORT_STATUS, Report, reportSchema, AnalyticsService, ReportService, createFactCheckSchema, createReportSchema, createSavedArticleSchema (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (19): AGENT_NAMES, VERDICTS, WEIGHTS, AgentExecution, agentExecutionSchema, FactCheck, factCheckSchema, sourceSchema (+11 more)

### Community 14 - "News Service"
Cohesion: 0.12
Nodes (10): llmConfig, ProviderFactory, buildAnalysisPrompt(), BaseProvider, GeminiProvider, GroqProvider, LLMTool, AppError (+2 more)

### Community 15 - "Graphify Tooling"
Cohesion: 0.67
Nodes (3): Graphify Query, Graphify Tool, Graphify Workflow

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (9): Backend, Code Quality, Documentation, Frontend, LLM Providers, Mobile, Ponytail + FND Rules, Project Architecture Rules (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (6): NewsAnalysisController, AnalysisHistory, analysisHistorySchema, ClaimExtractionService, NewsAnalysisService, responseFormatter

## Knowledge Gaps
- **81 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AdminController` connect `Admin Controller` to `Admin Validation`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `AdminService` connect `Admin Service` to `Reports & Saved Articles`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `logger` connect `Community 10` to `Community 26`, `News Service`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Reports & Saved Articles` be split into smaller, more focused modules?**
  _Cohesion score 0.061170212765957445 - nodes in this community are weakly interconnected._
- **Should `Environment Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09971509971509972 - nodes in this community are weakly interconnected._