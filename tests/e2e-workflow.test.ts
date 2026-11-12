// ============================================================================
// SECOND LIFE — Comprehensive End-to-End Automated QA & Security Test Suite
// ============================================================================

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type http from 'node:http';

// Use isolated in-memory SQLite database for automated test suite
process.env.SQLITE_DB_PATH = ':memory:';

import { requestHandler } from '../src/server.ts';
import { closeAndResetDbInstance, getDb } from '../src/lib/db.ts';

async function httpRequest(params: {
  path: string;
  method?: 'GET' | 'POST';
  cookie?: string;
  form?: Record<string, string>;
}): Promise<{ status: number; headers: Record<string, any>; body: string; setCookie?: string }> {
  const method = params.method || 'GET';
  const headers: Record<string, string> = { host: 'localhost:3000' };
  if (params.cookie) headers['cookie'] = params.cookie;

  let bodyStr = '';
  if (params.form) {
    bodyStr = new URLSearchParams(params.form).toString();
    headers['content-type'] = 'application/x-www-form-urlencoded';
    headers['content-length'] = String(Buffer.byteLength(bodyStr));
  }

  const reqStream = Readable.from(bodyStr ? [Buffer.from(bodyStr, 'utf-8')] : []);
  const req = Object.assign(reqStream, {
    url: params.path,
    method,
    headers
  }) as unknown as http.IncomingMessage;

  let statusCode = 200;
  const resHeaders: Record<string, any> = {};
  const chunks: Buffer[] = [];
  let ended = false;

  const res = {
    get statusCode() {
      return statusCode;
    },
    set statusCode(val: number) {
      statusCode = val;
    },
    get writableEnded() {
      return ended;
    },
    setHeader(name: string, value: any) {
      resHeaders[name.toLowerCase()] = value;
    },
    getHeader(name: string) {
      return resHeaders[name.toLowerCase()];
    },
    writeHead(code: number, hdrs?: Record<string, any>) {
      statusCode = code;
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) {
          resHeaders[k.toLowerCase()] = v;
        }
      }
      return this;
    },
    write(chunk: any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    },
    end(chunk?: any) {
      if (chunk !== undefined) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      ended = true;
    }
  } as unknown as http.ServerResponse;

  await requestHandler(req, res);

  const rawSetCookie = resHeaders['set-cookie'];
  let cookiePair: string | undefined;
  if (typeof rawSetCookie === 'string') {
    cookiePair = rawSetCookie.split(';')[0];
  } else if (Array.isArray(rawSetCookie) && rawSetCookie.length > 0) {
    cookiePair = String(rawSetCookie[0]).split(';')[0];
  }

  return {
    status: statusCode,
    headers: resHeaders,
    body: Buffer.concat(chunks).toString('utf-8'),
    setCookie: cookiePair
  };
}

describe('SECOND LIFE — End-to-End Platform, Workflow & Security QA Suite', () => {
  let adminCookie = '';
  let schoolAdminCookie = '';
  let mentorCookie = '';
  let otherSchoolMentorCookie = '';
  let studentCookie = '';
  let secondStudentCookie = '';
  let umkmCookie = '';

  let createdPortfolioId = '';
  let createdAssignmentId = '';
  let createdSubmissionId = '';
  let createdEvaluationId = '';
  let issuedPassportId = '';
  let issuedVerificationCode = '';

  before(async () => {
    getDb();
  });

  after(async () => {
    closeAndResetDbInstance();
  });

  it('1. Public Website & Production Data Integrity: starts with honest empty states and renders all public pages', async () => {
    const homeRes = await httpRequest({ path: '/' });
    assert.equal(homeRes.status, 200);
    assert.match(homeRes.body, /Your Schoolwork Deserves a Second Life\./);
    assert.match(homeRes.body, /No verified portfolios available yet\./);

    const aboutRes = await httpRequest({ path: '/about' });
    assert.equal(aboutRes.status, 200);
    assert.match(aboutRes.body, /SDG 8/);

    const howRes = await httpRequest({ path: '/how-it-works' });
    assert.equal(howRes.status, 200);
    assert.match(howRes.body, /Six-Stage Student Safety System/);

    const exploreRes = await httpRequest({ path: '/explore' });
    assert.equal(exploreRes.status, 200);
    assert.match(exploreRes.body, /No verified portfolios available yet\./);
  });

  it('2. Authentication & RBAC Protection: blocks unauthenticated access to all 5 role dashboards', async () => {
    for (const protectedRoute of [
      '/student/dashboard',
      '/business/dashboard',
      '/mentor/dashboard',
      '/school/dashboard',
      '/admin/dashboard'
    ]) {
      const res = await httpRequest({ path: protectedRoute });
      assert.equal(res.status, 302, `Expected 302 redirect for unauthenticated ${protectedRoute}`);
      assert.match(String(res.headers.location), /^\/login/);
    }
  });

  it('3. Platform Admin Login & School Onboarding: logs in as Admin and creates verified schools', async () => {
    const loginRes = await httpRequest({
      path: '/api/auth/login',
      method: 'POST',
      form: {
        email: 'admin@secondlife.id',
        password: 'AdminSecondLife!2026'
      }
    });
    assert.equal(loginRes.status, 303);
    assert.ok(loginRes.setCookie);
    adminCookie = loginRes.setCookie!;

    // Create School A (SMKN 1)
    const createSchoolA = await httpRequest({
      path: '/api/admin/schools/create',
      method: 'POST',
      cookie: adminCookie,
      form: {
        name: 'SMKN 1 Teknologi & Desain',
        npsn: '20260001',
        type: 'SMK',
        city: 'Bandung',
        province: 'Jawa Barat',
        contact_email: 'info@smkn1.sch.id',
        invite_code: 'SMKN1-2026'
      }
    });
    assert.equal(createSchoolA.status, 303);

    // Create School B (SMAN 2 — for cross-school isolation testing)
    const createSchoolB = await httpRequest({
      path: '/api/admin/schools/create',
      method: 'POST',
      cookie: adminCookie,
      form: {
        name: 'SMAN 2 Nusantara',
        npsn: '20260002',
        type: 'SMA',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        contact_email: 'info@sman2.sch.id',
        invite_code: 'SMAN2-2026'
      }
    });
    assert.equal(createSchoolB.status, 303);
  });

  it('4. Multi-Role Registration: registers Mentor, Students, UMKM, and School Admin with controlled validation', async () => {
    // Student registration without valid school invite code must fail
    const badStudent = await httpRequest({
      path: '/api/auth/register',
      method: 'POST',
      form: {
        role: 'STUDENT',
        full_name: 'Invalid Student',
        email: 'bad@student.id',
        password: 'Password123!',
        school_invite_code: 'INVALID-CODE'
      }
    });
    assert.equal(badStudent.status, 303);
    assert.match(String(badStudent.headers.location), /error=/);

    // Register Mentor for School A (SMKN1-2026)
    const regMentor = await httpRequest({
      path: '/api/auth/register',
      method: 'POST',
      form: {
        role: 'MENTOR',
        full_name: 'Ibu Dewi Sartika, S.Pd.',
        email: 'dewi.mentor@smkn1.sch.id',
        password: 'MentorPassword!2026',
        mentor_school_code: 'SMKN1-2026',
        subject_specialty: 'Desain Komunikasi Visual'
      }
    });
    assert.equal(regMentor.status, 303);
    mentorCookie = regMentor.setCookie!;

    // Register Mentor for School B (SMAN2-2026)
    const regOtherMentor = await httpRequest({
      path: '/api/auth/register',
      method: 'POST',
      form: {
        role: 'MENTOR',
        full_name: 'Pak Agus (Other School)',
        email: 'agus.mentor@sman2.sch.id',
        password: 'MentorPassword!2026',
        mentor_school_code: 'SMAN2-2026',
        subject_specialty: 'Multimedia'
      }
    });
    assert.equal(regOtherMentor.status, 303);
    otherSchoolMentorCookie = regOtherMentor.setCookie!;

    // Register Student 1 at School A
    const regStudent1 = await httpRequest({
      path: '/api/auth/register',
      method: 'POST',
      form: {
        role: 'STUDENT',
        full_name: 'Raka Pratama',
        email: 'raka.student@smkn1.sch.id',
        password: 'StudentPassword!2026',
        school_invite_code: 'SMKN1-2026',
        nisn: '0091234567',
        grade: 'Grade 11 (XI)',
        major: 'Desain Komunikasi Visual',
        guardian_name: 'Bapak Hendra Pratama'
      }
    });
    assert.equal(regStudent1.status, 303);
    studentCookie = regStudent1.setCookie!;

    // Register Student 2 at School A (for cross-student security tests)
    const regStudent2 = await httpRequest({
      path: '/api/auth/register',
      method: 'POST',
      form: {
        role: 'STUDENT',
        full_name: 'Sinta Maharani',
        email: 'sinta.student@smkn1.sch.id',
        password: 'StudentPassword!2026',
        school_invite_code: 'SMKN1-2026',
        nisn: '0097654321',
        grade: 'Grade 11 (XI)',
        major: 'Desain Komunikasi Visual',
        guardian_name: 'Ibu Maharani'
      }
    });
    assert.equal(regStudent2.status, 303);
    secondStudentCookie = regStudent2.setCookie!;

    // Register UMKM Partner
    const regUmkm = await httpRequest({
      path: '/api/auth/register',
      method: 'POST',
      form: {
        role: 'UMKM',
        full_name: 'Batik Loka Artisan',
        email: 'owner@batikloka.id',
        password: 'UmkmPassword!2026',
        business_name: 'Batik Loka Studio',
        business_category: 'Craft & Apparel UMKM',
        business_city: 'Bandung',
        business_description: 'Artisan batik studio looking for catalog layout support.'
      }
    });
    assert.equal(regUmkm.status, 303);
    umkmCookie = regUmkm.setCookie!;

    // Register School Admin
    const regSchoolAdmin = await httpRequest({
      path: '/api/auth/register',
      method: 'POST',
      form: {
        role: 'SCHOOL_ADMIN',
        full_name: 'Kepala Sekolah PKBM Mandiri',
        email: 'admin@pkbmmandiri.sch.id',
        password: 'SchoolPassword!2026',
        school_name: 'PKBM Mandiri Kreatif',
        npsn: '20269999',
        school_type: 'PKBM',
        school_city: 'Bandung',
        school_province: 'Jawa Barat'
      }
    });
    assert.equal(regSchoolAdmin.status, 303);
    schoolAdminCookie = regSchoolAdmin.setCookie!;
  });

  it('5. Portfolio Workflow (SHOW Stage) & Security Checks: upload, reject, edit/resubmit, cross-school block, and verify', async () => {
    // Student 1 uploads a portfolio
    const createRes = await httpRequest({
      path: '/api/student/portfolio/create',
      method: 'POST',
      cookie: studentCookie,
      form: {
        title: 'Batik Pattern Vector & 4-Page Lookbook',
        category: 'Simple Catalog Design',
        project_origin: 'Vocational Practicum',
        creation_date: '2026-10-05',
        skills: 'Simple Catalog Design, Graphic Design, Vector Illustration',
        description: 'Created a 4-page lookbook and vector motif sheet for Grade 11 DKV practicum.',
        is_collaborative: '0',
        student_contribution: 'Designed entire 4-page layout and vector ornaments.',
        file_name: 'batik-lookbook-practicum.pdf',
        preview_summary: '4-page A5 PDF lookbook',
        submit_immediately: '1',
        display_permission: '1',
        copyright_declaration: '1'
      }
    });
    assert.equal(createRes.status, 303);

    const db = getDb();
    const pRow = db.prepare('SELECT * FROM portfolios ORDER BY created_at DESC LIMIT 1').get() as Record<string, any>;
    assert.ok(pRow);
    createdPortfolioId = pRow.id;
    assert.equal(pRow.status, 'Submitted');

    // Security check: Unverified portfolio MUST NOT appear on public /explore
    const exploreBefore = await httpRequest({ path: '/explore' });
    assert.doesNotMatch(exploreBefore.body, /Batik Pattern Vector &amp; 4-Page Lookbook/);

    // Security check: Student cannot self-verify portfolio
    const selfVerifyAttempt = await httpRequest({
      path: '/api/student/portfolio/status',
      method: 'POST',
      cookie: studentCookie,
      form: {
        portfolio_id: createdPortfolioId,
        next_status: 'Verified'
      }
    });
    assert.equal(selfVerifyAttempt.status, 403);

    // Security check: Student 2 cannot edit Student 1's portfolio
    const crossStudentAttempt = await httpRequest({
      path: '/api/student/portfolio/update',
      method: 'POST',
      cookie: secondStudentCookie,
      form: {
        portfolio_id: createdPortfolioId,
        title: 'Hacked Title'
      }
    });
    assert.equal(crossStudentAttempt.status, 403);

    // Security check: Teacher from School B cannot verify School A's student portfolio
    const crossSchoolAttempt = await httpRequest({
      path: '/api/mentor/portfolio/verify',
      method: 'POST',
      cookie: otherSchoolMentorCookie,
      form: {
        portfolio_id: createdPortfolioId,
        decision: 'VERIFIED',
        notes: 'Unauthorized cross-school attempt'
      }
    });
    assert.equal(crossSchoolAttempt.status, 403);

    // Step A: School A Teacher rejects portfolio with explanation
    const rejectRes = await httpRequest({
      path: '/api/mentor/portfolio/verify',
      method: 'POST',
      cookie: mentorCookie,
      form: {
        portfolio_id: createdPortfolioId,
        decision: 'REJECTED',
        notes: 'Please clarify the dimensions and typography used on page 2.'
      }
    });
    assert.equal(rejectRes.status, 303);

    // Step B: Student 1 edits and resubmits the rejected portfolio
    const resubmitRes = await httpRequest({
      path: '/api/student/portfolio/update',
      method: 'POST',
      cookie: studentCookie,
      form: {
        portfolio_id: createdPortfolioId,
        title: 'Batik Pattern Vector & 4-Page A5 Lookbook (Revised)',
        description: 'Created an A5 (148x210mm) 4-page lookbook using Plus Jakarta Sans typography.',
        skills: 'Simple Catalog Design, Graphic Design, Typography',
        student_contribution: 'Individual work: full A5 grid, typography, and vector ornaments.',
        display_permission: '1',
        resubmit: '1'
      }
    });
    assert.equal(resubmitRes.status, 303);

    // Step C: School A Teacher approves and authorizes the resubmitted portfolio
    const approveRes = await httpRequest({
      path: '/api/mentor/portfolio/verify',
      method: 'POST',
      cookie: mentorCookie,
      form: {
        portfolio_id: createdPortfolioId,
        decision: 'VERIFIED',
        notes: 'Verified original DKV practicum work, student identity, and publication consent.'
      }
    });
    assert.equal(approveRes.status, 303);

    // Now the verified portfolio MUST appear on public /explore and /business/talent
    const exploreAfter = await httpRequest({ path: '/explore' });
    assert.match(exploreAfter.body, /Batik Pattern Vector &amp; 4-Page A5 Lookbook \(Revised\)/);

    const talentAfter = await httpRequest({ path: '/business/talent', cookie: umkmCookie });
    assert.equal(talentAfter.status, 200);
    assert.match(talentAfter.body, /Batik Pattern Vector &amp; 4-Page A5 Lookbook \(Revised\)/);
  });

  it('6. Complete 13-Step Assignment & Six-Stage Safety Workflow (TRY -> VERIFY -> PASSPORT)', async () => {
    const db = getDb();

    // Ethical Rule Check: Commercial assignment with 0 compensation must be rejected
    const unpaidCommercialRes = await httpRequest({
      path: '/api/business/assignments/create',
      method: 'POST',
      cookie: umkmCookie,
      form: {
        title: 'Unpaid Commercial Catalog',
        category: 'Simple Catalog Design',
        description: 'Commercial work with zero pay',
        commercial_usage_intention: '1',
        compensation_type: 'NON_MONETARY_LEARNING',
        compensation_amount_idr: '0'
      }
    });
    assert.equal(unpaidCommercialRes.status, 303);
    assert.match(String(unpaidCommercialRes.headers.location), /Ethical%20Policy%20Violation/);

    // Step 1: UMKM creates a valid commercial assignment with Rp300,000 compensation
    const createAsgRes = await httpRequest({
      path: '/api/business/assignments/create',
      method: 'POST',
      cookie: umkmCookie,
      form: {
        title: 'Batik Loka 4-Page Mini Collection Catalog',
        category: 'Simple Catalog Design',
        description: 'Layout a 4-page digital & print catalog for our 8 new batik motifs.',
        required_skills: 'Simple Catalog Design, Graphic Design',
        deliverables: '1x 4-page A5 PDF catalog',
        output_format: 'PDF',
        estimated_duration_hours: '8',
        start_date: '2026-11-12',
        deadline: '2026-11-22',
        max_revisions: '2',
        commercial_usage_intention: '1',
        compensation_type: 'MONETARY',
        compensation_amount_idr: '300000',
        compensation_details: 'Rp300,000 student stipend upon acceptance',
        copyright_licensing_terms: 'Non-exclusive commercial license upon payment; student keeps portfolio credit.',
        submit_mode: 'SUBMIT_FOR_REVIEW'
      }
    });
    assert.equal(createAsgRes.status, 303);

    const asgRow = db.prepare('SELECT * FROM assignments ORDER BY created_at DESC LIMIT 1').get() as Record<string, any>;
    assert.ok(asgRow);
    createdAssignmentId = asgRow.id;
    assert.equal(asgRow.status, 'Submitted for Admin Review');

    // Step 2: Platform Admin reviews and approves/publishes the assignment (Stage 2 Safety)
    const adminModRes = await httpRequest({
      path: '/api/admin/assignments/review',
      method: 'POST',
      cookie: adminCookie,
      form: {
        assignment_id: createdAssignmentId,
        decision: 'PUBLISH',
        reason: 'Verified student-safe 8h scope, max 2 revisions, and Rp300,000 compensation.'
      }
    });
    assert.equal(adminModRes.status, 303);

    // Step 3: Student discovers the published assignment
    const oppRes = await httpRequest({ path: `/student/opportunities/${createdAssignmentId}`, cookie: studentCookie });
    assert.equal(oppRes.status, 200);
    assert.match(oppRes.body, /Batik Loka 4-Page Mini Collection Catalog/);

    // Step 4: Student applies voluntarily with their verified portfolio
    const applyRes = await httpRequest({
      path: '/api/student/opportunities/apply',
      method: 'POST',
      cookie: studentCookie,
      form: {
        assignment_id: createdAssignmentId,
        portfolio_id: createdPortfolioId,
        motivation_note: 'My revised 4-page batik lookbook matches your exact A5 specification.',
        guardian_name: 'Bapak Hendra Pratama',
        voluntary_confirm: '1',
        schedule_confirm: '1'
      }
    });
    assert.equal(applyRes.status, 303);

    const appRow = db
      .prepare('SELECT * FROM assignment_applications WHERE assignment_id = ?')
      .get(createdAssignmentId) as Record<string, any>;
    assert.ok(appRow);

    // UMKM selects the student applicant to trigger Stage 3 Teacher Approval
    const selectRes = await httpRequest({
      path: '/api/business/assignments/select-student',
      method: 'POST',
      cookie: umkmCookie,
      form: {
        assignment_id: createdAssignmentId,
        application_id: appRow.id
      }
    });
    assert.equal(selectRes.status, 303);

    // Security check: Student cannot bypass Stage 3 approval to submit work prematurely!
    const prematureSubmit = await httpRequest({
      path: '/api/student/assignments/submit',
      method: 'POST',
      cookie: studentCookie,
      form: {
        assignment_id: createdAssignmentId,
        deliverable_summary: 'Premature submission',
        file_name: 'hack.pdf',
        submission_notes: 'Trying to skip teacher approval'
      }
    });
    assert.equal(prematureSubmit.status, 403);

    // Step 5 & 6: Teacher reviews participation, verifies Guardian Consent, and approves (Stage 3 Safety)
    const teacherApproveRes = await httpRequest({
      path: '/api/mentor/assignments/approve',
      method: 'POST',
      cookie: mentorCookie,
      form: {
        assignment_id: createdAssignmentId,
        decision: 'APPROVED',
        notes: 'Scope, schedule, Rp300,000 compensation, and guardian consent verified.'
      }
    });
    assert.equal(teacherApproveRes.status, 303);

    // Step 7: Student starts the supervised assignment (Ready to Start -> In Progress, Stage 4)
    const startRes = await httpRequest({
      path: '/api/student/assignments/start',
      method: 'POST',
      cookie: studentCookie,
      form: {
        assignment_id: createdAssignmentId
      }
    });
    assert.equal(startRes.status, 303);

    // Step 8: Student uploads Deliverable Version 1
    const submitV1Res = await httpRequest({
      path: '/api/student/assignments/submit',
      method: 'POST',
      cookie: studentCookie,
      form: {
        assignment_id: createdAssignmentId,
        deliverable_summary: 'Version 1 — 4-Page Batik Catalog Draft',
        file_name: 'batik-loka-catalog-v1.pdf',
        submission_notes: 'Completed initial 4-page layout with all 8 motifs.'
      }
    });
    assert.equal(submitV1Res.status, 303);

    const subRow = db.prepare('SELECT * FROM submissions WHERE assignment_id = ?').get(createdAssignmentId) as Record<string, any>;
    assert.ok(subRow);
    createdSubmissionId = subRow.id;
    assert.equal(subRow.current_version_number, 1);

    // Step 9: UMKM reviews v1 and requests a revision (1 of 2 allowed revisions)
    const revReqRes = await httpRequest({
      path: '/api/business/reviews/evaluate',
      method: 'POST',
      cookie: umkmCookie,
      form: {
        assignment_id: createdAssignmentId,
        submission_id: createdSubmissionId,
        relevance_score: '5',
        quality_score: '4',
        creativity_score: '5',
        technical_score: '4',
        timeliness_score: '5',
        outcome_decision: 'REVISION_REQUESTED',
        written_feedback: 'Great start! Please add washing care icons on page 4.'
      }
    });
    assert.equal(revReqRes.status, 303);

    // Step 10a: Student uploads Deliverable Version 2 (preserving Version 1 in history!)
    const submitV2Res = await httpRequest({
      path: '/api/student/assignments/submit',
      method: 'POST',
      cookie: studentCookie,
      form: {
        assignment_id: createdAssignmentId,
        deliverable_summary: 'Version 2 — Final Catalog with Washing Care Icons',
        file_name: 'batik-loka-catalog-v2-final.pdf',
        submission_notes: 'Added vector washing care icons on page 4 as requested.'
      }
    });
    assert.equal(submitV2Res.status, 303);

    const allVersions = db
      .prepare('SELECT * FROM submission_versions WHERE submission_id = ? ORDER BY version_number ASC')
      .all(createdSubmissionId) as Array<Record<string, any>>;
    assert.equal(allVersions.length, 2, 'Both v1 and v2 must be preserved in submission history');

    // Step 10b: UMKM evaluates v2 and ACCEPTS the completed work (Stage 5 Evaluation)
    const acceptRes = await httpRequest({
      path: '/api/business/reviews/evaluate',
      method: 'POST',
      cookie: umkmCookie,
      form: {
        assignment_id: createdAssignmentId,
        submission_id: createdSubmissionId,
        relevance_score: '5',
        quality_score: '5',
        creativity_score: '5',
        technical_score: '5',
        timeliness_score: '5',
        outcome_decision: 'ACCEPTED',
        written_feedback: 'Excellent work! The revised page 4 care guide is crystal clear and print-ready.'
      }
    });
    assert.equal(acceptRes.status, 303);

    const evalRow = db.prepare('SELECT * FROM evaluations WHERE assignment_id = ?').get(createdAssignmentId) as Record<string, any>;
    assert.ok(evalRow);
    createdEvaluationId = evalRow.id;

    // Step 11: Teacher / School reviews and verifies the final evidence (Stage 5 School Verification)
    const schoolVerRes = await httpRequest({
      path: '/api/mentor/experience/verify',
      method: 'POST',
      cookie: mentorCookie,
      form: {
        evaluation_id: createdEvaluationId,
        assignment_id: createdAssignmentId,
        school_verification_notes: 'Verified v1 & v2 submissions and UMKM evaluation.'
      }
    });
    assert.equal(schoolVerRes.status, 303);

    // Step 12: Platform Admin confirms compensation & copyright and closes the assignment (Stage 6 Closure)
    const closeRes = await httpRequest({
      path: '/api/admin/assignments/close',
      method: 'POST',
      cookie: adminCookie,
      form: {
        assignment_id: createdAssignmentId,
        settlement_reference: 'TRX-BATIKLOKA-300K-PAID'
      }
    });
    assert.equal(closeRes.status, 303);

    // Step 13: Verify Experience Passport was accurately generated and resolves publicly
    const passportRow = db
      .prepare('SELECT * FROM experience_passports WHERE assignment_id = ?')
      .get(createdAssignmentId) as Record<string, any>;
    assert.ok(passportRow);
    issuedPassportId = passportRow.id;
    issuedVerificationCode = passportRow.verification_code;
    assert.equal(passportRow.outcome_status, 'Completed and Accepted');
    assert.equal(passportRow.verification_status, 'VERIFIED_ISSUED');
    assert.equal(passportRow.overall_score, 5);

    // Verify Student Passport Detail Page renders printable PDF view
    const stuPassportPage = await httpRequest({
      path: `/student/passport/${issuedPassportId}`,
      cookie: studentCookie
    });
    assert.equal(stuPassportPage.status, 200);
    assert.match(stuPassportPage.body, new RegExp(issuedVerificationCode));
    assert.match(stuPassportPage.body, /Completed and Accepted/);

    // Verify Public Privacy-Safe Verification Resolver (/verify/:code)
    const publicVerifyPage = await httpRequest({
      path: `/verify/${issuedVerificationCode}`
    });
    assert.equal(publicVerifyPage.status, 200);
    assert.match(publicVerifyPage.body, /Raka Pratama/);
    assert.match(publicVerifyPage.body, /Batik Loka Studio/);
    assert.doesNotMatch(publicVerifyPage.body, /0091234567/, 'Private NISN must never be exposed on public verification page');
  });

  it('7. All Role Dashboards, Reports, CSV Exports & Audit Logs render 200 OK', async () => {
    const studentRoutes = [
      '/student/dashboard',
      '/student/portfolio',
      '/student/opportunities',
      '/student/assignments',
      '/student/submissions',
      '/student/passport',
      '/student/notifications',
      '/student/profile',
      '/student/support'
    ];
    for (const r of studentRoutes) {
      const res = await httpRequest({ path: r, cookie: studentCookie });
      assert.equal(res.status, 200, `Expected 200 on student route ${r}`);
    }

    const businessRoutes = [
      '/business/dashboard',
      '/business/talent',
      '/business/assignments/create',
      '/business/assignments',
      '/business/reviews',
      '/business/profile',
      '/business/notifications'
    ];
    for (const r of businessRoutes) {
      const res = await httpRequest({ path: r, cookie: umkmCookie });
      assert.equal(res.status, 200, `Expected 200 on UMKM route ${r}`);
    }

    const mentorRoutes = [
      '/mentor/dashboard',
      '/mentor/students',
      '/mentor/portfolio-review',
      '/mentor/approvals',
      '/mentor/supervision',
      '/mentor/submissions',
      '/mentor/experience-verification',
      '/mentor/reports',
      '/mentor/notifications'
    ];
    for (const r of mentorRoutes) {
      const res = await httpRequest({ path: r, cookie: mentorCookie });
      assert.equal(res.status, 200, `Expected 200 on Mentor route ${r}`);
    }

    const schoolRoutes = [
      '/school/dashboard',
      '/school/students',
      '/school/teachers',
      '/school/partners',
      '/school/portfolios',
      '/school/assignments',
      '/school/passports',
      '/school/reports',
      '/school/settings'
    ];
    for (const r of schoolRoutes) {
      const res = await httpRequest({ path: r, cookie: schoolAdminCookie });
      assert.equal(res.status, 200, `Expected 200 on School Admin route ${r}`);
    }

    const adminRoutes = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/schools',
      '/admin/businesses',
      '/admin/portfolios',
      '/admin/assignments',
      '/admin/safety',
      '/admin/verifications',
      '/admin/analytics',
      '/admin/settings',
      '/admin/audit-logs'
    ];
    for (const r of adminRoutes) {
      const res = await httpRequest({ path: r, cookie: adminCookie });
      assert.equal(res.status, 200, `Expected 200 on Platform Admin route ${r}`);
    }

    // Verify Financial Simulation label on /admin/analytics
    const analyticsRes = await httpRequest({ path: '/admin/analytics', cookie: adminCookie });
    assert.match(analyticsRes.body, /SIMULATION, NOT ACTUAL REVENUE/);

    // Verify CSV Export endpoint
    const csvRes = await httpRequest({ path: '/api/reports/export-csv?scope=platform', cookie: adminCookie });
    assert.equal(csvRes.status, 200);
    assert.match(csvRes.body, new RegExp(issuedVerificationCode));
  });

  it('8. Security & File Access Control: blocks unauthorized deliverable downloads and logs safety complaints', async () => {
    // Unauthenticated download of student deliverable must return 403
    const unauthDownload = await httpRequest({
      path: '/api/files/download?type=submission&id=nonexistent'
    });
    assert.equal(unauthDownload.status, 403);

    // Student files a safety complaint
    const complaintRes = await httpRequest({
      path: '/api/complaints/create',
      method: 'POST',
      cookie: studentCookie,
      form: {
        category: 'Scope Creep / Excessive Revisions',
        severity: 'HIGH',
        subject: 'Extra deliverable requested outside brief',
        description: 'Client asked for an extra banner not in the original agreement.',
        return_to: '/student/support'
      }
    });
    assert.equal(complaintRes.status, 303);

    const db = getDb();
    const cmp = db.prepare('SELECT * FROM complaints ORDER BY created_at DESC LIMIT 1').get() as Record<string, any>;
    assert.ok(cmp);
    assert.equal(cmp.status, 'OPEN');

    // Platform Admin resolves the safety complaint
    const resolveRes = await httpRequest({
      path: '/api/admin/safety/resolve',
      method: 'POST',
      cookie: adminCookie,
      form: {
        complaint_id: cmp.id,
        resolution_notes: 'Confirmed original scope limit with UMKM partner; student is only responsible for agreed deliverables.'
      }
    });
    assert.equal(resolveRes.status, 303);

    const resolvedCmp = db.prepare('SELECT * FROM complaints WHERE id = ?').get(cmp.id) as Record<string, any>;
    assert.equal(resolvedCmp.status, 'RESOLVED');
  });

  it('9. Demo Data Isolation & One-Click Reset: seeds labeled demo records without polluting production metrics and purges cleanly', async () => {
    const db = getDb();
    const prodAssignmentsBefore = (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE is_demo = 0').get() as { c: number }).c;

    // Enable and seed demo dataset
    const enableDemo = await httpRequest({
      path: '/api/system/demo-mode',
      method: 'POST',
      form: { action: 'enable_and_seed' }
    });
    assert.equal(enableDemo.status, 303);

    const demoAssignmentsCount = (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE is_demo = 1').get() as { c: number }).c;
    assert.ok(demoAssignmentsCount >= 3, 'Expected synthetic demo assignments to be seeded');

    const prodAssignmentsDuring = (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE is_demo = 0').get() as { c: number }).c;
    assert.equal(prodAssignmentsDuring, prodAssignmentsBefore, 'Production assignment count must remain untouched by demo data');

    // Disable and clear demo dataset
    const clearDemo = await httpRequest({
      path: '/api/system/demo-mode',
      method: 'POST',
      form: { action: 'disable_and_clear' }
    });
    assert.equal(clearDemo.status, 303);

    const demoAssignmentsAfter = (db.prepare('SELECT COUNT(*) as c FROM assignments WHERE is_demo = 1').get() as { c: number }).c;
    assert.equal(demoAssignmentsAfter, 0, 'All demo records must be purged on reset');
  });
});
