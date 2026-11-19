# Therapeutic-Exercise-II-Sync-Cases

Case Activities for Synchronous Sessions — Therapeutic Exercise II Course

## Cases

### Module 1
- **Pilot Case: Right Shoulder Pain** — https://lentinz.github.io/Therapeutic-Exercise-II-Sync-Cases/Pilot%20Case_Shoulder%20Pain.html

### Module 2
- **Case 2A:** _Coming soon_
- **Case 2B:** _Coming soon_

### Module 3
- **Case 3A:** _Coming soon_
- **Case 3B:** _Coming soon_

### Module 4
- **Case 4A:** _Coming soon_
- **Case 4B:** _Coming soon_

### Module 5
- **Case 5A:** _Coming soon_
- **Case 5B: Prepare for Impact** — https://lentinz.github.io/Therapeutic-Exercise-II-Sync-Cases/Case%205B_Prepare%20for%20Impact.html

### Module 6
- **Case 6A:** _Coming soon_
- **Case 6B:** _Coming soon_

## Access

Case files are encrypted at rest with [StatiCrypt](https://github.com/robinmoisson/staticrypt) so GitHub Pages only ever
serves ciphertext — the repo is public, but case content (scenario, findings, answer tiers) is not readable without the
session's access code. Give out the current term's access code separately (e.g. in Canvas), not in this repo.

## Build Workflow (editing a case)

Case content is never edited in the encrypted files that ship on Pages. Instead:

1. **Edit the plaintext source** in `src/` (e.g. `src/Pilot Case_Shoulder Pain.html`). This is a normal, readable case
   file — same format as always, including its own `const CASE_PASSWORD = "...";` line (that line is just a
   placeholder/dev convenience in `src/` and gets blanked automatically at build time; StatiCrypt is the real gate).
2. **Install dependencies once per clone:** `npm install`.
3. **Build the encrypted output:**
   ```
   STATICRYPT_PASSWORD="this term's access code" npm run build
   ```
   (Omit the env var and the build will prompt you for the passphrase interactively instead — either way, it is never
   written to a file or printed by the build script.) This reads every `.html` file in `src/`, blanks its
   `CASE_PASSWORD`, encrypts it with StatiCrypt, and writes the result into the repo root — the same filenames the
   README links above already point to. `case-engine.js`, `case-styles.css`, and all images are untouched by this
   step; they are shared/public by design and contain no case content.
4. **Commit only the build output** (the encrypted `.html` files at the repo root, plus `.staticrypt.json` if it
   changed — that file holds a non-secret salt, not the passphrase). **Never commit anything from `src/`** — it's
   gitignored for exactly this reason.
5. Push as usual. GitHub Pages serves the encrypted files; students/groups enter the access code in-browser to decrypt
   and use the case normally.

### Rotate the access code every term

Pick a new passphrase at the start of each term, re-run the build with it, and commit the newly-encrypted output. The
old passphrase stops working the moment the new build is pushed — there's nothing else to revoke. Don't post the
passphrase anywhere public; share it the way you'd share any other one-time course code.

### If you need to verify a build yourself

`build/verify.spec.mjs` is an optional, no-frills headless-browser check (not part of the normal build) that confirms
an encrypted file contains no case text at rest, that the right passphrase unlocks it, and that a wrong one doesn't.
It needs Playwright (`npm i -D playwright` once), then:
```
node build/verify.spec.mjs "Pilot Case_Shoulder Pain.html" "this term's access code"
```
