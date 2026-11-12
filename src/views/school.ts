// ============================================================================
// SECOND LIFE — School Administrator Dashboard Pages (/school/*)
// ============================================================================

import { getDb } from '../lib/db.ts';
import type { SessionUser } from '../types/domain.ts';
import { demoBadge, escapeHtml, formatIdr, icon, renderDashboardLayout, safeJsonParse, statusBadge } from './layout.ts';
import { computeSchoolMetrics } from './mentor.ts';

function getSchoolForUser(user: SessionUser): Record<string, any> | undefined {
  if (!user.school_id) return undefined;
  const db = getDb();
  return db.prepare('SELECT * FROM schools WHERE id = ?').get(user.school_id) as Record<string, any> | undefined;
}

// Page 1 — School Overview (/school/dashboard)
export function renderSchoolOverviewPage(user: SessionUser, flash?: string | null): string {
  const school = getSchoolForUser(user);
  if (!school) return '';
  const stats = computeSchoolMetrics(school.id);

  const content = `
    <div class="card" style="margin-bottom:22px;background:linear-gradient(90deg, var(--brand-dark-navy) 0%, var(--brand-deep-purple) 100%);color:#FFFFFF;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div>
          <div style="font-size:12px;color:var(--brand-muted-gold);font-weight:700;letter-spacing:0.06em;">
            INSTITUTIONAL GOVERNANCE PORTAL &bull; NPSN: ${escapeHtml(school.npsn)} &bull; ${escapeHtml(school.semester_label)}
          </div>
          <h2 style="color:#FFFFFF;font-size:24px;margin:6px 0;">${escapeHtml(school.name)} ${demoBadge(school.is_demo)}</h2>
          <div style="font-size:13.5px;color:rgba(255,255,255,0.82);">
            School Invite Code for Students &amp; Teachers: <code style="background:rgba(255,255,255,0.16);padding:2px 8px;border-radius:4px;color:var(--brand-muted-gold);font-weight:700;">${escapeHtml(school.invite_code)}</code>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/school/students" class="btn btn-gold">${icon('graduationCap', 16)} Manage Students</a>
          <a href="/school/reports" class="btn btn-secondary">${icon('barChart', 16)} Semester Reports</a>
        </div>
      </div>
    </div>

    <div class="grid-4" style="margin-bottom:24px;">
      <div class="metric-card">
        <div class="metric-label"><span>Registered Students</span> ${icon('graduationCap', 16)}</div>
        <div class="metric-value">${stats.participatingStudents}</div>
        <div class="metric-sub">Strict institutional isolation</div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Verified Portfolios</span> ${icon('folder', 16)}</div>
        <div class="metric-value">${stats.verifiedPortfolios}</div>
        <div class="metric-sub"><a href="/school/portfolios">Review Portfolios &rarr;</a></div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Assignments Started</span> ${icon('briefcase', 16)}</div>
        <div class="metric-value">${stats.assignmentsStarted}</div>
        <div class="metric-sub"><a href="/school/assignments">Monitor Safety &rarr;</a></div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Verified Passports</span> ${icon('award', 16)}</div>
        <div class="metric-value">${stats.assignmentsAccepted}</div>
        <div class="metric-sub"><a href="/school/passports">View Records &rarr;</a></div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'School Institutional Overview',
    breadcrumb: 'Overview',
    activePath: '/school/dashboard',
    user,
    content,
    flashMessage: flash
  });
}

// Page 2 — Student Management (/school/students)
export function renderSchoolStudentsPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const school = getSchoolForUser(user);
  if (!school) return '';

  const students = db
    .prepare(
      `SELECT stu.*, u.full_name, u.email, tu.full_name as mentor_name
       FROM students stu
       JOIN users u ON u.id = stu.user_id
       LEFT JOIN teachers t ON t.id = stu.mentor_teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       WHERE stu.school_id = ?
       ORDER BY u.full_name ASC`
    )
    .all(school.id) as Array<Record<string, any>>;

  const teachers = db
    .prepare(
      `SELECT t.id, u.full_name, t.subject_specialty
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.school_id = ?`
    )
    .all(school.id) as Array<Record<string, any>>;

  const content = `
    <div class="grid-3">
      <div class="card" style="grid-column: span 2;">
        <h3 style="font-size:18px;margin-bottom:6px;">Institutional Student Roster (${students.length})</h3>
        <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:14px;">
          Only students belonging to <strong>${escapeHtml(school.name)}</strong> are accessible here. Assign supervising mentor teachers and verify identities.
        </p>

        ${
          students.length === 0
            ? `<div class="empty-state"><h4>No students registered yet.</h4></div>`
            : `<div class="table-responsive">
                 <table class="data-table">
                   <thead>
                     <tr>
                       <th>Student Name &amp; NISN</th>
                       <th>Grade &amp; Major</th>
                       <th>Guardian (Private)</th>
                       <th>Identity</th>
                       <th>Assigned Mentor Teacher</th>
                     </tr>
                   </thead>
                   <tbody>
                     ${students
                       .map(
                         (s) => `<tr>
                           <td>
                             <strong>${escapeHtml(s.full_name)}</strong> ${demoBadge(s.is_demo)}
                             <div style="font-size:11.5px;color:var(--brand-muted-gray);">NISN: ${escapeHtml(s.nisn)} &bull; ${escapeHtml(s.email)}</div>
                           </td>
                           <td>${escapeHtml(s.grade)}<br/><span style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(s.major)}</span></td>
                           <td style="font-size:12px;">${escapeHtml(s.guardian_name || '—')}</td>
                           <td>${s.identity_verified ? statusBadge('Verified') : statusBadge('Pending')}</td>
                           <td>
                             <form method="POST" action="/api/school/students/assign-mentor" style="display:flex;gap:6px;margin:0;">
                               <input type="hidden" name="student_id" value="${escapeHtml(s.id)}" />
                               <select name="mentor_teacher_id" class="form-control" style="padding:4px 8px;font-size:12px;">
                                 <option value="">— Unassigned —</option>
                                 ${teachers
                                   .map(
                                     (t) =>
                                       `<option value="${escapeHtml(t.id)}" ${s.mentor_teacher_id === t.id ? 'selected' : ''}>${escapeHtml(t.full_name)} (${escapeHtml(t.subject_specialty)})</option>`
                                   )
                                   .join('')}
                               </select>
                               <button type="submit" class="btn btn-secondary btn-sm">Assign</button>
                             </form>
                           </td>
                         </tr>`
                       )
                       .join('')}
                   </tbody>
                 </table>
               </div>`
        }
      </div>

      <div class="card">
        <h3 style="font-size:17px;margin-bottom:10px;">Register New Student</h3>
        <form method="POST" action="/api/school/students/create">
          <div class="form-group">
            <label class="form-label">Student Full Name *</label>
            <input type="text" name="full_name" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Student Email *</label>
            <input type="email" name="email" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">NISN *</label>
            <input type="text" name="nisn" required class="form-control" />
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Grade</label>
              <select name="grade" class="form-control">
                <option value="Grade 10 (X)">Grade 10 (X)</option>
                <option value="Grade 11 (XI)" selected>Grade 11 (XI)</option>
                <option value="Grade 12 (XII)">Grade 12 (XII)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Major *</label>
              <input type="text" name="major" value="DKV" required class="form-control" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Guardian Name *</label>
            <input type="text" name="guardian_name" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Assign Mentor Teacher</label>
            <select name="mentor_teacher_id" class="form-control">
              <option value="">— Select Teacher —</option>
              ${teachers.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.full_name)}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Register Verified Student</button>
        </form>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Student Management',
    breadcrumb: 'Student Management',
    activePath: '/school/students',
    user,
    content,
    flashMessage: flash
  });
}

// Page 3 — Teacher Management (/school/teachers)
export function renderSchoolTeachersPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const school = getSchoolForUser(user);
  if (!school) return '';

  const teachers = db
    .prepare(
      `SELECT t.*, u.full_name, u.email,
              (SELECT COUNT(*) FROM students s WHERE s.mentor_teacher_id = t.id) as assigned_students
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.school_id = ?
       ORDER BY u.full_name ASC`
    )
    .all(school.id) as Array<Record<string, any>>;

  const content = `
    <div class="grid-3">
      <div class="card" style="grid-column: span 2;">
        <h3 style="font-size:18px;margin-bottom:12px;">Supervising Teachers / Mentors (${teachers.length})</h3>
        ${
          teachers.length === 0
            ? `<div class="empty-state"><h4>No teachers registered yet.</h4></div>`
            : `<div class="table-responsive">
                 <table class="data-table">
                   <thead>
                     <tr>
                       <th>Teacher Name</th>
                       <th>NIP / ID</th>
                       <th>Subject Specialty</th>
                       <th>Assigned Students</th>
                       <th>Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     ${teachers
                       .map(
                         (t) => `<tr>
                           <td>
                             <strong>${escapeHtml(t.full_name)}</strong> ${demoBadge(t.is_demo)}
                             <div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(t.email)}</div>
                           </td>
                           <td>${escapeHtml(t.nip_or_nik || '—')}</td>
                           <td>${escapeHtml(t.subject_specialty)}</td>
                           <td>${t.assigned_students} / ${t.supervision_capacity}</td>
                           <td>${statusBadge(t.verification_status)}</td>
                         </tr>`
                       )
                       .join('')}
                   </tbody>
                 </table>
               </div>`
        }
      </div>

      <div class="card">
        <h3 style="font-size:17px;margin-bottom:10px;">Invite / Add Mentor Teacher</h3>
        <form method="POST" action="/api/school/teachers/create">
          <div class="form-group">
            <label class="form-label">Teacher Full Name &amp; Title *</label>
            <input type="text" name="full_name" required class="form-control" placeholder="e.g. Bapak Budi Santoso, S.Kom." />
          </div>
          <div class="form-group">
            <label class="form-label">Institutional Email *</label>
            <input type="email" name="email" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">NIP / NIK *</label>
            <input type="text" name="nip_or_nik" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Subject Specialty *</label>
            <input type="text" name="subject_specialty" required class="form-control" placeholder="e.g. Multimedia & Design" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Invite &amp; Activate Teacher</button>
        </form>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Teacher Management',
    breadcrumb: 'Teacher Management',
    activePath: '/school/teachers',
    user,
    content,
    flashMessage: flash
  });
}

// Page 4 — UMKM Partners (/school/partners)
export function renderSchoolPartnersPage(user: SessionUser): string {
  const db = getDb();
  const school = getSchoolForUser(user);
  if (!school) return '';

  const partners = db
    .prepare(
      `SELECT b.*,
              (SELECT COUNT(*) FROM assignments a WHERE a.business_id = b.id AND a.assigned_school_id = ?) as school_assignments
       FROM businesses b
       WHERE b.verification_status = 'VERIFIED'
       ORDER BY b.business_name ASC`
    )
    .all(school.id) as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;">Verified UMKM Partners (${partners.length})</h3>
      <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:16px;">
        Businesses verified by the Platform Administrator that offer student-safe assignments on SECOND LIFE.
      </p>
      ${
        partners.length === 0
          ? `<div class="empty-state"><h4>No verified UMKM partners yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Business Name</th>
                     <th>Category &amp; City</th>
                     <th>Description</th>
                     <th>Assignments with Your School</th>
                     <th>Verification</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${partners
                     .map(
                       (b) => `<tr>
                         <td><strong>${escapeHtml(b.business_name)}</strong> ${demoBadge(b.is_demo)}</td>
                         <td>${escapeHtml(b.category)} &bull; ${escapeHtml(b.city)}</td>
                         <td style="max-width:340px;font-size:12.5px;">${escapeHtml(b.description)}</td>
                         <td><strong>${b.school_assignments}</strong> assignment(s)</td>
                         <td>${statusBadge(b.verification_status)}</td>
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
    title: 'UMKM Partners',
    breadcrumb: 'UMKM Partners',
    activePath: '/school/partners',
    user,
    content
  });
}

// Page 5 — Portfolio Verification (/school/portfolios)
export function renderSchoolPortfoliosPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const school = getSchoolForUser(user);
  if (!school) return '';

  const portfolios = db
    .prepare(
      `SELECT p.*, u.full_name as student_name, stu.grade
       FROM portfolios p
       JOIN students stu ON stu.id = p.student_id
       JOIN users u ON u.id = stu.user_id
       WHERE p.school_id = ? AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`
    )
    .all(school.id) as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;">Institutional Portfolio Verification &amp; Publication Authorization</h3>
      <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:16px;">
        Manage school-level publication authorization for portfolios created by students at <strong>${escapeHtml(school.name)}</strong>.
      </p>
      ${
        portfolios.length === 0
          ? `<div class="empty-state"><h4>No portfolios registered at your school yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Title</th>
                     <th>Student</th>
                     <th>Category &amp; Origin</th>
                     <th>Student Consent</th>
                     <th>School Authorization</th>
                     <th>Status</th>
                     <th>Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${portfolios
                     .map(
                       (p) => `<tr>
                         <td><strong>${escapeHtml(p.title)}</strong> ${demoBadge(p.is_demo)}</td>
                         <td>${escapeHtml(p.student_name)} (${escapeHtml(p.grade)})</td>
                         <td>${escapeHtml(p.category)} &bull; ${escapeHtml(p.project_origin)}</td>
                         <td>${p.display_permission ? 'Granted' : 'Private'}</td>
                         <td>${p.school_display_authorized ? statusBadge('Authorized') : statusBadge('Restricted')}</td>
                         <td>${statusBadge(p.status)}</td>
                         <td>
                           <form method="POST" action="/api/mentor/portfolio/verify" style="display:flex;gap:6px;margin:0;">
                             <input type="hidden" name="portfolio_id" value="${escapeHtml(p.id)}" />
                             <input type="hidden" name="identity_verified" value="1" />
                             <input type="hidden" name="originality_verified" value="1" />
                             <input type="hidden" name="permission_verified" value="1" />
                             <input type="hidden" name="notes" value="Verified and authorized at institutional school level." />
                             <button type="submit" name="decision" value="VERIFIED" class="btn btn-primary btn-sm">Verify &amp; Authorize</button>
                             <button type="submit" name="decision" value="REJECTED" class="btn btn-danger btn-sm">Reject</button>
                           </form>
                         </td>
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
    title: 'School Portfolio Verification',
    breadcrumb: 'Portfolio Verification',
    activePath: '/school/portfolios',
    user,
    content,
    flashMessage: flash
  });
}

// Page 6 — Assignment Monitoring (/school/assignments)
export function renderSchoolAssignmentsPage(user: SessionUser): string {
  const db = getDb();
  const school = getSchoolForUser(user);
  if (!school) return '';

  const assignments = db
    .prepare(
      `SELECT a.*, b.business_name, u.full_name as student_name,
              tu.full_name as mentor_name,
              gc.consent_status as guardian_status
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       JOIN students stu ON stu.id = a.selected_student_id
       JOIN users u ON u.id = stu.user_id
       LEFT JOIN teachers t ON t.id = a.assigned_teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       LEFT JOIN guardian_consents gc ON gc.assignment_id = a.id AND gc.student_id = stu.id
       WHERE stu.school_id = ?
       ORDER BY a.updated_at DESC`
    )
    .all(school.id) as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;">Institutional Assignment &amp; Student Safety Monitoring (${assignments.length})</h3>
      <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:16px;">
        Track every assignment involving students from <strong>${escapeHtml(school.name)}</strong>, including mentor supervision and guardian consent status.
      </p>
      ${
        assignments.length === 0
          ? `<div class="empty-state"><h4>No assignments associated with your school's students yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Assignment Title</th>
                     <th>Student</th>
                     <th>UMKM Partner</th>
                     <th>Mentor Teacher</th>
                     <th>Guardian Consent</th>
                     <th>Safety Stage</th>
                     <th>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${assignments
                     .map(
                       (a) => `<tr>
                         <td><strong>${escapeHtml(a.title)}</strong> ${demoBadge(a.is_demo)}</td>
                         <td>${escapeHtml(a.student_name)}</td>
                         <td>${escapeHtml(a.business_name)}</td>
                         <td>${escapeHtml(a.mentor_name || 'Assigned Mentor')}</td>
                         <td>${statusBadge(a.guardian_status || 'PENDING')}</td>
                         <td>Stage ${a.current_safety_stage}/6</td>
                         <td>${statusBadge(a.status)}</td>
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
    title: 'Institutional Assignment Monitoring',
    breadcrumb: 'Assignment Monitoring',
    activePath: '/school/assignments',
    user,
    content
  });
}

// Page 7 — Experience Records (/school/passports)
export function renderSchoolPassportsPage(user: SessionUser): string {
  const db = getDb();
  const school = getSchoolForUser(user);
  if (!school) return '';

  const records = db
    .prepare(
      `SELECT ep.*, u.full_name as student_name, stu.grade
       FROM experience_passports ep
       JOIN students stu ON stu.id = ep.student_id
       JOIN users u ON u.id = stu.user_id
       WHERE ep.school_id = ?
       ORDER BY ep.issued_at DESC`
    )
    .all(school.id) as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:12px;">School Experience Passport Registry (${records.length})</h3>
      ${
        records.length === 0
          ? `<div class="empty-state"><h4>No Experience Passport records issued for your school yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Verification Code</th>
                     <th>Student</th>
                     <th>Assignment &amp; UMKM</th>
                     <th>Completion Date</th>
                     <th>Outcome Status</th>
                     <th>Verification</th>
                     <th>Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${records
                     .map(
                       (r) => `<tr>
                         <td><code>${escapeHtml(r.verification_code)}</code></td>
                         <td><strong>${escapeHtml(r.student_name)}</strong> (${escapeHtml(r.grade)}) ${demoBadge(r.is_demo)}</td>
                         <td>
                           <div>${escapeHtml(r.assignment_title)}</div>
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(r.business_name)}</div>
                         </td>
                         <td>${escapeHtml(r.completion_date)}</td>
                         <td>${statusBadge(r.outcome_status)}</td>
                         <td>${statusBadge(r.verification_status)}</td>
                         <td><a href="/verify/${escapeHtml(r.verification_code)}" target="_blank" class="btn btn-secondary btn-sm">Verify &nearr;</a></td>
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
    title: 'Institutional Experience Passport Records',
    breadcrumb: 'Experience Records',
    activePath: '/school/passports',
    user,
    content
  });
}

// Page 8 — Institutional Reports (/school/reports)
export function renderSchoolReportsPage(user: SessionUser): string {
  const school = getSchoolForUser(user);
  if (!school) return '';
  const stats = computeSchoolMetrics(school.id);

  const content = `
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font-size:18px;margin:0;">Semester Institutional Report — ${escapeHtml(school.semester_label)}</h3>
          <p style="font-size:13px;color:var(--brand-muted-gray);margin:4px 0 0;">
            Institution: <strong>${escapeHtml(school.name)}</strong> (NPSN: ${escapeHtml(school.npsn)})
          </p>
        </div>
        <div class="no-print" style="display:flex;gap:10px;">
          <button type="button" onclick="window.print()" class="btn btn-secondary">${icon('printer', 15)} Export Printable PDF</button>
          <a href="/api/reports/export-csv?scope=school" class="btn btn-primary">${icon('download', 15)} Download CSV Report</a>
        </div>
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
        <div class="metric-label"><span>Assignments Completed</span></div>
        <div class="metric-value">${stats.assignmentsCompleted}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Accepted Passports</span></div>
        <div class="metric-value">${stats.assignmentsAccepted}</div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Institutional Reports (PDF & CSV)',
    breadcrumb: 'Institutional Reports',
    activePath: '/school/reports',
    user,
    content
  });
}

// Page 9 — School Settings (/school/settings)
export function renderSchoolSettingsPage(user: SessionUser, flash?: string | null): string {
  const school = getSchoolForUser(user);
  if (!school) return '';

  const content = `
    <div class="card" style="max-width:760px;">
      <h3 style="font-size:18px;margin-bottom:14px;">School Institutional Configuration</h3>
      <form method="POST" action="/api/school/settings/update">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Official Institution Name *</label>
            <input type="text" name="name" required value="${escapeHtml(school.name)}" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">NPSN (Read-Only)</label>
            <input type="text" readonly value="${escapeHtml(school.npsn)}" class="form-control" style="background:var(--brand-warm-ivory);" />
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Principal / Head of PKBM Name</label>
            <input type="text" name="principal_name" value="${escapeHtml(school.principal_name || '')}" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Active Semester Label *</label>
            <input type="text" name="semester_label" required value="${escapeHtml(school.semester_label)}" class="form-control" />
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Institutional Contact Email *</label>
            <input type="email" name="contact_email" required value="${escapeHtml(school.contact_email)}" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Controlled School Invite Code</label>
            <input type="text" name="invite_code" required value="${escapeHtml(school.invite_code)}" class="form-control" />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Save Institutional Settings</button>
      </form>
    </div>
  `;

  return renderDashboardLayout({
    title: 'School Settings',
    breadcrumb: 'School Settings',
    activePath: '/school/settings',
    user,
    content,
    flashMessage: flash
  });
}
