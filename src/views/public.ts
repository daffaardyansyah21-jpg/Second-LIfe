// ============================================================================
// SECOND LIFE — Fresh & Elegant MagangHub-Inspired Public Website Pages
// (Landing, About, How It Works, Explore, Authentication, Safety & Verify)
// ============================================================================

import { getDb, isDemoMode } from '../lib/db.ts';
import { APPROVED_ASSIGNMENT_CATEGORIES, SIX_STAGE_SAFETY_SYSTEM } from '../types/domain.ts';
import type { SessionUser } from '../types/domain.ts';
import { demoBadge, escapeHtml, formatIdr, icon, renderPublicLayout, renderSecondLifeLogo, safeJsonParse, statusBadge, translateCategory } from './layout.ts';

export function renderLandingPage(user: SessionUser | null, flash?: string | null): string {
  const db = getDb();
  const demoFilter = isDemoMode() ? '' : 'AND p.is_demo = 0';

  const featuredPortfolios = db
    .prepare(
      `SELECT
         p.id, p.title, p.description, p.category, p.skills_json, p.project_origin,
         p.creation_date, p.status, p.is_demo,
         u.full_name as student_name, stu.grade, stu.major,
         s.name as school_name, s.city as school_city
       FROM portfolios p
       JOIN students stu ON stu.id = p.student_id
       JOIN users u ON u.id = stu.user_id
       JOIN schools s ON s.id = p.school_id
       WHERE p.status = 'Published'
         AND p.display_permission = 1
         AND p.school_display_authorized = 1
         AND stu.public_portfolio_enabled = 1
         AND p.deleted_at IS NULL
         ${demoFilter}
       ORDER BY p.created_at DESC
       LIMIT 6`
    )
    .all() as Array<Record<string, any>>;

  const content = `
    <!-- 1. HERO SECTION: FOKUS EKSPLORASI MINAT & BAKAT SISWA TANPA IKON PENUTUP FOTO -->
    <section class="mh-hero" data-tagline="Your Schoolwork Deserves a Second Life.">
      <div class="mh-hero-inner">
        <!-- Kolom Kiri: Pesan Utama yang Natural & Membumi -->
        <div class="mh-hero-copy">
          <div class="mh-status-pill">
            <span class="mh-status-dot"></span>
            <span>WADAH MINAT &amp; BAKAT SISWA SMA / SMK</span>
          </div>

          <h1 class="mh-hero-title">
            Kenali Minatmu di Sekolah,<br />
            <span class="gold-highlight">Salurkan Bakatmu</span> ke Dunia Kerja.
          </h1>

          <p class="mh-hero-lead">
            Punya karya desain, foto produk, video pendek, atau tulisan dari tugas sekolah? Di SecondLife, kamu bisa menyalurkan minat dan bakatmu lewat proyek ringan bersama UMKM—didampingi langsung oleh guru pembimbing hingga meraih Sertifikat Pengalaman Kerja pertamamu.
          </p>

          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <a href="/explore" class="btn btn-gold btn-pill" style="padding:13px 28px;font-size:15px;">
              ${icon('compass', 18)} Lihat Karya Siswa
            </a>
            <a href="/register" class="btn btn-pill" style="padding:13px 26px;font-size:15px;background:rgba(255,255,255,0.12);color:#FFFFFF;border:1px solid rgba(255,255,255,0.28);font-weight:500;">
              Mulai Bergabung ${icon('arrowRight', 17)}
            </a>
          </div>

          <!-- Poin Keunggulan di Bawah Tombol (Tidak Menutupi Foto Siswa) -->
          <div class="hero-trust-strip">
            <span class="hero-trust-item">
              <span style="color:#FDE08D;">${icon('checkCircle', 16)}</span>
              <span>Dibimbing Guru Sekolah</span>
            </span>
            <span class="hero-trust-item">
              <span style="color:#FDE08D;">${icon('checkCircle', 16)}</span>
              <span>Tugas Ringan Sesuai Minat</span>
            </span>
            <span class="hero-trust-item">
              <span style="color:#FDE08D;">${icon('checkCircle', 16)}</span>
              <span>Sertifikat Pengalaman Kerja Resmi</span>
            </span>
          </div>
        </div>

        <!-- Kolom Kanan: Foto Siswa Sejajar Pandangan Mata & Bersih Tanpa Ikon Penutup -->
        <div class="mh-showcase-stage">
          <div class="mh-portrait-frame">
            <div class="mh-portrait-topbar">
              <div class="mh-portrait-dots">
                <span style="background:#F472B6;"></span>
                <span style="background:#FDE08D;"></span>
                <span style="background:#34D399;"></span>
              </div>
              <span>Galeri Karya Siswa SMA / SMK Terverifikasi</span>
            </div>
            <img
              src="/assets/hero-students.jpg"
              alt="Siswa SMA dan SMK Indonesia menunjukkan karya sekolah mereka"
              class="mh-portrait-photo"
            />
            <div class="mh-portrait-caption">
              <span>${icon('graduationCap', 15)} Karya nyata siswa SMA &amp; SMK Indonesia</span>
              <span style="color:#FDE08D;font-weight:600;">Siap Terjun ke Dunia Kerja</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- BILAH PENCARIAN KARYA & MINAT SISWA -->
    <div class="mh-search-bridge">
      <div class="mh-search-box">
        <form method="GET" action="/explore" style="display:grid;grid-template-columns:1.6fr 1fr auto;gap:14px;align-items:center;">
          <div style="position:relative;">
            <input type="text" name="q" class="form-control" style="padding-left:16px;height:46px;border-radius:999px;" placeholder="Cari karya atau bidang minat siswa (contoh: Desain Kemasan, Foto Produk, Katalog)..." />
          </div>
          <div>
            <select name="category" class="form-control" style="height:46px;border-radius:999px;">
              <option value="">Semua Bidang Minat &amp; Bakat</option>
              ${APPROVED_ASSIGNMENT_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(translateCategory(c))}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="height:46px;padding:0 26px;">
            ${icon('search', 16)} Temukan Karya
          </button>
        </form>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;font-size:12px;">
          <span style="color:var(--brand-muted-gray);font-weight:600;">Bidang Minat Populer:</span>
          ${APPROVED_ASSIGNMENT_CATEGORIES.slice(0, 6)
            .map(
              (cat) =>
                `<a href="/explore?category=${encodeURIComponent(cat)}" style="padding:4px 12px;border-radius:999px;background:var(--brand-warm-ivory);border:1px solid var(--border-subtle);color:var(--brand-charcoal);font-weight:600;font-size:11.5px;">${escapeHtml(translateCategory(cat))}</a>`
            )
            .join('')}
        </div>
      </div>
    </div>

    <!-- 2. JALUR EKSPLORASI MINAT & BAKAT SISWA KE DUNIA KERJA (EDITORIAL PATHWAY SHOWCASE) -->
    <section style="padding:84px 0 64px;">
      <div class="container">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:20px;margin-bottom:32px;">
          <div style="max-width:660px;">
            <span class="section-eyebrow">${icon('compass', 13)} EKSPLORASI MINAT &amp; BAKAT</span>
            <h2 style="font-size:32px;font-weight:800;margin:0 0 10px;letter-spacing:-0.025em;">
              Bagaimana Hobi dan Tugas Sekolahmu Tersalurkan ke Dunia Kerja?
            </h2>
            <p style="color:#475569;font-size:15.5px;margin:0;">
              Banyak siswa bingung harus mulai dari mana saat ingin mencari pengalaman kerja. Pilih bidang yang paling kamu sukai di sekolah, lalu lihat bagaimana kemampuan itu dibutuhkan oleh usaha lokal.
            </p>
          </div>
          <a href="/explore" class="btn btn-secondary btn-pill">
            Lihat Semua Bidang Minat ${icon('arrowRight', 15)}
          </a>
        </div>

        <div class="talent-pathway-list">
          <a href="/explore?category=Graphic+Design" class="talent-pathway-row">
            <div style="display:flex;align-items:center;gap:14px;">
              <span class="icon-squircle">${icon('layers', 20)}</span>
              <div>
                <div style="font-size:17px;font-weight:700;color:var(--brand-dark-navy);">Desain Grafis &amp; Visual</div>
                <div style="font-size:12.5px;color:#64748B;">Cocok bagi siswa yang suka menggambar &amp; tata letak</div>
              </div>
            </div>
            <div class="pathway-from-box">
              <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:3px;">Berawal dari Tugas Sekolah:</div>
              <div>Membuat poster acara sekolah, sampul majalah dinding, atau tugas praktik DKV.</div>
            </div>
            <div class="pathway-to-box">
              <div style="font-size:11px;font-weight:700;color:#9D174D;text-transform:uppercase;margin-bottom:3px;">Tersalur ke Dunia Kerja (UMKM):</div>
              <div>Merancang kemasan produk makanan, daftar menu kedai kopi, dan spanduk promosi usaha.</div>
            </div>
            <span style="color:var(--brand-deep-purple);font-weight:700;font-size:13px;white-space:nowrap;">Lihat Karya &rarr;</span>
          </a>

          <a href="/explore?category=Photography" class="talent-pathway-row">
            <div style="display:flex;align-items:center;gap:14px;">
              <span class="icon-squircle icon-squircle-gold">${icon('eye', 20)}</span>
              <div>
                <div style="font-size:17px;font-weight:700;color:var(--brand-dark-navy);">Fotografi &amp; Video Pendek</div>
                <div style="font-size:12.5px;color:#64748B;">Cocok bagi siswa yang aktif di dokumentasi &amp; multimedia</div>
              </div>
            </div>
            <div class="pathway-from-box">
              <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:3px;">Berawal dari Tugas Sekolah:</div>
              <div>Memotret kegiatan ekstrakurikuler atau menyunting video tugas kelompok di kelas.</div>
            </div>
            <div class="pathway-to-box">
              <div style="font-size:11px;font-weight:700;color:#9D174D;text-transform:uppercase;margin-bottom:3px;">Tersalur ke Dunia Kerja (UMKM):</div>
              <div>Memotret produk kerajinan lokal dan membuat video ulasan singkat untuk toko online UMKM.</div>
            </div>
            <span style="color:var(--brand-deep-purple);font-weight:700;font-size:13px;white-space:nowrap;">Lihat Karya &rarr;</span>
          </a>

          <a href="/explore?category=Social+Media+Content" class="talent-pathway-row">
            <div style="display:flex;align-items:center;gap:14px;">
              <span class="icon-squircle icon-squircle-green">${icon('fileText', 20)}</span>
              <div>
                <div style="font-size:17px;font-weight:700;color:var(--brand-dark-navy);">Penulisan &amp; Konten Media Sosial</div>
                <div style="font-size:12.5px;color:#64748B;">Cocok bagi siswa yang gemar bercerita &amp; merangkai kata</div>
              </div>
            </div>
            <div class="pathway-from-box">
              <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:3px;">Berawal dari Tugas Sekolah:</div>
              <div>Menulis esai Bahasa Indonesia, resensi buku, atau mengelola akun informasi OSIS.</div>
            </div>
            <div class="pathway-to-box">
              <div style="font-size:11px;font-weight:700;color:#9D174D;text-transform:uppercase;margin-bottom:3px;">Tersalur ke Dunia Kerja (UMKM):</div>
              <div>Menulis deskripsi produk yang menarik, cerita brand lokal, dan ide konten harian.</div>
            </div>
            <span style="color:var(--brand-deep-purple);font-weight:700;font-size:13px;white-space:nowrap;">Lihat Karya &rarr;</span>
          </a>

          <a href="/explore?category=Simple+Catalog+Design" class="talent-pathway-row">
            <div style="display:flex;align-items:center;gap:14px;">
              <span class="icon-squircle">${icon('briefcase', 20)}</span>
              <div>
                <div style="font-size:17px;font-weight:700;color:var(--brand-dark-navy);">Katalog Produk &amp; Administrasi Rapi</div>
                <div style="font-size:12.5px;color:#64748B;">Cocok bagi siswa yang teliti menyusun data &amp; tabel</div>
              </div>
            </div>
            <div class="pathway-from-box">
              <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:3px;">Berawal dari Tugas Sekolah:</div>
              <div>Merapikan laporan praktikum, tabel pengolahan angka, dan presentasi kelas.</div>
            </div>
            <div class="pathway-to-box">
              <div style="font-size:11px;font-weight:700;color:#9D174D;text-transform:uppercase;margin-bottom:3px;">Tersalur ke Dunia Kerja (UMKM):</div>
              <div>Menyusun katalog harga produk PDF dan merapikan daftar barang usaha kecil.</div>
            </div>
            <span style="color:var(--brand-deep-purple);font-weight:700;font-size:13px;white-space:nowrap;">Lihat Karya &rarr;</span>
          </a>
        </div>
      </div>
    </section>

    <!-- 3. CARA KERJA YANG SEDERHANA & NATURAL (TUNJUKKAN KARYA -> COBA PROYEK -> TERIMA SERTIFIKAT) -->
    <section style="padding:56px 0 76px;">
      <div class="container">
        <div class="editorial-split">
          <!-- Panel Kiri Sticky -->
          <div class="editorial-sticky-pane">
            <span class="section-eyebrow">${icon('layers', 13)} ALUR BELAJAR &amp; BERKARYA</span>
            <h2 style="font-size:31px;font-weight:800;margin-bottom:14px;letter-spacing:-0.025em;line-height:1.22;">
              Tiga Langkah Mudah Menuju Pengalaman Kerja Pertama
            </h2>
            <p style="color:#475569;font-size:15px;line-height:1.72;margin-bottom:22px;">
              Kami merancang proses yang ramah bagi pelajar. Siswa tidak perlu bersaing harga seperti pekerja lepas dewasa, melainkan belajar menyelesaikan proyek nyata dengan arahan guru.
            </p>
            <div style="background:#FFFFFF;border:1px solid var(--border-subtle);border-radius:16px;padding:18px 20px;box-shadow:var(--shadow-xs);">
              <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--brand-deep-purple);margin-bottom:10px;">
                Mengapa Orang Tua &amp; Sekolah Tenang?
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:#334155;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="color:#047857;">${icon('checkCircle', 15)}</span>
                  <span>Setiap langkah dipantau langsung oleh guru sekolah</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="color:#047857;">${icon('checkCircle', 15)}</span>
                  <span>Wajib ada izin orang tua sebelum tugas dimulai</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="color:#047857;">${icon('checkCircle', 15)}</span>
                  <span>Waktu pengerjaan disesuaikan agar tidak mengganggu sekolah</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Panel Kanan: 3 Langkah Berurutan -->
          <div class="process-ledger">
            <div class="process-ledger-row">
              <div class="process-num-pill">01</div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span class="status-badge badge-neutral">LANGKAH 1 &bull; TUNJUKKAN KARYA</span>
                </div>
                <h3 style="font-size:18px;font-weight:700;margin-bottom:6px;">Pamerkan Tugas Terbaikmu dari Sekolah</h3>
                <p style="font-size:14px;color:#475569;margin:0;line-height:1.65;">
                  Pilih 1 sampai 3 karya terbaik yang pernah kamu buat di kelas, tugas praktik kejuruan, atau kegiatan ekstrakurikuler. Guru pembimbing akan memeriksa dan menyetujui karyamu agar bisa dilihat oleh mitra UMKM.
                </p>
              </div>
              <div style="text-align:right;min-width:115px;">
                <span style="display:inline-block;padding:6px 12px;border-radius:10px;background:#FAF7F9;border:1px solid var(--border-subtle);font-size:11.5px;font-weight:600;color:var(--brand-dark-navy);">
                  1–3 Karya<br/><span style="color:#64748B;font-weight:400;">Disetujui Guru</span>
                </span>
              </div>
            </div>

            <div class="process-ledger-row">
              <div class="process-num-pill" style="background:linear-gradient(135deg,#FEF7E6,#FDE68A);border-color:#FCD34D;color:#92400E;">02</div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span class="status-badge badge-warning">LANGKAH 2 &bull; COBA PROYEK NYATA</span>
                </div>
                <h3 style="font-size:18px;font-weight:700;margin-bottom:6px;">Kerjakan Tugas Ringan dari UMKM</h3>
                <p style="font-size:14px;color:#475569;margin:0;line-height:1.65;">
                  Ambil tugas singkat dari pemilik UMKM yang sesuai dengan bakatmu. Arahan tugasnya jelas, jumlah revisinya dibatasi agar tidak memberatkan, dan ada uang apresiasi untuk karya yang dipakai usaha.
                </p>
              </div>
              <div style="text-align:right;min-width:115px;">
                <span style="display:inline-block;padding:6px 12px;border-radius:10px;background:#FAF7F9;border:1px solid var(--border-subtle);font-size:11.5px;font-weight:600;color:var(--brand-dark-navy);">
                  Ramah Pelajar<br/><span style="color:#64748B;font-weight:400;">Ada Apresiasi</span>
                </span>
              </div>
            </div>

            <div class="process-ledger-row">
              <div class="process-num-pill" style="background:linear-gradient(135deg,#ECFDF5,#A7F3D0);border-color:#6EE7B7;color:#047857;">03</div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span class="status-badge badge-success">LANGKAH 3 &bull; TERIMA SERTIFIKAT</span>
                </div>
                <h3 style="font-size:18px;font-weight:700;margin-bottom:6px;">Dapatkan Sertifikat Pengalaman Kerja Resmi</h3>
                <p style="font-size:14px;color:#475569;margin:0;line-height:1.65;">
                  Setelah tugas selesai dan dinilai langsung oleh UMKM serta disahkan guru pembimbing, kamu memperoleh Sertifikat Pengalaman Kerja resmi yang bisa dicetak untuk melamar kerja atau mendaftar kuliah.
                </p>
              </div>
              <div style="text-align:right;min-width:115px;">
                <span style="display:inline-block;padding:6px 12px;border-radius:10px;background:#FAF7F9;border:1px solid var(--border-subtle);font-size:11.5px;font-weight:600;color:#047857;">
                  Sertifikat Sah<br/><span style="color:#64748B;font-weight:400;">Siap Cetak PDF</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. GALERI KARYA SISWA SMA/SMK -->
    <section style="padding:76px 0;background-color:var(--brand-soft-white);border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);">
      <div class="container">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:36px;">
          <div>
            <span class="section-eyebrow">${icon('sparkles', 13)} KARYA PELAJAR INDONESIA</span>
            <h2 style="font-size:30px;font-weight:800;margin:0;letter-spacing:-0.025em;">Galeri Karya Siswa Terpilih</h2>
            <p style="color:#64748B;margin:6px 0 0;font-size:15px;">
              Hasil karya asli siswa SMA dan SMK yang sudah diperiksa oleh guru pembimbing di sekolah masing-masing.
            </p>
          </div>
          <a href="/explore" class="btn btn-secondary btn-pill">
            Lihat Semua Karya ${icon('arrowRight', 15)}
          </a>
        </div>

        ${
          featuredPortfolios.length === 0
            ? `<div class="empty-state" data-empty="No verified portfolios available yet.">
                 <div class="icon-squircle" style="margin:0 auto 14px;">${icon('folder', 24)}</div>
                 <h4>Belum Ada Karya Siswa yang Ditampilkan</h4>
                 <span style="display:none;">No verified portfolios available yet.</span>
                 <p style="max-width:540px;margin:0 auto 16px;font-size:14px;color:#64748B;">
                   Kami tidak memasang karya karangan. Karya siswa akan muncul di sini setelah diunggah oleh siswa dan disetujui oleh guru pembimbing sekolahnya.
                 </p>
                 <div style="font-size:13px;color:var(--brand-deep-purple);font-weight:600;">
                   Ingin melihat contoh tampilannya? Klik tombol <strong>+ Tampilkan Data Contoh</strong> di pojok kanan atas halaman.
                 </div>
               </div>`
            : `<div class="bento-mosaic">
                 ${featuredPortfolios
                   .map((p, idx) => {
                     const skills = safeJsonParse<string[]>(p.skills_json, []);
                     const spanClass = idx === 0 ? 'bento-span-7' : idx === 1 ? 'bento-span-5' : 'bento-span-4';
                     return `<article class="visual-card ${spanClass}">
                       <div>
                         <div class="visual-card-cover">
                           <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                             <span style="background:rgba(255,255,255,0.16);backdrop-filter:blur(6px);padding:4px 12px;border-radius:999px;font-size:11.5px;font-weight:600;">
                               ${escapeHtml(translateCategory(p.category))}
                             </span>
                             ${statusBadge('School Verified')}
                           </div>
                           <div style="font-size:12px;color:var(--brand-muted-gold);font-weight:500;display:flex;align-items:center;gap:6px;">
                             ${icon('graduationCap', 14)}
                             <span>${escapeHtml(p.project_origin)} &bull; ${escapeHtml(p.creation_date)}</span>
                           </div>
                         </div>

                         <div style="padding:22px 24px 14px;">
                           <h3 style="font-size:18px;font-weight:700;margin-bottom:8px;line-height:1.35;">
                             <a href="/explore/${escapeHtml(p.id)}">${escapeHtml(p.title)}</a>
                             ${demoBadge(p.is_demo)}
                           </h3>
                           <p style="font-size:14px;color:#475569;margin-bottom:14px;line-height:1.65;">
                             ${escapeHtml(p.description)}
                           </p>
                           <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                             ${skills
                               .map(
                                 (sk) =>
                                   `<span style="font-size:11.5px;font-weight:500;background:#FAF7F9;border:1px solid var(--border-subtle);padding:3px 11px;border-radius:999px;color:#334155;">${escapeHtml(sk)}</span>`
                               )
                               .join('')}
                           </div>
                         </div>
                       </div>

                       <div style="padding:14px 24px 18px;border-top:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;gap:10px;background:#FAF7F9;">
                         <div style="display:flex;align-items:center;gap:10px;">
                           <div style="width:34px;height:34px;border-radius:10px;background:var(--brand-light-lavender);color:var(--brand-deep-purple);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">
                             ${escapeHtml(p.student_name).charAt(0)}
                           </div>
                           <div style="font-size:12.5px;line-height:1.35;">
                             <strong style="color:var(--brand-dark-navy);font-weight:600;display:block;">${escapeHtml(p.student_name)}</strong>
                             <span style="color:#64748B;">${escapeHtml(p.school_name)}</span>
                           </div>
                         </div>
                         <a href="/explore/${escapeHtml(p.id)}" class="btn btn-secondary btn-sm">Lihat Karya &rarr;</a>
                       </div>
                     </article>`;
                   })
                   .join('')}
               </div>`
        }
      </div>
    </section>

    <!-- 5. MANFAAT NYATA BAGI SISWA, UMKM, DAN SEKOLAH -->
    <section style="padding:84px 0;">
      <div class="container">
        <div style="max-width:680px;margin-bottom:40px;">
          <span class="section-eyebrow">${icon('users', 13)} MANFAAT BERSAMA</span>
          <h2 style="font-size:32px;font-weight:800;margin-bottom:10px;letter-spacing:-0.025em;">
            Ruang Tumbuh yang Aman untuk Siswa, Membantu UMKM, dan Membanggakan Sekolah
          </h2>
          <p style="color:#475569;margin:0;font-size:15.5px;">
            Setiap pihak mendapatkan manfaat nyata tanpa mengesampingkan kewajiban utama siswa untuk belajar di sekolah.
          </p>
        </div>

        <div class="bento-mosaic">
          <!-- Kartu 1 (Span 7): Untuk Siswa -->
          <div class="bento-tile bento-span-7" style="display:grid;grid-template-columns:1.15fr 0.85fr;gap:24px;align-items:center;">
            <div>
              <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:14px;">
                <span class="icon-squircle">${icon('graduationCap', 20)}</span>
                <span class="status-badge badge-neutral">BAGI SISWA SMA &amp; SMK</span>
              </div>
              <h3 style="font-size:22px;font-weight:700;margin-bottom:10px;">Lebih Percaya Diri karena Karya Sekolahmu Diakui Dunia Usaha</h3>
              <p style="font-size:14px;color:#475569;margin-bottom:16px;">
                Tak perlu bingung saat ditanya pengalaman kerja ketika lulus nanti. Sejak di bangku sekolah, kamu sudah punya bukti nyata pernah membantu usaha UMKM.
              </p>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:#334155;">
                <div>&#10003; Menemukan bidang kerja yang paling cocok dengan minatmu</div>
                <div>&#10003; Mendapat uang saku apresiasi untuk karya komersial</div>
                <div>&#10003; Mengantongi Sertifikat Pengalaman Kerja resmi</div>
              </div>
            </div>

            <!-- Pratinjau Sertifikat Pengalaman Kerja -->
            <div style="background:#FAF7F9;border:1.5px solid #E2C6D8;border-radius:16px;padding:18px;box-shadow:var(--shadow-xs);">
              <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #EDE3EA;padding-bottom:10px;margin-bottom:12px;">
                <span style="font-size:10px;font-weight:700;letter-spacing:0.06em;color:#9D174D;text-transform:uppercase;">Bukti Kelulusan Proyek</span>
                <span style="font-size:10px;background:#ECFDF5;color:#047857;padding:2px 8px;border-radius:999px;font-weight:600;">Sah &amp; Resmi</span>
              </div>
              <div style="font-family:'Instrument Serif',Georgia,serif;font-size:21px;color:#2A0F25;margin-bottom:4px;">
                Sertifikat Pengalaman Kerja
              </div>
              <div style="font-size:11.5px;color:#64748B;margin-bottom:12px;">
                Lengkap dengan nilai keterampilan dari UMKM dan pengesahan guru sekolah.
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;background:#FFFFFF;padding:10px;border-radius:10px;border:1px solid #EDE3EA;">
                <div>
                  <span style="color:#64748B;display:block;">Penilaian UMKM</span>
                  <strong style="color:#0F172A;">5 Aspek Kerja</strong>
                </div>
                <div>
                  <span style="color:#64748B;display:block;">Pengesahan Guru</span>
                  <strong style="color:#047857;">Tercatat Resmi</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Kartu 2 (Span 5): Untuk UMKM -->
          <div class="bento-tile bento-tile-dark bento-span-5" style="display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <span style="padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.14);font-size:11px;font-weight:700;color:#FDE08D;letter-spacing:0.04em;">
                  BAGI PEMILIK UMKM
                </span>
                ${icon('building', 20)}
              </div>
              <h3 style="font-size:22px;font-weight:700;margin-bottom:10px;">Terbantu Urusan Kreatif Sekaligus Ikut Membina Pelajar</h3>
              <p style="font-size:14px;margin-bottom:18px;">
                Lihat dulu hasil karya siswa yang sudah diseleksi sekolah, lalu berikan tugas ringan seperti membuat desain katalog, foto produk, atau konten promosi.
              </p>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div style="background:rgba(255,255,255,0.08);padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);">
                <div style="font-size:12px;font-weight:700;color:#FDE08D;">Kualitas Terpilih</div>
                <div style="font-size:11.5px;color:rgba(255,255,255,0.82);margin-top:2px;">Karya sudah diperiksa guru sebelum tayang</div>
              </div>
              <div style="background:rgba(255,255,255,0.08);padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);">
                <div style="font-size:12px;font-weight:700;color:#FDE08D;">Koordinasi Mudah</div>
                <div style="font-size:11.5px;color:rgba(255,255,255,0.82);margin-top:2px;">Didampingi guru pembimbing dari sekolah</div>
              </div>
            </div>
          </div>

          <!-- Kartu 3 (Span 12): Untuk Sekolah -->
          <div class="bento-tile bento-span-12" style="background:linear-gradient(90deg,#FFFFFF 0%,#FDF2F8 100%);">
            <div style="display:grid;grid-template-columns:0.9fr 1.1fr;gap:32px;align-items:center;">
              <div>
                <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <span class="icon-squircle icon-squircle-green" style="width:36px;height:36px;">${icon('shieldCheck', 18)}</span>
                  <span class="status-badge badge-success">BAGI SEKOLAH (SMA / SMK / PKBM)</span>
                </div>
                <h3 style="font-size:21px;font-weight:700;margin-bottom:6px;">Pantau Perkembangan Bakat Siswa dengan Aman dan Terukur</h3>
                <p style="font-size:14px;color:#475569;margin:0;">
                  Sekolah memegang kendali penuh: mulai dari menyetujui akun siswa, menunjuk guru pembimbing, hingga mengunduh laporan pengalaman kerja siswa setiap semester.
                </p>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
                <div style="background:#FFFFFF;padding:16px;border-radius:14px;border:1px solid var(--border-subtle);">
                  <div style="font-size:11px;font-weight:700;color:var(--brand-deep-purple);text-transform:uppercase;">Seleksi Karya</div>
                  <div style="font-size:13.5px;font-weight:600;color:#0F172A;margin-top:4px;">Guru Menyetujui Karya Siswa</div>
                </div>
                <div style="background:#FFFFFF;padding:16px;border-radius:14px;border:1px solid var(--border-subtle);">
                  <div style="font-size:11px;font-weight:700;color:var(--brand-deep-purple);text-transform:uppercase;">Keamanan Belajar</div>
                  <div style="font-size:13.5px;font-weight:600;color:#0F172A;margin-top:4px;">Wajib Izin Guru &amp; Orang Tua</div>
                </div>
                <div style="background:#FFFFFF;padding:16px;border-radius:14px;border:1px solid var(--border-subtle);">
                  <div style="font-size:11px;font-weight:700;color:var(--brand-deep-purple);text-transform:uppercase;">Rekap Sekolah</div>
                  <div style="font-size:13.5px;font-weight:600;color:#0F172A;margin-top:4px;">Unduh Laporan PDF &amp; Tabel</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. PERLINDUNGAN SISWA 6 TAHAP -->
    <section style="padding:8px 0 76px;">
      <div class="container">
        <div class="mh-hero" style="padding:48px;border-radius:26px;box-shadow:var(--shadow-md);">
          <div style="position:relative;z-index:2;display:grid;grid-template-columns:0.85fr 1.15fr;gap:40px;align-items:center;">
            <div>
              <div class="mh-status-pill" style="margin-bottom:14px;">
                <span class="mh-status-dot" style="background:var(--brand-muted-gold);"></span>
                <span>PERLINDUNGAN PENUH BAGI PELAJAR</span>
              </div>
              <h2 style="color:#FFFFFF;font-size:30px;font-weight:800;margin-bottom:12px;letter-spacing:-0.025em;">
                Belajar Bekerja Tanpa Khawatir: Siswa Selalu Didampingi
              </h2>
              <p style="color:rgba(255,255,255,0.86);margin:0 0 22px;font-size:15px;line-height:1.7;">
                Kami memastikan setiap tugas tetap aman bagi pelajar. Tidak ada tugas yang berjalan tanpa sepengetahuan guru pembimbing dan orang tua.
              </p>
              <a href="/safety" class="btn btn-gold btn-pill">
                ${icon('shield', 16)} Lihat 6 Tahap Perlindungan Siswa
              </a>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.16);border-radius:20px;overflow:hidden;">
              <div style="padding:22px 24px;border-right:1px solid rgba(255,255,255,0.12);border-bottom:1px solid rgba(255,255,255,0.12);">
                <div style="color:#FDE08D;font-size:14.5px;font-weight:700;margin-bottom:6px;">01. Didampingi Guru Sekolah</div>
                <p style="font-size:13px;color:rgba(255,255,255,0.84);margin:0;">Setiap lamaran dan hasil tugas diperiksa langsung oleh guru dari sekolah asal siswa.</p>
              </div>
              <div style="padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.12);">
                <div style="color:#FDE08D;font-size:14.5px;font-weight:700;margin-bottom:6px;">02. Diketahui Orang Tua / Wali</div>
                <p style="font-size:13px;color:rgba(255,255,255,0.84);margin:0;">Persetujuan orang tua atau wali wajib tercatat sebelum siswa mulai mengerjakan proyek.</p>
              </div>
              <div style="padding:22px 24px;border-right:1px solid rgba(255,255,255,0.12);">
                <div style="color:#FDE08D;font-size:14.5px;font-weight:700;margin-bottom:6px;">03. Karya Siswa Dihargai</div>
                <p style="font-size:13px;color:rgba(255,255,255,0.84);margin:0;">Nama siswa tetap tercatat sebagai pembuat karya pada portofolio dan sertifikatnya.</p>
              </div>
              <div style="padding:22px 24px;">
                <div style="color:#FDE08D;font-size:14.5px;font-weight:700;margin-bottom:6px;">04. Apresiasi yang Layak</div>
                <p style="font-size:13px;color:rgba(255,255,255,0.84);margin:0;">Jika karya dipakai untuk keperluan jualan UMKM, siswa wajib menerima uang apresiasi yang disepakati.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 7. AJAKAN BERGABUNG -->
    <section style="padding:8px 0 40px;">
      <div class="container">
        <div class="bento-tile" style="padding:44px 48px;background:linear-gradient(135deg, #FDF2F8 0%, #FFFFFF 100%);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px;">
          <div style="max-width:620px;">
            <span class="section-eyebrow">${icon('sparkles', 13)} MULAI PERJALANANMU</span>
            <h2 style="font-size:30px;font-weight:800;margin-bottom:8px;letter-spacing:-0.025em;">Siap Menyalurkan Bakat Sekolahmu ke Dunia Kerja?</h2>
            <p style="margin:0;color:#475569;font-size:15px;">
              Bergabunglah bersama sekolah, guru pembimbing, dan mitra UMKM untuk membangun pengalaman kerja pertamamu sejak di bangku SMA/SMK.
            </p>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <a href="/register" class="btn btn-primary btn-pill" style="padding:13px 28px;font-size:14.5px;">
              ${icon('userPlus', 16)} Daftar Sekarang
            </a>
            <a href="/how-it-works" class="btn btn-secondary btn-pill" style="padding:13px 24px;font-size:14.5px;">
              Pelajari Alur Program
            </a>
          </div>
        </div>
      </div>
    </section>
  `;

  return renderPublicLayout({
    title: 'Salurkan Minat dan Bakat Sekolahmu ke Dunia Kerja',
    activePath: '/',
    user,
    content,
    flashMessage: flash
  });
}

export function renderAboutPage(user: SessionUser | null): string {
  const content = `
    <section style="background:linear-gradient(135deg, var(--brand-dark-navy) 0%, var(--brand-deep-purple) 100%);color:#FFFFFF;padding:56px 0;">
      <div class="container">
        <span style="display:inline-flex;align-items:center;gap:8px;background:rgba(217,189,131,0.18);color:var(--brand-muted-gold);padding:5px 14px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:0.06em;margin-bottom:14px;">
          TENTANG SECONDLIFE
        </span>
        <h1 style="color:#FFFFFF;font-size:38px;max-width:780px;margin-bottom:14px;">
          Membantu Siswa Mengenal Minat dan Mencicipi Dunia Kerja Sejak di Bangku Sekolah
        </h1>
        <p style="color:rgba(255,255,255,0.86);font-size:16.5px;max-width:740px;margin:0;">
          SecondLife hadir untuk menjembatani siswa SMA, SMK, dan PKBM agar karya yang mereka buat di sekolah dapat berkembang menjadi pengalaman kerja nyata bersama usaha lokal (UMKM).
        </p>
      </div>
    </section>

    <div class="container" style="padding-top:44px;">
      <div class="grid-2" style="margin-bottom:24px;">
        <div class="card">
          <div class="icon-squircle" style="margin-bottom:14px;">${icon('layers', 22)}</div>
          <h2 style="font-size:21px;margin-bottom:10px;">1. Mengapa SecondLife Dibuat?</h2>
          <p style="font-size:14.5px;margin-bottom:12px;">
            Banyak siswa SMA dan SMK punya bakat bagus di bidang desain, foto, video, maupun penulisan saat mengerjakan tugas sekolah—sayangnya karya itu sering berhenti di meja guru begitu nilai rapor keluar.
          </p>
          <p style="font-size:14.5px;margin:0;">
            Di sisi lain, mencari kerja lepas sendiri di internet terlalu berisiko bagi pelajar karena rawan penipuan, revisi tanpa batas, dan tidak ada pendamping. SecondLife menyediakan ruang belajar kerja yang aman karena selalu didampingi oleh guru sekolah.
          </p>
        </div>

        <div class="card">
          <div class="icon-squircle icon-squircle-gold" style="margin-bottom:14px;">${icon('award', 22)}</div>
          <h2 style="font-size:21px;margin-bottom:10px;">2. Cara Kami Bekerja Sama dengan Sekolah &amp; UMKM</h2>
          <p style="font-size:14.5px;margin-bottom:12px;">
            SecondLife bekerja sama langsung dengan pihak sekolah (SMA/SMK/PKBM) serta menyeleksi pemilik UMKM yang bersedia memberikan tugas yang ramah pelajar.
          </p>
          <p style="font-size:14.5px;margin:0;">
            Kami tidak membagikan sertifikat secara asal-asalan. <strong>Sertifikat Pengalaman Kerja hanya diterbitkan jika siswa benar-benar telah menyelesaikan tugas, dinilai oleh UMKM, dan disahkan oleh gurunya.</strong>
          </p>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h2 style="font-size:22px;margin-bottom:14px;">3. Tiga Tahap Utama: Tunjukkan Karya &ndash; Coba Proyek &ndash; Terima Sertifikat</h2>
        <div class="grid-3">
          <div class="card-lavender">
            <h4 style="margin-bottom:6px;color:var(--brand-deep-purple);">01. Tunjukkan Karya</h4>
            <p style="font-size:13.5px;margin:0;">Siswa mengunggah 1–3 karya tugas sekolah terbaiknya untuk diperiksa dan disetujui oleh guru pembimbing.</p>
          </div>
          <div class="card-lavender">
            <h4 style="margin-bottom:6px;color:var(--brand-deep-purple);">02. Coba Proyek</h4>
            <p style="font-size:13.5px;margin:0;">UMKM memberikan tugas ringan yang jelas arahannya serta disetujui oleh guru dan orang tua/wali siswa.</p>
          </div>
          <div class="card-lavender">
            <h4 style="margin-bottom:6px;color:var(--brand-deep-purple);">03. Terima Sertifikat</h4>
            <p style="font-size:13.5px;margin:0;">UMKM memberi penilaian pada 5 aspek keterampilan, sekolah mengesahkan hasilnya, dan Sertifikat Pengalaman Kerja diterbitkan.</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 style="font-size:22px;margin-bottom:10px;">4. Dukungan pada Kesiapan Kerja Pelajar (SDG 8)</h2>
        <p style="font-size:14.5px;margin-bottom:10px;">
          SecondLife turut mendukung <strong>Tujuan Pembangunan Berkelanjutan (SDG 8: Pekerjaan Layak dan Pertumbuhan Ekonomi)</strong> dengan membantu pelajar menyiapkan bekal pengalaman kerja pertama yang jujur, aman, dan menghargai hak karya mereka.
        </p>
        <p style="font-size:13px;color:var(--brand-muted-gray);margin:0;">
          <em>Catatan Kejujuran Data:</em> Kami berfokus membantu kesiapan pengalaman kerja siswa satu per satu bersama sekolah mitra, tanpa membuat klaim berlebihan.
        </p>
      </div>
    </div>
  `;

  return renderPublicLayout({
    title: 'Tentang Kami',
    activePath: '/about',
    user,
    content
  });
}

export function renderHowItWorksPage(user: SessionUser | null): string {
  const content = `
    <section style="background:linear-gradient(135deg, var(--brand-dark-navy) 0%, var(--brand-deep-purple) 100%);color:#FFFFFF;padding:56px 0;" data-safety="Six-Stage Student Safety System">
      <div class="container">
        <span style="display:inline-flex;align-items:center;gap:8px;background:rgba(217,189,131,0.18);color:var(--brand-muted-gold);padding:5px 14px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:0.06em;margin-bottom:14px;">
          PANDUAN LENGKAP PROGRAM
        </span>
        <h1 style="color:#FFFFFF;font-size:38px;margin-bottom:12px;">Alur Program SecondLife &amp; 6 Tahap Perlindungan Siswa</h1>
        <p style="color:rgba(255,255,255,0.86);font-size:16.5px;max-width:760px;margin:0;">
          Mari lihat bagaimana siswa, guru pembimbing, sekolah, dan pemilik UMKM saling bekerja sama dari awal hingga sertifikat diterbitkan.
        </p>
      </div>
    </section>

    <div class="container" style="padding-top:44px;">
      <!-- Diagram Alur -->
      <div class="card" style="margin-bottom:36px;background:var(--brand-dark-navy);color:#FFFFFF;border-radius:20px;">
        <h3 style="color:var(--brand-muted-gold);font-size:15px;margin-bottom:18px;text-transform:uppercase;letter-spacing:0.06em;">
          Urutan Perjalanan Siswa di SecondLife
        </h3>
        <div class="grid-3" style="gap:18px;">
          <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);padding:20px;border-radius:14px;">
            <div style="font-weight:800;color:var(--brand-muted-gold);margin-bottom:8px;font-size:15px;">1. Tunjukkan Karya Sekolah</div>
            <div style="font-size:13px;line-height:1.65;color:rgba(255,255,255,0.88);">
              Siswa Mengunggah Karya (Maks. 3)<br/>
              &darr;<br/>
              Diperiksa oleh Guru Pembimbing<br/>
              &darr;<br/>
              Guru Menyetujui Keaslian &amp; Izin Tampil<br/>
              &darr;<br/>
              Karya Tayang di Galeri Siswa
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);padding:20px;border-radius:14px;">
            <div style="font-weight:800;color:var(--brand-muted-gold);margin-bottom:8px;font-size:15px;">2. Coba Proyek UMKM</div>
            <div style="font-size:13px;line-height:1.65;color:rgba(255,255,255,0.88);">
              UMKM Membuat Tugas Ringan &amp; Jelas<br/>
              &darr;<br/>
              Pengelola Memeriksa Keamanan Tugas<br/>
              &darr;<br/>
              Siswa Mendaftar + Disetujui Guru &amp; Orang Tua<br/>
              &darr;<br/>
              Siswa Mengerjakan &amp; Mengunggah Hasil
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);padding:20px;border-radius:14px;">
            <div style="font-weight:800;color:var(--brand-muted-gold);margin-bottom:8px;font-size:15px;">3. Terima Sertifikat Resmi</div>
            <div style="font-size:13px;line-height:1.65;color:rgba(255,255,255,0.88);">
              UMKM Menilai 5 Aspek Keterampilan<br/>
              &darr;<br/>
              Guru Memeriksa Hasil Penilaian<br/>
              &darr;<br/>
              Apresiasi Siswa Dikonfirmasi Tuntas<br/>
              &darr;<br/>
              Sertifikat Pengalaman Kerja Terbit
            </div>
          </div>
        </div>
      </div>

      <!-- Panduan Per Peran -->
      <h2 style="font-size:26px;margin-bottom:18px;">Peran Masing-Masing Pihak</h2>
      <div class="grid-2" style="margin-bottom:40px;">
        <div class="card card-interactive">
          <h3 style="font-size:18px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">
            <span class="icon-squircle">${icon('graduationCap', 19)}</span> 1. Bagi Siswa (SMA / SMK)
          </h3>
          <ol style="padding-left:18px;margin:0;font-size:13.5px;display:flex;flex-direction:column;gap:8px;">
            <li>Mendaftar menggunakan kode undangan resmi dari sekolah.</li>
            <li>Mengunggah 1–3 tugas atau karya terbaik buatan sendiri.</li>
            <li>Setelah disetujui guru, memilih tugas ringan dari UMKM yang diminati.</li>
            <li>Menunggu persetujuan guru pembimbing dan izin orang tua/wali.</li>
            <li>Mengerjakan tugas dengan pendampingan guru hingga mendapatkan Sertifikat Pengalaman Kerja.</li>
          </ol>
        </div>

        <div class="card card-interactive">
          <h3 style="font-size:18px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">
            <span class="icon-squircle icon-squircle-gold">${icon('building', 19)}</span> 2. Bagi Mitra UMKM
          </h3>
          <ol style="padding-left:18px;margin:0;font-size:13.5px;display:flex;flex-direction:column;gap:8px;">
            <li>Mendaftarkan profil usaha untuk diverifikasi pengelola.</li>
            <li>Melihat-lihat karya siswa yang sudah disetujui sekolah.</li>
            <li>Membuat tugas ringan dengan arahan jelas, batas revisi wajar (maks. 2–3 kali), dan apresiasi yang adil.</li>
            <li>Memberikan penilaian yang sopan dan membangun atas hasil karya siswa.</li>
            <li>Menyelesaikan pemberian apresiasi sesuai kesepakatan.</li>
          </ol>
        </div>

        <div class="card card-interactive">
          <h3 style="font-size:18px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">
            <span class="icon-squircle icon-squircle-green">${icon('shield', 19)}</span> 3. Bagi Guru Pembimbing
          </h3>
          <ol style="padding-left:18px;margin:0;font-size:13.5px;display:flex;flex-direction:column;gap:8px;">
            <li>Memeriksa keaslian karya siswa sebelum ditampilkan di galeri.</li>
            <li>Memastikan tugas yang dilamar siswa sesuai dengan kemampuan dan tidak mengganggu jadwal ujian/sekolah.</li>
            <li>Memastikan izin orang tua/wali sudah tercatat sebelum siswa mulai mengerjakan.</li>
            <li>Memantau perkembangan siswa dan mengesahkan penilaian akhir dari UMKM.</li>
          </ol>
        </div>

        <div class="card card-interactive">
          <h3 style="font-size:18px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">
            <span class="icon-squircle">${icon('users', 19)}</span> 4. Bagi Pihak Sekolah / PKBM
          </h3>
          <ol style="padding-left:18px;margin:0;font-size:13.5px;display:flex;flex-direction:column;gap:8px;">
            <li>Mendata siswa dan menunjuk guru pembimbing di sekolah.</li>
            <li>Memberikan izin tampil untuk karya siswa dan memantau seluruh proyek yang sedang berjalan.</li>
            <li>Menjaga kerahasiaan data siswa agar tidak bisa diakses oleh pihak luar tanpa izin.</li>
            <li>Mengunduh laporan perkembangan pengalaman kerja siswa dalam bentuk PDF atau tabel CSV.</li>
          </ol>
        </div>
      </div>

      <!-- 6 Tahap Perlindungan Siswa -->
      <h2 style="font-size:26px;margin-bottom:18px;">6 Tahap Perlindungan Siswa (Wajib pada Setiap Proyek)</h2>
      <span style="display:none;">Six-Stage Student Safety System</span>
      <div class="grid-2">
        ${SIX_STAGE_SAFETY_SYSTEM.map(
          (st) => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span class="status-badge badge-neutral">Tahap ${st.stage}</span>
              <span style="font-size:12px;font-weight:700;color:var(--brand-deep-purple);">${escapeHtml(st.responsibleParties)}</span>
            </div>
            <h4 style="font-size:17px;margin-bottom:6px;">${escapeHtml(st.title)}</h4>
            <p style="font-size:13.5px;color:var(--brand-charcoal);margin-bottom:10px;">${escapeHtml(st.description)}</p>
            <ul style="padding-left:16px;margin:0;font-size:12.5px;color:var(--brand-muted-gray);">
              ${st.checkpoints.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
            </ul>
          </div>`
        ).join('')}
      </div>
    </div>
  `;

  return renderPublicLayout({
    title: 'Alur Program',
    activePath: '/how-it-works',
    user,
    content
  });
}

export function renderExplorePage(
  user: SessionUser | null,
  query: { q?: string; category?: string; verifiedOnly?: string }
): string {
  const db = getDb();
  const q = (query.q || '').trim();
  const category = (query.category || '').trim();
  const demoFilter = isDemoMode() ? '' : 'AND p.is_demo = 0';

  let sql = `
    SELECT
      p.id, p.title, p.description, p.category, p.skills_json, p.creation_date,
      p.project_origin, p.student_contribution, p.is_collaborative, p.status, p.is_demo,
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
  const params: any[] = [];

  if (q) {
    sql += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.skills_json LIKE ? OR s.name LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (category) {
    sql += ` AND p.category = ?`;
    params.push(category);
  }
  sql += ` ORDER BY p.created_at DESC`;

  const portfolios = db.prepare(sql).all(...params) as Array<Record<string, any>>;

  const content = `
    <section style="background:linear-gradient(135deg, var(--brand-dark-navy) 0%, var(--brand-deep-purple) 100%);color:#FFFFFF;padding:52px 0 68px;">
      <div class="container">
        <span style="display:inline-flex;align-items:center;gap:8px;background:rgba(217,189,131,0.18);color:var(--brand-muted-gold);padding:5px 14px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:0.06em;margin-bottom:12px;">
          GALERI KARYA SISWA SMA &amp; SMK
        </span>
        <h1 style="color:#FFFFFF;font-size:36px;margin-bottom:10px;">Jelajahi Karya Siswa yang Telah Disetujui Sekolah</h1>
        <p style="color:rgba(255,255,255,0.84);margin:0;max-width:740px;font-size:15.5px;">
          Menampilkan karya tugas sekolah dan proyek kreatif siswa yang sudah diperiksa oleh guru pembimbing. Nomor kontak pribadi siswa tetap terlindungi sepenuhnya.
        </p>
      </div>
    </section>

    <div class="mh-search-bridge" style="margin-bottom:36px;">
      <div class="mh-search-box">
        <form method="GET" action="/explore" class="grid-3" style="align-items:end;">
          <div>
            <label class="form-label" for="explore-q">Cari Judul Karya, Bidang Bakat, atau Nama Sekolah</label>
            <input id="explore-q" type="text" name="q" value="${escapeHtml(q)}" placeholder="Contoh: Katalog, Kemasan, Fotografi..." class="form-control" />
          </div>
          <div>
            <label class="form-label" for="explore-cat">Pilih Bidang Minat &amp; Bakat</label>
            <select id="explore-cat" name="category" class="form-control">
              <option value="">Semua Bidang Minat</option>
              ${APPROVED_ASSIGNMENT_CATEGORIES.map(
                (cat) => `<option value="${escapeHtml(cat)}" ${category === cat ? 'selected' : ''}>${escapeHtml(translateCategory(cat))}</option>`
              ).join('')}
            </select>
          </div>
          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn btn-primary" style="flex:1;">${icon('search', 16)} Cari Karya</button>
            <a href="/explore" class="btn btn-secondary">Atur Ulang</a>
          </div>
        </form>
      </div>
    </div>

    <div class="container">
      ${
        portfolios.length === 0
          ? `<div class="empty-state" data-empty="No verified portfolios available yet.">
               <div class="icon-squircle" style="margin:0 auto 12px;">${icon('folder', 28)}</div>
               <h4>Belum Ada Karya Siswa yang Sesuai</h4>
               <span style="display:none;">No verified portfolios available yet.</span>
               <p style="max-width:520px;margin:0 auto 14px;font-size:14px;">
                 Belum ada karya publik yang cocok dengan pencarian Anda. Hanya karya siswa asli yang telah disetujui sekolah yang ditampilkan di halaman ini.
               </p>
               ${
                 !isDemoMode()
                   ? `<p style="font-size:13px;color:var(--brand-deep-purple);font-weight:600;">Ingin melihat contoh karya siswa? Klik tombol <strong>"+ Tampilkan Data Contoh"</strong> di bagian atas halaman.</p>`
                   : ''
               }
             </div>`
          : `<div class="grid-3">
               ${portfolios
                 .map((p) => {
                   const skills = safeJsonParse<string[]>(p.skills_json, []);
                   return `<article class="visual-card">
                     <div>
                       <div class="visual-card-cover">
                         <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                           <span style="background:rgba(255,255,255,0.16);padding:4px 11px;border-radius:999px;font-size:11.5px;font-weight:700;">
                             ${escapeHtml(translateCategory(p.category))}
                           </span>
                           ${statusBadge('School Verified')}
                         </div>
                         <div style="font-size:11.5px;color:var(--brand-muted-gold);font-weight:600;">
                           ${escapeHtml(p.project_origin)} &bull; ${escapeHtml(p.creation_date)}
                         </div>
                       </div>

                       <div style="padding:20px 22px 14px;">
                         <h3 style="font-size:18px;margin-bottom:8px;">
                           <a href="/explore/${escapeHtml(p.id)}">${escapeHtml(p.title)}</a>
                           ${demoBadge(p.is_demo)}
                         </h3>
                         <p style="font-size:13.5px;color:var(--brand-charcoal);margin-bottom:14px;">
                           ${escapeHtml(p.description)}
                         </p>
                         <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                           ${skills
                             .map(
                               (s) =>
                                 `<span style="font-size:11px;font-weight:600;background:var(--brand-warm-ivory);border:1px solid var(--border-subtle);padding:3px 10px;border-radius:999px;color:var(--brand-deep-purple);">${escapeHtml(s)}</span>`
                             )
                             .join('')}
                         </div>
                       </div>
                     </div>

                     <div style="padding:14px 22px 18px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;background:#FCFBF9;">
                       <div style="font-size:12px;">
                         <strong style="color:var(--brand-dark-navy);display:block;">${escapeHtml(p.student_name)}</strong>
                         <span style="color:var(--brand-muted-gray);">${escapeHtml(p.grade)} &bull; ${escapeHtml(p.school_name)}</span>
                       </div>
                       <a href="/explore/${escapeHtml(p.id)}" class="btn btn-secondary btn-sm">Lihat Karya</a>
                     </div>
                   </article>`;
                 })
                 .join('')}
             </div>`
      }
    </div>
  `;

  return renderPublicLayout({
    title: 'Galeri Karya Siswa',
    activePath: '/explore',
    user,
    content
  });
}

export function renderExploreDetailPage(user: SessionUser | null, portfolioId: string): string {
  const db = getDb();
  const p = db
    .prepare(
      `SELECT
         p.*, u.full_name as student_name, stu.grade, stu.major,
         s.name as school_name, s.city as school_city, s.type as school_type
       FROM portfolios p
       JOIN students stu ON stu.id = p.student_id
       JOIN users u ON u.id = stu.user_id
       JOIN schools s ON s.id = p.school_id
       WHERE p.id = ?
         AND p.status IN ('Verified', 'Published')
         AND p.display_permission = 1
         AND p.school_display_authorized = 1
         AND stu.public_portfolio_enabled = 1
         AND p.deleted_at IS NULL`
    )
    .get(portfolioId) as Record<string, any> | undefined;

  if (!p) {
    return renderPublicLayout({
      title: 'Karya Tidak Ditemukan',
      activePath: '/explore',
      user,
      content: `<div class="container" style="padding-top:48px;">
        <div class="empty-state">
          <h4>Karya Tidak Tersedia</h4>
          <p>Karya ini tidak ditemukan atau belum mendapatkan izin tampil publik dari siswa dan pihak sekolah.</p>
          <a href="/explore" class="btn btn-primary">Kembali ke Galeri Karya</a>
        </div>
      </div>`
    });
  }

  const files = db
    .prepare('SELECT * FROM portfolio_files WHERE portfolio_id = ?')
    .all(portfolioId) as Array<Record<string, any>>;

  const verifications = db
    .prepare('SELECT * FROM portfolio_verifications WHERE portfolio_id = ? ORDER BY created_at DESC')
    .all(portfolioId) as Array<Record<string, any>>;

  const skills = safeJsonParse<string[]>(p.skills_json, []);

  const content = `
    <div class="container" style="padding-top:40px;">
      <div style="margin-bottom:18px;">
        <a href="/explore" style="font-size:13.5px;font-weight:700;">&larr; Kembali ke Galeri Karya Siswa</a>
      </div>

      <div class="grid-3" style="align-items:start;">
        <div class="card" style="grid-column: span 2;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">
            <span class="status-badge badge-neutral">${escapeHtml(translateCategory(p.category))}</span>
            ${statusBadge('School Verified & Authorized')}
          </div>
          <h1 style="font-size:28px;margin-bottom:12px;">
            ${escapeHtml(p.title)} ${demoBadge(p.is_demo)}
          </h1>
          <p style="font-size:15px;color:var(--brand-charcoal);margin-bottom:20px;">
            ${escapeHtml(p.description)}
          </p>

          <div class="meta-spec-grid" style="margin-bottom:20px;">
            <div class="meta-spec-cell">
              <div class="meta-spec-label">Asal &amp; Tanggal Karya</div>
              <div class="meta-spec-val">
                <strong>Asal Proyek:</strong> ${escapeHtml(p.project_origin)}<br/>
                <strong>Tanggal Dibuat:</strong> ${escapeHtml(p.creation_date)}
              </div>
            </div>
            <div class="meta-spec-cell">
              <div class="meta-spec-label">Bentuk Pengerjaan &amp; Hak Cipta</div>
              <div class="meta-spec-val">
                <strong>Jenis Pengerjaan:</strong> ${p.is_collaborative ? 'Proyek Kelompok / Kolaborasi' : 'Karya Mandiri Siswa'}<br/>
                <strong>Status Karya:</strong> Karya Asli Siswa Terverifikasi
              </div>
            </div>
          </div>

          <h3 style="font-size:16px;margin-bottom:8px;">Peran &amp; Kontribusi Siswa dalam Karya Ini</h3>
          <p style="font-size:14px;background:var(--brand-light-lavender);padding:14px;border-radius:var(--radius-sm);margin-bottom:20px;">
            ${escapeHtml(p.student_contribution)}
          </p>

          <h3 style="font-size:16px;margin-bottom:10px;">Keterampilan yang Ditampilkan</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;">
            ${skills.map((s) => `<span class="status-badge badge-neutral">${escapeHtml(s)}</span>`).join('')}
          </div>

          <h3 style="font-size:16px;margin-bottom:10px;">Lampiran Berkas Karya</h3>
          ${
            files.length === 0
              ? `<p style="font-size:13.5px;color:var(--brand-muted-gray);">Tidak ada lampiran berkas publik.</p>`
              : `<div style="display:flex;flex-direction:column;gap:10px;">
                   ${files
                     .map(
                       (f) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);">
                         <div>
                           <div style="font-weight:700;font-size:13.5px;">${escapeHtml(f.file_name)} (${escapeHtml(f.file_type)})</div>
                           <div style="font-size:12px;color:var(--brand-muted-gray);">${escapeHtml(f.preview_summary || 'Lampiran karya terverifikasi')} &bull; ${(Number(f.file_size_bytes) / 1024).toFixed(1)} KB</div>
                         </div>
                         <a href="/api/files/download?type=portfolio&id=${escapeHtml(f.id)}" class="btn btn-secondary btn-sm">${icon('download', 14)} Unduh Berkas</a>
                       </div>`
                     )
                     .join('')}
                 </div>`
          }
        </div>

        <div style="display:flex;flex-direction:column;gap:20px;">
          <div class="card">
            <h3 style="font-size:16px;margin-bottom:12px;">Profil Siswa Pembuat Karya</h3>
            <div style="font-size:16px;font-weight:800;color:var(--brand-dark-navy);margin-bottom:4px;">
              ${escapeHtml(p.student_name)}
            </div>
            <div style="font-size:13.5px;color:var(--brand-charcoal);margin-bottom:12px;">
              ${escapeHtml(p.grade)} &bull; ${escapeHtml(p.major)}<br/>
              <strong>${escapeHtml(p.school_name)}</strong> (${escapeHtml(p.school_city)})
            </div>
            <div style="font-size:12px;padding:12px;background:var(--brand-warm-ivory);border-radius:var(--radius-sm);color:var(--brand-muted-gray);">
              ${icon('lock', 13)} <strong>Perlindungan Data Pribadi:</strong> Nomor telepon, alamat rumah, dan NISN siswa disembunyikan. Pemilik UMKM berinteraksi dengan siswa melalui penugasan yang didampingi guru.
            </div>
          </div>

          <div class="card">
            <h3 style="font-size:16px;margin-bottom:12px;">Catatan Pengesahan Sekolah</h3>
            ${
              verifications.length > 0
                ? `<div style="font-size:13px;">
                     <div style="margin-bottom:8px;">${statusBadge(verifications[0].decision)}</div>
                     <p style="margin:0 0 8px;">${escapeHtml(verifications[0].notes)}</p>
                     <div style="font-size:11.5px;color:var(--brand-muted-gray);">Disahkan pada: ${escapeHtml(verifications[0].created_at)}</div>
                   </div>`
                : `<p style="font-size:13px;color:var(--brand-muted-gray);">Telah disetujui oleh sekolah asal (${escapeHtml(p.school_name)}).</p>`
            }
          </div>
        </div>
      </div>
    </div>
  `;

  return renderPublicLayout({
    title: `${p.title} — Karya Siswa Terverifikasi`,
    activePath: '/explore',
    user,
    content
  });
}

export function renderLoginPage(
  user: SessionUser | null,
  redirectUrl = '',
  errorMsg?: string | null
): string {
  const content = `
    <section class="auth-portal-section">
      <div class="container" style="max-width:1120px;">
        <div class="auth-split-card">
          <!-- Panel Kiri: Identitas Visual & Jaminan Keamanan SecondLife -->
          <div class="auth-visual-wing">
            <div>
              <div style="margin-bottom:28px;">
                ${renderSecondLifeLogo('dark')}
              </div>
              <span class="mh-status-pill" style="margin-bottom:16px;">
                <span class="mh-status-dot"></span>
                <span>PORTAL RESMI SECONDLIFE</span>
              </span>
              <h2 style="color:#FFFFFF;font-size:30px;font-weight:800;line-height:1.22;margin:0 0 12px;">
                Salurkan Minat Sekolahmu Menjadi <span style="font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;color:#FDE08D;font-size:1.12em;">Pengalaman Kerja Nyata.</span>
              </h2>
              <p style="color:rgba(255,255,255,0.84);font-size:14px;line-height:1.65;margin:0;">
                Satu pintu masuk terpadu untuk Siswa SMA/SMK, Guru Pembimbing, Pihak Sekolah, dan Mitra UMKM dalam mengelola portofolio serta proyek kerja secara aman.
              </p>

              <div class="auth-visual-feature-list">
                <div class="auth-visual-feature-item">
                  <span style="color:#FDE08D;margin-top:2px;">${icon('compass', 18)}</span>
                  <div>
                    <div style="font-weight:700;font-size:13.5px;color:#FFFFFF;">Eksplorasi Bakat Sesuai Jurusan &amp; Hobi</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.78);">Unggah tugas terbaikmu dan temukan proyek UMKM yang selaras dengan minatmu.</div>
                  </div>
                </div>
                <div class="auth-visual-feature-item">
                  <span style="color:#34D399;margin-top:2px;">${icon('shieldCheck', 18)}</span>
                  <div>
                    <div style="font-weight:700;font-size:13.5px;color:#FFFFFF;">Didampingi Guru &amp; Izin Orang Tua</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.78);">Setiap penugasan wajib disetujui guru pembimbing serta orang tua/wali siswa.</div>
                  </div>
                </div>
                <div class="auth-visual-feature-item">
                  <span style="color:#F472B6;margin-top:2px;">${icon('award', 18)}</span>
                  <div>
                    <div style="font-weight:700;font-size:13.5px;color:#FFFFFF;">Sertifikat Pengalaman Kerja Resmi</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.78);">Rekam jejak keterampilan terverifikasi untuk melamar kerja atau magang.</div>
                  </div>
                </div>
              </div>
            </div>

            <div style="padding-top:18px;border-top:1px solid rgba(255,255,255,0.14);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:rgba(255,255,255,0.78);">
              <span>${icon('lock', 13)} Data Pribadi Pelajar Terlindungi</span>
              <a href="/how-it-works" style="color:#FDE08D;font-weight:600;">Pelajari Alur Program &rarr;</a>
            </div>
          </div>

          <!-- Panel Kanan: Formulir Masuk & Pilihan Cepat 5 Peran -->
          <div class="auth-form-wing">
            <div style="margin-bottom:22px;">
              <span class="section-eyebrow">${icon('logIn', 13)} MASUK KE RUANG KERJA</span>
              <h1 style="font-size:26px;margin-bottom:6px;">Masuk ke Akun SecondLife</h1>
              <p style="font-size:13.5px;color:var(--brand-muted-gray);margin:0;">
                Masukkan alamat email dan kata sandi akun Anda, atau klik salah satu peran contoh di bawah untuk mengisi otomatis.
              </p>
            </div>

            ${errorMsg ? `<div class="alert alert-error">${escapeHtml(errorMsg)}</div>` : ''}

            <form method="POST" action="/api/auth/login">
              <input type="hidden" name="redirect" value="${escapeHtml(redirectUrl)}" />
              <div class="form-group">
                <label class="form-label" for="login-email">Alamat Email</label>
                <input id="login-email" type="email" name="email" required class="form-control" placeholder="nama@sekolah.sch.id" />
              </div>
              <div class="form-group">
                <label class="form-label" for="login-password">Kata Sandi</label>
                <input id="login-password" type="password" name="password" required class="form-control" placeholder="Masukkan kata sandi" />
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;font-size:13px;font-weight:600;">
                <a href="/forgot-password">Lupa kata sandi?</a>
                <a href="/register">Belum punya akun? Daftar &rarr;</a>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;padding:12px 18px;font-size:14px;">
                ${icon('logIn', 16)} Masuk Sekarang
              </button>
            </form>

            <!-- Tombol Isi Otomatis Akun Contoh (5 Peran) -->
            <div style="margin-top:26px;padding-top:20px;border-top:1px solid var(--border-subtle);">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:12px;font-weight:700;color:var(--brand-dark-navy);text-transform:uppercase;letter-spacing:0.04em;">
                  ${icon('sparkles', 13)} Coba Cepat Akun Contoh (Klik untuk Isi Otomatis)
                </span>
                <span style="font-size:11px;color:#64748B;">5 Peran Tersedia</span>
              </div>
              <p style="font-size:12px;color:#64748B;margin:0 0 10px;">
                Akun <strong>Pengelola</strong> selalu aktif. Untuk mencoba 4 peran simulasi lainnya, pastikan tombol <strong>"+ Tampilkan Data Contoh"</strong> di bilah atas sudah diaktifkan:
              </p>

              <div class="quick-role-grid">
                <button type="button" class="quick-role-btn" onclick="document.getElementById('login-email').value='admin@secondlife.id';document.getElementById('login-password').value='AdminSecondLife!2026';">
                  <strong><span>1. Pengelola Platform</span> <span class="status-badge badge-success" style="font-size:10px;padding:1px 7px;">Aktif</span></strong>
                  <span>admin@secondlife.id &bull; AdminSecondLife!2026</span>
                </button>
                <button type="button" class="quick-role-btn" onclick="document.getElementById('login-email').value='student.demo@secondlife.id';document.getElementById('login-password').value='DemoPass!2026';">
                  <strong><span>2. Siswa SMA / SMK</span> ${demoBadge(1)}</strong>
                  <span>student.demo@secondlife.id &bull; DemoPass!2026</span>
                </button>
                <button type="button" class="quick-role-btn" onclick="document.getElementById('login-email').value='umkm.demo@secondlife.id';document.getElementById('login-password').value='DemoPass!2026';">
                  <strong><span>3. Mitra Usaha (UMKM)</span> ${demoBadge(1)}</strong>
                  <span>umkm.demo@secondlife.id &bull; DemoPass!2026</span>
                </button>
                <button type="button" class="quick-role-btn" onclick="document.getElementById('login-email').value='mentor.demo@secondlife.id';document.getElementById('login-password').value='DemoPass!2026';">
                  <strong><span>4. Guru Pembimbing</span> ${demoBadge(1)}</strong>
                  <span>mentor.demo@secondlife.id &bull; DemoPass!2026</span>
                </button>
                <button type="button" class="quick-role-btn" style="grid-column:1 / -1;" onclick="document.getElementById('login-email').value='school.demo@secondlife.id';document.getElementById('login-password').value='DemoPass!2026';">
                  <strong><span>5. Pengelola Sekolah / PKBM</span> ${demoBadge(1)}</strong>
                  <span>school.demo@secondlife.id &bull; DemoPass!2026</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  return renderPublicLayout({
    title: 'Masuk Akun',
    activePath: '/login',
    user,
    content
  });
}

export function renderRegisterPage(user: SessionUser | null, errorMsg?: string | null): string {
  const db = getDb();
  const approvedSchools = db
    .prepare(`SELECT id, name, city, invite_code, is_demo FROM schools WHERE verification_status = 'VERIFIED' ORDER BY name ASC`)
    .all() as Array<Record<string, any>>;

  const content = `
    <section class="page-hero-compact">
      <div class="container">
        <span class="mh-status-pill" style="margin-bottom:12px;">
          <span class="mh-status-dot"></span>
          <span>PENDAFTARAN TERVERIFIKASI</span>
        </span>
        <h1 style="color:#FFFFFF;font-size:34px;margin:0 0 8px;">Bergabung di Ekosistem SecondLife</h1>
        <p style="color:rgba(255,255,255,0.86);font-size:15px;max-width:700px;margin:0;">
          Pilih peran Anda di bawah ini. Akun siswa dan guru terhubung langsung dengan sekolah asal untuk memastikan keamanan dan pendampingan resmi.
        </p>
      </div>
    </section>

    <div class="container" style="padding-top:36px;max-width:1140px;">
      <div class="cockpit-split">
        <div class="card" style="padding:32px;">
          <span class="section-eyebrow">${icon('userPlus', 14)} FORMULIR PENDAFTARAN</span>
          <h2 style="font-size:24px;margin-bottom:6px;">Buat Akun SecondLife Baru</h2>
          <p style="font-size:13.5px;color:var(--brand-muted-gray);margin-bottom:22px;">
            Lengkapi data sesuai peran Anda. Data pribadi siswa seperti NISN dan kontak orang tua dijaga kerahasiaannya dan tidak ditampilkan ke publik.
          </p>

          ${errorMsg ? `<div class="alert alert-error">${escapeHtml(errorMsg)}</div>` : ''}

          <form method="POST" action="/api/auth/register">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="reg-role">Daftar Sebagai *</label>
                <select id="reg-role" name="role" class="form-control" required onchange="
                  var r = this.value;
                  document.getElementById('studentFields').style.display = (r === 'STUDENT') ? 'block' : 'none';
                  document.getElementById('mentorFields').style.display = (r === 'MENTOR') ? 'block' : 'none';
                  document.getElementById('umkmFields').style.display = (r === 'UMKM') ? 'block' : 'none';
                  document.getElementById('schoolFields').style.display = (r === 'SCHOOL_ADMIN') ? 'block' : 'none';
                ">
                  <option value="STUDENT">Siswa (SMA / SMK / PKBM)</option>
                  <option value="UMKM">Mitra Usaha (UMKM)</option>
                  <option value="MENTOR">Guru Pembimbing Sekolah</option>
                  <option value="SCHOOL_ADMIN">Perwakilan Sekolah / PKBM</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="reg-name">Nama Lengkap / Penanggung Jawab *</label>
                <input id="reg-name" type="text" name="full_name" required class="form-control" placeholder="Masukkan nama lengkap resmi" />
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="reg-email">Alamat Email *</label>
                <input id="reg-email" type="email" name="email" required class="form-control" placeholder="email@sekolah.sch.id" />
              </div>
              <div class="form-group">
                <label class="form-label" for="reg-password">Kata Sandi (minimal 8 karakter) *</label>
                <input id="reg-password" type="password" name="password" minlength="8" required class="form-control" placeholder="Buat kata sandi yang aman" />
              </div>
            </div>

            <!-- Kolom Khusus Siswa -->
            <div id="studentFields" style="background:var(--brand-warm-ivory);padding:20px;border-radius:14px;border:1px solid var(--border-subtle);margin-bottom:20px;">
              <h4 style="font-size:15px;margin-bottom:12px;">Data Sekolah Siswa</h4>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Kode Undangan Sekolah *</label>
                  <input type="text" name="school_invite_code" class="form-control" placeholder="contoh: SMKN1-DEMO-2026" />
                  <div class="form-help">
                    ${
                      approvedSchools.length > 0
                        ? `Kode sekolah aktif: ${approvedSchools.map((s) => `<code>${escapeHtml(s.invite_code)}</code> (${escapeHtml(s.name)})`).join(', ')}`
                        : `Belum ada sekolah terdaftar—daftarkan sekolah terlebih dahulu atau klik "+ Tampilkan Data Contoh" di atas.`
                    }
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Nomor Induk Siswa Nasional / NISN (Dirahasiakan) *</label>
                  <input type="text" name="nisn" class="form-control" placeholder="10 digit NISN" />
                </div>
              </div>
              <div class="grid-3">
                <div class="form-group">
                  <label class="form-label">Kelas</label>
                  <select name="grade" class="form-control">
                    <option value="Kelas 10 (X)">Kelas 10 (X)</option>
                    <option value="Kelas 11 (XI)" selected>Kelas 11 (XI)</option>
                    <option value="Kelas 12 (XII)">Kelas 12 (XII)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Jurusan / Peminatan</label>
                  <input type="text" name="major" class="form-control" value="Desain Komunikasi Visual" />
                </div>
                <div class="form-group">
                  <label class="form-label">Nama Orang Tua / Wali *</label>
                  <input type="text" name="guardian_name" class="form-control" placeholder="Nama orang tua/wali" />
                </div>
              </div>
            </div>

            <!-- Kolom Khusus Guru Pembimbing -->
            <div id="mentorFields" style="display:none;background:var(--brand-warm-ivory);padding:20px;border-radius:14px;border:1px solid var(--border-subtle);margin-bottom:20px;">
              <h4 style="font-size:15px;margin-bottom:12px;">Data Sekolah Guru Pembimbing</h4>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Kode Undangan Sekolah *</label>
                  <input type="text" name="mentor_school_code" class="form-control" placeholder="Masukkan kode undangan sekolah Anda" />
                </div>
                <div class="form-group">
                  <label class="form-label">Mata Pelajaran / Bidang Keahlian *</label>
                  <input type="text" name="subject_specialty" class="form-control" placeholder="contoh: Desain Komunikasi Visual" />
                </div>
              </div>
            </div>

            <!-- Kolom Khusus UMKM -->
            <div id="umkmFields" style="display:none;background:var(--brand-warm-ivory);padding:20px;border-radius:14px;border:1px solid var(--border-subtle);margin-bottom:20px;">
              <h4 style="font-size:15px;margin-bottom:12px;">Data Usaha UMKM</h4>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Nama Usaha / Toko UMKM *</label>
                  <input type="text" name="business_name" class="form-control" placeholder="contoh: Kopi Nusantara Roastery" />
                </div>
                <div class="form-group">
                  <label class="form-label">Bidang Usaha *</label>
                  <input type="text" name="business_category" class="form-control" placeholder="contoh: Kuliner, Kerajinan, Busana" />
                </div>
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Kota / Kabupaten *</label>
                  <input type="text" name="business_city" class="form-control" placeholder="contoh: Bandung" />
                </div>
                <div class="form-group">
                  <label class="form-label">Penjelasan Singkat Usaha *</label>
                  <input type="text" name="business_description" class="form-control" placeholder="Ceritakan produk atau jasa UMKM Anda" />
                </div>
              </div>
            </div>

            <!-- Kolom Khusus Sekolah -->
            <div id="schoolFields" style="display:none;background:var(--brand-warm-ivory);padding:20px;border-radius:14px;border:1px solid var(--border-subtle);margin-bottom:20px;">
              <h4 style="font-size:15px;margin-bottom:12px;">Data Pendaftaran Sekolah / PKBM</h4>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Nama Resmi Sekolah / PKBM *</label>
                  <input type="text" name="school_name" class="form-control" placeholder="contoh: SMKN 2 Kota Bandung" />
                </div>
                <div class="form-group">
                  <label class="form-label">NPSN *</label>
                  <input type="text" name="npsn" class="form-control" placeholder="8 digit NPSN" />
                </div>
              </div>
              <div class="grid-3">
                <div class="form-group">
                  <label class="form-label">Jenjang Pendidikan</label>
                  <select name="school_type" class="form-control">
                    <option value="SMK">SMK</option>
                    <option value="SMA">SMA</option>
                    <option value="PKBM">PKBM</option>
                    <option value="MA">MA</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Kota / Kabupaten *</label>
                  <input type="text" name="school_city" class="form-control" placeholder="Kota" />
                </div>
                <div class="form-group">
                  <label class="form-label">Provinsi *</label>
                  <input type="text" name="school_province" class="form-control" placeholder="Provinsi" />
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;padding:13px;">
              ${icon('userPlus', 16)} Selesaikan Pendaftaran
            </button>
          </form>
        </div>

        <!-- Panel Panduan Pendaftaran di Samping -->
        <div style="display:flex;flex-direction:column;gap:18px;">
          <div class="card-lavender" style="padding:24px;">
            <span class="section-eyebrow">${icon('shieldCheck', 13)} PANDUAN PENDAFTARAN</span>
            <h3 style="font-size:18px;margin-bottom:10px;">Mengapa Pendaftaran Harus Terverifikasi?</h3>
            <p style="font-size:13.5px;color:var(--brand-charcoal);margin-bottom:14px;">
              SecondLife dirancang khusus untuk menjaga keamanan siswa SMA/SMK saat belajar terjun ke dunia kerja:
            </p>
            <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;">
              <div style="background:#FFFFFF;padding:12px 14px;border-radius:12px;border:1px solid var(--border-subtle);">
                <strong style="color:var(--brand-deep-purple);">1. Siswa &amp; Guru Pembimbing</strong>
                <div style="color:#475569;margin-top:2px;">Menggunakan kode undangan resmi dari sekolah agar setiap siswa langsung terhubung dengan guru pembimbingnya.</div>
              </div>
              <div style="background:#FFFFFF;padding:12px 14px;border-radius:12px;border:1px solid var(--border-subtle);">
                <strong style="color:var(--brand-deep-purple);">2. Mitra Usaha (UMKM)</strong>
                <div style="color:#475569;margin-top:2px;">Profil usaha diperiksa oleh pengelola agar setiap penugasan ramah pelajar dan memberikan apresiasi yang adil.</div>
              </div>
              <div style="background:#FFFFFF;padding:12px 14px;border-radius:12px;border:1px solid var(--border-subtle);">
                <strong style="color:var(--brand-deep-purple);">3. Pihak Sekolah / PKBM</strong>
                <div style="color:#475569;margin-top:2px;">Dapat mendaftarkan NPSN sekolah untuk mendapatkan kode undangan bagi siswa dan guru.</div>
              </div>
            </div>
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid #FBCFE8;font-size:13px;text-align:center;">
              Sudah memiliki akun? <a href="/login" style="font-weight:700;">Masuk ke Akun &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return renderPublicLayout({
    title: 'Daftar Akun',
    activePath: '/register',
    user,
    content
  });
}

export function renderForgotPasswordPage(user: SessionUser | null, message?: string | null): string {
  const content = `
    <section class="auth-portal-section">
      <div class="container" style="max-width:960px;">
        <div class="auth-split-card">
          <div class="auth-visual-wing">
            <div>
              <div style="margin-bottom:24px;">
                ${renderSecondLifeLogo('dark')}
              </div>
              <span class="mh-status-pill" style="margin-bottom:14px;">
                <span class="mh-status-dot"></span>
                <span>PEMULIHAN AKSES AKUN</span>
              </span>
              <h2 style="color:#FFFFFF;font-size:28px;font-weight:800;margin:0 0 12px;">
                Keamanan Akun Siswa &amp; Mitra Tetap Terjaga
              </h2>
              <p style="color:rgba(255,255,255,0.84);font-size:14px;line-height:1.65;margin:0;">
                Permintaan pengaturan ulang kata sandi diperiksa bersama pihak sekolah atau pengelola platform untuk mencegah penyalahgunaan akun pelajar.
              </p>
            </div>
            <div style="padding-top:16px;border-top:1px solid rgba(255,255,255,0.14);font-size:12px;color:rgba(255,255,255,0.78);">
              ${icon('shieldCheck', 14)} Perlindungan Berlapis Ekosistem Sekolah
            </div>
          </div>

          <div class="auth-form-wing">
            <span class="section-eyebrow">${icon('lock', 13)} BANTUAN KATA SANDI</span>
            <h1 style="font-size:24px;margin-bottom:8px;">Atur Ulang Kata Sandi</h1>
            <p style="font-size:13.5px;color:var(--brand-muted-gray);margin-bottom:20px;">
              Masukkan alamat email yang terdaftar beserta keterangan sekolah atau nama usaha Anda.
            </p>
            ${message ? `<div class="alert alert-success">${escapeHtml(message)}</div>` : ''}
            <form method="POST" action="/api/auth/forgot-password">
              <div class="form-group">
                <label class="form-label">Email yang Terdaftar *</label>
                <input type="email" name="email" required class="form-control" placeholder="Masukkan alamat email akun Anda" />
              </div>
              <div class="form-group">
                <label class="form-label">Keterangan Tambahan (Nama Sekolah / Nama Usaha) *</label>
                <input type="text" name="verification_note" required class="form-control" placeholder="Tuliskan nama sekolah atau usaha Anda" />
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;">Kirim Permintaan Pemulihan</button>
            </form>
            <div style="margin-top:18px;text-align:center;font-size:13px;font-weight:600;">
              <a href="/login">&larr; Kembali ke Halaman Masuk</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  return renderPublicLayout({
    title: 'Lupa Kata Sandi',
    activePath: '/forgot-password',
    user,
    content
  });
}

export function renderPublicVerifyPassportPage(user: SessionUser | null, code: string): string {
  const db = getDb();
  const passport = db
    .prepare(
      `SELECT
         ep.*, u.full_name as student_name, stu.grade, stu.major
       FROM experience_passports ep
       JOIN students stu ON stu.id = ep.student_id
       JOIN users u ON u.id = stu.user_id
       WHERE ep.verification_code = ?`
    )
    .get(code) as Record<string, any> | undefined;

  const content = `
    <div class="container" style="padding-top:44px;max-width:920px;">
      ${
        !passport
          ? `<div class="card" style="padding:36px;">
               <div class="empty-state">
                 <h4>Sertifikat dengan Kode <code>${escapeHtml(code)}</code> Tidak Ditemukan</h4>
                 <p>Pastikan kode sertifikat sesuai dengan yang tertera pada lembar Sertifikat Pengalaman Kerja siswa.</p>
               </div>
             </div>`
          : `<div class="certificate-canvas">
               <div class="certificate-inner-frame">
                 <div class="certificate-header-bar">
                   <div>
                     ${renderSecondLifeLogo('light')}
                     <div style="font-size:11px;color:var(--brand-muted-gray);margin-top:6px;font-weight:600;">
                       HALAMAN PENGECEKAN KEASLIAN SERTIFIKAT PENGALAMAN KERJA SISWA
                     </div>
                   </div>
                   <div style="text-align:right;">
                     <div style="font-size:10.5px;font-weight:800;letter-spacing:0.10em;text-transform:uppercase;color:var(--brand-deep-purple);">Kode Sertifikat</div>
                     <div style="font-size:15px;font-weight:800;"><code>${escapeHtml(code)}</code></div>
                     <div style="margin-top:6px;">
                       ${demoBadge(passport.is_demo)}
                       ${statusBadge(passport.outcome_status)}
                       ${statusBadge(passport.verification_status)}
                     </div>
                   </div>
                 </div>

                 <div class="certificate-ribbon-title">
                   <div class="cert-type-kicker">DOKUMEN RESMI TERVERIFIKASI</div>
                   <h1>Sertifikat Pengalaman Kerja Terverifikasi</h1>
                 </div>

                 <div class="certificate-recipient-box">
                   <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.10em;color:var(--brand-muted-gray);">
                     Diberikan Kepada Siswa:
                   </div>
                   <div class="certificate-recipient-name">${escapeHtml(passport.student_name)}</div>
                   <div style="font-size:14px;color:var(--brand-charcoal);font-weight:600;">
                     Asal Sekolah: <strong>${escapeHtml(passport.school_name)}</strong> &bull; Guru Pembimbing: <strong>${escapeHtml(passport.teacher_verifier_name)}</strong>
                   </div>
                   <div style="margin-top:10px;font-size:17px;font-weight:800;color:var(--brand-deep-purple);">
                     ${escapeHtml(passport.assignment_title)} &mdash; Mitra UMKM: ${escapeHtml(passport.business_name)}
                   </div>
                 </div>

                 <div class="meta-spec-grid" style="margin-bottom:18px;">
                   <div class="meta-spec-cell">
                     <div class="meta-spec-label">Identitas Siswa &amp; Sekolah</div>
                     <div class="meta-spec-val">
                       <strong>Nama Siswa:</strong> ${escapeHtml(passport.student_name)}<br/>
                       <strong>Sekolah:</strong> ${escapeHtml(passport.school_name)}<br/>
                       <strong>Guru Pembimbing:</strong> ${escapeHtml(passport.teacher_verifier_name)}
                     </div>
                   </div>
                   <div class="meta-spec-cell">
                     <div class="meta-spec-label">Mitra UMKM &amp; Hasil Akhir</div>
                     <div class="meta-spec-val">
                       <strong>Mitra UMKM:</strong> ${escapeHtml(passport.business_name)}<br/>
                       <strong>Tanggal Selesai:</strong> ${escapeHtml(passport.completion_date)}<br/>
                       <strong>Status Kelulusan:</strong> ${escapeHtml(passport.outcome_status)}
                     </div>
                   </div>
                 </div>

                 <div style="background:#FFFFFF;border:1px solid var(--border-subtle);padding:16px;border-radius:12px;margin-bottom:16px;">
                   <h4 style="margin-bottom:6px;font-size:15px;">Proyek yang Dikerjakan: ${escapeHtml(passport.assignment_title)}</h4>
                   <p style="font-size:13.5px;margin:0 0 8px;">${escapeHtml(passport.assignment_description)}</p>
                   <div style="font-size:13px;"><strong>Hasil Karya yang Diserahkan:</strong> ${escapeHtml(passport.deliverables_summary)}</div>
                 </div>

                 <div style="font-size:13.5px;margin-bottom:14px;padding:14px;background:var(--brand-light-lavender);border-radius:10px;">
                   <strong>Catatan Penilaian UMKM:</strong> ${escapeHtml(passport.umkm_evaluation_summary)}
                   ${passport.overall_score ? ` (Nilai Rata-rata: <strong>${passport.overall_score} / 5.0</strong>)` : ''}
                 </div>

                 <div style="font-size:12px;color:var(--brand-muted-gray);border-top:1px solid var(--border-subtle);padding-top:12px;display:flex;align-items:center;gap:8px;">
                   ${icon('shield', 14)} Data pribadi siswa (NISN, alamat rumah, dan nomor telepon orang tua) disembunyikan secara otomatis demi keamanan pelajar.
                 </div>
               </div>
             </div>`
      }
    </div>
  `;

  return renderPublicLayout({
    title: `Cek Sertifikat ${code}`,
    activePath: '/verify',
    user,
    content
  });
}

export function renderStaticGovernancePage(
  user: SessionUser | null,
  pageType: 'safety' | 'privacy' | 'terms' | 'contact'
): string {
  const titles: Record<typeof pageType, string> = {
    safety: '6 Tahap Perlindungan Siswa & Etika Penugasan',
    privacy: 'Kebijakan Privasi & Perlindungan Data Pelajar',
    terms: 'Ketentuan Layanan & Aturan Apresiasi Karya Siswa',
    contact: 'Pusat Bantuan Sekolah, Siswa & Mitra UMKM'
  };

  const subtitles: Record<typeof pageType, string> = {
    safety: 'Setiap penugasan siswa di SecondLife wajib melewati 6 tahapan pengawasan resmi oleh sekolah, guru pembimbing, dan orang tua/wali.',
    privacy: 'Standar kerahasiaan data pribadi pelajar SMA/SMK serta pemisahan akses data antar sekolah mitra.',
    terms: 'Komitmen keadilan apresiasi karya siswa, batas revisi wajar, dan kejujuran penerbitan Sertifikat Pengalaman Kerja.',
    contact: 'Panduan saluran bantuan resmi terintegrasi bagi siswa, guru pembimbing, sekolah, dan mitra UMKM.'
  };

  let bodyHtml = '';
  if (pageType === 'safety') {
    bodyHtml = `
      <div class="gov-feature-grid">
        ${SIX_STAGE_SAFETY_SYSTEM.map(
          (s) => `<div class="gov-feature-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
              <span class="status-badge badge-neutral">Tahap 0${s.stage}</span>
              <span style="font-size:12px;font-weight:700;color:var(--brand-deep-purple);">${escapeHtml(s.responsibleParties)}</span>
            </div>
            <h3 style="font-size:17.5px;margin:0 0 8px;">${escapeHtml(s.title)}</h3>
            <p style="font-size:13.5px;margin:0 0 12px;">${escapeHtml(s.description)}</p>
            <ul style="padding-left:18px;font-size:13px;margin:0;color:#475569;display:flex;flex-direction:column;gap:4px;">
              ${s.checkpoints.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
            </ul>
          </div>`
        ).join('')}
      </div>
    `;
  } else if (pageType === 'privacy') {
    bodyHtml = `
      <div class="gov-feature-grid">
        <div class="gov-feature-card">
          <div class="icon-squircle" style="margin-bottom:12px;">${icon('lock', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">1. Kerahasiaan Data Pribadi Siswa</h3>
          <p style="font-size:13.5px;margin:0;">SecondLife hanya mencatat data yang diperlukan untuk pemeriksaan sekolah dan pendampingan tugas. Nomor telepon siswa, alamat rumah, dan NISN tidak pernah ditampilkan di halaman publik maupun kepada pihak UMKM.</p>
        </div>
        <div class="gov-feature-card">
          <div class="icon-squircle icon-squircle-gold" style="margin-bottom:12px;">${icon('shield', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">2. Pemisahan Data Antar Sekolah</h3>
          <p style="font-size:13.5px;margin:0;">Pihak sekolah dan guru pembimbing hanya dapat melihat data siswa, karya, dan tugas yang berasal dari sekolah mereka sendiri secara terpisah dan aman.</p>
        </div>
        <div class="gov-feature-card">
          <div class="icon-squircle icon-squircle-green" style="margin-bottom:12px;">${icon('checkCircle', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">3. Izin Menampilkan Karya di Galeri</h3>
          <p style="font-size:13.5px;margin:0;">Karya tugas sekolah siswa hanya akan tampil di galeri publik apabila siswa yang bersangkutan dan guru pembimbing sekolahnya telah memberikan persetujuan.</p>
        </div>
        <div class="gov-feature-card">
          <div class="icon-squircle" style="margin-bottom:12px;">${icon('award', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">4. Keamanan Pengecekan Sertifikat</h3>
          <p style="font-size:13.5px;margin:0;">Halaman pengecekan keaslian Sertifikat Pengalaman Kerja hanya menampilkan nama siswa, sekolah asal, proyek yang diselesaikan, dan pengesahan guru tanpa membuka data sensitif pelajar.</p>
        </div>
      </div>
    `;
  } else if (pageType === 'terms') {
    bodyHtml = `
      <div class="gov-feature-grid">
        <div class="gov-feature-card">
          <div class="icon-squircle icon-squircle-gold" style="margin-bottom:12px;">${icon('briefcase', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">1. Larangan Memanfaatkan Karya Siswa Cuma-Cuma</h3>
          <p style="font-size:13.5px;margin:0;">Setiap tugas dari UMKM yang hasilnya akan dipakai untuk keperluan komersial (jualan atau promosi usaha) wajib menyertakan uang apresiasi yang disepakati sejak awal.</p>
        </div>
        <div class="gov-feature-card">
          <div class="icon-squircle" style="margin-bottom:12px;">${icon('clock', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">2. Batas Revisi &amp; Beban Waktu yang Wajar</h3>
          <p style="font-size:13.5px;margin:0;">Setiap tugas harus mencantumkan hasil akhir yang jelas, perkiraan waktu pengerjaan yang ramah pelajar, dan batas maksimal revisi agar tidak mengganggu kegiatan belajar di sekolah.</p>
        </div>
        <div class="gov-feature-card">
          <div class="icon-squircle icon-squircle-green" style="margin-bottom:12px;">${icon('award', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">3. Kejujuran Sertifikat Pengalaman Kerja</h3>
          <p style="font-size:13.5px;margin:0;">Sertifikat Pengalaman Kerja tidak pernah dibagikan secara otomatis, melainkan hanya diterbitkan setelah tugas benar-benar selesai, dinilai oleh UMKM, dan disahkan oleh guru sekolah.</p>
        </div>
        <div class="gov-feature-card">
          <div class="icon-squircle" style="margin-bottom:12px;">${icon('shieldCheck', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">4. Pendampingan Guru &amp; Persetujuan Orang Tua</h3>
          <p style="font-size:13.5px;margin:0;">Siswa tidak pernah ditugaskan secara otomatis tanpa persetujuan guru pembimbing sekolah dan konfirmasi izin dari orang tua/wali.</p>
        </div>
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="gov-feature-grid">
        <div class="gov-feature-card">
          <div class="icon-squircle" style="margin-bottom:12px;">${icon('userPlus', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">Pendaftaran Sekolah &amp; Mitra UMKM</h3>
          <p style="font-size:13.5px;margin-bottom:14px;">Sekolah (SMA, SMK, dan PKBM) maupun pemilik UMKM dapat mendaftarkan diri langsung melalui halaman pendaftaran resmi untuk diverifikasi oleh pengelola.</p>
          <a href="/register" class="btn btn-primary btn-sm">${icon('arrowRight', 14)} Buka Halaman Pendaftaran</a>
        </div>
        <div class="gov-feature-card">
          <div class="icon-squircle icon-squircle-gold" style="margin-bottom:12px;">${icon('lifeBuoy', 20)}</div>
          <h3 style="font-size:17.5px;margin-bottom:8px;">Saluran Bantuan &amp; Pengaduan Keamanan Siswa</h3>
          <p style="font-size:13.5px;margin-bottom:14px;">Siswa, guru pembimbing, dan pihak sekolah dapat menyampaikan laporan kendala atau perlindungan siswa langsung melalui menu <strong>Bantuan &amp; Aduan</strong> di dalam ruang kerja masing-masing.</p>
          <a href="/login" class="btn btn-secondary btn-sm">${icon('logIn', 14)} Masuk ke Ruang Kerja</a>
        </div>
      </div>
    `;
  }

  return renderPublicLayout({
    title: titles[pageType],
    activePath: `/${pageType}`,
    user,
    content: `
      <section class="page-hero-compact">
        <div class="container" style="max-width:1060px;">
          <span class="mh-status-pill" style="margin-bottom:12px;">
            <span class="mh-status-dot"></span>
            <span>TATA KELOLA &amp; PERLINDUNGAN PELAJAR</span>
          </span>
          <h1 style="color:#FFFFFF;font-size:34px;margin:0 0 8px;">${escapeHtml(titles[pageType])}</h1>
          <p style="color:rgba(255,255,255,0.85);font-size:15px;max-width:720px;margin:0;">
            ${escapeHtml(subtitles[pageType])}
          </p>
        </div>
      </section>

      <div class="container" style="padding-top:32px;max-width:1060px;">
        <div class="gov-pill-nav">
          <a href="/safety" class="gov-pill-link ${pageType === 'safety' ? 'active' : ''}">${icon('shieldCheck', 14)} 6 Tahap Perlindungan Siswa</a>
          <a href="/privacy" class="gov-pill-link ${pageType === 'privacy' ? 'active' : ''}">${icon('lock', 14)} Kebijakan Privasi</a>
          <a href="/terms" class="gov-pill-link ${pageType === 'terms' ? 'active' : ''}">${icon('fileText', 14)} Ketentuan Layanan</a>
          <a href="/contact" class="gov-pill-link ${pageType === 'contact' ? 'active' : ''}">${icon('lifeBuoy', 14)} Pusat Bantuan</a>
        </div>
        ${bodyHtml}
      </div>
    `
  });
}
