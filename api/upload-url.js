import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getBucketName, getPublicBaseUrl } from './_r2.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metode tidak diizinkan. Gunakan POST.' });
  }

  try {
    const { filename, contentType, category, studentName, subject, taskTitle } = req.body || {};

    if (!filename) {
      return res.status(400).json({ success: false, error: 'Parameter filename wajib diisi.' });
    }

    const s3 = getR2Client();
    const bucket = getBucketName();
    const publicBase = getPublicBaseUrl();

    // Sanitize filename & create structured folder hierarchy for student assignments
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    let uniqueKey = '';

    if (category === 'Tugas' && studentName) {
      const cleanStudent = studentName.trim().replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
      const taskFolder = (taskTitle || subject || 'Tugas_Harian').trim().replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
      uniqueKey = `Tugas/${cleanStudent}/${taskFolder}/${Date.now()}-${cleanFilename}`;
    } else {
      const folder = category ? category.replace(/[^a-zA-Z0-9_-]/g, '') : 'berkas';
      uniqueKey = `${folder}/${Date.now()}-${cleanFilename}`;
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueKey,
      ContentType: contentType || 'application/octet-stream',
    });

    // Valid for 10 minutes (600 seconds)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
    const publicUrl = publicBase ? `${publicBase}/${uniqueKey}` : null;

    return res.status(200).json({
      success: true,
      key: uniqueKey,
      uploadUrl,
      publicUrl,
    });
  } catch (err) {
    console.error('Error generating pre-signed upload URL:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Gagal membuat URL upload ke R2.',
    });
  }
}
