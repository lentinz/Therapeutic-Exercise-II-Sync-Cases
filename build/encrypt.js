#!/usr/bin/env node
/**
 * build/encrypt.js
 * ------------------------------------------------------------------
 * Build step for the Therapeutic-Exercise-II-Sync-Cases repo.
 *
 * Takes every plaintext case HTML file in src/, neutralizes the old
 * in-page CASE_PASSWORD gate, and encrypts the result with StatiCrypt
 * so GitHub Pages only ever serves ciphertext. case-engine.js,
 * case-styles.css, and image files are left completely untouched —
 * they are shared/public by design and are not secrets.
 *
 * Usage:
 *   STATICRYPT_PASSWORD="this terms passphrase" npm run build
 *   (or just `npm run build` and you'll be prompted for the passphrase)
 *
 * The passphrase is never written to a file, never logged, and never
 * committed. It only ever lives in your shell's environment for the
 * duration of this command (or is typed interactively).
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');
const OUT_DIR = REPO_ROOT; // GitHub Pages serves straight from the repo root

function die(msg) {
  console.error('\n[build:encrypt] ERROR: ' + msg + '\n');
  process.exit(1);
}

function neutralizeCasePassword(html, fileLabel) {
  // Matches:  const CASE_PASSWORD = "anything";   or   const CASE_PASSWORD = 'anything';
  // Also matches an already-blank CASE_PASSWORD = "";  (left as-is, harmlessly re-blanked).
  const pattern = /const\s+CASE_PASSWORD\s*=\s*["'][^"']*["']\s*;/;
  if (!pattern.test(html)) {
    die(
      `Could not find a "const CASE_PASSWORD = \"...\";" line in ${fileLabel}.\n` +
      `Refusing to encrypt a file where the old code-gate state can't be confirmed/neutralized ` +
      `(StatiCrypt is meant to be the ONLY real gate on the output).`
    );
  }
  return html.replace(pattern, 'const CASE_PASSWORD = "";');
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    die(`No src/ directory found at ${SRC_DIR}. Put plaintext case .html files there first.`);
  }

  const files = fs.readdirSync(SRC_DIR).filter(f => f.toLowerCase().endsWith('.html'));
  if (files.length === 0) {
    die(`src/ exists but contains no .html files — nothing to build.`);
  }

  // StatiCrypt reads STATICRYPT_PASSWORD from the environment itself if set;
  // if it's not set, we don't try to be clever — we just let its own CLI
  // prompt interactively, so the passphrase never needs to touch a file here.
  const havePasswordEnv = !!process.env.STATICRYPT_PASSWORD;
  if (!havePasswordEnv) {
    console.log('[build:encrypt] STATICRYPT_PASSWORD not set — StatiCrypt will prompt you for it interactively.');
  }

  // Stage neutralized plaintext in a throwaway temp dir (never written into the repo).
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'case-build-'));

  try {
    const stagedPaths = [];
    for (const file of files) {
      const srcPath = path.join(SRC_DIR, file);
      const html = fs.readFileSync(srcPath, 'utf8');
      const neutralized = neutralizeCasePassword(html, file);
      const stagedPath = path.join(stagingDir, file);
      fs.writeFileSync(stagedPath, neutralized, 'utf8');
      stagedPaths.push(stagedPath);
      console.log(`[build:encrypt] Prepared ${file} (CASE_PASSWORD blanked; StatiCrypt is now the real gate).`);
    }

    const staticryptBin = path.join(REPO_ROOT, 'node_modules', '.bin', 'staticrypt');
    if (!fs.existsSync(staticryptBin)) {
      die(`staticrypt isn't installed. Run "npm install" in the repo root first.`);
    }

    const args = [
      ...stagedPaths,
      '-d', OUT_DIR,
      '--short', // suppress the "short password" nag; we don't want it printing password-strength hints either
      '--template-title', 'Access Required',
      '--template-instructions', 'Enter this session’s access code to continue.',
      '--template-placeholder', 'Access code',
    ];
    if (havePasswordEnv) {
      // staticrypt's own -p flag would show up in `ps`/shell history if we passed
      // the password as a literal arg, so we deliberately don't use -p here.
      // Leaving -p off makes staticrypt fall back to reading STATICRYPT_PASSWORD
      // from the environment on its own (per its documented behavior).
    }

    console.log(`[build:encrypt] Encrypting ${stagedPaths.length} file(s) with StatiCrypt -> ${OUT_DIR}`);
    execFileSync(staticryptBin, args, {
      cwd: REPO_ROOT,
      stdio: 'inherit', // lets StatiCrypt's own interactive password prompt work if needed
      env: process.env,
    });

    console.log('\n[build:encrypt] Done. Encrypted case file(s) written to the repo root.');
    console.log('[build:encrypt] Remember: only commit the output files below — never anything from src/.');
    for (const file of files) console.log('  - ' + file);
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

main();
