// ============================================================================
// SECOND LIFE — Main HTTP Server & Multi-Page Router
// ============================================================================

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
                                                                 
import { getDb, getProjectRoot } from './lib/db.js';
import { getSessionUser, requireRole } from './lib/auth.js';
import { handleApiRoute } from './routes/api.js';
import {
  renderAboutPage,
  renderExploreDetailPage,
  renderExplorePage,
  renderForgotPasswordPage,
  renderHowItWorksPage,
  renderLandingPage,
  renderLoginPage,
  renderPublicVerifyPassportPage,
  renderRegisterPage,
  renderStaticGovernancePage
} from './views/public.js';
import {
  renderRoleNotificationsPage,
  renderStudentAssignmentDetailPage,
  renderStudentAssignmentsPage,
  renderStudentOpportunitiesPage,
  renderStudentOpportunityDetailPage,
  renderStudentOverviewPage,
  renderStudentPassportDetailPage,
  renderStudentPassportPage,
  renderStudentPortfolioDetailPage,
  renderStudentPortfolioPage,
  renderStudentProfilePage,
  renderStudentSubmissionsPage,
  renderStudentSupportPage
} from './views/student.js';
import {
  renderBusinessAssignmentDetailPage,
  renderBusinessAssignmentsPage,
  renderBusinessCreateAssignmentPage,
  renderBusinessOverviewPage,
  renderBusinessProfilePage,
  renderBusinessReviewsPage,
  renderBusinessTalentPage
} from './views/business.js';
import {
  renderMentorApprovalsPage,
  renderMentorExperienceVerificationPage,
  renderMentorOverviewPage,
  renderMentorPortfolioReviewPage,
  renderMentorReportsPage,
  renderMentorStudentsPage,
  renderMentorSubmissionsPage,
  renderMentorSupervisionPage
} from './views/mentor.js';
import {
  renderSchoolAssignmentsPage,
  renderSchoolOverviewPage,
  renderSchoolPartnersPage,
  renderSchoolPassportsPage,
  renderSchoolPortfoliosPage,
  renderSchoolReportsPage,
  renderSchoolSettingsPage,
  renderSchoolStudentsPage,
  renderSchoolTeachersPage
} from './views/school.js';
import {
  renderAdminAnalyticsPage,
  renderAdminAssignmentsPage,
  renderAdminAuditLogsPage,
  renderAdminBusinessesPage,
  renderAdminOverviewPage,
  renderAdminPortfoliosPage,
  renderAdminSafetyPage,
  renderAdminSchoolsPage,
  renderAdminSettingsPage,
  renderAdminUsersPage,
  renderAdminVerificationsPage
} from './views/admin.js';

function sendHtml(res                , html        , statusCode = 200)       {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(html);
}

export async function requestHandler(req                 , res                )                {
  try {
    getDb(); // Ensure schema & bootstrap roles are initialized
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost:3000'}`);
    const pathname = reqUrl.pathname.replace(/\/+$/, '') || '/';
    const searchParams = reqUrl.searchParams;
    const flash = searchParams.get('flash');

    // 0. Static Image Assets (/assets/*)
    if (pathname === '/assets/hero-students.jpg') {
      const candidateImgPaths = [
        path.join(getProjectRoot(), 'public', 'hero-students.jpg'),
        path.join(process.cwd(), 'public', 'hero-students.jpg')
      ];
      const imgPath = candidateImgPaths.find((p) => fs.existsSync(p));
      if (imgPath) {
        const buf = fs.readFileSync(imgPath);
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=3600'
        });
        res.end(buf);
        return;
      }
    }

    // 1. API & Form Action Endpoints
    if (pathname.startsWith('/api/')) {
      const handled = await handleApiRoute(req, res, pathname, searchParams);
      if (!handled && !res.writableEnded) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
      }
      return;
    }

    const session = getSessionUser(req);
    const user = session?.user || null;

    // 2. PUBLIC WEBSITE ROUTES
    if (pathname === '/') {
      sendHtml(res, renderLandingPage(user, flash));
      return;
    }
    if (pathname === '/about') {
      sendHtml(res, renderAboutPage(user));
      return;
    }
    if (pathname === '/how-it-works') {
      sendHtml(res, renderHowItWorksPage(user));
      return;
    }
    if (pathname === '/explore') {
      sendHtml(
        res,
        renderExplorePage(user, {
          q: searchParams.get('q') || '',
          category: searchParams.get('category') || ''
        })
      );
      return;
    }
    if (pathname.startsWith('/explore/')) {
      const id = decodeURIComponent(pathname.slice('/explore/'.length));
      sendHtml(res, renderExploreDetailPage(user, id));
      return;
    }
    if (pathname === '/login') {
      sendHtml(res, renderLoginPage(user, searchParams.get('redirect') || '', searchParams.get('error')));
      return;
    }
    if (pathname === '/register') {
      sendHtml(res, renderRegisterPage(user, searchParams.get('error')));
      return;
    }
    if (pathname === '/forgot-password') {
      sendHtml(res, renderForgotPasswordPage(user, searchParams.get('msg')));
      return;
    }
    if (pathname.startsWith('/verify/')) {
      const code = decodeURIComponent(pathname.slice('/verify/'.length));
      sendHtml(res, renderPublicVerifyPassportPage(user, code));
      return;
    }
    if (pathname === '/safety' || pathname === '/privacy' || pathname === '/terms' || pathname === '/contact') {
      sendHtml(res, renderStaticGovernancePage(user, pathname.slice(1)       ));
      return;
    }

    // 3. STUDENT DASHBOARD ROUTES (/student/*)
    if (pathname.startsWith('/student')) {
      const auth = requireRole(req, res, ['STUDENT']);
      if (!auth) return;

      if (pathname === '/student' || pathname === '/student/dashboard') {
        sendHtml(res, renderStudentOverviewPage(auth.user, flash));
        return;
      }
      if (pathname === '/student/portfolio') {
        sendHtml(res, renderStudentPortfolioPage(auth.user, flash));
        return;
      }
      if (pathname.startsWith('/student/portfolio/')) {
        const id = decodeURIComponent(pathname.slice('/student/portfolio/'.length));
        sendHtml(res, renderStudentPortfolioDetailPage(auth.user, id, flash));
        return;
      }
      if (pathname === '/student/opportunities') {
        sendHtml(
          res,
          renderStudentOpportunitiesPage(
            auth.user,
            {
              q: searchParams.get('q') || '',
              category: searchParams.get('category') || ''
            },
            flash
          )
        );
        return;
      }
      if (pathname.startsWith('/student/opportunities/')) {
        const id = decodeURIComponent(pathname.slice('/student/opportunities/'.length));
        sendHtml(res, renderStudentOpportunityDetailPage(auth.user, id, flash));
        return;
      }
      if (pathname === '/student/assignments') {
        sendHtml(res, renderStudentAssignmentsPage(auth.user, flash));
        return;
      }
      if (pathname.startsWith('/student/assignments/')) {
        const id = decodeURIComponent(pathname.slice('/student/assignments/'.length));
        sendHtml(res, renderStudentAssignmentDetailPage(auth.user, id, flash));
        return;
      }
      if (pathname === '/student/submissions') {
        sendHtml(res, renderStudentSubmissionsPage(auth.user));
        return;
      }
      if (pathname === '/student/passport') {
        sendHtml(res, renderStudentPassportPage(auth.user));
        return;
      }
      if (pathname.startsWith('/student/passport/')) {
        const id = decodeURIComponent(pathname.slice('/student/passport/'.length));
        sendHtml(res, renderStudentPassportDetailPage(auth.user, id));
        return;
      }
      if (pathname === '/student/notifications') {
        sendHtml(res, renderRoleNotificationsPage(auth.user, '/student/notifications'));
        return;
      }
      if (pathname === '/student/profile') {
        sendHtml(res, renderStudentProfilePage(auth.user, flash));
        return;
      }
      if (pathname === '/student/support') {
        sendHtml(res, renderStudentSupportPage(auth.user, flash));
        return;
      }
    }

    // 4. UMKM DASHBOARD ROUTES (/business/*)
    if (pathname.startsWith('/business')) {
      const auth = requireRole(req, res, ['UMKM']);
      if (!auth) return;

      if (pathname === '/business' || pathname === '/business/dashboard') {
        sendHtml(res, renderBusinessOverviewPage(auth.user, flash));
        return;
      }
      if (pathname === '/business/talent') {
        sendHtml(
          res,
          renderBusinessTalentPage(auth.user, {
            q: searchParams.get('q') || '',
            category: searchParams.get('category') || '',
            school_id: searchParams.get('school_id') || ''
          })
        );
        return;
      }
      if (pathname === '/business/assignments/create') {
        sendHtml(res, renderBusinessCreateAssignmentPage(auth.user, flash));
        return;
      }
      if (pathname === '/business/assignments') {
        sendHtml(res, renderBusinessAssignmentsPage(auth.user, flash));
        return;
      }
      if (pathname.startsWith('/business/assignments/')) {
        const id = decodeURIComponent(pathname.slice('/business/assignments/'.length));
        sendHtml(res, renderBusinessAssignmentDetailPage(auth.user, id, flash));
        return;
      }
      if (pathname === '/business/reviews') {
        sendHtml(res, renderBusinessReviewsPage(auth.user, flash));
        return;
      }
      if (pathname === '/business/profile') {
        sendHtml(res, renderBusinessProfilePage(auth.user, flash));
        return;
      }
      if (pathname === '/business/notifications') {
        sendHtml(res, renderRoleNotificationsPage(auth.user, '/business/notifications'));
        return;
      }
    }

    // 5. TEACHER / MENTOR DASHBOARD ROUTES (/mentor/*)
    if (pathname.startsWith('/mentor')) {
      const auth = requireRole(req, res, ['MENTOR']);
      if (!auth) return;

      if (pathname === '/mentor' || pathname === '/mentor/dashboard') {
        sendHtml(res, renderMentorOverviewPage(auth.user, flash));
        return;
      }
      if (pathname === '/mentor/students') {
        sendHtml(res, renderMentorStudentsPage(auth.user, flash));
        return;
      }
      if (pathname === '/mentor/portfolio-review') {
        sendHtml(res, renderMentorPortfolioReviewPage(auth.user, flash));
        return;
      }
      if (pathname === '/mentor/approvals') {
        sendHtml(res, renderMentorApprovalsPage(auth.user, flash));
        return;
      }
      if (pathname === '/mentor/supervision') {
        sendHtml(res, renderMentorSupervisionPage(auth.user, flash));
        return;
      }
      if (pathname === '/mentor/submissions') {
        sendHtml(res, renderMentorSubmissionsPage(auth.user));
        return;
      }
      if (pathname === '/mentor/experience-verification') {
        sendHtml(res, renderMentorExperienceVerificationPage(auth.user, flash));
        return;
      }
      if (pathname === '/mentor/reports') {
        sendHtml(res, renderMentorReportsPage(auth.user));
        return;
      }
      if (pathname === '/mentor/notifications') {
        sendHtml(res, renderRoleNotificationsPage(auth.user, '/mentor/notifications'));
        return;
      }
    }

    // 6. SCHOOL ADMINISTRATOR DASHBOARD ROUTES (/school/*)
    if (pathname.startsWith('/school')) {
      const auth = requireRole(req, res, ['SCHOOL_ADMIN']);
      if (!auth) return;

      if (pathname === '/school' || pathname === '/school/dashboard') {
        sendHtml(res, renderSchoolOverviewPage(auth.user, flash));
        return;
      }
      if (pathname === '/school/students') {
        sendHtml(res, renderSchoolStudentsPage(auth.user, flash));
        return;
      }
      if (pathname === '/school/teachers') {
        sendHtml(res, renderSchoolTeachersPage(auth.user, flash));
        return;
      }
      if (pathname === '/school/partners') {
        sendHtml(res, renderSchoolPartnersPage(auth.user));
        return;
      }
      if (pathname === '/school/portfolios') {
        sendHtml(res, renderSchoolPortfoliosPage(auth.user, flash));
        return;
      }
      if (pathname === '/school/assignments') {
        sendHtml(res, renderSchoolAssignmentsPage(auth.user));
        return;
      }
      if (pathname === '/school/passports') {
        sendHtml(res, renderSchoolPassportsPage(auth.user));
        return;
      }
      if (pathname === '/school/reports') {
        sendHtml(res, renderSchoolReportsPage(auth.user));
        return;
      }
      if (pathname === '/school/settings') {
        sendHtml(res, renderSchoolSettingsPage(auth.user, flash));
        return;
      }
    }

    // 7. PLATFORM ADMINISTRATOR DASHBOARD ROUTES (/admin/*)
    if (pathname.startsWith('/admin')) {
      const auth = requireRole(req, res, ['PLATFORM_ADMIN']);
      if (!auth) return;

      if (pathname === '/admin' || pathname === '/admin/dashboard') {
        sendHtml(res, renderAdminOverviewPage(auth.user, flash));
        return;
      }
      if (pathname === '/admin/users') {
        sendHtml(res, renderAdminUsersPage(auth.user, flash));
        return;
      }
      if (pathname === '/admin/schools') {
        sendHtml(res, renderAdminSchoolsPage(auth.user, flash));
        return;
      }
      if (pathname === '/admin/businesses') {
        sendHtml(res, renderAdminBusinessesPage(auth.user, flash));
        return;
      }
      if (pathname === '/admin/portfolios') {
        sendHtml(res, renderAdminPortfoliosPage(auth.user, flash));
        return;
      }
      if (pathname === '/admin/assignments') {
        sendHtml(res, renderAdminAssignmentsPage(auth.user, flash));
        return;
      }
      if (pathname === '/admin/safety') {
        sendHtml(res, renderAdminSafetyPage(auth.user, flash));
        return;
      }
      if (pathname === '/admin/verifications') {
        sendHtml(res, renderAdminVerificationsPage(auth.user));
        return;
      }
      if (pathname === '/admin/analytics') {
        sendHtml(res, renderAdminAnalyticsPage(auth.user));
        return;
      }
      if (pathname === '/admin/settings') {
        sendHtml(res, renderAdminSettingsPage(auth.user, flash));
        return;
      }
      if (pathname === '/admin/audit-logs') {
        sendHtml(res, renderAdminAuditLogsPage(auth.user));
        return;
      }
    }

    // 404 Not Found
    sendHtml(
      res,
      renderLandingPage(user, `Route ${pathname} was not found; redirected to Home.`),
      404
    );
  } catch (err     ) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>500 Internal Server Error</h1><pre>${String(err?.stack || err)}</pre>`);
  }
}

export function createAppServer()              {
  return http.createServer((req, res) => {
    void requestHandler(req, res);
  });
}

export default requestHandler;

if (
  !process.env.VERCEL &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME &&
  !process.argv.some((a) => a.includes('e2e-workflow.test'))
) {
  const port = Number(process.env.PORT || 3000);
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`SECOND LIFE Platform listening on http://localhost:${port}`);
  });
}
