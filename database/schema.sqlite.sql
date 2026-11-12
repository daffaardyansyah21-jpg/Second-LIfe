-- ============================================================================
-- SECOND LIFE — Verified Student Experience Platform
-- Complete 24-Entity Relational Database Schema (SQLite 3)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Schools (SMA/SMK/PKBM)
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
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
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  school_id TEXT REFERENCES schools(id),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- 4. Teachers / Mentors
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  nip_or_nik TEXT,
  subject_specialty TEXT NOT NULL,
  phone_private TEXT,
  supervision_capacity INTEGER NOT NULL DEFAULT 15,
  verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  mentor_teacher_id TEXT REFERENCES teachers(id),
  nisn TEXT NOT NULL,
  grade TEXT NOT NULL,
  major TEXT NOT NULL,
  skills_json TEXT NOT NULL DEFAULT '[]',
  bio TEXT DEFAULT '',
  contact_preference TEXT NOT NULL DEFAULT 'PLATFORM_ONLY' CHECK (contact_preference IN ('PLATFORM_ONLY', 'VIA_MENTOR_TEACHER')),
  public_portfolio_enabled INTEGER NOT NULL DEFAULT 1,
  guardian_name TEXT,
  guardian_relationship TEXT,
  guardian_contact_private TEXT,
  identity_verified INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Businesses (UMKM)
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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
  verified_by_user_id TEXT REFERENCES users(id),
  verified_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Portfolios (SHOW Stage)
CREATE TABLE IF NOT EXISTS portfolios (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  skills_json TEXT NOT NULL DEFAULT '[]',
  creation_date TEXT NOT NULL,
  student_contribution TEXT NOT NULL,
  is_collaborative INTEGER NOT NULL DEFAULT 0,
  project_origin TEXT NOT NULL CHECK (project_origin IN ('School Assignment', 'Vocational Practicum', 'Extracurricular Project', 'Personal Learning Project', 'School Competition')),
  display_permission INTEGER NOT NULL DEFAULT 0,
  school_display_authorized INTEGER NOT NULL DEFAULT 0,
  copyright_declaration INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Under School Review', 'Verified', 'Rejected', 'Published')),
  reviewer_notes TEXT,
  reviewed_by_user_id TEXT REFERENCES users(id),
  reviewed_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- 8. Portfolio Files
CREATE TABLE IF NOT EXISTS portfolio_files (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('JPG', 'JPEG', 'PNG', 'PDF', 'MP4')),
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  preview_summary TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Portfolio Verification Records
CREATE TABLE IF NOT EXISTS portfolio_verifications (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  reviewer_user_id TEXT NOT NULL REFERENCES users(id),
  reviewer_role TEXT NOT NULL,
  identity_verified INTEGER NOT NULL DEFAULT 0,
  originality_verified INTEGER NOT NULL DEFAULT 0,
  permission_verified INTEGER NOT NULL DEFAULT 0,
  decision TEXT NOT NULL CHECK (decision IN ('UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
  notes TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. Assignments (TRY Stage)
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Graphic Design',
    'Photography',
    'Video Editing',
    'Writing',
    'Social Media Content',
    'Simple Catalog Design',
    'Basic Data & Admin Support'
  )),
  description TEXT NOT NULL,
  required_skills_json TEXT NOT NULL DEFAULT '[]',
  deliverables TEXT NOT NULL,
  output_format TEXT NOT NULL,
  estimated_duration_hours INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  deadline TEXT NOT NULL,
  max_revisions INTEGER NOT NULL DEFAULT 2,
  evaluation_criteria_json TEXT NOT NULL DEFAULT '[]',
  compensation_type TEXT NOT NULL CHECK (compensation_type IN ('MONETARY', 'NON_MONETARY_LEARNING')),
  compensation_amount_idr INTEGER NOT NULL DEFAULT 0,
  compensation_details TEXT NOT NULL,
  commercial_usage_intention INTEGER NOT NULL DEFAULT 0,
  copyright_licensing_terms TEXT NOT NULL,
  additional_instructions TEXT,
  mentor_requirements TEXT NOT NULL DEFAULT 'Active SMA/SMK Teacher Supervision Required',
  safety_no_dangerous_work INTEGER NOT NULL DEFAULT 1,
  safety_no_confidential_data INTEGER NOT NULL DEFAULT 1,
  safety_no_unsupervised_meeting INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN (
    'Draft',
    'Submitted for Admin Review',
    'Approved',
    'Published',
    'Student Applied',
    'Teacher Approval Pending',
    'Guardian Consent Pending',
    'Ready to Start',
    'In Progress',
    'Submitted',
    'Under Review',
    'Revision Requested',
    'Accepted',
    'Rejected',
    'School Verification',
    'Closed',
    'Cancelled',
    'Withdrawn',
    'Expired',
    'Incomplete'
  )),
  current_safety_stage INTEGER NOT NULL DEFAULT 2 CHECK (current_safety_stage BETWEEN 1 AND 6),
  selected_student_id TEXT REFERENCES students(id),
  assigned_teacher_id TEXT REFERENCES teachers(id),
  assigned_school_id TEXT REFERENCES schools(id),
  admin_review_notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- 11. Assignment Applications
CREATE TABLE IF NOT EXISTS assignment_applications (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  motivation_note TEXT NOT NULL,
  student_voluntary_confirm INTEGER NOT NULL DEFAULT 1,
  schedule_compatibility_confirm INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'SELECTED_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(assignment_id, student_id)
);

-- 12. Assignment Agreements
CREATE TABLE IF NOT EXISTS assignment_agreements (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  school_id TEXT NOT NULL REFERENCES schools(id),
  agreed_deliverables TEXT NOT NULL,
  agreed_deadline TEXT NOT NULL,
  agreed_max_revisions INTEGER NOT NULL,
  agreed_compensation_type TEXT NOT NULL,
  agreed_compensation_amount_idr INTEGER NOT NULL,
  student_signed_at TEXT,
  business_signed_at TEXT,
  teacher_approved_at TEXT,
  guardian_consented_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. Guardian Consents (Stage 3 Safety)
CREATE TABLE IF NOT EXISTS guardian_consents (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_name TEXT NOT NULL,
  guardian_relationship TEXT NOT NULL,
  consent_statement TEXT NOT NULL,
  consent_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (consent_status IN ('PENDING', 'APPROVED', 'DECLINED')),
  verified_by_teacher_id TEXT REFERENCES teachers(id),
  consented_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. Teacher Approvals (Stage 3 Safety)
CREATE TABLE IF NOT EXISTS teacher_approvals (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  scope_suitable INTEGER NOT NULL DEFAULT 0,
  skill_suitable INTEGER NOT NULL DEFAULT 0,
  schedule_compatible INTEGER NOT NULL DEFAULT 0,
  deadline_reasonable INTEGER NOT NULL DEFAULT 0,
  revision_limit_fair INTEGER NOT NULL DEFAULT 0,
  compensation_fair INTEGER NOT NULL DEFAULT 0,
  safety_verified INTEGER NOT NULL DEFAULT 0,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'MODIFICATION_REQUESTED')),
  notes TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. Assignment Progress & Supervised Communication (Stage 4 Safety)
CREATE TABLE IF NOT EXISTS assignment_progress (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  milestone_title TEXT NOT NULL,
  progress_note TEXT NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  flagged_safety_concern INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id),
  current_version_number INTEGER NOT NULL DEFAULT 1,
  revisions_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'REJECTED')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. Submission Versions (Preserves full history without overwriting)
CREATE TABLE IF NOT EXISTS submission_versions (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  deliverable_summary TEXT NOT NULL,
  submission_notes TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('JPG', 'JPEG', 'PNG', 'PDF', 'MP4')),
  file_size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (review_status IN ('PENDING_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'REJECTED')),
  umkm_feedback TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  UNIQUE(submission_id, version_number)
);

-- 18. Evaluations (Stage 5 Safety — VERIFY)
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 1 AND 5),
  quality_score INTEGER NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  creativity_score INTEGER NOT NULL CHECK (creativity_score BETWEEN 1 AND 5),
  technical_score INTEGER NOT NULL CHECK (technical_score BETWEEN 1 AND 5),
  timeliness_score INTEGER NOT NULL CHECK (timeliness_score BETWEEN 1 AND 5),
  written_feedback TEXT NOT NULL,
  outcome_decision TEXT NOT NULL CHECK (outcome_decision IN ('ACCEPTED', 'REVISION_REQUESTED', 'REJECTED')),
  rejection_or_revision_reason TEXT,
  school_monitored_by_user_id TEXT REFERENCES users(id),
  school_monitored_at TEXT,
  school_verification_notes TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 19. Compensation Records (Stage 6 Safety)
CREATE TABLE IF NOT EXISTS compensation_records (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  compensation_type TEXT NOT NULL CHECK (compensation_type IN ('MONETARY', 'NON_MONETARY_LEARNING')),
  amount_idr INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AGREED' CHECK (status IN ('AGREED', 'DISBURSED', 'CONFIRMED_BY_SCHOOL', 'WAIVED_NOT_ACCEPTED')),
  settlement_reference TEXT,
  confirmed_by_admin_id TEXT REFERENCES users(id),
  confirmed_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 20. Copyright Agreements (Stage 6 Safety)
CREATE TABLE IF NOT EXISTS copyright_agreements (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  license_scope TEXT NOT NULL,
  commercial_rights_granted INTEGER NOT NULL DEFAULT 0,
  student_portfolio_attribution_allowed INTEGER NOT NULL DEFAULT 1,
  rights_transfer_status TEXT NOT NULL DEFAULT 'RETAINED_BY_STUDENT' CHECK (rights_transfer_status IN ('RETAINED_BY_STUDENT', 'LICENSED_TO_UMKM_UPON_COMPENSATION')),
  confirmed_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 21. Experience Passport Records (Signature VERIFY Record)
CREATE TABLE IF NOT EXISTS experience_passports (
  id TEXT PRIMARY KEY,
  verification_code TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id),
  assignment_id TEXT NOT NULL UNIQUE REFERENCES assignments(id),
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  submission_id TEXT REFERENCES submissions(id),
  evaluation_id TEXT REFERENCES evaluations(id),
  business_name TEXT NOT NULL,
  assignment_title TEXT NOT NULL,
  assignment_description TEXT NOT NULL,
  skills_demonstrated_json TEXT NOT NULL DEFAULT '[]',
  deliverables_summary TEXT NOT NULL,
  completion_date TEXT NOT NULL,
  umkm_evaluation_summary TEXT NOT NULL,
  overall_score REAL,
  teacher_verifier_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  compensation_summary TEXT NOT NULL,
  outcome_status TEXT NOT NULL CHECK (outcome_status IN (
    'Completed and Accepted',
    'Completed but Not Accepted',
    'Cancelled',
    'Incomplete'
  )),
  verification_status TEXT NOT NULL CHECK (verification_status IN (
    'PENDING_SCHOOL_VERIFICATION',
    'VERIFIED_ISSUED',
    'RECORDED_UNSUCCESSFUL'
  )),
  admin_closed_by_user_id TEXT REFERENCES users(id),
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_demo INTEGER NOT NULL DEFAULT 0
);

-- 22. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 23. Complaints & Safety Reports
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  reporter_user_id TEXT NOT NULL REFERENCES users(id),
  reporter_role TEXT NOT NULL,
  school_id TEXT REFERENCES schools(id),
  assignment_id TEXT REFERENCES assignments(id),
  category TEXT NOT NULL CHECK (category IN (
    'Scope Creep / Excessive Revisions',
    'Unfair Evaluation',
    'Delayed Compensation',
    'Unsafe Request / Direct Meeting Request',
    'Confidential Data Request',
    'Copyright / Usage Violation',
    'General Support'
  )),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'ESCALATED')),
  resolution_notes TEXT,
  resolved_by_user_id TEXT REFERENCES users(id),
  resolved_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 24. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  reason TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portfolios_student ON portfolios(student_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_school ON portfolios(school_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON portfolios(status);
CREATE INDEX IF NOT EXISTS idx_assignments_business ON assignments(business_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_school ON assignments(assigned_school_id);
CREATE INDEX IF NOT EXISTS idx_passports_student ON experience_passports(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
