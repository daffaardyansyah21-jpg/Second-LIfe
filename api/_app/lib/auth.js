// ============================================================================
// SECOND LIFE — Authentication, Sessions, CSRF & Role-Based Access Control
// ============================================================================

import crypto from 'node:crypto';
                                                                 
import { getDb, isDemoMode } from './db.js';
                                                                

                         
                
                 
                    
                    
                    
 

const activeSessions = new Map                       ();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export function createSession(userId        )                                       {
  const token = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  activeSessions.set(token, {
    token,
    userId,
    csrfToken,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  return { token, csrfToken };
}

export function destroySession(token        )       {
  activeSessions.delete(token);
}

export function parseCookies(req                 )                         {
  const header = req.headers.cookie || '';
  const result                         = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      result[k] = v;
    }
  }
  return result;
}

export function setSessionCookie(res                , token        )       {
  res.setHeader(
    'Set-Cookie',
    `sl_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`
  );
}

export function clearSessionCookie(res                )       {
  res.setHeader(
    'Set-Cookie',
    'sl_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
}

export function getSessionUser(req                 )                                                  {
  const cookies = parseCookies(req);
  const token = cookies['sl_session'];
  if (!token) return null;

  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    return null;
  }

  return loadUserById(session.userId, session.csrfToken);
}

export function loadUserById(userId        , csrfToken = 'direct-call')                                                  {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         u.id, u.email, u.full_name, u.role_id as role, u.school_id, u.status, u.is_demo,
         s.name as school_name,
         stu.id as student_id,
         tch.id as teacher_id,
         biz.id as business_id,
         biz.business_name as business_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       LEFT JOIN students stu ON stu.user_id = u.id
       LEFT JOIN teachers tch ON tch.user_id = u.id
       LEFT JOIN businesses biz ON biz.user_id = u.id
       WHERE u.id = ? AND u.deleted_at IS NULL`
    )
    .get(userId)                           ;

  if (!row || row.status === 'SUSPENDED') return null;

  // Automatically enable Demo Mode if a user logs into a [DEMO] synthetic account
  if (row.is_demo === 1 && !isDemoMode()) {
    // Keep demo flag aligned
  }

  return { user: row, csrfToken };
}

export function getDashboardHomeForRole(role          )         {
  switch (role) {
    case 'STUDENT':
      return '/student/dashboard';
    case 'UMKM':
      return '/business/dashboard';
    case 'MENTOR':
      return '/mentor/dashboard';
    case 'SCHOOL_ADMIN':
      return '/school/dashboard';
    case 'PLATFORM_ADMIN':
      return '/admin/dashboard';
  }
}

export function requireRole(
  req                 ,
  res                ,
  allowedRoles            
)                                                  {
  const session = getSessionUser(req);
  if (!session) {
    res.writeHead(302, { Location: `/login?redirect=${encodeURIComponent(req.url || '/')}` });
    res.end();
    return null;
  }
  if (!allowedRoles.includes(session.user.role)) {
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      `<!doctype html><html><head><title>403 Forbidden — SECOND LIFE</title></head>
       <body style="font-family:sans-serif;background:#F8F6F0;color:#282735;padding:48px;text-align:center;">
         <h1 style="color:#292344;">403 — Access Restricted</h1>
         <p>Your account role (<strong>${session.user.role}</strong>) does not have permission to access this route.</p>
         <p><a href="${getDashboardHomeForRole(session.user.role)}" style="color:#37315F;font-weight:600;">Return to Your Dashboard</a></p>
       </body></html>`
    );
    return null;
  }
  return session;
}
