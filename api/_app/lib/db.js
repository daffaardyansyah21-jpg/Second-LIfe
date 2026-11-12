// ============================================================================
// SECOND LIFE — Relational Database Layer (SQLite / PostgreSQL Compatible)
// ============================================================================

                                                
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { EMBEDDED_SCHEMA_SQL } from './schema-sql.js';

let dbInstance                      = null;
let demoModeActive = false;

export function getProjectRoot()         {
  try {
    if (typeof import.meta?.dirname === 'string' && import.meta.dirname.length > 0) {
      return path.resolve(import.meta.dirname, '..', '..');
    }
  } catch {
    // Fallback to process.cwd() in bundled serverless environments
  }
  return process.cwd();
}

export function isServerlessRuntime()          {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.cwd().startsWith('/var/task')
  );
}

export function getUploadStorageDir()         {
  if (isServerlessRuntime()) {
    const tmpStorage = path.join(os.tmpdir(), 'second_life_uploads');
    if (!fs.existsSync(tmpStorage)) {
      fs.mkdirSync(tmpStorage, { recursive: true });
    }
    return tmpStorage;
  }
  const projectRoot = getProjectRoot();
  const localStorage = path.join(projectRoot, 'data', 'private_uploads');
  try {
    if (!fs.existsSync(localStorage)) {
      fs.mkdirSync(localStorage, { recursive: true });
    }
    return localStorage;
  } catch {
    const tmpStorage = path.join(os.tmpdir(), 'second_life_uploads');
    if (!fs.existsSync(tmpStorage)) {
      fs.mkdirSync(tmpStorage, { recursive: true });
    }
    return tmpStorage;
  }
}

export function isDemoMode()          {
  return demoModeActive;
}

export function setDemoMode(enabled         )       {
  demoModeActive = enabled;
}

export function hashPassword(password        )         {
  const salt = 'second-life-edtech-v1-salt';
  const derived = crypto.scryptSync(password, salt, 32).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password        , storedHash        )          {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(expectedHex, 'hex'));
}

export function getDb()               {
  if (dbInstance) return dbInstance;

  const projectRoot = getProjectRoot();
  const rawEnvPath = process.env.SQLITE_DB_PATH?.trim();
  let dbPath        ;

  if (rawEnvPath === ':memory:') {
    dbPath = ':memory:';
  } else if (isServerlessRuntime()) {
    dbPath = path.join(os.tmpdir(), 'second_life.sqlite');
  } else if (rawEnvPath) {
    dbPath = path.resolve(projectRoot, rawEnvPath);
  } else {
    dbPath = path.join(projectRoot, 'data', 'second_life.sqlite');
  }

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      dbPath = path.join(os.tmpdir(), 'second_life.sqlite');
    }
  }

  getUploadStorageDir();

  const sqliteBuiltin = (process       ).getBuiltinModule?.('node:sqlite');
  if (!sqliteBuiltin || !sqliteBuiltin.DatabaseSync) {
    throw new Error(
      `Node.js built-in 'node:sqlite' requires Node.js 22.x (current runtime: ${process.version}). In Vercel, set Project Settings -> General -> Node.js Version to 22.x.`
    );
  }

  dbInstance = new sqliteBuiltin.DatabaseSync(dbPath)                ;
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  try {
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  } catch {
    // Ignore WAL mode error on filesystems that do not support shared memory
  }

  const candidatePaths = [
    path.join(projectRoot, 'database', 'schema.sqlite.sql'),
    path.join(process.cwd(), 'database', 'schema.sqlite.sql')
  ];
  const schemaPath = candidatePaths.find((p) => fs.existsSync(p));
  const schemaSql = schemaPath ? fs.readFileSync(schemaPath, 'utf-8') : EMBEDDED_SCHEMA_SQL;
  dbInstance.exec(schemaSql);

  seedCoreRolesAndBootstrapAdmin(dbInstance);
  return dbInstance;
}

export function closeAndResetDbInstance()       {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function seedCoreRolesAndBootstrapAdmin(db              )       {
  const roles = [
    { id: 'STUDENT', name: 'STUDENT', description: 'SMA/SMK/PKBM Student' },
    { id: 'UMKM', name: 'UMKM', description: 'Small and Medium Enterprise Partner' },
    { id: 'MENTOR', name: 'MENTOR', description: 'Supervising School Teacher / Mentor' },
    { id: 'SCHOOL_ADMIN', name: 'SCHOOL_ADMIN', description: 'School / PKBM Institutional Administrator' },
    { id: 'PLATFORM_ADMIN', name: 'PLATFORM_ADMIN', description: 'SECOND LIFE Platform Administrator' }
  ];

  const insertRole = db.prepare(
    'INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)'
  );
  for (const r of roles) {
    insertRole.run(r.id, r.name, r.description);
  }

  // Bootstrap Platform Administrator account (required to approve initial schools & businesses)
  const adminExists = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get('admin@secondlife.id')                              ;

  if (!adminExists) {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role_id, school_id, status, is_demo)
       VALUES (?, ?, ?, ?, ?, NULL, 'ACTIVE', 0)`
    ).run(
      'usr-platform-admin-01',
      'admin@secondlife.id',
      hashPassword('AdminSecondLife!2026'),
      'System Platform Administrator',
      'PLATFORM_ADMIN'
    );
  }
}

/**
 * Seeds clearly labeled SYNTHETIC DEMO DATA (`is_demo = 1`) separated from
 * production records (`is_demo = 0`). Can be toggled or completely cleared at any time.
 */
export function seedLabeledDemoData()       {
  const db = getDb();
  clearLabeledDemoData();

  const pw = hashPassword('DemoPass!2026');

  // 1. Labeled Demo School
  db.prepare(
    `INSERT INTO schools (
      id, name, npsn, type, city, province, address, contact_email, contact_phone,
      principal_name, verification_status, invite_code, semester_label, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, 'Odd Semester 2026/2027', 1)`
  ).run(
    'sch-demo-01',
    '[DEMO] SMKN 1 Kreatif Nusantara',
    'DEMO-NPSN-101',
    'SMK',
    'Bandung',
    'Jawa Barat',
    'Jl. Pendidikan Vokasi No. 10 (Synthetic Demo Record)',
    'school.demo@secondlife.id',
    '022-5550101',
    'Drs. Hendra Wijaya, M.Pd. (Demo)',
    'SMKN1-DEMO-2026'
  );

  //Second Demo School for testing cross-school isolation
  db.prepare(
    `INSERT INTO schools (
      id, name, npsn, type, city, province, address, contact_email, contact_phone,
      principal_name, verification_status, invite_code, semester_label, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, 'Odd Semester 2026/2027', 1)`
  ).run(
    'sch-demo-02',
    '[DEMO] SMAN 4 Harapan Bangsa',
    'DEMO-NPSN-202',
    'SMA',
    'Surabaya',
    'Jawa Timur',
    'Jl. Pemuda No. 44 (Synthetic Demo Record)',
    'school2.demo@secondlife.id',
    '031-5550202',
    'Dra. Siti Rahmawati (Demo)',
    'SMAN4-DEMO-2026'
  );

  // 2. Demo Users
  const insertUser = db.prepare(
    `INSERT INTO users (id, email, password_hash, full_name, role_id, school_id, status, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1)`
  );

  insertUser.run('usr-demo-school-01', 'school.demo@secondlife.id', pw, 'Admin SMKN 1 Kreatif', 'SCHOOL_ADMIN', 'sch-demo-01');
  insertUser.run('usr-demo-mentor-01', 'mentor.demo@secondlife.id', pw, 'Ibu Ratna Sari, S.Pd.', 'MENTOR', 'sch-demo-01');
  insertUser.run('usr-demo-student-01', 'student.demo@secondlife.id', pw, 'Nadira Putri Pratama', 'STUDENT', 'sch-demo-01');
  insertUser.run('usr-demo-student-02', 'student2.demo@secondlife.id', pw, 'Bima Arya Kusuma', 'STUDENT', 'sch-demo-02');
  insertUser.run('usr-demo-umkm-01', 'umkm.demo@secondlife.id', pw, 'Kopi Senja Roastery (UMKM)', 'UMKM', null);

  // 3. Demo Teacher
  db.prepare(
    `INSERT INTO teachers (
      id, user_id, school_id, nip_or_nik, subject_specialty, phone_private,
      supervision_capacity, verification_status, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, 15, 'VERIFIED', 1)`
  ).run(
    'tch-demo-01',
    'usr-demo-mentor-01',
    'sch-demo-01',
    'DEMO-NIP-19880412',
    'Desain Komunikasi Visual (DKV)',
    'Dirahasiakan Sekolah'
  );

  // 4. Demo Students
  db.prepare(
    `INSERT INTO students (
      id, user_id, school_id, mentor_teacher_id, nisn, grade, major, skills_json,
      bio, contact_preference, public_portfolio_enabled, guardian_name,
      guardian_relationship, guardian_contact_private, identity_verified, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLATFORM_ONLY', 1, ?, 'Parent', ?, 1, 1)`
  ).run(
    'stu-demo-01',
    'usr-demo-student-01',
    'sch-demo-01',
    'tch-demo-01',
    'DEMO-NISN-0081',
    'Kelas 11 (XI)',
    'Desain Komunikasi Visual (DKV)',
    JSON.stringify(['Desain Grafis', 'Desain Katalog', 'Konten Media Sosial', 'Tipografi']),
    'Siswi kelas 11 jurusan DKV yang menyukai tata letak buku menu, ilustrasi kemasan produk, dan desain katalog usaha.',
    'Bapak Pratama',
    'Dirahasiakan Sekolah'
  );

  db.prepare(
    `INSERT INTO students (
      id, user_id, school_id, mentor_teacher_id, nisn, grade, major, skills_json,
      bio, contact_preference, public_portfolio_enabled, guardian_name,
      guardian_relationship, guardian_contact_private, identity_verified, is_demo
    ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 'PLATFORM_ONLY', 1, ?, 'Parent', ?, 1, 1)`
  ).run(
    'stu-demo-02',
    'usr-demo-student-02',
    'sch-demo-02',
    'DEMO-NISN-0082',
    'Kelas 12 (XII)',
    'Multimedia & Fotografi',
    JSON.stringify(['Fotografi Produk', 'Penyuntingan Video']),
    'Siswa kelas 12 yang gemar memotret produk makanan dan kerajinan tangan pada kegiatan bazar sekolah.',
    'Ibu Kusuma',
    'Dirahasiakan Sekolah'
  );

  // 5. Demo UMKM Business
  db.prepare(
    `INSERT INTO businesses (
      id, user_id, business_name, category, description, contact_email, contact_phone,
      city, address_optional, nib_or_reg_note, verification_status, verified_by_user_id,
      verified_at, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', 'usr-platform-admin-01', datetime('now'), 1)`
  ).run(
    'biz-demo-01',
    'usr-demo-umkm-01',
    'Kopi Senja Roastery & Bakery',
    'UMKM Kuliner & Kedai Kopi',
    'Usaha sangrai kopi lokal dan roti rumahan di Bandung yang membuka ruang belajar bagi siswa SMK untuk membantu merapikan katalog menu dan konten edukasi kopi.',
    'umkm.demo@secondlife.id',
    'Terverifikasi Platform',
    'Bandung',
    'Kota Bandung, Jawa Barat',
    'DEMO-NIB-912000123'
  );

  // 6. Demo Portfolios (SHOW stage: 1 Published & Verified, 1 Under School Review)
  db.prepare(
    `INSERT INTO portfolios (
      id, student_id, school_id, title, description, category, skills_json,
      creation_date, student_contribution, is_collaborative, project_origin,
      display_permission, school_display_authorized, copyright_declaration,
      status, reviewer_notes, reviewed_by_user_id, reviewed_at, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Vocational Practicum', 1, 1, 1, 'Published', ?, 'usr-demo-mentor-01', datetime('now'), 1)`
  ).run(
    'prt-demo-01',
    'stu-demo-01',
    'sch-demo-01',
    'Desain Kemasan Teh Herbal & Buklet Katalog 6 Halaman',
    'Tugas praktik sekolah merancang label kemasan kantong teh ramah lingkungan beserta buklet katalog produk 6 halaman ukuran A5 yang rapi dan siap cetak.',
    'Simple Catalog Design',
    JSON.stringify(['Desain Grafis', 'Desain Katalog', 'Tata Letak Cetak']),
    '2026-09-15',
    'Dikerjakan mandiri: membuat pola lipatan kemasan, ilustrasi daun teh, dan menyusun PDF siap cetak 6 halaman.',
    'Karya asli tugas praktik kelas 11 DKV, telah diperiksa dan disetujui guru pembimbing.'
  );

  db.prepare(
    `INSERT INTO portfolio_files (
      id, portfolio_id, file_name, file_type, mime_type, file_size_bytes,
      storage_key, preview_summary, is_demo
    ) VALUES (?, ?, ?, 'PDF', 'application/pdf', 1420800, 'demo/tea-catalog-practicum.pdf', ?, 1)`
  ).run(
    'pfile-demo-01',
    'prt-demo-01',
    'katalog-kemasan-teh-herbal.pdf',
    'Buklet katalog A5 6 halaman siap cetak & pola kemasan (Berkas Contoh)'
  );

  db.prepare(
    `INSERT INTO portfolio_verifications (
      id, portfolio_id, reviewer_user_id, reviewer_role, identity_verified,
      originality_verified, permission_verified, decision, notes, is_demo
    ) VALUES (?, 'prt-demo-01', 'usr-demo-mentor-01', 'MENTOR', 1, 1, 1, 'VERIFIED', ?, 1)`
  ).run(
    'pver-demo-01',
    'Identitas siswa, berkas kerja asli di kelas, dan izin tampil telah diperiksa oleh guru pembimbing.'
  );

  db.prepare(
    `INSERT INTO portfolios (
      id, student_id, school_id, title, description, category, skills_json,
      creation_date, student_contribution, is_collaborative, project_origin,
      display_permission, school_display_authorized, copyright_declaration,
      status, reviewer_notes, is_demo
    ) VALUES (?, 'stu-demo-01', 'sch-demo-01', ?, ?, 'Graphic Design', ?, '2026-10-10', ?, 1, 'School Competition', 1, 0, 1, 'Under School Review', NULL, 1)`
  ).run(
    'prt-demo-02',
    'Seri Poster Pekan Literasi Perpustakaan Sekolah',
    'Rangkaian 3 poster bertema minat baca untuk kegiatan tahunan perpustakaan sekolah.',
    JSON.stringify(['Desain Grafis', 'Tipografi', 'Konten Media Sosial']),
    'Dikerjakan berdua bersama teman sekelas; saya menyusun tata letak utama, judul poster, dan ukuran unggahan media sosial.'
  );

  db.prepare(
    `INSERT INTO portfolio_files (
      id, portfolio_id, file_name, file_type, mime_type, file_size_bytes,
      storage_key, preview_summary, is_demo
    ) VALUES ('pfile-demo-02', 'prt-demo-02', 'poster-pekan-literasi.png', 'PNG', 'image/png', 890400, 'demo/literacy-posters.png', 'Pratinjau rangkaian poster resolusi tinggi (Berkas Contoh)', 1)`
  ).run();

  // 7. Demo Assignments:
  // Assignment A: Completed & Closed (demonstrates full 6-stage safety workflow & Verified Experience Passport)
  db.prepare(
    `INSERT INTO assignments (
      id, business_id, title, category, description, required_skills_json,
      deliverables, output_format, estimated_duration_hours, start_date, deadline,
      max_revisions, evaluation_criteria_json, compensation_type, compensation_amount_idr,
      compensation_details, commercial_usage_intention, copyright_licensing_terms,
      additional_instructions, mentor_requirements, status, current_safety_stage,
      selected_student_id, assigned_teacher_id, assigned_school_id, admin_review_notes, is_demo
    ) VALUES (
      'asg-demo-01', 'biz-demo-01',
      'Desain Buku Menu Minuman Musiman & Katalog Mini 4 Halaman',
      'Simple Catalog Design',
      'Merapikan tata letak katalog minuman dan roti ukuran A5 sebanyak 4 halaman menggunakan foto serta daftar harga yang sudah disiapkan oleh Kopi Senja Roastery.',
      ?, '1 berkas PDF katalog A5 4 halaman siap cetak + berkas sumber desain', 'PDF & Pratinjau PNG',
      10, '2026-10-01', '2026-10-12', 2, ?,
      'MONETARY', 350000,
      'Uang apresiasi belajar Rp350.000 setelah hasil karya diterima',
      1, 'Hak pakai cetak dan menu digital diberikan kepada UMKM setelah uang apresiasi diterima siswa; nama siswa tetap tercantum di portofolio.',
      'Seluruh komunikasi dilakukan di dalam platform dengan pendampingan guru. Tidak ada pertemuan di luar sekolah.',
      'Didampingi oleh Guru Pembimbing DKV SMKN 1 Kreatif Nusantara',
      'Closed', 6, 'stu-demo-01', 'tch-demo-01', 'sch-demo-01',
      'Disetujui Pengelola: beban waktu wajar (10 jam), batas revisi maksimal 2 kali, dan uang apresiasi Rp350.000 jelas.',
      1
    )`
  ).run(
    JSON.stringify(['Desain Katalog', 'Desain Grafis', 'Tipografi']),
    JSON.stringify(['Kesesuaian dengan Arahan', 'Kerapian Hasil', 'Kreativitas', 'Keterampilan Teknis', 'Ketepatan Waktu'])
  );

  // Supporting 6-Stage Safety Records for Assignment A (`asg-demo-01`)
  db.prepare(
    `INSERT INTO assignment_applications (
      id, assignment_id, student_id, portfolio_id, motivation_note,
      student_voluntary_confirm, schedule_compatibility_confirm, status, is_demo
    ) VALUES (
      'app-demo-01', 'asg-demo-01', 'stu-demo-01', 'prt-demo-01',
      'Saya pernah membuat buklet katalog teh 6 halaman ukuran A5 di tugas praktik sekolah, sehingga sudah terbiasa menyusun daftar menu yang rapi.',
      1, 1, 'APPROVED', 1
    )`
  ).run();

  db.prepare(
    `INSERT INTO teacher_approvals (
      id, assignment_id, teacher_id, student_id, scope_suitable, skill_suitable,
      schedule_compatible, deadline_reasonable, revision_limit_fair, compensation_fair,
      safety_verified, decision, notes, is_demo
    ) VALUES (
      'tap-demo-01', 'asg-demo-01', 'tch-demo-01', 'stu-demo-01',
      1, 1, 1, 1, 1, 1, 1, 'APPROVED',
      'Beban pengerjaan 10 jam dalam 11 hari sangat wajar, sesuai dengan materi tata letak kelas 11 DKV, dan tidak bentrok dengan jadwal ujian sekolah.',
      1
    )`
  ).run();

  db.prepare(
    `INSERT INTO guardian_consents (
      id, assignment_id, student_id, guardian_name, guardian_relationship,
      consent_statement, consent_status, verified_by_teacher_id, consented_at, is_demo
    ) VALUES (
      'gcn-demo-01', 'asg-demo-01', 'stu-demo-01',
      'Bapak Pratama (Orang Tua)', 'Parent',
      'Saya mengizinkan Nadira mengikuti tugas desain katalog ini secara daring dari rumah dengan pendampingan guru sekolah.',
      'APPROVED', 'tch-demo-01', datetime('now'), 1
    )`
  ).run();

  db.prepare(
    `INSERT INTO assignment_agreements (
      id, assignment_id, student_id, business_id, school_id,
      agreed_deliverables, agreed_deadline, agreed_max_revisions,
      agreed_compensation_type, agreed_compensation_amount_idr,
      student_signed_at, business_signed_at, teacher_approved_at, guardian_consented_at, is_demo
    ) VALUES (
      'agr-demo-01', 'asg-demo-01', 'stu-demo-01', 'biz-demo-01', 'sch-demo-01',
      '1 berkas PDF katalog A5 4 halaman siap cetak + 1 lembar pratinjau PNG', '2026-10-12', 2,
      'MONETARY', 350000, datetime('now'), datetime('now'), datetime('now'), datetime('now'), 1
    )`
  ).run();

  db.prepare(
    `INSERT INTO assignment_progress (
      id, assignment_id, actor_user_id, actor_role, milestone_title,
      progress_note, progress_percent, flagged_safety_concern, is_demo
    ) VALUES
      ('prg-demo-01', 'asg-demo-01', 'usr-demo-student-01', 'STUDENT', 'Kerangka Tata Letak & Pilihan Huruf', 'Mengunggah draf susunan 4 halaman dan pilihan jenis huruf untuk diperiksa guru pembimbing.', 50, 0, 1),
      ('prg-demo-02', 'asg-demo-01', 'usr-demo-mentor-01', 'MENTOR', 'Pemeriksaan Guru Pembimbing', 'Batas tepi cetak sudah rapi dan pengerjaan berjalan sesuai jadwal.', 75, 0, 1),
      ('prg-demo-03', 'asg-demo-01', 'usr-demo-student-01', 'STUDENT', 'Berkas PDF Akhir Siap Cetak', 'Menyelesaikan berkas akhir PDF ukuran A5 siap cetak.', 100, 0, 1)`
  ).run();

  db.prepare(
    `INSERT INTO submissions (
      id, assignment_id, student_id, current_version_number, revisions_used, status, is_demo
    ) VALUES ('sub-demo-01', 'asg-demo-01', 'stu-demo-01', 2, 1, 'ACCEPTED', 1)`
  ).run();

  db.prepare(
    `INSERT INTO submission_versions (
      id, submission_id, assignment_id, version_number, deliverable_summary,
      submission_notes, file_name, file_type, file_size_bytes, storage_key,
      review_status, umkm_feedback, submitted_at, reviewed_at, is_demo
    ) VALUES
      ('subv-demo-01', 'sub-demo-01', 'asg-demo-01', 1,
       'Versi 1 — Draf Awal Katalog Menu A5 4 Halaman',
       'Susunan awal mencakup 12 menu minuman beserta tabel harga.',
       'katalog-kopi-senja-v1.pdf', 'PDF', 1150000, 'demo/kopi-senja-v1.pdf',
       'REVISION_REQUESTED',
       'Tata letaknya sudah bagus sekali! Tolong perbesar sedikit ukuran tulisan keterangan bahan alergi di halaman 4 agar lebih mudah dibaca pelanggan.',
       '2026-10-08 14:00:00', '2026-10-09 10:00:00', 1),
      ('subv-demo-02', 'sub-demo-01', 'asg-demo-01', 2,
       'Versi 2 — Katalog Akhir A5 Siap Cetak (Perbaikan Ukuran Huruf)',
       'Ukuran keterangan bahan sudah diperbesar menjadi 10pt tebal dan diekspor ke PDF siap cetak.',
       'katalog-kopi-senja-v2-final.pdf', 'PDF', 1210000, 'demo/kopi-senja-v2.pdf',
       'ACCEPTED',
       'Sangat rapi, mudah dibaca, dan langsung siap kami cetak. Terima kasih banyak!',
       '2026-10-10 16:30:00', '2026-10-11 09:15:00', 1)`
  ).run();

  db.prepare(
    `INSERT INTO evaluations (
      id, assignment_id, submission_id, business_id, student_id,
      relevance_score, quality_score, creativity_score, technical_score, timeliness_score,
      written_feedback, outcome_decision, school_monitored_by_user_id,
      school_monitored_at, school_verification_notes, is_demo
    ) VALUES (
      'evl-demo-01', 'asg-demo-01', 'sub-demo-01', 'biz-demo-01', 'stu-demo-01',
      5, 5, 4, 5, 5,
      'Nadira mengikuti arahan produk kami dengan sangat teliti, merespons masukan revisi ukuran huruf dengan cepat, dan menyerahkan berkas siap cetak sebelum tenggat waktu.',
      'ACCEPTED', 'usr-demo-mentor-01', datetime('now'),
      'Guru pembimbing telah memeriksa hasil penilaian UMKM serta bukti unggahan karya versi 1 dan versi 2.',
      1
    )`
  ).run();

  db.prepare(
    `INSERT INTO compensation_records (
      id, assignment_id, business_id, student_id, compensation_type,
      amount_idr, description, status, settlement_reference, confirmed_by_admin_id, confirmed_at, is_demo
    ) VALUES (
      'cmp-demo-01', 'asg-demo-01', 'biz-demo-01', 'stu-demo-01',
      'MONETARY', 350000, 'Uang apresiasi karya komersial Rp350.000',
      'CONFIRMED_BY_SCHOOL', 'DEMO-TRX-20261012-01', 'usr-platform-admin-01', datetime('now'), 1
    )`
  ).run();

  db.prepare(
    `INSERT INTO copyright_agreements (
      id, assignment_id, student_id, business_id, license_scope,
      commercial_rights_granted, student_portfolio_attribution_allowed,
      rights_transfer_status, confirmed_at, is_demo
    ) VALUES (
      'cpr-demo-01', 'asg-demo-01', 'stu-demo-01', 'biz-demo-01',
      'Izin penggunaan cetak dan menu digital non-eksklusif untuk Kopi Senja Roastery; siswa tetap memegang hak pencantuman nama pada portofolio dan sertifikat.',
      1, 1, 'LICENSED_TO_UMKM_UPON_COMPENSATION', datetime('now'), 1
    )`
  ).run();

  db.prepare(
    `INSERT INTO experience_passports (
      id, verification_code, student_id, school_id, assignment_id, portfolio_id,
      submission_id, evaluation_id, business_name, assignment_title, assignment_description,
      skills_demonstrated_json, deliverables_summary, completion_date,
      umkm_evaluation_summary, overall_score, teacher_verifier_name, school_name,
      compensation_summary, outcome_status, verification_status, admin_closed_by_user_id, is_demo
    ) VALUES (
      'psp-demo-01', 'SL-DEMO-2026-0001', 'stu-demo-01', 'sch-demo-01', 'asg-demo-01', 'prt-demo-01',
      'sub-demo-01', 'evl-demo-01',
      'Kopi Senja Roastery & Bakery',
      'Desain Buku Menu Minuman Musiman & Katalog Mini 4 Halaman',
      'Merancang katalog minuman dan roti ukuran A5 4 halaman siap cetak di bawah bimbingan guru sekolah.',
      ?, 'Katalog PDF A5 4 halaman siap cetak (draf v1 + hasil akhir v2 diterima UMKM)',
      '2026-10-12',
      'Mengikuti arahan dengan teliti, menyelesaikan 1 kali revisi ukuran huruf dengan rapi, dan mengumpulkan berkas tepat waktu.',
      4.8,
      'Ibu Ratna Sari, S.Pd.',
      'SMKN 1 Kreatif Nusantara',
      'Apresiasi Finansial Diterima Siswa (Rp350.000)',
      'Completed and Accepted',
      'VERIFIED_ISSUED',
      'usr-platform-admin-01',
      1
    )`
  ).run(JSON.stringify(['Desain Katalog', 'Desain Grafis', 'Tipografi']));

  // Assignment B: Published Opportunity (open for student applications in TRY stage)
  db.prepare(
    `INSERT INTO assignments (
      id, business_id, title, category, description, required_skills_json,
      deliverables, output_format, estimated_duration_hours, start_date, deadline,
      max_revisions, evaluation_criteria_json, compensation_type, compensation_amount_idr,
      compensation_details, commercial_usage_intention, copyright_licensing_terms,
      additional_instructions, mentor_requirements, status, current_safety_stage,
      admin_review_notes, is_demo
    ) VALUES (
      'asg-demo-02', 'biz-demo-01',
      'Desain 5 Slide Konten Edukasi Kopi Lokal untuk Instagram',
      'Social Media Content',
      'Membuat 5 slide gambar informasi singkat yang mengenalkan perbedaan biji kopi Arabika dan Robusta Nusantara untuk pelanggan kedai.',
      ?, '5 gambar ukuran 1080x1350px (PNG) beserta berkas desainnya', 'PNG & PDF',
      6, '2026-11-15', '2026-11-25', 2, ?,
      'MONETARY', 250000,
      'Uang apresiasi pelajar Rp250.000 setelah tugas selesai',
      1, 'Izin tayang di media sosial kedai setelah apresiasi diberikan; nama siswa tetap dicantumkan sebagai pembuat karya.',
      'Bahan tulisan dan foto biji kopi sudah disediakan oleh pihak kedai. Dikerjakan secara daring dengan pendampingan guru.',
      'Memerlukan persetujuan guru pembimbing dan izin orang tua sebelum dimulai',
      'Published', 2,
      'Telah diperiksa dan disetujui oleh Pengelola Platform.',
      1
    )`
  ).run(
    JSON.stringify(['Konten Media Sosial', 'Desain Grafis', 'Penulisan Ringan']),
    JSON.stringify(['Kesesuaian dengan Arahan', 'Kerapian Hasil', 'Kreativitas', 'Keterampilan Teknis', 'Ketepatan Waktu'])
  );

  // Assignment C: Cancelled assignment (honestly recorded in Passport per Section 4 Page 6 rules!)
  db.prepare(
    `INSERT INTO assignments (
      id, business_id, title, category, description, required_skills_json,
      deliverables, output_format, estimated_duration_hours, start_date, deadline,
      max_revisions, evaluation_criteria_json, compensation_type, compensation_amount_idr,
      compensation_details, commercial_usage_intention, copyright_licensing_terms,
      additional_instructions, mentor_requirements, status, current_safety_stage,
      selected_student_id, assigned_teacher_id, assigned_school_id, admin_review_notes, is_demo
    ) VALUES (
      'asg-demo-03', 'biz-demo-01',
      'Desain Label Stiker Bingkisan Hari Raya (Dibatalkan karena Perubahan Jadwal UMKM)',
      'Graphic Design',
      'Pembuatan label stiker dibatalkan sebelum pengumpulan berkas karena pihak UMKM menunda jadwal produksi kemasan.',
      ?, '2 Desain Label Stiker', 'PDF',
      4, '2026-09-20', '2026-09-28', 1, ?,
      'NON_MONETARY_LEARNING', 0,
      'Latihan pembelajaran non-komersial (dibatalkan sebelum selesai)',
      0, 'Seluruh hak karya tetap milik siswa.',
      'Dicatat secara jujur sesuai status aslinya.',
      'Didampingi guru pembimbing',
      'Cancelled', 6, 'stu-demo-01', 'tch-demo-01', 'sch-demo-01',
      'Ditutup dengan status Dibatalkan; tidak digunakan untuk keperluan komersial.',
      1
    )`
  ).run(
    JSON.stringify(['Desain Grafis']),
    JSON.stringify(['Kesesuaian dengan Arahan', 'Kerapian Hasil'])
  );

  db.prepare(
    `INSERT INTO experience_passports (
      id, verification_code, student_id, school_id, assignment_id, portfolio_id,
      submission_id, evaluation_id, business_name, assignment_title, assignment_description,
      skills_demonstrated_json, deliverables_summary, completion_date,
      umkm_evaluation_summary, overall_score, teacher_verifier_name, school_name,
      compensation_summary, outcome_status, verification_status, admin_closed_by_user_id, is_demo
    ) VALUES (
      'psp-demo-02', 'SL-DEMO-2026-0002', 'stu-demo-01', 'sch-demo-01', 'asg-demo-03', 'prt-demo-01',
      NULL, NULL,
      'Kopi Senja Roastery & Bakery',
      'Desain Label Stiker Bingkisan Hari Raya (Dibatalkan karena Perubahan Jadwal UMKM)',
      'Penugasan dibatalkan oleh pihak UMKM sebelum pengumpulan akhir karena keterlambatan pemasok kemasan.',
      ?, 'Tidak ada berkas akhir yang diserahkan (Penugasan Dibatalkan)',
      '2026-09-25',
      'Penugasan dibatalkan sebelum tahap penilaian. Dicatat secara jujur sebagai Dibatalkan (bukan klaim sertifikat kelulusan).',
      NULL,
      'Ibu Ratna Sari, S.Pd.',
      'SMKN 1 Kreatif Nusantara',
      'Tidak Berlaku (Dibatalkan)',
      'Cancelled',
      'RECORDED_UNSUCCESSFUL',
      'usr-platform-admin-01',
      1
    )`
  ).run(JSON.stringify(['Desain Grafis']));

  // 8. Demo Notifications
  db.prepare(
    `INSERT INTO notifications (id, user_id, event_type, title, message, link_url, is_read, is_demo)
     VALUES
      ('ntf-demo-01', 'usr-demo-student-01', 'PASSPORT_VERIFIED', 'Sertifikat Pengalaman Kerja Terbit', 'Tugas Desain Buku Menu Minuman Musiman Anda telah disahkan dan tercatat di Sertifikat Pengalaman Kerja.', '/student/passport/psp-demo-01', 0, 1),
      ('ntf-demo-02', 'usr-demo-student-01', 'NEW_OPPORTUNITY', 'Lowongan Tugas UMKM Baru Tersedia', 'Kopi Senja Roastery membuka tugas: Desain 5 Slide Konten Edukasi Kopi Lokal.', '/student/opportunities/asg-demo-02', 0, 1),
      ('ntf-demo-03', 'usr-demo-mentor-01', 'PORTFOLIO_REVIEW', 'Karya Siswa Menunggu Pemeriksaan Guru', 'Nadira mengajukan karya Seri Poster Pekan Literasi Perpustakaan Sekolah untuk diperiksa.', '/mentor/portfolio-review', 0, 1)`
  ).run();

  // 9. Demo Audit Log
  db.prepare(
    `INSERT INTO audit_logs (
      id, actor_user_id, actor_name, actor_role, action, target_entity, target_id,
      previous_state, new_state, reason, is_demo
    ) VALUES (
      'aud-demo-01', 'usr-platform-admin-01', 'System Platform Administrator', 'PLATFORM_ADMIN',
      'CLOSE_ASSIGNMENT_AND_ISSUE_PASSPORT', 'assignments', 'asg-demo-01',
      'School Verification', 'Closed',
      '[DEMO] Verified all 6 safety stages, UMKM evaluation, teacher verification, and Rp350,000 compensation settlement.',
      1
    )`
  ).run();
}

export function clearLabeledDemoData()       {
  const db = getDb();
  const tablesInDeleteOrder = [
    'audit_logs',
    'complaints',
    'notifications',
    'experience_passports',
    'copyright_agreements',
    'compensation_records',
    'evaluations',
    'submission_versions',
    'submissions',
    'assignment_progress',
    'teacher_approvals',
    'guardian_consents',
    'assignment_agreements',
    'assignment_applications',
    'assignments',
    'portfolio_verifications',
    'portfolio_files',
    'portfolios',
    'businesses',
    'students',
    'teachers',
    'users',
    'schools'
  ];

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const table of tablesInDeleteOrder) {
      db.prepare(`DELETE FROM ${table} WHERE is_demo = 1`).run();
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
