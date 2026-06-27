import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const IMAGES = join(ROOT, 'assets/images');
const APP_ICON_LIGHT_SOURCE = join(IMAGES, 'icon-source-light.png');
const APP_ICON_DARK_SOURCE = join(IMAGES, 'icon-source-dark.png');

const LIGHT_ARTWORK = {
  source: APP_ICON_LIGHT_SOURCE,
  crop: 'crop=352:490:591:271',
};

const DARK_ARTWORK = {
  source: APP_ICON_DARK_SOURCE,
  crop: 'crop=512:552:1:237',
};

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

function ensureSource() {
  for (const source of [APP_ICON_LIGHT_SOURCE, APP_ICON_DARK_SOURCE]) {
    if (!existsSync(source)) {
      throw new Error(`Missing app icon source: ${source}`);
    }
  }
}

function composeSquareIcon({ artwork, background, size, targetHeight, output }) {
  run(
    `ffmpeg -y -loglevel error -f lavfi -i color=c=${background}:s=${size}x${size} -i "${artwork.source}" ` +
      `-filter_complex "[1:v]format=rgba,${artwork.crop},scale=-1:${targetHeight}:flags=lanczos[icon];[0:v][icon]overlay=(W-w)/2:(H-h)/2:format=auto" ` +
      `-frames:v 1 -pix_fmt rgb24 "${output}"`,
  );
}

function composeTransparentIcon({ artwork, size, targetHeight, output, monochrome = false }) {
  const colorFilter = monochrome ? ',lutrgb=r=255:g=255:b=255' : '';

  run(
    `ffmpeg -y -loglevel error -i "${artwork.source}" ` +
      `-vf "format=rgba,${artwork.crop},scale=-1:${targetHeight}:flags=lanczos${colorFilter},pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000" ` +
      `-frames:v 1 "${output}"`,
  );
}

function composeTintedIcon({ artwork, output }) {
  run(
    `ffmpeg -y -loglevel error -f lavfi -i color=c=white:s=1024x1024 -i "${artwork.source}" ` +
      `-filter_complex "[1:v]format=rgba,${artwork.crop},scale=-1:820:flags=lanczos,hue=s=0[icon];[0:v][icon]overlay=(W-w)/2:(H-h)/2:format=auto" ` +
      `-frames:v 1 -pix_fmt rgb24 "${output}"`,
  );
}

function buildIcons() {
  mkdirSync(IMAGES, { recursive: true });

  composeSquareIcon({
    artwork: LIGHT_ARTWORK,
    background: 'white',
    size: 1024,
    targetHeight: 820,
    output: join(IMAGES, 'icon-light.png'),
  });
  composeSquareIcon({
    artwork: DARK_ARTWORK,
    background: 'black',
    size: 1024,
    targetHeight: 920,
    output: join(IMAGES, 'icon-dark.png'),
  });
  composeTintedIcon({
    artwork: LIGHT_ARTWORK,
    output: join(IMAGES, 'icon-tinted.png'),
  });

  composeTransparentIcon({
    artwork: LIGHT_ARTWORK,
    size: 512,
    targetHeight: 420,
    output: join(IMAGES, 'android-icon-foreground-light.png'),
  });
  composeTransparentIcon({
    artwork: LIGHT_ARTWORK,
    size: 512,
    targetHeight: 420,
    output: join(IMAGES, 'android-icon-foreground-dark.png'),
  });
  cpSync(join(IMAGES, 'android-icon-foreground-light.png'), join(IMAGES, 'android-icon-foreground.png'));

  composeTransparentIcon({
    artwork: LIGHT_ARTWORK,
    size: 432,
    targetHeight: 360,
    monochrome: true,
    output: join(IMAGES, 'android-icon-monochrome.png'),
  });

  run(
    `ffmpeg -y -loglevel error -f lavfi -i color=c=white:s=512x512 -frames:v 1 "${join(IMAGES, 'android-icon-background-light.png')}"`,
  );
  run(
    `ffmpeg -y -loglevel error -f lavfi -i color=c=black:s=512x512 -frames:v 1 "${join(IMAGES, 'android-icon-background.png')}"`,
  );

  run(`sips -z 48 48 "${join(IMAGES, 'icon-light.png')}" --out "${join(IMAGES, 'favicon.png')}"`);
  run(`sips -z 48 48 "${join(IMAGES, 'icon-light.png')}" --out "${join(IMAGES, 'favicon-light.png')}"`);
  run(`sips -z 48 48 "${join(IMAGES, 'icon-dark.png')}" --out "${join(IMAGES, 'favicon-dark.png')}"`);
  run(`sips -z 512 512 "${join(IMAGES, 'icon-light.png')}" --out "${join(IMAGES, 'splash-icon.png')}"`);

  cpSync(join(IMAGES, 'icon-light.png'), join(IMAGES, 'icon.png'));
  cpSync(APP_ICON_LIGHT_SOURCE, join(IMAGES, 'icon-source.png'));
}

ensureSource();
buildIcons();
console.log('App icon variants generated from icon-source-light.png and icon-source-dark.png');
