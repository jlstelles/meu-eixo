// Servidor estático mínimo, sem dependências, para testar no computador e no celular.
// Uso: node scripts/serve.mjs [pasta]   (PORT e HOST configuráveis por variável de ambiente)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, process.argv[2] || 'dist');
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function resolvePath(urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (p.endsWith('/')) p += 'index.html';
  const full = normalize(join(dir, p));
  if (full !== dir && !full.startsWith(dir + sep)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  const full = resolvePath(req.url || '/');
  if (!full) {
    res.writeHead(400).end('Requisição inválida');
    return;
  }
  try {
    const info = await stat(full);
    if (!info.isFile()) throw new Error('não é arquivo');
    const body = await readFile(full);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
  }
});

server.listen(port, host, () => {
  console.log(`Meu Eixo servindo ${dir}`);
  console.log(`  Neste computador:  http://localhost:${port}/`);
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal) console.log(`  Na rede local:     http://${i.address}:${port}/`);
    }
  }
  console.log('Pare com Ctrl+C.');
});
