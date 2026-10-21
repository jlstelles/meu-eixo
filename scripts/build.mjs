// Copia src/ para dist/ e preenche a lista de cache do service worker.
// Sem bundler: o app é composto por módulos ES servidos como estão.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out.sort();
}

export function build({ src = join(root, 'src'), dist = join(root, 'dist') } = {}) {
  if (!existsSync(src)) throw new Error(`Pasta de origem não encontrada: ${src}`);
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  cpSync(src, dist, { recursive: true });

  const files = listFiles(dist).map((f) => relative(dist, f).split(sep).join('/'));
  const hash = createHash('sha1');
  for (const f of files) {
    hash.update(f);
    hash.update(readFileSync(join(dist, f)));
  }
  const buildId = hash.digest('hex').slice(0, 10);

  const assets = files.filter((f) => f !== 'sw.js').map((f) => (f === 'index.html' ? './' : `./${f}`));
  if (!assets.includes('./')) assets.unshift('./');

  const swPath = join(dist, 'sw.js');
  let sw = readFileSync(swPath, 'utf8');
  if (!sw.includes('/*__ASSETS__*/[]') || !sw.includes('/*__BUILD_ID__*/')) {
    throw new Error('sw.js sem os marcadores de build esperados.');
  }
  sw = sw.replace('/*__ASSETS__*/[]', JSON.stringify(assets)).replace('/*__BUILD_ID__*/', buildId);
  writeFileSync(swPath, sw);
  return { buildId, assets };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { buildId, assets } = build();
  console.log(`Build ${buildId}: ${assets.length} arquivos em dist/`);
}
