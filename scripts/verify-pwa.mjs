import { existsSync, readFileSync } from 'node:fs';

const manifestPath = 'dist/manifest.webmanifest';
const serviceWorkerPath = 'dist/sw.js';

if (!existsSync(manifestPath) || !existsSync(serviceWorkerPath)) {
  throw new Error('PWA build artifacts are missing');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.name !== 'GymApp — журнал тренировок' || manifest.icons?.length < 2) {
  throw new Error('PWA manifest is incomplete');
}

console.log('PWA manifest and service worker are present');
