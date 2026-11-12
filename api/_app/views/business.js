// ============================================================================
// SECOND LIFE — UMKM Partner Dashboard Pages (/business/*)
// ============================================================================

import { getDb, isDemoMode } from '../lib/db.js';
import { APPROVED_ASSIGNMENT_CATEGORIES } from '../types/domain.js';
                                                      
import { demoBadge, escapeHtml, formatIdr, icon, renderDashboardLayout, safeJsonParse, statusBadge } from './layout.js';

function getBusinessProfile(userId        )                                  {
  const db = getDb();
  return db
    .prepare(
      `SELECT b.*, u.full_name as owner_name, u.email as owner_email
       FROM businesses b
       JOIN users u ON u.id = b.user_id
       WHERE b.user_id = ?`
    )
    .get(userId)                                   ;
}

// Page 1 — UMKM Overview (/business/dashboard)
export function renderBusinessOverviewPage(user             , flash                )         {
  const db = getDb();
  const biz = getBusinessProfile(user.id);
  if (!biz) return '';

  const assignments = db
    .prepare('SELECT * FROM assignments WHERE business_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC')
    .all(biz.id)                              ;

  const pendingApps = db
    .prepare(
      `SELECT app.*, a.title as assignment_title, u.full_name as student_name, s.name as school_name, p.title as portfolio_title
       FROM assignment_applications app
       JOIN assignments a ON a.id = app.assignment_id
       JOIN students stu ON stu.id = app.student_id
       JOIN users u ON u.id = stu.user_id
       JOIN schools s ON s.id = stu.school_id
       JOIN portfolios p ON p.id = app.portfolio_id
       WHERE a.business_id = ? AND app.status = 'APPLIED'
       ORDER BY app.created_at DESC`
    )
    .all(biz.id)                              ;

  const waitingReviews = db
    .prepare(
      `SELECT sub.*, a.title as assignment_title, u.full_name as student_name
       FROM submissions sub
       JOIN assignments a ON a.id = sub.assignment_id
       JOIN students stu ON stu.id = sub.student_id
       JOIN users u ON u.id = stu.user_id
       WHERE a.business_id = ? AND sub.status IN ('SUBMITTED', 'UNDER_REVIEW')
       ORDER BY sub.updated_at DESC`
    )
    .all(biz.id)                              ;

  const activeCount = assignments.filter((a) =>
    ['Published', 'Student Applied', 'Teacher Approval Pending', 'Guardian Consent Pending', 'Ready to Start', 'In Progress', 'Revision Requested'].includes(a.status)
  ).length;
  const completedCount = assignments.filter((a) =>
    ['Accepted', 'School Verification', 'Closed'].includes(a.status)
  ).length;

  const content = `
    <div class="mh-hero" style="margin-bottom:24px;padding:28px 32px;border-radius:var(--radius-lg);box-shadow:var(--shadow-md);">
      <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div>
          <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);font-size:11px;color:var(--brand-muted-gold);font-weight:800;letter-spacing:0.08em;margin-bottom:10px;">
            <span style="width:7px;height:7px;border-radius:50%;background:var(--brand-muted-gold);"></span>
            UMKM PARTNER WORKSPACE &bull; ${escapeHtml(biz.category)}
          </div>
          <h2 style="color:#FFFFFF;font-size:26px;font-weight:800;margin:0 0 6px;letter-spacing:-0.02em;">${escapeHtml(biz.business_name)} ${demoBadge(biz.is_demo)}</h2>
          <div style="font-size:13.5px;color:rgba(255,255,255,0.84);">
            Business Verification Status: <strong>${escapeHtml(biz.verification_status)}</strong> &bull; City: ${escapeHtml(biz.city)}
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/business/talent" class="btn btn-pill" style="background:rgba(255,255,255,0.12);color:#FFFFFF;border:1px solid rgba(255,255,255,0.28);">${icon('search', 16)} Discover Verified Talent</a>
          <a href="/business/assignments/create" class="btn btn-gold btn-pill">${icon('plusCircle', 16)} Create Assignment (TRY)</a>
        </div>
      </div>
    </div>

    <div class="stat-ribbon">
      <div class="stat-ribbon-cell">
        <div class="stat-ribbon-label">Active &amp; Open Assignments <span class="icon-squircle" style="width:28px;height:28px;border-radius:8px;">${icon('briefcase', 14)}</span></div>
        <div class="stat-ribbon-value">${activeCount}</div>
        <div class="stat-ribbon-meta">${assignments.length} total created</div>
      </div>
      <div class="stat-ribbon-cell">
        <div class="stat-ribbon-label">Pending Applications <span class="icon-squircle icon-squircle-gold" style="width:28px;height:28px;border-radius:8px;">${icon('users', 14)}</span></div>
        <div class="stat-ribbon-value">${pendingApps.length}</div>
        <div class="stat-ribbon-meta">Student applicants to review</div>
      </div>
      <div class="stat-ribbon-cell">
        <div class="stat-ribbon-label">Submissions Waiting Review <span class="icon-squircle" style="width:28px;height:28px;border-radius:8px;">${icon('checkSquare', 14)}</span></div>
        <div class="stat-ribbon-value">${waitingReviews.length}</div>
        <div class="stat-ribbon-meta"><a href="/business/reviews" style="font-weight:700;">Open Review Queue &rarr;</a></div>
      </div>
      <div class="stat-ribbon-cell stat-ribbon-cell-highlight">
        <div class="stat-ribbon-label">Sertifikat Pengalaman Terbit <span>${icon('award', 15)}</span></div>
        <div class="stat-ribbon-value">${completedCount}</div>
        <div class="stat-ribbon-meta">Verified student outcomes</div>
      </div>
    </div>

    <div class="cockpit-split">
      <div class="card">
        <h3 style="font-size:17px;margin-bottom:12px;">Pending Student Applications (${pendingApps.length})</h3>
        ${
          pendingApps.length === 0
            ? `<div class="empty-state" style="padding:24px;">
                 <h4>No pending applications.</h4>
                 <p style="font-size:13px;margin:0;">When students apply to your published assignments with their verified portfolios, they appear here.</p>
               </div>`
            : `<div style="display:flex;flex-direction:column;gap:10px;">
                 ${pendingApps
                   .map(
                     (app) => `<div style="padding:14px 16px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);background:var(--brand-warm-ivory);">
                       <div style="display:flex;justify-content:space-between;align-items:center;">
                         <strong>${escapeHtml(app.student_name)} (${escapeHtml(app.school_name)})</strong>
                         <a href="/business/assignments/${escapeHtml(app.assignment_id)}" class="btn btn-primary btn-sm">Review Applicant</a>
                       </div>
                       <div style="font-size:12.5px;color:var(--brand-muted-gray);margin-top:4px;">
                         Applied for: <strong>${escapeHtml(app.assignment_title)}</strong> &bull; Portfolio: <em>${escapeHtml(app.portfolio_title)}</em>
                       </div>
                     </div>`
                   )
                   .join('')}
               </div>`
        }
      </div>

      <div class="card">
        <h3 style="font-size:17px;margin-bottom:12px;">Submissions Waiting for Evaluation (${waitingReviews.length})</h3>
        ${
          waitingReviews.length === 0
            ? `<div class="empty-state" style="padding:24px;">
                 <h4>No submissions awaiting evaluation.</h4>
                 <p style="font-size:13px;margin:0;">Student deliverables ready for your structured evaluation will appear here.</p>
               </div>`
            : `<div style="display:flex;flex-direction:column;gap:10px;">
                 ${waitingReviews
                   .map(
                     (w) => `<div style="padding:14px 16px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;background:var(--brand-warm-ivory);">
                       <div>
                         <strong>${escapeHtml(w.assignment_title)}</strong>
                         <div style="font-size:12.5px;color:var(--brand-muted-gray);">Submitted by ${escapeHtml(w.student_name)} (v${w.current_version_number})</div>
                       </div>
                       <a href="/business/reviews" class="btn btn-gold btn-sm">Evaluate Now</a>
                     </div>`
                   )
                   .join('')}
               </div>`
        }
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'UMKM Partner Overview',
    breadcrumb: 'Overview',
    activePath: '/business/dashboard',
    user,
    content,
    flashMessage: flash
  });
}

// Page 2 — Discover Talent (/business/talent)
export function renderBusinessTalentPage(
  user             ,
  query                                                       
)         {
  const db = getDb();
  const q = (query.q || '').trim();
  const category = (query.category || '').trim();
  const schoolId = (query.school_id || '').trim();
  const demoFilter = isDemoMode() ? '' : 'AND p.is_demo = 0';

  const schools = db
    .prepare(`SELECT id, name, city FROM schools WHERE verification_status = 'VERIFIED' ORDER BY name ASC`)
    .all()                              ;

  let sql = `
    SELECT
      p.id, p.title, p.description, p.category, p.skills_json, p.creation_date,
      p.project_origin, p.student_contribution, p.status, p.is_demo,
      u.full_name as student_name, stu.grade, stu.major,
      s.name as school_name, s.city as school_city
    FROM portfolios p
    JOIN students stu ON stu.id = p.student_id
    JOIN users u ON u.id = stu.user_id
    JOIN schools s ON s.id = p.school_id
    WHERE p.status IN ('Verified', 'Published')
      AND p.display_permission = 1
      AND p.school_display_authorized = 1
      AND stu.public_portfolio_enabled = 1
      AND p.deleted_at IS NULL
      ${demoFilter}
  `;
  const params        = [];
  if (q) {
    sql += ` AND (p.title LIKE ? OR p.skills_json LIKE ? OR p.description LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += ` AND p.category = ?`;
    params.push(category);
  }
  if (schoolId) {
    sql += ` AND p.school_id = ?`;
    params.push(schoolId);
  }
  sql += ` ORDER BY p.created_at DESC`;

  const portfolios = db.prepare(sql).all(...params)                              ;

  const content = `
    <div style="margin-bottom:18px;">
      <p style="font-size:14px;color:var(--brand-charcoal);margin:0;">
        Discover school-verified student portfolios to inspire scoped micro-assignments. Only information authorized by the student and their school is visible; private student contact data is protected.
      </p>
    </div>

    <form method="GET" action="/business/talent" class="card" style="margin-bottom:22px;padding:18px;">
      <div class="grid-4" style="align-items:end;">
        <div>
          <label class="form-label">Search by Skill or Portfolio Title</label>
          <input type="text" name="q" value="${escapeHtml(q)}" class="form-control" placeholder="e.g. Catalog, Typography, Video..." />
        </div>
        <div>
          <label class="form-label">Filter by Category</label>
          <select name="category" class="form-control">
            <option value="">All Categories</option>
            ${APPROVED_ASSIGNMENT_CATEGORIES.map(
              (c) => `<option value="${escapeHtml(c)}" ${category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Filter by Participating School</label>
          <select name="school_id" class="form-control">
            <option value="">All Verified Schools</option>
            ${schools
              .map(
                (s) => `<option value="${escapeHtml(s.id)}" ${schoolId === s.id ? 'selected' : ''}>${escapeHtml(s.name)} (${escapeHtml(s.city)})</option>`
              )
              .join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="submit" class="btn btn-primary" style="flex:1;">${icon('search', 15)} Search</button>
          <a href="/business/talent" class="btn btn-secondary">Reset</a>
        </div>
      </div>
    </form>

    ${
      portfolios.length === 0
        ? `<div class="empty-state">
             ${icon('search', 32)}
             <h4>No verified portfolios match your filter.</h4>
             <p style="font-size:13.5px;margin:0;">Only portfolios verified by a teacher and authorized for business discovery are shown.</p>
           </div>`
        : `<div class="grid-3">
             ${portfolios
               .map((p) => {
                 const skills = safeJsonParse          (p.skills_json, []);
                 return `<div class="visual-card">
                   <div class="visual-card-cover" style="height:105px;padding:14px 20px;">
                     <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">
                       <span class="status-badge" style="background:rgba(255,255,255,0.16);color:#FFFFFF;border:1px solid rgba(255,255,255,0.28);">${escapeHtml(p.category)}</span>
                       ${statusBadge('School Verified')}
                     </div>
                     <div style="position:relative;z-index:1;color:rgba(255,255,255,0.88);font-size:12px;font-weight:700;">
                       ${icon('school', 13)} ${escapeHtml(p.school_name)}
                     </div>
                   </div>
                   <div class="visual-card-body">
                     <div>
                       <h3 style="font-size:17px;margin-bottom:6px;">
                         <a href="/explore/${escapeHtml(p.id)}" target="_blank" style="color:var(--brand-dark-navy);">${escapeHtml(p.title)}</a>
                         ${demoBadge(p.is_demo)}
                       </h3>
                       <p style="font-size:13.5px;margin-bottom:10px;">${escapeHtml(p.description)}</p>
                       <div style="font-size:12px;color:var(--brand-muted-gray);margin-bottom:10px;">
                         <strong>Contribution:</strong> ${escapeHtml(p.student_contribution)}
                       </div>
                       <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
                         ${skills.map((s) => `<span class="status-badge badge-neutral">${escapeHtml(s)}</span>`).join('')}
                       </div>
                     </div>
                     <div style="border-top:1px solid var(--border-subtle);padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
                       <div style="font-size:12px;">
                         <strong>${escapeHtml(p.student_name)}</strong> (${escapeHtml(p.grade)})<br/>
                         <span style="color:var(--brand-muted-gray);">${escapeHtml(p.school_city)}</span>
                       </div>
                       <a href="/explore/${escapeHtml(p.id)}" class="btn btn-primary btn-sm btn-pill">Inspect Work</a>
                     </div>
                   </div>
                 </div>`;
               })
               .join('')}
           </div>`
    }
  `;

  return renderDashboardLayout({
    title: 'Discover School-Verified Talent',
    breadcrumb: 'Discover Talent',
    activePath: '/business/talent',
    user,
    content
  });
}

// Page 3 — Create Assignment (TRY) (/business/assignments/create)
export function renderBusinessCreateAssignmentPage(user             , flash                )         {
  const biz = getBusinessProfile(user.id);
  if (!biz) return '';

  const content = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <h2 style="font-size:20px;margin:0;">Create Supervised Micro-Assignment (TRY Stage)</h2>
          <p style="font-size:13px;color:var(--brand-muted-gray);margin:4px 0 0;">
            Every assignment undergoes Stage 2 Platform Admin Moderation before publication and requires Stage 3 Teacher &amp; Guardian Approval before a student can begin.
          </p>
        </div>
        ${statusBadge(biz.verification_status)}
      </div>

      <div class="alert alert-info" style="font-size:13px;">
        ${icon('shield', 16)}
        <div>
          <strong>Mandatory Ethical Rules:</strong>
          (1) Commercial usage intention requires an explicit monetary compensation amount (&gt; Rp0).
          (2) Tasks must be safe, bounded, and suitable for secondary students.
          (3) No confidential business secrets or unsupervised physical meetings.
        </div>
      </div>

      <form method="POST" action="/api/business/assignments/create">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Assignment Title *</label>
            <input type="text" name="title" required class="form-control" placeholder="e.g. 4-Page Seasonal Product Mini-Catalog Layout" />
          </div>
          <div class="form-group">
            <label class="form-label">Assignment Category *</label>
            <select name="category" required class="form-control">
              ${APPROVED_ASSIGNMENT_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Assignment Description &amp; Brief *</label>
          <textarea name="description" rows="3" required class="form-control" placeholder="Clearly explain the background, style direction, and materials you will provide..."></textarea>
        </div>

        <div class="grid-3">
          <div class="form-group">
            <label class="form-label">Required Skills (comma-separated) *</label>
            <input type="text" name="required_skills" required class="form-control" placeholder="e.g. Graphic Design, Typography, Layout" />
          </div>
          <div class="form-group">
            <label class="form-label">Expected Deliverables *</label>
            <input type="text" name="deliverables" required class="form-control" placeholder="e.g. 1x 4-page A5 print-ready PDF" />
          </div>
          <div class="form-group">
            <label class="form-label">Expected Output Format *</label>
            <input type="text" name="output_format" required value="PDF & PNG Preview" class="form-control" />
          </div>
        </div>

        <div class="grid-4">
          <div class="form-group">
            <label class="form-label">Estimated Duration (Hours) *</label>
            <input type="number" name="estimated_duration_hours" min="1" max="40" value="8" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Start Date *</label>
            <input type="date" name="start_date" value="2026-11-15" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Deadline *</label>
            <input type="date" name="deadline" value="2026-11-28" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Maximum Revisions (1–3) *</label>
            <input type="number" name="max_revisions" min="0" max="3" value="2" required class="form-control" />
          </div>
        </div>

        <!-- Compensation & Commercial Rights -->
        <div class="card-lavender" style="margin-bottom:18px;">
          <h4 style="font-size:15px;margin-bottom:10px;">Compensation, Commercial Intention &amp; Copyright Terms</h4>
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Commercial Usage Intention? *</label>
              <select name="commercial_usage_intention" class="form-control">
                <option value="1">Yes — Intended for Commercial Business Use (Requires Monetary Compensation)</option>
                <option value="0">No — Non-Commercial Practice / Learning Arrangement Only</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Compensation Type *</label>
              <select name="compensation_type" class="form-control">
                <option value="MONETARY">Monetary Compensation (IDR)</option>
                <option value="NON_MONETARY_LEARNING">Non-Monetary Learning Arrangement (Only if Non-Commercial)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Compensation Amount (IDR) *</label>
              <input type="number" name="compensation_amount_idr" min="0" step="25000" value="250000" required class="form-control" />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Compensation Settlement Details *</label>
              <input type="text" name="compensation_details" required value="Student appreciation stipend disbursed upon deliverable acceptance" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Copyright &amp; Licensing Terms *</label>
              <input type="text" name="copyright_licensing_terms" required value="Non-exclusive commercial usage granted upon compensation settlement; student retains portfolio display attribution." class="form-control" />
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Evaluation Criteria (comma-separated) *</label>
            <input type="text" name="evaluation_criteria" required value="Relevance to Brief, Quality of Output, Creativity, Technical Execution, Timeliness" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Additional Instructions &amp; Mentor Requirements</label>
            <input type="text" name="additional_instructions" value="Supervised on-platform collaboration only; teacher approval required." class="form-control" />
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;font-size:13px;">
          <label style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" name="safety_no_dangerous_work" value="1" required checked />
            <span>I confirm this assignment involves zero hazardous or dangerous activities.</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" name="safety_no_confidential_data" value="1" required checked />
            <span>I confirm this assignment does not require students to handle sensitive personal or confidential financial data.</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" name="safety_no_unsupervised_meeting" value="1" required checked />
            <span>I commit to zero unsupervised physical meetings with students.</span>
          </label>
        </div>

        <div style="display:flex;gap:12px;">
          <button type="submit" name="submit_mode" value="SUBMIT_FOR_REVIEW" class="btn btn-primary">Submit for Platform Admin Review</button>
          <button type="submit" name="submit_mode" value="SAVE_DRAFT" class="btn btn-secondary">Save as Draft</button>
        </div>
      </form>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Create Assignment (TRY)',
    breadcrumb: 'Create Assignment',
    activePath: '/business/assignments/create',
    user,
    content,
    flashMessage: flash
  });
}

// Page 4 — My Assignments (/business/assignments & /business/assignments/:id)
export function renderBusinessAssignmentsPage(user             , flash                )         {
  const db = getDb();
  const biz = getBusinessProfile(user.id);
  if (!biz) return '';

  const assignments = db
    .prepare(
      `SELECT a.*,
              (SELECT COUNT(*) FROM assignment_applications app WHERE app.assignment_id = a.id) as applicant_count,
              u.full_name as student_name, s.name as school_name
       FROM assignments a
       LEFT JOIN students stu ON stu.id = a.selected_student_id
       LEFT JOIN users u ON u.id = stu.user_id
       LEFT JOIN schools s ON s.id = a.assigned_school_id
       WHERE a.business_id = ? AND a.deleted_at IS NULL
       ORDER BY a.created_at DESC`
    )
    .all(biz.id)                              ;

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <p style="margin:0;font-size:14px;">Manage all draft, pending moderation, published, active, and completed assignments.</p>
      <a href="/business/assignments/create" class="btn btn-primary btn-sm">${icon('plusCircle', 15)} Create New Assignment</a>
    </div>

    <div class="card">
      ${
        assignments.length === 0
          ? `<div class="empty-state">
               ${icon('briefcase', 32)}
               <h4>No assignments created yet.</h4>
               <p style="font-size:13.5px;margin:0 0 14px;">Create a structured micro-assignment for supervised students.</p>
               <a href="/business/assignments/create" class="btn btn-primary btn-sm">Create First Assignment</a>
             </div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Title &amp; Category</th>
                     <th>Compensation</th>
                     <th>Deadline &amp; Revisions</th>
                     <th>Applicants / Assigned Student</th>
                     <th>Safety Stage</th>
                     <th>Status</th>
                     <th>Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${assignments
                     .map(
                       (a) => `<tr>
                         <td>
                           <strong><a href="/business/assignments/${escapeHtml(a.id)}">${escapeHtml(a.title)}</a></strong>
                           ${demoBadge(a.is_demo)}
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(a.category)}</div>
                         </td>
                         <td>${formatIdr(a.compensation_amount_idr)}</td>
                         <td>
                           <div>${escapeHtml(a.deadline)}</div>
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">Max ${a.max_revisions} rev</div>
                         </td>
                         <td>
                           ${
                             a.student_name
                               ? `<strong>${escapeHtml(a.student_name)}</strong><div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(a.school_name || '')}</div>`
                               : `${a.applicant_count} applicant(s)`
                           }
                         </td>
                         <td>Stage ${a.current_safety_stage}/6</td>
                         <td>${statusBadge(a.status)}</td>
                         <td>
                           <a href="/business/assignments/${escapeHtml(a.id)}" class="btn btn-secondary btn-sm">Manage</a>
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
    title: 'My Assignments',
    breadcrumb: 'My Assignments',
    activePath: '/business/assignments',
    user,
    content,
    flashMessage: flash
  });
}

export function renderBusinessAssignmentDetailPage(
  user             ,
  assignmentId        ,
  flash                
)         {
  const db = getDb();
  const biz = getBusinessProfile(user.id);
  if (!biz) return '';

  const a = db
    .prepare('SELECT * FROM assignments WHERE id = ? AND business_id = ? AND deleted_at IS NULL')
    .get(assignmentId, biz.id)                                   ;

  if (!a) {
    return renderDashboardLayout({
      title: 'Assignment Not Found',
      breadcrumb: 'Assignment Detail',
      activePath: '/business/assignments',
      user,
      content: `<div class="alert alert-error">Assignment not found.</div>`
    });
  }

  const applications = db
    .prepare(
      `SELECT app.*, u.full_name as student_name, stu.grade, stu.major,
              s.name as school_name, p.title as portfolio_title
       FROM assignment_applications app
       JOIN students stu ON stu.id = app.student_id
       JOIN users u ON u.id = stu.user_id
       JOIN schools s ON s.id = stu.school_id
       JOIN portfolios p ON p.id = app.portfolio_id
       WHERE app.assignment_id = ?
       ORDER BY app.created_at DESC`
    )
    .all(a.id)                              ;

  const progressLogs = db
    .prepare('SELECT * FROM assignment_progress WHERE assignment_id = ? ORDER BY created_at DESC')
    .all(a.id)                              ;

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <a href="/business/assignments" style="font-size:13.5px;font-weight:600;">&larr; Back to My Assignments</a>
      <div style="display:flex;gap:8px;align-items:center;">
        ${statusBadge(a.status)}
        ${
          a.status === 'Draft'
            ? `<form method="POST" action="/api/business/assignments/submit-review" style="margin:0;">
                 <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                 <button type="submit" class="btn btn-primary btn-sm">Submit for Admin Review</button>
               </form>`
            : ''
        }
        ${
          a.status === 'Approved'
            ? `<form method="POST" action="/api/business/assignments/publish" style="margin:0;">
                 <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                 <button type="submit" class="btn btn-gold btn-sm">Publish Assignment</button>
               </form>`
            : ''
        }
      </div>
    </div>

    <div class="grid-3">
      <div style="grid-column: span 2;display:flex;flex-direction:column;gap:20px;">
        <div class="card">
          <h2 style="font-size:22px;margin-bottom:6px;">${escapeHtml(a.title)} ${demoBadge(a.is_demo)}</h2>
          <p style="font-size:14px;margin-bottom:14px;">${escapeHtml(a.description)}</p>
          <div class="grid-2" style="background:var(--brand-warm-ivory);padding:14px;border-radius:var(--radius-sm);font-size:13px;">
            <div>
              <strong>Deliverables:</strong> ${escapeHtml(a.deliverables)}<br/>
              <strong>Output Format:</strong> ${escapeHtml(a.output_format)}<br/>
              <strong>Max Revisions:</strong> ${a.max_revisions}
            </div>
            <div>
              <strong>Schedule:</strong> ${escapeHtml(a.start_date)} to ${escapeHtml(a.deadline)} (${a.estimated_duration_hours}h)<br/>
              <strong>Compensation:</strong> ${formatIdr(a.compensation_amount_idr)}<br/>
              <strong>Safety Stage:</strong> Stage ${a.current_safety_stage} of 6
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:17px;margin-bottom:12px;">Student Applicants (${applications.length})</h3>
          ${
            applications.length === 0
              ? `<p style="font-size:13.5px;color:var(--brand-muted-gray);margin:0;">No student applications received yet.</p>`
              : `<div style="display:flex;flex-direction:column;gap:12px;">
                   ${applications
                     .map(
                       (app) => `<div style="padding:14px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);">
                         <div style="display:flex;justify-content:space-between;align-items:center;">
                           <div>
                             <strong>${escapeHtml(app.student_name)}</strong> (${escapeHtml(app.grade)} — ${escapeHtml(app.school_name)})
                             <div style="font-size:12px;color:var(--brand-deep-purple);">
                               Verified Portfolio: <a href="/explore/${escapeHtml(app.portfolio_id)}" target="_blank">${escapeHtml(app.portfolio_title)} &nearr;</a>
                             </div>
                           </div>
                           ${statusBadge(app.status)}
                         </div>
                         <p style="font-size:13px;margin:8px 0;"><strong>Student Note:</strong> ${escapeHtml(app.motivation_note)}</p>
                         ${
                           app.status === 'APPLIED' && ['Published', 'Student Applied'].includes(a.status)
                             ? `<form method="POST" action="/api/business/assignments/select-student" style="margin-top:8px;">
                                  <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                                  <input type="hidden" name="application_id" value="${escapeHtml(app.id)}" />
                                  <button type="submit" class="btn btn-primary btn-sm">
                                    Select Student &amp; Request Stage 3 Teacher Approval
                                  </button>
                                </form>`
                             : ''
                         }
                       </div>`
                     )
                     .join('')}
                 </div>`
          }
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:16px;margin-bottom:10px;">Supervised Activity Timeline</h3>
        ${
          progressLogs.length === 0
            ? `<p style="font-size:13px;color:var(--brand-muted-gray);margin:0;">Progress logs will appear here once the assignment starts.</p>`
            : progressLogs
                .map(
                  (p) => `<div style="padding:10px 0;border-bottom:1px solid var(--border-subtle);font-size:12.5px;">
                    <strong>${escapeHtml(p.milestone_title)} (${p.progress_percent}%)</strong>
                    <div style="margin:3px 0;">${escapeHtml(p.progress_note)}</div>
                    <div style="font-size:11px;color:var(--brand-muted-gray);">${escapeHtml(p.actor_role)} &bull; ${escapeHtml(p.created_at)}</div>
                  </div>`
                )
                .join('')
        }
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: `Assignment: ${a.title}`,
    breadcrumb: 'Assignment Detail',
    activePath: '/business/assignments',
    user,
    content,
    flashMessage: flash
  });
}

// Page 5 — Submissions & Reviews (VERIFY) (/business/reviews)
export function renderBusinessReviewsPage(user             , flash                )         {
  const db = getDb();
  const biz = getBusinessProfile(user.id);
  if (!biz) return '';

  const submissions = db
    .prepare(
      `SELECT
         sub.*, a.title as assignment_title, a.max_revisions, a.status as assignment_status,
         u.full_name as student_name, s.name as school_name
       FROM submissions sub
       JOIN assignments a ON a.id = sub.assignment_id
       JOIN students stu ON stu.id = sub.student_id
       JOIN users u ON u.id = stu.user_id
       JOIN schools s ON s.id = stu.school_id
       WHERE a.business_id = ?
       ORDER BY sub.updated_at DESC`
    )
    .all(biz.id)                              ;

  const content = `
    <p style="font-size:14px;margin-top:0;margin-bottom:20px;">
      <strong>VERIFY Stage:</strong> Review student deliverables against agreed evaluation criteria. Scores and feedback must reflect your actual evaluation—SECOND LIFE never generates automatic ratings.
    </p>

    ${
      submissions.length === 0
        ? `<div class="empty-state">
             ${icon('checkSquare', 32)}
             <h4>No student submissions received yet.</h4>
             <p style="font-size:13.5px;margin:0;">Once a student uploads deliverables for an active assignment, you can evaluate them here.</p>
           </div>`
        : submissions
            .map((sub) => {
              const versions = db
                .prepare('SELECT * FROM submission_versions WHERE submission_id = ? ORDER BY version_number DESC')
                .all(sub.id)                              ;
              const existingEval = db
                .prepare('SELECT * FROM evaluations WHERE submission_id = ?')
                .get(sub.id)                                   ;
              const canReview = ['Submitted', 'Under Review'].includes(sub.assignment_status);

              return `<div class="card" style="margin-bottom:22px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <div>
                    <h3 style="font-size:18px;margin:0;">${escapeHtml(sub.assignment_title)} ${demoBadge(sub.is_demo)}</h3>
                    <div style="font-size:13px;color:var(--brand-muted-gray);">
                      Student: <strong>${escapeHtml(sub.student_name)}</strong> (${escapeHtml(sub.school_name)}) &bull;
                      Revisions Used: ${sub.revisions_used} / ${sub.max_revisions}
                    </div>
                  </div>
                  ${statusBadge(sub.status)}
                </div>

                <h4 style="font-size:14px;margin-bottom:8px;">Submitted Deliverable Versions</h4>
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
                  ${versions
                    .map(
                      (v) => `<div style="padding:10px 14px;background:var(--brand-warm-ivory);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
                        <div>
                          <strong>Version ${v.version_number}: ${escapeHtml(v.deliverable_summary)}</strong>
                          <div style="font-size:12.5px;">${escapeHtml(v.submission_notes)}</div>
                          <div style="font-size:11.5px;color:var(--brand-muted-gray);">File: <code>${escapeHtml(v.file_name)}</code> &bull; Submitted: ${escapeHtml(v.submitted_at)}</div>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;">
                          ${statusBadge(v.review_status)}
                          <a href="/api/files/download?type=submission&id=${escapeHtml(v.id)}" class="btn btn-secondary btn-sm">${icon('download', 13)} Download Deliverable</a>
                        </div>
                      </div>`
                    )
                    .join('')}
                </div>

                ${
                  existingEval
                    ? `<div class="card-lavender">
                         <h4 style="font-size:15px;margin-bottom:6px;">Recorded Structured Evaluation (${escapeHtml(existingEval.outcome_decision)})</h4>
                         <div style="font-size:13px;margin-bottom:6px;">
                           Relevance: <strong>${existingEval.relevance_score}/5</strong> &bull;
                           Quality: <strong>${existingEval.quality_score}/5</strong> &bull;
                           Creativity: <strong>${existingEval.creativity_score}/5</strong> &bull;
                           Technical: <strong>${existingEval.technical_score}/5</strong> &bull;
                           Timeliness: <strong>${existingEval.timeliness_score}/5</strong>
                         </div>
                         <div style="font-size:13.5px;"><strong>Written Feedback:</strong> ${escapeHtml(existingEval.written_feedback)}</div>
                       </div>`
                    : ''
                }

                ${
                  canReview
                    ? `<form method="POST" action="/api/business/reviews/evaluate" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-subtle);">
                         <input type="hidden" name="assignment_id" value="${escapeHtml(sub.assignment_id)}" />
                         <input type="hidden" name="submission_id" value="${escapeHtml(sub.id)}" />
                         <h4 style="font-size:15px;margin-bottom:10px;">Submit Structured UMKM Evaluation (Stage 5 Safety)</h4>
                         <div class="grid-4" style="margin-bottom:12px;">
                           <div>
                             <label class="form-label">1. Relevance to Brief (1–5)</label>
                             <input type="number" name="relevance_score" min="1" max="5" value="5" required class="form-control" />
                           </div>
                           <div>
                             <label class="form-label">2. Quality of Output (1–5)</label>
                             <input type="number" name="quality_score" min="1" max="5" value="5" required class="form-control" />
                           </div>
                           <div>
                             <label class="form-label">3. Creativity (1–5)</label>
                             <input type="number" name="creativity_score" min="1" max="5" value="4" required class="form-control" />
                           </div>
                           <div>
                             <label class="form-label">4. Technical &amp; Timeliness (1–5)</label>
                             <input type="number" name="technical_score" min="1" max="5" value="5" required class="form-control" />
                             <input type="hidden" name="timeliness_score" value="5" />
                           </div>
                         </div>

                         <div class="grid-2">
                           <div class="form-group">
                             <label class="form-label">Decision *</label>
                             <select name="outcome_decision" required class="form-control">
                               <option value="ACCEPTED">Accept Completed Work (Trigger School Verification for Passport)</option>
                               ${
                                 sub.revisions_used < sub.max_revisions
                                   ? `<option value="REVISION_REQUESTED">Request Revision (${sub.max_revisions - sub.revisions_used} remaining)</option>`
                                   : ''
                               }
                               <option value="REJECTED">Reject Work (Documented Reason Required)</option>
                             </select>
                           </div>
                           <div class="form-group">
                             <label class="form-label">Constructive Written Feedback / Revision Instructions *</label>
                             <input type="text" name="written_feedback" required class="form-control" placeholder="Provide specific, constructive feedback on the student's deliverable..." />
                           </div>
                         </div>

                         <button type="submit" class="btn btn-primary">Record Official Evaluation</button>
                       </form>`
                    : ''
                }
              </div>`;
            })
            .join('')
    }
  `;

  return renderDashboardLayout({
    title: 'Submissions & Reviews (VERIFY)',
    breadcrumb: 'Submissions & Reviews',
    activePath: '/business/reviews',
    user,
    content,
    flashMessage: flash
  });
}

// Page 6 — Business Profile (/business/profile)
export function renderBusinessProfilePage(user             , flash                )         {
  const biz = getBusinessProfile(user.id);
  if (!biz) return '';

  const content = `
    <div class="grid-3">
      <div class="card" style="grid-column: span 2;">
        <h3 style="font-size:18px;margin-bottom:14px;">UMKM Business Profile</h3>
        <form method="POST" action="/api/business/profile/update">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Business Name *</label>
              <input type="text" name="business_name" required value="${escapeHtml(biz.business_name)}" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Business Category *</label>
              <input type="text" name="category" required value="${escapeHtml(biz.category)}" class="form-control" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Business Description *</label>
            <textarea name="description" rows="3" required class="form-control">${escapeHtml(biz.description)}</textarea>
          </div>
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Contact Email *</label>
              <input type="email" name="contact_email" required value="${escapeHtml(biz.contact_email)}" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input type="text" name="contact_phone" value="${escapeHtml(biz.contact_phone || '')}" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">City *</label>
              <input type="text" name="city" required value="${escapeHtml(biz.city)}" class="form-control" />
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Business Address (Optional)</label>
              <input type="text" name="address_optional" value="${escapeHtml(biz.address_optional || '')}" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">NIB / Registration Reference</label>
              <input type="text" name="nib_or_reg_note" value="${escapeHtml(biz.nib_or_reg_note || '')}" class="form-control" />
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Save Business Profile</button>
        </form>
      </div>

      <div class="card">
        <h3 style="font-size:16px;margin-bottom:10px;">Verification Status</h3>
        <div style="margin-bottom:10px;">${statusBadge(biz.verification_status)}</div>
        <p style="font-size:13px;color:var(--brand-muted-gray);margin:0;">
          Business verification is performed strictly by an authorized Platform Administrator. UMKM accounts cannot self-verify.
        </p>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Business Profile',
    breadcrumb: 'Business Profile',
    activePath: '/business/profile',
    user,
    content,
    flashMessage: flash
  });
}
