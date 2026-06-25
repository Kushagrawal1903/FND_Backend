# Fake News Detection System Backend

A production-ready Node.js + Express backend for a Fake News Detection System. This system leverages local processing, text extraction services, and integrates with the Google Fact Check Tools API to analyze, rate, and verify claims. It features JWT-based authentication, role-based access controls, robust Joi validations, Mongoose schemas, and automated admin dashboard analytics.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Folder Architecture](#folder-architecture)
3. [Features](#features)
4. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Environment Variables](#environment-variables)
   - [Seeding the Admin](#seeding-the-admin)
   - [Running the Application](#running-the-application)
5. [API Documentation](#api-documentation)
   - [Public/Auth Endpoints](#publicauth-endpoints)
   - [Verification Endpoints](#verification-endpoints)
   - [User Profile & Saved Articles](#user-profile--saved-articles)
   - [Admin CRUD Endpoints](#admin-crud-endpoints)
6. [Fake News Verification Flow](#fake-news-verification-flow)

---

## Tech Stack
* **Runtime**: Node.js (v18+)
* **Framework**: Express.js (ES Modules support)
* **Database**: MongoDB Atlas via Mongoose
* **Authentication**: JSON Web Token (JWT) & `bcryptjs`
* **Validation**: Joi (Request payload constraints)
* **API Clients**: Axios (For integration with Google API)
* **Security & Stability**: Helmet, CORS, Express Rate Limit, unified global error handler

---

## Folder Architecture
The project adheres to Clean Architecture separation of concerns:

```text
backend/
├── src/
│   ├── server.js               # Entry point, boots HTTP listener & global errors
│   ├── app.js                  # Configures Express apps, CORS, Helmet, and base routers
│   ├── config/
│   │   ├── db.js               # Database initialization
│   │   ├── env.js              # Joi-validated environment config loader
│   │   └── constants.js        # Enums (Roles, Verdicts, Statuses)
│   ├── routes/                 # Express API routing tables
│   ├── controllers/            # Controller layers (Extracts params, validates, calls service)
│   ├── services/               # Core business logic layer (All db/logic operations)
│   ├── models/                 # Mongoose schema definitions (User, FactCheck, Report, SavedArticle)
│   ├── middleware/             # JWT auth, role checking, error & rate limiters
│   ├── validations/            # Joi request body schemas
│   └── utils/                  # Custom HTTP error utility classes (e.g. NotFoundError, BadRequestError)
├── .env                        # Local environment parameters (not committed)
├── package.json                # Project script manifests and package dependencies
├── seedAdmin.js                # Command line bootstrapping script for initial Admin
└── README.md                   # Setup manual (This file)
```

---

## Features
- **Stateless Authentication**: Protected paths require standard `Authorization: Bearer <token>` authorization headers.
- **Robust Role Authorization**: Separate user permissions and admin CRUD clearances.
- **Clever News Parser**: Extracts core assertions from long paragraphs using statistical sentence scoring to avoid querying junk noise.
- **Graceful Third-Party Fallback**: Automatically activates a simulated local verification engine if the Google Fact Check API key is invalid or missing.
- **URL Headline Fetcher**: Resolves URLs on the fly, downloads pages to extract headers, and checks them.
- **Unified Error Handling**: Operational Mongoose duplicate key violations (11000) and CastErrors automatically resolve into readable HTTP client formats (e.g. 400 Bad Request / 409 Conflict).

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas connection string.

### Installation
1. Extract or checkout the files inside the workspace directory.
2. Open terminal and run:
   ```bash
   npm install
   ```

### Environment Variables
Create a `.env` file in the root folder of the project. Set it up using the parameters below:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/fake_news_db
JWT_SECRET=super_secret_jwt_signing_key_change_me_in_production
JWT_EXPIRES_IN=7d
GOOGLE_FACT_CHECK_API_KEY=YOUR_GOOGLE_FACT_CHECK_API_KEY_HERE
```
*Note: If `GOOGLE_FACT_CHECK_API_KEY` is not provided, the system falls back to keywords matching in local simulation mode.*

### Seeding the Admin
Before running the app, create the first administrator account by running:
```bash
npm run seed:admin
```
This inserts a user with these credentials:
- **Email**: `admin@fakenewsdetection.com`
- **Password**: `AdminSecurePass123!`
- **Role**: `admin`

### Running the Application
- **Development Mode** (with nodemon reload):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

---

## API Documentation

All routes (except `/health`) are prefixed with `/api`.

### Public/Auth Endpoints
| Method | Endpoint | Description | Headers | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user | None | Strict |
| `POST` | `/auth/login` | Authenticate user & get token | None | Strict |
| `POST` | `/auth/logout` | Confirm stateless client logout | None | Standard |
| `GET` | `/auth/me` | Fetch active user credentials | `Bearer <JWT>` | Standard |

### Verification Endpoints
*Requires JWT authentication.*
- `POST /api/news/check`
  - Validates `claim` text (length 10+). Extracts the core claim, checks the database/Google, and returns verdict.
  - Body: `{ "claim": "COVID-19 vaccines contain tracking microchips." }`
- `POST /api/news/analyze`
  - Runs full verification and returns additional NLP stats (keywords list, word count).
  - Body: `{ "claim": "A very long paragraph detailing some conspiracy about flat earth..." }`
- `POST /api/news/url-check`
  - Automatically crawls the webpage, scrapes the title tag, and runs claim checks on it.
  - Body: `{ "url": "https://www.some-news-source.com/article-slug" }`

### User Profile & Saved Articles
*Requires JWT authentication.*
- `POST /api/users/saved-articles` - Bookmark a verification result.
  - Body: `{ "title": "...", "url": "...", "verdict": "false", "notes": "Optional notes" }`
- `GET /api/users/saved-articles` - Get logged-in user's bookmarks.
- `DELETE /api/users/saved-articles/:id` - Delete a bookmark (ownership verified).
- `POST /api/reports` - Submit a report (for bugs/feedback/verification issues).
  - Body: `{ "title": "Incorrect Verdict on Mars landing", "description": "Mars landing is real..." }`
- `GET /api/reports` - Get logged-in user's submitted reports.

### Admin CRUD Endpoints
*Requires JWT authentication & role matching `admin`.*

- **Dashboard Analytics**:
  - `GET /api/admin/analytics` -> Returns total user base, verdict ratios, average confidence score, and chronological activity breakdown.

- **Users CRUD**:
  - `POST /api/admin/users` (Create User)
  - `GET /api/admin/users` (Get All)
  - `GET /api/admin/users/:id` (Get One)
  - `PUT /api/admin/users/:id` (Update)
  - `DELETE /api/admin/users/:id` (Delete + cascade wipes related checks/reports/bookmarks)

- **FactChecks CRUD**:
  - `POST /api/admin/factchecks` | `GET /api/admin/factchecks` | `GET /api/admin/factchecks/:id` | `PUT /api/admin/factchecks/:id` | `DELETE /api/admin/factchecks/:id`

- **Reports CRUD**:
  - `POST /api/admin/reports` | `GET /api/admin/reports` | `GET /api/admin/reports/:id` | `PUT /api/admin/reports/:id` | `DELETE /api/admin/reports/:id`

- **SavedArticles CRUD**:
  - `POST /api/admin/articles` | `GET /api/admin/articles` | `GET /api/admin/articles/:id` | `PUT /api/admin/articles/:id` | `DELETE /api/admin/articles/:id`

---

## Fake News Verification Flow
1. **Request Received**: The controller validates inputs using Joi.
2. **Text Cleansing**: The `claimExtraction` service tokenizes text, removes punctuation, filters English stop-words, and scores sentence weights to identify the main assertion.
3. **Fact-Check Query**: The `googleFactCheck` service uses Axios to fetch existing reports.
4. **Rating Aggregation**: The `credibility` service converts raw ratings (e.g., "Pants on Fire", "Mostly False") to standardized verdicts (`true`, `false`, `mixture`, `unverified`) and calculates a confidence score based on the volume and alignment of reviewers.
5. **Report Generation**: The `explanation` service builds a user-friendly paragraph summary.
6. **Data Persistence**: The transaction is logged in MongoDB via `FactCheck` schemas.
7. **JSON Response**: The response is returned to the user.
