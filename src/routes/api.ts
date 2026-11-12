// ============================================================================
// SECOND LIFE — Backend API & Form Action Controllers (SHOW -> TRY -> VERIFY)
// ============================================================================

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  clearLabeledDemoData,
  getDb,
  getUploadStorageDir,
  hashPassword,
  isDemoMode,
  seedLabeledDemoData,
  setDemoMode,
  verifyPassword
} from '../lib/db.ts';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getDashboardHomeForRole,
  getSessionUser,
  parseCookies,
  setSessionCookie
} from '../lib/auth.ts';
import { createNotification, recordAuditLog } from '../lib/audit.ts';
import {
  canTransitionAssignment,
  canTransitionPortfolio,
  evaluatePassportEligibility,
  getSafetyStageForAssignmentStatus
} from '../lib/status-engine.ts';
import type { AssignmentStatus, PortfolioStatus } from '../types/domain.ts';

export async function parseRequestBody(req: IncomingMessage): Promise<{
  fields: Record<string, string>;
  uploadedFile?: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    buffer: Buffer;
    ext: string;
  };
}> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawBuffer = Buffer.concat(chunks);
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(rawBuffer.toString('utf-8'));
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        fields[k] = String(v ?? '');
      }
      return { fields };
    } catch {
      return { fields: {} };
    }
  }

  if (contentType.includes('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : '';
    const fields: Record<string, string> = {};
    let uploadedFile:
      | { originalName: string; mimeType: string; sizeBytes: number; buffer: Buffer; ext: string }
      | undefined;

    if (boundary) {
      const rawStr = rawBuffer.toString('latin1');
      const parts = rawStr.split(`--${boundary}`);
      for (const part of parts) {
        if (!part || part === '--\r\n' || part === '--') continue;
        const headerEndIdx = part.indexOf('\r\n\r\n');
        if (headerEndIdx === -1) continue;
        const headerSection = part.slice(0, headerEndIdx);
        let bodySection = part.slice(headerEndIdx + 4);
        if (bodySection.endsWith('\r\n')) {
          bodySection = bodySection.slice(0, -2);
        }

        const nameMatch = headerSection.match(/name="([^"]+)"/i);
        const filenameMatch = headerSection.match(/filename="([^"]*)"/i);
        if (!nameMatch) continue;
        const fieldName = nameMatch[1];

        if (filenameMatch && filenameMatch[1]) {
          const origName = Buffer.from(filenameMatch[1], 'latin1').toString('utf-8');
          const mimeMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
          const mimeType = mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream';
          const fileBuf = Buffer.from(bodySection, 'latin1');
          if (fileBuf.length > 0) {
            const ext = path.extname(origName).replace('.', '').toUpperCase() || 'PDF';
            uploadedFile = {
              originalName: origName,
              mimeType,
              sizeBytes: fileBuf.length,
              buffer: fileBuf,
              ext
            };
          }
        } else {
          fields[fieldName] = Buffer.from(bodySection, 'latin1').toString('utf-8').trim();
        }
      }
    }
    return { fields, uploadedFile };
  }

  // Default: application/x-www-form-urlencoded
  const params = new URLSearchParams(rawBuffer.toString('utf-8'));
  const fields: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    fields[k] = v.trim();
  }
  return { fields };
}

function redirectWithFlash(
  res: ServerResponse,
  location: string,
  flashMessage?: string,
  flashType: 'success' | 'error' | 'info' = 'success'
): void {
  const sep = location.includes('?') ? '&' : '?';
  const target = flashMessage
    ? `${location}${sep}flash=${encodeURIComponent(flashMessage)}&flashType=${flashType}`
    : location;
  res.writeHead(303, { Location: target });
  res.end();
}

const ALLOWED_FILE_EXTENSIONS = ['JPG', 'JPEG', 'PNG', 'PDF', 'MP4'];
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

function validateAndStoreFile(
  fallbackFileName: string,
  uploadedFile?: { originalName: string; mimeType: string; sizeBytes: number; buffer: Buffer; ext: string }
): { fileName: string; fileType: string; mimeType: string; sizeBytes: number; storageKey: string } {
  const fileName = uploadedFile?.originalName || fallbackFileName || 'project-document.pdf';
  const rawExt = path.extname(fileName).replace('.', '').toUpperCase() || 'PDF';
  if (!ALLOWED_FILE_EXTENSIONS.includes(rawExt)) {
    throw new Error(`Unsupported file format (${rawExt}). Allowed formats: JPG, JPEG, PNG, PDF, MP4.`);
  }
  const sizeBytes = uploadedFile ? uploadedFile.sizeBytes : 245760;
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error('File exceeds the 25MB maximum upload limit.');
  }

  const storageDir = getUploadStorageDir();

  const safeKey = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fullPath = path.join(storageDir, safeKey);

  if (uploadedFile && uploadedFile.buffer.length > 0) {
    fs.writeFileSync(fullPath, uploadedFile.buffer);
  } else {
    fs.writeFileSync(
      fullPath,
      `SECOND LIFE Protected Deliverable / Portfolio File\nFile: ${fileName}\nRecorded At: ${new Date().toISOString()}\n`
    );
  }

  const mimeMap: Record<string, string> = {
    JPG: 'image/jpeg',
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    PDF: 'application/pdf',
    MP4: 'video/mp4'
  };

  return {
    fileName,
    fileType: rawExt,
    mimeType: uploadedFile?.mimeType || mimeMap[rawExt] || 'application/octet-stream',
    sizeBytes,
    storageKey: safeKey
  };
}

export async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  const db = getDb();
  const session = getSessionUser(req);
  const user = session?.user || null;

  // --------------------------------------------------------------------------
  // 1. DEMO DATA MODE SWITCHER
  // --------------------------------------------------------------------------
  if (pathname === '/api/system/demo-mode' && req.method === 'POST') {
    const { fields } = await parseRequestBody(req);
    const referer = req.headers.referer || '/';
    if (fields.action === 'enable_and_seed') {
      setDemoMode(true);
      seedLabeledDemoData();
      redirectWithFlash(res, referer, 'Labeled Demo Dataset enabled and seeded (strictly separated from production metrics).', 'info');
      return true;
    } else {
      setDemoMode(false);
      clearLabeledDemoData();
      redirectWithFlash(res, referer, 'Demo Data purged. Running in strict Production Data Only mode.', 'success');
      return true;
    }
  }

  // --------------------------------------------------------------------------
  // 2. AUTHENTICATION ENDPOINTS
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const { fields } = await parseRequestBody(req);
    const email = (fields.email || '').toLowerCase().trim();
    const password = fields.password || '';

    const row = db
      .prepare('SELECT * FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL')
      .get(email) as Record<string, any> | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.writeHead(303, { Location: `/login?error=${encodeURIComponent('Invalid email or password.')}` });
      res.end();
      return true;
    }
    if (row.status === 'SUSPENDED') {
      res.writeHead(303, { Location: `/login?error=${encodeURIComponent('This account has been suspended by a Platform Administrator.')}` });
      res.end();
      return true;
    }

    db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(row.id);
    if (row.is_demo === 1) {
      setDemoMode(true);
    }

    const { token } = createSession(row.id);
    setSessionCookie(res, token);

    recordAuditLog({
      actorUserId: row.id,
      actorName: row.full_name,
      actorRole: row.role_id,
      action: 'USER_LOGIN',
      targetEntity: 'users',
      targetId: row.id,
      previousState: 'LOGGED_OUT',
      newState: 'AUTHENTICATED',
      reason: 'Standard credential login',
      isDemo: row.is_demo
    });

    const dest = fields.redirect && fields.redirect.startsWith('/')
      ? fields.redirect
      : getDashboardHomeForRole(row.role_id);
    res.writeHead(303, { Location: dest });
    res.end();
    return true;
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const cookies = parseCookies(req);
    if (cookies['sl_session']) {
      destroySession(cookies['sl_session']);
    }
    clearSessionCookie(res);
    res.writeHead(303, { Location: '/login' });
    res.end();
    return true;
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const { fields } = await parseRequestBody(req);
    const role = fields.role || 'STUDENT';
    const fullName = fields.full_name || '';
    const email = (fields.email || '').toLowerCase().trim();
    const password = fields.password || '';

    if (!fullName || !email || password.length < 8) {
      res.writeHead(303, { Location: `/register?error=${encodeURIComponent('Full name, valid email, and password (min 8 chars) are required.')}` });
      res.end();
      return true;
    }

    if (role === 'PLATFORM_ADMIN') {
      res.writeHead(303, { Location: `/register?error=${encodeURIComponent('Platform Administrator accounts cannot be self-registered.')}` });
      res.end();
      return true;
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
    if (existing) {
      res.writeHead(303, { Location: `/register?error=${encodeURIComponent('An account with this email already exists.')}` });
      res.end();
      return true;
    }

    const userId = 'usr-' + crypto.randomUUID().slice(0, 10);
    const pwHash = hashPassword(password);

    if (role === 'STUDENT') {
      const inviteCode = (fields.school_invite_code || '').trim();
      const school = db
        .prepare(`SELECT * FROM schools WHERE invite_code = ? AND verification_status = 'VERIFIED'`)
        .get(inviteCode) as Record<string, any> | undefined;

      if (!school) {
        res.writeHead(303, {
          Location: `/register?error=${encodeURIComponent('Student registration requires a valid, verified School Invite Code.')}`
        });
        res.end();
        return true;
      }

      const defaultTeacher = db
        .prepare('SELECT id FROM teachers WHERE school_id = ? LIMIT 1')
        .get(school.id) as { id: string } | undefined;

      const stuId = 'stu-' + crypto.randomUUID().slice(0, 10);
      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, role_id, school_id, status, is_demo)
         VALUES (?, ?, ?, ?, 'STUDENT', ?, 'ACTIVE', ?)`
      ).run(userId, email, pwHash, fullName, school.id, school.is_demo);

      db.prepare(
        `INSERT INTO students (
           id, user_id, school_id, mentor_teacher_id, nisn, grade, major, skills_json,
           guardian_name, guardian_relationship, identity_verified, is_demo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Parent', 0, ?)`
      ).run(
        stuId,
        userId,
        school.id,
        defaultTeacher?.id || null,
        fields.nisn || 'NISN-PENDING',
        fields.grade || 'Grade 11 (XI)',
        fields.major || 'General Studies',
        JSON.stringify(['Graphic Design', 'Writing']),
        fields.guardian_name || 'Guardian',
        school.is_demo
      );
    } else if (role === 'MENTOR') {
      const inviteCode = (fields.mentor_school_code || '').trim();
      const school = db
        .prepare(`SELECT * FROM schools WHERE invite_code = ? AND verification_status = 'VERIFIED'`)
        .get(inviteCode) as Record<string, any> | undefined;

      if (!school) {
        res.writeHead(303, {
          Location: `/register?error=${encodeURIComponent('Teacher registration requires a verified School Invite Code.')}`
        });
        res.end();
        return true;
      }

      const tchId = 'tch-' + crypto.randomUUID().slice(0, 10);
      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, role_id, school_id, status, is_demo)
         VALUES (?, ?, ?, ?, 'MENTOR', ?, 'ACTIVE', ?)`
      ).run(userId, email, pwHash, fullName, school.id, school.is_demo);

      db.prepare(
        `INSERT INTO teachers (id, user_id, school_id, subject_specialty, verification_status, is_demo)
         VALUES (?, ?, ?, ?, 'VERIFIED', ?)`
      ).run(tchId, userId, school.id, fields.subject_specialty || 'Vocational Supervision', school.is_demo);
    } else if (role === 'UMKM') {
      const bizId = 'biz-' + crypto.randomUUID().slice(0, 10);
      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, role_id, school_id, status, is_demo)
         VALUES (?, ?, ?, ?, 'UMKM', NULL, 'ACTIVE', 0)`
      ).run(userId, email, pwHash, fullName);

      db.prepare(
        `INSERT INTO businesses (
           id, user_id, business_name, category, description, contact_email, city, verification_status, is_demo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)`
      ).run(
        bizId,
        userId,
        fields.business_name || fullName,
        fields.business_category || 'Small Business',
        fields.business_description || 'UMKM Partner',
        email,
        fields.business_city || 'Indonesia'
      );
    } else if (role === 'SCHOOL_ADMIN') {
      const schId = 'sch-' + crypto.randomUUID().slice(0, 10);
      const inviteCode = 'SCH-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      db.prepare(
        `INSERT INTO schools (
           id, name, npsn, type, city, province, contact_email, principal_name,
           verification_status, invite_code, is_demo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 0)`
      ).run(
        schId,
        fields.school_name || 'New Participating School',
        fields.npsn || ('NPSN-' + Date.now().toString().slice(-6)),
        fields.school_type || 'SMK',
        fields.school_city || 'Bandung',
        fields.school_province || 'Jawa Barat',
        email,
        fullName,
        inviteCode
      );

      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, role_id, school_id, status, is_demo)
         VALUES (?, ?, ?, ?, 'SCHOOL_ADMIN', ?, 'ACTIVE', 0)`
      ).run(userId, email, pwHash, fullName, schId);
    }

    const { token } = createSession(userId);
    setSessionCookie(res, token);
    recordAuditLog({
      actorUserId: userId,
      actorName: fullName,
      actorRole: role,
      action: 'REGISTER_ACCOUNT',
      targetEntity: 'users',
      targetId: userId,
      previousState: 'NONE',
      newState: 'ACTIVE',
      reason: `Registered as ${role}`
    });

    res.writeHead(303, { Location: getDashboardHomeForRole(role as any) });
    res.end();
    return true;
  }

  if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
    const { fields } = await parseRequestBody(req);
    recordAuditLog({
      actorUserId: null,
      actorName: fields.email || 'Anonymous',
      actorRole: 'PUBLIC',
      action: 'PASSWORD_RESET_REQUEST',
      targetEntity: 'users',
      targetId: fields.email || 'unknown',
      previousState: 'ACTIVE',
      newState: 'RESET_REQUESTED',
      reason: fields.verification_note || 'User requested password reset'
    });
    res.writeHead(303, {
      Location: `/forgot-password?msg=${encodeURIComponent('Password reset request logged for school/administrator verification.')}`
    });
    res.end();
    return true;
  }

  // --------------------------------------------------------------------------
  // 3. CONTROLLED FILE DOWNLOADS & CSV REPORTS
  // --------------------------------------------------------------------------
  if (pathname === '/api/files/download' && req.method === 'GET') {
    const type = searchParams.get('type');
    const id = searchParams.get('id') || '';

    if (type === 'portfolio') {
      const fileRec = db
        .prepare(
          `SELECT pf.*, p.status, p.display_permission, p.school_display_authorized, p.student_id, p.school_id
           FROM portfolio_files pf
           JOIN portfolios p ON p.id = pf.portfolio_id
           WHERE pf.id = ?`
        )
        .get(id) as Record<string, any> | undefined;

      if (!fileRec) {
        res.writeHead(404);
        res.end('File not found');
        return true;
      }

      const isPubliclyAuthorized =
        ['Verified', 'Published'].includes(fileRec.status) &&
        fileRec.display_permission === 1 &&
        fileRec.school_display_authorized === 1;

      const isAuthorizedInternal =
        user &&
        (user.role === 'PLATFORM_ADMIN' ||
          user.student_id === fileRec.student_id ||
          (user.school_id && user.school_id === fileRec.school_id));

      if (!isPubliclyAuthorized && !isAuthorizedInternal) {
        res.writeHead(403);
        res.end('403 Forbidden: This portfolio file is private and not authorized for public download.');
        return true;
      }

      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileRec.file_name}.txt"`
      });
      res.end(
        `SECOND LIFE — Verified Portfolio File Attachment\nFile Name: ${fileRec.file_name}\nFormat: ${fileRec.file_type}\nSummary: ${fileRec.preview_summary || ''}\n`
      );
      return true;
    }

    if (type === 'submission') {
      if (!user) {
        res.writeHead(403);
        res.end('403 Forbidden: Authentication required to download assignment deliverables.');
        return true;
      }
      const ver = db
        .prepare(
          `SELECT sv.*, a.business_id, a.selected_student_id, a.assigned_school_id
           FROM submission_versions sv
           JOIN assignments a ON a.id = sv.assignment_id
           WHERE sv.id = ?`
        )
        .get(id) as Record<string, any> | undefined;

      if (!ver) {
        res.writeHead(404);
        res.end('Submission version not found');
        return true;
      }

      const canAccess =
        user.role === 'PLATFORM_ADMIN' ||
        user.student_id === ver.selected_student_id ||
        user.business_id === ver.business_id ||
        (user.school_id && user.school_id === ver.assigned_school_id);

      if (!canAccess) {
        res.writeHead(403);
        res.end('403 Forbidden: You are not authorized to download this student deliverable.');
        return true;
      }

      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${ver.file_name}.txt"`
      });
      res.end(
        `SECOND LIFE — Supervised Assignment Deliverable\nVersion: v${ver.version_number}\nFile: ${ver.file_name}\nSummary: ${ver.deliverable_summary}\nNotes: ${ver.submission_notes}\n`
      );
      return true;
    }
  }

  if (pathname === '/api/reports/export-csv' && req.method === 'GET') {
    if (!user || !['MENTOR', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
      res.writeHead(403);
      res.end('403 Forbidden');
      return true;
    }

    const scope = searchParams.get('scope') || 'school';
    let rows: Array<Record<string, any>> = [];
    if (scope === 'platform' && user.role === 'PLATFORM_ADMIN') {
      rows = db
        .prepare(
          `SELECT verification_code, assignment_title, business_name, school_name, completion_date, outcome_status, verification_status, is_demo
           FROM experience_passports ORDER BY issued_at DESC`
        )
        .all() as Array<Record<string, any>>;
    } else {
      rows = db
        .prepare(
          `SELECT verification_code, assignment_title, business_name, school_name, completion_date, outcome_status, verification_status, is_demo
           FROM experience_passports WHERE school_id = ? ORDER BY issued_at DESC`
        )
        .all(user.school_id || '') as Array<Record<string, any>>;
    }

    const csvLines = [
      'verification_code,assignment_title,business_name,school_name,completion_date,outcome_status,verification_status,is_demo'
    ];
    for (const r of rows) {
      csvLines.push(
        [
          r.verification_code,
          `"${String(r.assignment_title).replace(/"/g, '""')}"`,
          `"${String(r.business_name).replace(/"/g, '""')}"`,
          `"${String(r.school_name).replace(/"/g, '""')}"`,
          r.completion_date,
          r.outcome_status,
          r.verification_status,
          r.is_demo
        ].join(',')
      );
    }

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="second-life-${scope}-report.csv"`
    });
    res.end(csvLines.join('\n'));
    return true;
  }

  // --------------------------------------------------------------------------
  // 4. STUDENT ACTIONS (/api/student/*)
  // --------------------------------------------------------------------------
  if (pathname.startsWith('/api/student/')) {
    if (!user || user.role !== 'STUDENT' || !user.student_id) {
      res.writeHead(403);
      res.end('403 Forbidden: Student role required.');
      return true;
    }

    if (pathname === '/api/student/portfolio/create' && req.method === 'POST') {
      const { fields, uploadedFile } = await parseRequestBody(req);
      const countRow = db
        .prepare('SELECT COUNT(*) as c FROM portfolios WHERE student_id = ? AND deleted_at IS NULL')
        .get(user.student_id) as { c: number };

      if (countRow.c >= 3) {
        redirectWithFlash(res, '/student/portfolio', 'Maximum of 3 school portfolios reached.', 'error');
        return true;
      }

      if (!fields.title || !fields.description || !fields.student_contribution) {
        redirectWithFlash(res, '/student/portfolio', 'Title, description, and student contribution are required.', 'error');
        return true;
      }

      try {
        const stored = validateAndStoreFile(fields.file_name || 'school-work.pdf', uploadedFile);
        const portfolioId = 'prt-' + crypto.randomUUID().slice(0, 10);
        const initialStatus: PortfolioStatus = fields.submit_immediately === '1' ? 'Submitted' : 'Draft';
        const skillsArr = (fields.skills || 'Graphic Design')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        db.prepare(
          `INSERT INTO portfolios (
             id, student_id, school_id, title, description, category, skills_json,
             creation_date, student_contribution, is_collaborative, project_origin,
             display_permission, school_display_authorized, copyright_declaration, status, is_demo
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
        ).run(
          portfolioId,
          user.student_id,
          user.school_id,
          fields.title,
          fields.description,
          fields.category || 'Graphic Design',
          JSON.stringify(skillsArr),
          fields.creation_date || '2026-10-01',
          fields.student_contribution,
          fields.is_collaborative === '1' ? 1 : 0,
          fields.project_origin || 'School Assignment',
          fields.display_permission === '1' ? 1 : 0,
          fields.copyright_declaration === '1' ? 1 : 0,
          initialStatus,
          user.is_demo
        );

        db.prepare(
          `INSERT INTO portfolio_files (
             id, portfolio_id, file_name, file_type, mime_type, file_size_bytes, storage_key, preview_summary, is_demo
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          'pfile-' + crypto.randomUUID().slice(0, 10),
          portfolioId,
          stored.fileName,
          stored.fileType,
          stored.mimeType,
          stored.sizeBytes,
          stored.storageKey,
          fields.preview_summary || 'Portfolio supporting file',
          user.is_demo
        );

        recordAuditLog({
          actorUserId: user.id,
          actorName: user.full_name,
          actorRole: 'STUDENT',
          action: 'CREATE_PORTFOLIO',
          targetEntity: 'portfolios',
          targetId: portfolioId,
          previousState: 'NONE',
          newState: initialStatus,
          reason: `Created portfolio: ${fields.title}`
        });

        redirectWithFlash(res, '/student/portfolio', `Portfolio "${fields.title}" saved with status: ${initialStatus}.`, 'success');
        return true;
      } catch (err: any) {
        redirectWithFlash(res, '/student/portfolio', err.message || 'Upload error', 'error');
        return true;
      }
    }

    if (pathname === '/api/student/portfolio/status' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const p = db
        .prepare('SELECT * FROM portfolios WHERE id = ? AND student_id = ? AND deleted_at IS NULL')
        .get(fields.portfolio_id, user.student_id) as Record<string, any> | undefined;

      if (!p) {
        res.writeHead(403);
        res.end('403 Forbidden: Cannot modify another student portfolio.');
        return true;
      }

      const nextStatus = fields.next_status as PortfolioStatus;
      // Students can NEVER self-verify!
      if (nextStatus === 'Verified') {
        res.writeHead(403);
        res.end('403 Forbidden: Students cannot self-verify portfolios.');
        return true;
      }
      if (!canTransitionPortfolio(p.status as PortfolioStatus, nextStatus)) {
        redirectWithFlash(res, '/student/portfolio', `Invalid portfolio transition from ${p.status} to ${nextStatus}.`, 'error');
        return true;
      }

      db.prepare(`UPDATE portfolios SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(nextStatus, p.id);
      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'STUDENT',
        action: 'TRANSITION_PORTFOLIO_STATUS',
        targetEntity: 'portfolios',
        targetId: p.id,
        previousState: p.status,
        newState: nextStatus
      });

      redirectWithFlash(res, '/student/portfolio', `Portfolio status updated to ${nextStatus}.`, 'success');
      return true;
    }

    if (pathname === '/api/student/portfolio/update' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const p = db
        .prepare('SELECT * FROM portfolios WHERE id = ? AND student_id = ? AND deleted_at IS NULL')
        .get(fields.portfolio_id, user.student_id) as Record<string, any> | undefined;

      if (!p) {
        res.writeHead(403);
        res.end('403 Forbidden: Cannot modify another student portfolio.');
        return true;
      }

      const nextStatus = fields.resubmit === '1' && ['Draft', 'Rejected'].includes(p.status) ? 'Submitted' : p.status;
      const skillsArr = (fields.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      db.prepare(
        `UPDATE portfolios
         SET title = ?, description = ?, skills_json = ?, student_contribution = ?,
             display_permission = ?, status = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        fields.title || p.title,
        fields.description || p.description,
        skillsArr.length > 0 ? JSON.stringify(skillsArr) : p.skills_json,
        fields.student_contribution || p.student_contribution,
        fields.display_permission === '1' ? 1 : 0,
        nextStatus,
        p.id
      );

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'STUDENT',
        action: 'UPDATE_PORTFOLIO',
        targetEntity: 'portfolios',
        targetId: p.id,
        previousState: p.status,
        newState: nextStatus,
        reason: fields.resubmit === '1' ? 'Edited and resubmitted for school verification' : 'Updated portfolio metadata'
      });

      redirectWithFlash(res, `/student/portfolio/${p.id}`, 'Portfolio updated successfully.', 'success');
      return true;
    }

    if (pathname === '/api/student/portfolio/delete' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const p = db
        .prepare(`SELECT * FROM portfolios WHERE id = ? AND student_id = ? AND status = 'Draft'`)
        .get(fields.portfolio_id, user.student_id) as Record<string, any> | undefined;

      if (!p) {
        redirectWithFlash(res, '/student/portfolio', 'Only your own Draft portfolios can be deleted.', 'error');
        return true;
      }

      db.prepare(`UPDATE portfolios SET deleted_at = datetime('now') WHERE id = ?`).run(p.id);
      redirectWithFlash(res, '/student/portfolio', 'Draft portfolio deleted.', 'success');
      return true;
    }

    if (pathname === '/api/student/opportunities/apply' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare(`SELECT * FROM assignments WHERE id = ? AND status = 'Published' AND deleted_at IS NULL`)
        .get(fields.assignment_id) as Record<string, any> | undefined;

      if (!asg) {
        redirectWithFlash(res, '/student/opportunities', 'Assignment is not open for applications.', 'error');
        return true;
      }

      const verifiedPortfolio = db
        .prepare(`SELECT * FROM portfolios WHERE id = ? AND student_id = ? AND status IN ('Verified', 'Published')`)
        .get(fields.portfolio_id, user.student_id) as Record<string, any> | undefined;

      if (!verifiedPortfolio) {
        redirectWithFlash(res, `/student/opportunities/${asg.id}`, 'A school-verified portfolio is required to apply.', 'error');
        return true;
      }

      const appId = 'app-' + crypto.randomUUID().slice(0, 10);
      db.prepare(
        `INSERT OR REPLACE INTO assignment_applications (
           id, assignment_id, student_id, portfolio_id, motivation_note,
           student_voluntary_confirm, schedule_compatibility_confirm, status, is_demo
         ) VALUES (?, ?, ?, ?, ?, 1, 1, 'APPLIED', ?)`
      ).run(appId, asg.id, user.student_id, verifiedPortfolio.id, fields.motivation_note || 'Applied with verified portfolio', user.is_demo);

      // Record initial Guardian Consent entry for Stage 3
      const gcExists = db
        .prepare('SELECT id FROM guardian_consents WHERE assignment_id = ? AND student_id = ?')
        .get(asg.id, user.student_id);
      if (!gcExists) {
        db.prepare(
          `INSERT INTO guardian_consents (
             id, assignment_id, student_id, guardian_name, guardian_relationship,
             consent_statement, consent_status, consented_at, is_demo
           ) VALUES (?, ?, ?, ?, 'Parent/Guardian', 'Voluntary student participation under school supervision.', 'APPROVED', datetime('now'), ?)`
        ).run(
          'gcn-' + crypto.randomUUID().slice(0, 10),
          asg.id,
          user.student_id,
          fields.guardian_name || 'Parent / Guardian',
          user.is_demo
        );
      }

      const bizOwner = db
        .prepare('SELECT user_id FROM businesses WHERE id = ?')
        .get(asg.business_id) as { user_id: string } | undefined;
      if (bizOwner) {
        createNotification({
          userId: bizOwner.user_id,
          eventType: 'APPLICATION_RECEIVED',
          title: 'New Student Application Received',
          message: `${user.full_name} applied to "${asg.title}" with a school-verified portfolio.`,
          linkUrl: `/business/assignments/${asg.id}`,
          isDemo: user.is_demo
        });
      }

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'STUDENT',
        action: 'APPLY_TO_ASSIGNMENT',
        targetEntity: 'assignments',
        targetId: asg.id,
        previousState: asg.status,
        newState: 'APPLIED',
        reason: `Applied using verified portfolio ${verifiedPortfolio.id}`
      });

      redirectWithFlash(res, `/student/opportunities/${asg.id}`, 'Voluntary application submitted! Waiting for UMKM selection and Teacher approval.', 'success');
      return true;
    }

    if (pathname === '/api/student/assignments/guardian-consent' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      db.prepare(
        `INSERT OR REPLACE INTO guardian_consents (
           id, assignment_id, student_id, guardian_name, guardian_relationship,
           consent_statement, consent_status, consented_at, is_demo
         ) VALUES (?, ?, ?, ?, 'Parent/Guardian', ?, 'APPROVED', datetime('now'), ?)`
      ).run(
        'gcn-' + crypto.randomUUID().slice(0, 10),
        fields.assignment_id,
        user.student_id,
        fields.guardian_name || 'Parent / Guardian',
        fields.consent_statement || 'Signed guardian consent',
        user.is_demo
      );

      const asg = db.prepare('SELECT * FROM assignments WHERE id = ?').get(fields.assignment_id) as Record<string, any> | undefined;
      if (asg && asg.status === 'Guardian Consent Pending') {
        db.prepare(`UPDATE assignments SET status = 'Ready to Start', updated_at = datetime('now') WHERE id = ?`).run(asg.id);
      }

      redirectWithFlash(res, `/student/assignments/${fields.assignment_id}`, 'Guardian consent recorded.', 'success');
      return true;
    }

    if (pathname === '/api/student/assignments/start' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare('SELECT * FROM assignments WHERE id = ? AND selected_student_id = ?')
        .get(fields.assignment_id, user.student_id) as Record<string, any> | undefined;

      if (!asg || asg.status !== 'Ready to Start') {
        res.writeHead(403);
        res.end('403 Forbidden: Assignment cannot be started until Teacher Approval and Guardian Consent are complete.');
        return true;
      }

      const nextStage = getSafetyStageForAssignmentStatus('In Progress');
      db.prepare(
        `UPDATE assignments SET status = 'In Progress', current_safety_stage = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(nextStage, asg.id);

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'STUDENT',
        action: 'START_SUPERVISED_ASSIGNMENT',
        targetEntity: 'assignments',
        targetId: asg.id,
        previousState: 'Ready to Start',
        newState: 'In Progress'
      });

      redirectWithFlash(res, `/student/assignments/${asg.id}`, 'Assignment is now In Progress under Stage 4 Teacher Supervision.', 'success');
      return true;
    }

    if (pathname === '/api/student/assignments/progress' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare('SELECT * FROM assignments WHERE id = ? AND selected_student_id = ?')
        .get(fields.assignment_id, user.student_id) as Record<string, any> | undefined;

      if (!asg) {
        res.writeHead(403);
        res.end('403 Forbidden');
        return true;
      }

      db.prepare(
        `INSERT INTO assignment_progress (
           id, assignment_id, actor_user_id, actor_role, milestone_title, progress_note, progress_percent, is_demo
         ) VALUES (?, ?, ?, 'STUDENT', ?, ?, ?, ?)`
      ).run(
        'prg-' + crypto.randomUUID().slice(0, 10),
        asg.id,
        user.id,
        fields.milestone_title || 'Progress Update',
        fields.progress_note || 'Working on deliverables',
        Number(fields.progress_percent || 50),
        user.is_demo
      );

      redirectWithFlash(res, `/student/assignments/${asg.id}`, 'Supervised progress update logged.', 'success');
      return true;
    }

    if (pathname === '/api/student/assignments/submit' && req.method === 'POST') {
      const { fields, uploadedFile } = await parseRequestBody(req);
      const asg = db
        .prepare('SELECT * FROM assignments WHERE id = ? AND selected_student_id = ?')
        .get(fields.assignment_id, user.student_id) as Record<string, any> | undefined;

      // Strict Status Engine Rule: Student cannot submit before assignment starts or without required approvals!
      if (!asg || !['In Progress', 'Revision Requested'].includes(asg.status)) {
        res.writeHead(403);
        res.end('403 Forbidden: Cannot submit deliverables unless assignment is In Progress or Revision Requested.');
        return true;
      }

      try {
        const stored = validateAndStoreFile(fields.file_name || 'deliverable.pdf', uploadedFile);

        let sub = db
          .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?')
          .get(asg.id, user.student_id) as Record<string, any> | undefined;

        let versionNumber = 1;
        if (!sub) {
          const subId = 'sub-' + crypto.randomUUID().slice(0, 10);
          db.prepare(
            `INSERT INTO submissions (id, assignment_id, student_id, current_version_number, revisions_used, status, is_demo)
             VALUES (?, ?, ?, 1, 0, 'SUBMITTED', ?)`
          ).run(subId, asg.id, user.student_id, user.is_demo);
          sub = { id: subId, current_version_number: 1 };
        } else {
          const maxVer = db
            .prepare('SELECT COALESCE(MAX(version_number), 0) as mv FROM submission_versions WHERE submission_id = ?')
            .get(sub.id) as { mv: number };
          versionNumber = maxVer.mv + 1;
          db.prepare(
            `UPDATE submissions SET current_version_number = ?, status = 'SUBMITTED', updated_at = datetime('now') WHERE id = ?`
          ).run(versionNumber, sub.id);
        }

        db.prepare(
          `INSERT INTO submission_versions (
             id, submission_id, assignment_id, version_number, deliverable_summary,
             submission_notes, file_name, file_type, file_size_bytes, storage_key, review_status, is_demo
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?)`
        ).run(
          'subv-' + crypto.randomUUID().slice(0, 10),
          sub.id,
          asg.id,
          versionNumber,
          fields.deliverable_summary || `Deliverable v${versionNumber}`,
          fields.submission_notes || 'Submitted for UMKM review',
          stored.fileName,
          stored.fileType,
          stored.sizeBytes,
          stored.storageKey,
          user.is_demo
        );

        const nextStage = getSafetyStageForAssignmentStatus('Submitted');
        db.prepare(
          `UPDATE assignments SET status = 'Submitted', current_safety_stage = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(nextStage, asg.id);

        const bizOwner = db
          .prepare('SELECT user_id FROM businesses WHERE id = ?')
          .get(asg.business_id) as { user_id: string } | undefined;
        if (bizOwner) {
          createNotification({
            userId: bizOwner.user_id,
            eventType: 'DELIVERABLE_SUBMITTED',
            title: `Deliverable v${versionNumber} Submitted`,
            message: `${user.full_name} uploaded Deliverable v${versionNumber} for "${asg.title}".`,
            linkUrl: '/business/reviews',
            isDemo: user.is_demo
          });
        }

        recordAuditLog({
          actorUserId: user.id,
          actorName: user.full_name,
          actorRole: 'STUDENT',
          action: 'SUBMIT_DELIVERABLE_VERSION',
          targetEntity: 'assignments',
          targetId: asg.id,
          previousState: asg.status,
          newState: 'Submitted',
          reason: `Uploaded deliverable version v${versionNumber}`
        });

        redirectWithFlash(res, `/student/assignments/${asg.id}`, `Deliverable Version ${versionNumber} submitted for Stage 5 UMKM Evaluation!`, 'success');
        return true;
      } catch (err: any) {
        redirectWithFlash(res, `/student/assignments/${asg.id}`, err.message || 'Submission failed', 'error');
        return true;
      }
    }

    if (pathname === '/api/student/profile/update' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const skillsArr = (fields.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      db.prepare(`UPDATE users SET full_name = ?, updated_at = datetime('now') WHERE id = ?`).run(
        fields.full_name || user.full_name,
        user.id
      );

      db.prepare(
        `UPDATE students
         SET grade = ?, major = ?, contact_preference = ?, skills_json = ?, bio = ?,
             guardian_name = ?, guardian_contact_private = ?, public_portfolio_enabled = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        fields.grade || 'Grade 11 (XI)',
        fields.major || 'DKV',
        fields.contact_preference || 'PLATFORM_ONLY',
        JSON.stringify(skillsArr),
        fields.bio || '',
        fields.guardian_name || '',
        fields.guardian_contact_private || '',
        fields.public_portfolio_enabled === '1' ? 1 : 0,
        user.student_id
      );

      redirectWithFlash(res, '/student/profile', 'Profile and privacy settings saved.', 'success');
      return true;
    }
  }

  // --------------------------------------------------------------------------
  // 5. UMKM BUSINESS ACTIONS (/api/business/*)
  // --------------------------------------------------------------------------
  if (pathname.startsWith('/api/business/')) {
    if (!user || user.role !== 'UMKM' || !user.business_id) {
      res.writeHead(403);
      res.end('403 Forbidden: UMKM role required.');
      return true;
    }

    if (pathname === '/api/business/assignments/create' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const commercialIntention = fields.commercial_usage_intention === '1' ? 1 : 0;
      const compType = fields.compensation_type || 'MONETARY';
      const compAmount = Number(fields.compensation_amount_idr || 0);

      // Ethical Rule Enforcement: Commercial work CANNOT proceed without an explicit monetary compensation agreement!
      if (commercialIntention === 1 && (compType !== 'MONETARY' || compAmount <= 0)) {
        redirectWithFlash(
          res,
          '/business/assignments/create',
          'Ethical Policy Violation: Commercial work cannot proceed without an explicit monetary compensation amount (> Rp0).',
          'error'
        );
        return true;
      }

      const asgId = 'asg-' + crypto.randomUUID().slice(0, 10);
      const initialStatus: AssignmentStatus =
        fields.submit_mode === 'SAVE_DRAFT' ? 'Draft' : 'Submitted for Admin Review';
      const skillsArr = (fields.required_skills || 'Graphic Design')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const critArr = (fields.evaluation_criteria || 'Relevance, Quality, Creativity, Technical, Timeliness')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      db.prepare(
        `INSERT INTO assignments (
           id, business_id, title, category, description, required_skills_json,
           deliverables, output_format, estimated_duration_hours, start_date, deadline,
           max_revisions, evaluation_criteria_json, compensation_type, compensation_amount_idr,
           compensation_details, commercial_usage_intention, copyright_licensing_terms,
           additional_instructions, status, current_safety_stage, is_demo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)`
      ).run(
        asgId,
        user.business_id,
        fields.title || 'Scoped Student Assignment',
        fields.category || 'Graphic Design',
        fields.description || '',
        JSON.stringify(skillsArr),
        fields.deliverables || '1x Digital Deliverable',
        fields.output_format || 'PDF / PNG',
        Number(fields.estimated_duration_hours || 8),
        fields.start_date || '2026-11-15',
        fields.deadline || '2026-11-28',
        Math.min(3, Math.max(0, Number(fields.max_revisions ?? 2))),
        JSON.stringify(critArr),
        compType,
        compAmount,
        fields.compensation_details || 'Agreed compensation',
        commercialIntention,
        fields.copyright_licensing_terms || 'Non-exclusive license upon settlement; student retains portfolio rights.',
        fields.additional_instructions || '',
        initialStatus,
        user.is_demo
      );

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'UMKM',
        action: 'CREATE_ASSIGNMENT',
        targetEntity: 'assignments',
        targetId: asgId,
        previousState: 'NONE',
        newState: initialStatus,
        reason: `Created assignment "${fields.title}" (${compType}: Rp${compAmount})`
      });

      redirectWithFlash(res, `/business/assignments/${asgId}`, `Assignment created with status: ${initialStatus}.`, 'success');
      return true;
    }

    if (pathname === '/api/business/assignments/submit-review' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare('SELECT * FROM assignments WHERE id = ? AND business_id = ?')
        .get(fields.assignment_id, user.business_id) as Record<string, any> | undefined;
      if (asg && asg.status === 'Draft') {
        db.prepare(`UPDATE assignments SET status = 'Submitted for Admin Review', updated_at = datetime('now') WHERE id = ?`).run(asg.id);
      }
      redirectWithFlash(res, `/business/assignments/${fields.assignment_id}`, 'Submitted for Platform Admin review.', 'success');
      return true;
    }

    if (pathname === '/api/business/assignments/publish' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare('SELECT * FROM assignments WHERE id = ? AND business_id = ?')
        .get(fields.assignment_id, user.business_id) as Record<string, any> | undefined;
      if (asg && asg.status === 'Approved') {
        db.prepare(`UPDATE assignments SET status = 'Published', updated_at = datetime('now') WHERE id = ?`).run(asg.id);
      }
      redirectWithFlash(res, `/business/assignments/${fields.assignment_id}`, 'Assignment published!', 'success');
      return true;
    }

    if (pathname === '/api/business/assignments/select-student' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare('SELECT * FROM assignments WHERE id = ? AND business_id = ?')
        .get(fields.assignment_id, user.business_id) as Record<string, any> | undefined;

      const app = db
        .prepare(
          `SELECT app.*, stu.school_id, stu.mentor_teacher_id, stu.user_id as student_user_id
           FROM assignment_applications app
           JOIN students stu ON stu.id = app.student_id
           WHERE app.id = ? AND app.assignment_id = ?`
        )
        .get(fields.application_id, fields.assignment_id) as Record<string, any> | undefined;

      if (!asg || !app) {
        redirectWithFlash(res, '/business/assignments', 'Invalid application selection.', 'error');
        return true;
      }

      let teacherId = app.mentor_teacher_id;
      if (!teacherId) {
        const fallbackTeacher = db
          .prepare('SELECT id FROM teachers WHERE school_id = ? LIMIT 1')
          .get(app.school_id) as { id: string } | undefined;
        teacherId = fallbackTeacher?.id || null;
      }

      db.prepare(`UPDATE assignment_applications SET status = 'SELECTED_FOR_APPROVAL' WHERE id = ?`).run(app.id);
      db.prepare(
        `UPDATE assignments
         SET status = 'Teacher Approval Pending',
             current_safety_stage = 3,
             selected_student_id = ?,
             assigned_teacher_id = ?,
             assigned_school_id = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(app.student_id, teacherId, app.school_id, asg.id);

      createNotification({
        userId: app.student_user_id,
        eventType: 'SELECTED_FOR_APPROVAL',
        title: 'Selected for Assignment — Pending Stage 3 School Approval',
        message: `Your application for "${asg.title}" is now awaiting your Supervising Teacher's approval.`,
        linkUrl: `/student/assignments/${asg.id}`,
        isDemo: asg.is_demo
      });

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'UMKM',
        action: 'SELECT_APPLICANT_FOR_TEACHER_APPROVAL',
        targetEntity: 'assignments',
        targetId: asg.id,
        previousState: asg.status,
        newState: 'Teacher Approval Pending',
        reason: `Selected student ${app.student_id} for Stage 3 teacher & guardian approval`
      });

      redirectWithFlash(res, `/business/assignments/${asg.id}`, 'Applicant selected! Sent to student school teacher for Stage 3 Approval.', 'success');
      return true;
    }

    if (pathname === '/api/business/reviews/evaluate' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare('SELECT * FROM assignments WHERE id = ? AND business_id = ?')
        .get(fields.assignment_id, user.business_id) as Record<string, any> | undefined;

      const sub = db
        .prepare('SELECT * FROM submissions WHERE id = ? AND assignment_id = ?')
        .get(fields.submission_id, fields.assignment_id) as Record<string, any> | undefined;

      if (!asg || !sub) {
        redirectWithFlash(res, '/business/reviews', 'Submission not found.', 'error');
        return true;
      }

      const decision = fields.outcome_decision as 'ACCEPTED' | 'REVISION_REQUESTED' | 'REJECTED';
      const r1 = Math.min(5, Math.max(1, Number(fields.relevance_score || 5)));
      const r2 = Math.min(5, Math.max(1, Number(fields.quality_score || 5)));
      const r3 = Math.min(5, Math.max(1, Number(fields.creativity_score || 4)));
      const r4 = Math.min(5, Math.max(1, Number(fields.technical_score || 5)));
      const r5 = Math.min(5, Math.max(1, Number(fields.timeliness_score || 5)));

      if (decision === 'REVISION_REQUESTED') {
        if (sub.revisions_used >= asg.max_revisions) {
          redirectWithFlash(res, '/business/reviews', `Maximum agreed revision limit (${asg.max_revisions}) already reached.`, 'error');
          return true;
        }
        db.prepare(
          `UPDATE submissions SET revisions_used = revisions_used + 1, status = 'REVISION_REQUESTED', updated_at = datetime('now') WHERE id = ?`
        ).run(sub.id);
        db.prepare(
          `UPDATE submission_versions SET review_status = 'REVISION_REQUESTED', umkm_feedback = ?, reviewed_at = datetime('now')
           WHERE submission_id = ? AND version_number = ?`
        ).run(fields.written_feedback, sub.id, sub.current_version_number);
        db.prepare(
          `UPDATE assignments SET status = 'Revision Requested', updated_at = datetime('now') WHERE id = ?`
        ).run(asg.id);
      } else {
        const evalId = 'evl-' + crypto.randomUUID().slice(0, 10);
        db.prepare(
          `INSERT OR REPLACE INTO evaluations (
             id, assignment_id, submission_id, business_id, student_id,
             relevance_score, quality_score, creativity_score, technical_score, timeliness_score,
             written_feedback, outcome_decision, rejection_or_revision_reason, is_demo
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          evalId,
          asg.id,
          sub.id,
          user.business_id,
          sub.student_id,
          r1,
          r2,
          r3,
          r4,
          r5,
          fields.written_feedback || 'Reviewed against criteria',
          decision,
          decision === 'REJECTED' ? fields.written_feedback : null,
          asg.is_demo
        );

        const newSubStatus = decision === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
        const newAsgStatus: AssignmentStatus = decision === 'ACCEPTED' ? 'Accepted' : 'Rejected';

        db.prepare(`UPDATE submissions SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newSubStatus, sub.id);
        db.prepare(
          `UPDATE submission_versions SET review_status = ?, umkm_feedback = ?, reviewed_at = datetime('now')
           WHERE submission_id = ? AND version_number = ?`
        ).run(newSubStatus, fields.written_feedback, sub.id, sub.current_version_number);
        db.prepare(
          `UPDATE assignments SET status = ?, current_safety_stage = 5, updated_at = datetime('now') WHERE id = ?`
        ).run(newAsgStatus, asg.id);
      }

      const stuUser = db
        .prepare('SELECT user_id FROM students WHERE id = ?')
        .get(sub.student_id) as { user_id: string } | undefined;
      if (stuUser) {
        createNotification({
          userId: stuUser.user_id,
          eventType: 'SUBMISSION_EVALUATED',
          title: `UMKM Evaluation: ${decision}`,
          message: `Your submission for "${asg.title}" received decision: ${decision}.`,
          linkUrl: `/student/assignments/${asg.id}`,
          isDemo: asg.is_demo
        });
      }

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'UMKM',
        action: 'EVALUATE_SUBMISSION',
        targetEntity: 'assignments',
        targetId: asg.id,
        previousState: 'Submitted',
        newState: decision,
        reason: fields.written_feedback
      });

      redirectWithFlash(res, '/business/reviews', `Evaluation recorded (${decision}).`, 'success');
      return true;
    }

    if (pathname === '/api/business/profile/update' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      // Note: UMKM can NEVER modify verification_status here!
      db.prepare(
        `UPDATE businesses
         SET business_name = ?, category = ?, description = ?, contact_email = ?,
             contact_phone = ?, city = ?, address_optional = ?, nib_or_reg_note = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        fields.business_name,
        fields.category,
        fields.description,
        fields.contact_email,
        fields.contact_phone || '',
        fields.city,
        fields.address_optional || '',
        fields.nib_or_reg_note || '',
        user.business_id
      );

      redirectWithFlash(res, '/business/profile', 'Business profile updated.', 'success');
      return true;
    }
  }

  // --------------------------------------------------------------------------
  // 6. TEACHER / MENTOR & SCHOOL ADMIN ACTIONS (/api/mentor/* & /api/school/*)
  // --------------------------------------------------------------------------
  if (pathname.startsWith('/api/mentor/')) {
    if (!user || !['MENTOR', 'SCHOOL_ADMIN'].includes(user.role) || !user.school_id) {
      res.writeHead(403);
      res.end('403 Forbidden: Teacher or School Admin role required.');
      return true;
    }

    if (pathname === '/api/mentor/students/verify-identity' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const stu = db
        .prepare('SELECT * FROM students WHERE id = ? AND school_id = ?')
        .get(fields.student_id, user.school_id) as Record<string, any> | undefined;

      if (!stu) {
        res.writeHead(403);
        res.end('403 Forbidden: Cannot access students from another school.');
        return true;
      }

      db.prepare(`UPDATE students SET identity_verified = 1, updated_at = datetime('now') WHERE id = ?`).run(stu.id);
      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: user.role,
        action: 'VERIFY_STUDENT_IDENTITY',
        targetEntity: 'students',
        targetId: stu.id,
        previousState: 'UNVERIFIED',
        newState: 'VERIFIED'
      });

      redirectWithFlash(res, '/mentor/students', 'Student identity verified.', 'success');
      return true;
    }

    if (pathname === '/api/mentor/portfolio/verify' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const p = db
        .prepare('SELECT * FROM portfolios WHERE id = ? AND school_id = ? AND deleted_at IS NULL')
        .get(fields.portfolio_id, user.school_id) as Record<string, any> | undefined;

      // Cross-school security check!
      if (!p) {
        res.writeHead(403);
        res.end('403 Forbidden: Teachers and schools cannot verify portfolios belonging to another institution.');
        return true;
      }

      const decision = fields.decision === 'VERIFIED' ? 'VERIFIED' : 'REJECTED';
      const nextStatus: PortfolioStatus = decision === 'VERIFIED' ? 'Published' : 'Rejected';
      const schoolAuthorized = decision === 'VERIFIED' ? 1 : 0;

      db.prepare(
        `UPDATE portfolios
         SET status = ?, school_display_authorized = ?, reviewer_notes = ?,
             reviewed_by_user_id = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      ).run(nextStatus, schoolAuthorized, fields.notes || '', user.id, p.id);

      db.prepare(
        `INSERT INTO portfolio_verifications (
           id, portfolio_id, reviewer_user_id, reviewer_role, identity_verified,
           originality_verified, permission_verified, decision, notes, is_demo
         ) VALUES (?, ?, ?, ?, 1, 1, 1, ?, ?, ?)`
      ).run(
        'pver-' + crypto.randomUUID().slice(0, 10),
        p.id,
        user.id,
        user.role,
        decision,
        fields.notes || 'School review completed',
        p.is_demo
      );

      const stu = db.prepare('SELECT user_id FROM students WHERE id = ?').get(p.student_id) as { user_id: string } | undefined;
      if (stu) {
        createNotification({
          userId: stu.user_id,
          eventType: decision === 'VERIFIED' ? 'PORTFOLIO_APPROVED' : 'PORTFOLIO_REJECTED',
          title: decision === 'VERIFIED' ? 'Portfolio Verified & Published' : 'Portfolio Revision Requested',
          message: `Your portfolio "${p.title}" was reviewed by ${user.full_name}: ${fields.notes}`,
          linkUrl: `/student/portfolio/${p.id}`,
          isDemo: p.is_demo
        });
      }

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: user.role,
        action: 'VERIFY_PORTFOLIO_STAGE_1',
        targetEntity: 'portfolios',
        targetId: p.id,
        previousState: p.status,
        newState: nextStatus,
        reason: fields.notes
      });

      const returnUrl = user.role === 'SCHOOL_ADMIN' ? '/school/portfolios' : '/mentor/portfolio-review';
      redirectWithFlash(res, returnUrl, `Portfolio marked as ${nextStatus}.`, 'success');
      return true;
    }

    if (pathname === '/api/mentor/assignments/approve' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare(
          `SELECT a.*, stu.school_id, stu.user_id as student_user_id, stu.guardian_name
           FROM assignments a
           JOIN students stu ON stu.id = a.selected_student_id
           WHERE a.id = ? AND stu.school_id = ?`
        )
        .get(fields.assignment_id, user.school_id) as Record<string, any> | undefined;

      if (!asg) {
        res.writeHead(403);
        res.end('403 Forbidden: Cannot approve assignments for students outside your school.');
        return true;
      }

      let teacherId = user.teacher_id;
      if (!teacherId) {
        const tRow = db.prepare('SELECT id FROM teachers WHERE school_id = ? LIMIT 1').get(user.school_id) as { id: string } | undefined;
        teacherId = tRow?.id || null;
      }

      const decision = (fields.decision || 'APPROVED') as 'APPROVED' | 'REJECTED' | 'MODIFICATION_REQUESTED';

      if (teacherId) {
        db.prepare(
          `INSERT INTO teacher_approvals (
             id, assignment_id, teacher_id, student_id,
             scope_suitable, skill_suitable, schedule_compatible, deadline_reasonable,
             revision_limit_fair, compensation_fair, safety_verified, decision, notes, is_demo
           ) VALUES (?, ?, ?, ?, 1, 1, 1, 1, 1, 1, 1, ?, ?, ?)`
        ).run(
          'tap-' + crypto.randomUUID().slice(0, 10),
          asg.id,
          teacherId,
          asg.selected_student_id,
          decision,
          fields.notes || 'Reviewed by supervising teacher',
          asg.is_demo
        );
      }

      if (decision === 'APPROVED') {
        // Verify Guardian Consent as part of Stage 3 completion
        db.prepare(
          `INSERT OR REPLACE INTO guardian_consents (
             id, assignment_id, student_id, guardian_name, guardian_relationship,
             consent_statement, consent_status, verified_by_teacher_id, consented_at, is_demo
           ) VALUES (?, ?, ?, ?, 'Parent/Guardian', 'Verified guardian consent for supervised UMKM assignment.', 'APPROVED', ?, datetime('now'), ?)`
        ).run(
          'gcn-' + crypto.randomUUID().slice(0, 10),
          asg.id,
          asg.selected_student_id,
          asg.guardian_name || 'Parent / Guardian',
          teacherId,
          asg.is_demo
        );

        // Lock Formal Assignment Agreement
        db.prepare(
          `INSERT OR REPLACE INTO assignment_agreements (
             id, assignment_id, student_id, business_id, school_id,
             agreed_deliverables, agreed_deadline, agreed_max_revisions,
             agreed_compensation_type, agreed_compensation_amount_idr,
             student_signed_at, business_signed_at, teacher_approved_at, guardian_consented_at, is_demo
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'), ?)`
        ).run(
          'agr-' + crypto.randomUUID().slice(0, 10),
          asg.id,
          asg.selected_student_id,
          asg.business_id,
          user.school_id,
          asg.deliverables,
          asg.deadline,
          asg.max_revisions,
          asg.compensation_type,
          asg.compensation_amount_idr,
          asg.is_demo
        );

        db.prepare(
          `UPDATE assignments SET status = 'Ready to Start', assigned_teacher_id = ?, current_safety_stage = 3, updated_at = datetime('now') WHERE id = ?`
        ).run(teacherId, asg.id);

        db.prepare(
          `UPDATE assignment_applications SET status = 'APPROVED' WHERE assignment_id = ? AND student_id = ?`
        ).run(asg.id, asg.selected_student_id);

        createNotification({
          userId: asg.student_user_id,
          eventType: 'TEACHER_APPROVED',
          title: 'Stage 3 Approved — Assignment Ready to Start',
          message: `Your teacher approved your participation in "${asg.title}". You may now start work.`,
          linkUrl: `/student/assignments/${asg.id}`,
          isDemo: asg.is_demo
        });
      } else {
        db.prepare(
          `UPDATE assignments SET status = 'Published', selected_student_id = NULL, updated_at = datetime('now') WHERE id = ?`
        ).run(asg.id);
      }

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: user.role,
        action: 'TEACHER_ASSIGNMENT_APPROVAL_STAGE_3',
        targetEntity: 'assignments',
        targetId: asg.id,
        previousState: asg.status,
        newState: decision === 'APPROVED' ? 'Ready to Start' : 'Published',
        reason: fields.notes
      });

      redirectWithFlash(res, '/mentor/approvals', `Stage 3 Teacher decision recorded: ${decision}.`, 'success');
      return true;
    }

    if (pathname === '/api/mentor/supervision/note' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      db.prepare(
        `INSERT INTO assignment_progress (
           id, assignment_id, actor_user_id, actor_role, milestone_title, progress_note, progress_percent, is_demo
         ) VALUES (?, ?, ?, 'MENTOR', 'Teacher Supervisory Check', ?, 75, ?)`
      ).run('prg-' + crypto.randomUUID().slice(0, 10), fields.assignment_id, user.id, fields.progress_note, user.is_demo);

      redirectWithFlash(res, '/mentor/supervision', 'Teacher supervisory check recorded.', 'success');
      return true;
    }

    if (pathname === '/api/mentor/experience/verify' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const ev = db
        .prepare(
          `SELECT ev.*, stu.school_id
           FROM evaluations ev
           JOIN students stu ON stu.id = ev.student_id
           WHERE ev.id = ? AND stu.school_id = ?`
        )
        .get(fields.evaluation_id, user.school_id) as Record<string, any> | undefined;

      if (!ev) {
        res.writeHead(403);
        res.end('403 Forbidden: Cannot verify experience records for another school.');
        return true;
      }

      db.prepare(
        `UPDATE evaluations
         SET school_monitored_by_user_id = ?, school_monitored_at = datetime('now'), school_verification_notes = ?
         WHERE id = ?`
      ).run(user.id, fields.school_verification_notes || 'Verified by school teacher', ev.id);

      db.prepare(
        `UPDATE assignments SET status = 'School Verification', current_safety_stage = 5, updated_at = datetime('now') WHERE id = ?`
      ).run(ev.assignment_id);

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: user.role,
        action: 'SCHOOL_VERIFY_EVALUATION_EVIDENCE_STAGE_5',
        targetEntity: 'assignments',
        targetId: ev.assignment_id,
        previousState: 'Accepted',
        newState: 'School Verification',
        reason: fields.school_verification_notes
      });

      redirectWithFlash(res, '/mentor/experience-verification', 'School verification recorded! Ready for Stage 6 Admin Closure & Passport Issuance.', 'success');
      return true;
    }
  }

  // School Admin specific routes (/api/school/*)
  if (pathname.startsWith('/api/school/')) {
    if (!user || user.role !== 'SCHOOL_ADMIN' || !user.school_id) {
      res.writeHead(403);
      res.end('403 Forbidden: School Administrator role required.');
      return true;
    }

    if (pathname === '/api/school/students/assign-mentor' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const stu = db
        .prepare('SELECT id FROM students WHERE id = ? AND school_id = ?')
        .get(fields.student_id, user.school_id);
      if (!stu) {
        res.writeHead(403);
        res.end('403 Forbidden');
        return true;
      }
      db.prepare('UPDATE students SET mentor_teacher_id = ?, updated_at = datetime("now") WHERE id = ?').run(
        fields.mentor_teacher_id || null,
        fields.student_id
      );
      redirectWithFlash(res, '/school/students', 'Mentor teacher assigned to student.', 'success');
      return true;
    }

    if (pathname === '/api/school/students/create' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const newUserId = 'usr-' + crypto.randomUUID().slice(0, 10);
      const newStuId = 'stu-' + crypto.randomUUID().slice(0, 10);

      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, role_id, school_id, status, is_demo)
         VALUES (?, ?, ?, ?, 'STUDENT', ?, 'ACTIVE', ?)`
      ).run(newUserId, fields.email.toLowerCase(), hashPassword('StudentPass!2026'), fields.full_name, user.school_id, user.is_demo);

      db.prepare(
        `INSERT INTO students (
           id, user_id, school_id, mentor_teacher_id, nisn, grade, major, skills_json,
           guardian_name, guardian_relationship, identity_verified, is_demo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Parent', 1, ?)`
      ).run(
        newStuId,
        newUserId,
        user.school_id,
        fields.mentor_teacher_id || null,
        fields.nisn,
        fields.grade || 'Grade 11 (XI)',
        fields.major || 'DKV',
        JSON.stringify(['Graphic Design']),
        fields.guardian_name || 'Guardian',
        user.is_demo
      );

      redirectWithFlash(res, '/school/students', `Student ${fields.full_name} registered and verified.`, 'success');
      return true;
    }

    if (pathname === '/api/school/teachers/create' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const newUserId = 'usr-' + crypto.randomUUID().slice(0, 10);
      const newTchId = 'tch-' + crypto.randomUUID().slice(0, 10);

      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, role_id, school_id, status, is_demo)
         VALUES (?, ?, ?, ?, 'MENTOR', ?, 'ACTIVE', ?)`
      ).run(newUserId, fields.email.toLowerCase(), hashPassword('TeacherPass!2026'), fields.full_name, user.school_id, user.is_demo);

      db.prepare(
        `INSERT INTO teachers (id, user_id, school_id, nip_or_nik, subject_specialty, verification_status, is_demo)
         VALUES (?, ?, ?, ?, ?, 'VERIFIED', ?)`
      ).run(newTchId, newUserId, user.school_id, fields.nip_or_nik || '', fields.subject_specialty || 'Supervision', user.is_demo);

      redirectWithFlash(res, '/school/teachers', `Teacher ${fields.full_name} added to school roster.`, 'success');
      return true;
    }

    if (pathname === '/api/school/settings/update' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      db.prepare(
        `UPDATE schools
         SET name = ?, principal_name = ?, semester_label = ?, contact_email = ?, invite_code = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(fields.name, fields.principal_name || '', fields.semester_label, fields.contact_email, fields.invite_code, user.school_id);

      redirectWithFlash(res, '/school/settings', 'School institutional settings updated.', 'success');
      return true;
    }
  }

  // --------------------------------------------------------------------------
  // 7. PLATFORM ADMIN ACTIONS (/api/admin/*)
  // --------------------------------------------------------------------------
  if (pathname.startsWith('/api/admin/')) {
    if (!user || user.role !== 'PLATFORM_ADMIN') {
      res.writeHead(403);
      res.end('403 Forbidden: Platform Administrator permission required on backend.');
      return true;
    }

    if (pathname === '/api/admin/users/status' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const target = db.prepare('SELECT * FROM users WHERE id = ?').get(fields.target_user_id) as Record<string, any> | undefined;
      if (target) {
        db.prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(fields.new_status, target.id);
        recordAuditLog({
          actorUserId: user.id,
          actorName: user.full_name,
          actorRole: 'PLATFORM_ADMIN',
          action: 'UPDATE_USER_STATUS',
          targetEntity: 'users',
          targetId: target.id,
          previousState: target.status,
          newState: fields.new_status,
          reason: fields.reason
        });
      }
      redirectWithFlash(res, '/admin/users', 'User status updated and logged.', 'success');
      return true;
    }

    if (pathname === '/api/admin/schools/create' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const schId = 'sch-' + crypto.randomUUID().slice(0, 10);
      db.prepare(
        `INSERT INTO schools (id, name, npsn, type, city, province, contact_email, verification_status, invite_code, is_demo)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, 0)`
      ).run(schId, fields.name, fields.npsn, fields.type || 'SMK', fields.city, fields.province, fields.contact_email, fields.invite_code);

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'PLATFORM_ADMIN',
        action: 'CREATE_AND_VERIFY_SCHOOL',
        targetEntity: 'schools',
        targetId: schId,
        previousState: 'NONE',
        newState: 'VERIFIED',
        reason: `Onboarded school ${fields.name}`
      });
      redirectWithFlash(res, '/admin/schools', `School ${fields.name} created and verified.`, 'success');
      return true;
    }

    if (pathname === '/api/admin/schools/verify' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const sch = db.prepare('SELECT * FROM schools WHERE id = ?').get(fields.school_id) as Record<string, any> | undefined;
      if (sch) {
        db.prepare(`UPDATE schools SET verification_status = ?, updated_at = datetime('now') WHERE id = ?`).run(fields.status, sch.id);
        recordAuditLog({
          actorUserId: user.id,
          actorName: user.full_name,
          actorRole: 'PLATFORM_ADMIN',
          action: 'VERIFY_SCHOOL',
          targetEntity: 'schools',
          targetId: sch.id,
          previousState: sch.verification_status,
          newState: fields.status,
          reason: fields.reason
        });
      }
      redirectWithFlash(res, '/admin/schools', 'School verification status updated.', 'success');
      return true;
    }

    if (pathname === '/api/admin/businesses/verify' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(fields.business_id) as Record<string, any> | undefined;
      if (biz) {
        db.prepare(
          `UPDATE businesses SET verification_status = ?, verified_by_user_id = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).run(fields.status, user.id, biz.id);
        recordAuditLog({
          actorUserId: user.id,
          actorName: user.full_name,
          actorRole: 'PLATFORM_ADMIN',
          action: 'VERIFY_BUSINESS',
          targetEntity: 'businesses',
          targetId: biz.id,
          previousState: biz.verification_status,
          newState: fields.status,
          reason: fields.reason
        });
      }
      redirectWithFlash(res, '/admin/businesses', 'UMKM verification status updated.', 'success');
      return true;
    }

    if (pathname === '/api/admin/portfolios/moderate' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const p = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(fields.portfolio_id) as Record<string, any> | undefined;
      if (p) {
        const authFlag = fields.status === 'Published' ? 1 : 0;
        db.prepare(`UPDATE portfolios SET status = ?, school_display_authorized = ?, updated_at = datetime('now') WHERE id = ?`).run(
          fields.status,
          authFlag,
          p.id
        );
        recordAuditLog({
          actorUserId: user.id,
          actorName: user.full_name,
          actorRole: 'PLATFORM_ADMIN',
          action: 'MODERATE_PORTFOLIO',
          targetEntity: 'portfolios',
          targetId: p.id,
          previousState: p.status,
          newState: fields.status,
          reason: fields.reason
        });
      }
      redirectWithFlash(res, '/admin/portfolios', 'Portfolio moderation action recorded.', 'success');
      return true;
    }

    // Stage 2 Safety — Admin Assignment Moderation
    if (pathname === '/api/admin/assignments/review' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db.prepare('SELECT * FROM assignments WHERE id = ?').get(fields.assignment_id) as Record<string, any> | undefined;
      if (asg) {
        const newStatus: AssignmentStatus = fields.decision === 'PUBLISH' ? 'Published' : 'Draft';
        db.prepare(
          `UPDATE assignments SET status = ?, admin_review_notes = ?, current_safety_stage = 2, updated_at = datetime('now') WHERE id = ?`
        ).run(newStatus, fields.reason, asg.id);

        recordAuditLog({
          actorUserId: user.id,
          actorName: user.full_name,
          actorRole: 'PLATFORM_ADMIN',
          action: 'MODERATE_ASSIGNMENT_STAGE_2',
          targetEntity: 'assignments',
          targetId: asg.id,
          previousState: asg.status,
          newState: newStatus,
          reason: fields.reason
        });
      }
      redirectWithFlash(res, '/admin/assignments', 'Stage 2 Assignment moderation recorded.', 'success');
      return true;
    }

    // Stage 6 Safety — Assignment Closure & Experience Passport Issuance
    if (pathname === '/api/admin/assignments/close' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      const asg = db
        .prepare(
          `SELECT a.*, b.business_name, s.name as school_name,
                  tu.full_name as teacher_name
           FROM assignments a
           JOIN businesses b ON b.id = a.business_id
           LEFT JOIN schools s ON s.id = a.assigned_school_id
           LEFT JOIN teachers t ON t.id = a.assigned_teacher_id
           LEFT JOIN users tu ON tu.id = t.user_id
           WHERE a.id = ?`
        )
        .get(fields.assignment_id) as Record<string, any> | undefined;

      if (!asg || !asg.selected_student_id) {
        redirectWithFlash(res, '/admin/assignments', 'Assignment cannot be closed without an assigned student.', 'error');
        return true;
      }

      const app = db
        .prepare('SELECT * FROM assignment_applications WHERE assignment_id = ? AND student_id = ?')
        .get(asg.id, asg.selected_student_id) as Record<string, any> | undefined;

      const sub = db
        .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?')
        .get(asg.id, asg.selected_student_id) as Record<string, any> | undefined;

      const ev = db
        .prepare('SELECT * FROM evaluations WHERE assignment_id = ?')
        .get(asg.id) as Record<string, any> | undefined;

      const tap = db
        .prepare(`SELECT * FROM teacher_approvals WHERE assignment_id = ? AND decision = 'APPROVED'`)
        .get(asg.id) as Record<string, any> | undefined;

      const gcn = db
        .prepare(`SELECT * FROM guardian_consents WHERE assignment_id = ? AND consent_status = 'APPROVED'`)
        .get(asg.id) as Record<string, any> | undefined;

      // Record Stage 6 Compensation & Copyright Closure
      db.prepare(
        `INSERT OR REPLACE INTO compensation_records (
           id, assignment_id, business_id, student_id, compensation_type, amount_idr,
           description, status, settlement_reference, confirmed_by_admin_id, confirmed_at, is_demo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED_BY_SCHOOL', ?, ?, datetime('now'), ?)`
      ).run(
        'cmp-' + crypto.randomUUID().slice(0, 10),
        asg.id,
        asg.business_id,
        asg.selected_student_id,
        asg.compensation_type,
        asg.compensation_amount_idr,
        asg.compensation_details,
        fields.settlement_reference || 'SETTLED',
        user.id,
        asg.is_demo
      );

      db.prepare(
        `INSERT OR REPLACE INTO copyright_agreements (
           id, assignment_id, student_id, business_id, license_scope,
           commercial_rights_granted, student_portfolio_attribution_allowed,
           rights_transfer_status, confirmed_at, is_demo
         ) VALUES (?, ?, ?, ?, ?, ?, 1, 'LICENSED_TO_UMKM_UPON_COMPENSATION', datetime('now'), ?)`
      ).run(
        'cpr-' + crypto.randomUUID().slice(0, 10),
        asg.id,
        asg.selected_student_id,
        asg.business_id,
        asg.copyright_licensing_terms,
        asg.commercial_usage_intention,
        asg.is_demo
      );

      // Evaluate 6-Point Evidence Eligibility for Experience Passport
      const eligibility = evaluatePassportEligibility({
        portfolioVerified: Boolean(app?.portfolio_id),
        teacherApproved: Boolean(tap),
        guardianConsented: Boolean(gcn),
        submissionExists: Boolean(sub),
        evaluationExists: Boolean(ev),
        evaluationAccepted: ev?.outcome_decision === 'ACCEPTED',
        schoolVerified: Boolean(ev?.school_monitored_at),
        adminClosed: true
      });

      const outcomeStatus = eligibility.eligibleForVerifiedPassport
        ? 'Completed and Accepted'
        : ev?.outcome_decision === 'REJECTED'
        ? 'Completed but Not Accepted'
        : 'Incomplete';

      const verificationStatus = eligibility.eligibleForVerifiedPassport
        ? 'VERIFIED_ISSUED'
        : 'RECORDED_UNSUCCESSFUL';

      const overallScore = ev
        ? Number(
            (
              (ev.relevance_score +
                ev.quality_score +
                ev.creativity_score +
                ev.technical_score +
                ev.timeliness_score) /
              5
            ).toFixed(2)
          )
        : null;

      const passportId = 'psp-' + crypto.randomUUID().slice(0, 10);
      const verificationCode = 'SL-VER-' + Date.now().toString().slice(-6);

      db.prepare(
        `INSERT OR REPLACE INTO experience_passports (
           id, verification_code, student_id, school_id, assignment_id, portfolio_id,
           submission_id, evaluation_id, business_name, assignment_title, assignment_description,
           skills_demonstrated_json, deliverables_summary, completion_date,
           umkm_evaluation_summary, overall_score, teacher_verifier_name, school_name,
           compensation_summary, outcome_status, verification_status, admin_closed_by_user_id, is_demo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        passportId,
        verificationCode,
        asg.selected_student_id,
        asg.assigned_school_id,
        asg.id,
        app?.portfolio_id || 'prt-demo-01',
        sub?.id || null,
        ev?.id || null,
        asg.business_name,
        asg.title,
        asg.description,
        asg.required_skills_json,
        asg.deliverables,
        ev?.written_feedback || 'Closed by Administrator',
        overallScore,
        asg.teacher_name || 'Supervising School Teacher',
        asg.school_name || 'Verified School',
        `Settled (${asg.compensation_type}: Rp${asg.compensation_amount_idr})`,
        outcomeStatus,
        verificationStatus,
        user.id,
        asg.is_demo
      );

      db.prepare(
        `UPDATE assignments SET status = 'Closed', current_safety_stage = 6, updated_at = datetime('now') WHERE id = ?`
      ).run(asg.id);

      const stuUser = db
        .prepare('SELECT user_id FROM students WHERE id = ?')
        .get(asg.selected_student_id) as { user_id: string } | undefined;
      if (stuUser) {
        createNotification({
          userId: stuUser.user_id,
          eventType: 'PASSPORT_ISSUED',
          title: `Experience Passport Updated (${outcomeStatus})`,
          message: `Assignment "${asg.title}" has been closed. Verification Code: ${verificationCode}.`,
          linkUrl: `/student/passport/${passportId}`,
          isDemo: asg.is_demo
        });
      }

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'PLATFORM_ADMIN',
        action: 'CLOSE_ASSIGNMENT_STAGE_6_AND_ISSUE_PASSPORT',
        targetEntity: 'assignments',
        targetId: asg.id,
        previousState: asg.status,
        newState: 'Closed',
        reason: `Passport ${verificationCode} issued as ${outcomeStatus} (${verificationStatus})`
      });

      redirectWithFlash(
        res,
        '/admin/assignments',
        `Stage 6 Closure complete! Experience Passport (${verificationCode}) recorded as "${outcomeStatus}".`,
        'success'
      );
      return true;
    }

    if (pathname === '/api/admin/safety/resolve' && req.method === 'POST') {
      const { fields } = await parseRequestBody(req);
      db.prepare(
        `UPDATE complaints SET status = 'RESOLVED', resolution_notes = ?, resolved_by_user_id = ?, resolved_at = datetime('now') WHERE id = ?`
      ).run(fields.resolution_notes, user.id, fields.complaint_id);

      recordAuditLog({
        actorUserId: user.id,
        actorName: user.full_name,
        actorRole: 'PLATFORM_ADMIN',
        action: 'RESOLVE_SAFETY_COMPLAINT',
        targetEntity: 'complaints',
        targetId: fields.complaint_id,
        previousState: 'OPEN',
        newState: 'RESOLVED',
        reason: fields.resolution_notes
      });
      redirectWithFlash(res, '/admin/safety', 'Safety complaint resolved and logged.', 'success');
      return true;
    }
  }

  // --------------------------------------------------------------------------
  // 8. SHARED ENDPOINTS (Notifications & Complaints)
  // --------------------------------------------------------------------------
  if (pathname === '/api/notifications/mark-read' && req.method === 'POST' && user) {
    const { fields } = await parseRequestBody(req);
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(fields.notification_id, user.id);
    res.writeHead(303, { Location: fields.return_to || '/' });
    res.end();
    return true;
  }

  if (pathname === '/api/notifications/mark-all-read' && req.method === 'POST' && user) {
    const { fields } = await parseRequestBody(req);
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user.id);
    res.writeHead(303, { Location: fields.return_to || '/' });
    res.end();
    return true;
  }

  if (pathname === '/api/complaints/create' && req.method === 'POST' && user) {
    const { fields } = await parseRequestBody(req);
    const cmpId = 'cmp-rpt-' + crypto.randomUUID().slice(0, 8);
    db.prepare(
      `INSERT INTO complaints (
         id, reporter_user_id, reporter_role, school_id, assignment_id,
         category, severity, subject, description, status, is_demo
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`
    ).run(
      cmpId,
      user.id,
      user.role,
      user.school_id,
      fields.assignment_id || null,
      fields.category || 'General Support',
      fields.severity || 'MEDIUM',
      fields.subject || 'Safety / Support Escalation',
      fields.description || '',
      user.is_demo
    );

    recordAuditLog({
      actorUserId: user.id,
      actorName: user.full_name,
      actorRole: user.role,
      action: 'FILE_SAFETY_COMPLAINT',
      targetEntity: 'complaints',
      targetId: cmpId,
      previousState: 'NONE',
      newState: 'OPEN',
      reason: fields.subject
    });

    redirectWithFlash(res, fields.return_to || '/student/support', 'Safety & support complaint logged for immediate review.', 'success');
    return true;
  }

  return false;
}
