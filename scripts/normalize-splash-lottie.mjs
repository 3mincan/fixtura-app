import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = [
  join(ROOT, 'assets/images/new/fixtura-dark.json'),
  join(ROOT, 'assets/images/new/fixtura-light.json'),
];

function convertWebpDataUriToPngDataUri(dataUri) {
  const tempDir = mkdtempSync(join(tmpdir(), 'fixtura-lottie-png-'));
  const webpPath = join(tempDir, 'frame.webp');
  const pngPath = join(tempDir, 'frame.png');

  try {
    writeFileSync(webpPath, Buffer.from(dataUri.split(',')[1], 'base64'));
    execSync(`ffmpeg -y -loglevel error -i "${webpPath}" "${pngPath}"`);
    const pngBuffer = readFileSync(pngPath);
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function normalizeAsset(asset) {
  if (!asset?.p || typeof asset.p !== 'string') {
    return asset;
  }

  if (asset.p.startsWith('data:image/webp;base64,')) {
    return {
      ...asset,
      u: asset.u ?? '',
      p: convertWebpDataUriToPngDataUri(asset.p),
      e: 1,
    };
  }

  return {
    ...asset,
    u: asset.u ?? '',
  };
}

for (const filePath of FILES) {
  const animation = JSON.parse(readFileSync(filePath, 'utf8'));
  const assets = animation.assets ?? [];
  let converted = 0;

  animation.assets = assets.map((asset) => {
    const next = normalizeAsset(asset);
    if (next.p !== asset.p) {
      converted += 1;
    }
    return next;
  });

  writeFileSync(filePath, JSON.stringify(animation));
  console.log(`${filePath}: converted ${converted}/${assets.length} embedded assets to PNG`);
}
