import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env manually if exists
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      process.env[key] = val;
    }
  });
}

const PORT = process.env.PORT || 8080;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // Enhance res with status() and json() for Vercel handler compatibility
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  // API Routes
  if (pathname.startsWith('/api/')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      req.query = Object.fromEntries(parsedUrl.searchParams);
      if (body) {
        try {
          req.body = JSON.parse(body);
        } catch {
          req.body = body;
        }
      } else {
        req.body = {};
      }

      try {
        if (pathname === '/api/list-files') {
          const mod = await import(`./api/list-files.js?t=${Date.now()}`);
          return mod.default(req, res);
        } else if (pathname === '/api/upload-url') {
          const mod = await import(`./api/upload-url.js?t=${Date.now()}`);
          return mod.default(req, res);
        } else if (pathname === '/api/delete-file') {
          const mod = await import(`./api/delete-file.js?t=${Date.now()}`);
          return mod.default(req, res);
        } else if (pathname === '/api/gallery-settings') {
          const mod = await import(`./api/gallery-settings.js?t=${Date.now()}`);
          return mod.default(req, res);
        } else {
          return res.status(404).json({ success: false, error: 'Endpoint API tidak ditemukan.' });
        }
      } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    });
    return;
  }

  // Rewrites for public pages
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  } else if (pathname === '/public' || pathname === '/berkas') {
    pathname = '/public.html';
  } else if (pathname === '/admin') {
    pathname = '/admin.html';
  }

  const filePath = path.join(__dirname, pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dev server running on http://localhost:${PORT}`);
  console.log(`📁 Public Storage Page: http://localhost:${PORT}/public`);
});
