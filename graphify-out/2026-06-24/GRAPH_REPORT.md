# Graph Report - FND_Backend  (2026-06-23)

## Corpus Check
- 59 files · ~13,890 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 336 nodes · 525 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d5e5c0f4`
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
- [[_COMMUNITY_Claim Extraction Service|Claim Extraction Service]]
- [[_COMMUNITY_User Controller|User Controller]]
- [[_COMMUNITY_News Service|News Service]]
- [[_COMMUNITY_Graphify Tooling|Graphify Tooling]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `AdminController` - 22 edges
2. `AdminService` - 21 edges
3. `Fake News Detection Backend` - 14 edges
4. `BadRequestError` - 9 edges
5. `config` - 8 edges
6. `Fake News Detection System Backend` - 8 edges
7. `Project Architecture Rules` - 8 edges
8. `VERDICTS` - 7 edges
9. `authMiddleware()` - 7 edges
10. `ROLES` - 6 edges

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

## Communities (17 total, 4 thin omitted)

### Community 0 - "Package Dependencies"
Cohesion: 0.07
Nodes (29): author, dependencies, axios, bcryptjs, cors, dotenv, express, express-rate-limit (+21 more)

### Community 1 - "Reports & Saved Articles"
Cohesion: 0.11
Nodes (11): REPORT_STATUS, Report, reportSchema, SavedArticle, savedArticleSchema, User, userSchema, AnalyticsService (+3 more)

### Community 2 - "Auth Controller"
Cohesion: 0.07
Nodes (14): AuthController, NewsController, ReportController, AuthService, BadRequestError, ConflictError, InternalServerError, UnauthorizedError (+6 more)

### Community 3 - "Environment Config"
Cohesion: 0.10
Nodes (11): connectDB(), config, __dirname, envVarsSchema, __filename, { value: envVars, error }, seedAdmin(), seedNews() (+3 more)

### Community 4 - "DB & Constants"
Cohesion: 0.14
Nodes (9): API_LIMITS, VERDICTS, FactCheck, factCheckSchema, sourceSchema, sampleNews, CredibilityService, ExplanationService (+1 more)

### Community 5 - "Architecture & Docs"
Cohesion: 0.09
Nodes (25): Auth Routes, Claim Extraction, Clean Architecture, Controller Layer Rule, Credibility Scoring, Express.js Framework, Fake News Detection Backend, Google Fact Check API (+17 more)

### Community 8 - "Middleware & Rate Limits"
Cohesion: 0.25
Nodes (10): authMiddleware(), authLimiter, globalLimiter, verificationLimiter, router, router, router, router (+2 more)

### Community 9 - "Admin Validation"
Cohesion: 0.18
Nodes (13): ROLES, adminMiddleware(), ForbiddenError, createFactCheckSchema, createReportSchema, createSavedArticleSchema, createUserSchema, objectIdValidator (+5 more)

### Community 11 - "Claim Extraction Service"
Cohesion: 0.20
Nodes (4): NewsAnalysisController, ClaimExtractionService, responseFormatter, validateNewsAnalysis

### Community 14 - "News Service"
Cohesion: 0.10
Nodes (13): llmConfig, ProviderFactory, AnalysisHistory, analysisHistorySchema, buildAnalysisPrompt(), BaseProvider, GeminiProvider, GroqProvider (+5 more)

### Community 15 - "Graphify Tooling"
Cohesion: 0.67
Nodes (3): Graphify Query, Graphify Tool, Graphify Workflow

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): Environment Variables, Fake News Detection System Backend, Fake News Verification Flow, Features, Folder Architecture, Getting Started, Installation, Prerequisites (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (9): Backend, Code Quality, Documentation, Frontend, LLM Providers, Mobile, Ponytail + FND Rules, Project Architecture Rules (+1 more)

## Knowledge Gaps
- **73 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AdminController` connect `Admin Controller` to `Admin Validation`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `AdminService` connect `Admin Service` to `Reports & Saved Articles`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `BadRequestError` connect `Auth Controller` to `Admin Validation`, `User Controller`, `Reports & Saved Articles`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Reports & Saved Articles` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Should `Auth Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.07152496626180836 - nodes in this community are weakly interconnected._