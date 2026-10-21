import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getBucketName } from './_r2.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Metode tidak diizinkan. Gunakan POST atau DELETE.' });
  }

  try {
    const { key } = req.body || {};

    if (!key) {
      return res.status(400).json({ success: false, error: 'Parameter key wajib diisi.' });
    }

    const s3 = getR2Client();
    const bucket = getBucketName();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3.send(command);

    return res.status(200).json({
      success: true,
      message: `Berkas ${key} berhasil dihapus.`,
    });
  } catch (err) {
    console.error('Error deleting file from R2:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Gagal menghapus berkas dari R2.',
    });
  }
}
