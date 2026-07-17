'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HEROES = path.join(__dirname, '..', 'stock', 'media', 'heroes');
const STOCK = path.join(__dirname, '..', 'stock', 'media');

/** Creative Commons / public-domain sources (Archive.org). */
const ARCHIVE = [
  {
    file: 'city-16x9.mp4',
    url: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
    minBytes: 50_000_000,
  },
  {
    file: 'forest-16x9.mp4',
    url: 'https://archive.org/download/Sintel/sintel-2048-surround_512kb.mp4',
    minBytes: 80_000_000,
  },
  {
    file: 'ocean-archive.mp4',
    url: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
    minBytes: 40_000_000,
  },
  {
    file: 'steel-16x9.mp4',
    url: 'https://archive.org/download/TearsOfSteel/tears_of_steel_720p.mp4',
    minBytes: 25_000_000,
  },
  {
    file: 'spring-16x9.mp4',
    url: 'https://archive.org/download/SpringBlender/spring_720p.mp4',
    minBytes: 15_000_000,
  },
  {
    file: 'cosmos-16x9.mp4',
    url: 'https://archive.org/download/BlenderFoundation/Cosmos_W_laundromat_1080p.mp4',
    minBytes: 20_000_000,
  },
];

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

function download(url, dest) {
  try {
    run(`curl -L --fail --continue-at - -o "${dest}" "${url}"`);
    return true;
  } catch {
    return false;
  }
}

function ensureArchiveVideos() {
  fs.mkdirSync(HEROES, { recursive: true });
  for (const item of ARCHIVE) {
    const dest = path.join(HEROES, item.file);
    if (fs.existsSync(dest) && fs.statSync(dest).size >= item.minBytes) {
      console.log(`OK  ${item.file}`);
      continue;
    }
    console.log(`Downloading ${item.file}…`);
    if (!download(item.url, dest) || !fs.existsSync(dest)) {
      console.warn(`Skip ${item.file} — download failed`);
      continue;
    }
    console.log(`Wrote ${item.file} (${fs.statSync(dest).size} bytes)`);
  }
}

function ensureClips() {
  const clips = [
    {
      out: 'ocean-16x9.mp4',
      in: path.join(STOCK, '16-9 Aspect Ratio(video).mp4'),
      args: '-t 20',
    },
    {
      out: 'vertical-9x16.mp4',
      in: path.join(STOCK, '9-16 Aspect Ratio(video).mp4'),
      args: '-t 18',
    },
    {
      out: 'mountains-16x9.mp4',
      in: path.join(HEROES, 'forest-16x9.mp4'),
      args: '-ss 30 -t 15',
    },
    {
      out: 'abstract-16x9.mp4',
      in: path.join(HEROES, 'city-16x9.mp4'),
      args: '-ss 45 -t 12',
    },
    {
      out: 'steel-clip-16x9.mp4',
      in: path.join(HEROES, 'steel-16x9.mp4'),
      args: '-ss 20 -t 18',
      fallback: path.join(HEROES, 'forest-16x9.mp4'),
      fbArgs: '-ss 120 -t 18',
    },
    {
      out: 'spring-clip-16x9.mp4',
      in: path.join(HEROES, 'spring-16x9.mp4'),
      args: '-ss 10 -t 16',
      fallback: path.join(HEROES, 'city-16x9.mp4'),
      fbArgs: '-ss 90 -t 16',
    },
    {
      out: 'cosmos-clip-16x9.mp4',
      in: path.join(HEROES, 'cosmos-16x9.mp4'),
      args: '-ss 60 -t 14',
      fallback: path.join(HEROES, 'ocean-archive.mp4'),
      fbArgs: '-ss 30 -t 14',
    },
    {
      out: 'sintel-clip-16x9.mp4',
      in: path.join(HEROES, 'forest-16x9.mp4'),
      args: '-ss 90 -t 16',
    },
  ];

  for (const clip of clips) {
    const dest = path.join(HEROES, clip.out);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 500_000) {
      console.log(`OK  ${clip.out}`);
      continue;
    }
    if (!fs.existsSync(clip.in)) {
      if (clip.fallback && fs.existsSync(clip.fallback)) {
        console.log(`Clipping ${clip.out} from fallback…`);
        run(`ffmpeg -y -i "${clip.fallback}" ${clip.fbArgs} -c copy "${dest}"`);
        continue;
      }
      console.warn(`Skip ${clip.out} — missing ${clip.in}`);
      continue;
    }
    console.log(`Clipping ${clip.out}…`);
    run(`ffmpeg -y -i "${clip.in}" ${clip.args} -c copy "${dest}"`);
  }
}

function main() {
  ensureArchiveVideos();
  ensureClips();
  console.log('\nHero videos ready in stock/media/heroes/');
}

main();
