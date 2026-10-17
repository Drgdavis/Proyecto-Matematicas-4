const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.resolve(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }
  if (urlPath.includes('\0')) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.resolve(ROOT, urlPath.replace(/^[/\\]+/, ''));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const sendFile = (fp) => {
    const ext = path.extname(fp).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const readStream = fs.createReadStream(fp);
    readStream.on('error', () => {
      res.statusCode = 500;
      res.end('Internal Error');
    });
    readStream.pipe(res);
  };

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      sendFile(filePath);
    } else if (!err && stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (ierr, istat) => {
        if (!ierr && istat.isFile()) sendFile(indexPath);
        else fallBack();
      });
    } else {
      fallBack();
    }
    function fallBack() {
      if (path.extname(urlPath)) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      const index = path.join(ROOT, 'index.html');
      fs.stat(index, (e, s) => {
        if (!e && s.isFile()) sendFile(index);
        else {
          res.statusCode = 404;
          res.end('Not Found');
        }
      });
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor EVA03 corriendo en http://127.0.0.1:${PORT}/`);
  console.log(`Sirviendo: ${ROOT}`);
});
