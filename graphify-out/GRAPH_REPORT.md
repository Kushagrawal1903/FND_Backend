# Graph Report - FND_Backend  (2026-06-25)

## Corpus Check
- 83 files · ~22,757 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 529 nodes · 881 edges · 28 communities (13 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8e37131`
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
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `WorkflowState` - 25 edges
2. `AdminController` - 22 edges
3. `EvidenceRetrievalAgent` - 21 edges
4. `AdminService` - 21 edges
5. `EvidencePreparer` - 20 edges
6. `startTimer()` - 18 edges
7. `stopTimer()` - 18 edges
8. `Fake News Detection Backend` - 14 edges
9. `config` - 11 edges
10. `AgentOrchestrator` - 11 edges

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

## Communities (28 total, 15 thin omitted)

### Community 0 - "Package Dependencies"
Cohesion: 0.29
Nodes (10): createFactCheckSchema, createReportSchema, createSavedArticleSchema, createUserSchema, objectIdValidator, sourceSchema, updateFactCheckSchema, updateReportSchema (+2 more)

### Community 1 - "Reports & Saved Articles"
Cohesion: 0.08
Nodes (14): SourceCredibilityAgent, ReasoningAgent, ReportAgent, VerificationAgent, config, AnalysisHistory, analysisHistorySchema, NewsService (+6 more)

### Community 2 - "Auth Controller"
Cohesion: 0.07
Nodes (11): DomainCredibilityTool, FactCheckTool, GNewsTool, GoogleFactCheckTool, NewsSearchAdapterTool, NewsSearchTool, DEFAULT_SOURCE_CREDIBILITY_CONFIG, mergeConfig() (+3 more)

### Community 3 - "Environment Config"
Cohesion: 0.05
Nodes (23): REPORT_STATUS, ReportController, UserController, Report, reportSchema, SavedArticle, savedArticleSchema, User (+15 more)

### Community 4 - "DB & Constants"
Cohesion: 0.06
Nodes (37): Auth Routes, Claim Extraction, Clean Architecture, Controller Layer Rule, Credibility Scoring, Express.js Framework, Fake News Detection Backend, Google Fact Check API (+29 more)

### Community 5 - "Architecture & Docs"
Cohesion: 0.12
Nodes (9): llmConfig, ProviderFactory, buildAnalysisPrompt(), BaseProvider, GeminiProvider, GroqProvider, AppError, normalizeAnalysisResponse() (+1 more)

### Community 6 - "Admin Controller"
Cohesion: 0.07
Nodes (29): author, dependencies, axios, bcryptjs, cors, dotenv, express, express-rate-limit (+21 more)

### Community 7 - "Admin Service"
Cohesion: 0.13
Nodes (16): API_LIMITS, ROLES, NewsAnalysisController, adminMiddleware(), authMiddleware(), authLimiter, globalLimiter, verificationLimiter (+8 more)

### Community 8 - "Middleware & Rate Limits"
Cohesion: 0.09
Nodes (17): VERDICTS, connectDB(), __dirname, envVarsSchema, __filename, { value: envVars, error }, FactCheck, factCheckSchema (+9 more)

### Community 12 - "User Controller"
Cohesion: 0.20
Nodes (9): Backend, Code Quality, Documentation, Frontend, LLM Providers, Mobile, Ponytail + FND Rules, Project Architecture Rules (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (4): NewsController, analyzeSchema, checkSchema, urlCheckSchema

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (3): Graphify Query, Graphify Tool, Graphify Workflow

## Knowledge Gaps
- **77 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WorkflowState` connect `Claim Extraction Service` to `Reports & Saved Articles`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `AdminController` connect `Admin Validation` to `Package Dependencies`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `AdminService` connect `Community 10` to `Environment Config`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reports & Saved Articles` be split into smaller, more focused modules?**
  _Cohesion score 0.07547169811320754 - nodes in this community are weakly interconnected._
- **Should `Auth Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.06707317073170732 - nodes in this community are weakly interconnected._
- **Should `Environment Config` be split into smaller, more focused modules?**
  _Cohesion score 0.053185271770894216 - nodes in this community are weakly interconnected._