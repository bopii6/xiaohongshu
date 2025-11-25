import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workerPath = path.join(root, '.open-next', 'worker.js');
const assetsDir = path.join(root, '.open-next', 'assets');
const targetPath = path.join(assetsDir, '_worker.js');

if (!existsSync(workerPath)) {
  console.error('OpenNext worker.js not found. Did the build step run successfully?');
  process.exit(1);
}

if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

copyFileSync(workerPath, targetPath);
console.log('Copied .open-next/worker.js -> .open-next/assets/_worker.js');
