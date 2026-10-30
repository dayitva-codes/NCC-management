# 🇮🇳 CADET-360: National Cadet Corps Command Platform

> **CADET-360** is an enterprise-grade digital operating system designed for the **National Cadet Corps (NCC)**. Engineered with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL / SQLite**, and **React 18 + Vite**, it replaces paper-bound administrative workflows with 9-dimensional military evaluations, customizable training focus parameters, an official Certificate A/B/C mock examination engine with psychometric item analysis, parade attendance muster rolls, and real-time battalion leaderboards.

---

## 📑 Table of Contents
1. [What CADET-360 Is & Core Capabilities](#-what-cadet-360-is--core-capabilities)
2. [Prerequisites](#-prerequisites)
3. [Quick Start](#-quick-start)
   - [Option A: Local Development (Fastest)](#option-a-local-development-fastest)
   - [Option B: Single-Command Docker Deployment](#option-b-single-command-docker-deployment)
4. [Environment Variables Table](#-environment-variables-table)
5. [Database Seeding & Starter Data](#-database-seeding--starter-data)
6. [Project Structure](#-project-structure)
7. [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
8. [Common Errors & Troubleshooting](#-common-errors--troubleshooting)
9. [Running Automated Tests](#-running-automated-tests)

---

## 🎖️ What CADET-360 Is & Core Capabilities

- **Digital Battalion & Roster Hierarchy**: Structured management of Directorates, Battalions, Affiliated Colleges, Associate NCC Officers (ANOs / Mentors), and Cadets (SD / SW).
- **9-Pillars Military Evaluation Framework**: Objective assessment rubric covering:
  1. *Drill & Parade Precision*
  2. *Physical Fitness & Endurance*
  3. *Discipline & Military Bearing*
  4. *Leadership & Squad Command*
  5. *NCC Knowledge & Service SOPs*
  6. *Communication & Briefing Skills*
  7. *Teamwork & Esprit de Corps*
  8. *Time Punctuality & Turnout*
  9. *Parade Attendance Compliance (75% statutory requirement)*
- **Custom Assessment Focus Priorities**: Officers can designate any assessment pillar as *More to Focus (High)*, *Standard*, or *Less to Focus (Low)*, and create custom training parameters with real-time reactive sync.
- **Official NCC Certificate Mock Exam Engine**:
  - 19 official NCC syllabus topics (Drill, Weapon Training, Map Reading, Field Craft, Military History, etc.).
  - 5 exam modes: Full Mock (100 Qs), Certificate-wise (A, B, C), Topic Drill, Quick Sprint, and Weak Area spaced-repetition.
  - Server-authoritative countdown timers and zero-leakage randomized option permutations.
- **Officer Analytics & Psychometric Item Analysis**:
  - Real-time Difficulty Index ($P$) and Discrimination Index ($D$) computation.
  - Distractor frequency tracking and psychometric diagnostic alerts.
  - Battalion pass-rate KPIs, student rankings, and CSV scorecard export.
- **Resilient Dual-Engine Database Architecture**:
  - Automatically connects to remote **PostgreSQL** (Supabase, Render, or Docker).
  - Seamlessly falls back to local **SQLite (`ncc.db`)** if remote connectivity is offline, ensuring zero downtime or startup failures.

---

## 📋 Prerequisites

Ensure the following tools are installed on your machine:

| Tool | Minimum Version | Installation Link |
| :--- | :--- | :--- |
| **Python** | `3.10+` (3.10, 3.11, or 3.12) | [python.org](https://www.python.org/downloads/) |
| **Node.js & npm** | `Node 18+` and `npm 9+` | [nodejs.org](https://nodejs.org/) |
| **Git** | Any recent version | [git-scm.com](https://git-scm.com/) |
| **Docker & Compose** *(Optional)* | Docker Desktop or Engine `20.10+` | [docker.com](https://www.docker.com/) |

---

## 🚀 Quick Start

### Option A: Local Development (Fastest)

#### 1. Clone Repository & Enter Directory
```bash
git clone https://github.com/dayitva-codes/NCC-management.git
cd NCC-management
```

#### 2. Setup Python Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# Install Python backend dependencies
pip install -r requirements.txt
```

#### 3. Install Frontend Dependencies
```bash
npm --prefix frontend install
```

#### 4. Configure Environment Variables
Copy the `.env.example` templates:
```bash
# Windows:
copy .env.example .env
copy frontend\.env.example frontend\.env

# Linux / macOS:
cp .env.example .env
cp frontend/.env.example frontend/.env
```
*(By default, `DATABASE_URL` is configured to use local SQLite `ncc.db`, allowing instant zero-config startup without setting up a remote database).*

#### 5. Seed Starter Database
```bash
python -m app.db.seed
```

#### 6. Start the Application
```bash
npm run dev
```
This single command concurrently boots:
- **Backend API Gateway**: [`http://127.0.0.1:8000`](http://127.0.0.1:8000) (Interactive Swagger Docs at `/docs`)
- **Frontend Command Station**: [`http://127.0.0.1:5173`](http://127.0.0.1:5173)

---

### Option B: Single-Command Docker Deployment

Launch the complete application along with an isolated PostgreSQL 16 database with one command:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build and start containers in background
docker compose up -d --build
```

Access the application:
- **Web App & API**: [`http://localhost:8000`](http://localhost:8000)
- **API Documentation**: [`http://localhost:8000/docs`](http://localhost:8000/docs)
- **Health Check**: [`http://localhost:8000/health`](http://localhost:8000/health)

To view logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

---

## ⚙️ Environment Variables Table

### Backend Variables (`.env`)

| Variable | Required in Prod? | Default | Description |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Yes | `development` | Deployment environment (`development`, `staging`, `production`). In production, insecure default keys are blocked. |
| `DATABASE_URL` | Yes | `sqlite:///./ncc.db` | PostgreSQL connection pooler URI (`postgresql://...`) or SQLite path (`sqlite:///...`). |
| `SECRET_KEY` | **Yes (in prod)** | *Default dev key* | Cryptographically strong random key for signing JWT tokens. |
| `ALGORITHM` | No | `HS256` | JWT signing algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT token lifetime in minutes (1440 = 24 hours). |
| `CORS_ORIGINS` | Yes | `localhost:5173,...` | Comma-delimited list of allowed origin URLs (e.g. `https://your-domain.com`). |
| `SUPABASE_URL` | Optional | `""` | Supabase project URL for Google OAuth verification. |
| `SUPABASE_ANON_KEY` | Optional | `""` | Supabase public anonymous API key. |
| `SUPABASE_SERVICE_ROLE_KEY`| Optional | `""` | Supabase service role key (backend only). |
| `SUPABASE_JWT_SECRET` | Optional | `""` | Supabase JWT signing secret for fast local token verification. |
| `ANTHROPIC_API_KEY` | Optional | `""` | Optional Anthropic API key for AI drill & training regimens. |

### Frontend Variables (`frontend/.env`)

| Variable | Required in Prod? | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | `http://127.0.0.1:8000/api/v1` | URL of backend API. Use `/api/v1` for production reverse proxies or Vercel. |
| `VITE_SUPABASE_URL` | Optional | `""` | Supabase URL for client-side Google OAuth. |
| `VITE_SUPABASE_ANON_KEY` | Optional | `""` | Supabase public anon key. |

---

## 🗄️ Database Seeding & Starter Data

CADET-360 includes automated baseline data for battalions, colleges, syllabus books, and evaluation criteria.

To re-seed or initialize a clean database:
```bash
python -m app.db.seed
```

### Pre-Configured Seed Accounts

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Commanding Officer (Admin)** | `admin@ncc.local` | `admin123` | Full Battalion HQ controls, Officer Analytics, System Config |
| **Associate NCC Officer (Mentor)** | `mentor1@test.com` | `password123` | Institutional evaluation, muster rolls, question imports |
| **Senior Division Cadet** | `cadet1@test.com` | `password123` | Personal dossier, parade attendance, mock exam arena |

*(Note: Change all default passwords immediately after initial deployment).*

---

## 🏛️ Project Structure

```
ncc-management/
├── api/
│   ├── index.py                    # Vercel serverless ASGI gateway adapter
│   └── requirements.txt            # Vercel serverless dependency specification
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── ai_insights.py      # AI training regimen endpoints
│   │       ├── auth.py             # Credentials and Supabase Google OAuth SSO
│   │       ├── cadets.py           # Cadet registration, dossiers, and profiles
│   │       ├── colleges.py         # Battalion and college management (Admin)
│   │       ├── dashboard.py        # Executive KPI dashboard and leaderboard
│   │       ├── evaluations.py      # 9-Pillar rubric evaluations and custom criteria
│   │       ├── library.py          # NCC syllabus handbooks & study material CRUD
│   │       ├── mentors.py          # ANO / Mentor registration and verification
│   │       ├── ncc_mock_tests.py   # Mock exam sessions, psychometrics, CSV import
│   │       ├── ops.py              # Parade attendance rolls and training tasks
│   │       └── router.py           # Centralized API v1 router
│   ├── core/
│   │   ├── config.py               # Pydantic settings & production security gates
│   │   ├── dependencies.py         # JWT auth, DB session, & RBAC dependencies
│   │   └── security.py             # Direct bcrypt hashing & JWT token handling
│   ├── db/
│   │   ├── base.py                 # SQLAlchemy declarative base
│   │   ├── seed.py                 # Master database seeder (executable CLI)
│   │   └── session.py              # Resilient dual-engine (PostgreSQL + SQLite)
│   ├── models/                     # SQLAlchemy ORM entity models (16 tables)
│   ├── schemas/                    # Pydantic v2 validation models
│   ├── services/                   # Business logic, psychometric algorithms, radar
│   └── main.py                     # FastAPI application factory with lifespan handler
├── data/                           # Authentic Raipur Group reference CSV datasets
├── frontend/
│   ├── public/
│   │   └── ncc-logo.png            # Official NCC emblem
│   ├── src/
│   │   ├── api/client.js           # Smart micro-caching API client & token sync
│   │   ├── components/             # Reusable UI controls, modals, and design tokens
│   │   ├── config/navigationConfig # Centralized role-based navigation mapping
│   │   ├── context/AuthContext.jsx # Combined JWT + Google OAuth session provider
│   │   ├── pages/                  # Workstation views (Dashboards, Mock Tests, Analytics)
│   │   ├── App.jsx                 # Route definitions and security guards
│   │   └── index.css               # Cyber-Command military design system
│   ├── index.html                  # HTML entrypoint
│   └── vite.config.js              # Vite bundling configuration
├── dev.js                          # Node.js concurrent launcher for Windows/Mac/Linux
├── docker-compose.yml              # Local multi-container Docker configuration
├── Dockerfile                      # Production multi-stage Docker build
├── package.json                    # Root scripts (`npm run dev`, `npm test`)
├── requirements.txt                # Pinned production Python dependencies
└── test_app.py                     # End-to-end integration test runner
```

---

## 🔒 Role-Based Access Control (RBAC) Matrix

| Feature / Endpoint | Cadet (`cadet`) | ANO / Mentor (`mentor`) | Admin / CO (`admin`) |
| :--- | :---: | :---: | :---: |
| **Personal Dashboard & Dossier** | Read Self | Read Assigned | Read All |
| **Parade Attendance** | View Self (75% Gate) | Record & Mark Roll | Manage & Audit All |
| **9-Pillar Military Evaluations** | View Self Ratings | Evaluate Cadets | Manage Rubric & Priorities |
| **Certificate Mock Tests** | Take Exam & Review | Review Cadets | Audit All Scorecards |
| **Psychometric Item Analysis** | ❌ Restricted | ✅ Full Access | ✅ Full Access |
| **Question Bank Management** | ❌ Restricted | Import & Edit | Full CRUD & Reset |
| **Battalion & College Creation** | ❌ Restricted | ❌ Restricted | ✅ Full Access |
| **Mentor Account Verification** | ❌ Restricted | ❌ Restricted | ✅ Full Access |

---

## ⚠️ Common Errors & Troubleshooting

### 1. Port 8000 or Port 5173 Already in Use
- **Cause**: A previous server instance was not terminated cleanly.
- **Fix**: Run `npm run dev`. The included [`dev.js`](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/dev.js) automatically terminates orphan process trees on ports 8000 and 5173 before launching. Alternatively:
  ```powershell
  # Windows PowerShell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force
  ```

### 2. Remote PostgreSQL Tenant Not Found / Connection Timeout
- **Cause**: Supabase project is paused or connection pooler URL has an expired password.
- **Resolution**: CADET-360 has built-in **zero-downtime fallback**. When remote PostgreSQL is unreachable, it logs a notice and immediately routes transactions through a local SQLite database (`ncc.db`), keeping local work completely uninterrupted. To reconnect to PostgreSQL, verify your `DATABASE_URL` in `.env`.

### 3. Production Start Fails with "FATAL SECURITY CONFIGURATION"
- **Cause**: `ENVIRONMENT=production` is set, but `SECRET_KEY` is still using the default development placeholder.
- **Fix**: Generate a cryptographically secure random string and assign it in `.env`:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```

### 4. CORS Error in Browser Console
- **Cause**: The frontend URL is not listed in `CORS_ORIGINS`.
- **Fix**: Add your frontend URL (e.g. `https://your-domain.com`) to `CORS_ORIGINS` in `.env`.

---

## 🧪 Running Automated Tests

Run the complete test suite (both unit tests and end-to-end integration flow):

```bash
# Run all pytest suites
pytest tests/

# Run end-to-end system verification flow
python test_app.py

# Or run everything via npm
npm test
```

### Verified Test Coverage:
- ✅ Authentication, JWT generation, and password hashing
- ✅ Supabase Google OAuth SSO auto-provisioning
- ✅ Role-Based Access Control (RBAC) & IDOR prevention guards
- ✅ Battalion & College administrative creation
- ✅ Wing & Gender military validation matrix (SD, SW, JD, JW)
- ✅ Mentor registration and Admin verification pipeline
- ✅ 9-Pillar rubric scoring and focus priority updates
- ✅ Mock examination scoring engine, answer key shielding, and timers
- ✅ Officer exam analytics, cadet deep-dive diagnostic, and psychometrics
- ✅ Syllabus books and handbooks library CRUD
- ✅ Parade attendance muster rolls and qualification statistics

---

## 📜 License
Built for the National Cadet Corps (NCC) digital transformation. Licensed under the [MIT License](LICENSE).
