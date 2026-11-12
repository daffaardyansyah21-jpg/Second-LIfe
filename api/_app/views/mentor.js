// ============================================================================
// SECOND LIFE — Teacher / Mentor Dashboard Pages (/mentor/*)
// ============================================================================

import { getDb } from '../lib/db.js';
                                                      
import { demoBadge, escapeHtml, formatIdr, icon, renderDashboardLayout, safeJsonParse, statusBadge } from './layout.js';

function getTeacherProfile(userId        )                                  {
  const db = getDb();
  return db
    .prepare(
      `SELECT t.*, u.full_name, u.email, s.name as school_name, s.city as school_city
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       JOIN schools s ON s.id = t.school_id
       WHERE t.user_id = ?`
    )
    .get(userId)                                   ;
}

// Page 1 — Overview (/mentor/dashboard)
export function renderMentorOverviewPage(user             , flash                )         {
  const db = getDb();
  const teacher = getTeacherProfile(user.id);
  if (!teacher) return '';

  const schoolStudentsCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM students WHERE school_id = ?').get(teacher.school_id)                   
  ).cnt;

  const pendingPortfoliosCount = (
    db
      .prepare(
        `SELECT COUNT(*) as cnt FROM portfolios
         WHERE school_id = ? AND status IN ('Submitted', 'Under School Review') AND deleted_at IS NULL`
      )
      .get(teacher.school_id)                   
  ).cnt;

  const pendingApprovalsCount = (
    db
      .prepare(
        `SELECT COUNT(*) as cnt FROM assignments a
         JOIN students stu ON stu.id = a.selected_student_id
         WHERE stu.school_id = ? AND a.status IN ('Student Applied', 'Teacher Approval Pending', 'Guardian Consent Pending')`
      )
      .get(teacher.school_id)                   
  ).cnt;

  const activeSupervisedCount = (
    db
      .prepare(
        `SELECT COUNT(*) as cnt FROM assignments a
         JOIN students stu ON stu.id = a.selected_student_id
         WHERE stu.school_id = ? AND a.status IN ('Ready to Start', 'In Progress', 'Submitted', 'Under Review', 'Revision Requested')`
      )
      .get(teacher.school_id)                   
  ).cnt;

  const content = `
    <div class="card" style="margin-bottom:22px;background:linear-gradient(90deg, var(--brand-dark-navy) 0%, var(--brand-deep-purple) 100%);color:#FFFFFF;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div>
          <div style="font-size:12px;color:var(--brand-muted-gold);font-weight:700;letter-spacing:0.06em;">
            TEACHER / MENTOR SUPERVISORY WORKSPACE &bull; ${escapeHtml(teacher.subject_specialty)}
          </div>
          <h2 style="color:#FFFFFF;font-size:24px;margin:6px 0;">${escapeHtml(teacher.full_name)} ${demoBadge(teacher.is_demo)}</h2>
          <div style="font-size:13.5px;color:rgba(255,255,255,0.82);">
            Institution: <strong>${escapeHtml(teacher.school_name)}</strong> (${escapeHtml(teacher.school_city)}) &bull; Strictly isolated to your school's students.
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/mentor/portfolio-review" class="btn btn-gold">${icon('folder', 16)} Portfolio Reviews (${pendingPortfoliosCount})</a>
          <a href="/mentor/approvals" class="btn btn-secondary">${icon('checkSquare', 16)} Assignment Approvals (${pendingApprovalsCount})</a>
        </div>
      </div>
    </div>

    <div class="grid-4" style="margin-bottom:24px;">
      <div class="metric-card">
        <div class="metric-label"><span>School Students</span> ${icon('users', 16)}</div>
        <div class="metric-value">${schoolStudentsCount}</div>
        <div class="metric-sub"><a href="/mentor/students">Monitor Students &rarr;</a></div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Portfolios to Verify (Stage 1)</span> ${icon('folder', 16)}</div>
        <div class="metric-value">${pendingPortfoliosCount}</div>
        <div class="metric-sub"><a href="/mentor/portfolio-review">Review Queue &rarr;</a></div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Pending Approvals (Stage 3)</span> ${icon('checkSquare', 16)}</div>
        <div class="metric-value">${pendingApprovalsCount}</div>
        <div class="metric-sub"><a href="/mentor/approvals">Approve Assignments &rarr;</a></div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Active Supervision (Stage 4)</span> ${icon('shield', 16)}</div>
        <div class="metric-value">${activeSupervisedCount}</div>
        <div class="metric-sub"><a href="/mentor/supervision">Supervise Work &rarr;</a></div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Teacher / Mentor Overview',
    breadcrumb: 'Overview',
    activePath: '/mentor/dashboard',
    user,
    content,
    flashMessage: flash
  });
}

// Page 2 — Student Monitoring (/mentor/students)
export function renderMentorStudentsPage(user             , flash                )         {
  const db = getDb();
  const teacher = getTeacherProfile(user.id);
  if (!teacher) return '';

  const students = db
    .prepare(
      `SELECT
         stu.*, u.full_name, u.email,
         (SELECT COUNT(*) FROM portfolios p WHERE p.student_id = stu.id AND p.status IN ('Verified', 'Published')) as verified_portfolios,
         (SELECT COUNT(*) FROM assignments a WHERE a.selected_student_id = stu.id AND a.status IN ('Ready to Start', 'In Progress', 'Submitted', 'Revision Requested')) as active_assignments
       FROM students stu
       JOIN users u ON u.id = stu.user_id
       WHERE stu.school_id = ?
       ORDER BY u.full_name ASC`
    )
    .all(teacher.school_id)                              ;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;">Students at ${escapeHtml(teacher.school_name)} (${students.length})</h3>
      <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:16px;">
        Verify student identity and monitor workload across your school's participating students.
      </p>

      ${
        students.length === 0
          ? `<div class="empty-state"><h4>No students registered at your school yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Student Name</th>
                     <th>Grade &amp; Major</th>
                     <th>Skills</th>
                     <th>Identity Status</th>
                     <th>Verified Portfolios</th>
                     <th>Active Assignments</th>
                     <th>Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${students
                     .map((s) => {
                       const skills = safeJsonParse          (s.skills_json, []);
                       return `<tr>
                         <td>
                           <strong>${escapeHtml(s.full_name)}</strong> ${demoBadge(s.is_demo)}
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">NISN: ${escapeHtml(s.nisn)}</div>
                         </td>
                         <td>${escapeHtml(s.grade)} &bull; ${escapeHtml(s.major)}</td>
                         <td>${skills.map((sk) => `<span class="status-badge badge-neutral" style="margin:2px;">${escapeHtml(sk)}</span>`).join('')}</td>
                         <td>${s.identity_verified ? statusBadge('Identity Verified') : statusBadge('Pending Check')}</td>
                         <td>${s.verified_portfolios}</td>
                         <td>${s.active_assignments}</td>
                         <td>
                           ${
                             !s.identity_verified
                               ? `<form method="POST" action="/api/mentor/students/verify-identity" style="margin:0;">
                                    <input type="hidden" name="student_id" value="${escapeHtml(s.id)}" />
                                    <button type="submit" class="btn btn-primary btn-sm">Verify Student Identity</button>
                                  </form>`
                               : `<span style="font-size:12px;color:#186A42;font-weight:600;">&#10003; Verified</span>`
                           }
                         </td>
                       </tr>`;
                     })
                     .join('')}
                 </tbody>
               </table>
             </div>`
      }
    </div>
  `;

  return renderDashboardLayout({
    title: 'Student Monitoring',
    breadcrumb: 'Student Monitoring',
    activePath: '/mentor/students',
    user,
    content,
    flashMessage: flash
  });
}

// Page 3 — Portfolio Verification (/mentor/portfolio-review)
export function renderMentorPortfolioReviewPage(user             , flash                )         {
  const db = getDb();
  const teacher = getTeacherProfile(user.id);
  if (!teacher) return '';

  const portfolios = db
    .prepare(
      `SELECT p.*, u.full_name as student_name, stu.grade, stu.major, stu.nisn
       FROM portfolios p
       JOIN students stu ON stu.id = p.student_id
       JOIN users u ON u.id = stu.user_id
       WHERE p.school_id = ? AND p.deleted_at IS NULL
       ORDER BY CASE WHEN p.status IN ('Submitted', 'Under School Review') THEN 0 ELSE 1 END, p.created_at DESC`
    )
    .all(teacher.school_id)                              ;

  const content = `
    <p style="font-size:14px;margin-top:0;margin-bottom:18px;">
      <strong>Stage 1 Safety — Portfolio Registration &amp; Verification:</strong> Review student schoolwork for identity, classroom originality, contribution honesty, and publication permission.
    </p>

    ${
      portfolios.length === 0
        ? `<div class="empty-state"><h4>No student portfolios submitted at your school yet.</h4></div>`
        : portfolios
            .map((p) => {
              const files = db
                .prepare('SELECT * FROM portfolio_files WHERE portfolio_id = ?')
                .all(p.id)                              ;
              return `<div class="card" style="margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <div>
                    <h3 style="font-size:18px;margin:0;">${escapeHtml(p.title)} ${demoBadge(p.is_demo)}</h3>
                    <div style="font-size:13px;color:var(--brand-muted-gray);">
                      Student: <strong>${escapeHtml(p.student_name)}</strong> (${escapeHtml(p.grade)} — ${escapeHtml(p.major)}) &bull;
                      Origin: ${escapeHtml(p.project_origin)} &bull; Category: ${escapeHtml(p.category)}
                    </div>
                  </div>
                  ${statusBadge(p.status)}
                </div>

                <p style="font-size:13.5px;margin:8px 0;">${escapeHtml(p.description)}</p>
                <div style="font-size:13px;background:var(--brand-warm-ivory);padding:10px;border-radius:var(--radius-sm);margin-bottom:12px;">
                  <strong>Declared Student Contribution:</strong> ${escapeHtml(p.student_contribution)}
                </div>

                <div style="margin-bottom:14px;font-size:12.5px;">
                  <strong>Files:</strong>
                  ${files
                    .map(
                      (f) =>
                        `<a href="/api/files/download?type=portfolio&id=${escapeHtml(f.id)}" class="btn btn-secondary btn-sm" style="margin-left:8px;">${icon('download', 13)} ${escapeHtml(f.file_name)}</a>`
                    )
                    .join('')}
                </div>

                <form method="POST" action="/api/mentor/portfolio/verify" style="border-top:1px solid var(--border-subtle);padding-top:14px;">
                  <input type="hidden" name="portfolio_id" value="${escapeHtml(p.id)}" />
                  <div class="grid-3" style="font-size:12.5px;margin-bottom:12px;">
                    <label style="display:flex;align-items:center;gap:6px;">
                      <input type="checkbox" name="identity_verified" value="1" required checked />
                      <span>1. Student Identity Verified</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;">
                      <input type="checkbox" name="originality_verified" value="1" required checked />
                      <span>2. Classroom Originality Evidence Checked</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;">
                      <input type="checkbox" name="permission_verified" value="1" required checked />
                      <span>3. Publication Permission Authorized</span>
                    </label>
                  </div>
                  <div class="grid-3" style="align-items:end;">
                    <div style="grid-column: span 2;">
                      <label class="form-label">Teacher Review Notes / Rejection Explanation *</label>
                      <input type="text" name="notes" required value="${escapeHtml(p.reviewer_notes || 'Verified authentic school project and student contribution.')}" class="form-control" />
                    </div>
                    <div style="display:flex;gap:8px;">
                      <button type="submit" name="decision" value="VERIFIED" class="btn btn-primary" style="flex:1;">Approve &amp; Publish</button>
                      <button type="submit" name="decision" value="REJECTED" class="btn btn-danger">Reject</button>
                    </div>
                  </div>
                </form>
              </div>`;
            })
            .join('')
    }
  `;

  return renderDashboardLayout({
    title: 'Portfolio Verification (Stage 1)',
    breadcrumb: 'Portfolio Verification',
    activePath: '/mentor/portfolio-review',
    user,
    content,
    flashMessage: flash
  });
}

// Page 4 — Assignment Approvals (/mentor/approvals)
export function renderMentorApprovalsPage(user             , flash                )         {
  const db = getDb();
  const teacher = getTeacherProfile(user.id);
  if (!teacher) return '';

  const assignments = db
    .prepare(
      `SELECT
         a.*, b.business_name, u.full_name as student_name, stu.grade, stu.major, stu.guardian_name
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       JOIN students stu ON stu.id = a.selected_student_id
       JOIN users u ON u.id = stu.user_id
       WHERE stu.school_id = ?
         AND a.status IN ('Student Applied', 'Teacher Approval Pending', 'Guardian Consent Pending', 'Ready to Start')
       ORDER BY a.updated_at DESC`
    )
    .all(teacher.school_id)                              ;

  const content = `
    <p style="font-size:14px;margin-top:0;margin-bottom:18px;">
      <strong>Stage 3 Safety — Assignment &amp; Guardian Approval:</strong> Review assignment scope, skill suitability, school schedule compatibility, revision limits, compensation, and guardian consent before a student can start work.
    </p>

    ${
      assignments.length === 0
        ? `<div class="empty-state">
             ${icon('checkSquare', 32)}
             <h4>No assignments awaiting Stage 3 approval at your school.</h4>
             <p style="font-size:13.5px;margin:0;">When an UMKM selects a student applicant from your school, the assignment appears here for your supervisory review.</p>
           </div>`
        : assignments
            .map((a) => {
              const guardian = db
                .prepare('SELECT * FROM guardian_consents WHERE assignment_id = ? AND student_id = ?')
                .get(a.id, a.selected_student_id)                                   ;

              return `<div class="card" style="margin-bottom:22px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <div>
                    <h3 style="font-size:18px;margin:0;">${escapeHtml(a.title)} ${demoBadge(a.is_demo)}</h3>
                    <div style="font-size:13px;color:var(--brand-muted-gray);">
                      Student: <strong>${escapeHtml(a.student_name)}</strong> (${escapeHtml(a.grade)}) &bull;
                      UMKM: <strong>${escapeHtml(a.business_name)}</strong>
                    </div>
                  </div>
                  ${statusBadge(a.status)}
                </div>

                <div class="grid-2" style="background:var(--brand-warm-ivory);padding:14px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:14px;">
                  <div>
                    <strong>Deliverables:</strong> ${escapeHtml(a.deliverables)}<br/>
                    <strong>Duration &amp; Deadline:</strong> ${a.estimated_duration_hours} hours (Due ${escapeHtml(a.deadline)})<br/>
                    <strong>Max Revisions:</strong> ${a.max_revisions}
                  </div>
                  <div>
                    <strong>Compensation Agreement:</strong> ${formatIdr(a.compensation_amount_idr)} (${escapeHtml(a.compensation_details)})<br/>
                    <strong>Commercial Usage:</strong> ${a.commercial_usage_intention ? 'Yes (Commercial License)' : 'No'}<br/>
                    <strong>Guardian Consent Record:</strong> ${guardian ? statusBadge(guardian.consent_status) : statusBadge('AWAITING CONSENT')}
                  </div>
                </div>

                <form method="POST" action="/api/mentor/assignments/approve">
                  <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                  <input type="hidden" name="student_id" value="${escapeHtml(a.selected_student_id)}" />

                  <div class="grid-4" style="font-size:12px;margin-bottom:12px;">
                    <label><input type="checkbox" name="scope_suitable" value="1" checked /> Scope Suitable</label>
                    <label><input type="checkbox" name="skill_suitable" value="1" checked /> Skill Suitable</label>
                    <label><input type="checkbox" name="schedule_compatible" value="1" checked /> Schedule Compatible</label>
                    <label><input type="checkbox" name="deadline_reasonable" value="1" checked /> Deadline Reasonable</label>
                    <label><input type="checkbox" name="revision_limit_fair" value="1" checked /> Revision Limit Fair</label>
                    <label><input type="checkbox" name="compensation_fair" value="1" checked /> Compensation Fair</label>
                    <label><input type="checkbox" name="safety_verified" value="1" checked /> Safety Requirements Met</label>
                    <label><input type="checkbox" name="verify_guardian_consent" value="1" checked /> Verify Guardian Consent (${escapeHtml(a.guardian_name || 'Guardian')})</label>
                  </div>

                  <div class="grid-3" style="align-items:end;">
                    <div style="grid-column: span 2;">
                      <label class="form-label">Teacher Supervision Decision Notes *</label>
                      <input type="text" name="notes" required value="Approved: workload fits school schedule, compensation and revision cap verified, guardian consent confirmed." class="form-control" />
                    </div>
                    <div style="display:flex;gap:8px;">
                      <button type="submit" name="decision" value="APPROVED" class="btn btn-primary" style="flex:1;">Approve (Unlock Start)</button>
                      <button type="submit" name="decision" value="MODIFICATION_REQUESTED" class="btn btn-secondary">Modify</button>
                      <button type="submit" name="decision" value="REJECTED" class="btn btn-danger">Reject</button>
                    </div>
                  </div>
                </form>
              </div>`;
            })
            .join('')
    }
  `;

  return renderDashboardLayout({
    title: 'Assignment Approvals (Stage 3)',
    breadcrumb: 'Assignment Approvals',
    activePath: '/mentor/approvals',
    user,
    content,
    flashMessage: flash
  });
}

// Page 5 — Active Supervision (/mentor/supervision)
export function renderMentorSupervisionPage(user             , flash                )         {
  const db = getDb();
  const teacher = getTeacherProfile(user.id);
  if (!teacher) return '';

  const activeList = db
    .prepare(
      `SELECT a.*, b.business_name, u.full_name as student_name, stu.grade
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       JOIN students stu ON stu.id = a.selected_student_id
       JOIN users u ON u.id = stu.user_id
       WHERE stu.school_id = ?
         AND a.status IN ('Ready to Start', 'In Progress', 'Submitted', 'Under Review', 'Revision Requested')
       ORDER BY a.deadline ASC`
    )
    .all(teacher.school_id)                              ;

  const complaints = db
    .prepare('SELECT * FROM complaints WHERE school_id = ? ORDER BY created_at DESC')
    .all(teacher.school_id)                              ;

  const content = `
    <div class="card" style="margin-bottom:22px;">
      <h3 style="font-size:18px;margin-bottom:10px;">Active Supervised Assignments (Stage 4 Safety)</h3>
      ${
        activeList.length === 0
          ? `<div class="empty-state"><h4>No active assignments currently in progress at your school.</h4></div>`
          : activeList
              .map((a) => {
                const logs = db
                  .prepare('SELECT * FROM assignment_progress WHERE assignment_id = ? ORDER BY created_at DESC LIMIT 3')
                  .all(a.id)                              ;
                return `<div style="padding:16px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);margin-bottom:14px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <strong>${escapeHtml(a.title)}</strong> ${demoBadge(a.is_demo)}
                      <div style="font-size:12.5px;color:var(--brand-muted-gray);">
                        Student: <strong>${escapeHtml(a.student_name)}</strong> (${escapeHtml(a.grade)}) &bull;
                        UMKM: ${escapeHtml(a.business_name)} &bull; Deadline: <strong>${escapeHtml(a.deadline)}</strong>
                      </div>
                    </div>
                    ${statusBadge(a.status)}
                  </div>
                  <div style="margin-top:10px;font-size:12.5px;">
                    <strong>Recent Progress Updates:</strong>
                    ${
                      logs.length === 0
                        ? `<span style="color:var(--brand-muted-gray);"> No updates logged yet.</span>`
                        : logs.map((l) => `<div>&bull; [${escapeHtml(l.actor_role)}] ${escapeHtml(l.milestone_title)} (${l.progress_percent}%): ${escapeHtml(l.progress_note)}</div>`).join('')
                    }
                  </div>
                  <form method="POST" action="/api/mentor/supervision/note" style="margin-top:10px;display:flex;gap:8px;">
                    <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                    <input type="text" name="progress_note" required class="form-control" placeholder="Add teacher supervisory check-in note..." />
                    <button type="submit" class="btn btn-secondary btn-sm">Add Supervision Check</button>
                  </form>
                </div>`;
              })
              .join('')
      }
    </div>

    <div class="card">
      <h3 style="font-size:17px;margin-bottom:10px;">Reported Safety &amp; Workload Issues at Your School (${complaints.length})</h3>
      ${
        complaints.length === 0
          ? `<div style="font-size:13px;color:var(--brand-muted-gray);">Zero safety or workload complaints reported by students at your school.</div>`
          : complaints
              .map(
                (c) => `<div style="padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);margin-bottom:8px;">
                  <div style="display:flex;justify-content:space-between;">
                    <strong>${escapeHtml(c.subject)} (${escapeHtml(c.category)})</strong>
                    ${statusBadge(c.status)}
                  </div>
                  <p style="font-size:13px;margin:4px 0;">${escapeHtml(c.description)}</p>
                </div>`
              )
              .join('')
      }
    </div>
  `;

  return renderDashboardLayout({
    title: 'Active Student Supervision (Stage 4)',
    breadcrumb: 'Active Supervision',
    activePath: '/mentor/supervision',
    user,
    content,
    flashMessage: flash
  });
}

// Page 6 — Student Submissions (/mentor/submissions)
export function renderMentorSubmissionsPage(user             )         {
  const db = getDb();
  const teacher = getTeacherProfile(user.id);
  if (!teacher) return '';

  const versions = db
    .prepare(
      `SELECT sv.*, a.title as assignment_title, b.business_name, u.full_name as student_name
       FROM submission_versions sv
       JOIN submissions s ON s.id = sv.submission_id
       JOIN assignments a ON a.id = sv.assignment_id
       JOIN businesses b ON b.id = a.business_id
       JOIN students stu ON stu.id = s.student_id
       JOIN users u ON u.id = stu.user_id
       WHERE stu.school_id = ?
       ORDER BY sv.submitted_at DESC`
    )
    .all(teacher.school_id)                              ;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:12px;">School Student Deliverable Submissions (${versions.length})</h3>
      ${
        versions.length === 0
          ? `<div class="empty-state"><h4>No student submissions recorded yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Student</th>
                     <th>Assignment &amp; UMKM</th>
                     <th>Version &amp; Deliverable</th>
                     <th>Submitted At</th>
                     <th>Status</th>
                     <th>UMKM Feedback</th>
                     <th>File</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${versions
                     .map(
                       (v) => `<tr>
                         <td><strong>${escapeHtml(v.student_name)}</strong> ${demoBadge(v.is_demo)}</td>
                         <td>
                           <div>${escapeHtml(v.assignment_title)}</div>
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(v.business_name)}</div>
                         </td>
                         <td>v${v.version_number}: ${escapeHtml(v.deliverable_summary)}</td>
                         <td>${escapeHtml(v.submitted_at)}</td>
                         <td>${statusBadge(v.review_status)}</td>
                         <td style="font-size:12.5px;">${escapeHtml(v.umkm_feedback || '—')}</td>
                         <td><a href="/api/files/download?type=submission&id=${escapeHtml(v.id)}" class="btn btn-secondary btn-sm">${icon('download', 13)}</a></td>
                       </tr>`
                     )
                     .join('')}
                 </tbody>
               </table>
             </div>`
      }
    </div>
  `;

  return renderDashboardLayout({
    title: 'Student Submissions',
    breadcrumb: 'Student Submissions',
    activePath: '/mentor/submissions',
    user,
    content
  });
}

// Page 7 — Experience Verification (/mentor/experience-verification)
export function renderMentorExperienceVerificationPage(user             , flash                )         {
  const db = getDb();
  const teacher = getTeacherProfile(user.id);
  if (!teacher) return '';

  const evaluations = db
    .prepare(
      `SELECT
         ev.*, a.title as assignment_title, a.status as assignment_status,
         b.business_name, u.full_name as student_name
       FROM evaluations ev
       JOIN assignments a ON a.id = ev.assignment_id
       JOIN businesses b ON b.id = ev.business_id
       JOIN students stu ON stu.id = ev.student_id
       JOIN users u ON u.id = stu.user_id
       WHERE stu.school_id = ?
       ORDER BY ev.created_at DESC`
    )
    .all(teacher.school_id)                              ;

  const content = `
    <p style="font-size:14px;margin-top:0;margin-bottom:18px;">
      <strong>Stage 5 Safety — School Verification of Final Experience Evidence:</strong> Review the UMKM's evaluation and student submission evidence before the record proceeds to Stage 6 Closure &amp; Experience Passport issuance. Teachers cannot fabricate completion records or alter UMKM evaluation scores.
    </p>

    ${
      evaluations.length === 0
        ? `<div class="empty-state">
             ${icon('award', 32)}
             <h4>No UMKM evaluations awaiting school verification yet.</h4>
           </div>`
        : evaluations
            .map(
              (ev) => `<div class="card" style="margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <div>
                    <h3 style="font-size:18px;margin:0;">${escapeHtml(ev.assignment_title)} ${demoBadge(ev.is_demo)}</h3>
                    <div style="font-size:13px;color:var(--brand-muted-gray);">
                      Student: <strong>${escapeHtml(ev.student_name)}</strong> &bull; UMKM: <strong>${escapeHtml(ev.business_name)}</strong>
                    </div>
                  </div>
                  ${statusBadge(ev.assignment_status)}
                </div>

                <div style="background:var(--brand-warm-ivory);padding:14px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:14px;">
                  <div>
                    <strong>UMKM Decision:</strong> ${statusBadge(ev.outcome_decision)} &bull;
                    Scores: Relevance ${ev.relevance_score}/5, Quality ${ev.quality_score}/5, Creativity ${ev.creativity_score}/5, Technical ${ev.technical_score}/5, Timeliness ${ev.timeliness_score}/5
                  </div>
                  <div style="margin-top:6px;"><strong>UMKM Written Feedback (Immutable):</strong> ${escapeHtml(ev.written_feedback)}</div>
                </div>

                ${
                  ev.school_monitored_at
                    ? `<div style="font-size:13px;color:#186A42;font-weight:600;">
                         &#10003; School Verification Recorded (${escapeHtml(ev.school_monitored_at)}): ${escapeHtml(ev.school_verification_notes || '')}
                       </div>`
                    : `<form method="POST" action="/api/mentor/experience/verify" style="display:flex;gap:10px;align-items:end;">
                         <input type="hidden" name="evaluation_id" value="${escapeHtml(ev.id)}" />
                         <input type="hidden" name="assignment_id" value="${escapeHtml(ev.assignment_id)}" />
                         <div style="flex:1;">
                           <label class="form-label">Teacher / School Evidence Verification Note *</label>
                           <input type="text" name="school_verification_notes" required value="Verified student deliverable versions and authentic UMKM evaluation evidence." class="form-control" />
                         </div>
                         <button type="submit" class="btn btn-primary">Confirm School Verification</button>
                       </form>`
                }
              </div>`
            )
            .join('')
    }
  `;

  return renderDashboardLayout({
    title: 'Experience Verification (Stage 5)',
    breadcrumb: 'Experience Verification',
    activePath: '/mentor/experience-verification',
    user,
    content,
    flashMessage: flash
  });
}

// Page 8 — Reports (/mentor/reports)
export function renderMentorReportsPage(user             )         {
  const db = getDb();
  const teacher = getTeacherProfile(user.id);
  if (!teacher) return '';

  const stats = computeSchoolMetrics(teacher.school_id);

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <p style="margin:0;font-size:14px;">All metrics below are calculated directly from live relational database records for <strong>${escapeHtml(teacher.school_name)}</strong>.</p>
      <div style="display:flex;gap:8px;">
        <button type="button" onclick="window.print()" class="btn btn-secondary btn-sm">${icon('printer', 14)} Export PDF Report</button>
        <a href="/api/reports/export-csv?scope=school" class="btn btn-primary btn-sm">${icon('download', 14)} Export CSV</a>
      </div>
    </div>

    <div class="grid-4" style="margin-bottom:24px;">
      <div class="metric-card">
        <div class="metric-label"><span>Participating Students</span></div>
        <div class="metric-value">${stats.participatingStudents}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Verified Portfolios</span></div>
        <div class="metric-value">${stats.verifiedPortfolios}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Assignments Started</span></div>
        <div class="metric-value">${stats.assignmentsStarted}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Completed &amp; Accepted</span></div>
        <div class="metric-value">${stats.assignmentsAccepted}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 style="font-size:17px;margin-bottom:12px;">Assignment Funnel Summary</h3>
        <table class="data-table">
          <tbody>
            <tr><td>Total UMKM Assignments Offered on Platform</td><td><strong>${stats.assignmentsOffered}</strong></td></tr>
            <tr><td>Assignments Started by School Students</td><td><strong>${stats.assignmentsStarted}</strong></td></tr>
            <tr><td>Assignments Completed (Closed)</td><td><strong>${stats.assignmentsCompleted}</strong></td></tr>
            <tr><td>Assignments Accepted with Verified Passport</td><td><strong>${stats.assignmentsAccepted}</strong></td></tr>
            <tr><td>Distinct UMKM Partners Collaborating with School</td><td><strong>${stats.umkmPartners}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3 style="font-size:17px;margin-bottom:12px;">Student Skill Development Distribution</h3>
        ${
          stats.skillCounts.length === 0
            ? `<p style="font-size:13px;color:var(--brand-muted-gray);">No verified portfolio or passport skills recorded yet.</p>`
            : `<table class="data-table">
                 <thead><tr><th>Skill Demonstrated</th><th>Verified Occurrences</th></tr></thead>
                 <tbody>
                   ${stats.skillCounts.map((sc) => `<tr><td>${escapeHtml(sc.skill)}</td><td><strong>${sc.count}</strong></td></tr>`).join('')}
                 </tbody>
               </table>`
        }
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Supervision & Skill Reports',
    breadcrumb: 'Reports',
    activePath: '/mentor/reports',
    user,
    content
  });
}

export function computeSchoolMetrics(schoolId        ) {
  const db = getDb();
  const participatingStudents = (
    db.prepare('SELECT COUNT(*) as c FROM students WHERE school_id = ?').get(schoolId)                 
  ).c;
  const verifiedPortfolios = (
    db
      .prepare(`SELECT COUNT(*) as c FROM portfolios WHERE school_id = ? AND status IN ('Verified', 'Published') AND deleted_at IS NULL`)
      .get(schoolId)                 
  ).c;
  const assignmentsOffered = (
    db
      .prepare(`SELECT COUNT(*) as c FROM assignments WHERE status NOT IN ('Draft', 'Submitted for Admin Review') AND deleted_at IS NULL`)
      .get()                 
  ).c;
  const assignmentsStarted = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM assignments WHERE assigned_school_id = ? AND status IN ('In Progress', 'Submitted', 'Under Review', 'Revision Requested', 'Accepted', 'School Verification', 'Closed')`
      )
      .get(schoolId)                 
  ).c;
  const assignmentsCompleted = (
    db
      .prepare(`SELECT COUNT(*) as c FROM assignments WHERE assigned_school_id = ? AND status = 'Closed'`)
      .get(schoolId)                 
  ).c;
  const assignmentsAccepted = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM experience_passports WHERE school_id = ? AND outcome_status = 'Completed and Accepted'`
      )
      .get(schoolId)                 
  ).c;
  const umkmPartners = (
    db
      .prepare(`SELECT COUNT(DISTINCT business_id) as c FROM assignments WHERE assigned_school_id = ?`)
      .get(schoolId)                 
  ).c;

  const skillRows = db
    .prepare(`SELECT skills_json FROM portfolios WHERE school_id = ? AND status IN ('Verified', 'Published')`)
    .all(schoolId)                                  ;

  const freq = new Map                ();
  for (const r of skillRows) {
    for (const sk of safeJsonParse          (r.skills_json, [])) {
      freq.set(sk, (freq.get(sk) || 0) + 1);
    }
  }
  const skillCounts = Array.from(freq.entries())
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);

  return {
    participatingStudents,
    verifiedPortfolios,
    assignmentsOffered,
    assignmentsStarted,
    assignmentsCompleted,
    assignmentsAccepted,
    umkmPartners,
    skillCounts
  };
}
