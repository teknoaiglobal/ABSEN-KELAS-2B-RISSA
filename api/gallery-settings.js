import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getBucketName } from './_r2.js';

const SETTINGS_KEY = 'config/gallery-settings.json';

const DEFAULT_SETTINGS = {
  allowPublicUpload: true,    // Apakah publik/wali murid boleh upload berkas umum
  allowStudentHomework: true, // Apakah murid boleh setor PR/tugas
  adminPin: '110886',          // PIN Default Bu Caca (Tanggal lahir dari NIP)
  subjects: [
    'Matematika',
    'Bahasa Indonesia',
    'PPKn',
    'Seni Budaya & Prakarya (SBdP)',
    'PJOK (Olahraga)',
    'Pendidikan Agama (PAI)',
    'Tematik Umum / PR Harian',
  ],
  taskAnnouncement: {
    enabled: true,
    title: 'Tugas Matematika: Latihan Berhitung Hal. 24',
    subject: 'Matematika',
    deadline: 'Jumat, 24 Oktober 2026 pukul 17.00 WIB',
    note: 'Kerjakan di buku tulis dengan rapi, lalu foto dan setor lewat tombol di bawah ini ya! 🌟',
    isPublicGallery: false, // false = Privat Bu Guru, true = Tampilkan di Galeri Publik Kelas
    attachments: [],
  },
  publicTaskFolders: [], // Daftar nama tugas/proyek yang diizinkan tampil di galeri publik
  featuredSubmissions: [], // Daftar key berkas karya terbaik pilihan Bu Guru untuk dipamerkan
  lessonSchedule: {
    Senin: [
      { time: '07.00 - 07.30', subject: 'Upacara Bendera' },
      { time: '07.30 - 09.00', subject: 'Bahasa Indonesia' },
      { time: '09.00 - 09.30', subject: 'Istirahat' },
      { time: '09.30 - 11.00', subject: 'Pendidikan Agama (PAI)' }
    ],
    Selasa: [
      { time: '07.00 - 07.30', subject: 'Pembiasaan Literasi' },
      { time: '07.30 - 09.00', subject: 'Matematika' },
      { time: '09.00 - 09.30', subject: 'Istirahat' },
      { time: '09.30 - 11.00', subject: 'PPKn' }
    ],
    Rabu: [
      { time: '07.00 - 07.30', subject: 'Senam Pagi Ceria' },
      { time: '07.30 - 09.00', subject: 'PJOK (Olahraga)' },
      { time: '09.00 - 09.30', subject: 'Istirahat' },
      { time: '09.30 - 11.00', subject: 'Bahasa Indonesia' }
    ],
    Kamis: [
      { time: '07.00 - 07.30', subject: 'Pembiasaan Sholat Dhuha' },
      { time: '07.30 - 09.00', subject: 'Matematika' },
      { time: '09.00 - 09.30', subject: 'Istirahat' },
      { time: '09.30 - 11.00', subject: 'Seni Budaya & Prakarya (SBdP)' }
    ],
    Jumat: [
      { time: '07.00 - 07.30', subject: 'Jumat Bersih & Religi' },
      { time: '07.30 - 09.00', subject: 'Bahasa Sunda / Mulok' },
      { time: '09.00 - 09.30', subject: 'Istirahat' },
      { time: '09.30 - 10.30', subject: 'Proyek P5 & Karakter' }
    ]
  },
  piketSchedule: {
    Senin: ['ABDUL GHANY A', 'AHMAD ARKAN A', 'AIDAN HADID A', 'AISYAH SYAFINA A', 'ALATHAR N. S', 'ALTAF NABIL M'],
    Selasa: ['ANINDHITA S. Z', 'AQMAR N. A.', 'AZRIL HAIKAL A.M.', 'BASMA GHAIDA M', 'BILAL ABHI C', 'DINAR INDAH G'],
    Rabu: ['HAMKA KAMIL H. F', 'JESSLYN F.B', 'MALIKA AULIA Z', 'MIKHAYLA A.R', 'M. ABIM RIZKIA', 'M. DZAKIR ILHAM'],
    Kamis: ['M. JIM ARCHERY W. H', 'M. NABHAN AL-BIHAQI', 'M. QAISER AL-AYYUBI', 'M. SHANI ILVIAN', 'M. WAGINDRA K. D', 'MUTYA KINAYA'],
    Jumat: ['PUTRI SELFIA P', 'RADITYA TRIVANDI', 'REINITA DESTRIYANTI', 'REVAN SEPTIAWAN', 'SITI MAULIDYA L. S', 'SUCI RESTU A', 'SYARIFA MAULIDINA S', 'VANESSA PUTRY', 'ZAHRA NURAINI']
  },
  lockedCategories: {
    Foto: false,              // false = terbuka untuk umum, true = terkunci khusus admin
    Dokumen: false,
    Tugas: false,
    Lainnya: false,
  },
  classInfo: {
    className: 'Kelas 2C Ceria!',
    schoolYear: '2026/2027',
    schoolName: 'SDN Rawaendah',
    teacherName: 'Ibu RISA AGUSTIAN, S.Pd',
    teacherNip: '198608112025212016',
    waGroupLink: 'https://chat.whatsapp.com/GrupKelas2C'
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const s3 = getR2Client();
  const bucket = getBucketName();

  if (req.method === 'GET') {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: SETTINGS_KEY,
      });

      const response = await s3.send(command);
      const str = await response.Body.transformToString();
      const settings = JSON.parse(str);

      return res.status(200).json({
        success: true,
        settings: { ...DEFAULT_SETTINGS, ...settings },
      });
    } catch (err) {
      // If file doesn't exist yet, return default
      return res.status(200).json({
        success: true,
        settings: DEFAULT_SETTINGS,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { settings, pin } = req.body || {};

      // Verify PIN before saving
      let currentPin = '110886'; // Default ke tanggal lahir NIP Bu Risa
      let existingSettings = {};
      try {
        const getCmd = new GetObjectCommand({ Bucket: bucket, Key: SETTINGS_KEY });
        const existing = await s3.send(getCmd);
        existingSettings = JSON.parse(await existing.Body.transformToString());
        if (existingSettings.adminPin) currentPin = existingSettings.adminPin;
      } catch {}

      // Izinkan PIN tersimpan, atau Master PIN resmi (110886 / 2026)
      const isPinValid = (pin === currentPin || pin === '110886' || pin === '2026');
      if (!isPinValid) {
        return res.status(403).json({ success: false, error: 'PIN Admin Bu Caca salah.' });
      }

      // Merge: DEFAULT -> existing -> new settings (agar adminPin tidak ter-reset saat save pengaturan)
      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...existingSettings,
        ...settings,
        adminPin: settings.adminPin || currentPin,
      };

      const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: SETTINGS_KEY,
        ContentType: 'application/json',
        Body: JSON.stringify(mergedSettings, null, 2),
      });

      await s3.send(putCommand);

      return res.status(200).json({
        success: true,
        message: 'Pengaturan galeri berhasil diperbarui.',
        settings: mergedSettings,
      });
    } catch (err) {
      console.error('Error saving gallery settings:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Gagal menyimpan pengaturan ke R2.',
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Metode tidak diizinkan.' });
}
