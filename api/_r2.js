import { S3Client } from '@aws-sdk/client-s3';

export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Kredensial Cloudflare R2 belum disetel di Environment Variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getBucketName() {
  return process.env.R2_BUCKET_NAME || 'absen-public';
}

export function getPublicBaseUrl() {
  let url = process.env.R2_PUBLIC_URL || '';
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}
