# Instructor Guide generator

Scaffolding for Message 2 (per Case 5B chat decisions). Two scripts, run in sequence:

```
node extract-case-data.js Pilot_Case_Shoulder_Pain.html > case1-data.json
node build-instructor-guide.js case1-data.json Instructor_Guide_Case1.docx
```

Needs Node (you already have it from the StatiCrypt setup) plus the `docx` npm
package once:

```
npm install docx
```

## What it reads

`extract-case-data.js` pulls the inline data `<script>` out of a case shell
HTML file (same file you'd encrypt with StatiCrypt) and dumps it as JSON. It
never touches `case-engine.js`, never runs in a browser, and never phones
home — it's a local, sandboxed read of your own file.

`build-instructor-guide.js` turns that JSON into a Word doc: patient info,
working clinical picture, then one tiered table per section (Subjective,
Screening, Differential, Body Structure & Function, Impairments), then
interventions grouped by impairment, then debrief prompts. A red "Instructor
Guide — not for student distribution" line sits under the title on every
guide as a reminder of what it is.

## Field names this expects (the ones agreed on 11/18)

All optional — the guide renders fine with blank "Why" cells for any case
that doesn't have these yet (e.g. Case 1 today).

- **`why`** — add to items in `SUBJ_QUESTIONS`, `SCREENING`, `DIFFERENTIAL`,
  `IMPSEARCH` (Body Structure measurements), **and `IMPAIRMENTS`**. One
  sentence on why that item earns its tier.
- **`reveal`** — exercises already carry this; the guide reuses it as the
  tier rationale, nothing new to add.
- **`instructorNote`** — optional, on exercises only. Instructor-only
  content with no classroom equivalent (e.g. recommended dosing,
  reassessment cues).
- **`INSTRUCTOR_OVERVIEW`** — case-level string. A short paragraph on the
  working clinical picture.
- **`DISCUSSION_PROMPTS`** — case-level array of 2-3 debrief question
  strings.

None of these five are read by `case-engine.js` — they're invisible to
students even once the case is decrypted, since the engine's `render()`
calls never look for them.

## Status

Tested against the real Case 1 (`Pilot_Case_Shoulder_Pain.html`) data, both
as-is (no `why`/overview/prompts — confirms the guide degrades gracefully)
and with those fields populated (confirms every new field renders where it
should). Not yet run against Case 5B — waiting on the 5B shell data with
`why` fields and the reference guide from that chat, per your last message.
