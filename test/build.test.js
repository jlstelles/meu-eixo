import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { build } from '../scripts/build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('build gera dist com service worker preenchido e todos os arquivos listados', () => {
  const dist = join(mkdtempSync(join(tmpdir(), 'meu-eixo-')), 'dist');
  const { buildId, assets } = build({ src, dist });
  const sw = readFileSync(join(dist, 'sw.js'), 'utf8');
  assert.match(buildId, /^[0-9a-f]{10}$/);
  assert.ok(!sw.includes('__ASSETS__') && !sw.includes('/*__BUILD_ID__*/'), 'marcadores substituídos');
  assert.ok(sw.includes(buildId));
  assert.ok(assets.includes('./'));
  assert.ok(assets.includes('./js/main.js'));
  assert.ok(assets.includes('./manifest.webmanifest'));
  for (const a of assets) {
    const rel = a === './' ? 'index.html' : a.slice(2);
    assert.ok(existsSync(join(dist, rel)), `listado mas ausente: ${a}`);
  }
  const all = walk(dist).map((f) => relative(dist, f)).filter((f) => f !== 'sw.js');
  assert.equal(all.length, assets.length, 'todo arquivo do app está no cache offline');
});

test('build é determinístico para o mesmo conteúdo', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'meu-eixo-'));
  const a = build({ src, dist: join(tmp, 'a') });
  const b = build({ src, dist: join(tmp, 'b') });
  assert.equal(a.buildId, b.buildId);
});

test('manifest e index.html apontam para arquivos que existem', () => {
  const manifest = JSON.parse(readFileSync(join(src, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  for (const i of manifest.icons) assert.ok(existsSync(join(src, i.src)), i.src);
  const html = readFileSync(join(src, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    if (m[1].startsWith('http')) continue;
    assert.ok(existsSync(join(src, m[1])), `index.html referencia ${m[1]}`);
  }
  assert.match(html, /name="viewport"/);
  assert.match(html, /<html lang="pt-BR">/);
});

test('imports relativos de todos os módulos apontam para arquivos existentes', () => {
  for (const file of walk(join(src, 'js')).filter((f) => f.endsWith('.js'))) {
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/from '(\.[^']+)'/g)) {
      assert.ok(existsSync(join(dirname(file), m[1])), `${relative(root, file)} importa ${m[1]}`);
    }
  }
});

test('todos os arquivos JS do app têm sintaxe válida (inclui main.js e sw.js)', () => {
  for (const file of [...walk(join(src, 'js')), join(src, 'sw.js')].filter((f) => f.endsWith('.js'))) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  }
});
