// ============================================================================
// SECOND LIFE — Bespoke Brand Identity, Royal Magenta Palette, Asymmetric
// Editorial & Bento Layouts, and Official Certificate Design System
// ============================================================================

import type { RoleName, SessionUser } from '../types/domain.ts';
import { getDb, isDemoMode } from '../lib/db.ts';

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  let cleaned = String(str).replace(/^\s*\[DEMO(?:\s+DATA)?\]\s*/gi, '');
  const originMap: Record<string, string> = {
    'Vocational Practicum': 'Tugas Praktik Kejuruan',
    'School Assignment': 'Tugas Sekolah',
    'Extracurricular Project': 'Kegiatan Ekstrakurikuler',
    'Personal Learning Project': 'Karya Belajar Mandiri',
    'School Competition': 'Lomba Sekolah'
  };
  if (originMap[cleaned]) {
    cleaned = originMap[cleaned];
  }
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatIdr(amount: number | null | undefined): string {
  if (!amount || amount <= 0) return 'Rp0 (Pembelajaran Non-Moneter)';
  return 'Rp' + Number(amount).toLocaleString('id-ID');
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Crisp SVG Lucide Icons
const LUCIDE_PATHS: Record<string, string> = {
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  briefcase: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  graduationCap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  school: '<path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plusCircle: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  checkSquare: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  barChart: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  lifeBuoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" x2="9.17" y1="4.93" y2="9.17"/><line x1="14.83" x2="19.07" y1="14.83" y2="19.07"/><line x1="14.83" x2="19.07" y1="9.17" y2="4.93"/><line x1="14.83" x2="18.36" y1="9.17" y2="5.64"/><line x1="4.93" x2="9.17" y1="19.07" y2="14.83"/>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  logIn: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  messageCircle: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  instagram: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>'
};

export function icon(name: keyof typeof LUCIDE_PATHS | string, size = 18, className = ''): string {
  const pathSvg = LUCIDE_PATHS[name] || LUCIDE_PATHS.layers;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon ${className}" aria-hidden="true">${pathSvg}</svg>`;
}

/**
 * Bespoke SECOND LIFE Brand Emblem SVG
 * Symbolizes an Open Schoolbook Page transforming into a Rising Wing + Golden Verification Star
 */
export function renderSecondLifeLogo(theme: 'light' | 'dark' = 'light', compact = false): string {
  const wordFirst = theme === 'dark' ? '#FFFFFF' : '#2D1028';
  const wordSecond = theme === 'dark' ? '#F472B6' : '#C02678';
  const subColor = theme === 'dark' ? 'rgba(255,255,255,0.65)' : '#64748B';

  return `
    <span class="sl-logo-lockup">
      <span class="sl-logo-emblem" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="slCrestGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#E11D74"/>
              <stop offset="52%" stop-color="#9D174D"/>
              <stop offset="100%" stop-color="#2D1028"/>
            </linearGradient>
            <linearGradient id="slWingGold" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FDE68A"/>
              <stop offset="100%" stop-color="#F59E0B"/>
            </linearGradient>
          </defs>
          <!-- Squircle Crest Base -->
          <rect x="2" y="2" width="40" height="40" rx="12" fill="url(#slCrestGrad)"/>
          <rect x="3" y="3" width="38" height="38" rx="11" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
          <!-- Open Book Base Folding into Soaring S-Wing -->
          <path d="M11 29.5C14.5 29.5 18 27.5 22 23.5C26 19.5 29.5 17.5 33 17.5" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M11 23C15.5 23 19.5 19.5 23.5 14.5C26.5 10.8 30 9.5 33.5 9.5" stroke="url(#slWingGold)" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M14 34C18.5 34 23 32 27.5 27.5C29.8 25.2 31.8 24 34 24" stroke="rgba(255,255,255,0.55)" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Golden Rising Spark Star -->
          <path d="M31 7L32.2 10.3L35.5 11.5L32.2 12.7L31 16L29.8 12.7L26.5 11.5L29.8 10.3L31 7Z" fill="#FDE08D"/>
          <circle cx="13.5" cy="15.5" r="2" fill="#F9A8D4"/>
        </svg>
      </span>
      ${
        compact
          ? ''
          : `<span class="sl-logo-text">
               <span class="sl-logo-wordmark">
                 <strong style="color:${wordFirst};">Second</strong><span style="color:${wordSecond};">Life</span><span class="sl-logo-dot"></span>
               </span>
               <span class="sl-logo-tagline" style="color:${subColor};">Karya Sekolah ke Dunia Kerja</span>
             </span>`
      }
    </span>
  `;
}

const STATUS_TRANSLATIONS: Record<string, string> = {
  'Draft': 'Draf',
  'Submitted': 'Diajukan',
  'Under School Review': 'Ditinjau Sekolah',
  'Verified': 'Terverifikasi Sekolah',
  'School Verified': 'Terverifikasi Sekolah',
  'School Verified & Authorized': 'Terverifikasi & Disetujui Sekolah',
  'Rejected': 'Perlu Perbaikan',
  'Published': 'Tayang',
  'Submitted for Admin Review': 'Menunggu Pemeriksaan Admin',
  'Approved': 'Disetujui',
  'Student Applied': 'Siswa Mendaftar',
  'Teacher Approval Pending': 'Menunggu Persetujuan Guru',
  'Guardian Consent Pending': 'Menunggu Izin Orang Tua',
  'Ready to Start': 'Siap Dimulai',
  'In Progress': 'Sedang Dikerjakan',
  'Under Review': 'Sedang Dinilai UMKM',
  'Revision Requested': 'Perlu Revisi',
  'Accepted': 'Diterima UMKM',
  'School Verification': 'Pengesahan Sekolah',
  'Closed': 'Selesai & Ditutup',
  'Cancelled': 'Dibatalkan',
  'Withdrawn': 'Mengundurkan Diri',
  'Expired': 'Kedaluwarsa',
  'Incomplete': 'Belum Tuntas',
  'Completed and Accepted': 'Tuntas & Diterima',
  'Completed but Not Accepted': 'Selesai (Belum Diterima)',
  'VERIFIED': 'Terverifikasi',
  'ACTIVE': 'Aktif',
  'PENDING_APPROVAL': 'Menunggu Persetujuan',
  'SUSPENDED': 'Dinonaktifkan',
  'VERIFIED_ISSUED': 'Sertifikat Sah Terbit',
  'APPLIED': 'Melamar',
  'SELECTED': 'Terpilih',
  'OPEN': 'Terbuka',
  'RESOLVED': 'Terselesaikan'
};

export function translateCategory(category: string): string {
  const map: Record<string, string> = {
    'Graphic Design': 'Desain Grafis & Visual',
    'Photography': 'Fotografi Produk',
    'Video Editing': 'Video Pendek & Reels',
    'Writing': 'Penulisan & Cerita Produk',
    'Social Media Content': 'Konten Media Sosial',
    'Simple Catalog Design': 'Desain Katalog Usaha',
    'Basic Data & Admin Support': 'Administrasi & Data Rapi'
  };
  return map[category] || category;
}

export function statusBadge(status: string): string {
  const normalized = status.toUpperCase();
  let tone = 'badge-neutral';
  if (
    normalized.includes('VERIFIED') ||
    normalized.includes('PUBLISHED') ||
    normalized.includes('APPROVED') ||
    normalized.includes('ACCEPTED') ||
    normalized.includes('COMPLETED AND ACCEPTED') ||
    normalized.includes('ACTIVE') ||
    normalized.includes('CLOSED') ||
    normalized.includes('RESOLVED') ||
    normalized.includes('CONFIRMED')
  ) {
    tone = 'badge-success';
  } else if (
    normalized.includes('PENDING') ||
    normalized.includes('REVIEW') ||
    normalized.includes('SUBMITTED') ||
    normalized.includes('PROGRESS') ||
    normalized.includes('READY') ||
    normalized.includes('APPLIED') ||
    normalized.includes('REVISION') ||
    normalized.includes('OPEN')
  ) {
    tone = 'badge-warning';
  } else if (
    normalized.includes('REJECTED') ||
    normalized.includes('CANCELLED') ||
    normalized.includes('SUSPENDED') ||
    normalized.includes('INCOMPLETE') ||
    normalized.includes('UNSUCCESSFUL') ||
    normalized.includes('NOT ACCEPTED') ||
    normalized.includes('CRITICAL')
  ) {
    tone = 'badge-danger';
  }
  const label = STATUS_TRANSLATIONS[status] || status;
  return `<span class="status-badge ${tone}" data-status="${escapeHtml(status)}"><span class="badge-dot"></span>${escapeHtml(label)}</span>`;
}

export function demoBadge(isDemoRecord: number | boolean | undefined): string {
  if (!isDemoRecord) return '';
  return `<span class="demo-record-pill" title="Data simulasi terisolasi">Simulasi</span>`;
}

const MAGANGHUB_BLUEPRINT_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath d='M88 0H0v88' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3Ccircle cx='44' cy='44' r='22' stroke='rgba(255,255,255,0.065)' stroke-width='1'/%3E%3C/g%3E%3C/svg%3E`;

const BRAND_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap');

  :root {
    --brand-deep-purple: #B81D73;
    --brand-magenta: #D62887;
    --brand-dark-navy: #2A0F25;
    --brand-plum-mid: #581545;
    --brand-warm-ivory: #FAF7F9;
    --brand-soft-white: #FFFFFF;
    --brand-muted-gold: #F0BE63;
    --brand-light-lavender: #FDF2F8;
    --brand-charcoal: #1E293B;
    --brand-slate-body: #475569;
    --brand-muted-gray: #64748B;
    --border-subtle: #EDE3EA;
    --border-hover: #DFC2D4;
    --status-green-bg: #ECFDF5;
    --status-green-fg: #047857;
    --status-amber-bg: #FFFBEB;
    --status-amber-fg: #B45309;
    --status-red-bg: #FEF2F2;
    --status-red-fg: #B91C1C;
    --radius-sm: 10px;
    --radius-md: 16px;
    --radius-lg: 22px;
    --radius-pill: 9999px;
    --shadow-xs: 0 1px 2px rgba(42, 15, 37, 0.03);
    --shadow-sm: 0 4px 18px -4px rgba(42, 15, 37, 0.05), 0 2px 6px -1px rgba(42, 15, 37, 0.03);
    --shadow-md: 0 14px 34px -6px rgba(42, 15, 37, 0.09), 0 4px 12px -2px rgba(42, 15, 37, 0.04);
    --shadow-float: 0 20px 44px -6px rgba(32, 8, 28, 0.26), 0 4px 14px rgba(32, 8, 28, 0.09);
  }

  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
  }

  /* Unified, Disciplined Typography System */
  body {
    margin: 0;
    padding: 0;
    background-color: var(--brand-warm-ivory);
    background-image:
      radial-gradient(circle at 10% 6%, rgba(214, 40, 135, 0.05) 0%, transparent 38%),
      radial-gradient(circle at 90% 18%, rgba(240, 190, 99, 0.06) 0%, transparent 36%);
    background-attachment: fixed;
    color: var(--brand-charcoal);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 400;
    font-size: 14.5px;
    line-height: 1.65;
    letter-spacing: -0.006em;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    color: var(--brand-dark-navy);
    margin-top: 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700;
    letter-spacing: -0.022em;
    line-height: 1.26;
  }

  p {
    color: var(--brand-slate-body);
    line-height: 1.68;
    font-weight: 400;
    margin-top: 0;
  }

  strong, b {
    font-weight: 600;
    color: #0F172A;
  }

  a {
    color: var(--brand-deep-purple);
    text-decoration: none;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  a:hover {
    color: var(--brand-dark-navy);
  }

  code, pre, .meta-mono {
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 12px;
  }

  .lucide-icon {
    vertical-align: middle;
    flex-shrink: 0;
  }

  /* ==========================================================================
     BESPOKE LOGO LOCKUP
     ========================================================================== */
  .sl-logo-lockup {
    display: inline-flex;
    align-items: center;
    gap: 11px;
  }
  .sl-logo-emblem {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    filter: drop-shadow(0 4px 10px rgba(184, 29, 115, 0.22));
    transition: transform 0.2s ease;
  }
  .sl-logo-lockup:hover .sl-logo-emblem {
    transform: scale(1.04) rotate(-2deg);
  }
  .sl-logo-text {
    display: flex;
    flex-direction: column;
  }
  .sl-logo-wordmark {
    font-size: 21px;
    letter-spacing: -0.03em;
    line-height: 1.05;
    display: inline-flex;
    align-items: baseline;
  }
  .sl-logo-wordmark strong {
    font-weight: 800;
  }
  .sl-logo-wordmark span {
    font-weight: 600;
  }
  .sl-logo-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #F59E0B;
    margin-left: 2px;
    display: inline-block;
  }
  .sl-logo-tagline {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-top: 2px;
  }

  /* ==========================================================================
     1. TOP UTILITY BAR & MAIN NAVBAR
     ========================================================================== */
  .utility-topbar {
    background-color: #F6EDF2;
    border-bottom: 1px solid #E8D8E2;
    font-size: 12px;
    color: #475569;
    padding: 7px 0;
  }
  .utility-topbar-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
  }
  .utility-center-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
  }
  .utility-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #334155;
    font-weight: 500;
  }
  .utility-item strong {
    color: var(--brand-dark-navy);
    font-weight: 700;
  }
  .utility-item-muted {
    color: #64748B;
    font-weight: 400;
  }
  .utility-pill-tag {
    background-color: #F8D4E7;
    color: #9D174D;
    font-weight: 700;
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 5px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .utility-divider {
    width: 1px;
    height: 13px;
    background-color: #D8C2CF;
  }

  .demo-record-pill {
    display: inline-flex;
    align-items: center;
    background: #FDF2F8;
    color: #9D174D;
    border: 1px solid #FBCFE8;
    font-size: 10.5px;
    font-weight: 600;
    padding: 1.5px 8px;
    border-radius: var(--radius-pill);
    margin-left: 6px;
    vertical-align: middle;
  }

  .public-header {
    background-color: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border-subtle);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .public-nav-container {
    max-width: 1280px;
    margin: 0 auto;
    height: 76px;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .public-nav-links {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .public-nav-links a {
    font-size: 14px;
    font-weight: 500;
    color: #475569;
    padding: 8px 16px;
    border-radius: var(--radius-pill);
    transition: all 0.18s ease;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .public-nav-links a:hover {
    color: var(--brand-deep-purple);
    background-color: #FDF2F8;
  }
  .public-nav-links a.active {
    background-color: #FCE7F3;
    color: #9D174D;
    font-weight: 600;
  }

  .nav-auth-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .btn-nav-register {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    border-radius: 11px;
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    color: #1E293B;
    font-size: 13.5px;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    transition: all 0.18s ease;
  }
  .btn-nav-register:hover {
    border-color: #F9A8D4;
    background-color: #FDF2F8;
    color: #9D174D;
  }
  .btn-nav-login {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 20px;
    border-radius: 11px;
    background: linear-gradient(135deg, var(--brand-magenta) 0%, var(--brand-deep-purple) 100%);
    color: #FFFFFF;
    font-size: 13.5px;
    font-weight: 600;
    box-shadow: 0 4px 14px rgba(184, 29, 115, 0.28);
    transition: all 0.18s ease;
  }
  .btn-nav-login:hover {
    color: #FFFFFF;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(184, 29, 115, 0.36);
  }

  /* ==========================================================================
     2. ROYAL MAGENTA HERO & REAL SCHOOL PHOTOGRAPH STAGE
     ========================================================================== */
  .mh-hero {
    position: relative;
    background-color: var(--brand-dark-navy);
    background-image:
      url("${MAGANGHUB_BLUEPRINT_SVG}"),
      radial-gradient(circle at 16% 24%, rgba(214, 40, 135, 0.45) 0%, transparent 48%),
      radial-gradient(circle at 84% 72%, rgba(240, 190, 99, 0.18) 0%, transparent 45%),
      linear-gradient(128deg, #2A0E24 0%, #681448 48%, #981B62 100%);
    background-size: 88px 88px, 100% 100%, 100% 100%, 100% 100%;
    background-position: center top;
    color: var(--brand-soft-white);
    padding: 52px 0 84px;
    overflow: hidden;
  }

  .mh-hero-inner {
    position: relative;
    z-index: 2;
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 28px;
    display: grid;
    grid-template-columns: 1.06fr 0.94fr;
    gap: 48px;
    align-items: center;
  }

  .mh-hero-copy {
    padding-bottom: 0;
  }

  .mh-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 7px 16px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #FFFFFF;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 18px;
    backdrop-filter: blur(8px);
  }
  .mh-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #F472B6;
    box-shadow: 0 0 0 4px rgba(244, 114, 182, 0.28);
  }

  .mh-hero-title {
    font-size: clamp(33px, 3.4vw, 44px);
    line-height: 1.18;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: -0.026em;
    margin: 0 0 18px;
  }
  .mh-hero-title .gold-highlight {
    font-family: 'Instrument Serif', Georgia, serif;
    color: #FDE08D;
    font-style: italic;
    font-weight: 400;
    font-size: 1.14em;
    letter-spacing: -0.01em;
    padding-right: 4px;
  }

  .mh-hero-lead {
    font-size: 15.5px;
    line-height: 1.70;
    color: rgba(255, 255, 255, 0.88);
    max-width: 540px;
    margin: 0 0 26px;
    font-weight: 400;
  }

  .mh-showcase-stage {
    position: relative;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0;
  }
  .mh-portrait-frame {
    width: 100%;
    max-width: 505px;
    border-radius: 22px;
    background: #1E0B1A;
    box-shadow: 12px 12px 0 rgba(240, 190, 99, 0.20), 0 24px 56px rgba(18, 4, 15, 0.44);
    border: 2.5px solid rgba(255, 255, 255, 0.26);
    position: relative;
    overflow: hidden;
  }
  .mh-portrait-topbar {
    background: rgba(34, 11, 29, 0.96);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    padding: 10px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 600;
  }
  .mh-portrait-dots {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .mh-portrait-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .mh-portrait-photo {
    width: 100%;
    height: 365px;
    object-fit: cover;
    object-position: center 14%;
    display: block;
  }
  .mh-portrait-caption {
    background: rgba(30, 11, 26, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    padding: 12px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: rgba(255, 255, 255, 0.92);
    font-size: 12px;
    font-weight: 500;
  }

  .hero-trust-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 26px;
    padding-top: 22px;
    border-top: 1px solid rgba(255, 255, 255, 0.16);
  }
  .hero-trust-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.90);
    font-weight: 500;
  }

  /* Talent Pathway Editorial Rows (Non-Monotonous Interest Exploration) */
  .talent-pathway-list {
    display: flex;
    flex-direction: column;
    border-top: 1.5px solid var(--border-subtle);
  }
  .talent-pathway-row {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr 1.1fr auto;
    gap: 24px;
    align-items: center;
    padding: 24px 16px;
    border-bottom: 1.5px solid var(--border-subtle);
    transition: background-color 0.18s ease, padding-left 0.18s ease;
    text-decoration: none;
    color: inherit;
  }
  .talent-pathway-row:hover {
    background-color: #FDF7FA;
    padding-left: 22px;
  }
  .pathway-from-box {
    background: #FAF7F9;
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 12px 15px;
    font-size: 13px;
    color: #334155;
  }
  .pathway-to-box {
    background: #FDF2F8;
    border: 1px solid #FBCFE8;
    border-radius: 12px;
    padding: 12px 15px;
    font-size: 13px;
    color: #2A0F25;
  }

  .mh-search-bridge {
    max-width: 1160px;
    margin: -34px auto 0;
    padding: 0 28px;
    position: relative;
    z-index: 15;
  }
  .mh-search-box {
    background: #FFFFFF;
    border-radius: 20px;
    padding: 20px 26px;
    box-shadow: 0 18px 40px -10px rgba(45, 16, 40, 0.10), 0 4px 14px rgba(45, 16, 40, 0.04);
    border: 1px solid var(--border-subtle);
  }

  /* ==========================================================================
     3. NON-MONOTONOUS EDITORIAL SPLIT, BENTO MOSAIC & STAT RIBBON LAYOUTS
     ========================================================================== */
  /* Asymmetric Sticky Editorial Split (40% Left Narrative / 60% Right Connected Ledger) */
  .editorial-split {
    display: grid;
    grid-template-columns: 0.42fr 0.58fr;
    gap: 52px;
    align-items: start;
  }
  .editorial-sticky-pane {
    position: sticky;
    top: 104px;
  }
  .process-ledger {
    display: flex;
    flex-direction: column;
    gap: 18px;
    position: relative;
  }
  .process-ledger-row {
    background: #FFFFFF;
    border: 1px solid var(--border-subtle);
    border-radius: 20px;
    padding: 24px 28px;
    display: grid;
    grid-template-columns: 64px 1fr auto;
    gap: 20px;
    align-items: center;
    box-shadow: var(--shadow-sm);
    transition: all 0.22s ease;
  }
  .process-ledger-row:hover {
    border-color: var(--brand-magenta);
    transform: translateX(4px);
    box-shadow: var(--shadow-md);
  }
  .process-num-pill {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%);
    border: 1px solid #FBCFE8;
    color: var(--brand-deep-purple);
    font-size: 20px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 12-Column Asymmetric Bento Mosaic */
  .bento-mosaic {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 22px;
  }
  .bento-span-7 { grid-column: span 7; }
  .bento-span-5 { grid-column: span 5; }
  .bento-span-8 { grid-column: span 8; }
  .bento-span-4 { grid-column: span 4; }
  .bento-span-12 { grid-column: span 12; }

  .bento-tile {
    background: #FFFFFF;
    border: 1px solid var(--border-subtle);
    border-radius: 22px;
    padding: 30px 32px;
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
  }
  .bento-tile-dark {
    background: linear-gradient(140deg, #2D1028 0%, #681448 58%, #9D174D 100%);
    color: #FFFFFF;
    border: none;
  }
  .bento-tile-dark h3, .bento-tile-dark h4, .bento-tile-dark strong {
    color: #FFFFFF;
  }
  .bento-tile-dark p, .bento-tile-dark li {
    color: rgba(255, 255, 255, 0.84);
  }

  /* Unified Horizontal Stat Ribbon (Replaces monotonous 4-box metric row) */
  .stat-ribbon {
    background: #FFFFFF;
    border: 1px solid var(--border-subtle);
    border-radius: 18px;
    box-shadow: var(--shadow-sm);
    display: grid;
    grid-template-columns: 1.25fr 1fr 1fr 1fr;
    overflow: hidden;
    margin-bottom: 24px;
  }
  .stat-ribbon-cell {
    padding: 20px 24px;
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .stat-ribbon-cell:last-child {
    border-right: none;
  }
  .stat-ribbon-cell-highlight {
    background: linear-gradient(135deg, #FDF2F8 0%, #FFFFFF 100%);
  }

  /* ==========================================================================
     4. OFFICIAL PRINTABLE CERTIFICATE (SERTIFIKAT PENGALAMAN KERJA)
     ========================================================================== */
  .certificate-canvas {
    background: #FFFFFF;
    border: 3px solid #2A0F25;
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 20px 50px rgba(42, 15, 37, 0.12);
    position: relative;
  }
  .certificate-inner-frame {
    border: 1.5px solid #D9BD83;
    border-radius: 10px;
    padding: 42px 48px;
    background:
      radial-gradient(circle at 50% 0%, rgba(253, 242, 248, 0.85) 0%, transparent 55%),
      #FFFFFF;
    position: relative;
  }
  .certificate-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #F3E8EE;
    padding-bottom: 22px;
    margin-bottom: 28px;
  }
  .certificate-ribbon-title {
    text-align: center;
    margin-bottom: 28px;
  }
  .certificate-ribbon-title .cert-type-kicker {
    display: inline-block;
    padding: 5px 18px;
    border-radius: 999px;
    background: #FDF2F8;
    border: 1px solid #FBCFE8;
    color: #9D174D;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .certificate-ribbon-title h1 {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 40px;
    font-weight: 400;
    color: #2A0F25;
    letter-spacing: 0.01em;
    margin: 0 0 4px;
  }
  .certificate-recipient-box {
    text-align: center;
    padding: 20px 28px;
    background: #FAF7F9;
    border: 1px solid #EDE3EA;
    border-radius: 14px;
    max-width: 680px;
    margin: 0 auto 28px;
  }
  .certificate-recipient-name {
    font-size: 28px;
    font-weight: 800;
    color: #9D174D;
    letter-spacing: -0.02em;
    margin: 4px 0;
  }
  .certificate-signatures {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 32px;
    align-items: center;
    margin-top: 34px;
    padding-top: 26px;
    border-top: 1.5px solid #EDE3EA;
  }
  .certificate-sig-block {
    text-align: center;
  }
  .certificate-sig-line {
    width: 200px;
    height: 1px;
    background: #334155;
    margin: 38px auto 8px;
  }

  /* ==========================================================================
     STATUS BADGES, BUTTONS, CARDS & TABLES
     ========================================================================== */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    border-radius: var(--radius-pill);
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }
  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
  }
  .badge-success {
    background-color: var(--status-green-bg);
    color: var(--status-green-fg);
    border: 1px solid #A7F3D0;
  }
  .badge-warning {
    background-color: var(--status-amber-bg);
    color: var(--status-amber-fg);
    border: 1px solid #FDE68A;
  }
  .badge-danger {
    background-color: var(--status-red-bg);
    color: var(--status-red-fg);
    border: 1px solid #FECACA;
  }
  .badge-neutral {
    background-color: #FDF2F8;
    color: #9D174D;
    border: 1px solid #FBCFE8;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 11px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    text-decoration: none;
  }
  .btn-pill { border-radius: var(--radius-pill); }
  .btn:active { transform: scale(0.98); }
  .btn-primary {
    background: linear-gradient(135deg, var(--brand-magenta) 0%, var(--brand-deep-purple) 100%);
    color: var(--brand-soft-white);
    box-shadow: 0 4px 14px rgba(184, 29, 115, 0.24);
  }
  .btn-primary:hover {
    background: var(--brand-deep-purple);
    color: var(--brand-soft-white);
    box-shadow: 0 6px 18px rgba(184, 29, 115, 0.32);
    transform: translateY(-1px);
  }
  .btn-gold {
    background: linear-gradient(135deg, #F5CB73 0%, #E5AE47 100%);
    color: #2A0E24;
    font-weight: 700;
    box-shadow: 0 6px 18px rgba(240, 190, 99, 0.28);
  }
  .btn-gold:hover {
    background: #E2AA40;
    color: #2A0E24;
    transform: translateY(-1px);
  }
  .btn-secondary {
    background-color: var(--brand-soft-white);
    color: #334155;
    border-color: #E2E8F0;
    box-shadow: var(--shadow-xs);
  }
  .btn-secondary:hover {
    background-color: #FDF2F8;
    border-color: #F9A8D4;
    color: #9D174D;
  }
  .btn-danger {
    background-color: var(--status-red-bg);
    color: var(--status-red-fg);
    border-color: #FECACA;
  }
  .btn-sm {
    padding: 6px 13px;
    font-size: 12px;
    border-radius: 9px;
  }

  .card {
    background-color: var(--brand-soft-white);
    border: 1px solid var(--border-subtle);
    border-top: 3px solid rgba(184, 29, 115, 0.22);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    padding: 26px;
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  }
  .card-interactive:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--border-hover);
    border-top-color: var(--brand-magenta);
  }
  .card-lavender {
    background: linear-gradient(155deg, #FDF2F8 0%, #FAF5F8 100%);
    border: 1px solid #FBCFE8;
    border-radius: var(--radius-md);
    padding: 22px;
  }

  /* ==========================================================================
     SPLIT-PANE AUTH PORTAL & EDITORIAL GOVERNANCE HEADERS
     ========================================================================== */
  .auth-portal-section {
    padding: 40px 0 64px;
    position: relative;
  }
  .auth-split-card {
    display: grid;
    grid-template-columns: 0.95fr 1.05fr;
    background: #FFFFFF;
    border-radius: 24px;
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  .auth-visual-wing {
    background-color: var(--brand-dark-navy);
    background-image:
      url("${MAGANGHUB_BLUEPRINT_SVG}"),
      radial-gradient(circle at 20% 20%, rgba(214, 40, 135, 0.42) 0%, transparent 52%),
      radial-gradient(circle at 80% 85%, rgba(240, 190, 99, 0.22) 0%, transparent 45%),
      linear-gradient(145deg, #260B21 0%, #5B1240 55%, #89175A 100%);
    background-size: 72px 72px, 100% 100%, 100% 100%, 100% 100%;
    color: #FFFFFF;
    padding: 42px 38px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
  }
  .auth-visual-feature-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 24px 0;
  }
  .auth-visual-feature-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 13px 16px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(6px);
  }
  .auth-form-wing {
    padding: 42px 44px;
    background: #FFFFFF;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .quick-role-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 10px;
  }
  .quick-role-btn {
    text-align: left;
    background: #FAF7F9;
    border: 1px solid #EADCE4;
    border-radius: 11px;
    padding: 9px 12px;
    cursor: pointer;
    transition: all 0.16s ease;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .quick-role-btn:hover {
    background: #FDF2F8;
    border-color: var(--brand-magenta);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(184, 29, 115, 0.08);
  }
  .quick-role-btn strong {
    font-size: 12px;
    color: var(--brand-dark-navy);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .quick-role-btn span {
    font-size: 11px;
    color: #64748B;
    font-family: 'JetBrains Mono', monospace;
  }

  .page-hero-compact {
    background-color: var(--brand-dark-navy);
    background-image:
      url("${MAGANGHUB_BLUEPRINT_SVG}"),
      radial-gradient(circle at 80% 30%, rgba(214, 40, 135, 0.35) 0%, transparent 45%),
      linear-gradient(128deg, #2A0E24 0%, #5B1240 52%, #8A175A 100%);
    background-size: 80px 80px, 100% 100%, 100% 100%;
    color: #FFFFFF;
    padding: 46px 0 44px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  .gov-pill-nav {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px;
    background: #FFFFFF;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-xs);
    margin-bottom: 26px;
  }
  .gov-pill-link {
    padding: 8px 18px;
    border-radius: var(--radius-pill);
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    transition: all 0.16s ease;
  }
  .gov-pill-link:hover {
    color: var(--brand-deep-purple);
    background: #FDF2F8;
  }
  .gov-pill-link.active {
    background: linear-gradient(135deg, var(--brand-magenta) 0%, var(--brand-deep-purple) 100%);
    color: #FFFFFF;
    box-shadow: 0 3px 10px rgba(184, 29, 115, 0.24);
  }
  .gov-feature-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }
  .gov-feature-card {
    background: #FFFFFF;
    border: 1px solid var(--border-subtle);
    border-left: 4px solid var(--brand-magenta);
    border-radius: 16px;
    padding: 22px 24px;
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .gov-feature-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .meta-spec-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    background: #FAF7F9;
    border: 1px solid var(--border-subtle);
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 20px;
  }
  .meta-spec-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .meta-spec-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748B;
  }
  .meta-spec-value {
    font-size: 13.5px;
    font-weight: 500;
    color: #0F172A;
    line-height: 1.45;
  }

  .visual-card {
    background: var(--brand-soft-white);
    border: 1px solid var(--border-subtle);
    border-radius: 18px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .visual-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
    border-color: var(--border-hover);
  }
  .visual-card-cover {
    height: 120px;
    padding: 16px 20px;
    background-color: var(--brand-dark-navy);
    background-image:
      url("${MAGANGHUB_BLUEPRINT_SVG}"),
      linear-gradient(135deg, #3A1033 0%, #9D174D 100%);
    background-size: 64px 64px, 100% 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: #FFFFFF;
    overflow: hidden;
  }
  .visual-card-body {
    padding: 20px 22px;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .section-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    border-radius: var(--radius-pill);
    background-color: #FCE7F3;
    color: #9D174D;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .icon-squircle {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: #FCE7F3;
    color: #9D174D;
    flex-shrink: 0;
  }
  .icon-squircle-gold {
    background-color: #FEF7E6;
    color: #B45309;
  }
  .icon-squircle-green {
    background-color: var(--status-green-bg);
    color: var(--status-green-fg);
  }

  .container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 28px;
  }

  /* ==========================================================================
     DASHBOARD SHELL
     ========================================================================== */
  .dashboard-shell {
    display: flex;
    min-height: calc(100vh - 36px);
  }
  .dashboard-sidebar {
    width: 264px;
    background: linear-gradient(180deg, #2A0F25 0%, #1B0818 100%);
    color: var(--brand-soft-white);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: width 0.22s ease;
    box-shadow: 4px 0 24px rgba(32, 8, 28, 0.08);
    z-index: 30;
  }
  .dashboard-sidebar.collapsed {
    width: 76px;
  }
  .dashboard-sidebar.collapsed .nav-label,
  .dashboard-sidebar.collapsed .role-badge-box,
  .dashboard-sidebar.collapsed .sl-logo-text {
    display: none;
  }
  .sidebar-header {
    padding: 18px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sidebar-role-pill {
    margin: 14px 16px 6px;
    padding: 10px 13px;
    background: rgba(214, 40, 135, 0.16);
    border: 1px solid rgba(244, 114, 182, 0.28);
    border-radius: 11px;
    color: #F9A8D4;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .sidebar-nav {
    padding: 8px 12px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 13px;
    border-radius: 10px;
    color: rgba(255,255,255,0.74);
    font-size: 13px;
    font-weight: 500;
    transition: all 0.16s ease;
  }
  .sidebar-link:hover {
    background: rgba(255,255,255,0.08);
    color: #FFFFFF;
  }
  .sidebar-link.active {
    background: linear-gradient(90deg, var(--brand-magenta) 0%, var(--brand-deep-purple) 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(184, 29, 115, 0.28);
    font-weight: 600;
  }
  .sidebar-footer {
    padding: 14px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .dashboard-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .dashboard-topbar {
    background-color: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-subtle);
    padding: 14px 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: nowrap;
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .dashboard-topbar-left {
    min-width: 0;
    flex: 1;
  }
  .breadcrumb-bar {
    font-size: 11.5px;
    color: #64748B;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }
  .dashboard-topbar-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--brand-dark-navy);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dashboard-topbar-right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }
  .dashboard-content {
    padding: 28px 30px;
    max-width: 1340px;
    width: 100%;
    margin: 0 auto;
  }

  /* Grids & Metrics */
  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
  .cockpit-split { display: grid; grid-template-columns: 1.4fr 0.85fr; gap: 24px; align-items: start; }

  .metric-card {
    background: var(--brand-soft-white);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    padding: 20px 22px;
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
  }
  .metric-label {
    font-size: 12px;
    color: #64748B;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .metric-value {
    font-size: 28px;
    font-weight: 800;
    color: var(--brand-dark-navy);
    margin-top: 6px;
    letter-spacing: -0.025em;
  }
  .metric-sub {
    font-size: 12px;
    color: #64748B;
    margin-top: 4px;
  }

  /* Forms & Tables */
  .form-group { margin-bottom: 16px; }
  .form-label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }
  .form-control {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #CBD5E1;
    border-radius: 10px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13.5px;
    color: #0F172A;
    background-color: #FFFFFF;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }
  .form-control:focus {
    outline: none;
    border-color: var(--brand-deep-purple);
    box-shadow: 0 0 0 3px rgba(184, 29, 115, 0.10);
  }
  .form-help { font-size: 11.5px; color: #64748B; margin-top: 4px; }

  .table-responsive {
    width: 100%;
    overflow-x: auto;
    border-radius: 14px;
    border: 1px solid var(--border-subtle);
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    background: #FFFFFF;
  }
  .data-table th {
    text-align: left;
    padding: 13px 16px;
    background-color: #FAF7F9;
    color: #475569;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--border-subtle);
    white-space: nowrap;
  }
  .data-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #F5EEF2;
    vertical-align: middle;
    color: #334155;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background-color: #FDF9FC; }

  .empty-state {
    text-align: center;
    padding: 46px 28px;
    background: #FFFFFF;
    border: 1px dashed #DFC8D6;
    border-radius: 18px;
    color: #64748B;
  }
  .empty-state h4 {
    color: var(--brand-dark-navy);
    margin: 12px 0 6px;
    font-size: 17px;
    font-weight: 700;
  }

  .alert {
    padding: 13px 16px;
    border-radius: 12px;
    margin-bottom: 20px;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .alert-success { background-color: var(--status-green-bg); color: var(--status-green-fg); border: 1px solid #A7F3D0; }
  .alert-error { background-color: var(--status-red-bg); color: var(--status-red-fg); border: 1px solid #FECACA; }
  .alert-info { background-color: #FDF2F8; color: #9D174D; border: 1px solid #FBCFE8; }

  .safety-stepper {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin: 14px 0;
  }
  .safety-step {
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--border-subtle);
    background: var(--brand-soft-white);
    font-size: 11.5px;
  }
  .safety-step.completed { border-color: #6EE7B7; background: var(--status-green-bg); color: var(--status-green-fg); }
  .safety-step.current { border-color: var(--brand-deep-purple); background: var(--brand-light-lavender); font-weight: 600; color: #9D174D; }

  .floating-safety-fab {
    position: fixed;
    right: 26px;
    bottom: 26px;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--brand-magenta) 0%, var(--brand-dark-navy) 100%);
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 28px rgba(184, 29, 115, 0.34);
    border: 2px solid rgba(255, 255, 255, 0.25);
    z-index: 60;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .floating-safety-fab:hover {
    transform: translateY(-3px) scale(1.04);
    color: var(--brand-muted-gold);
    box-shadow: 0 16px 34px rgba(184, 29, 115, 0.44);
  }

  @media (max-width: 1024px) {
    .mh-hero-inner, .editorial-split, .cockpit-split, .auth-split-card { grid-template-columns: 1fr; gap: 32px; }
    .editorial-sticky-pane { position: static; }
    .mh-hero-copy { padding-bottom: 10px; }
    .mh-showcase-stage { justify-content: center; }
    .bento-span-7, .bento-span-5, .bento-span-8, .bento-span-4 { grid-column: span 12; }
    .stat-ribbon { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 960px) {
    .grid-3, .grid-4, .safety-stepper, .gov-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .dashboard-shell { flex-direction: column; }
    .dashboard-sidebar { width: 100%; }
    .sidebar-nav { flex-direction: row; overflow-x: auto; padding: 8px 12px; }
    .sidebar-link { white-space: nowrap; }
    .public-nav-container { height: auto; padding: 14px 20px; flex-wrap: wrap; }
    .dashboard-topbar { flex-wrap: wrap; }
    .certificate-signatures, .quick-role-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .grid-2, .grid-3, .grid-4, .safety-stepper, .meta-spec-grid, .stat-ribbon, .process-ledger-row, .gov-feature-grid { grid-template-columns: 1fr; }
    .dashboard-content { padding: 18px; }
    .auth-visual-wing, .auth-form-wing { padding: 28px 22px; }
    .mh-showcase-stage { flex-direction: column; align-items: center; padding-bottom: 16px; }
    .mh-portrait-frame { width: 100%; max-width: 380px; border-radius: 22px; }
  }
  @media print {
    .no-print, .dashboard-sidebar, .dashboard-topbar, .utility-topbar, .public-header, .floating-safety-fab, footer {
      display: none !important;
    }
    body { background: #FFFFFF; }
    .certificate-canvas { box-shadow: none; }
  }
`;

function renderMagangHubUtilityBar(): string {
  const demoActive = isDemoMode();
  return `
    <div class="utility-topbar no-print">
      <div class="utility-topbar-inner">
        <div class="utility-center-group">
          <span class="utility-item">
            <span style="color:var(--brand-deep-purple);">${icon('graduationCap', 13)}</span>
            <strong>Ruang Eksplorasi Minat &amp; Bakat Siswa SMA / SMK</strong>
          </span>
          <span class="utility-divider"></span>
          <span class="utility-item">
            <span style="color:#047857;">${icon('shieldCheck', 13)}</span>
            <span>Didampingi Guru Pembimbing Sekolah</span>
          </span>
          <span class="utility-divider"></span>
          <span class="utility-item">
            <span style="color:#D97706;">${icon('award', 13)}</span>
            <span>Sertifikat Pengalaman Kerja Resmi</span>
          </span>
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          ${
            demoActive
              ? `<form method="POST" action="/api/system/demo-mode" style="margin:0;display:inline;">
                   <input type="hidden" name="action" value="disable_and_clear" />
                   <button type="submit" style="background:#FFE4E6;color:#BE123C;border:1px solid #FECDD3;padding:2px 10px;font-size:11px;font-weight:600;border-radius:999px;cursor:pointer;">
                     Atur Ulang Data Contoh
                   </button>
                 </form>`
              : `<form method="POST" action="/api/system/demo-mode" style="margin:0;display:inline;">
                   <input type="hidden" name="action" value="enable_and_seed" />
                   <button type="submit" style="background:#FCE7F3;color:#9D174D;border:1px solid #FBCFE8;padding:2px 10px;font-size:11px;font-weight:600;border-radius:999px;cursor:pointer;">
                     + Tampilkan Data Contoh
                   </button>
                 </form>`
          }
        </div>
      </div>
    </div>
  `;
}

export function renderPublicLayout(params: {
  title: string;
  activePath: string;
  user: SessionUser | null;
  content: string;
  flashMessage?: string | null;
  flashType?: 'success' | 'error' | 'info';
}): string {
  const { title, activePath, user, content, flashMessage, flashType = 'info' } = params;

  const dashboardHref = user
    ? user.role === 'STUDENT'
      ? '/student/dashboard'
      : user.role === 'UMKM'
      ? '/business/dashboard'
      : user.role === 'MENTOR'
      ? '/mentor/dashboard'
      : user.role === 'SCHOOL_ADMIN'
      ? '/school/dashboard'
      : '/admin/dashboard'
    : '/login';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — SecondLife | Ruang Eksplorasi Minat &amp; Bakat Siswa ke Dunia Kerja</title>
  <style>${BRAND_CSS}</style>
</head>
<body>
  ${renderMagangHubUtilityBar()}

  <header class="public-header">
    <div class="public-nav-container">
      <a href="/" class="brand-logo" aria-label="SecondLife Beranda">
        ${renderSecondLifeLogo('light')}
      </a>

      <nav class="public-nav-links" aria-label="Navigasi Utama">
        <a href="/" class="${activePath === '/' ? 'active' : ''}">Beranda</a>
        <a href="/explore" class="${activePath.startsWith('/explore') ? 'active' : ''}">Karya Siswa</a>
        <a href="/about" class="${activePath === '/about' ? 'active' : ''}">Tentang Kami</a>
        <a href="/how-it-works" class="${activePath === '/how-it-works' ? 'active' : ''}">Alur Program</a>
        <a href="/safety" class="${activePath === '/safety' ? 'active' : ''}">Perlindungan Siswa</a>
      </nav>

      <div class="nav-auth-actions">
        ${
          user
            ? `<a href="${dashboardHref}" class="btn-nav-login">
                 ${icon('home', 15)} Dashboard
               </a>
               <form method="POST" action="/api/auth/logout" style="margin:0;">
                 <button type="submit" class="btn-nav-register" style="cursor:pointer;">${icon('logOut', 14)} Keluar</button>
               </form>`
            : `<a href="/register" class="btn-nav-register">
                 ${icon('userPlus', 15)} Daftar Akun
               </a>
               <a href="/login" class="btn-nav-login">
                 ${icon('logIn', 15)} Masuk
               </a>`
        }
      </div>
    </div>
  </header>

  <main>
    ${
      flashMessage
        ? `<div class="container" style="padding-top:22px;">
             <div class="alert alert-${flashType}">${escapeHtml(flashMessage)}</div>
           </div>`
        : ''
    }
    ${content}
  </main>

  <footer style="background:linear-gradient(180deg, var(--brand-dark-navy) 0%, #190716 100%);color:var(--brand-soft-white);margin-top:88px;padding:68px 0 42px;">
    <div class="container">
      <div class="bento-mosaic" style="margin-bottom:44px;">
        <div class="bento-span-5">
          <div style="margin-bottom:14px;">
            ${renderSecondLifeLogo('dark')}
          </div>
          <p style="font-size:13.5px;color:rgba(255,255,255,0.78);margin:0 0 16px;max-width:380px;line-height:1.68;">
            Wadah bagi siswa SMA, SMK, dan PKBM untuk mengenali minat, mengasah bakat lewat tugas sekolah, dan menyalurkannya ke pengalaman kerja nyata bersama UMKM di bawah bimbingan guru.
          </p>
          <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:rgba(244,114,182,0.14);color:#F9A8D4;font-size:11.5px;font-weight:600;">
            ${icon('award', 13)} Mendukung Kesiapan Kerja Pelajar Indonesia (SDG 8)
          </div>
        </div>
        <div class="bento-span-7" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
          <div>
            <h4 style="color:#FFFFFF;font-size:14px;font-weight:600;margin-bottom:14px;">Menu Utama</h4>
            <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px;font-size:13px;">
              <li><a href="/about" style="color:rgba(255,255,255,0.74);">Tentang SecondLife</a></li>
              <li><a href="/how-it-works" style="color:rgba(255,255,255,0.74);">Cara Mengikuti Program</a></li>
              <li><a href="/explore" style="color:rgba(255,255,255,0.74);">Galeri Karya Siswa</a></li>
              <li><a href="/verify/SL-DEMO-2026-0001" style="color:rgba(255,255,255,0.74);">Cek Keaslian Sertifikat</a></li>
            </ul>
          </div>
          <div>
            <h4 style="color:#FFFFFF;font-size:14px;font-weight:600;margin-bottom:14px;">Keamanan &amp; Aturan</h4>
            <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px;font-size:13px;">
              <li><a href="/safety" style="color:rgba(255,255,255,0.74);">6 Tahap Perlindungan Siswa</a></li>
              <li><a href="/privacy" style="color:rgba(255,255,255,0.74);">Kebijakan Privasi Siswa</a></li>
              <li><a href="/terms" style="color:rgba(255,255,255,0.74);">Ketentuan &amp; Hak Cipta Karya</a></li>
              <li><a href="/contact" style="color:rgba(255,255,255,0.74);">Pusat Bantuan Sekolah</a></li>
            </ul>
          </div>
          <div>
            <h4 style="color:#FFFFFF;font-size:14px;font-weight:600;margin-bottom:14px;">Sertifikat Pengalaman</h4>
            <p style="font-size:13px;color:rgba(255,255,255,0.74);margin:0;line-height:1.65;">
              Sertifikat Pengalaman Kerja diterbitkan secara resmi setelah karya siswa selesai dievaluasi oleh UMKM dan disahkan oleh guru pembimbing.
            </p>
          </div>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.10);padding-top:22px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:12.5px;color:rgba(255,255,255,0.55);">
        <span>&copy; 2026 SecondLife Indonesia. Salurkan Minat dan Bakat Sekolahmu ke Dunia Kerja.</span>
        <span>Dari Bangku Sekolah Menuju Pengalaman Kerja Pertama</span>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

interface SidebarNavItem {
  label: string;
  href: string;
  iconName: string;
}

const ROLE_NAVIGATION: Record<RoleName, SidebarNavItem[]> = {
  STUDENT: [
    { label: 'Ringkasan Utama', href: '/student/dashboard', iconName: 'home' },
    { label: 'Portofolio Karya (SHOW)', href: '/student/portfolio', iconName: 'folder' },
    { label: 'Lowongan Tugas (TRY)', href: '/student/opportunities', iconName: 'compass' },
    { label: 'Tugas Saya', href: '/student/assignments', iconName: 'briefcase' },
    { label: 'Riwayat Submisi', href: '/student/submissions', iconName: 'fileText' },
    { label: 'Sertifikat Pengalaman', href: '/student/passport', iconName: 'award' },
    { label: 'Notifikasi', href: '/student/notifications', iconName: 'bell' },
    { label: 'Profil Siswa', href: '/student/profile', iconName: 'user' },
    { label: 'Bantuan & Aduan', href: '/student/support', iconName: 'lifeBuoy' }
  ],
  UMKM: [
    { label: 'Ringkasan Mitra', href: '/business/dashboard', iconName: 'home' },
    { label: 'Eksplor Talenta Siswa', href: '/business/talent', iconName: 'search' },
    { label: 'Buat Penugasan (TRY)', href: '/business/assignments/create', iconName: 'plusCircle' },
    { label: 'Daftar Penugasan', href: '/business/assignments', iconName: 'briefcase' },
    { label: 'Evaluasi Submisi', href: '/business/reviews', iconName: 'checkSquare' },
    { label: 'Profil Usaha UMKM', href: '/business/profile', iconName: 'building' },
    { label: 'Notifikasi', href: '/business/notifications', iconName: 'bell' }
  ],
  MENTOR: [
    { label: 'Ringkasan Mentor', href: '/mentor/dashboard', iconName: 'home' },
    { label: 'Monitoring Siswa', href: '/mentor/students', iconName: 'users' },
    { label: 'Verifikasi Portofolio', href: '/mentor/portfolio-review', iconName: 'folder' },
    { label: 'Persetujuan Tugas', href: '/mentor/approvals', iconName: 'checkSquare' },
    { label: 'Supervisi Aktif', href: '/mentor/supervision', iconName: 'shield' },
    { label: 'Submisi Siswa', href: '/mentor/submissions', iconName: 'fileText' },
    { label: 'Verifikasi Sertifikat', href: '/mentor/experience-verification', iconName: 'award' },
    { label: 'Laporan Supervisi', href: '/mentor/reports', iconName: 'barChart' },
    { label: 'Notifikasi', href: '/mentor/notifications', iconName: 'bell' }
  ],
  SCHOOL_ADMIN: [
    { label: 'Ringkasan Sekolah', href: '/school/dashboard', iconName: 'home' },
    { label: 'Manajemen Siswa', href: '/school/students', iconName: 'graduationCap' },
    { label: 'Guru Pembimbing', href: '/school/teachers', iconName: 'users' },
    { label: 'Mitra UMKM', href: '/school/partners', iconName: 'building' },
    { label: 'Otorisasi Portofolio', href: '/school/portfolios', iconName: 'folder' },
    { label: 'Monitoring Tugas', href: '/school/assignments', iconName: 'briefcase' },
    { label: 'Arsip Sertifikat Siswa', href: '/school/passports', iconName: 'award' },
    { label: 'Laporan Institusi', href: '/school/reports', iconName: 'barChart' },
    { label: 'Pengaturan Sekolah', href: '/school/settings', iconName: 'settings' }
  ],
  PLATFORM_ADMIN: [
    { label: 'Ringkasan Platform', href: '/admin/dashboard', iconName: 'home' },
    { label: 'Manajemen Pengguna', href: '/admin/users', iconName: 'users' },
    { label: 'Verifikasi Sekolah', href: '/admin/schools', iconName: 'graduationCap' },
    { label: 'Verifikasi UMKM', href: '/admin/businesses', iconName: 'building' },
    { label: 'Moderasi Portofolio', href: '/admin/portfolios', iconName: 'folder' },
    { label: 'Moderasi Penugasan', href: '/admin/assignments', iconName: 'briefcase' },
    { label: 'Keamanan & Aduan', href: '/admin/safety', iconName: 'shield' },
    { label: 'Arsip Sertifikat', href: '/admin/verifications', iconName: 'award' },
    { label: 'Analitik & Simulasi', href: '/admin/analytics', iconName: 'barChart' },
    { label: 'Pengaturan Sistem', href: '/admin/settings', iconName: 'settings' },
    { label: 'Log Audit', href: '/admin/audit-logs', iconName: 'activity' }
  ]
};

export function renderDashboardLayout(params: {
  title: string;
  breadcrumb: string;
  activePath: string;
  user: SessionUser;
  content: string;
  flashMessage?: string | null;
  flashType?: 'success' | 'error' | 'info';
}): string {
  const { title, breadcrumb, activePath, user, content, flashMessage, flashType = 'info' } = params;
  const navItems = ROLE_NAVIGATION[user.role] || [];

  const db = getDb();
  const unreadRow = db
    .prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(user.id) as { cnt: number } | undefined;
  const unreadCount = unreadRow?.cnt || 0;

  const notificationHref =
    user.role === 'STUDENT'
      ? '/student/notifications'
      : user.role === 'UMKM'
      ? '/business/notifications'
      : user.role === 'MENTOR'
      ? '/mentor/notifications'
      : user.role === 'SCHOOL_ADMIN'
      ? '/school/dashboard'
      : '/admin/dashboard';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — SECOND LIFE (${escapeHtml(user.role)})</title>
  <style>${BRAND_CSS}</style>
</head>
<body>
  ${renderMagangHubUtilityBar()}
  <div class="dashboard-shell">
    <aside class="dashboard-sidebar" id="appSidebar" aria-label="${escapeHtml(user.role)} Sidebar Navigation">
      <div class="sidebar-header">
        <a href="/" class="brand-logo" style="color:#FFFFFF;">
          ${renderSecondLifeLogo('dark')}
        </a>
        <button type="button" onclick="document.getElementById('appSidebar').classList.toggle('collapsed')" style="background:rgba(255,255,255,0.08);border:none;border-radius:8px;padding:6px;color:rgba(255,255,255,0.8);cursor:pointer;" title="Toggle Sidebar">
          ${icon('menu', 16)}
        </button>
      </div>
      <div class="sidebar-role-pill role-badge-box">
        <div style="display:flex;align-items:center;gap:6px;">
          ${icon('shieldCheck', 13)}
          <span>${escapeHtml(user.role.replace('_', ' '))} PORTAL</span>
        </div>
        ${
          user.school_name
            ? `<div style="font-size:11px;color:rgba(255,255,255,0.82);font-weight:400;text-transform:none;margin-top:3px;">${escapeHtml(user.school_name)}</div>`
            : user.business_name
            ? `<div style="font-size:11px;color:rgba(255,255,255,0.82);font-weight:400;text-transform:none;margin-top:3px;">${escapeHtml(user.business_name)}</div>`
            : ''
        }
      </div>
      <nav class="sidebar-nav">
        ${navItems
          .map((item) => {
            const isActive =
              activePath === item.href ||
              (item.href !== '/business/assignments' &&
                activePath.startsWith(item.href + '/'));
            return `<a href="${item.href}" class="sidebar-link ${isActive ? 'active' : ''}">
              ${icon(item.iconName, 16)}
              <span class="nav-label">${escapeHtml(item.label)}</span>
            </a>`;
          })
          .join('')}
      </nav>
      <div class="sidebar-footer">
        <a href="/" class="sidebar-link" style="margin-bottom:4px;font-size:12.5px;">
          ${icon('compass', 15)}
          <span class="nav-label">Beranda Publik</span>
        </a>
        <form method="POST" action="/api/auth/logout" style="margin:0;">
          <button type="submit" class="sidebar-link" style="width:100%;background:rgba(255,255,255,0.06);border:none;cursor:pointer;text-align:left;">
            ${icon('logOut', 15)}
            <span class="nav-label">Keluar Sesi</span>
          </button>
        </form>
      </div>
    </aside>

    <div class="dashboard-main">
      <header class="dashboard-topbar">
        <div class="dashboard-topbar-left">
          <div class="breadcrumb-bar">
            <span>SecondLife</span>
            <span>&rsaquo;</span>
            <span>${escapeHtml(user.role.replace('_', ' '))}</span>
            <span>&rsaquo;</span>
            <span style="color:var(--brand-deep-purple);font-weight:600;">${escapeHtml(breadcrumb)}</span>
          </div>
          <h1 class="dashboard-topbar-title" title="${escapeHtml(title)}">${escapeHtml(title)}</h1>
        </div>
        <div class="dashboard-topbar-right">
          <a href="${notificationHref}" class="btn btn-secondary btn-sm" title="Notifications">
            ${icon('bell', 14)}
            <span>Notifikasi</span>
            ${
              unreadCount > 0
                ? `<span style="background:var(--brand-deep-purple);color:#FFF;border-radius:999px;padding:1px 7px;font-size:11px;">${unreadCount}</span>`
                : ''
            }
          </a>
          <div style="display:flex;align-items:center;gap:10px;padding-left:14px;border-left:1px solid var(--border-subtle);">
            <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg, var(--brand-magenta), var(--brand-dark-navy));color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13.5px;">
              ${escapeHtml(user.full_name).charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--brand-dark-navy);line-height:1.25;">
                ${escapeHtml(user.full_name)} ${demoBadge(user.is_demo)}
              </div>
              <div style="font-size:11.5px;color:#64748B;">${escapeHtml(user.email)}</div>
            </div>
          </div>
        </div>
      </header>

      <div class="dashboard-content">
        ${
          flashMessage
            ? `<div class="alert alert-${flashType}">${escapeHtml(flashMessage)}</div>`
            : ''
        }
        ${content}
      </div>
    </div>
  </div>
</body>
</html>`;
}
