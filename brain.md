# 🧠 BRAIN.MD: NCC Command & Battalion Management System

> **Central System Architecture, Domain Knowledge, Technical Specifications & Blueprint**  
> *Project: National Cadet Corps (NCC) Command & Battalion Digital Operations OS*  
> *Version: 2.0.0 (Cyber-Command Architecture)*

---

## 📑 Table of Contents
1. [Executive Summary & Mission](#1-executive-summary--mission)
2. [Full Technology Stack](#2-full-technology-stack)
3. [Architecture Overview & System Topology](#3-architecture-overview--system-topology)
4. [Role-Based Access Control (RBAC) & Security Matrix](#4-role-based-access-control-rbac--security-matrix)
5. [Database Schema & Entity-Relationship Model](#5-database-schema--entity-relationship-model)
6. [Core Functional Modules](#6-core-functional-modules)
   - [6.1 9-Dimensional Cadet Evaluation Engine](#61-9-dimensional-cadet-evaluation-engine)
   - [6.2 NCC Mock Test & Certificate Examination Engine](#62-ncc-mock-test--certificate-examination-engine)
   - [6.3 Psychometrics & Item Analysis Pipeline](#63-psychometrics--item-analysis-pipeline)
   - [6.4 Real-Time Battalion Leaderboard Engine](#64-real-time-battalion-leaderboard-engine)
   - [6.5 AI Command Suite & Performance Regimens](#65-ai-command-suite--performance-regimens)
   - [6.6 Parade Attendance & Operations Management](#66-parade-attendance--operations-management)
7. [Frontend Architecture & Cyber-Command Design System](#7-frontend-architecture--cyber-command-design-system)
8. [Backend API Surface & Endpoint Reference](#8-backend-api-surface--endpoint-reference)
9. [Validation Matrix & Business Rules](#9-validation-matrix--business-rules)
10. [Testing Suite & Quality Assurance](#10-testing-suite--quality-assurance)
11. [Deployment, Environment & Operations](#11-deployment-environment--operations)
12. [Maintenance, Extension & Developer Guidelines](#12-maintenance-extension--developer-guidelines)

---

## 1. Executive Summary & Mission

The **NCC Command & Battalion Management System** is an enterprise-grade digital operating system engineered for the **National Cadet Corps (NCC)**. It unifies battalion administration, cadet dossiers, officer evaluations, automated examination testing, psychometric question analysis, and AI-driven training regimens into a single, high-performance web platform.

### Core Objectives
- **Digitalize Battalion Hierarchy**: Manage Directorates, Battalions, Affiliated Colleges, Associate NCC Officers (ANOs / Mentors), and Cadets (SD / SW).
- **Objective Multi-Pillar Scoring**: Replace subjective manual paperwork with an empirical 9-pillar rubric scoring system.
- **Official Certificate Exam Readiness**: Prepare cadets for **Certificate A, B, and C** examinations with anti-leakage, server-authoritative mock tests.
- **AI Performance Synthesis**: Provide automated diagnosis of physical, drill, and academic weaknesses with tailored drill-and-study regimens.
- **Cyber-Command UX**: Present a glassmorphic, high-contrast, military-themed tactical user interface for high situational awareness.

---

## 2. Full Technology Stack

### 🖥️ Backend
- **Runtime & Framework**: Python 3.10+ / FastAPI (`fastapi>=0.110.0`, `uvicorn>=0.28.0`)
- **ORM & Data Layer**: SQLAlchemy 2.0 (`sqlalchemy>=2.0.28`)
- **Validation & Schemas**: Pydantic v2 (`pydantic>=2.6.4`, `pydantic-settings>=2.2.1`)
- **Database Engine**: 
  - **Production/Staging**: Supabase Managed PostgreSQL (Connection Pooling over port 6543 / Direct port 5432)
  - **Local/Test**: SQLite 3 with WAL (Write-Ahead Logging) mode and in-memory test isolation
- **Authentication & Cryptography**: JWT tokens (`pyjwt>=2.8.0`), Direct `bcrypt` password hashing (`bcrypt>=4.1.2`)
- **Serverless Adapter**: `@vercel/python` via [api/index.py](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/api/index.py)

### 🎨 Frontend
- **Framework & Build**: React 18.2 (`react`, `react-dom`), Vite 5.1 (`@vitejs/plugin-react`)
- **Routing**: `react-router-dom` v6 with dynamic route guards (`PermissionGuard`)
- **Icons**: `lucide-react`
- **Charts & Data Visualization**: Interactive HTML5 Canvas / SVG Radar & Area charts
- **Styling Architecture**: Vanilla CSS design tokens, Glassmorphism, CSS Variables, responsive grid (`frontend/src/index.css`)

### 🛠️ Tooling & Orchestration
- **Development Launcher**: Node.js multi-process supervisor ([dev.js](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/dev.js)) supporting cross-platform (Windows PowerShell, macOS, Linux)
- **Testing**: `pytest`, `httpx` (async test client), `test_app.py`

---

## 3. Architecture Overview & System Topology

```
+-----------------------------------------------------------------------------------+
|                                CLIENT LAYER (Browser)                             |
|  React 18 + Vite | Cyber-Command Glassmorphic UI | PermissionGuard | AuthContext  |
+-----------------------------------------------------------------------------------+
                                         │  HTTPS / JSON / Bearer JWT
                                         ▼
+-----------------------------------------------------------------------------------+
|                               API GATEWAY (FastAPI)                               |
|  CORS Middleware | JWT Dependency (get_current_user) | Request Logging / Health    |
+-----------------------------------------------------------------------------------+
                                         │
       ┌─────────────────┬───────────────┴───────────────┬──────────────────┐
       ▼                 ▼                               ▼                  ▼
+─────────────+   +──────────────+              +─────────────────+   +───────────────+
| Auth & RBAC |   | Battalion &  |              | 9-Pillar Eval & |   | NCC Mock Test |
| Controller  |   | Cadet Roster |              | Leaderboard Ops |   | Engine & Psych|
+─────────────+   +──────────────+              +─────────────────+   +───────────────+
       │                 │                               │                  │
       └─────────────────┼───────────────────────────────┼──────────────────┘
                         ▼                               ▼
+-----------------------------------------------------------------------------------+
|                                BUSINESS LOGIC SERVICES                            |
|  - AuthService         - CadetService          - EvaluationService                |
|  - MentorService       - LeaderboardService    - NCCMockTestService (Psychometrics)|
|  - AIInsightService    - OpsService (Attendance, Tasks)                           |
+-----------------------------------------------------------------------------------+
                                         │  SQLAlchemy ORM
                                         ▼
+-----------------------------------------------------------------------------------+
|                                DATA PERSISTENCE LAYER                             |
|  PostgreSQL (Supabase) / Local SQLite (ncc.db) with Auto-Migrations & Seeders     |
+-----------------------------------------------------------------------------------+
```

---

## 4. Role-Based Access Control (RBAC) & Security Matrix

The system enforces strict multi-level access control combining **Role + Permission + Tenant Scope**.

### 👥 User Roles & Personas
1. **HQ Commander (`admin`)**:
   - Full organizational jurisdiction across all Battalions, Colleges, and Units.
   - Manages officer verifications, institutional onboarding, system audits, and question bank governance.
2. **Battalion Mentor / ANO (`mentor`)**:
   - Associate NCC Officer assigned to a specific Battalion / Affiliated College.
   - Conducts 9-pillar cadet evaluations, logs daily parade attendance, and assigns tasks.
3. **Active Cadet (`cadet`)**:
   - Registered student cadet belonging to Senior Division (`SD` - Male) or Senior Wing (`SW` - Female).
   - Views personal evaluation dossier, takes official mock tests, and receives AI-generated regimens.

### 🛡️ Permission Map (`ROLE_PERMISSIONS`)

| Permission Key | Cadet | Mentor | Admin | Description |
| :--- | :---: | :---: | :---: | :--- |
| `dashboard.view` | ✅ | ✅ | ✅ | Access role-specific primary dashboard |
| `profile.view` | ✅ | ✅ | ✅ | View and edit personal profile dossier |
| `cadets.view_assigned` | ❌ | ✅ | ❌ | View cadets within the mentor's unit |
| `cadets.manage` | ❌ | ❌ | ✅ | Global cadet registry CRUD & assignments |
| `mentors.manage` | ❌ | ❌ | ✅ | Approve, verify, or suspend ANO mentors |
| `battalions.manage` | ❌ | ❌ | ✅ | Create and manage battalions and colleges |
| `divisions.manage` | ❌ | ❌ | ✅ | Manage Army, Navy, Air wing divisions |
| `performance.view_self` | ✅ | ❌ | ❌ | View self 9-pillar score breakdown |
| `performance.evaluate` | ❌ | ✅ | ❌ | Submit evaluation scores for assigned cadets |
| `performance.manage` | ❌ | ❌ | ✅ | HQ-level score inspection and calibration |
| `attendance.view_self` | ✅ | ❌ | ❌ | View personal parade attendance percentage |
| `attendance.record` | ❌ | ✅ | ❌ | Mark daily muster roll and parade records |
| `attendance.manage` | ❌ | ❌ | ✅ | Battalion-wide attendance audits |
| `mock_tests.view` | ✅ | ✅ | ✅ | Access examination arena and question bank |
| `ai_insights.view_self` | ✅ | ❌ | ❌ | Cadet-specific AI weaknesses and regimens |
| `ai_suite.view_mentor` | ❌ | ✅ | ❌ | Battalion-level AI analytics and insights |
| `ai_suite.manage` | ❌ | ❌ | ✅ | Full AI diagnostic command suite |
| `reports.view` | ❌ | ✅ | ❌ | Unit-level statistical reports |
| `reports.manage` | ❌ | ❌ | ✅ | Directorate-wide printable inspection reports |

---

## 5. Database Schema & Entity-Relationship Model

```mermaid
erDiagram
    USERS ||--o| CADETS : "profile (if cadet)"
    USERS ||--o| MENTORS : "profile (if mentor)"
    BATTALIONS ||--o{ COLLEGES : "affiliates"
    COLLEGES ||--o{ CADETS : "enrolls"
    BATTALIONS ||--o{ MENTORS : "assigns"
    CADETS ||--o{ EVALUATIONS : "receives"
    MENTORS ||--o{ EVALUATIONS : "submits"
    CADETS ||--o{ PARADE_ATTENDANCE : "logged_in"
    CADETS ||--o{ NCC_MOCK_TEST_SESSIONS : "attempts"
    NCC_MOCK_TEST_QUESTIONS ||--o{ NCC_MOCK_TEST_ANSWERS : "answered_in"
    NCC_MOCK_TEST_SESSIONS ||--o{ NCC_MOCK_TEST_ANSWERS : "contains"
```

### Core Schema Definitions
1. **`users`**: Authentication table with `email`, `hashed_password`, `full_name`, `role` (`admin`/`mentor`/`cadet`), `is_active`, `phone`.
2. **`battalions`**: Military unit table with `name`, `code` (e.g., `1CG-BN`), `state`, `city`, `wing` (`Army`/`Navy`/`Air`).
3. **`colleges`**: Educational institutes affiliated with a battalion (`name`, `code`, `battalion_id`, `address`).
4. **`cadets`**: Cadet profiles with `user_id`, `regimental_number` (Unique ID, e.g., `NCC/2026/SD/1042`), `rank`, `wing`, `gender_division` (`SD`/`SW`), `enrollment_year`, `college_id`, `battalion_id`.
5. **`mentors`**: ANO officer profiles with `user_id`, `officer_number`, `rank`, `battalion_id`, `is_verified`.
6. **`evaluations`**: Evaluation instances with 9 score pillars (float `0.0`-`10.0`), `composite_score`, `cadet_id`, `mentor_id`, `remarks`, `evaluated_at`.
7. **`ncc_mock_test_questions`**: Item bank questions with `question_text`, `options` (JSON array of 4 strings), `correct_option` (0-3), `explanation`, `topic`, `difficulty`, `certificate_level` (`A`/`B`/`C`), `wing`.
8. **`ncc_mock_test_sessions`**: User exam attempts with `session_type`, `total_questions`, `score`, `percentage`, `started_at`, `expires_at`, `submitted_at`, `is_completed`.
9. **`ncc_mock_test_answers`**: Individual question responses in a session (`session_id`, `question_id`, `selected_option`, `is_correct`, `time_spent_seconds`).
10. **`parade_attendance`**: Attendance ledger tracking dates, status (`present`/`absent`/`excused`), and parade type.

---

## 6. Core Functional Modules

### 6.1 9-Dimensional Cadet Evaluation Engine

Cadet proficiency is computed across **9 standardized pillars** calibrated on an interactive **0.0 to 10.0 continuous decimal scale**:

```
                              [1. Drill & Precision]
                                       │
     [9. Attendance & Camps] ──────────┼────────── [2. Physical Fitness]
               │                       │                       │
     [8. Teamwork & Morale] ────────── ┼ ────────── [3. Weapon Firing]
               │                       │                       │
     [7. Parade Punctuality] ──────────┼────────── [4. Command & Leadership]
                                       │
                         [6. Discipline & Conduct]
                                       │
                        [5. NCC & Military Knowledge]
```

#### Scoring Badge Tiers:
- **ALPHA (9.0 - 10.0)**: Exemplary commander-grade performance.
- **BRAVO (7.5 - 8.9)**: Proficient operational standard.
- **CHARLIE (5.0 - 7.4)**: Basic standard met; requires targeted conditioning.
- **DELTA (< 5.0)**: Critical deficiency; triggers mandatory AI regimen.

---

### 6.2 NCC Mock Test & Certificate Examination Engine

Built to replicate the rigorous testing environment of the **NCC Directorate Certification Exams (Certificates A, B, and C)**.

#### 19 Configured Official Syllabus Topics:
1. NCC Organisation & History
2. Aim, Motto, Pledge & Song
3. Ranks & Insignia
4. Wings (Army, Navy, Air)
5. Certificate Exam Structure (A/B/C)
6. Camps & National Events
7. Drill & Drill Commands
8. Weapon Training (.22 Rifle, 7.62mm SLR, 5.56mm INSAS)
9. Map Reading & Prismatic Compass
10. Field Craft & Battle Craft (FC/BC)
11. Leadership & Personality Traits
12. National Integration & Indian Culture
13. Disaster Management & Civil Defence
14. Social Service & Community Development
15. Health, Hygiene & Sanitation
16. First Aid & Emergency Response
17. Adventure Activities & Expeditions
18. Self-Defence & Unarmed Combat
19. Military History & Paramilitary Forces

#### 5 Operational Examination Modes:
1. **Full Mock Blueprint**: Balanced distribution mirroring actual Directorate certification exams.
2. **Certificate-Wise Practice**: Tailored strictly to **Cert A** (Junior), **Cert B** (2nd-year Senior), or **Cert C** (3rd-year Senior).
3. **Topic-Wise Technical Drill**: Focused practice on chosen syllabus domains with custom question counts.
4. **Quick 20-Q Sprint**: High-velocity 20-question rapid-fire test for daily retention.
5. **Targeted Weak-Area Practice**: Algorithmic spaced-repetition pulling from topics where the cadet's historical accuracy is $< 50\%$.

#### Security & Anti-Cheat Controls:
- **Server-Authoritative Timer**: Stored in database as `expires_at`. Submissions received after expiration timestamp are rejected (HTTP 400).
- **Zero-Leakage Option Payloads**: The client receives shuffled options (`A`, `B`, `C`, `D`) without `correct_option` or `explanation` until after final submission.
- **Background Auto-Save**: Cadet answer selections sync asynchronously in real time to prevent progress loss during connection drops.
- **Marking Scheme**: `+1.0` for correct response, `-0.25` negative marking penalty, `0.0` for unattempted.

---

### 6.3 Psychometrics & Item Analysis Pipeline

Located at `/ncc-mock-tests/pipeline`, this module provides psychometric quality assurance over the NCC question bank:

$$\text{Difficulty Index } (P) = \frac{\text{Correct Attempts}}{\text{Total Attempts}}$$

$$\text{Discrimination Index } (D) = P_{\text{top 27\% cohort}} - P_{\text{bottom 27\% cohort}}$$

- **Quality Classification Flags**:
  - `too_hard`: $P < 0.20$
  - `too_easy`: $P > 0.90$
  - `negative_discrimination`: $D < 0.0$ (Higher rate of failure among top cadets indicates flawed key)
  - `ambiguous_key`: High distractor selection (>35%) indicates confusing wording.
- **Bulk CSV Importer**: Batch import utility with row-by-row structural validation.

---

### 6.4 Real-Time Battalion Leaderboard Engine

- Computes live rank standings across Battalions, Colleges, and Cadets.
- Eliminates stale cache invalidation bugs by executing composite aggregation queries in PostgreSQL/SQLite.
- Ranks cadets based on combined score: Evaluation composite score, parade attendance rate, and mock test percentage.

---

### 6.5 AI Command Suite & Performance Regimens

The AI engine analyzes multi-dimensional evaluation results and mock test telemetry to generate targeted improvement prescriptions:
- **Weakness Diagnosis**: Detects underperforming metrics (e.g., Weapon Handling $< 6.0$ or Map Reading accuracy $< 45\%$).
- **7-Day Corrective Regimen**: Generates concrete daily physical drills, dry-firing practice routines, or study reading chapters.
- **Cadet Readiness Forecast**: Predicts Certificate A/B/C pass probability with actionable insights.

---

### 6.6 Parade Attendance & Operations Management

- Daily roll-call ledger for morning parades, ceremonial drills, and annual training camps (ATC/CATC/RDC/TSC).
- Dynamic attendance thresholding with visual warnings for cadets below the mandatory 75% attendance criterion for certificate exam eligibility.

---

## 7. Frontend Architecture & Cyber-Command Design System

### 🎨 Visual Theme & Tokens (`frontend/src/index.css`)
- **Aesthetic**: Tactical Cyber-Command Glassmorphism with dark slate backgrounds, luminous accents, and high-legibility typography.
- **Palette**:
  - Background Base: `#0a0f18` / `#0f172a`
  - Glass Card Surface: `rgba(15, 23, 42, 0.75)` with `backdrop-filter: blur(12px)`
  - Tactical Green: `#10b981` (Alpha / Success)
  - Gold / Brass Accent: `#f59e0b` (Cadet Honor / Bravo)
  - Cyber Cyan / Blue: `#06b6d4` / `#3b82f6` (System / Info)
  - Alert Red: `#ef4444` (Delta / Deficiency)
  - Border Glass: `rgba(255, 255, 255, 0.08)`

### 📂 Frontend Directory Structure
```
frontend/src/
├── api/
│   └── client.js              # Axios/Fetch wrapper with JWT auto-injection & 401 handling
├── components/
│   ├── AppShell.jsx           # Master layout with responsive sidebar, header, role badge
│   ├── Navigation.jsx         # RBAC-filtered dynamic navigation links
│   ├── PermissionGuard.jsx    # Client route protection
│   ├── CadetProfileModal.jsx  # Detailed cadet dossier view & evaluation modal
│   ├── PasswordStrengthMeter.jsx # 4-tier visual password security meter
│   └── ui/                    # Reusable glassmorphic cards, buttons, badges, tables
├── config/
│   └── navigationConfig.js    # Centralized RBAC permissions and route definitions
├── context/
│   └── AuthContext.jsx        # JWT state, user session, login/logout presets
├── pages/
│   ├── dashboards/
│   │   ├── AdminDashboard.jsx    # HQ Battalion metrics, user approvals, unit health
│   │   ├── MentorDashboard.jsx   # Unit parade readiness, assigned cadets, scoring queue
│   │   └── StudentDashboard.jsx  # Personal dossier, upcoming drills, mock test progress
│   ├── NCCMockTestHub.jsx        # Exam mode selection & history dossier
│   ├── NCCMockTestArena.jsx      # High-focus exam interface with timer & option shuffling
│   ├── NCCMockTestResults.jsx    # Detailed question review with explanations
│   ├── NCCQuestionPipeline.jsx   # Item analysis, distractor charts, CSV importer
│   ├── AISuiteView.jsx           # AI Diagnostic hub and regimen planner
│   ├── AttendanceView.jsx        # Parade muster roll & attendance recording
│   ├── PerformanceView.jsx       # 9-Pillar radar evaluation studio
│   ├── CadetsView.jsx            # Cadet roster management with filtering
│   ├── MentorsView.jsx           # ANO officer registry & verification
│   ├── BattalionsView.jsx        # Battalion & College infrastructure manager
│   ├── Leaderboard.jsx           # Real-time battalion and cadet standing table
│   └── Login.jsx                 # Tactical login with quick-preset credentials
```

---

## 8. Backend API Surface & Endpoint Reference

### Base Route: `/api/v1` (or `/v1`)

| Module | Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/login` | Public | Authenticates credentials and returns JWT bearer token |
| **Auth** | `GET` | `/auth/me` | Authenticated | Returns currently authenticated user object and role |
| **Cadets** | `GET` | `/cadets` | Mentor, Admin | List cadets (scoped to mentor's battalion if mentor) |
| **Cadets** | `POST` | `/cadets` | Admin | Register new cadet profile and regimental ID |
| **Cadets** | `GET` | `/cadets/{id}` | Authenticated | Fetch specific cadet dossier |
| **Mentors** | `GET` | `/mentors` | Admin | List all ANO officers and verification status |
| **Mentors** | `POST` | `/mentors/{id}/verify` | Admin | Verify and activate an ANO officer account |
| **Battalions** | `GET` | `/colleges/battalions` | Authenticated | List all configured NCC Battalions |
| **Battalions** | `POST` | `/colleges/battalions` | Admin | Create a new NCC Battalion |
| **Colleges** | `GET` | `/colleges` | Authenticated | List affiliated colleges |
| **Colleges** | `POST` | `/colleges` | Admin | Register affiliated college under a battalion |
| **Evaluations** | `POST` | `/evaluations` | Mentor, Admin | Submit 9-pillar evaluation scores for a cadet |
| **Evaluations** | `GET` | `/evaluations/cadet/{id}`| Authenticated | Get historical evaluation record of a cadet |
| **Mock Tests** | `POST` | `/ncc-mock-tests/start` | Cadet, Mentor | Initialize exam session (returns questions without keys)|
| **Mock Tests** | `POST` | `/ncc-mock-tests/answer`| Cadet, Mentor | Save single answer selection in real-time |
| **Mock Tests** | `POST` | `/ncc-mock-tests/submit`| Cadet, Mentor | Finalize test session, compute score & return review |
| **Mock Tests** | `GET` | `/ncc-mock-tests/review/{id}`| Authenticated| Detailed post-exam review with explanations |
| **Mock Tests** | `GET` | `/ncc-mock-tests/pipeline/items`| Admin, Mentor | Psychometric item stats ($P$, $D$, Distractors) |
| **Mock Tests** | `POST` | `/ncc-mock-tests/pipeline/import`| Admin | Bulk import questions via CSV format |
| **Leaderboard**| `GET` | `/ops/leaderboard` | Authenticated | Real-time aggregate unit & cadet leaderboard |
| **Attendance** | `GET` | `/ops/attendance` | Authenticated | List attendance records |
| **Attendance** | `POST` | `/ops/attendance` | Mentor, Admin | Record parade muster roll |
| **AI Insights**| `GET` | `/ai-insights/cadet/{id}`| Authenticated | Generate AI weakness analysis and 7-day regimen |

---

## 9. Validation Matrix & Business Rules

1. **Password Security**:
   - Minimum 8 characters strictly enforced.
   - Evaluated against a 4-tier strength metric (*Weak / Fair / Strong / Cyber-Grade Encrypted*).
2. **Mobile Numbers**: Exactly 10 digits required; non-numeric characters stripped automatically.
3. **Battalion Codes**: Formatted into uppercase alphanumeric symbols (e.g. `1CG-BN`, `10MAH-BN`).
4. **NCC Wing & Gender Division Alignment**:
   - **Army Wing**: Senior Division (`SD` - Male), Senior Wing (`SW` - Female).
   - **Navy Wing**: Senior Division (`SD` - Male), Senior Wing (`SW` - Female).
   - **Air Wing**: Senior Division (`SD` - Male), Senior Wing (`SW` - Female).
5. **Evaluation Boundaries**: Each of the 9 scoring dimensions must be a float in the range $[0.0, 10.0]$. Composite score is the unweighted arithmetic mean.
6. **Exam Timers**: Submissions with timestamps $> \text{expires\_at} + 30\text{s}$ grace period are automatically rejected.

---

## 10. Testing Suite & Quality Assurance

The codebase includes automated test suites covering API contract validation, RBAC boundaries, scoring calculations, and exam integrity:

```bash
# Run full test suite with pytest
pytest tests/ -v

# Run dedicated NCC Mock Test and psychometrics tests
pytest tests/test_ncc_mock_test.py -v

# Run end-to-end integration and RBAC test runner
python test_app.py
```

### Verified Assertions:
1. `/health` gateway probe verification.
2. Admin, Mentor, and Cadet authentication flows and JWT issuance.
3. Battalion & Affiliated College hierarchy integrity.
4. 9-Pillar rubric boundary constraints ($0.0 \dots 10.0$).
5. Question bank zero-leakage test (correct options excluded from exam session payload).
6. Server-side session expiration enforcement.
7. Psychometric item analysis calculations ($P$ and $D$).
8. Real-time leaderboard aggregation accuracy.

---

## 11. Deployment, Environment & Operations

### 🚀 Unified Dev Runner
Start both backend (FastAPI, Port 8000) and frontend (Vite, Port 5173) in one step:
```bash
npm run dev
```

### 🌐 Key Access URLs
- **Frontend App**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Health Endpoint**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### ☁️ Environment Variables Configuration (`.env`)
```ini
# Database
DATABASE_URL=postgresql://postgres.xxx:xxx@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres

# Security & Tokens
SECRET_KEY=ncc-battalion-system-production-secret-key-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=*

# Supabase Integration
SUPABASE_URL=https://fmeudqnaezssadagvylc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend Vite Client
VITE_API_BASE_URL=/api/v1
VITE_SUPABASE_URL=https://fmeudqnaezssadagvylc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 📦 Vercel Serverless Architecture
- `vercel.json` routes `/api/v1/(.*)` and `/v1/(.*)` to `api/index.py` via `@vercel/python`.
- Static frontend builds output to `frontend/dist`.
- **Serverless DB Resilience**: In Vercel Serverless, the root directory is read-only. `app/db/session.py` automatically detects serverless environments and redirects local SQLite fallback to `/tmp/ncc.db` (the only writable directory). It copies bundled seed files to preserve data, runs schema DDL idempotently on cold-start via `ensure_db_ready()`, and uses `NullPool` for PostgreSQL to avoid exhausting Supabase pool connections.
- **Mock Test Zero-Failure Safeguard**: `native_enum=False` on all mock test SQLAlchemy columns prevents PostgreSQL enum datatype mismatches, response schemas use flexible types, and transactions rollback cleanly if a query fails.


---

## 12. Maintenance, Extension & Developer Guidelines

1. **Adding New Navigation Routes**:
   - Update [navigationConfig.js](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/frontend/src/config/navigationConfig.js) with the permission key and role mapping.
   - Add the corresponding component route inside [App.jsx](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/frontend/src/App.jsx) wrapped in `<PermissionGuard requiredPermission="...">`.
2. **Adding New Evaluation Pillars**:
   - If official NCC guidelines add an evaluation pillar, update [app/models/evaluation.py](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/app/models/evaluation.py), the Pydantic schema in [app/schemas/evaluation.py](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/app/schemas/evaluation.py), and the radar chart in [PerformanceView.jsx](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/frontend/src/pages/PerformanceView.jsx).
3. **Question Bank Additions**:
   - Use the CSV Importer UI at `/ncc-mock-tests/pipeline` or seed directly via [app/services/ncc_seed_data.py](file:///c:/Users/dayitva%20raj%20karsh/OneDrive/Desktop/New%20folder/ncc-management/app/services/ncc_seed_data.py).
4. **Code Quality & Style**:
   - Python: Follow PEP 8 guidelines and type hinting throughout all services and endpoints.
   - React: Use functional components, custom hooks, and semantic CSS class naming.
