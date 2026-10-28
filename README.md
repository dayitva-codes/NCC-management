# 🇮🇳 CADET-360: National Cadet Corps Command & Evaluation Platform

> **CADET-360** is an enterprise-grade Cadet & Battalion Operations OS built with **FastAPI**, **SQLAlchemy**, **Supabase PostgreSQL / SQLite**, and **React + Vite**. Features official NCC branding, 9-dimensional military evaluations with customizable focus priorities, psychometric mock test examinations, Raipur Group battalion-college pairings, and real-time leaderboards.

---

## 💻 How to Run on a Different PC (Step-by-Step Setup)

Follow these steps to get CADET-360 running on any new Windows, Mac, or Linux computer:

### 1. Prerequisites
- **Git**: [git-scm.com](https://git-scm.com/)
- **Python 3.10+**: [python.org](https://www.python.org/)
- **Node.js 18+ & npm**: [nodejs.org](https://nodejs.org/)

### 2. Clone the Repository
```bash
git clone https://github.com/dayitva-codes/NCC-management.git
cd NCC-management
```

### 3. Setup Python Virtual Environment & Backend
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
venv\Scripts\activate.bat
# macOS / Linux:
source venv/bin/activate

# Install Python backend dependencies
pip install -r requirements.txt
```

### 4. Setup Frontend Dependencies
```bash
# Install root orchestration dependencies
npm install

# Install React frontend dependencies
cd frontend
npm install
cd ..
```

### 5. Configure Environment Variables (`.env`)
Copy the provided `.env.example` to `.env`:
```bash
# Windows:
copy .env.example .env
# macOS / Linux:
cp .env.example .env
```
> **Note**: If `DATABASE_URL` is left commented out or points to an offline database, the system **automatically and safely falls back to local SQLite (`ncc.db`)** and seeds all 16 Battalions and 32 Colleges instantly!

### 6. Launch the Application (One Command)
From the project root:
```bash
npm run dev
```
This concurrently starts:
- **Backend API Gateway**: `http://127.0.0.1:8000` (FastAPI + Swagger Docs at `/docs`)
- **Frontend Web UI**: `http://127.0.0.1:5173` (CADET-360 Terminal)

---

## ⚡ Access URLs
| Service | URL | Description |
| :--- | :--- | :--- |
| **CADET-360 Web Terminal** | [http://127.0.0.1:5173](http://127.0.0.1:5173) | Authentic cadet & officer dashboard |
| **NCC Mock Test Arena** | [http://127.0.0.1:5173/ncc-mock-tests](http://127.0.0.1:5173/ncc-mock-tests) | Certificate A/B/C exam practice & dossier |
| **Question Bank Pipeline** | [http://127.0.0.1:5173/ncc-mock-tests/pipeline](http://127.0.0.1:5173/ncc-mock-tests/pipeline) | Psychometric item analysis & CSV pipeline |
| **Backend API Gateway** | [http://127.0.0.1:8000/api/v1](http://127.0.0.1:8000/api/v1) | FastAPI endpoints & health check |
| **Interactive Swagger Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Live API testing & schema docs |


---

## 🎖️ NCC Mock Test & Certificate Exam Practice (New)

The system includes a full-featured MCQ-based mock examination engine modeled after official **NCC Certificate A, B, and C** examinations:

### ✨ Core Capabilities
- **19 Official Configurable Syllabus Topics**:
  - NCC Organisation & History, Aim/Motto/Pledge/Song, Ranks & Insignia, Wings (Army/Navy/Air), Certificates (A/B/C), Camps & Events, Drill & Drill Commands, Weapon Training (.22 Rifle, 7.62mm SLR, 5.56mm INSAS), Map Reading & Compass, Field Craft & Battle Craft, Leadership & Personality Development, National Integration & Culture, Disaster Management, Social Service & Community Development, Health & Hygiene, First Aid, Adventure Activities, Self-Defence, Environment & Ecology, Military History.
- **5 Examination & Practice Modes**:
  - **Full Mock Exam**: Blueprint-balanced distribution mirroring actual Directorate certification exams.
  - **Certificate-wise Practice**: Filtered by standard for Certificate A (JD/JW), Certificate B (SD/SW 2nd year), or Certificate C (SD/SW 3rd year).
  - **Topic-wise Technical Drill**: Deep dive into specific topics with custom question counts.
  - **Quick 20-Q Sprint**: Fast 20-minute daily review.
  - **Targeted Weak Area Practice**: Spaced-repetition mode prioritizing syllabus topics with accuracy $< 50\%$.
- **Security & Integrity Safeguards**:
  - **Zero Answer Key Leakage**: Option correct keys and handbook explanations are withheld from the client until after submission.
  - **Server-Authoritative Timer**: Countdown survives page refreshes and browser restarts; answers submitted after expiration are rejected with HTTP 400.
  - **Shuffled Options**: Every session randomizes option permutations (`A/B/C/D`) to prevent visual pattern cheating.
  - **Progressive Auto-Save**: Real-time background sync on every selection with live status indicators.
- **Scoring & Review Dossier**:
  - Standard marking scheme: **+1.0** for correct, **-0.25** negative marking for incorrect, **0.0** for unattempted.
  - Comprehensive review with question-by-question breakdown, explanations, and official NCC handbook source citations.
- **Psychometrics & Question Quality Pipeline**:
  - **Difficulty Index ($P$)**: Proportion of cadets answering correctly ($0.0 \dots 1.0$).
  - **Discrimination Index ($D$)**: Evaluates question discernment between top 27% and bottom 27% cohorts ($D = P_{\text{top}} - P_{\text{bottom}}$).
  - **Distractor Analysis**: Tracks frequency of selection across all 4 options ($A, B, C, D$).
  - **Automated Quality Flags**: `too_hard`, `too_easy`, `negative_discrimination`, and `ambiguous_key`.
  - **Bulk CSV Importer**: Row-level validation verifying valid topics, difficulty, certificate levels, wings, exactly 4 distinct options, and 0-3 answer indices.

### 🧪 Running NCC Mock Test & API Tests
```bash
# Run all 28 test suites (NCC mock test + coding test platform)
pytest tests/ -v

# Run dedicated NCC Mock Test suite
pytest tests/test_ncc_mock_test.py -v

# Run core battalion regression suite
python test_app.py
```

---

## 🔑 System Roles & Default Credentials

| Role | Email | Password | Access & Responsibilities |
| :--- | :--- | :--- | :--- |
| **HQ Commander (Admin)** | `admin@ncc.local` | `admin123` | Setup Battalions, Affiliated Colleges, Verify Mentors |
| **Battalion Mentor (ANO)** | `mentor@ncc.local` | `mentor123` | Score Cadets across 9 evaluation pillars |
| **Active Cadet** | *Self-registered* | *User defined* | View Performance Dossier, Radar Metrics, AI Action Regimens |

*Tip: Use the **`[HQ ADMIN]`**, **`[OFFICER MENTOR]`**, or **`[ACTIVE CADET]`** quick-fill preset buttons on the Login screen for instant authentication.*

---

## 🆕 Recent Updates (Role-Based Access Control & UI Redesign)

The platform has been heavily upgraded to support dynamic, **Role-Based Access Control (RBAC)** across both frontend and backend:

* **Dynamic App Shell & Navigation**: The sidebar and dashboards adapt based on the user's role (`Cadet`, `Mentor`, `Admin`).
* **Distinct Dashboards**: Introduced tailored views (`StudentDashboard`, `MentorDashboard`, `AdminDashboard`) containing role-specific metrics and tools.
* **Component-Level Security**: Modals and pages (e.g., `CadetProfileModal`) auto-configure as read-only, evaluation-enabled, or fully managed depending on permissions.
* **Route Guards**: Added `PermissionGuard` to protect frontend routes and a standard `AccessRestricted` (403) page for unauthorized attempts.
* **Backend Scoping**: API endpoints dynamically restrict queries (e.g., Mentors only see their affiliated Cadets; Admins see all).
* **Isolated Testing environment**: Enhanced `test_app.py` utilizing isolated `test_ncc.db` to prevent developer data conflicts, executing 10 passing comprehensive e2e tests.

---

## 🛡️ Limitation Rules & Validation Matrix

The platform enforces strict enterprise validation rules across all inputs:

### 1. 🔒 Passkey & Security Rules
- **Minimum 8 Characters** strictly enforced.
- **Dynamic 4-Tier Strength Meter** (*Weak / Fair / Strong / Cyber-Grade Encrypted*).
- Visual requirement checklist verifying numbers, upper-case, and lower-case combinations.

### 2. 📱 Phone & Identification Rules
- **Mobile Numbers**: Exactly 10 digits required; automatically strips non-numeric characters.
- **Battalion Codes**: Formatted into uppercase alphanumeric symbols (e.g. `1CG-BN`, `10MAH-BN`).

### 3. 🎖️ NCC Wing & Gender Matrix
| NCC Wing | Eligible Gender Divisions | Rules |
| :--- | :--- | :--- |
| **Army Wing** | `SD` (Senior Division - Male), `SW` (Senior Wing - Female) | Enforces senior collegiate divisions |
| **Navy Wing** | `SD` (Senior Division - Male), `SW` (Senior Wing - Female) | Enforces naval collegiate criteria |
| **Air Wing** | `SD` (Senior Division - Male), `SW` (Senior Wing - Female) | Enforces aviation training requirements |

### 4. 🎯 Evaluation Scoring Parameters
- Mentors assess cadets on **9 official dimensions**:
  1. *Drill & Precision*
  2. *Physical Fitness*
  3. *Weapon Firing & Handling*
  4. *Command & Leadership*
  5. *NCC & Military Knowledge*
  6. *Discipline & Conduct*
  7. *Parade Punctuality*
  8. *Teamwork & Morale*
  9. *Camp & Drill Attendance*
- Scores are calibrated on an interactive **0.0 to 10.0 scale slider** with real-time decimal precision and assessment badges (*ALPHA*, *BRAVO*, *CHARLIE*, *DELTA*).

---

## ☁️ Cloud Deployment (Vercel)

The repository is pre-configured for instant **Serverless Deployment on Vercel** (`@vercel/python` + `@vercel/static-build`).

### Vercel Project Settings
- **Framework Preset**: `Other` (or `Vite`)
- **Root Directory**: `./` (leave default root)
- **Build Command**: `npm run build`
- **Output Directory**: `frontend/dist`

### Environment Variables (`.env`)
Add the following keys in your Vercel Project Settings:

```bash
# Database
DATABASE_URL=postgresql://postgres.fmeudqnaezssadagvylc:Ncc2026Password!@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres

# Security
SECRET_KEY=local-dev-secret-key-ncc-battalion-system-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=*

# Supabase
SUPABASE_URL=https://fmeudqnaezssadagvylc.supabase.co
SUPABASE_JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZXVkcW5hZXpzc2FkYWd2eWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODgwNjA4NiwiZXhwIjoyMTA0MzgyMDg2fQ.Kq6J9dW3NO6ahVVnZ11sEEZ_vwUdjlMSbZ_srdRRXJY
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZXVkcW5hZXpzc2FkYWd2eWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODgwNjA4NiwiZXhwIjoyMTA0MzgyMDg2fQ.Kq6J9dW3NO6ahVVnZ11sEEZ_vwUdjlMSbZ_srdRRXJY

# Frontend Client
VITE_SUPABASE_URL=https://fmeudqnaezssadagvylc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZXVkcW5hZXpzc2FkYWd2eWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODgwNjA4NiwiZXhwIjoyMTA0MzgyMDg2fQ.Kq6J9dW3NO6ahVVnZ11sEEZ_vwUdjlMSbZ_srdRRXJY
VITE_API_BASE_URL=/api/v1
```

---

## 🏛️ Project Architecture

```
ncc-management/
├── api/
│   └── index.py            # Vercel serverless Python gateway
├── app/
│   ├── api/v1/             # Endpoints (auth, battalions, colleges, cadets, mentors, evaluations, leaderboard)
│   ├── core/               # Direct bcrypt security, JWT, config settings, dependencies
│   ├── db/                 # PostgreSQL pooler session & database auto-seeder
│   ├── models/             # SQLAlchemy schemas (User, Cadet, Mentor, Battalion, College, Evaluation)
│   ├── schemas/            # Pydantic data validation schemas
│   └── services/           # Business logic & AI insight engine
├── frontend/
│   ├── src/
│   │   ├── api/            # API client with auto-routing & smart error recovery
│   │   ├── components/     # AppShell, PasswordStrengthMeter, TagGuide, ConfigBar, Form controls
│   │   └── pages/          # Login, RegisterCadet, RegisterMentor, AdminHome, MentorHome, CadetHome, Leaderboard
│   ├── index.html          # Military fonts & responsive container
│   └── package.json        # Frontend build scripts
├── dev.js                  # Multi-process Windows/Linux/macOS dev launcher
├── package.json            # Root command scripts
├── requirements.txt        # Backend dependencies (Python 3.10-3.12 compatible)
├── vercel.json             # Serverless routing and static build mapping
└── test_app.py             # End-to-end integration test suite
```

---

## 🧪 Integration Testing

Run the automated test suite across all services:

```bash
pytest test_app.py
```

### Verified Test Assertions:
1. API `/health` liveness probe.
2. Admin authentication & JWT token generation.
3. Battalion & Affiliated College creation.
4. Wing & Gender validation matrix enforcement.
5. Mentor registration & Admin verification workflow.
6. 9 seeded evaluation criteria & score submissions.
7. Real-time PostgreSQL leaderboard aggregations without stale caching.
8. AI performance regimen synthesis.

---

## 📜 License & Acknowledgements
Built for National Cadet Corps (NCC) battalion digital operations. Open-source under the MIT License.
