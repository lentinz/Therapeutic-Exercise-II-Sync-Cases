// Ad-hoc verification script (not part of the build pipeline itself).
// Confirms: (1) the encrypted file's raw HTML contains no case text,
// (2) the correct passphrase unlocks and renders the case,
// (3) a wrong passphrase fails to unlock it.
//
// Run with: node build/verify.spec.mjs "<path-to-encrypted-file>" "<correct-passphrase>"

import { chromium } from 'playwright';
import fs from 'fs';

const [, , filePath, correctPassphrase] = process.argv;
if (!filePath || !correctPassphrase) {
  console.error('Usage: node verify.spec.mjs <encrypted-file> <correct-passphrase>');
  process.exit(1);
}

const rawHtml = fs.readFileSync(filePath, 'utf8');
const url = 'file://' + fs.realpathSync(filePath);

function assert(cond, msg) {
  if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; }
  else console.log('PASS: ' + msg);
}

// 1. Static source check — no plaintext case content in the file at rest.
assert(!/Right Shoulder Pain/i.test(rawHtml), 'raw file does not contain the case title');
assert(!/Sleeper stretch/i.test(rawHtml), 'raw file does not contain exercise content');
assert(!/practicecase/i.test(rawHtml), 'raw file does not contain the old CASE_PASSWORD value');
assert(/Access Required/.test(rawHtml), 'raw file shows the generic gate title');

const browser = await chromium.launch();

// 2. Wrong passphrase must fail.
{
  const page = await browser.newPage();
  await page.goto(url);
  await page.fill('#staticrypt-password', 'definitely-wrong-passphrase');
  await page.click('#staticrypt-form button, #staticrypt-form input[type="submit"]');
  await page.waitForTimeout(800);
  const bodyText = await page.textContent('body');
  assert(!/Right Shoulder Pain/i.test(bodyText), 'wrong passphrase does NOT reveal case content');
  await page.close();
}

// 3. Correct passphrase must unlock and render the case engine.
{
  const page = await browser.newPage();
  await page.goto(url);
  await page.fill('#staticrypt-password', correctPassphrase);
  await page.click('#staticrypt-form button, #staticrypt-form input[type="submit"]');
  await page.waitForTimeout(1200);
  const bodyText = await page.textContent('body');
  assert(/Welcome|Begin|Activity Objectives/i.test(bodyText), 'correct passphrase unlocks and renders the case engine (Welcome stage)');
}

await browser.close();
