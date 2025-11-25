import { existsSync, copyFileSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workerPath = path.join(root, '.open-next', 'worker.js');
const assetsDir = path.join(root, '.open-next', 'assets');
const targetPath = path.join(assetsDir, '_worker.js');
const supportDirs = [
  'cloudflare',
  'middleware',
  path.join('.build', 'durable-objects'),
  'server-functions',
];

if (!existsSync(workerPath)) {
  console.error('OpenNext worker.js not found. Did the build step run successfully?');
  process.exit(1);
}

if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

copyFileSync(workerPath, targetPath);
console.log('Copied .open-next/worker.js -> .open-next/assets/_worker.js');

for (const relativeDir of supportDirs) {
  const source = path.join(root, '.open-next', relativeDir);
  const destination = path.join(assetsDir, relativeDir);

  if (!existsSync(source)) {
    console.warn(`Warning: ${relativeDir} not found under .open-next, skipping copy.`);
    continue;
  }

  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  console.log(`Copied .open-next/${relativeDir} -> .open-next/assets/${relativeDir}`);
}

// Patch worker to fall back to __STATIC_CONTENT binding on Cloudflare Pages.
const workerCode = readFileSync(targetPath, 'utf8');
const patchedCode = workerCode.replace(
  'async fetch(request, env, ctx) {',
  'async fetch(request, env, ctx) {\n        if (!env.ASSETS && env.__STATIC_CONTENT) {\n            env.ASSETS = env.__STATIC_CONTENT;\n        }'
);
writeFileSync(targetPath, patchedCode, 'utf8');
console.log('Patched _worker.js to use __STATIC_CONTENT fallback for assets.');
