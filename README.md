# SECOND LIFE — Verified Student Experience Platform
**Tagline: From Schoolwork to Real-World Experience.**

SECOND LIFE is an educational technology (EdTech) platform that connects **SMA/SMK/PKBM Students**, **UMKM (Small and Medium Enterprises)**, **Schools**, **Teachers/Mentors**, and **Platform Administrators** around the structured **SHOW → TRY → VERIFY** framework and a mandatory **Six-Stage Student Safety System**.

---

## 1. Core Operational Framework

1. **SHOW (`Portfolio Registration`)**: Students upload 1–3 existing school projects, vocational practicums, or extracurricular works. Supervising teachers verify student identity, classroom originality, contribution declarations, and publication permissions before any work appears in public or business discovery.
2. **TRY (`Supervised Micro-Assignments`)**: Verified UMKM offer bounded, student-appropriate creative or administrative assignments with explicit deliverables, revision limits, and mandatory monetary compensation for commercial usage. Assignments require Platform Admin moderation (Stage 2) and Teacher Approval + Guardian Consent (Stage 3) before a student can begin work (Stage 4).
3. **VERIFY (`Verified Experience Passport`)**: UMKM evaluate deliverables against 5 structured criteria (Stage 5), the school verifies the completion evidence, and the Platform Administrator confirms compensation settlement and copyright closure (Stage 6) to issue an auditable **Verified Experience Passport** record.

---

## 2. Project Directory Structure

```text
second-life/
├── .env.example                      # Environment variable configuration template
├── package.json                      # Project metadata and scripts
├── tsconfig.json                     # TypeScript configuration
├── start.bat                         # One-click Windows launcher
├── start.ps1                         # PowerShell launcher
├── database/
│   ├── schema.sqlite.sql             # 24-entity SQLite relational schema
│   ├── schema.postgres.sql           # 24-entity PostgreSQL / Supabase migration schema
│   └── google-apps-script-bridge.gs  # Optional Google Sheets / Apps Script webhook bridge
├── src/
│   ├── server.ts                     # Multi-page HTTP server & router (45+ dedicated routes)
│   ├── types/
│   │   └── domain.ts                 # TypeScript interfaces, roles, statuses & 6 safety stages
│   ├── lib/
│   │   ├── db.ts                     # Relational SQLite database layer & Demo Data isolation
│   │   ├── auth.ts                   # Scrypt password hashing, HTTP sessions & RBAC guards
│   │   ├── audit.ts                  # Immutable audit trail logger & notification dispatcher
│   │   ├── status-engine.ts          # Centralized Assignment Status Engine & Passport validator
│   │   └── adapters/
│   │       └── google-sheets.ts      # Modular Google Sheets / Apps Script adapter
│   ├── views/
│   │   ├── layout.ts                 # Brand design system, Lucide SVG icons & role layouts
│   │   ├── public.ts                 # Public website pages (/, /about, /how-it-works, /explore, auth)
│   │   ├── student.ts                # 9 Student dashboard pages + detail pages (/student/*)
│   │   ├── business.ts               # 7 UMKM dashboard pages + detail pages (/business/*)
│   │   ├── mentor.ts                 # 9 Teacher/Mentor dashboard pages (/mentor/*)
│   │   ├── school.ts                 # 9 School Administrator pages (/school/*)
│   │   └── admin.ts                  # 11 Platform Administrator pages (/admin/*)
│   └── routes/
│       └── api.ts                    # Backend action handlers, file uploads, CSV exports & RBAC
└── tests/
    └── e2e-workflow.test.ts          # 9-part automated E2E workflow & security QA test suite
```

---

## 3. Installation & Running Locally

### Option A — Using System Node.js (>= 22.6 / 24.x)
```powershell
cd C:\Users\DELL\.gemini\antigravity\scratch\second-life
cp .env.example .env
node src/server.ts
```

### Option B — Zero-Install Windows Launcher (Bundled Antigravity Node v24 Runtime)
If global `node` is not in your Windows system `PATH`, run the included launcher script which automatically uses the bundled Node v24.22.0 runtime (`node:sqlite` + native TypeScript):
```powershell
cd C:\Users\DELL\.gemini\antigravity\scratch\second-life
.\start.ps1
# or double-click start.bat
```
Then open `http://localhost:3000` in your browser.

---

## 4. Default & Demo Credentials

### Production Bootstrap Administrator
- **Platform Admin**: `admin@secondlife.id` / `AdminSecondLife!2026`

### Labeled Synthetic Demo Accounts (Active when "Load Labeled Demo Dataset" is clicked in the top banner)
All demo records are tagged `DEMO DATA` (`is_demo = 1`), kept strictly separate from production analytics (`is_demo = 0`), and can be purged with one click:
- **Student (SMA/SMK)**: `student.demo@secondlife.id` / `DemoPass!2026`
- **UMKM Partner**: `umkm.demo@secondlife.id` / `DemoPass!2026`
- **Teacher / Mentor**: `mentor.demo@secondlife.id` / `DemoPass!2026`
- **School Administrator**: `school.demo@secondlife.id` / `DemoPass!2026`

---

## 5. Testing & Quality Assurance Documentation

Run the automated end-to-end test suite verifying all 9 QA categories (Public empty-state integrity, RBAC route protection, School onboarding, Multi-role registration, Portfolio SHOW lifecycle, 13-step Assignment TRY→VERIFY→PASSPORT lifecycle, Cross-school & Cross-student security blocks, File access control, and Demo data isolation):

```powershell
cd C:\Users\DELL\.gemini\antigravity\scratch\second-life
$env:ELECTRON_RUN_AS_NODE="1"
& "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe" --test tests/e2e-workflow.test.ts | Out-String
```

---

## 6. Deployment Instructions

1. **Database**:
   - For single-node or school appliance deployments, the built-in WAL-mode SQLite database (`./data/second_life.sqlite`) requires zero external database servers.
   - For cloud multi-instance deployments (Supabase / Railway / Cloud SQL), run `database/schema.postgres.sql` against your PostgreSQL database and set `DATABASE_URL` in `.env`.
2. **Environment Variables**:
   - Copy `.env.example` to `.env` and configure strong `SESSION_SECRET` and `CSRF_SECRET` values.
3. **Optional Google Sheets / Apps Script Mirror**:
   - Follow the instructions in `database/google-apps-script-bridge.gs` and `/admin/settings` to connect a Google Spreadsheet mirror if desired.
