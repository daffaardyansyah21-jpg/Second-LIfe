// ============================================================================
// SECOND LIFE — Student Dashboard Pages (/student/*)
// ============================================================================

import { getDb } from '../lib/db.ts';
import { evaluatePassportEligibility } from '../lib/status-engine.ts';
import { APPROVED_ASSIGNMENT_CATEGORIES, SIX_STAGE_SAFETY_SYSTEM } from '../types/domain.ts';
import type { SessionUser } from '../types/domain.ts';
import { demoBadge, escapeHtml, formatIdr, icon, renderDashboardLayout, renderSecondLifeLogo, safeJsonParse, statusBadge } from './layout.ts';

function getStudentProfile(userId: string): Record<string, any> | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         stu.*, u.full_name, u.email, u.avatar_url,
         s.name as school_name, s.city as school_city, s.type as school_type,
         tu.full_name as mentor_name, t.subject_specialty as mentor_specialty
       FROM students stu
       JOIN users u ON u.id = stu.user_id
       JOIN schools s ON s.id = stu.school_id
       LEFT JOIN teachers t ON t.id = stu.mentor_teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       WHERE stu.user_id = ?`
    )
    .get(userId) as Record<string, any> | undefined;
}

// Page 1 — Student Overview (/student/dashboard)
export function renderStudentOverviewPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) {
    return renderDashboardLayout({
      title: 'Student Overview',
      breadcrumb: 'Overview',
      activePath: '/student/dashboard',
      user,
      content: `<div class="alert alert-error">Student profile record not found.</div>`
    });
  }

  const portfolios = db
    .prepare('SELECT * FROM portfolios WHERE student_id = ? AND deleted_at IS NULL ORDER BY created_at DESC')
    .all(student.id) as Array<Record<string, any>>;

  const assignments = db
    .prepare(
      `SELECT a.*, b.business_name
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       WHERE a.selected_student_id = ? AND a.deleted_at IS NULL
       ORDER BY a.updated_at DESC`
    )
    .all(student.id) as Array<Record<string, any>>;

  const applications = db
    .prepare(
      `SELECT app.*, a.title as assignment_title, a.status as assignment_status, a.deadline, b.business_name
       FROM assignment_applications app
       JOIN assignments a ON a.id = app.assignment_id
       JOIN businesses b ON b.id = a.business_id
       WHERE app.student_id = ?
       ORDER BY app.created_at DESC`
    )
    .all(student.id) as Array<Record<string, any>>;

  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5')
    .all(user.id) as Array<Record<string, any>>;

  // Calculate actual profile completion %
  let filledFields = 0;
  const totalFields = 6;
  if (student.full_name) filledFields++;
  if (student.nisn) filledFields++;
  if (student.grade) filledFields++;
  if (safeJsonParse<string[]>(student.skills_json, []).length > 0) filledFields++;
  if (student.bio && student.bio.trim().length > 10) filledFields++;
  if (student.guardian_name) filledFields++;
  const profileCompletionPct = Math.round((filledFields / totalFields) * 100);

  const verifiedPortfoliosCount = portfolios.filter((p) => p.status === 'Verified' || p.status === 'Published').length;
  const activeAssignmentsCount = assignments.filter((a) =>
    ['Ready to Start', 'In Progress', 'Submitted', 'Under Review', 'Revision Requested'].includes(a.status)
  ).length;
  const completedAssignmentsCount = assignments.filter((a) =>
    ['Accepted', 'School Verification', 'Closed'].includes(a.status)
  ).length;
  const pendingApprovalsCount =
    portfolios.filter((p) => ['Submitted', 'Under School Review'].includes(p.status)).length +
    applications.filter((ap) => ap.status === 'APPLIED').length +
    assignments.filter((a) => ['Student Applied', 'Teacher Approval Pending', 'Guardian Consent Pending'].includes(a.status)).length;

  const content = `
    <!-- MagangHub-Style Student Workspace Banner -->
    <div class="mh-hero" style="margin-bottom:24px;padding:28px 32px;border-radius:var(--radius-lg);box-shadow:var(--shadow-md);">
      <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div>
          <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);font-size:11px;color:var(--brand-muted-gold);font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">
            <span style="width:7px;height:7px;border-radius:50%;background:var(--brand-muted-gold);"></span>
            SHOW &rarr; TRY &rarr; VERIFY STUDENT WORKSPACE
          </div>
          <h2 style="color:#FFFFFF;font-size:26px;font-weight:800;margin:0 0 6px;letter-spacing:-0.02em;">Welcome back, ${escapeHtml(student.full_name)} ${demoBadge(student.is_demo)}</h2>
          <p style="margin:0;font-size:13.5px;color:rgba(255,255,255,0.84);">
            ${escapeHtml(student.grade)} &bull; ${escapeHtml(student.major)} at <strong>${escapeHtml(student.school_name)}</strong>
            ${student.mentor_name ? ` &bull; Supervising Teacher: <strong>${escapeHtml(student.mentor_name)}</strong>` : ''}
          </p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/student/portfolio" class="btn btn-gold btn-pill">${icon('folder', 16)} Manage Portfolio (${portfolios.length}/3)</a>
          <a href="/student/opportunities" class="btn btn-pill" style="background:rgba(255,255,255,0.12);color:#FFFFFF;border:1px solid rgba(255,255,255,0.28);">${icon('compass', 16)} Explore UMKM Tasks</a>
        </div>
      </div>
    </div>

    <!-- Non-Monotonous Unified Horizontal Stat Ribbon -->
    <div class="stat-ribbon">
      <div class="stat-ribbon-cell">
        <div class="stat-ribbon-label">Profile Completion <span class="icon-squircle" style="width:28px;height:28px;border-radius:8px;">${icon('user', 14)}</span></div>
        <div class="stat-ribbon-value">${profileCompletionPct}%</div>
        <div class="stat-ribbon-meta">${student.identity_verified ? 'School Identity Verified' : 'Awaiting School Check'}</div>
      </div>
      <div class="stat-ribbon-cell">
        <div class="stat-ribbon-label">Verified Portfolios (SHOW) <span class="icon-squircle icon-squircle-gold" style="width:28px;height:28px;border-radius:8px;">${icon('folder', 14)}</span></div>
        <div class="stat-ribbon-value">${verifiedPortfoliosCount} <span style="font-size:15px;color:var(--brand-muted-gray);font-weight:600;">/ ${portfolios.length}</span></div>
        <div class="stat-ribbon-meta">Max 3 school projects allowed</div>
      </div>
      <div class="stat-ribbon-cell">
        <div class="stat-ribbon-label">Active &amp; Pending (TRY) <span class="icon-squircle" style="width:28px;height:28px;border-radius:8px;">${icon('briefcase', 14)}</span></div>
        <div class="stat-ribbon-value">${activeAssignmentsCount}</div>
        <div class="stat-ribbon-meta">${pendingApprovalsCount} pending approval(s)</div>
      </div>
      <div class="stat-ribbon-cell stat-ribbon-cell-highlight">
        <div class="stat-ribbon-label">Sertifikat Pengalaman (VERIFY) <span>${icon('award', 15)}</span></div>
        <div class="stat-ribbon-value">${completedAssignmentsCount}</div>
        <div class="stat-ribbon-meta"><a href="/student/passport" style="color:var(--brand-muted-gold);font-weight:700;">Buka Sertifikat Pengalaman &rarr;</a></div>
      </div>
    </div>

    <!-- Asymmetric Cockpit Split (1.4fr Primary Workspace + 0.85fr Activity Rail) -->
    <div class="cockpit-split">
      <!-- Upcoming Deadlines & Active Assignments -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div>
            <h3 style="font-size:17px;margin:0;">Active Assignments &amp; Deadlines</h3>
            <p style="font-size:12.5px;color:var(--brand-muted-gray);margin:2px 0 0;">Penugasan mikro UMKM yang sedang berjalan di bawah supervisi guru</p>
          </div>
          <a href="/student/assignments" style="font-size:12.5px;font-weight:700;">View All &rarr;</a>
        </div>
        ${
          assignments.length === 0
            ? `<div class="empty-state" style="padding:24px;">
                 <h4>No active assignments yet.</h4>
                 <p style="font-size:13px;margin:0 0 12px;">Once your school portfolio is verified, apply to supervised UMKM micro-assignments.</p>
                 <a href="/student/opportunities" class="btn btn-secondary btn-sm">Browse Opportunities</a>
               </div>`
            : `<div style="display:flex;flex-direction:column;gap:10px;">
                 ${assignments
                   .slice(0, 4)
                   .map(
                     (a) => `<div style="padding:14px 16px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--brand-warm-ivory);">
                       <div>
                         <div style="font-weight:700;font-size:14px;">
                           <a href="/student/assignments/${escapeHtml(a.id)}">${escapeHtml(a.title)}</a>
                           ${demoBadge(a.is_demo)}
                         </div>
                         <div style="font-size:12.5px;color:var(--brand-muted-gray);margin-top:3px;">
                           ${escapeHtml(a.business_name)} &bull; Deadline: <strong style="color:var(--brand-dark-navy);">${escapeHtml(a.deadline)}</strong>
                         </div>
                       </div>
                       ${statusBadge(a.status)}
                     </div>`
                   )
                   .join('')}
               </div>`
        }
      </div>

      <!-- Recent Notifications & Activity -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="font-size:17px;margin:0;">Recent Activity &amp; Notifications</h3>
          <a href="/student/notifications" style="font-size:12.5px;font-weight:700;">All &rarr;</a>
        </div>
        ${
          notifications.length === 0
            ? `<div class="empty-state" style="padding:24px;">
                 <h4>No recent notifications.</h4>
                 <p style="font-size:13px;margin:0;">System events for portfolio reviews, teacher approvals, and UMKM feedback will appear here.</p>
               </div>`
            : `<div style="display:flex;flex-direction:column;gap:10px;">
                 ${notifications
                   .map(
                     (n) => `<a href="${escapeHtml(n.link_url)}" style="padding:11px 14px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);background:${n.is_read ? '#FFFFFF' : 'var(--brand-light-lavender)'};display:block;">
                       <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:var(--brand-dark-navy);">
                         <span>${escapeHtml(n.title)} ${demoBadge(n.is_demo)}</span>
                         <span style="font-size:11px;color:var(--brand-muted-gray);">${escapeHtml(n.created_at)}</span>
                       </div>
                       <div style="font-size:12.5px;color:var(--brand-charcoal);margin-top:3px;">${escapeHtml(n.message)}</div>
                     </a>`
                   )
                   .join('')}
               </div>`
        }
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Student Overview',
    breadcrumb: 'Overview',
    activePath: '/student/dashboard',
    user,
    content,
    flashMessage: flash
  });
}

// Page 2 — My Portfolio (SHOW) (/student/portfolio & /student/portfolio/:id)
export function renderStudentPortfolioPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const portfolios = db
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM portfolio_files pf WHERE pf.portfolio_id = p.id) as file_count
       FROM portfolios p
       WHERE p.student_id = ? AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`
    )
    .all(student.id) as Array<Record<string, any>>;

  const canUploadMore = portfolios.length < 3;

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
      <div>
        <p style="margin:0;font-size:14px;color:var(--brand-charcoal);">
          <strong>SHOW Stage:</strong> Upload 1–3 existing school projects, vocational practicums, or extracurricular works. Only school-verified portfolios can be published as verified.
        </p>
      </div>
      <span class="status-badge badge-neutral">Portfolio Slots Used: ${portfolios.length} / 3</span>
    </div>

    <!-- Existing Portfolios List -->
    <div class="card" style="margin-bottom:26px;">
      <h3 style="font-size:18px;margin-bottom:14px;">My School Project Portfolios</h3>
      ${
        portfolios.length === 0
          ? `<div class="empty-state">
               ${icon('folder', 32)}
               <h4>No school projects uploaded yet.</h4>
               <p style="font-size:13.5px;margin:0;">Use the form below to upload your first existing school project (up to 3 works).</p>
             </div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Project Title</th>
                     <th>Category &amp; Origin</th>
                     <th>Skills</th>
                     <th>Files</th>
                     <th>Workflow Status</th>
                     <th>Reviewer Notes</th>
                     <th>Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${portfolios
                     .map((p) => {
                       const skills = safeJsonParse<string[]>(p.skills_json, []);
                       return `<tr>
                         <td>
                           <strong><a href="/student/portfolio/${escapeHtml(p.id)}">${escapeHtml(p.title)}</a></strong>
                           ${demoBadge(p.is_demo)}
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">Created: ${escapeHtml(p.creation_date)}</div>
                         </td>
                         <td>
                           <div>${escapeHtml(p.category)}</div>
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(p.project_origin)}</div>
                         </td>
                         <td>${skills.map((s) => `<span class="status-badge badge-neutral" style="margin:2px;">${escapeHtml(s)}</span>`).join('')}</td>
                         <td>${p.file_count} file(s)</td>
                         <td>${statusBadge(p.status)}</td>
                         <td style="max-width:220px;font-size:12px;">
                           ${p.reviewer_notes ? escapeHtml(p.reviewer_notes) : '<span style="color:var(--brand-muted-gray);">—</span>'}
                         </td>
                         <td>
                           <div style="display:flex;gap:6px;flex-wrap:wrap;">
                             <a href="/student/portfolio/${escapeHtml(p.id)}" class="btn btn-secondary btn-sm">Manage / Edit</a>
                             ${
                               p.status === 'Draft' || p.status === 'Rejected'
                                 ? `<form method="POST" action="/api/student/portfolio/status" style="margin:0;">
                                      <input type="hidden" name="portfolio_id" value="${escapeHtml(p.id)}" />
                                      <input type="hidden" name="next_status" value="Submitted" />
                                      <button type="submit" class="btn btn-primary btn-sm">Submit for School Review</button>
                                    </form>`
                                 : ''
                             }
                             ${
                               p.status === 'Verified'
                                 ? `<form method="POST" action="/api/student/portfolio/status" style="margin:0;">
                                      <input type="hidden" name="portfolio_id" value="${escapeHtml(p.id)}" />
                                      <input type="hidden" name="next_status" value="Published" />
                                      <button type="submit" class="btn btn-gold btn-sm">Publish to Discovery</button>
                                    </form>`
                                 : ''
                             }
                           </div>
                         </td>
                       </tr>`;
                     })
                     .join('')}
                 </tbody>
               </table>
             </div>`
      }
    </div>

    <!-- Create New Portfolio Form -->
    ${
      !canUploadMore
        ? `<div class="alert alert-info">
             You have reached the maximum of 3 school portfolio works. To add a different work, you may edit or delete a draft portfolio.
           </div>`
        : `<div class="card">
             <h3 style="font-size:18px;margin-bottom:6px;">Upload Existing School Project (Slot ${portfolios.length + 1} of 3)</h3>
             <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:18px;">
               Workflow: <code>Draft &rarr; Submitted &rarr; Under School Review &rarr; Verified / Rejected &rarr; Published</code>. Students cannot self-verify portfolios.
             </p>
             <form method="POST" action="/api/student/portfolio/create" enctype="multipart/form-data">
               <div class="grid-2">
                 <div class="form-group">
                   <label class="form-label">Project Title *</label>
                   <input type="text" name="title" required class="form-control" placeholder="e.g. Grade 11 Product Packaging & Catalog Layout" />
                 </div>
                 <div class="form-group">
                   <label class="form-label">Project Category *</label>
                   <select name="category" required class="form-control">
                     ${APPROVED_ASSIGNMENT_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                   </select>
                 </div>
               </div>

               <div class="grid-3">
                 <div class="form-group">
                   <label class="form-label">Project Origin *</label>
                   <select name="project_origin" required class="form-control">
                     <option value="School Assignment">School Assignment</option>
                     <option value="Vocational Practicum">Vocational Practicum</option>
                     <option value="Extracurricular Project">Extracurricular Project</option>
                     <option value="School Competition">School Competition</option>
                     <option value="Personal Learning Project">Personal Learning Project</option>
                   </select>
                 </div>
                 <div class="form-group">
                   <label class="form-label">Project Creation Date *</label>
                   <input type="date" name="creation_date" required value="2026-10-01" class="form-control" />
                 </div>
                 <div class="form-group">
                   <label class="form-label">Skills Demonstrated (comma-separated) *</label>
                   <input type="text" name="skills" required class="form-control" placeholder="e.g. Graphic Design, Typography, Print Layout" />
                 </div>
               </div>

               <div class="form-group">
                 <label class="form-label">Project Description *</label>
                 <textarea name="description" rows="3" required class="form-control" placeholder="Describe the school assignment brief, tools used, and what you created..."></textarea>
               </div>

               <div class="grid-2">
                 <div class="form-group">
                   <label class="form-label">Collaborative or Individual Work? *</label>
                   <select name="is_collaborative" class="form-control">
                     <option value="0">Individual Student Project</option>
                     <option value="1">Collaborative Group Project</option>
                   </select>
                 </div>
                 <div class="form-group">
                   <label class="form-label">Your Actual Contribution (Mandatory for Group &amp; Individual Works) *</label>
                   <input type="text" name="student_contribution" required class="form-control" placeholder="Specify exact parts you created (e.g. layout grid, cover illustration)" />
                 </div>
               </div>

               <div class="grid-2" style="background:var(--brand-warm-ivory);padding:14px;border-radius:var(--radius-sm);margin-bottom:16px;">
                 <div>
                   <label class="form-label">Supporting File Name &amp; Format (JPG, JPEG, PNG, PDF, MP4) *</label>
                   <input type="text" name="file_name" required class="form-control" placeholder="e.g. school-project-v1.pdf" value="school-project-work.pdf" />
                   <div class="form-help">Or attach a local file below (validated for JPG, JPEG, PNG, PDF, MP4, max 25MB):</div>
                   <input type="file" name="file_upload" accept=".jpg,.jpeg,.png,.pdf,.mp4" class="form-control" style="margin-top:6px;" />
                 </div>
                 <div>
                   <label class="form-label">File Summary / Description *</label>
                   <input type="text" name="preview_summary" required class="form-control" placeholder="e.g. 4-page PDF layout and source typography sheet" />
                   <label class="form-label" style="margin-top:8px;">Initial Submission Action</label>
                   <select name="submit_immediately" class="form-control">
                     <option value="1">Submit Immediately for School Verification</option>
                     <option value="0">Save as Draft</option>
                   </select>
                 </div>
               </div>

               <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;font-size:13px;">
                 <label style="display:flex;align-items:center;gap:8px;">
                   <input type="checkbox" name="display_permission" value="1" required checked />
                   <span><strong>Permission to Display:</strong> I authorize SECOND LIFE and my school to display this work in Verified Student Discovery once approved.</span>
                 </label>
                 <label style="display:flex;align-items:center;gap:8px;">
                   <input type="checkbox" name="copyright_declaration" value="1" required checked />
                   <span><strong>Copyright &amp; Originality Declaration:</strong> I declare that this is my authentic school/learning work and I have accurately stated my contribution.</span>
                 </label>
               </div>

               <button type="submit" class="btn btn-primary">${icon('plusCircle', 16)} Save Portfolio Work</button>
             </form>
           </div>`
    }
  `;

  return renderDashboardLayout({
    title: 'My Portfolio (SHOW)',
    breadcrumb: 'My Portfolio',
    activePath: '/student/portfolio',
    user,
    content,
    flashMessage: flash
  });
}

export function renderStudentPortfolioDetailPage(
  user: SessionUser,
  portfolioId: string,
  flash?: string | null
): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const p = db
    .prepare('SELECT * FROM portfolios WHERE id = ? AND student_id = ? AND deleted_at IS NULL')
    .get(portfolioId, student.id) as Record<string, any> | undefined;

  if (!p) {
    return renderDashboardLayout({
      title: 'Portfolio Not Found',
      breadcrumb: 'Portfolio Detail',
      activePath: '/student/portfolio',
      user,
      content: `<div class="alert alert-error">Portfolio not found or you do not have permission to access it.</div>`
    });
  }

  const files = db
    .prepare('SELECT * FROM portfolio_files WHERE portfolio_id = ?')
    .all(p.id) as Array<Record<string, any>>;

  const verifications = db
    .prepare('SELECT * FROM portfolio_verifications WHERE portfolio_id = ? ORDER BY created_at DESC')
    .all(p.id) as Array<Record<string, any>>;

  const skills = safeJsonParse<string[]>(p.skills_json, []);
  const canEdit = ['Draft', 'Rejected'].includes(p.status);

  const content = `
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <a href="/student/portfolio" style="font-size:13.5px;font-weight:600;">&larr; Back to My Portfolio</a>
      ${statusBadge(p.status)}
    </div>

    ${
      p.status === 'Rejected' && p.reviewer_notes
        ? `<div class="alert alert-error">
             <div>
               <strong>School Reviewer Feedback (Revision Needed before Resubmission):</strong><br/>
               ${escapeHtml(p.reviewer_notes)}
             </div>
           </div>`
        : ''
    }

    <div class="grid-3">
      <div class="card" style="grid-column: span 2;">
        <h2 style="font-size:22px;margin-bottom:12px;">${escapeHtml(p.title)} ${demoBadge(p.is_demo)}</h2>

        <form method="POST" action="/api/student/portfolio/update">
          <input type="hidden" name="portfolio_id" value="${escapeHtml(p.id)}" />
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Project Title</label>
              <input type="text" name="title" value="${escapeHtml(p.title)}" ${canEdit ? '' : 'readonly'} class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select name="category" class="form-control" ${canEdit ? '' : 'disabled'}>
                ${APPROVED_ASSIGNMENT_CATEGORIES.map(
                  (c) => `<option value="${escapeHtml(c)}" ${p.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea name="description" rows="3" ${canEdit ? '' : 'readonly'} class="form-control">${escapeHtml(p.description)}</textarea>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Skills Demonstrated (comma-separated)</label>
              <input type="text" name="skills" value="${escapeHtml(skills.join(', '))}" ${canEdit ? '' : 'readonly'} class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Declared Contribution</label>
              <input type="text" name="student_contribution" value="${escapeHtml(p.student_contribution)}" ${canEdit ? '' : 'readonly'} class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <input type="checkbox" name="display_permission" value="1" ${p.display_permission ? 'checked' : ''} />
              <span>Authorize public &amp; UMKM discovery visibility (when verified by school)</span>
            </label>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            ${
              canEdit
                ? `<button type="submit" name="resubmit" value="1" class="btn btn-gold">Save &amp; Submit for School Verification</button>`
                : ''
            }
          </div>
        </form>

        ${
          p.status === 'Draft'
            ? `<form method="POST" action="/api/student/portfolio/delete" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-subtle);">
                 <input type="hidden" name="portfolio_id" value="${escapeHtml(p.id)}" />
                 <button type="submit" class="btn btn-danger btn-sm">Delete Draft Portfolio</button>
               </form>`
            : ''
        }
      </div>

      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="card">
          <h3 style="font-size:16px;margin-bottom:10px;">Supporting Files</h3>
          ${files
            .map(
              (f) => `<div style="padding:10px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);margin-bottom:8px;font-size:13px;">
                <div style="font-weight:600;">${escapeHtml(f.file_name)} (${escapeHtml(f.file_type)})</div>
                <div style="font-size:11.5px;color:var(--brand-muted-gray);margin:4px 0;">${escapeHtml(f.preview_summary || '')}</div>
                <a href="/api/files/download?type=portfolio&id=${escapeHtml(f.id)}" class="btn btn-secondary btn-sm">${icon('download', 13)} Download</a>
              </div>`
            )
            .join('')}
        </div>

        <div class="card">
          <h3 style="font-size:16px;margin-bottom:10px;">Verification Audit Trail</h3>
          ${
            verifications.length === 0
              ? `<p style="font-size:13px;color:var(--brand-muted-gray);margin:0;">No school verification reviews recorded yet.</p>`
              : verifications
                  .map(
                    (v) => `<div style="padding:10px;background:var(--brand-warm-ivory);border-radius:var(--radius-sm);margin-bottom:8px;font-size:12.5px;">
                      <div>${statusBadge(v.decision)} &bull; ${escapeHtml(v.reviewer_role)}</div>
                      <p style="margin:6px 0;">${escapeHtml(v.notes)}</p>
                      <div style="font-size:11px;color:var(--brand-muted-gray);">${escapeHtml(v.created_at)}</div>
                    </div>`
                  )
                  .join('')
          }
        </div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: `Portfolio: ${p.title}`,
    breadcrumb: 'Portfolio Detail',
    activePath: '/student/portfolio',
    user,
    content,
    flashMessage: flash
  });
}

// Page 3 — Explore Opportunities (/student/opportunities & /student/opportunities/:id)
export function renderStudentOpportunitiesPage(
  user: SessionUser,
  query: { q?: string; category?: string },
  flash?: string | null
): string {
  const db = getDb();
  const q = (query.q || '').trim();
  const category = (query.category || '').trim();

  let sql = `
    SELECT
      a.*, b.business_name, b.city as business_city, b.verification_status as business_verified
    FROM assignments a
    JOIN businesses b ON b.id = a.business_id
    WHERE a.status = 'Published' AND a.deleted_at IS NULL
  `;
  const params: any[] = [];
  if (q) {
    sql += ` AND (a.title LIKE ? OR a.description LIKE ? OR b.business_name LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += ` AND a.category = ?`;
    params.push(category);
  }
  sql += ` ORDER BY a.created_at DESC`;

  const opportunities = db.prepare(sql).all(...params) as Array<Record<string, any>>;

  const content = `
    <!-- Filter Bar -->
    <form method="GET" action="/student/opportunities" class="card" style="margin-bottom:22px;padding:18px;">
      <div class="grid-3" style="align-items:end;">
        <div>
          <label class="form-label">Search Assignment or UMKM</label>
          <input type="text" name="q" value="${escapeHtml(q)}" class="form-control" placeholder="Search title, deliverables, business..." />
        </div>
        <div>
          <label class="form-label">Assignment Category</label>
          <select name="category" class="form-control">
            <option value="">All Categories</option>
            ${APPROVED_ASSIGNMENT_CATEGORIES.map(
              (c) => `<option value="${escapeHtml(c)}" ${category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
            ).join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="submit" class="btn btn-primary" style="flex:1;">${icon('search', 15)} Filter</button>
          <a href="/student/opportunities" class="btn btn-secondary">Reset</a>
        </div>
      </div>
    </form>

    ${
      opportunities.length === 0
        ? `<div class="empty-state">
             ${icon('compass', 32)}
             <h4>No assignments have been published.</h4>
             <p style="font-size:13.5px;max-width:520px;margin:0 auto;">
               Only assignments reviewed and approved by the Platform Administrator appear here.
             </p>
           </div>`
        : `<div class="grid-2">
             ${opportunities
               .map((op) => {
                 const skills = safeJsonParse<string[]>(op.required_skills_json, []);
                 return `<div class="visual-card">
                   <div class="visual-card-cover" style="height:105px;padding:16px 22px;">
                     <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">
                       <span class="status-badge" style="background:rgba(255,255,255,0.16);color:#FFFFFF;border:1px solid rgba(255,255,255,0.28);">${escapeHtml(op.category)}</span>
                       ${statusBadge(op.status)}
                     </div>
                     <div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;color:rgba(255,255,255,0.92);font-size:12.5px;font-weight:700;">
                       <span>${icon('building', 14)} ${escapeHtml(op.business_name)} (${escapeHtml(op.business_city)})</span>
                       <span style="background:rgba(217,189,131,0.24);color:var(--brand-muted-gold);padding:3px 10px;border-radius:999px;border:1px solid rgba(217,189,131,0.4);">${formatIdr(op.compensation_amount_idr)}</span>
                     </div>
                   </div>
                   <div class="visual-card-body">
                     <div>
                       <h3 style="font-size:18px;margin-bottom:8px;">
                         <a href="/student/opportunities/${escapeHtml(op.id)}" style="color:var(--brand-dark-navy);">${escapeHtml(op.title)}</a>
                         ${demoBadge(op.is_demo)}
                       </h3>
                       <p style="font-size:13.5px;color:var(--brand-charcoal);margin-bottom:14px;">
                         ${escapeHtml(op.description)}
                       </p>
                       <div class="meta-spec-grid" style="padding:14px 16px;margin-bottom:14px;">
                         <div class="meta-spec-item">
                           <span class="meta-spec-label">Deliverables</span>
                           <span class="meta-spec-value">${escapeHtml(op.deliverables)}</span>
                         </div>
                         <div class="meta-spec-item">
                           <span class="meta-spec-label">Duration &amp; Deadline</span>
                           <span class="meta-spec-value">${op.estimated_duration_hours} hrs &bull; ${escapeHtml(op.deadline)}</span>
                         </div>
                         <div class="meta-spec-item">
                           <span class="meta-spec-label">Revision Limit</span>
                           <span class="meta-spec-value">Max ${op.max_revisions} revision(s)</span>
                         </div>
                         <div class="meta-spec-item">
                           <span class="meta-spec-label">Mentor Supervision</span>
                           <span class="meta-spec-value">${escapeHtml(op.mentor_requirements)}</span>
                         </div>
                       </div>
                       <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
                         ${skills.map((s) => `<span class="status-badge badge-neutral">${escapeHtml(s)}</span>`).join('')}
                       </div>
                     </div>
                     <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-subtle);padding-top:14px;">
                       <span style="font-size:12px;color:#14532D;font-weight:700;">${icon('shield', 14)} Supervised Micro-Assignment</span>
                       <a href="/student/opportunities/${escapeHtml(op.id)}" class="btn btn-primary btn-sm btn-pill">
                         View Full Brief &amp; Apply ${icon('arrowRight', 14)}
                       </a>
                     </div>
                   </div>
                 </div>`;
               })
               .join('')}
           </div>`
    }
  `;

  return renderDashboardLayout({
    title: 'Explore UMKM Opportunities (TRY)',
    breadcrumb: 'Explore Opportunities',
    activePath: '/student/opportunities',
    user,
    content,
    flashMessage: flash
  });
}

export function renderStudentOpportunityDetailPage(
  user: SessionUser,
  assignmentId: string,
  flash?: string | null
): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const op = db
    .prepare(
      `SELECT a.*, b.business_name, b.city as business_city, b.category as business_category
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       WHERE a.id = ? AND a.deleted_at IS NULL`
    )
    .get(assignmentId) as Record<string, any> | undefined;

  if (!op) {
    return renderDashboardLayout({
      title: 'Opportunity Not Found',
      breadcrumb: 'Opportunity Detail',
      activePath: '/student/opportunities',
      user,
      content: `<div class="alert alert-error">Opportunity not found.</div>`
    });
  }

  const verifiedPortfolios = db
    .prepare(
      `SELECT id, title, category, status FROM portfolios
       WHERE student_id = ? AND status IN ('Verified', 'Published') AND deleted_at IS NULL`
    )
    .all(student.id) as Array<Record<string, any>>;

  const existingApp = db
    .prepare('SELECT * FROM assignment_applications WHERE assignment_id = ? AND student_id = ?')
    .get(assignmentId, student.id) as Record<string, any> | undefined;

  const skills = safeJsonParse<string[]>(op.required_skills_json, []);
  const criteria = safeJsonParse<string[]>(op.evaluation_criteria_json, []);

  const content = `
    <div style="margin-bottom:16px;">
      <a href="/student/opportunities" style="font-size:13.5px;font-weight:600;">&larr; Back to Explore Opportunities</a>
    </div>

    <div class="grid-3">
      <div class="card" style="grid-column: span 2;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span class="status-badge badge-neutral">${escapeHtml(op.category)}</span>
          ${statusBadge(op.status)}
        </div>
        <h2 style="font-size:22px;font-weight:600;margin-bottom:6px;line-height:1.3;">${escapeHtml(op.title)} ${demoBadge(op.is_demo)}</h2>
        <div style="font-size:13.5px;color:var(--brand-deep-purple);font-weight:500;margin-bottom:20px;">
          Offered by <strong>${escapeHtml(op.business_name)}</strong> (${escapeHtml(op.business_city)})
        </div>

        <div style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;margin-bottom:6px;">
          Full Assignment Brief
        </div>
        <p style="font-size:14px;color:#334155;margin-bottom:20px;line-height:1.68;">${escapeHtml(op.description)}</p>

        <div class="meta-spec-grid">
          <div class="meta-spec-item">
            <span class="meta-spec-label">Expected Deliverables</span>
            <span class="meta-spec-value">${escapeHtml(op.deliverables)}</span>
          </div>
          <div class="meta-spec-item">
            <span class="meta-spec-label">Work Schedule</span>
            <span class="meta-spec-value">${escapeHtml(op.start_date)} to ${escapeHtml(op.deadline)}</span>
          </div>
          <div class="meta-spec-item">
            <span class="meta-spec-label">Output Format &amp; Revisions</span>
            <span class="meta-spec-value">${escapeHtml(op.output_format)} &bull; Max ${op.max_revisions} revision(s)</span>
          </div>
          <div class="meta-spec-item">
            <span class="meta-spec-label">Estimated Duration</span>
            <span class="meta-spec-value">${op.estimated_duration_hours} hours total</span>
          </div>
          <div class="meta-spec-item" style="grid-column: span 2;padding-top:10px;border-top:1px solid var(--border-subtle);">
            <span class="meta-spec-label">Compensation Agreement</span>
            <span class="meta-spec-value">
              <strong style="color:#047857;">${formatIdr(op.compensation_amount_idr)}</strong>
              <span style="color:#64748B;font-size:13px;"> — ${escapeHtml(op.compensation_details)}</span>
            </span>
          </div>
        </div>

        <div style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;margin-bottom:8px;">
          Required Skills &amp; Evaluation Criteria
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${skills.map((s) => `<span class="status-badge badge-neutral">${escapeHtml(s)}</span>`).join('')}
        </div>
        <p style="font-size:13px;color:#64748B;margin-bottom:20px;">
          <strong>Evaluation Criteria:</strong> ${criteria.join(' • ') || 'Relevance, Quality, Creativity, Technical Execution, Timeliness'}
        </p>

        <div style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;margin-bottom:6px;">
          Copyright &amp; Usage Agreement
        </div>
        <div style="font-size:13.5px;background:var(--brand-light-lavender);border:1px solid #FBCFE8;padding:12px 16px;border-radius:12px;margin-bottom:20px;color:#334155;">
          ${escapeHtml(op.copyright_licensing_terms)}
        </div>

        <div style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;margin-bottom:8px;">
          Mandatory Student Safety Protections
        </div>
        <ul style="font-size:13.5px;padding-left:18px;margin:0;color:#475569;display:flex;flex-direction:column;gap:5px;">
          <li>Supervised by your assigned school teacher (${escapeHtml(op.mentor_requirements)}).</li>
          <li>Parent/Guardian consent is required before assignment start.</li>
          <li>Zero unsupervised physical meetings; all communication remains on-platform.</li>
          <li>Zero access to confidential business secrets or hazardous tasks.</li>
        </ul>
      </div>

      <!-- Application Panel -->
      <div class="card">
        <h3 style="font-size:17px;margin-bottom:10px;">Apply for This Assignment</h3>
        <p style="font-size:12.5px;color:var(--brand-muted-gray);margin-bottom:14px;">
          Students are never automatically assigned. Applying initiates Stage 3 Safety Review (Teacher Approval + Guardian Consent).
        </p>

        ${
          existingApp
            ? `<div class="alert alert-info">
                 <div>
                   <strong>Application Submitted</strong><br/>
                   Status: ${escapeHtml(existingApp.status)}<br/>
                   <a href="/student/assignments" style="font-weight:700;">Track in My Assignments &rarr;</a>
                 </div>
               </div>`
            : op.status !== 'Published'
            ? `<div class="alert alert-error">This assignment is currently ${escapeHtml(op.status)} and not accepting new applications.</div>`
            : verifiedPortfolios.length === 0
            ? `<div class="alert alert-error">
                 <div>
                   <strong>Verified Portfolio Required (Stage 1 Safety)</strong><br/>
                   You must have at least 1 school-verified portfolio in SHOW before applying to UMKM assignments.<br/>
                   <a href="/student/portfolio" style="font-weight:700;">Go to My Portfolio &rarr;</a>
                 </div>
               </div>`
            : `<form method="POST" action="/api/student/opportunities/apply">
                 <input type="hidden" name="assignment_id" value="${escapeHtml(op.id)}" />
                 <div class="form-group">
                   <label class="form-label">Select Verified Portfolio as Evidence *</label>
                   <select name="portfolio_id" required class="form-control">
                     ${verifiedPortfolios
                       .map((vp) => `<option value="${escapeHtml(vp.id)}">${escapeHtml(vp.title)} (${escapeHtml(vp.category)})</option>`)
                       .join('')}
                   </select>
                 </div>
                 <div class="form-group">
                   <label class="form-label">Why is your school project relevant to this task? *</label>
                   <textarea name="motivation_note" rows="3" required class="form-control" placeholder="Explain how your portfolio skills match the deliverables..."></textarea>
                 </div>
                 <div class="form-group">
                   <label class="form-label">Parent / Guardian Name for Stage 3 Consent *</label>
                   <input type="text" name="guardian_name" required value="${escapeHtml(student.guardian_name || '')}" class="form-control" />
                 </div>
                 <div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;margin-bottom:16px;">
                   <label style="display:flex;align-items:flex-start;gap:8px;">
                     <input type="checkbox" name="voluntary_confirm" value="1" required checked />
                     <span>I confirm my participation is completely voluntary.</span>
                   </label>
                   <label style="display:flex;align-items:flex-start;gap:8px;">
                     <input type="checkbox" name="schedule_confirm" value="1" required checked />
                     <span>I confirm the ${op.estimated_duration_hours}-hour workload fits my school schedule without disrupting classes.</span>
                   </label>
                 </div>
                 <button type="submit" class="btn btn-primary" style="width:100%;">Submit Voluntary Application</button>
               </form>`
        }
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: op.title,
    breadcrumb: 'Opportunity Detail',
    activePath: '/student/opportunities',
    user,
    content,
    flashMessage: flash
  });
}

// Page 4 — My Assignments (/student/assignments & /student/assignments/:id)
export function renderStudentAssignmentsPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const assignments = db
    .prepare(
      `SELECT DISTINCT a.*, b.business_name
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       LEFT JOIN assignment_applications app ON app.assignment_id = a.id
       WHERE (a.selected_student_id = ? OR app.student_id = ?) AND a.deleted_at IS NULL
       ORDER BY a.updated_at DESC`
    )
    .all(student.id, student.id) as Array<Record<string, any>>;

  const groups: Array<{ title: string; statuses: string[] }> = [
    { title: 'Pending Approval (Stage 3 Safety)', statuses: ['Student Applied', 'Teacher Approval Pending', 'Guardian Consent Pending'] },
    { title: 'Ready to Start', statuses: ['Ready to Start'] },
    { title: 'In Progress (Stage 4 Supervised Work)', statuses: ['In Progress'] },
    { title: 'Submitted & Under Review (Stage 5 Evaluation)', statuses: ['Submitted', 'Under Review'] },
    { title: 'Revision Requested', statuses: ['Revision Requested'] },
    { title: 'Completed (Accepted / School Verification / Closed)', statuses: ['Accepted', 'School Verification', 'Closed'] },
    { title: 'Cancelled / Other Outcomes', statuses: ['Cancelled', 'Rejected', 'Withdrawn', 'Expired', 'Incomplete'] }
  ];

  const content = `
    <p style="font-size:14px;color:var(--brand-charcoal);margin-top:0;margin-bottom:20px;">
      Track all assignments associated with your account across every stage of the Six-Stage Student Safety System.
    </p>

    ${
      assignments.length === 0
        ? `<div class="empty-state">
             ${icon('briefcase', 32)}
             <h4>No assignments associated with your account yet.</h4>
             <p style="font-size:13.5px;margin:0 0 14px;">Browse approved UMKM opportunities to apply with your verified school portfolio.</p>
             <a href="/student/opportunities" class="btn btn-primary btn-sm">Explore Opportunities</a>
           </div>`
        : groups
            .map((g) => {
              const items = assignments.filter((a) => g.statuses.includes(a.status));
              return `<div class="card" style="margin-bottom:18px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <h3 style="font-size:16px;margin:0;">${escapeHtml(g.title)}</h3>
                  <span class="status-badge badge-neutral">${items.length} record(s)</span>
                </div>
                ${
                  items.length === 0
                    ? `<div style="font-size:13px;color:var(--brand-muted-gray);">No assignments in this stage.</div>`
                    : `<div class="table-responsive">
                         <table class="data-table">
                           <thead>
                             <tr>
                               <th>Assignment Title</th>
                               <th>UMKM Partner</th>
                               <th>Safety Stage</th>
                               <th>Deadline</th>
                               <th>Compensation</th>
                               <th>Status</th>
                               <th>Action</th>
                             </tr>
                           </thead>
                           <tbody>
                             ${items
                               .map(
                                 (a) => `<tr>
                                   <td><strong><a href="/student/assignments/${escapeHtml(a.id)}">${escapeHtml(a.title)}</a></strong> ${demoBadge(a.is_demo)}</td>
                                   <td>${escapeHtml(a.business_name)}</td>
                                   <td>Stage ${a.current_safety_stage} of 6</td>
                                   <td>${escapeHtml(a.deadline)}</td>
                                   <td>${formatIdr(a.compensation_amount_idr)}</td>
                                   <td>${statusBadge(a.status)}</td>
                                   <td><a href="/student/assignments/${escapeHtml(a.id)}" class="btn btn-secondary btn-sm">Open Workspace</a></td>
                                 </tr>`
                               )
                               .join('')}
                           </tbody>
                         </table>
                       </div>`
                }
              </div>`;
            })
            .join('')
    }
  `;

  return renderDashboardLayout({
    title: 'My Assignments',
    breadcrumb: 'My Assignments',
    activePath: '/student/assignments',
    user,
    content,
    flashMessage: flash
  });
}

export function renderStudentAssignmentDetailPage(
  user: SessionUser,
  assignmentId: string,
  flash?: string | null
): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const a = db
    .prepare(
      `SELECT a.*, b.business_name, b.contact_email as business_email,
              tu.full_name as mentor_name, t.subject_specialty as mentor_specialty
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       LEFT JOIN teachers t ON t.id = a.assigned_teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       WHERE a.id = ? AND a.deleted_at IS NULL`
    )
    .get(assignmentId) as Record<string, any> | undefined;

  if (!a) {
    return renderDashboardLayout({
      title: 'Assignment Not Found',
      breadcrumb: 'Assignment Workspace',
      activePath: '/student/assignments',
      user,
      content: `<div class="alert alert-error">Assignment not found.</div>`
    });
  }

  const agreement = db
    .prepare('SELECT * FROM assignment_agreements WHERE assignment_id = ?')
    .get(assignmentId) as Record<string, any> | undefined;

  const teacherApproval = db
    .prepare('SELECT * FROM teacher_approvals WHERE assignment_id = ? AND student_id = ? ORDER BY created_at DESC')
    .get(assignmentId, student.id) as Record<string, any> | undefined;

  const guardianConsent = db
    .prepare('SELECT * FROM guardian_consents WHERE assignment_id = ? AND student_id = ? ORDER BY created_at DESC')
    .get(assignmentId, student.id) as Record<string, any> | undefined;

  const progressLogs = db
    .prepare('SELECT * FROM assignment_progress WHERE assignment_id = ? ORDER BY created_at DESC')
    .all(assignmentId) as Array<Record<string, any>>;

  const submission = db
    .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?')
    .get(assignmentId, student.id) as Record<string, any> | undefined;

  const versions = submission
    ? (db
        .prepare('SELECT * FROM submission_versions WHERE submission_id = ? ORDER BY version_number DESC')
        .all(submission.id) as Array<Record<string, any>>)
    : [];

  const evaluation = db
    .prepare('SELECT * FROM evaluations WHERE assignment_id = ?')
    .get(assignmentId) as Record<string, any> | undefined;

  const compensation = db
    .prepare('SELECT * FROM compensation_records WHERE assignment_id = ?')
    .get(assignmentId) as Record<string, any> | undefined;

  const canStartAssignment = a.status === 'Ready to Start';
  const canSubmitDeliverable = ['In Progress', 'Revision Requested'].includes(a.status);

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <a href="/student/assignments" style="font-size:13.5px;font-weight:600;">&larr; Back to My Assignments</a>
      ${statusBadge(a.status)}
    </div>

    <!-- Six-Stage Student Safety Stepper -->
    <div class="card" style="margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:var(--brand-deep-purple);text-transform:uppercase;">
        Six-Stage Student Safety Supervision Tracker (Currently at Stage ${a.current_safety_stage} of 6)
      </div>
      <div class="safety-stepper">
        ${SIX_STAGE_SAFETY_SYSTEM.map((st) => {
          const cls =
            st.stage < a.current_safety_stage
              ? 'completed'
              : st.stage === a.current_safety_stage
              ? 'current'
              : '';
          return `<div class="safety-step ${cls}">
            <div style="font-weight:700;">Stage ${st.stage}</div>
            <div>${escapeHtml(st.title.replace(/^Stage \d+ — /, ''))}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="grid-3">
      <div style="grid-column: span 2;display:flex;flex-direction:column;gap:20px;">
        <!-- Brief & Agreement Card -->
        <div class="card">
          <h2 style="font-size:22px;margin-bottom:6px;">${escapeHtml(a.title)} ${demoBadge(a.is_demo)}</h2>
          <div style="font-size:13.5px;color:var(--brand-muted-gray);margin-bottom:14px;">
            UMKM Partner: <strong>${escapeHtml(a.business_name)}</strong> &bull; Category: ${escapeHtml(a.category)} &bull; Deadline: <strong>${escapeHtml(a.deadline)}</strong>
          </div>
          <p style="font-size:14px;margin-bottom:14px;">${escapeHtml(a.description)}</p>
          <div class="grid-2" style="background:var(--brand-warm-ivory);padding:14px;border-radius:var(--radius-sm);font-size:13px;">
            <div>
              <strong>Deliverables:</strong> ${escapeHtml(a.deliverables)}<br/>
              <strong>Output Format:</strong> ${escapeHtml(a.output_format)}<br/>
              <strong>Max Revisions Allowed:</strong> ${a.max_revisions} (Used: ${submission?.revisions_used || 0})
            </div>
            <div>
              <strong>Supervising Teacher:</strong> ${escapeHtml(a.mentor_name || student.mentor_name || 'Assigned School Mentor')}<br/>
              <strong>Compensation:</strong> ${formatIdr(a.compensation_amount_idr)}<br/>
              <strong>Compensation Status:</strong> ${compensation ? escapeHtml(compensation.status) : 'Agreed in Brief'}
            </div>
          </div>

          ${
            canStartAssignment
              ? `<div style="margin-top:16px;padding:16px;background:var(--status-green-bg);border:1px solid #BFE6D0;border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
                   <div>
                     <strong style="color:var(--status-green-fg);">All Stage 3 Approvals Complete!</strong>
                     <div style="font-size:13px;">Teacher approval and guardian consent are verified. You may now start supervised work.</div>
                   </div>
                   <form method="POST" action="/api/student/assignments/start" style="margin:0;">
                     <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                     <button type="submit" class="btn btn-primary">Start Supervised Assignment</button>
                   </form>
                 </div>`
              : ''
          }
        </div>

        <!-- Deliverable Upload Section (Unlocked ONLY after required approvals & start) -->
        <div class="card">
          <h3 style="font-size:17px;margin-bottom:8px;">Deliverable Submission &amp; Version History</h3>
          ${
            !canSubmitDeliverable
              ? `<div class="alert alert-info" style="margin-bottom:12px;">
                   Submission upload is only active when the assignment status is <strong>In Progress</strong> or <strong>Revision Requested</strong> after all Stage 3 approvals are complete. (Current status: <strong>${escapeHtml(a.status)}</strong>)
                 </div>`
              : `<form method="POST" action="/api/student/assignments/submit" enctype="multipart/form-data" style="background:var(--brand-warm-ivory);padding:16px;border-radius:var(--radius-sm);margin-bottom:18px;">
                   <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                   <h4 style="font-size:15px;margin-bottom:10px;">
                     Upload Deliverable (Version ${(submission?.current_version_number || 0) + (versions.length > 0 ? 1 : 1)})
                   </h4>
                   <div class="grid-2">
                     <div class="form-group">
                       <label class="form-label">Deliverable Summary *</label>
                       <input type="text" name="deliverable_summary" required class="form-control" placeholder="e.g. 4-page A5 Print Catalog PDF" />
                     </div>
                     <div class="form-group">
                       <label class="form-label">Deliverable File Name (JPG, PNG, PDF, MP4) *</label>
                       <input type="text" name="file_name" required value="deliverable-submission.pdf" class="form-control" />
                       <input type="file" name="file_upload" accept=".jpg,.jpeg,.png,.pdf,.mp4" class="form-control" style="margin-top:6px;" />
                     </div>
                   </div>
                   <div class="form-group">
                     <label class="form-label">Submission Notes for UMKM &amp; Supervising Teacher *</label>
                     <textarea name="submission_notes" rows="2" required class="form-control" placeholder="Describe what was completed or revised in this version..."></textarea>
                   </div>
                   <button type="submit" class="btn btn-primary">${icon('plusCircle', 15)} Submit Deliverable Version</button>
                 </form>`
          }

          ${
            versions.length === 0
              ? `<p style="font-size:13px;color:var(--brand-muted-gray);margin:0;">No deliverable versions uploaded yet.</p>`
              : `<div style="display:flex;flex-direction:column;gap:10px;">
                   ${versions
                     .map(
                       (v) => `<div style="padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);">
                         <div style="display:flex;justify-content:space-between;align-items:center;">
                           <strong>Version ${v.version_number}: ${escapeHtml(v.deliverable_summary)}</strong>
                           ${statusBadge(v.review_status)}
                         </div>
                         <div style="font-size:12.5px;color:var(--brand-charcoal);margin:6px 0;">${escapeHtml(v.submission_notes)}</div>
                         <div style="font-size:12px;color:var(--brand-muted-gray);display:flex;justify-content:space-between;align-items:center;">
                           <span>File: <code>${escapeHtml(v.file_name)}</code> &bull; Submitted: ${escapeHtml(v.submitted_at)}</span>
                           <a href="/api/files/download?type=submission&id=${escapeHtml(v.id)}" class="btn btn-secondary btn-sm">${icon('download', 13)} Download</a>
                         </div>
                         ${
                           v.umkm_feedback
                             ? `<div style="margin-top:8px;padding:8px 10px;background:var(--brand-light-lavender);border-radius:4px;font-size:12.5px;">
                                  <strong>UMKM Feedback:</strong> ${escapeHtml(v.umkm_feedback)}
                                </div>`
                             : ''
                         }
                       </div>`
                     )
                     .join('')}
                 </div>`
          }
        </div>

        <!-- Stage 4 Supervised Progress Updates -->
        <div class="card">
          <h3 style="font-size:17px;margin-bottom:10px;">Supervised Work Progress &amp; Mentor Channel (Stage 4)</h3>
          ${
            a.status === 'In Progress' || a.status === 'Revision Requested'
              ? `<form method="POST" action="/api/student/assignments/progress" style="margin-bottom:16px;">
                   <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                   <div class="grid-3">
                     <div class="form-group">
                       <label class="form-label">Milestone Title *</label>
                       <input type="text" name="milestone_title" required class="form-control" placeholder="e.g. Initial Wireframe" />
                     </div>
                     <div class="form-group">
                       <label class="form-label">Completion %</label>
                       <input type="number" name="progress_percent" min="0" max="100" value="50" class="form-control" />
                     </div>
                     <div class="form-group">
                       <label class="form-label">Progress Note *</label>
                       <input type="text" name="progress_note" required class="form-control" placeholder="Update for teacher & UMKM" />
                     </div>
                   </div>
                   <button type="submit" class="btn btn-secondary btn-sm">Log Supervised Progress</button>
                 </form>`
              : ''
          }
          ${
            progressLogs.length === 0
              ? `<p style="font-size:13px;color:var(--brand-muted-gray);margin:0;">No progress logs recorded yet.</p>`
              : progressLogs
                  .map(
                    (pr) => `<div style="padding:10px;border-bottom:1px solid var(--border-subtle);font-size:13px;">
                      <div style="display:flex;justify-content:space-between;">
                        <strong>${escapeHtml(pr.milestone_title)} (${pr.progress_percent}%) — ${escapeHtml(pr.actor_role)}</strong>
                        <span style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(pr.created_at)}</span>
                      </div>
                      <div style="margin-top:4px;">${escapeHtml(pr.progress_note)}</div>
                    </div>`
                  )
                  .join('')
          }
        </div>
      </div>

      <!-- Right Column: Approvals, Guardian Consent & Evaluation -->
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="card">
          <h3 style="font-size:16px;margin-bottom:10px;">Stage 3 Approval Records</h3>
          <div style="font-size:13px;margin-bottom:10px;">
            <strong>Teacher Approval:</strong>
            ${teacherApproval ? statusBadge(teacherApproval.decision) : statusBadge('PENDING')}
            ${teacherApproval?.notes ? `<div style="font-size:12px;color:var(--brand-muted-gray);margin-top:4px;">${escapeHtml(teacherApproval.notes)}</div>` : ''}
          </div>
          <div style="font-size:13px;margin-bottom:10px;">
            <strong>Guardian Consent:</strong>
            ${guardianConsent ? statusBadge(guardianConsent.consent_status) : statusBadge('PENDING')}
          </div>

          ${
            (!guardianConsent || guardianConsent.consent_status === 'PENDING') &&
            ['Student Applied', 'Teacher Approval Pending', 'Guardian Consent Pending'].includes(a.status)
              ? `<form method="POST" action="/api/student/assignments/guardian-consent" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);">
                   <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                   <div class="form-group">
                     <label class="form-label">Guardian Name *</label>
                     <input type="text" name="guardian_name" required value="${escapeHtml(student.guardian_name || 'Parent / Guardian')}" class="form-control" />
                   </div>
                   <div class="form-group">
                     <label class="form-label">Consent Statement *</label>
                     <input type="text" name="consent_statement" required value="I consent to my child participating in this teacher-supervised remote assignment." class="form-control" />
                   </div>
                   <button type="submit" class="btn btn-gold btn-sm" style="width:100%;">Record Signed Guardian Consent</button>
                 </form>`
              : ''
          }
        </div>

        <div class="card">
          <h3 style="font-size:16px;margin-bottom:10px;">Stage 5 UMKM Evaluation</h3>
          ${
            !evaluation
              ? `<p style="font-size:13px;color:var(--brand-muted-gray);margin:0;">UMKM evaluation will appear here once deliverables are reviewed.</p>`
              : `<div style="font-size:13px;">
                   <div style="margin-bottom:8px;">${statusBadge(evaluation.outcome_decision)}</div>
                   <ul style="padding-left:18px;margin:0 0 10px;">
                     <li>Relevance to Brief: <strong>${evaluation.relevance_score}/5</strong></li>
                     <li>Quality of Output: <strong>${evaluation.quality_score}/5</strong></li>
                     <li>Creativity: <strong>${evaluation.creativity_score}/5</strong></li>
                     <li>Technical Execution: <strong>${evaluation.technical_score}/5</strong></li>
                     <li>Timeliness: <strong>${evaluation.timeliness_score}/5</strong></li>
                   </ul>
                   <div style="background:var(--brand-warm-ivory);padding:10px;border-radius:var(--radius-sm);">
                     <strong>Written Feedback:</strong><br/>${escapeHtml(evaluation.written_feedback)}
                   </div>
                 </div>`
          }
        </div>

        <div class="card">
          <h3 style="font-size:16px;margin-bottom:8px;">Agreement Summary</h3>
          ${
            agreement
              ? `<div style="font-size:12.5px;color:var(--brand-charcoal);">
                   <div><strong>Agreed Deadline:</strong> ${escapeHtml(agreement.agreed_deadline)}</div>
                   <div><strong>Max Revisions:</strong> ${agreement.agreed_max_revisions}</div>
                   <div><strong>Compensation:</strong> ${formatIdr(agreement.agreed_compensation_amount_idr)}</div>
                   <div style="margin-top:6px;color:var(--brand-muted-gray);">Signed by Student, UMKM, Teacher &amp; Guardian.</div>
                 </div>`
              : `<p style="font-size:12.5px;color:var(--brand-muted-gray);margin:0;">Formal agreement record is locked once Stage 3 approvals complete.</p>`
          }
        </div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: `Assignment: ${a.title}`,
    breadcrumb: 'Assignment Detail',
    activePath: '/student/assignments',
    user,
    content,
    flashMessage: flash
  });
}

// Page 5 — Submission History (/student/submissions)
export function renderStudentSubmissionsPage(user: SessionUser): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const versions = db
    .prepare(
      `SELECT
         sv.*, a.title as assignment_title, b.business_name, s.revisions_used
       FROM submission_versions sv
       JOIN submissions s ON s.id = sv.submission_id
       JOIN assignments a ON a.id = sv.assignment_id
       JOIN businesses b ON b.id = a.business_id
       WHERE s.student_id = ?
       ORDER BY sv.submitted_at DESC`
    )
    .all(student.id) as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;">Complete Deliverable Version History</h3>
      <p style="font-size:13.5px;color:var(--brand-muted-gray);margin-bottom:18px;">
        SECOND LIFE preserves every submitted deliverable version instead of overwriting historical records, ensuring full transparency for teacher and school verification.
      </p>

      ${
        versions.length === 0
          ? `<div class="empty-state">
               ${icon('fileText', 32)}
               <h4>No deliverables submitted yet.</h4>
               <p style="font-size:13.5px;margin:0;">When you upload work for an active assignment, each version is archived here.</p>
             </div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Version</th>
                     <th>Assignment Reference</th>
                     <th>Deliverable Summary &amp; File</th>
                     <th>Submitted Timestamp</th>
                     <th>Review Status</th>
                     <th>UMKM Feedback / Revision Request</th>
                     <th>Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${versions
                     .map(
                       (v) => `<tr>
                         <td><strong>v${v.version_number}</strong> ${demoBadge(v.is_demo)}</td>
                         <td>
                           <a href="/student/assignments/${escapeHtml(v.assignment_id)}" style="font-weight:600;">${escapeHtml(v.assignment_title)}</a>
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(v.business_name)}</div>
                         </td>
                         <td>
                           <div>${escapeHtml(v.deliverable_summary)}</div>
                           <code style="font-size:11.5px;">${escapeHtml(v.file_name)} (${escapeHtml(v.file_type)})</code>
                         </td>
                         <td>${escapeHtml(v.submitted_at)}</td>
                         <td>${statusBadge(v.review_status)}</td>
                         <td style="max-width:260px;font-size:12.5px;">
                           ${v.umkm_feedback ? escapeHtml(v.umkm_feedback) : '<span style="color:var(--brand-muted-gray);">Awaiting review</span>'}
                         </td>
                         <td>
                           <a href="/api/files/download?type=submission&id=${escapeHtml(v.id)}" class="btn btn-secondary btn-sm">${icon('download', 13)} File</a>
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
    title: 'Submission History',
    breadcrumb: 'Submission History',
    activePath: '/student/submissions',
    user,
    content
  });
}

// Page 6 — Sertifikat Pengalaman Kerja Terverifikasi (/student/passport & /student/passport/:id)
export function renderStudentPassportPage(user: SessionUser): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const passports = db
    .prepare(
      `SELECT * FROM experience_passports
       WHERE student_id = ?
       ORDER BY issued_at DESC`
    )
    .all(student.id) as Array<Record<string, any>>;

  const acceptedRecords = passports.filter((p) => p.outcome_status === 'Completed and Accepted');
  const otherRecords = passports.filter((p) => p.outcome_status !== 'Completed and Accepted');

  const content = `
    <!-- Signature Certificate Registry Banner -->
    <div class="mh-hero" style="margin-bottom:24px;padding:30px 34px;border-radius:var(--radius-lg);border:2px solid var(--brand-muted-gold);box-shadow:var(--shadow-lg);">
      <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:18px;">
        <div>
          <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;background:rgba(240,190,99,0.16);border:1px solid rgba(240,190,99,0.45);font-size:11px;color:var(--brand-muted-gold);font-weight:800;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;">
            ${icon('award', 13)} OFFICIAL SECOND LIFE CERTIFICATE REGISTRY
          </div>
          <h2 style="color:#FFFFFF;font-size:27px;margin:0 0 6px;">Sertifikat Pengalaman Kerja Terverifikasi</h2>
          <div style="font-size:13.5px;color:rgba(255,255,255,0.86);">
            Pemegang Sertifikat: <strong>${escapeHtml(student.full_name)}</strong> ${demoBadge(student.is_demo)} &bull;
            Institusi Pendidikan: <strong>${escapeHtml(student.school_name)}</strong> (${escapeHtml(student.grade)} — ${escapeHtml(student.major)})
          </div>
        </div>
        <div style="text-align:right;background:rgba(255,255,255,0.10);padding:14px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.18);">
          <div style="font-size:11px;color:var(--brand-muted-gold);font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">Sertifikat Resmi Terbit</div>
          <div style="font-size:30px;font-weight:800;color:#FFFFFF;line-height:1.1;margin-top:4px;">${acceptedRecords.length}</div>
        </div>
      </div>
      <div style="position:relative;z-index:2;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.16);font-size:12.5px;color:rgba(255,255,255,0.80);">
        ${icon('shield', 14)} <strong>Aturan Bukti 6-Tahap (Strict Evidence Rule):</strong> Sertifikat Pengalaman Kerja hanya diterbitkan apabila ke-6 bukti wajib terpenuhi (1. Portofolio Terverifikasi Sekolah, 2. Persetujuan Guru &amp; Wali, 3. Bukti Unggahan Karya, 4. Evaluasi Terstruktur UMKM, 5. Verifikasi Akhir Sekolah, 6. Penutupan Audit Admin).
      </div>
    </div>

    <!-- Completed and Accepted Certificates -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="font-size:18px;margin:0;">Daftar Sertifikat Pengalaman Kerja Resmi (${acceptedRecords.length})</h3>
    </div>
    ${
      acceptedRecords.length === 0
        ? `<div class="empty-state" style="margin-bottom:28px;">
             ${icon('award', 32)}
             <h4>No completed experiences have been recorded.</h4>
             <p style="font-size:13.5px;max-width:520px;margin:0 auto;">
               SECOND LIFE tidak pernah menerbitkan sertifikat otomatis. Selesaikan penugasan mikro UMKM melalui seluruh 6 tahapan keamanan untuk memperoleh Sertifikat Pengalaman Kerja Terverifikasi pertama Anda.
             </p>
           </div>`
        : `<div class="grid-2" style="margin-bottom:28px;">
             ${acceptedRecords
               .map((rec) => {
                 const skills = safeJsonParse<string[]>(rec.skills_demonstrated_json, []);
                 return `<div class="card" style="padding:0;overflow:hidden;border:1px solid rgba(217,168,78,0.55);box-shadow:var(--shadow-md);">
                   <div style="background:linear-gradient(135deg, #2A0F25 0%, #7A1250 65%, #B81D73 100%);padding:18px 22px;color:#FFFFFF;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--brand-muted-gold);">
                     <div>
                       <div style="font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--brand-muted-gold);">SERTIFIKAT PENGALAMAN KERJA</div>
                       <code style="font-size:12.5px;font-weight:700;color:#FFFFFF;">${escapeHtml(rec.verification_code)}</code>
                     </div>
                     ${statusBadge(rec.outcome_status)}
                   </div>
                   <div style="padding:22px;">
                     <h4 style="font-size:18px;margin-bottom:6px;">
                       <a href="/student/passport/${escapeHtml(rec.id)}">${escapeHtml(rec.assignment_title)}</a>
                       ${demoBadge(rec.is_demo)}
                     </h4>
                     <div style="font-size:13px;font-weight:700;color:var(--brand-deep-purple);margin-bottom:10px;">
                       Mitra UMKM: ${escapeHtml(rec.business_name)} &bull; Tanggal Selesai: ${escapeHtml(rec.completion_date)}
                     </div>
                     <p style="font-size:13.5px;margin-bottom:12px;">${escapeHtml(rec.assignment_description)}</p>
                     <div class="meta-spec-grid" style="margin-bottom:14px;">
                       <div class="meta-spec-cell">
                         <div class="meta-spec-label">Deliverables Karya</div>
                         <div class="meta-spec-val">${escapeHtml(rec.deliverables_summary)}</div>
                       </div>
                       <div class="meta-spec-cell">
                         <div class="meta-spec-label">Skor Evaluasi UMKM</div>
                         <div class="meta-spec-val">${escapeHtml(rec.umkm_evaluation_summary)} (${rec.overall_score ? `${rec.overall_score}/5.0` : 'Reviewed'})</div>
                       </div>
                       <div class="meta-spec-cell">
                         <div class="meta-spec-label">Verifikator Sekolah</div>
                         <div class="meta-spec-val">${escapeHtml(rec.teacher_verifier_name)} (${escapeHtml(rec.school_name)})</div>
                       </div>
                       <div class="meta-spec-cell">
                         <div class="meta-spec-label">Apresiasi / Kompensasi</div>
                         <div class="meta-spec-val">${escapeHtml(rec.compensation_summary)}</div>
                       </div>
                     </div>
                     <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
                       ${skills.map((s) => `<span class="status-badge badge-neutral">${escapeHtml(s)}</span>`).join('')}
                     </div>
                     <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-subtle);padding-top:14px;">
                       <a href="/verify/${escapeHtml(rec.verification_code)}" target="_blank" style="font-size:12.5px;font-weight:700;">Halaman Verifikasi Publik &nearr;</a>
                       <a href="/student/passport/${escapeHtml(rec.id)}" class="btn btn-primary btn-sm">${icon('award', 14)} Buka &amp; Cetak Sertifikat</a>
                     </div>
                   </div>
                 </div>`;
               })
               .join('')}
           </div>`
    }

    <!-- Transparent Record of Non-Accepted / Cancelled / Incomplete Assignments -->
    <div class="card">
      <h3 style="font-size:17px;margin-bottom:6px;">Log Transparansi Penugasan Dibatalkan / Belum Selesai</h3>
      <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:14px;">
        Demi menjaga integritas institusi pendidikan, penugasan yang dibatalkan atau belum tuntas dicatat secara jujur sesuai status aslinya dan tidak pernah diklaim sebagai sertifikat pengalaman kerja.
      </p>
      ${
        otherRecords.length === 0
          ? `<div style="font-size:13px;color:var(--brand-muted-gray);">Tidak ada catatan penugasan yang dibatalkan atau belum selesai.</div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>No. Referensi</th>
                     <th>Judul Penugasan</th>
                     <th>Mitra UMKM</th>
                     <th>Tanggal</th>
                     <th>Status Akhir Sebenarnya</th>
                     <th>Catatan Evaluasi</th>
                     <th>Detail</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${otherRecords
                     .map(
                       (r) => `<tr>
                         <td><code>${escapeHtml(r.verification_code)}</code></td>
                         <td><strong>${escapeHtml(r.assignment_title)}</strong> ${demoBadge(r.is_demo)}</td>
                         <td>${escapeHtml(r.business_name)}</td>
                         <td>${escapeHtml(r.completion_date)}</td>
                         <td>${statusBadge(r.outcome_status)}</td>
                         <td style="font-size:12.5px;">${escapeHtml(r.umkm_evaluation_summary)}</td>
                         <td><a href="/student/passport/${escapeHtml(r.id)}" class="btn btn-secondary btn-sm">Lihat</a></td>
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
    title: 'Sertifikat Pengalaman Kerja Terverifikasi',
    breadcrumb: 'Sertifikat Pengalaman',
    activePath: '/student/passport',
    user,
    content
  });
}

export function renderStudentPassportDetailPage(user: SessionUser, passportId: string): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const rec = db
    .prepare('SELECT * FROM experience_passports WHERE id = ? AND student_id = ?')
    .get(passportId, student.id) as Record<string, any> | undefined;

  if (!rec) {
    return renderDashboardLayout({
      title: 'Sertifikat Tidak Ditemukan',
      breadcrumb: 'Detail Sertifikat',
      activePath: '/student/passport',
      user,
      content: `<div class="alert alert-error">Sertifikat pengalaman kerja tidak ditemukan.</div>`
    });
  }

  const eligibility = evaluatePassportEligibility({
    portfolioVerified: Boolean(rec.portfolio_id),
    teacherApproved: true,
    guardianConsented: true,
    submissionExists: Boolean(rec.submission_id),
    evaluationExists: Boolean(rec.evaluation_id),
    evaluationAccepted: rec.outcome_status === 'Completed and Accepted',
    schoolVerified: rec.verification_status === 'VERIFIED_ISSUED',
    adminClosed: Boolean(rec.admin_closed_by_user_id)
  });

  const skills = safeJsonParse<string[]>(rec.skills_demonstrated_json, []);

  const content = `
    <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <a href="/student/passport" style="font-size:13.5px;font-weight:700;">&larr; Kembali ke Daftar Sertifikat Pengalaman</a>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button type="button" onclick="window.print()" class="btn btn-primary btn-pill">${icon('printer', 15)} Cetak / Simpan PDF Sertifikat Resmi</button>
        <a href="/verify/${escapeHtml(rec.verification_code)}" target="_blank" class="btn btn-secondary btn-pill">Buka Link Verifikasi Publik &nearr;</a>
      </div>
    </div>

    <!-- Printable Official Certificate Sheet (Sertifikat Pengalaman Kerja Terverifikasi) -->
    <div class="certificate-canvas">
      <div class="certificate-inner-frame">
        <!-- Top Institutional Header Bar -->
        <div class="certificate-header-bar">
          <div>
            ${renderSecondLifeLogo('light')}
            <div style="font-size:11px;color:var(--brand-muted-gray);margin-top:6px;font-weight:600;">
              Jembatan Terstruktur Karya Sekolah menuju Pengalaman Kerja Nyata (SHOW &rarr; TRY &rarr; VERIFY)
            </div>
          </div>

          <!-- Official Gold Seal SVG Emblem -->
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="text-align:right;">
              <div style="font-size:10.5px;font-weight:800;letter-spacing:0.10em;text-transform:uppercase;color:var(--brand-deep-purple);">No. Registrasi Sertifikat</div>
              <div style="font-size:14px;font-weight:800;color:var(--brand-dark-navy);"><code>${escapeHtml(rec.verification_code)}</code></div>
              <div style="margin-top:4px;">${statusBadge(rec.outcome_status)}</div>
            </div>
            <svg width="68" height="68" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Official Verification Seal">
              <circle cx="36" cy="36" r="33" fill="url(#certSealGrad)" stroke="#9A6B1A" stroke-width="2"/>
              <circle cx="36" cy="36" r="27" fill="none" stroke="#FFF8EB" stroke-width="1.2" stroke-dasharray="3 2"/>
              <path d="M36 17L40.2 26.5L50.5 27.6L42.8 34.5L44.9 44.6L36 39.4L27.1 44.6L29.2 34.5L21.5 27.6L31.8 26.5L36 17Z" fill="#FFF8EB"/>
              <defs>
                <linearGradient id="certSealGrad" x1="6" y1="6" x2="66" y2="66" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#F6D17A"/>
                  <stop offset="50%" stop-color="#D9A84E"/>
                  <stop offset="100%" stop-color="#A8741E"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <!-- Certificate Title & Formal Recipient Citation -->
        <div class="certificate-ribbon-title">
          <div class="certificate-kicker">VERIFIED STUDENT EXPERIENCE CERTIFICATE</div>
          <h1 class="certificate-main-title">Sertifikat Pengalaman Kerja Terverifikasi</h1>
          <div style="font-size:13px;color:var(--brand-muted-gray);">
            Diterbitkan pada ${escapeHtml(rec.issued_at)} &bull; Status Audit: <strong>${escapeHtml(rec.verification_status)}</strong> ${demoBadge(rec.is_demo)}
          </div>
        </div>

        <div class="certificate-recipient-box">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.10em;color:var(--brand-muted-gray);">
            Sertifikat Resmi Ini Diberikan Kepada:
          </div>
          <div class="certificate-recipient-name">${escapeHtml(student.full_name)}</div>
          <div style="font-size:14px;color:var(--brand-charcoal);font-weight:600;">
            ${escapeHtml(student.grade)} &mdash; Kompetensi Keahlian ${escapeHtml(student.major)} &bull; <strong>${escapeHtml(rec.school_name)}</strong>
          </div>
          <p style="font-size:13.5px;color:var(--brand-charcoal);max-width:700px;margin:12px auto 0;line-height:1.6;">
            Telah menyelesaikan dengan baik penugasan pengalaman kerja nyata (<em>Micro-Assignment</em>) di bawah supervisi Guru Pembimbing Sekolah dan telah dievaluasi serta diterima secara resmi oleh Mitra UMKM:
          </p>
          <div style="margin-top:10px;font-size:18px;font-weight:800;color:var(--brand-deep-purple);">
            ${escapeHtml(rec.assignment_title)} &mdash; ${escapeHtml(rec.business_name)}
          </div>
        </div>

        <!-- Structured Verification Metadata Grid -->
        <div class="meta-spec-grid" style="margin-bottom:20px;">
          <div class="meta-spec-cell">
            <div class="meta-spec-label">1. Identitas Siswa &amp; Sekolah</div>
            <div class="meta-spec-val">
              <div><strong>Nama Siswa:</strong> ${escapeHtml(student.full_name)}</div>
              <div><strong>Kelas &amp; Jurusan:</strong> ${escapeHtml(student.grade)} — ${escapeHtml(student.major)}</div>
              <div><strong>Sekolah / PKBM:</strong> ${escapeHtml(rec.school_name)}</div>
              <div><strong>Guru Pembimbing:</strong> ${escapeHtml(rec.teacher_verifier_name)}</div>
            </div>
          </div>
          <div class="meta-spec-cell">
            <div class="meta-spec-label">2. Mitra UMKM &amp; Hasil Evaluasi</div>
            <div class="meta-spec-val">
              <div><strong>Mitra UMKM:</strong> ${escapeHtml(rec.business_name)}</div>
              <div><strong>Tanggal Selesai:</strong> ${escapeHtml(rec.completion_date)}</div>
              <div><strong>Apresiasi / Kompensasi:</strong> ${escapeHtml(rec.compensation_summary)}</div>
              <div><strong>Skor Evaluasi Akhir:</strong> ${rec.overall_score ? `${rec.overall_score} / 5.0` : 'Not Applicable'}</div>
            </div>
          </div>
        </div>

        <!-- Deliverables & UMKM Evaluation Summary -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div style="padding:16px;background:#FFFFFF;border:1px solid var(--border-subtle);border-radius:12px;">
            <div style="font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--brand-deep-purple);margin-bottom:6px;">
              3. Deskripsi Tugas &amp; Bukti Karya (Deliverables)
            </div>
            <p style="font-size:13.5px;margin:0 0 8px;">${escapeHtml(rec.assignment_description)}</p>
            <div style="font-size:12.5px;padding:10px;background:var(--brand-light-lavender);border-radius:8px;color:var(--brand-dark-navy);">
              <strong>Deliverables Terverifikasi:</strong> ${escapeHtml(rec.deliverables_summary)}
            </div>
          </div>
          <div style="padding:16px;background:#FFFFFF;border:1px solid var(--border-subtle);border-radius:12px;">
            <div style="font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--brand-deep-purple);margin-bottom:6px;">
              4. Catatan Evaluasi Resmi Mitra UMKM
            </div>
            <p style="font-size:13.5px;margin:0 0 12px;color:var(--brand-charcoal);font-style:italic;">
              "${escapeHtml(rec.umkm_evaluation_summary)}"
            </p>
            <div style="font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--brand-muted-gray);margin-bottom:6px;">
              5. Kompetensi yang Terbukti:
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${skills.map((s) => `<span class="status-badge badge-neutral">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- 6-Point Evidence Chain Verification Bar -->
        <div style="background:#FFFFFF;border:1px solid var(--border-subtle);border-radius:12px;padding:14px 18px;margin-bottom:8px;">
          <div style="font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--brand-dark-navy);margin-bottom:8px;">
            6. Rantai Verifikasi Bukti Enam Tahap (Mandatory Six-Point Evidence Chain)
          </div>
          <div class="grid-3" style="font-size:12px;gap:10px;">
            <div>${eligibility.hasEligiblePortfolio ? '&#10003;' : '&#10007;'} 1. Portofolio Sekolah Terverifikasi</div>
            <div>${eligibility.hasApprovedWorkflow ? '&#10003;' : '&#10007;'} 2. Persetujuan Guru &amp; Wali Siswa</div>
            <div>${eligibility.hasSubmissionEvidence ? '&#10003;' : '&#10007;'} 3. Bukti Unggahan Karya Siswa</div>
            <div>${eligibility.hasUmkmEvaluation ? '&#10003;' : '&#10007;'} 4. Evaluasi Terstruktur UMKM</div>
            <div>${eligibility.hasSchoolVerification ? '&#10003;' : '&#10007;'} 5. Verifikasi Akhir Guru/Sekolah</div>
            <div>${eligibility.hasAdminClosure ? '&#10003;' : '&#10007;'} 6. Penutupan Audit Platform Admin</div>
          </div>
        </div>

        <!-- Dual Official Signatures & Verification URL -->
        <div class="certificate-signatures">
          <div class="certificate-sig-block">
            <div style="font-size:11px;color:var(--brand-muted-gray);">Disupervisi &amp; Disahkan Oleh:</div>
            <div class="certificate-sig-line"></div>
            <div class="certificate-sig-name">${escapeHtml(rec.teacher_verifier_name)}</div>
            <div class="certificate-sig-role">Guru Pembimbing &bull; ${escapeHtml(rec.school_name)}</div>
          </div>

          <div class="certificate-sig-block">
            <div style="font-size:11px;font-weight:800;color:var(--brand-deep-purple);text-transform:uppercase;letter-spacing:0.08em;">Verifikasi Keaslian Sertifikat</div>
            <div style="margin:8px auto;padding:8px 12px;background:#FFFFFF;border:1px dashed var(--border-strong);border-radius:8px;font-size:11.5px;">
              <code>/verify/${escapeHtml(rec.verification_code)}</code>
            </div>
            <div class="certificate-sig-role">Registry Digital Resmi SECOND LIFE</div>
          </div>

          <div class="certificate-sig-block">
            <div style="font-size:11px;color:var(--brand-muted-gray);">Dievaluasi &amp; Diterima Oleh:</div>
            <div class="certificate-sig-line"></div>
            <div class="certificate-sig-name">${escapeHtml(rec.business_name)}</div>
            <div class="certificate-sig-role">Mitra Usaha (UMKM) Terverifikasi</div>
          </div>
        </div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: `Sertifikat Pengalaman: ${rec.verification_code}`,
    breadcrumb: 'Detail Sertifikat',
    activePath: '/student/passport',
    user,
    content
  });
}

// Page 7 — Notifications (/student/notifications)
export function renderRoleNotificationsPage(user: SessionUser, activePath: string): string {
  const db = getDb();
  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC')
    .all(user.id) as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <div>
          <h3 style="font-size:18px;margin:0;">System Notifications</h3>
          <p style="font-size:13px;color:var(--brand-muted-gray);margin:4px 0 0;">Connected to real-time portfolio, approval, submission, and passport verification events.</p>
        </div>
        ${
          notifications.some((n) => !n.is_read)
            ? `<form method="POST" action="/api/notifications/mark-all-read" style="margin:0;">
                 <input type="hidden" name="return_to" value="${escapeHtml(activePath)}" />
                 <button type="submit" class="btn btn-secondary btn-sm">Mark All as Read</button>
               </form>`
            : ''
        }
      </div>

      ${
        notifications.length === 0
          ? `<div class="empty-state">
               ${icon('bell', 32)}
               <h4>No notifications yet.</h4>
               <p style="font-size:13.5px;margin:0;">You will receive notifications here when portfolios or assignments change state.</p>
             </div>`
          : `<div style="display:flex;flex-direction:column;gap:10px;">
               ${notifications
                 .map(
                   (n) => `<div style="padding:14px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);background:${n.is_read ? '#FFFFFF' : 'var(--brand-light-lavender)'};display:flex;justify-content:space-between;align-items:center;gap:16px;">
                     <div>
                       <div style="font-size:11.5px;font-weight:700;color:var(--brand-deep-purple);">
                         ${escapeHtml(n.event_type)} &bull; ${escapeHtml(n.created_at)} ${demoBadge(n.is_demo)}
                       </div>
                       <div style="font-size:15px;font-weight:700;color:var(--brand-dark-navy);margin:3px 0;">
                         ${escapeHtml(n.title)}
                       </div>
                       <div style="font-size:13.5px;color:var(--brand-charcoal);">${escapeHtml(n.message)}</div>
                     </div>
                     <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                       <a href="${escapeHtml(n.link_url)}" class="btn btn-primary btn-sm">Open Record</a>
                       ${
                         !n.is_read
                           ? `<form method="POST" action="/api/notifications/mark-read" style="margin:0;">
                                <input type="hidden" name="notification_id" value="${escapeHtml(n.id)}" />
                                <input type="hidden" name="return_to" value="${escapeHtml(activePath)}" />
                                <button type="submit" class="btn btn-secondary btn-sm">Mark Read</button>
                              </form>`
                           : `<span class="status-badge badge-neutral">Read</span>`
                       }
                     </div>
                   </div>`
                 )
                 .join('')}
             </div>`
      }
    </div>
  `;

  return renderDashboardLayout({
    title: 'Notifications',
    breadcrumb: 'Notifications',
    activePath,
    user,
    content
  });
}

// Page 8 — Student Profile (/student/profile)
export function renderStudentProfilePage(user: SessionUser, flash?: string | null): string {
  const student = getStudentProfile(user.id);
  if (!student) return '';
  const skills = safeJsonParse<string[]>(student.skills_json, []);

  const content = `
    <div class="grid-3">
      <div class="card" style="grid-column: span 2;">
        <h3 style="font-size:18px;margin-bottom:6px;">Manage Student Profile &amp; Privacy Settings</h3>
        <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:18px;">
          Sensitive personal details (NISN, guardian phone, private email) are never exposed on public or UMKM discovery pages.
        </p>

        <form method="POST" action="/api/student/profile/update">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" name="full_name" required value="${escapeHtml(student.full_name)}" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Verified School (Managed by Institution)</label>
              <input type="text" readonly value="${escapeHtml(student.school_name)} (${escapeHtml(student.school_city)})" class="form-control" style="background:var(--brand-warm-ivory);" />
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Grade Level *</label>
              <select name="grade" class="form-control">
                <option value="Grade 10 (X)" ${student.grade === 'Grade 10 (X)' ? 'selected' : ''}>Grade 10 (X)</option>
                <option value="Grade 11 (XI)" ${student.grade === 'Grade 11 (XI)' ? 'selected' : ''}>Grade 11 (XI)</option>
                <option value="Grade 12 (XII)" ${student.grade === 'Grade 12 (XII)' ? 'selected' : ''}>Grade 12 (XII)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Major / Department *</label>
              <input type="text" name="major" required value="${escapeHtml(student.major)}" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Contact Preference</label>
              <select name="contact_preference" class="form-control">
                <option value="PLATFORM_ONLY" ${student.contact_preference === 'PLATFORM_ONLY' ? 'selected' : ''}>Platform Supervised Channel Only</option>
                <option value="VIA_MENTOR_TEACHER" ${student.contact_preference === 'VIA_MENTOR_TEACHER' ? 'selected' : ''}>Via Assigned Mentor Teacher</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Skills (comma-separated) *</label>
            <input type="text" name="skills" required value="${escapeHtml(skills.join(', '))}" class="form-control" />
          </div>

          <div class="form-group">
            <label class="form-label">Short Biography</label>
            <textarea name="bio" rows="3" class="form-control">${escapeHtml(student.bio || '')}</textarea>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Parent / Guardian Name (Private)</label>
              <input type="text" name="guardian_name" value="${escapeHtml(student.guardian_name || '')}" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Guardian Contact Phone (Strictly Private — School Only)</label>
              <input type="text" name="guardian_contact_private" value="${escapeHtml(student.guardian_contact_private || '')}" class="form-control" />
            </div>
          </div>

          <div class="form-group" style="background:var(--brand-warm-ivory);padding:12px;border-radius:var(--radius-sm);">
            <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;">
              <input type="checkbox" name="public_portfolio_enabled" value="1" ${student.public_portfolio_enabled ? 'checked' : ''} />
              <span><strong>Public Portfolio Discovery Consent:</strong> Allow my school-verified portfolios to appear in public and UMKM talent discovery.</span>
            </label>
          </div>

          <button type="submit" class="btn btn-primary">Save Profile &amp; Privacy Preferences</button>
        </form>
      </div>

      <div class="card">
        <h3 style="font-size:16px;margin-bottom:10px;">Institutional Supervision</h3>
        <div style="font-size:13.5px;display:flex;flex-direction:column;gap:8px;">
          <div><strong>NISN (Private):</strong> <code>${escapeHtml(student.nisn)}</code></div>
          <div><strong>Identity Status:</strong> ${student.identity_verified ? statusBadge('Verified by School') : statusBadge('Pending School Check')}</div>
          <div><strong>Assigned Mentor:</strong> ${escapeHtml(student.mentor_name || 'Assigned by School Admin')}</div>
          <div><strong>Mentor Specialty:</strong> ${escapeHtml(student.mentor_specialty || 'General Supervision')}</div>
        </div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'My Profile & Privacy',
    breadcrumb: 'My Profile',
    activePath: '/student/profile',
    user,
    content,
    flashMessage: flash
  });
}

// Page 9 — Help & Complaints (/student/support)
export function renderStudentSupportPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const student = getStudentProfile(user.id);
  if (!student) return '';

  const complaints = db
    .prepare('SELECT * FROM complaints WHERE reporter_user_id = ? ORDER BY created_at DESC')
    .all(user.id) as Array<Record<string, any>>;

  const studentAssignments = db
    .prepare('SELECT id, title FROM assignments WHERE selected_student_id = ?')
    .all(student.id) as Array<Record<string, any>>;

  const content = `
    <div class="grid-2">
      <div class="card">
        <h3 style="font-size:18px;margin-bottom:6px;">Report a Safety Concern or Assignment Issue</h3>
        <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:16px;">
          Direct escalation channel to your Supervising Teacher, School Administrator, and Platform Safety Officer.
        </p>

        <form method="POST" action="/api/complaints/create">
          <input type="hidden" name="return_to" value="/student/support" />
          <div class="form-group">
            <label class="form-label">Issue Category *</label>
            <select name="category" required class="form-control">
              <option value="Scope Creep / Excessive Revisions">Scope Creep / Excessive Revisions</option>
              <option value="Unsafe Request / Direct Meeting Request">Unsafe Request / Unsupervised Meeting Request</option>
              <option value="Confidential Data Request">Confidential Data Request</option>
              <option value="Unfair Evaluation">Unfair Evaluation</option>
              <option value="Delayed Compensation">Delayed Compensation</option>
              <option value="Copyright / Usage Violation">Copyright / Usage Violation</option>
              <option value="General Support">General Support</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Related Assignment (Optional)</label>
            <select name="assignment_id" class="form-control">
              <option value="">— Not specific to one assignment —</option>
              ${studentAssignments.map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.title)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Urgency / Severity *</label>
            <select name="severity" class="form-control">
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical (Immediate Safety / Ethics Escalation)</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subject *</label>
            <input type="text" name="subject" required class="form-control" placeholder="Brief summary of the issue" />
          </div>
          <div class="form-group">
            <label class="form-label">Detailed Description *</label>
            <textarea name="description" rows="4" required class="form-control" placeholder="Describe what happened so your teacher and platform admin can investigate..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary">${icon('shield', 15)} Submit Safety / Support Report</button>
        </form>
      </div>

      <div class="card">
        <h3 style="font-size:18px;margin-bottom:12px;">My Submitted Reports (${complaints.length})</h3>
        ${
          complaints.length === 0
            ? `<div class="empty-state">
                 <h4>No complaints or safety reports filed.</h4>
                 <p style="font-size:13px;margin:0;">If an UMKM ever asks for off-platform meetings, extra revisions beyond the cap, or uncompensated commercial work, report it here immediately.</p>
               </div>`
            : `<div style="display:flex;flex-direction:column;gap:10px;">
                 ${complaints
                   .map(
                     (c) => `<div style="padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);">
                       <div style="display:flex;justify-content:space-between;align-items:center;">
                         <strong>${escapeHtml(c.subject)}</strong>
                         ${statusBadge(c.status)}
                       </div>
                       <div style="font-size:12px;color:var(--brand-deep-purple);margin:4px 0;">
                         ${escapeHtml(c.category)} &bull; Severity: ${escapeHtml(c.severity)}
                       </div>
                       <p style="font-size:13px;margin:6px 0;">${escapeHtml(c.description)}</p>
                       ${
                         c.resolution_notes
                           ? `<div style="padding:8px;background:var(--status-green-bg);border-radius:4px;font-size:12.5px;">
                                <strong>Resolution:</strong> ${escapeHtml(c.resolution_notes)}
                              </div>`
                           : ''
                       }
                     </div>`
                   )
                   .join('')}
               </div>`
        }
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Help, Safety & Complaints',
    breadcrumb: 'Help & Complaints',
    activePath: '/student/support',
    user,
    content,
    flashMessage: flash
  });
}
