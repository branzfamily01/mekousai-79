import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const WORKER_NAME = 'mekousai-79';
const D1_NAME = 'mekousai-79-gallery';
const R2_NAME = 'mekousai-79-media';
const STAGE_DIR = '.cloudflare-static';
const GENERATED_CONFIG = '.wrangler.generated.toml';
const STATIC_EXTENSIONS = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.avif', '.webp', '.svg', '.mp3', '.m4a', '.wav', '.ico', '.txt']);

function wrangler(args, options = {}) {
  const result = execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  });
  return result || '';
}

function stageStaticSite() {
  rmSync(STAGE_DIR, { recursive: true, force: true });
  mkdirSync(STAGE_DIR, { recursive: true });
  for (const entry of readdirSync('.')) {
    const ext = extname(entry).toLowerCase();
    if (!STATIC_EXTENSIONS.has(ext)) continue;
    copyFileSync(entry, join(STAGE_DIR, entry));
  }
  console.log(`Staged static site assets in ${STAGE_DIR}`);
}

function getD1() {
  const raw = wrangler(['d1', 'list', '--json'], { capture: true });
  const databases = JSON.parse(raw);
  return databases.find((db) => db.name === D1_NAME) || null;
}

function ensureD1() {
  let db = getD1();
  if (!db) {
    console.log(`Creating D1 database: ${D1_NAME}`);
    wrangler(['d1', 'create', D1_NAME]);
    db = getD1();
  }
  if (!db?.uuid) throw new Error(`Could not resolve D1 database id for ${D1_NAME}`);
  console.log(`Using D1 database: ${D1_NAME} (${db.uuid})`);
  return db.uuid;
}

function ensureR2() {
  const list = wrangler(['r2', 'bucket', 'list'], { capture: true });
  if (!list.includes(R2_NAME)) {
    console.log(`Creating R2 bucket: ${R2_NAME}`);
    wrangler(['r2', 'bucket', 'create', R2_NAME, '--storage-class', 'Standard']);
  } else {
    console.log(`Using existing R2 bucket: ${R2_NAME}`);
  }
}

function writeGeneratedConfig(databaseId) {
  const base = readFileSync('wrangler.toml', 'utf8').trim();
  const config = `${base}\n\n[[r2_buckets]]\nbinding = "MEDIA"\nbucket_name = "${R2_NAME}"\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${D1_NAME}"\ndatabase_id = "${databaseId}"\nmigrations_dir = "migrations"\n`;
  writeFileSync(GENERATED_CONFIG, config, 'utf8');
  console.log(`Generated ${GENERATED_CONFIG}`);
}

stageStaticSite();
const databaseId = ensureD1();
ensureR2();
writeGeneratedConfig(databaseId);

console.log('Applying D1 migrations...');
wrangler(['d1', 'migrations', 'apply', 'DB', '--remote', '--config', GENERATED_CONFIG]);

console.log(`Deploying Worker: ${WORKER_NAME}`);
wrangler(['deploy', '--config', GENERATED_CONFIG]);
