// ============================================================================
// SECOND LIFE — Platform Administrator Dashboard Pages (/admin/*)
// ============================================================================

import { getGoogleSheetsIntegrationStatus } from '../lib/adapters/google-sheets.ts';
import { getDb, isDemoMode } from '../lib/db.ts';
import type { SessionUser } from '../types/domain.ts';
import { demoBadge, escapeHtml, formatIdr, icon, renderDashboardLayout, statusBadge } from './layout.ts';

// Page 1 — Platform Overview (/admin/dashboard)
export function renderAdminOverviewPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();

  // Production metrics strictly exclude is_demo = 1
  const prodSchools = (db.prepare(`SELECT COUNT(*) as c FROM schools WHERE is_demo = 0`).get() as { c: number }).c;
  const prodBusinesses = (db.prepare(`SELECT COUNT(*) as c FROM businesses WHERE is_demo = 0`).get() as { c: number }).c;
  const prodAssignments = (db.prepare(`SELECT COUNT(*) as c FROM assignments WHERE is_demo = 0`).get() as { c: number }).c;
  const prodPassports = (db.prepare(`SELECT COUNT(*) as c FROM experience_passports WHERE is_demo = 0`).get() as { c: number }).c;

  // Demo metrics tracked separately
  const demoRecordsTotal =
    (db.prepare(`SELECT COUNT(*) as c FROM assignments WHERE is_demo = 1`).get() as { c: number }).c +
    (db.prepare(`SELECT COUNT(*) as c FROM portfolios WHERE is_demo = 1`).get() as { c: number }).c;

  const pendingModerationAssignments = db
    .prepare(
      `SELECT a.*, b.business_name
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       WHERE a.status IN ('Submitted for Admin Review', 'School Verification')
       ORDER BY a.updated_at DESC`
    )
    .all() as Array<Record<string, any>>;

  const openComplaints = db
    .prepare(`SELECT * FROM complaints WHERE status != 'RESOLVED' ORDER BY created_at DESC`)
    .all() as Array<Record<string, any>>;

  const content = `
    <div class="card" style="margin-bottom:22px;background:linear-gradient(90deg, var(--brand-dark-navy) 0%, var(--brand-deep-purple) 100%);color:#FFFFFF;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div>
          <div style="font-size:12px;color:var(--brand-muted-gold);font-weight:700;letter-spacing:0.06em;">
            GLOBAL GOVERNANCE &amp; SAFETY COMMAND CENTER
          </div>
          <h2 style="color:#FFFFFF;font-size:24px;margin:6px 0;">Platform Administrator Portal</h2>
          <div style="font-size:13.5px;color:rgba(255,255,255,0.82);">
            Enforcing Stage 2 Assignment Moderation, Stage 6 Closure &amp; Passport Issuance, and Full Audit Logging.
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/admin/assignments" class="btn btn-gold">${icon('briefcase', 16)} Assignment Queue (${pendingModerationAssignments.length})</a>
          <a href="/admin/audit-logs" class="btn btn-secondary">${icon('activity', 16)} View Audit Logs</a>
        </div>
      </div>
    </div>

    <!-- Strictly Production Metrics (Never mixed with Demo Data) -->
    <div style="font-size:12px;font-weight:700;color:var(--brand-deep-purple);text-transform:uppercase;margin-bottom:8px;">
      Production Metrics (Strictly Excluding Synthetic Demo Records — Demo Items: ${demoRecordsTotal})
    </div>
    <div class="grid-4" style="margin-bottom:24px;">
      <div class="metric-card">
        <div class="metric-label"><span>Production Schools</span> ${icon('graduationCap', 16)}</div>
        <div class="metric-value">${prodSchools}</div>
        <div class="metric-sub"><a href="/admin/schools">Manage Schools &rarr;</a></div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Production UMKM</span> ${icon('building', 16)}</div>
        <div class="metric-value">${prodBusinesses}</div>
        <div class="metric-sub"><a href="/admin/businesses">Verify UMKM &rarr;</a></div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Production Assignments</span> ${icon('briefcase', 16)}</div>
        <div class="metric-value">${prodAssignments}</div>
        <div class="metric-sub"><a href="/admin/assignments">Moderate Queue &rarr;</a></div>
      </div>
      <div class="metric-card">
        <div class="metric-label"><span>Production Passports</span> ${icon('award', 16)}</div>
        <div class="metric-value">${prodPassports}</div>
        <div class="metric-sub"><a href="/admin/verifications">Inspect Evidence &rarr;</a></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 style="font-size:17px;margin-bottom:12px;">Assignments Awaiting Stage 2 Review or Stage 6 Closure (${pendingModerationAssignments.length})</h3>
        ${
          pendingModerationAssignments.length === 0
            ? `<div class="empty-state" style="padding:24px;"><h4>No assignments waiting for Admin action.</h4></div>`
            : `<div style="display:flex;flex-direction:column;gap:10px;">
                 ${pendingModerationAssignments
                   .map(
                     (a) => `<div style="padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
                       <div>
                         <strong>${escapeHtml(a.title)}</strong> ${demoBadge(a.is_demo)}
                         <div style="font-size:12px;color:var(--brand-muted-gray);">${escapeHtml(a.business_name)} &bull; ${escapeHtml(a.status)}</div>
                       </div>
                       <a href="/admin/assignments" class="btn btn-primary btn-sm">Moderate</a>
                     </div>`
                   )
                   .join('')}
               </div>`
        }
      </div>

      <div class="card">
        <h3 style="font-size:17px;margin-bottom:12px;">Open Safety &amp; Support Complaints (${openComplaints.length})</h3>
        ${
          openComplaints.length === 0
            ? `<div class="empty-state" style="padding:24px;"><h4>Zero open safety complaints.</h4></div>`
            : `<div style="display:flex;flex-direction:column;gap:10px;">
                 ${openComplaints
                   .map(
                     (c) => `<div style="padding:12px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
                       <div>
                         <strong>${escapeHtml(c.subject)}</strong>
                         <div style="font-size:12px;color:var(--brand-muted-gray);">${escapeHtml(c.category)} &bull; Severity: ${escapeHtml(c.severity)}</div>
                       </div>
                       <a href="/admin/safety" class="btn btn-danger btn-sm">Investigate</a>
                     </div>`
                   )
                   .join('')}
               </div>`
        }
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Platform Administrator Overview',
    breadcrumb: 'Overview',
    activePath: '/admin/dashboard',
    user,
    content,
    flashMessage: flash
  });
}

// Page 2 — User Management (/admin/users)
export function renderAdminUsersPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const users = db
    .prepare(
      `SELECT u.*, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    )
    .all() as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:12px;">Global User Management (${users.length})</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Full Name &amp; Email</th>
              <th>Role</th>
              <th>Associated School</th>
              <th>Status</th>
              <th>Administrative Action (Logged to Audit Trail)</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (u) => `<tr>
                  <td>
                    <strong>${escapeHtml(u.full_name)}</strong> ${demoBadge(u.is_demo)}
                    <div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(u.email)}</div>
                  </td>
                  <td><span class="status-badge badge-neutral">${escapeHtml(u.role_id)}</span></td>
                  <td>${escapeHtml(u.school_name || '—')}</td>
                  <td>${statusBadge(u.status)}</td>
                  <td>
                    ${
                      u.id === user.id
                        ? `<span style="font-size:12px;color:var(--brand-muted-gray);">Current Admin Session</span>`
                        : `<form method="POST" action="/api/admin/users/status" style="display:flex;gap:6px;margin:0;">
                             <input type="hidden" name="target_user_id" value="${escapeHtml(u.id)}" />
                             <input type="text" name="reason" required placeholder="Audit reason..." class="form-control" style="padding:4px 8px;font-size:12px;width:160px;" />
                             ${
                               u.status === 'SUSPENDED'
                                 ? `<button type="submit" name="new_status" value="ACTIVE" class="btn btn-primary btn-sm">Reactivate</button>`
                                 : `<button type="submit" name="new_status" value="SUSPENDED" class="btn btn-danger btn-sm">Suspend</button>`
                             }
                           </form>`
                    }
                  </td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'User Management',
    breadcrumb: 'User Management',
    activePath: '/admin/users',
    user,
    content,
    flashMessage: flash
  });
}

// Page 3 — School Management (/admin/schools)
export function renderAdminSchoolsPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const schools = db
    .prepare('SELECT * FROM schools WHERE deleted_at IS NULL ORDER BY created_at DESC')
    .all() as Array<Record<string, any>>;

  const content = `
    <div class="grid-3">
      <div class="card" style="grid-column: span 2;">
        <h3 style="font-size:18px;margin-bottom:12px;">Participating Schools / PKBM (${schools.length})</h3>
        ${
          schools.length === 0
            ? `<div class="empty-state"><h4>No schools registered yet.</h4></div>`
            : `<div class="table-responsive">
                 <table class="data-table">
                   <thead>
                     <tr>
                       <th>School Name &amp; NPSN</th>
                       <th>Type &amp; Location</th>
                       <th>Invite Code</th>
                       <th>Status</th>
                       <th>Admin Action</th>
                     </tr>
                   </thead>
                   <tbody>
                     ${schools
                       .map(
                         (s) => `<tr>
                           <td>
                             <strong>${escapeHtml(s.name)}</strong> ${demoBadge(s.is_demo)}
                             <div style="font-size:11.5px;color:var(--brand-muted-gray);">NPSN: ${escapeHtml(s.npsn)} &bull; ${escapeHtml(s.contact_email)}</div>
                           </td>
                           <td>${escapeHtml(s.type)} &bull; ${escapeHtml(s.city)}, ${escapeHtml(s.province)}</td>
                           <td><code>${escapeHtml(s.invite_code)}</code></td>
                           <td>${statusBadge(s.verification_status)}</td>
                           <td>
                             <form method="POST" action="/api/admin/schools/verify" style="display:flex;gap:6px;margin:0;">
                               <input type="hidden" name="school_id" value="${escapeHtml(s.id)}" />
                               <input type="hidden" name="reason" value="Institutional verification by Platform Admin" />
                               <button type="submit" name="status" value="VERIFIED" class="btn btn-primary btn-sm">Approve</button>
                               <button type="submit" name="status" value="SUSPENDED" class="btn btn-danger btn-sm">Suspend</button>
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
        <h3 style="font-size:17px;margin-bottom:10px;">Onboard Approved School</h3>
        <form method="POST" action="/api/admin/schools/create">
          <div class="form-group">
            <label class="form-label">School Name *</label>
            <input type="text" name="name" required class="form-control" placeholder="e.g. SMKN 3 Bandung" />
          </div>
          <div class="form-group">
            <label class="form-label">NPSN *</label>
            <input type="text" name="npsn" required class="form-control" placeholder="8-digit NPSN" />
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select name="type" class="form-control">
                <option value="SMK">SMK</option>
                <option value="SMA">SMA</option>
                <option value="PKBM">PKBM</option>
                <option value="MA">MA</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">City *</label>
              <input type="text" name="city" required class="form-control" value="Bandung" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Province *</label>
            <input type="text" name="province" required class="form-control" value="Jawa Barat" />
          </div>
          <div class="form-group">
            <label class="form-label">Contact Email *</label>
            <input type="email" name="contact_email" required class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Invite Code *</label>
            <input type="text" name="invite_code" required class="form-control" placeholder="e.g. SMKN3-2026" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Create &amp; Verify School</button>
        </form>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'School Management',
    breadcrumb: 'School Management',
    activePath: '/admin/schools',
    user,
    content,
    flashMessage: flash
  });
}

// Page 4 — UMKM Management (/admin/businesses)
export function renderAdminBusinessesPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const businesses = db
    .prepare(
      `SELECT b.*, u.full_name as owner_name, u.email as owner_email
       FROM businesses b
       JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC`
    )
    .all() as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:12px;">UMKM Partner Verification &amp; Governance (${businesses.length})</h3>
      ${
        businesses.length === 0
          ? `<div class="empty-state"><h4>No UMKM accounts registered yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Business Name</th>
                     <th>Owner &amp; Contact</th>
                     <th>Category &amp; City</th>
                     <th>NIB / Reg Note</th>
                     <th>Verification Status</th>
                     <th>Admin Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${businesses
                     .map(
                       (b) => `<tr>
                         <td>
                           <strong>${escapeHtml(b.business_name)}</strong> ${demoBadge(b.is_demo)}
                           <div style="font-size:11.5px;color:var(--brand-muted-gray);">${escapeHtml(b.description)}</div>
                         </td>
                         <td>${escapeHtml(b.owner_name)}<br/><span style="font-size:11.5px;">${escapeHtml(b.contact_email)}</span></td>
                         <td>${escapeHtml(b.category)} &bull; ${escapeHtml(b.city)}</td>
                         <td><code>${escapeHtml(b.nib_or_reg_note || '—')}</code></td>
                         <td>${statusBadge(b.verification_status)}</td>
                         <td>
                           <form method="POST" action="/api/admin/businesses/verify" style="display:flex;gap:6px;margin:0;">
                             <input type="hidden" name="business_id" value="${escapeHtml(b.id)}" />
                             <input type="text" name="reason" required value="Verified UMKM identity and ethical task charter compliance." class="form-control" style="padding:4px 8px;font-size:12px;width:150px;" />
                             <button type="submit" name="status" value="VERIFIED" class="btn btn-primary btn-sm">Verify</button>
                             <button type="submit" name="status" value="REJECTED" class="btn btn-danger btn-sm">Reject</button>
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
    title: 'UMKM Management',
    breadcrumb: 'UMKM Management',
    activePath: '/admin/businesses',
    user,
    content,
    flashMessage: flash
  });
}

// Page 5 — Portfolio Moderation (/admin/portfolios)
export function renderAdminPortfoliosPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const portfolios = db
    .prepare(
      `SELECT p.*, u.full_name as student_name, s.name as school_name
       FROM portfolios p
       JOIN students stu ON stu.id = p.student_id
       JOIN users u ON u.id = stu.user_id
       JOIN schools s ON s.id = p.school_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.created_at DESC`
    )
    .all() as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:12px;">Global Portfolio Moderation (${portfolios.length})</h3>
      ${
        portfolios.length === 0
          ? `<div class="empty-state"><h4>No portfolios in database yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Title</th>
                     <th>Student &amp; School</th>
                     <th>Category</th>
                     <th>Status</th>
                     <th>Moderation Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${portfolios
                     .map(
                       (p) => `<tr>
                         <td><strong>${escapeHtml(p.title)}</strong> ${demoBadge(p.is_demo)}</td>
                         <td>${escapeHtml(p.student_name)} &bull; ${escapeHtml(p.school_name)}</td>
                         <td>${escapeHtml(p.category)}</td>
                         <td>${statusBadge(p.status)}</td>
                         <td>
                           <form method="POST" action="/api/admin/portfolios/moderate" style="display:flex;gap:6px;margin:0;">
                             <input type="hidden" name="portfolio_id" value="${escapeHtml(p.id)}" />
                             <input type="text" name="reason" required value="Platform moderation check" class="form-control" style="padding:4px 8px;font-size:12px;width:150px;" />
                             <button type="submit" name="status" value="Published" class="btn btn-primary btn-sm">Approve/Publish</button>
                             <button type="submit" name="status" value="Rejected" class="btn btn-danger btn-sm">Unpublish/Reject</button>
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
    title: 'Portfolio Moderation',
    breadcrumb: 'Portfolio Moderation',
    activePath: '/admin/portfolios',
    user,
    content,
    flashMessage: flash
  });
}

// Page 6 — Assignment Moderation & Stage 6 Closure (/admin/assignments)
export function renderAdminAssignmentsPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const assignments = db
    .prepare(
      `SELECT a.*, b.business_name, u.full_name as student_name, s.name as school_name
       FROM assignments a
       JOIN businesses b ON b.id = a.business_id
       LEFT JOIN students stu ON stu.id = a.selected_student_id
       LEFT JOIN users u ON u.id = stu.user_id
       LEFT JOIN schools s ON s.id = a.assigned_school_id
       WHERE a.deleted_at IS NULL
       ORDER BY a.updated_at DESC`
    )
    .all() as Array<Record<string, any>>;

  const content = `
    <p style="font-size:14px;margin-top:0;margin-bottom:18px;">
      <strong>Stage 2 &amp; Stage 6 Safety Enforcement:</strong>
      (1) Review and approve new UMKM assignments before publication.
      (2) Confirm compensation &amp; copyright terms to close completed assignments and issue Verified Experience Passport records.
    </p>

    ${
      assignments.length === 0
        ? `<div class="empty-state"><h4>No assignments created yet.</h4></div>`
        : assignments
            .map((a) => {
              return `<div class="card" style="margin-bottom:18px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <div>
                    <h3 style="font-size:17px;margin:0;">${escapeHtml(a.title)} ${demoBadge(a.is_demo)}</h3>
                    <div style="font-size:12.5px;color:var(--brand-muted-gray);">
                      UMKM: <strong>${escapeHtml(a.business_name)}</strong> &bull;
                      Category: ${escapeHtml(a.category)} &bull;
                      Compensation: <strong>${formatIdr(a.compensation_amount_idr)}</strong> &bull;
                      Safety Stage: ${a.current_safety_stage}/6
                    </div>
                  </div>
                  ${statusBadge(a.status)}
                </div>

                <p style="font-size:13.5px;margin:6px 0 12px;">${escapeHtml(a.description)}</p>

                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-top:1px solid var(--border-subtle);padding-top:12px;">
                  <div style="font-size:12.5px;">
                    <strong>Deliverables:</strong> ${escapeHtml(a.deliverables)} |
                    <strong>Max Revisions:</strong> ${a.max_revisions} |
                    <strong>Assigned Student:</strong> ${escapeHtml(a.student_name || 'None yet')}
                  </div>

                  <div>
                    ${
                      ['Draft', 'Submitted for Admin Review'].includes(a.status)
                        ? `<form method="POST" action="/api/admin/assignments/review" style="display:flex;gap:8px;margin:0;">
                             <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                             <input type="text" name="reason" required value="Stage 2 Admin Review: workload, deliverables, revision cap, and compensation verified." class="form-control" style="padding:5px 10px;font-size:12px;width:260px;" />
                             <button type="submit" name="decision" value="PUBLISH" class="btn btn-primary btn-sm">Approve &amp; Publish (Stage 2)</button>
                             <button type="submit" name="decision" value="REJECT" class="btn btn-danger btn-sm">Return to Draft</button>
                           </form>`
                        : ''
                    }
                    ${
                      ['Accepted', 'Rejected', 'School Verification'].includes(a.status)
                        ? `<form method="POST" action="/api/admin/assignments/close" style="display:flex;gap:8px;margin:0;">
                             <input type="hidden" name="assignment_id" value="${escapeHtml(a.id)}" />
                             <input type="text" name="settlement_reference" required value="SETTLED-${escapeHtml(a.id)}" class="form-control" style="padding:5px 10px;font-size:12px;width:180px;" placeholder="Compensation Ref" />
                             <button type="submit" class="btn btn-gold btn-sm">Confirm Compensation, Close &amp; Issue Passport (Stage 6)</button>
                           </form>`
                        : ''
                    }
                  </div>
                </div>
              </div>`;
            })
            .join('')
    }
  `;

  return renderDashboardLayout({
    title: 'Assignment Moderation (Stages 2 & 6)',
    breadcrumb: 'Assignment Moderation',
    activePath: '/admin/assignments',
    user,
    content,
    flashMessage: flash
  });
}

// Page 7 — Safety & Complaints (/admin/safety)
export function renderAdminSafetyPage(user: SessionUser, flash?: string | null): string {
  const db = getDb();
  const complaints = db
    .prepare(
      `SELECT c.*, u.full_name as reporter_name, s.name as school_name
       FROM complaints c
       JOIN users u ON u.id = c.reporter_user_id
       LEFT JOIN schools s ON s.id = c.school_id
       ORDER BY c.created_at DESC`
    )
    .all() as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:12px;">Student Safety &amp; Escalation Desk (${complaints.length})</h3>
      ${
        complaints.length === 0
          ? `<div class="empty-state"><h4>No safety complaints recorded.</h4></div>`
          : complaints
              .map(
                (c) => `<div style="padding:14px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <strong>${escapeHtml(c.subject)}</strong> (${escapeHtml(c.category)} &bull; Severity: ${escapeHtml(c.severity)})
                      <div style="font-size:12px;color:var(--brand-muted-gray);">
                        Reported by: ${escapeHtml(c.reporter_name)} (${escapeHtml(c.reporter_role)}) &bull; School: ${escapeHtml(c.school_name || 'N/A')}
                      </div>
                    </div>
                    ${statusBadge(c.status)}
                  </div>
                  <p style="font-size:13.5px;margin:8px 0;">${escapeHtml(c.description)}</p>
                  ${
                    c.status === 'RESOLVED'
                      ? `<div style="font-size:12.5px;color:#186A42;font-weight:600;">Resolved: ${escapeHtml(c.resolution_notes)}</div>`
                      : `<form method="POST" action="/api/admin/safety/resolve" style="display:flex;gap:8px;margin-top:8px;">
                           <input type="hidden" name="complaint_id" value="${escapeHtml(c.id)}" />
                           <input type="text" name="resolution_notes" required class="form-control" placeholder="Document investigation outcome & resolution..." />
                           <button type="submit" class="btn btn-primary btn-sm">Resolve &amp; Log Audit</button>
                         </form>`
                  }
                </div>`
              )
              .join('')
      }
    </div>
  `;

  return renderDashboardLayout({
    title: 'Safety & Complaints',
    breadcrumb: 'Safety & Complaints',
    activePath: '/admin/safety',
    user,
    content,
    flashMessage: flash
  });
}

// Page 8 — Verification Records (/admin/verifications)
export function renderAdminVerificationsPage(user: SessionUser): string {
  const db = getDb();
  const passports = db
    .prepare(
      `SELECT ep.*, u.full_name as student_name
       FROM experience_passports ep
       JOIN students stu ON stu.id = ep.student_id
       JOIN users u ON u.id = stu.user_id
       ORDER BY ep.issued_at DESC`
    )
    .all() as Array<Record<string, any>>;

  const approvals = db
    .prepare(
      `SELECT ta.*, a.title as assignment_title, u.full_name as student_name
       FROM teacher_approvals ta
       JOIN assignments a ON a.id = ta.assignment_id
       JOIN students stu ON stu.id = ta.student_id
       JOIN users u ON u.id = stu.user_id
       ORDER BY ta.created_at DESC`
    )
    .all() as Array<Record<string, any>>;

  const content = `
    <div class="card" style="margin-bottom:22px;">
      <h3 style="font-size:18px;margin-bottom:12px;">Issued Experience Passport Verification Registry (${passports.length})</h3>
      ${
        passports.length === 0
          ? `<div class="empty-state"><h4>No Experience Passports issued yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Code</th>
                     <th>Student &amp; School</th>
                     <th>Assignment &amp; UMKM</th>
                     <th>Outcome Status</th>
                     <th>Verification Status</th>
                     <th>Public Link</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${passports
                     .map(
                       (p) => `<tr>
                         <td><code>${escapeHtml(p.verification_code)}</code></td>
                         <td><strong>${escapeHtml(p.student_name)}</strong> ${demoBadge(p.is_demo)}<br/><span style="font-size:11.5px;">${escapeHtml(p.school_name)}</span></td>
                         <td>${escapeHtml(p.assignment_title)}<br/><span style="font-size:11.5px;">${escapeHtml(p.business_name)}</span></td>
                         <td>${statusBadge(p.outcome_status)}</td>
                         <td>${statusBadge(p.verification_status)}</td>
                         <td><a href="/verify/${escapeHtml(p.verification_code)}" target="_blank" class="btn btn-secondary btn-sm">Verify &nearr;</a></td>
                       </tr>`
                     )
                     .join('')}
                 </tbody>
               </table>
             </div>`
      }
    </div>

    <div class="card">
      <h3 style="font-size:17px;margin-bottom:12px;">Stage 3 Teacher Approval Records (${approvals.length})</h3>
      ${
        approvals.length === 0
          ? `<p style="font-size:13px;color:var(--brand-muted-gray);">No teacher approvals recorded yet.</p>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Assignment</th>
                     <th>Student</th>
                     <th>Decision</th>
                     <th>Notes</th>
                     <th>Timestamp</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${approvals
                     .map(
                       (ap) => `<tr>
                         <td>${escapeHtml(ap.assignment_title)} ${demoBadge(ap.is_demo)}</td>
                         <td>${escapeHtml(ap.student_name)}</td>
                         <td>${statusBadge(ap.decision)}</td>
                         <td>${escapeHtml(ap.notes)}</td>
                         <td>${escapeHtml(ap.created_at)}</td>
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
    title: 'Verification Records',
    breadcrumb: 'Verification Records',
    activePath: '/admin/verifications',
    user,
    content
  });
}

// Page 9 — Platform Analytics & Labeled Financial Simulation (/admin/analytics)
export function renderAdminAnalyticsPage(user: SessionUser): string {
  const db = getDb();

  // Strictly Production Analytics (is_demo = 0)
  const prodStats = {
    users: (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_demo = 0').get() as { c: number }).c,
    schools: (db.prepare('SELECT COUNT(*) as c FROM schools WHERE is_demo = 0').get() as { c: number }).c,
    portfolios: (db.prepare('SELECT COUNT(*) as c FROM portfolios WHERE is_demo = 0').get() as { c: number }).c,
    assignments: (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE is_demo = 0').get() as { c: number }).c,
    passports: (db.prepare('SELECT COUNT(*) as c FROM experience_passports WHERE is_demo = 0').get() as { c: number }).c
  };

  // Separate Demo Counts (is_demo = 1)
  const demoStats = {
    users: (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_demo = 1').get() as { c: number }).c,
    schools: (db.prepare('SELECT COUNT(*) as c FROM schools WHERE is_demo = 1').get() as { c: number }).c,
    portfolios: (db.prepare('SELECT COUNT(*) as c FROM portfolios WHERE is_demo = 1').get() as { c: number }).c,
    assignments: (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE is_demo = 1').get() as { c: number }).c,
    passports: (db.prepare('SELECT COUNT(*) as c FROM experience_passports WHERE is_demo = 1').get() as { c: number }).c
  };

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <p style="margin:0;font-size:14px;">
        <strong>Data Integrity Guarantee:</strong> Production platform metrics (<code>is_demo = 0</code>) are strictly isolated from synthetic demo records (<code>is_demo = 1</code>).
      </p>
      <a href="/api/reports/export-csv?scope=platform" class="btn btn-primary btn-sm">${icon('download', 14)} Export Production CSV</a>
    </div>

    <div class="grid-2" style="margin-bottom:26px;">
      <div class="card">
        <h3 style="font-size:17px;margin-bottom:12px;">Live Production Platform Metrics (is_demo = 0)</h3>
        <table class="data-table">
          <tbody>
            <tr><td>Production Users</td><td><strong>${prodStats.users}</strong></td></tr>
            <tr><td>Production Schools</td><td><strong>${prodStats.schools}</strong></td></tr>
            <tr><td>Production Portfolios</td><td><strong>${prodStats.portfolios}</strong></td></tr>
            <tr><td>Production Assignments</td><td><strong>${prodStats.assignments}</strong></td></tr>
            <tr><td>Production Experience Passports</td><td><strong>${prodStats.passports}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3 style="font-size:17px;margin-bottom:12px;">Synthetic Demo Dataset Metrics (is_demo = 1 — Isolated)</h3>
        <table class="data-table">
          <tbody>
            <tr><td>Synthetic Demo Users</td><td><strong>${demoStats.users}</strong> ${demoBadge(1)}</td></tr>
            <tr><td>Synthetic Demo Schools</td><td><strong>${demoStats.schools}</strong> ${demoBadge(1)}</td></tr>
            <tr><td>Synthetic Demo Portfolios</td><td><strong>${demoStats.portfolios}</strong> ${demoBadge(1)}</td></tr>
            <tr><td>Synthetic Demo Assignments</td><td><strong>${demoStats.assignments}</strong> ${demoBadge(1)}</td></tr>
            <tr><td>Synthetic Demo Passports</td><td><strong>${demoStats.passports}</strong> ${demoBadge(1)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Financial Reference Assumptions (Strictly Labeled SIMULATION, NOT ACTUAL REVENUE) -->
    <div class="card" style="border:2px solid var(--brand-muted-gold);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
        <div>
          <span class="status-badge badge-warning" style="font-weight:800;">SIMULATION, NOT ACTUAL REVENUE</span>
          <h3 style="font-size:19px;margin:8px 0 2px;">Proposal Financial Model Scenarios (SIMULATION, NOT ACTUAL REVENUE)</h3>
          <p style="font-size:13px;color:var(--brand-muted-gray);margin:0;">
            Reference institutional B2B school subscription assumptions per semester from the SECOND LIFE proposal. These figures are planning simulations and are never presented as actual platform revenue.
          </p>
        </div>
      </div>

      <div class="table-responsive" style="margin-bottom:16px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Scenario (SIMULATION, NOT ACTUAL REVENUE)</th>
              <th>Participating Schools</th>
              <th>Price per School / Semester</th>
              <th>Simulated Gross Revenue</th>
              <th>Variable Cost (Rp1,500,000 / school)</th>
              <th>Fixed Cost / Semester</th>
              <th>Simulated Net Operating Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Conservative Scenario</strong> <span class="demo-record-pill">SIMULATION</span></td>
              <td>3 schools</td>
              <td>Rp3,000,000</td>
              <td>Rp9,000,000</td>
              <td>Rp4,500,000</td>
              <td>Rp12,000,000</td>
              <td style="color:#9E2626;font-weight:700;">-Rp7,500,000 (Pre-Break-Even)</td>
            </tr>
            <tr>
              <td><strong>Base Scenario</strong> <span class="demo-record-pill">SIMULATION</span></td>
              <td>8 schools</td>
              <td>Rp4,000,000</td>
              <td>Rp32,000,000</td>
              <td>Rp12,000,000</td>
              <td>Rp12,000,000</td>
              <td style="color:#186A42;font-weight:700;">+Rp8,000,000 (Surplus)</td>
            </tr>
            <tr>
              <td><strong>Optimistic Scenario</strong> <span class="demo-record-pill">SIMULATION</span></td>
              <td>15 schools</td>
              <td>Rp5,000,000</td>
              <td>Rp75,000,000</td>
              <td>Rp22,500,000</td>
              <td>Rp12,000,000</td>
              <td style="color:#186A42;font-weight:700;">+Rp40,500,000 (Surplus)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid-2" style="background:var(--brand-warm-ivory);padding:14px;border-radius:var(--radius-sm);font-size:13px;">
        <div>
          <strong>Break-Even Analysis at Base Pricing (SIMULATION, NOT ACTUAL REVENUE):</strong><br/>
          At <strong>Rp4,000,000 per school</strong> with Rp1,500,000 variable cost (contribution margin = Rp2,500,000/school) and Rp12,000,000 fixed cost per semester, estimated break-even is <strong>5 schools</strong> (4.8 rounded up).
        </div>
        <div>
          <strong>Price Sensitivity Warning (SIMULATION, NOT ACTUAL REVENUE):</strong><br/>
          If pricing drops to <strong>Rp2,000,000 per school</strong> (contribution margin = Rp500,000/school), estimated break-even rises sharply to <strong>24 schools</strong> per semester.
        </div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'Platform Analytics & Financial Simulation',
    breadcrumb: 'Platform Analytics',
    activePath: '/admin/analytics',
    user,
    content
  });
}

// Page 10 — System Settings (/admin/settings)
export function renderAdminSettingsPage(user: SessionUser, flash?: string | null): string {
  const gsStatus = getGoogleSheetsIntegrationStatus();

  const content = `
    <div class="grid-2">
      <div class="card">
        <h3 style="font-size:18px;margin-bottom:8px;">External Integration Status: Google Sheets / Apps Script</h3>
        <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:14px;">
          Designed with a modular data-access adapter so a low-cost Google Sheets / Google Apps Script mirror can be connected without rebuilding the frontend. SECOND LIFE never claims an external service is connected when credentials are not configured.
        </p>

        <div style="padding:14px;background:var(--brand-warm-ivory);border-radius:var(--radius-sm);margin-bottom:16px;font-size:13.5px;">
          <div style="margin-bottom:8px;">
            <strong>Provider:</strong> ${escapeHtml(gsStatus.provider)}
          </div>
          <div style="margin-bottom:8px;">
            <strong>Live Connection Status:</strong>
            ${
              gsStatus.configured
                ? statusBadge('CONNECTED_READY')
                : statusBadge('NOT_CONFIGURED (Using Relational SQL Database)')
            }
          </div>
          <div><strong>Webhook URL:</strong> <code>${escapeHtml(gsStatus.webhookUrlMasked || 'Not Set in .env')}</code></div>
          <div><strong>Spreadsheet ID:</strong> <code>${escapeHtml(gsStatus.spreadsheetIdMasked || 'Not Set in .env')}</code></div>
        </div>

        <h4 style="font-size:14px;margin-bottom:8px;">Setup Instructions</h4>
        <ul style="padding-left:18px;font-size:13px;margin:0;">
          ${gsStatus.setupInstructions.map((s) => `<li style="margin-bottom:6px;">${escapeHtml(s)}</li>`).join('')}
        </ul>
      </div>

      <div class="card">
        <h3 style="font-size:18px;margin-bottom:8px;">Synthetic Demo Data Management</h3>
        <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:16px;">
          Current Mode: <strong>${isDemoMode() ? 'DEMO DATA ENABLED' : 'PRODUCTION DATA ONLY'}</strong>.
          Demo records carry <code>is_demo = 1</code> and can be seeded or completely purged at any time.
        </p>
        <div style="display:flex;gap:10px;">
          <form method="POST" action="/api/system/demo-mode">
            <input type="hidden" name="action" value="enable_and_seed" />
            <button type="submit" class="btn btn-gold">Seed / Reset Labeled Demo Dataset</button>
          </form>
          <form method="POST" action="/api/system/demo-mode">
            <input type="hidden" name="action" value="disable_and_clear" />
            <button type="submit" class="btn btn-danger">Purge All Demo Records</button>
          </form>
        </div>
      </div>
    </div>
  `;

  return renderDashboardLayout({
    title: 'System Settings & Integrations',
    breadcrumb: 'System Settings',
    activePath: '/admin/settings',
    user,
    content,
    flashMessage: flash
  });
}

// Page 11 — Audit Logs (/admin/audit-logs)
export function renderAdminAuditLogsPage(user: SessionUser): string {
  const db = getDb();
  const logs = db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200')
    .all() as Array<Record<string, any>>;

  const content = `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;">Immutable Platform Audit Logs (${logs.length})</h3>
      <p style="font-size:13px;color:var(--brand-muted-gray);margin-bottom:16px;">
        Every administrative and workflow transition is recorded with Actor, Role, Action, Target Record, Previous State, New State, Reason, and Timestamp.
      </p>

      ${
        logs.length === 0
          ? `<div class="empty-state"><h4>No audit log entries recorded yet.</h4></div>`
          : `<div class="table-responsive">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Timestamp</th>
                     <th>Actor &amp; Role</th>
                     <th>Action</th>
                     <th>Target Record</th>
                     <th>State Transition</th>
                     <th>Reason</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${logs
                     .map(
                       (l) => `<tr>
                         <td style="white-space:nowrap;">${escapeHtml(l.created_at)}</td>
                         <td>
                           <strong>${escapeHtml(l.actor_name)}</strong> ${demoBadge(l.is_demo)}
                           <div style="font-size:11px;color:var(--brand-muted-gray);">${escapeHtml(l.actor_role)}</div>
                         </td>
                         <td><code>${escapeHtml(l.action)}</code></td>
                         <td>${escapeHtml(l.target_entity)}: <code>${escapeHtml(l.target_id)}</code></td>
                         <td>
                           <span style="color:var(--brand-muted-gray);">${escapeHtml(l.previous_state || '—')}</span>
                           &rarr;
                           <strong>${escapeHtml(l.new_state || '—')}</strong>
                         </td>
                         <td style="font-size:12.5px;">${escapeHtml(l.reason || '—')}</td>
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
    title: 'Audit Logs',
    breadcrumb: 'Audit Logs',
    activePath: '/admin/audit-logs',
    user,
    content
  });
}
