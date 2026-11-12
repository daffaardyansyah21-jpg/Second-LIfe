// ============================================================================
// SECOND LIFE — Domain Types & Entities
// ============================================================================

                                                                                         

                             
           
               
                         
              
              
                

                              
           
                                
              
               
                     
                              
                              
                    
                 
               
                  
                        
              
              
                         
            
               
               
             
                 

                                   
                            
                                
               
                 

                              
             
                
                    
                 
                           
                              
                             
                             
                              
                                
                                                      
                  
 

                                        
                
                
                             
                      
                        
 

export const SIX_STAGE_SAFETY_SYSTEM                          = [
  {
    stage: 1,
    title: 'Tahap 1 — Pemeriksaan Karya & Identitas Siswa',
    responsibleParties: 'Siswa & Sekolah',
    description: 'Memastikan siswa benar-benar terdaftar di sekolah, karyanya asli buatan sendiri, dan data pribadinya tetap aman.',
    checkpoints: [
      'Identitas siswa dikonfirmasi langsung oleh pihak SMA/SMK/PKBM asal',
      'Karya yang diunggah adalah hasil belajar atau tugas sekolah asli',
      'Ada izin dari siswa dan guru sebelum karya ditampilkan ke publik',
      'Nomor telepon, alamat rumah, dan NISN siswa tidak pernah ditampilkan ke umum'
    ]
  },
  {
    stage: 2,
    title: 'Tahap 2 — Pemeriksaan Tugas dari UMKM',
    responsibleParties: 'Mitra UMKM & Pengelola Platform',
    description: 'Memastikan tugas yang diberikan UMKM cukup ringan untuk ukuran pelajar, jelas arahannya, dan memberi apresiasi yang layak.',
    checkpoints: [
      'Beban tugas wajar dan tidak mengganggu jam belajar di sekolah',
      'Tenggat waktu jelas dengan batas revisi yang disepakati sejak awal',
      'Wajib mencantumkan uang apresiasi/kompensasi jika karya dipakai untuk jualan',
      'Dilarang memberikan pekerjaan berbahaya atau meminta pertemuan tanpa pendamping'
    ]
  },
  {
    stage: 3,
    title: 'Tahap 3 — Persetujuan Guru & Orang Tua',
    responsibleParties: 'Siswa, Guru Pembimbing & Orang Tua/Wali',
    description: 'Siswa memilih sendiri tugas yang diminati, lalu disetujui oleh guru pembimbing serta diketahui oleh orang tua/wali.',
    checkpoints: [
      'Siswa mendaftar secara sukarela sesuai minat dan karya yang dimiliki',
      'Guru pembimbing memeriksa kecocokan tugas dengan kemampuan dan jadwal siswa',
      'Persetujuan orang tua atau wali tercatat sebelum siswa mulai mengerjakan',
      'Kesepakatan tugas tertulis dengan jelas sebelum proyek dimulai'
    ]
  },
  {
    stage: 4,
    title: 'Tahap 4 — Pendampingan Selama Mengerjakan',
    responsibleParties: 'Siswa & Guru Pembimbing',
    description: 'Siswa tidak pernah dibiarkan bekerja sendirian. Guru pembimbing dapat memantau perkembangan tugas dari awal sampai selesai.',
    checkpoints: [
      'Catatan perkembangan pengerjaan dapat dilihat langsung oleh guru pembimbing',
      'Tidak boleh ada pertemuan tatap muka di luar sepengetahuan sekolah dan orang tua',
      'Siswa tidak dibebani rahasia perusahaan yang berisiko hukum',
      'Tersedia saluran bantuan langsung jika siswa mengalami kendala'
    ]
  },
  {
    stage: 5,
    title: 'Tahap 5 — Penilaian Hasil Karya',
    responsibleParties: 'Mitra UMKM & Guru Pembimbing',
    description: 'Pihak UMKM menilai hasil karya siswa secara sopan dan membangun, lalu disahkan bersama guru pembimbing.',
    checkpoints: [
      'UMKM memberikan penilaian pada 5 aspek keterampilan (skala 1–5)',
      'Umpan balik ditulis dengan bahasa yang mendidik dan membangun semangat siswa',
      'Permintaan revisi tidak boleh melebihi batas yang sudah disepakati di awal',
      'Guru pembimbing memeriksa hasil penilaian sebelum dinyatakan selesai'
    ]
  },
  {
    stage: 6,
    title: 'Tahap 6 — Penerbitan Sertifikat Pengalaman Kerja',
    responsibleParties: 'Pengelola Platform & Sekolah',
    description: 'Setelah tugas tuntas dan apresiasi diterima siswa, Sertifikat Pengalaman Kerja resmi diterbitkan sebagai bukti nyata.',
    checkpoints: [
      'Pemberian apresiasi atau kompensasi kepada siswa telah dikonfirmasi selesai',
      'Hak cipta nama pembuat karya tetap tercatat atas nama siswa',
      'Sertifikat Pengalaman Kerja resmi diterbitkan lengkap dengan kode verifikasi',
      'Seluruh riwayat pengerjaan tersimpan rapi untuk laporan sekolah'
    ]
  }
];

export const APPROVED_ASSIGNMENT_CATEGORIES = [
  'Graphic Design',
  'Photography',
  'Video Editing',
  'Writing',
  'Social Media Content',
  'Simple Catalog Design',
  'Basic Data & Admin Support'
]         ;
