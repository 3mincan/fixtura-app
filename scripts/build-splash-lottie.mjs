import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUTPUT_DIR = join(ROOT, 'assets/images/new');
const SIZE = 720;
const FPS = 15;

const SOURCES = [
  {
    mp4: join(ROOT, 'assets/images/new/fixtura-dark.mp4'),
    json: join(OUTPUT_DIR, 'fixtura-dark.json'),
    name: 'Fixtura Dark Splash',
  },
  {
    mp4: join(ROOT, 'assets/images/new/fixtura-light.mp4'),
    json: join(OUTPUT_DIR, 'fixtura-light.json'),
    name: 'Fixtura Light Splash',
  },
];

function buildLottieJson(frames, name) {
  const assets = frames.map((dataUri, index) => ({
    id: `img_${index}`,
    w: SIZE,
    h: SIZE,
    u: '',
    p: dataUri,
    e: 1,
  }));

  const layers = frames.map((_, index) => ({
    ddd: 0,
    ind: index + 1,
    ty: 2,
    nm: `frame_${index}`,
    refId: `img_${index}`,
    sr: 1,
    ip: index,
    op: index + 1,
    st: 0,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [SIZE / 2, SIZE / 2, 0] },
      a: { a: 0, k: [SIZE / 2, SIZE / 2, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
  }));

  return {
    v: '5.7.4',
    fr: FPS,
    ip: 0,
    op: frames.length,
    w: SIZE,
    h: SIZE,
    nm: name,
    assets,
    layers: layers.reverse(),
  };
}

function extractFrames(mp4Path) {
  const tempDir = mkdtempSync(join(tmpdir(), 'fixtura-lottie-'));

  try {
    execSync(
      `ffmpeg -y -i "${mp4Path}" -vf "fps=${FPS},scale=${SIZE}:${SIZE}" "${join(tempDir, 'frame_%04d.png')}"`,
      { stdio: 'inherit' },
    );

    const frames = [];
    for (let index = 1; index <= 500; index += 1) {
      const framePath = join(tempDir, `frame_${String(index).padStart(4, '0')}.png`);

      try {
        const buffer = readFileSync(framePath);
        frames.push(`data:image/png;base64,${buffer.toString('base64')}`);
      } catch {
        break;
      }
    }

    if (frames.length === 0) {
      throw new Error(`No frames extracted from ${mp4Path}`);
    }

    return frames;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

for (const source of SOURCES) {
  console.log(`Building ${source.json} from ${source.mp4}`);
  const frames = extractFrames(source.mp4);
  const lottie = buildLottieJson(frames, source.name);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(source.json, JSON.stringify(lottie));
  console.log(`Wrote ${frames.length} frames to ${source.json}`);
}
