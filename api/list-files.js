import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getR2Client, getBucketName, getPublicBaseUrl } from './_r2.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Metode tidak diizinkan. Gunakan GET.' });
  }

  try {
    const s3 = getR2Client();
    const bucket = getBucketName();
    const publicBase = getPublicBaseUrl();

    const prefix = req.query.prefix || '';

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 200,
    });

    const data = await s3.send(command);

    const rawItems = (data.Contents || []).filter(item => !item.Key.startsWith('config/'));

    const files = rawItems.map((item) => {
      const key = item.Key;
      const parts = key.split('/');
      let category = parts[0] || 'Umum';
      const rawName = parts[parts.length - 1];
      let displayName = rawName.replace(/^\d+-/, '');
      let studentName = null;
      let taskFolder = null;
      let subject = null;

      if (category === 'Tugas') {
        if (parts.length >= 4) {
          studentName = parts[1].replace(/_/g, ' ');
          taskFolder = parts[2].replace(/_/g, ' ');
          displayName = rawName.replace(/^\d+-/, '');
        } else {
          const studentMatch = displayName.match(/^\[(.*?)\]-\[(.*?)\]-(.*)$/);
          if (studentMatch) {
            studentName = studentMatch[1].replace(/_/g, ' ');
            subject = studentMatch[2].replace(/_/g, ' ');
            taskFolder = subject;
            displayName = studentMatch[3];
          }
        }
      }

      // Guess extension
      const ext = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : '';

      return {
        key,
        filename: rawName,
        displayName,
        studentName,
        taskFolder: taskFolder || 'Tugas Umum',
        subject: subject || taskFolder || 'PR',
        category,
        extension: ext,
        size: item.Size,
        lastModified: item.LastModified,
        url: publicBase ? `${publicBase}/${key}` : null,
      };
    });

    // Sort newest first
    files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    return res.status(200).json({
      success: true,
      bucket,
      publicBaseUrl: publicBase,
      count: files.length,
      files,
    });
  } catch (err) {
    console.error('Error listing R2 files:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Gagal mengambil daftar berkas dari R2.',
    });
  }
}
