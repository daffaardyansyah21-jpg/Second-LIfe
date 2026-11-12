-- ============================================================================
-- SECOND LIFE — Verified Student Experience Platform
-- Complete 24-Entity Relational Database Schema (PostgreSQL / Supabase)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Schools (SMA/SMK/PKBM)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  npsn TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('SMA', 'SMK', 'PKBM', 'MA')),
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  address TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  principal_name TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED')),
  invite_code TEXT NOT NULL UNIQUE,
  semester_label TEXT NOT NULL DEFAULT 'Odd Semester 2026/2027',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  school_id UUID REFERENCES schools(id),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Teachers / Mentors
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  nip_or_nik TEXT,
  subject_specialty TEXT NOT NULL,
  phone_private TEXT,
  supervision_capacity INTEGER NOT NULL DEFAULT 15,
  verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Students
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  mentor_teacher_id UUID REFERENCES teachers(id),
  nisn TEXT NOT NULL,
  grade TEXT NOT NULL,
  major TEXT NOT NULL,
  skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  bio TEXT DEFAULT '',
  contact_preference TEXT NOT NULL DEFAULT 'PLATFORM_ONLY' CHECK (contact_preference IN ('PLATFORM_ONLY', 'VIA_MENTOR_TEACHER')),
  public_portfolio_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  guardian_name TEXT,
  guardian_relationship TEXT,
  guardian_contact_private TEXT,
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Businesses (UMKM)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  logo_url TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  city TEXT NOT NULL,
  address_optional TEXT,
  nib_or_reg_note TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
  verified_by_user_id UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Portfolios (SHOW Stage)
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  creation_date DATE NOT NULL,
  student_contribution TEXT NOT NULL,
  is_collaborative BOOLEAN NOT NULL DEFAULT FALSE,
  project_origin TEXT NOT NULL CHECK (project_origin IN ('School Assignment', 'Vocational Practicum', 'Extracurricular Project', 'Personal Learning Project', 'School Competition')),
  display_permission BOOLEAN NOT NULL DEFAULT FALSE,
  school_display_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  copyright_declaration BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Under School Review', 'Verified', 'Rejected', 'Published')),
  reviewer_notes TEXT,
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 8. Portfolio Files
CREATE TABLE IF NOT EXISTS portfolio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('JPG', 'JPEG', 'PNG', 'PDF', 'MP4')),
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  preview_summary TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Portfolio Verification Records
CREATE TABLE IF NOT EXISTS portfolio_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES users(id),
  reviewer_role TEXT NOT NULL,
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  originality_verified BOOLEAN NOT NULL DEFAULT FALSE,
  permission_verified BOOLEAN NOT NULL DEFAULT FALSE,
  decision TEXT NOT NULL CHECK (decision IN ('UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
  notes TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Assignments (TRY Stage)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverables TEXT NOT NULL,
  output_format TEXT NOT NULL,
  estimated_duration_hours INTEGER NOT NULL,
  start_date DATE NOT NULL,
  deadline DATE NOT NULL,
  max_revisions INTEGER NOT NULL DEFAULT 2,
  evaluation_criteria_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  compensation_type TEXT NOT NULL CHECK (compensation_type IN ('MONETARY', 'NON_MONETARY_LEARNING')),
  compensation_amount_idr BIGINT NOT NULL DEFAULT 0,
  compensation_details TEXT NOT NULL,
  commercial_usage_intention BOOLEAN NOT NULL DEFAULT FALSE,
  copyright_licensing_terms TEXT NOT NULL,
  additional_instructions TEXT,
  mentor_requirements TEXT NOT NULL,
  safety_no_dangerous_work BOOLEAN NOT NULL DEFAULT TRUE,
  safety_no_confidential_data BOOLEAN NOT NULL DEFAULT TRUE,
  safety_no_unsupervised_meeting BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'Draft',
  current_safety_stage INTEGER NOT NULL DEFAULT 2 CHECK (current_safety_stage BETWEEN 1 AND 6),
  selected_student_id UUID REFERENCES students(id),
  assigned_teacher_id UUID REFERENCES teachers(id),
  assigned_school_id UUID REFERENCES schools(id),
  admin_review_notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 11. Assignment Applications
CREATE TABLE IF NOT EXISTS assignment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  motivation_note TEXT NOT NULL,
  student_voluntary_confirm BOOLEAN NOT NULL DEFAULT TRUE,
  schedule_compatibility_confirm BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'SELECTED_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- 12. Assignment Agreements
CREATE TABLE IF NOT EXISTS assignment_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  agreed_deliverables TEXT NOT NULL,
  agreed_deadline DATE NOT NULL,
  agreed_max_revisions INTEGER NOT NULL,
  agreed_compensation_type TEXT NOT NULL,
  agreed_compensation_amount_idr BIGINT NOT NULL,
  student_signed_at TIMESTAMPTZ,
  business_signed_at TIMESTAMPTZ,
  teacher_approved_at TIMESTAMPTZ,
  guardian_consented_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Guardian Consents (Stage 3 Safety)
CREATE TABLE IF NOT EXISTS guardian_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_name TEXT NOT NULL,
  guardian_relationship TEXT NOT NULL,
  consent_statement TEXT NOT NULL,
  consent_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (consent_status IN ('PENDING', 'APPROVED', 'DECLINED')),
  verified_by_teacher_id UUID REFERENCES teachers(id),
  consented_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Teacher Approvals (Stage 3 Safety)
CREATE TABLE IF NOT EXISTS teacher_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  student_id UUID NOT NULL REFERENCES students(id),
  scope_suitable BOOLEAN NOT NULL DEFAULT FALSE,
  skill_suitable BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_compatible BOOLEAN NOT NULL DEFAULT FALSE,
  deadline_reasonable BOOLEAN NOT NULL DEFAULT FALSE,
  revision_limit_fair BOOLEAN NOT NULL DEFAULT FALSE,
  compensation_fair BOOLEAN NOT NULL DEFAULT FALSE,
  safety_verified BOOLEAN NOT NULL DEFAULT FALSE,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'MODIFICATION_REQUESTED')),
  notes TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Assignment Progress
CREATE TABLE IF NOT EXISTS assignment_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  milestone_title TEXT NOT NULL,
  progress_note TEXT NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  flagged_safety_concern BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  current_version_number INTEGER NOT NULL DEFAULT 1,
  revisions_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Submission Versions
CREATE TABLE IF NOT EXISTS submission_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  deliverable_summary TEXT NOT NULL,
  submission_notes TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  umkm_feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(submission_id, version_number)
);

-- 18. Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  student_id UUID NOT NULL REFERENCES students(id),
  relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 1 AND 5),
  quality_score INTEGER NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  creativity_score INTEGER NOT NULL CHECK (creativity_score BETWEEN 1 AND 5),
  technical_score INTEGER NOT NULL CHECK (technical_score BETWEEN 1 AND 5),
  timeliness_score INTEGER NOT NULL CHECK (timeliness_score BETWEEN 1 AND 5),
  written_feedback TEXT NOT NULL,
  outcome_decision TEXT NOT NULL CHECK (outcome_decision IN ('ACCEPTED', 'REVISION_REQUESTED', 'REJECTED')),
  rejection_or_revision_reason TEXT,
  school_monitored_by_user_id UUID REFERENCES users(id),
  school_monitored_at TIMESTAMPTZ,
  school_verification_notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Compensation Records
CREATE TABLE IF NOT EXISTS compensation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  student_id UUID NOT NULL REFERENCES students(id),
  compensation_type TEXT NOT NULL,
  amount_idr BIGINT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AGREED',
  settlement_reference TEXT,
  confirmed_by_admin_id UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Copyright Agreements
CREATE TABLE IF NOT EXISTS copyright_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  license_scope TEXT NOT NULL,
  commercial_rights_granted BOOLEAN NOT NULL DEFAULT FALSE,
  student_portfolio_attribution_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  rights_transfer_status TEXT NOT NULL DEFAULT 'RETAINED_BY_STUDENT',
  confirmed_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Experience Passport Records
CREATE TABLE IF NOT EXISTS experience_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_code TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id),
  submission_id UUID REFERENCES submissions(id),
  evaluation_id UUID REFERENCES evaluations(id),
  business_name TEXT NOT NULL,
  assignment_title TEXT NOT NULL,
  assignment_description TEXT NOT NULL,
  skills_demonstrated_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverables_summary TEXT NOT NULL,
  completion_date DATE NOT NULL,
  umkm_evaluation_summary TEXT NOT NULL,
  overall_score NUMERIC(3,2),
  teacher_verifier_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  compensation_summary TEXT NOT NULL,
  outcome_status TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  admin_closed_by_user_id UUID REFERENCES users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE
);

-- 22. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES users(id),
  reporter_role TEXT NOT NULL,
  school_id UUID REFERENCES schools(id),
  assignment_id UUID REFERENCES assignments(id),
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution_notes TEXT,
  resolved_by_user_id UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  reason TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
