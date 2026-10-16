// Servidor estático local que imita GitHub Pages: sirve docs/ en la raíz, como https://candado.jalonel.com/ (PORT=4517 por defecto).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const PREFIX = '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain' };
const port = Number(process.env.PORT || 4517);

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(DOCS, p);
  if (!f.startsWith(DOCS)) { res.writeHead(403); return res.end(); }
  try {
    if ((await stat(f)).isDirectory()) f = join(f, 'index.html');
    const body = await readFile(f);
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(await readFile(join(DOCS, '404.html')));
  }
}).listen(port, () => console.log(`http://localhost:${port}${PREFIX}/`));
