// ============================================================
// case-engine.js — SHARED navigation, rendering, and logic.
// Identical across every case file. Do NOT put case-specific
// content here — that lives in each case's own <script> block
// (CASE_NUMBER, CASE_TITLE, SUBJ_QUESTIONS, EXERCISES, etc.),
// defined BEFORE this file loads.
//
// To update every case at once, edit this file (or case-styles.css)
// and re-upload — no per-case changes needed.
// ============================================================

const COURSE_TITLE = "DPHT 7250: THERAPEUTIC EXERCISE II";
const STORAGE_KEY = 'caseProgress::' + CASE_NUMBER + '::' + CASE_TITLE;

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, current, maxVisited }));
  } catch (e) { /* storage unavailable or full — fail silently, not critical */ }
}
function loadSavedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearSavedProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}
function resumeSavedProgress() {
  const saved = loadSavedProgress();
  if (saved) {
    Object.assign(state, saved.state);
    current = saved.current;
    maxVisited = saved.maxVisited;
  }
  initShell();
  render();
}
function discardSavedProgressAndStart() {
  clearSavedProgress();
  current = 0; maxVisited = 0;
  initShell();
  render();
}
function renderResumePrompt() {
  initShell();
  document.getElementById('main').innerHTML = `
    <div class="eyebrow">WELCOME BACK</div>
    <h1 class="stage-title">Resume Your Progress?</h1>
    <p class="lede">This browser has saved progress for this case, likely from a session that got interrupted.</p>
    <div class="panel">
      <button class="btn" onclick="resumeSavedProgress()">Resume where I left off</button>
      <button class="btn secondary" style="margin-left:10px;" onclick="discardSavedProgressAndStart()">Start fresh</button>
    </div>
  `;
}

const AUTHOR_CREDIT = "Case author: Zachary Lentini, PT, DPT";

const STAGES = ["Welcome & Objectives","Case Intro","Subjective: Reflect","Subjective: Interview","Objective: Reflect","Objective: Examine","Impairment Priority","Treatment: Exercise & Dosage","Case Summary"];
let current = 0;
let maxVisited = 0;

const state = {
  groupName: "",
  subjOpenLocked: false,
  subjLocked: false,
  objOpenLocked: false,
  objLocked: false,
  subjOpen: "", subjPicked: [],
  objOpen: "",
  screeningPicked: [], differentialPicked: [], impairmentSearchPicked: [],
  impairmentOrder: [], topPriorities: [],
  exerciseSlots: {},   // { impId: [ {type:'menu', idx} | {type:'other', text} ] }
  otherShown: {},       // { impId: true } — write-in input row is open but not yet committed to a slot
  dosage: {},           // { impId_slotIdx: {sets,reps,loadtype,loadval,rationale} }
  otherInterventions: ""
};

const TIER_DOT = { green: '<span class="tier-dot tier-green"></span>', yellow: '<span class="tier-dot tier-yellow"></span>', red: '<span class="tier-dot tier-red"></span>' };
const TIER_LABEL = { green: 'Green — strong choice', yellow: 'Yellow — acceptable choice', red: 'Red — not advised' };
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
shuffleInPlace(SUBJ_QUESTIONS);
shuffleInPlace(SCREENING);
if (typeof DIFFERENTIAL !== 'undefined') shuffleInPlace(DIFFERENTIAL);
shuffleInPlace(IMPSEARCH);
Object.keys(EXERCISES).forEach(k => shuffleInPlace(EXERCISES[k]));


function revealedImpairmentIds() {
  return state.impairmentSearchPicked.map(id => IMPSEARCH.find(x => x.id === id).revealsImpairment);
}

function renderSidebar() {
  document.getElementById('stageList').innerHTML = STAGES.map((s,i) => {
    let cls = i === current ? 'active' : (i <= maxVisited ? 'done' : '');
    const clickable = i <= maxVisited && i !== current;
    return `<li class="stage-item ${cls}" ${clickable ? `style="cursor:pointer;" onclick="goTo(${i})"` : ''}>${s}</li>`;
  }).join('');
}

function goTo(stage) { current = stage; if (stage > maxVisited) maxVisited = stage; render(); window.scrollTo(0,0); }

function render() {
  renderSidebar();
  let html = RENDERERS[current]();
  if (current > 0) {
    html = `<button class="btn secondary small" style="margin-bottom:20px;" onclick="goTo(${current-1})">&larr; Back</button>` + html;
  }
  document.getElementById('main').innerHTML = html;
  updateCaseRefVisibility();
  if (current === 6) initDragList();
  if (current === 0) checkWelcomeReady();
  if (current === 2) checkMinWords('subjOpenInput','subjContinueBtn',10);
  if (current === 5) checkMinWords('objOpenInput','objContinueBtn',10);
  saveProgress();
}

function wordCount(text) {
  const t = (text || '').trim();
  return t.length === 0 ? 0 : t.split(/\s+/).length;
}
function checkMinWords(textareaId, btnId, min) {
  const ta = document.getElementById(textareaId);
  const btn = document.getElementById(btnId);
  if (!ta || !btn) return;
  btn.disabled = wordCount(ta.value) < min;
}
function checkWelcomeReady() {
  const nameEl = document.getElementById('groupNameInput');
  const ackEl = document.getElementById('ackCheckbox');
  const btn = document.getElementById('welcomeContinueBtn');
  if (!nameEl || !ackEl || !btn) return;
  btn.disabled = !(nameEl.value.trim().length > 0 && ackEl.checked);
}

const RENDERERS = [renderWelcome, renderIntro, renderSubjOpen, renderSubjInterview, renderObjOpen, renderObjExamine, renderImpairments, renderTreatment, renderSummary];

const ACTIVITY_OBJECTIVES = [
  'Prioritize subjective and objective examination items under a limited-selection constraint that mirrors real clinical time pressure.',
  'Differentiate higher-yield clinical findings from lower-yield or misleading ones based on the case presentation.',
  'Rank impairments according to their clinical relevance to the case.',
  'Prescribe exercise-based interventions, including exercise selection and dosage, that address a prioritized impairment.',
  'Justify clinical decisions using sound reasoning rather than guesswork, such as citing specific subjective or objective findings.',
  'Communicate clinical reasoning in an effective manner during small-group and large-group discussion.'
];

function renderWelcome() {
  return `
    <div class="eyebrow">DPHT 7250: THERAPEUTIC EXERCISE II</div>
    <h1 class="stage-title">Welcome</h1>
    <p class="lede">Before you begin, review the activity objectives and how this case works, then enter your group's information below.</p>

    <div class="panel">
      <h3 style="margin-top:0;">Activity Objectives</h3>
      <ol style="padding-left:20px; margin:0;">
        ${ACTIVITY_OBJECTIVES.map(o => `<li style="margin-bottom:8px;">${o}</li>`).join('')}
      </ol>
      ${CASE_SPECIFIC_OBJECTIVES.length ? `
        <h3>Case-Specific Objectives</h3>
        <ol style="padding-left:20px; margin:0;">
          ${CASE_SPECIFIC_OBJECTIVES.map(o => `<li style="margin-bottom:8px;">${o}</li>`).join('')}
        </ol>
      ` : ''}
    </div>

    <div class="panel dim">
      <h3 style="margin-top:0;">How This Works</h3>
      <ul style="padding-left:20px; margin:0;">
        <li style="margin-bottom:8px;">This case moves through a fixed sequence of stages. Once you continue past a selection stage, those choices lock in \u2014 you can revisit it to review, but not to change it. Your impairment ranking and exercise/dosage choices are the exception and can still be changed anytime before you finish.</li>
        <li style="margin-bottom:8px;">Quality ratings (green/yellow/red) on your choices are hidden until the very end \u2014 you won't get real-time right/wrong feedback as you go. That's intentional: it's meant to make you reason the way you would in practice, not hunt for hints.</li>
        <li style="margin-bottom:8px;">A less appropriate choice earlier in the case can affect what's available to you later \u2014 for example, what you choose to test determines which impairments you're able to prioritize afterward. There's no way to go back and add a finding you didn't originally test for.</li>
        <li style="margin-bottom:8px;"><strong>Your progress is automatically saved in this browser as you go.</strong> If you accidentally close or refresh the page, reopening it will offer to resume right where you left off. This only works on the same device and browser, though — switching computers mid-case will lose your progress, so stick with one device for the whole session.</li>
        <li>Expect this case to take roughly 20\u201330 minutes.</li>
      </ul>
    </div>

    <div class="panel">
      <label style="font-weight:600; display:block; margin-bottom:10px;">Enter the names of everyone in your group (one per line, or separated by commas).</label>
      <textarea id="groupNameInput" placeholder="e.g. Jane Smith, Alex Lee, Priya Patel" oninput="state.groupName = this.value; checkWelcomeReady(); saveProgress();">${state.groupName}</textarea>
      <div class="note">This will appear on your completion certificate at the end of the case.</div>
      <div style="margin-top:16px; display:flex; gap:10px; align-items:flex-start;">
        <input type="checkbox" id="ackCheckbox" onclick="checkWelcomeReady()" style="margin-top:3px;">
        <label for="ackCheckbox" style="font-size:13.5px;">By beginning this case, our group confirms that every member is expected to contribute to the discussion and decisions made throughout, and that each team member will individually submit the resulting Case Completion Record to Canvas for participation credit.</label>
      </div>
    </div>

    <button class="btn" id="welcomeContinueBtn" disabled onclick="saveAndGo('groupNameInput','groupName',1)">Begin</button>
  `;
}
function renderIntro() {
  const imageBlock = (typeof CASE_IMAGE !== 'undefined' && CASE_IMAGE)
    ? `<img src="${CASE_IMAGE}" alt="${(typeof CASE_IMAGE_ALT !== 'undefined' && CASE_IMAGE_ALT) || (CASE_TITLE + ' — clinical scene')}" style="width:100%; height:260px; object-fit:cover; object-position:center 30%; border:1px solid var(--line); margin-bottom:18px; display:block;">`
    : `<div style="width:100%; height:220px; border:1px dashed var(--line-strong); background:var(--paper-dim); margin-bottom:18px; display:flex; align-items:center; justify-content:center;"><span style="color:var(--ink-soft); font-size:13.5px;">Image placeholder — patient / treatment setting</span></div>`;
  const patientRows = (typeof PATIENT_INFO !== 'undefined' ? PATIENT_INFO : [])
    .map(p => `<p><strong>${p.label}:</strong> ${p.value}</p>`).join('');
  return `
    <div class="eyebrow">${CASE_NUMBER.toUpperCase()}</div>
    <h1 class="stage-title">${CASE_TITLE}</h1>
    <p class="lede" style="font-style:italic;">${CASE_SCENE}</p>
    ${imageBlock}
    <div class="panel">
      ${patientRows}
    </div>
    <button class="btn" onclick="goTo(2)">Begin Subjective Interview</button>
  `;
}

function renderSubjOpen() {
  const locked = state.subjOpenLocked;
  return `
    <div class="eyebrow">SUBJECTIVE — REFLECT</div>
    <h1 class="stage-title">Initial Thoughts</h1>
    <p class="lede">Before interviewing the patient, consider what you already know from the case introduction.</p>
    <div class="panel">
      <label style="font-weight:600; display:block; margin-bottom:10px;">What are your initial thoughts on this case? What are you curious about or concerned about? (minimum 10 words)</label>
      <textarea id="subjOpenInput" placeholder="Type your reasoning here..." ${locked ? 'readonly' : ''} oninput="state.subjOpen = this.value; checkMinWords('subjOpenInput','subjContinueBtn',10); saveProgress();">${state.subjOpen}</textarea>
    </div>
    <button class="btn" id="subjContinueBtn" disabled onclick="state.subjOpenLocked = true; saveAndGo('subjOpenInput','subjOpen',3);">Continue to Interview</button>
    <div class="note">${locked ? 'Your response is locked in.' : "You won't be able to change your answer once you move on to the next page."}</div>
  `;
}

function renderSubjInterview() {
  const picked = state.subjPicked;
  const locked = state.subjLocked;
  return `
    <div class="eyebrow">SUBJECTIVE — INTERVIEW</div>
    <h1 class="stage-title">Select Your Questions</h1>
    <p class="lede">Choose the questions you'd prioritize asking this patient. You may select up to ${SUBJ_LIMIT} of ${SUBJ_QUESTIONS.length}.${locked ? ' Your selections are locked in and shown read-only below.' : ' Once selected, a question is locked in — choose carefully.'}</p>
    <div class="counter">Selected: <strong>${picked.length} / ${SUBJ_LIMIT}</strong></div>
    <div class="tile-grid">
      ${SUBJ_QUESTIONS.map(q => {
        const isSel = picked.includes(q.id);
        const inert = locked || isSel || picked.length >= SUBJ_LIMIT;
        return `
        <button class="tile ${isSel ? 'selected' : ''}" ${inert ? 'disabled' : ''} ${inert ? '' : `onclick="toggleSubj('${q.id}')"`}>
          <span class="category-label">${q.cat}</span>${q.q}
        </button>
      `;
      }).join('')}
    </div>
    <div>
      ${picked.map(id => {
        const q = SUBJ_QUESTIONS.find(x => x.id === id);
        return `<div class="finding"><span class="finding-tag">${q.q}</span>${q.a}</div>`;
      }).join('')}
    </div>
    <button class="btn" ${picked.length === 0 ? 'disabled' : ''} onclick="state.subjLocked = true; goTo(4);">Continue to Objective Exam</button>
    <div class="note">${state.subjLocked ? 'Your selections are locked in.' : "You won't be able to change your selections once you move on to the next page."}</div>
  `;
}
function toggleSubj(id) { toggleInArr(state.subjPicked, id, SUBJ_LIMIT); render(); }

function renderObjOpen() {
  const locked = state.objOpenLocked;
  return `
    <div class="eyebrow">OBJECTIVE — REFLECT</div>
    <h1 class="stage-title">What Would You Test?</h1>
    <p class="lede">Based on the subjective findings so far, what do you want to examine and why?</p>
    <div class="panel">
      <label style="font-weight:600; display:block; margin-bottom:10px;">What would you want to test, and what are you hoping to rule in or out? (minimum 10 words)</label>
      <textarea id="objOpenInput" placeholder="Type your reasoning here..." ${locked ? 'readonly' : ''} oninput="state.objOpen = this.value; checkMinWords('objOpenInput','objContinueBtn',10); saveProgress();">${state.objOpen}</textarea>
    </div>
    <button class="btn" id="objContinueBtn" disabled onclick="state.objOpenLocked = true; saveAndGo('objOpenInput','objOpen',5);">Continue to Exam Selection</button>
    <div class="note">${locked ? 'Your response is locked in.' : "You won't be able to change your answer once you move on to the next page."}</div>
  `;
}

function romTableHtml() {
  return `<table class="rom-table">
    <tr><th>Plane</th><th>AROM (R)</th><th>AROM (L)</th><th>PROM (R)</th><th>PROM (L)</th></tr>
    ${ROM_DATA.map(r => `<tr><td>${r.plane}</td><td>${r.aromR}</td><td>${r.aromL}</td><td>${r.promR}</td><td>${r.promL}</td></tr>`).join('')}
  </table>`;
}

function renderObjCategory(title, sub, items, picked, limit, toggleFn, locked, unlocked, isLast) {
  const requirementText = isLast ? `select ${limit} to continue` : `select ${limit} to unlock the next section`;
  if (!unlocked) {
    return `
      <div class="obj-category obj-category-locked">
        <h3>${title}</h3>
        <div class="cat-sub">${sub}</div>
        <div class="locked-message">&#128274; Complete the section above to unlock this one.</div>
      </div>
    `;
  }
  return `
    <div class="obj-category">
      <h3>${title}</h3>
      <div class="cat-sub">${sub} — ${requirementText} <span class="counter"><strong>${picked.length} / ${limit}</strong></span></div>
      <div class="tile-grid">
        ${items.map(it => {
          const isSel = picked.includes(it.id);
          const inert = locked || isSel || picked.length >= limit;
          return `
          <button class="tile ${isSel ? 'selected' : ''}" ${inert ? 'disabled' : ''} ${inert ? '' : `onclick="${toggleFn}('${it.id}')"`}>
            <span class="category-label">${it.desc}</span>${it.name}
          </button>
        `;
        }).join('')}
      </div>
      ${picked.map(id => {
        const it = items.find(x => x.id === id);
        if (it.isTable) return `<div class="finding"><span class="finding-tag">${it.name}</span>${romTableHtml()}</div>`;
        return `<div class="finding"><span class="finding-tag">${it.name}</span>${it.result}</div>`;
      }).join('')}
    </div>
  `;
}

function renderObjExamine() {
  const hasDifferential = typeof DIFFERENTIAL !== 'undefined' && DIFFERENTIAL.length > 0;
  const locked = state.objLocked;
  const categories = [
    { title: 'Safety and Gross Movement Screening', sub: 'Rule out non-musculoskeletal sources and assess gross movement patterns', items: SCREENING, picked: state.screeningPicked, limit: SCREEN_LIMIT, toggleFn: 'toggleScreening' },
    { title: 'Body Structure & Function Measurements', sub: 'Only impairments revealed here will be available to prioritize next', items: IMPSEARCH, picked: state.impairmentSearchPicked, limit: IMPSEARCH_LIMIT, toggleFn: 'toggleImpSearch' }
  ];
  if (hasDifferential) {
    categories.push({ title: 'Differential Diagnosis Assessments', sub: 'Differentiate between plausible sources of the presentation', items: DIFFERENTIAL, picked: state.differentialPicked, limit: DIFF_LIMIT, toggleFn: 'toggleDifferential' });
  }

  const lastCategory = categories[categories.length - 1];
  const continueDisabled = lastCategory.picked.length < lastCategory.limit;

  return `
    <div class="eyebrow">OBJECTIVE — EXAMINE</div>
    <h1 class="stage-title">Select Your Tests and Measures</h1>
    <p class="lede">Complete each section in order — screening first, then impairment measures, then differential assessments.${locked ? ' Your selections are locked in and shown read-only below.' : ' Once selected, an item is locked in — choose carefully.'}</p>
    ${categories.map((c, i) => {
      const unlocked = locked || i === 0 || categories[i - 1].picked.length >= categories[i - 1].limit;
      return renderObjCategory(String.fromCharCode(65 + i) + '. ' + c.title, c.sub, c.items, c.picked, c.limit, c.toggleFn, locked, unlocked, i === categories.length - 1);
    }).join('')}
    <button class="btn" ${continueDisabled ? 'disabled' : ''} onclick="state.objLocked = true; goTo(6);">Continue to Impairment Priority</button>
    <div class="note">${state.objLocked ? 'Your selections are locked in.' : "You won't be able to change your selections once you move on to the next page."}</div>
  `;
}
function toggleScreening(id) { toggleInArr(state.screeningPicked, id, SCREEN_LIMIT); render(); }
function toggleDifferential(id) { toggleInArr(state.differentialPicked, id, DIFF_LIMIT); render(); }
function toggleImpSearch(id) { toggleInArr(state.impairmentSearchPicked, id, IMPSEARCH_LIMIT); render(); }
function toggleInArr(arr, id, limit) {
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i,1);
  else if (arr.length < limit) arr.push(id);
}

function renderImpairments() {
  const revealed = revealedImpairmentIds();
  if (state.impairmentOrder.length === 0) state.impairmentOrder = [...revealed];
  else state.impairmentOrder = state.impairmentOrder.filter(id => revealed.includes(id)).concat(revealed.filter(id => !state.impairmentOrder.includes(id)));
  const maxRank = Math.min((typeof RANK_LIMIT !== 'undefined') ? RANK_LIMIT : 3, revealed.length);
  return `
    <div class="eyebrow">IMPAIRMENT PRIORITY</div>
    <h1 class="stage-title">Rank the Impairments You Found</h1>
    <p class="lede">Only impairments you revealed during the objective exam appear here. Drag to reorder — the top ${maxRank} will carry forward to treatment.</p>
    <ul class="imp-drag-list" id="impDragList">
      ${state.impairmentOrder.map((id, idx) => {
        const imp = IMPAIRMENTS[id];
        return `<li class="imp-drag-item" draggable="true" data-id="${id}">
          <span class="imp-rank">${idx < maxRank ? idx+1 : '—'}</span>
          <div><div class="imp-name">${imp.name}</div><div class="imp-desc">${imp.desc}</div></div>
        </li>`;
      }).join('')}
    </ul>
    <button class="btn" ${revealed.length === 0 ? 'disabled' : ''} onclick="confirmPriorities()">Continue to Treatment Selection</button>
  `;
}

function initDragList() {
  const list = document.getElementById('impDragList');
  if (!list) return;
  let dragEl = null;
  list.querySelectorAll('.imp-drag-item').forEach(item => {
    item.addEventListener('dragstart', () => { dragEl = item; item.classList.add('dragging'); });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); syncOrderFromDom(); render(); });
  });
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const after = [...list.querySelectorAll('.imp-drag-item:not(.dragging)')].find(el => e.clientY <= el.getBoundingClientRect().top + el.getBoundingClientRect().height/2);
    if (!dragEl) return;
    if (after) list.insertBefore(dragEl, after); else list.appendChild(dragEl);
  });
}
function syncOrderFromDom() {
  const list = document.getElementById('impDragList');
  if (!list) return;
  state.impairmentOrder = [...list.querySelectorAll('.imp-drag-item')].map(el => el.dataset.id);
}
function confirmPriorities() {
  const maxRank = Math.min((typeof RANK_LIMIT !== 'undefined') ? RANK_LIMIT : 3, state.impairmentOrder.length);
  state.topPriorities = state.impairmentOrder.slice(0, maxRank);
  goTo(7);
}

function slotsNeeded(rank) {
  const plan = (typeof SLOT_PLAN !== 'undefined') ? SLOT_PLAN : [2, 1];
  return plan[rank - 1] || 0;
}

function slotPlanSentence() {
  const plan = (typeof SLOT_PLAN !== 'undefined') ? SLOT_PLAN : [2, 1];
  const limit = (typeof RANK_LIMIT !== 'undefined') ? RANK_LIMIT : 3;
  const parts = [];
  for (let r = 1; r <= limit; r++) {
    const need = plan[r - 1] || 0;
    parts.push(need === 0
      ? `priority #${r} is not addressed this session`
      : `priority #${r} needs ${need} exercise${need > 1 ? 's' : ''}`);
  }
  return parts.join(', ') + '.';
}

function renderTreatment() {
  const priorities = state.topPriorities || [];
  return `
    <div class="eyebrow">TREATMENT — EXERCISE & DOSAGE</div>
    <h1 class="stage-title">Select Exercises and Prescribe Dosage</h1>
    <p class="lede">${slotPlanSentence()} For each slot, pick a listed option or write in your own.</p>
    ${priorities.map((impId, rankIdx) => {
      const rank = rankIdx + 1;
      const imp = IMPAIRMENTS[impId];
      const need = slotsNeeded(rank);
      if (need === 0) {
        return `<div class="impairment-block"><h3>Priority #${rank} — ${imp.name}</h3><div class="priority-tag">Not addressed this session.</div></div>`;
      }
      const options = EXERCISES[impId];
      const slots = state.exerciseSlots[impId] || [];
      const menuChosenIdxs = slots.filter(s => s.type === 'menu').map(s => s.idx);
      const committedOther = slots.find(s => s.type === 'other');
      const showInputRow = state.otherShown[impId] || !!committedOther;
      return `
        <div class="impairment-block">
          <h3>Priority #${rank} — ${imp.name}</h3>
          <div class="priority-tag">Select ${need} exercise${need>1?'s':''} total — from the list, written in, or a mix (${slots.length} / ${need} filled)</div>
          ${options.map((ex, idx) => `
            <div class="exercise-card ${menuChosenIdxs.includes(idx) ? 'selected' : ''}" onclick="toggleMenuExercise('${impId}', ${idx}, ${need})">
              <div><div class="exercise-name">${ex.name}</div><div class="exercise-detail">${ex.desc}</div></div>
            </div>
          `).join('')}
          <div class="slot-note">Don't see a fit? Write in your own exercise for one slot:</div>
          ${showInputRow ? `
            <div style="display:flex; gap:8px; align-items:center;">
              <input class="other-input" style="flex:1;" value="${committedOther ? committedOther.text : ''}" placeholder="Describe your exercise...">
              <button class="btn small" onclick="commitOtherExercise('${impId}', this.previousElementSibling.value, ${need})">${committedOther ? 'Update' : 'Set'}</button>
              ${committedOther ? `<button class="btn small secondary" onclick="removeOtherExercise('${impId}')">Remove</button>` : `<button class="btn small secondary" onclick="cancelOtherExercise('${impId}')">Cancel</button>`}
            </div>
            ${!committedOther ? `<div class="slot-note">Not counted as a slot until you click Set.</div>` : ''}
          ` : `<button class="btn small secondary" ${slots.length >= need ? 'disabled' : ''} onclick="addOtherExercise('${impId}')">+ Write in an exercise</button>`}
        </div>
      `;
    }).join('')}
    <div class="panel dim">
      <label style="font-weight:600; display:block; margin-bottom:10px;">Other interventions (manual therapy, modalities, etc.) — optional</label>
      <textarea id="otherIntInput" placeholder="Note anything else you'd include this session..." oninput="state.otherInterventions = this.value; saveProgress();">${state.otherInterventions}</textarea>
    </div>
    ${renderDosageBlocks(priorities)}
    <button class="btn" id="completeCaseBtn" ${!allSlotsFilledAndDosed(priorities) ? 'disabled' : ''} onclick="completeTreatment()">Complete Case</button>
  `;
}

function toggleMenuExercise(impId, idx, need) {
  const slots = state.exerciseSlots[impId] || [];
  const existingIdx = slots.findIndex(s => s.type === 'menu' && s.idx === idx);
  if (existingIdx >= 0) { slots.splice(existingIdx, 1); }
  else if (slots.length < need) { slots.push({ type:'menu', idx }); }
  state.exerciseSlots[impId] = slots;
  render();
}
function addOtherExercise(impId) {
  state.otherShown[impId] = true;
  render();
}
function cancelOtherExercise(impId) {
  state.otherShown[impId] = false;
  render();
}
function commitOtherExercise(impId, text, need) {
  const trimmed = (text || '').trim();
  if (!trimmed) return;
  const slots = state.exerciseSlots[impId] || [];
  const existing = slots.find(s => s.type === 'other');
  if (existing) {
    existing.text = trimmed;
  } else if (slots.length < need) {
    slots.push({ type:'other', text: trimmed });
  } else {
    return; // no room — shouldn't normally happen since the button is only shown when a slot is open
  }
  state.exerciseSlots[impId] = slots;
  state.otherShown[impId] = true;
  render();
}
function removeOtherExercise(impId) {
  state.exerciseSlots[impId] = (state.exerciseSlots[impId] || []).filter(s => s.type !== 'other');
  state.otherShown[impId] = false;
  render();
}

function slotLabel(impId, slot) {
  if (slot.type === 'menu') return EXERCISES[impId][slot.idx].name;
  return slot.text || '(write-in exercise — not yet named)';
}

function getSlotDosageType(impId, slot, key) {
  if (slot.type === 'other') {
    return (state.dosage[key] && state.dosage[key].dosageType) || 'resistance';
  }
  const ex = EXERCISES[impId][slot.idx];
  return ex.dosageType || 'resistance';
}

function renderDosageBlocks(priorities) {
  const filled = priorities.filter(id => (state.exerciseSlots[id]||[]).length > 0);
  if (filled.length === 0) return '';
  return `
    <div class="eyebrow" style="margin-top:8px;">DOSAGE & RATIONALE</div>
    ${filled.map(impId => (state.exerciseSlots[impId]||[]).map((slot, slotIdx) => {
      const key = impId + '_' + slotIdx;
      const d = state.dosage[key] || {};
      const isWriteIn = slot.type === 'other';
      const dosageType = getSlotDosageType(impId, slot, key);
      const isHold = dosageType === 'hold';

      const typeSelector = isWriteIn ? `
        <div class="dosage-field">
          <label>Exercise type</label>
          <select id="dosagetype_${key}" onchange="saveDosageField('${key}','dosageType',this.value); render();">
            <option value="resistance" ${!isHold ? 'selected' : ''}>Resistance / strengthening</option>
            <option value="hold" ${isHold ? 'selected' : ''}>Stretch / hold-based</option>
          </select>
        </div>
      ` : '';

      const doseFields = isHold ? `
        <div class="dosage-field"><label>Sets</label><input type="number" id="sets_${key}" min="1" value="${d.sets||''}" style="width:70px;" oninput="saveDosageField('${key}','sets',this.value)"></div>
        <div class="dosage-field"><label>Hold Time</label><input type="number" id="holdtime_${key}" min="1" value="${d.holdtime||''}" style="width:70px;" oninput="saveDosageField('${key}','holdtime',this.value)"></div>
        <div class="dosage-field"><label>Unit</label>
          <select id="holdunit_${key}" onchange="saveDosageField('${key}','holdunit',this.value)">
            <option ${(d.holdunit==='sec'||!d.holdunit)?'selected':''}>sec</option>
            <option ${d.holdunit==='min'?'selected':''}>min</option>
          </select>
        </div>
      ` : `
        <div class="dosage-field"><label>Sets</label><input type="number" id="sets_${key}" min="1" value="${d.sets||''}" style="width:70px;" oninput="saveDosageField('${key}','sets',this.value)"></div>
        <div class="dosage-field"><label>Reps</label><input type="number" id="reps_${key}" min="1" value="${d.reps||''}" style="width:70px;" oninput="saveDosageField('${key}','reps',this.value)"></div>
        <div class="dosage-field"><label>Load type</label>
          <select id="loadtype_${key}" onchange="saveDosageField('${key}','loadtype',this.value)">
            <option ${d.loadtype==='Absolute'?'selected':''}>Absolute</option>
            <option ${d.loadtype==='%1RM'?'selected':''}>%1RM</option>
            <option ${d.loadtype==='RIR'?'selected':''}>RIR</option>
            <option ${d.loadtype==='RPE'?'selected':''}>RPE</option>
          </select>
        </div>
        <div class="dosage-field"><label>Load value</label><input type="text" id="loadval_${key}" placeholder="e.g. 3 lb or RPE 6" value="${d.loadval||''}" style="width:120px;" oninput="saveDosageField('${key}','loadval',this.value)"></div>
      `;

      return `
        <div class="panel">
          <div style="font-weight:600; margin-bottom:2px;">${slotLabel(impId, slot)}</div>
          <div style="color:var(--ink-soft); font-size:13px; margin-bottom:12px;">Addressing: ${IMPAIRMENTS[impId].name}</div>
          <div class="dosage-row">
            ${typeSelector}
            ${doseFields}
          </div>
          <textarea id="rationale_${key}" placeholder="Why this exercise, at this dosage, for this patient right now?" oninput="saveDosageField('${key}','rationale',this.value)">${d.rationale||''}</textarea>
        </div>
      `;
    }).join('')).join('')}
  `;
}
function saveDosageField(key, field, value) {
  if (!state.dosage[key]) state.dosage[key] = {};
  state.dosage[key][field] = value;
  updateCompleteBtn();
  saveProgress();
}
function updateCompleteBtn() {
  const btn = document.getElementById('completeCaseBtn');
  if (!btn) return;
  btn.disabled = !allSlotsFilledAndDosed(state.topPriorities || []);
}

function allSlotsFilledAndDosed(priorities) {
  for (const impId of priorities) {
    const rank = priorities.indexOf(impId) + 1;
    const need = slotsNeeded(rank);
    const slots = state.exerciseSlots[impId] || [];
    if (slots.length !== need) return false;
    for (let i = 0; i < slots.length; i++) {
      const key = impId + '_' + i;
      const d = state.dosage[key];
      if (!d || !d.rationale || !d.sets) return false;
      const dosageType = getSlotDosageType(impId, slots[i], key);
      if (dosageType === 'hold') {
        if (!d.holdtime) return false;
      } else {
        if (!d.reps || !d.loadval) return false;
      }
    }
  }
  return true;
}

function completeTreatment() {
  const el = document.getElementById('otherIntInput');
  if (el) state.otherInterventions = el.value;
  goTo(8);
}

function tierFeedbackBlock(label, picked, items) {
  return `
    <div class="panel">
      <div style="font-weight:600; margin-bottom:8px;">${label}</div>
      ${picked.map(id => {
        const it = items.find(x => x.id === id);
        const label2 = it.name || it.q;
        return `<div class="feedback-item">${TIER_DOT[it.tier]}<span>${label2} — <em>${TIER_LABEL[it.tier]}</em></span></div>`;
      }).join('')}
    </div>
  `;
}

function renderSummary() {
  const priorities = state.topPriorities || [];
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return `
    <div class="cert-header">
      <div class="cert-eyebrow">CASE COMPLETION RECORD</div>
      <h1>${CASE_NUMBER}: ${CASE_TITLE}</h1>
      <div class="cert-meta-row">
        <div class="cert-meta-item">
          <div class="cert-meta-label">Group Members</div>
          <div class="cert-meta-value" id="certGroupNameLive">${state.groupName || '\u2014'}</div>
        </div>
        <div class="cert-meta-item">
          <div class="cert-meta-label">Date Completed</div>
          <div class="cert-meta-value">${today}</div>
        </div>
      </div>
    </div>

    <div class="cert-field">
      <div class="cert-field-label">Edit group members (updates the record above)</div>
      <input type="text" id="groupNameInputSummary" value="${state.groupName}" placeholder="Enter group member names" oninput="state.groupName = this.value; document.getElementById('certGroupNameLive').textContent = this.value || '\u2014'; saveProgress();">
    </div>

    <h1 class="stage-title" style="font-size:19px;">Subjective &amp; Objective — Choice Quality</h1>
    <p class="lede">Each item you selected is now revealed as green (strong), yellow (acceptable, not optimal), or red (not well advised).</p>
    ${tierFeedbackBlock('Subjective Questions', state.subjPicked, SUBJ_QUESTIONS)}
    ${tierFeedbackBlock('Safety and Gross Movement Screening', state.screeningPicked, SCREENING)}
    ${(typeof DIFFERENTIAL !== 'undefined' && DIFFERENTIAL.length > 0) ? tierFeedbackBlock('Differential Diagnosis Assessments', state.differentialPicked, DIFFERENTIAL) : ''}
    ${tierFeedbackBlock('Body Structure & Function Measurements', state.impairmentSearchPicked, IMPSEARCH)}

    <h1 class="stage-title" style="font-size:19px; margin-top:26px;">Impairment Prioritization</h1>
    <div class="panel">
      ${priorities.map((id, i) => {
        const imp = IMPAIRMENTS[id];
        const dot = imp.tier ? TIER_DOT[imp.tier] : '';
        const tierLabel = imp.tier ? ` — <em>${TIER_LABEL[imp.tier]}</em>` : '';
        return `<div class="feedback-item">${dot}<span><strong>Priority #${i+1}:</strong> ${imp.name}${tierLabel}</span></div>`;
      }).join('') || '<div class="summary-row"><span>No impairments prioritized</span><span>—</span></div>'}
    </div>
    <p class="lede">Tiers for your prioritized impairments are shown here for reference — we'll discuss the reasoning behind your ranking together in the debrief.</p>

    <h1 class="stage-title" style="font-size:19px; margin-top:26px;">Exercise Selection &amp; Dosage</h1>
    <div class="panel">
      ${priorities.filter(id => (state.exerciseSlots[id]||[]).length > 0).map(impId => (state.exerciseSlots[impId]||[]).map((slot, slotIdx) => {
        const key = impId + '_' + slotIdx;
        const d = state.dosage[key] || {};
        const tierInfo = slot.type === 'menu' ? `${TIER_DOT[EXERCISES[impId][slot.idx].tier]} <em>${TIER_LABEL[EXERCISES[impId][slot.idx].tier]}</em>` : '<em>Custom write-in — discuss in debrief</em>';
        const revealText = slot.type === 'menu' ? EXERCISES[impId][slot.idx].reveal : '';
        const dosageType = getSlotDosageType(impId, slot, key);
        const doseText = dosageType === 'hold'
          ? `${d.sets||'—'} sets × ${d.holdtime||'—'} ${d.holdunit||'sec'} hold`
          : `${d.sets||'—'} sets × ${d.reps||'—'} reps, ${d.loadtype||'—'} ${d.loadval||''}`;
        return `<div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid var(--line);">
          <div style="font-weight:600;">${slotLabel(impId, slot)}</div>
          <div style="font-size:13px; color:var(--ink-soft); margin-bottom:6px;">For: ${IMPAIRMENTS[impId].name} — ${tierInfo}</div>
          ${revealText ? `<div style="font-size:13.3px; margin-bottom:6px;">${revealText}</div>` : ''}
          <div style="font-size:13.5px;">Dosage: ${doseText}</div>
          <div style="font-size:13.5px; margin-top:4px; color:var(--ink-soft);">${d.rationale||''}</div>
        </div>`;
      }).join('')).join('') || '<div>No exercises selected.</div>'}
      ${state.otherInterventions ? `<div style="margin-top:10px;"><strong>Other interventions:</strong> ${state.otherInterventions}</div>` : ''}
    </div>
    <p class="lede">This section is not scored against a tier system — it's the main focus of our large-group debrief.</p>

    <div id="printBar">
      <button class="btn" onclick="clearSavedProgress(); window.print();">Download / Print Certificate</button>
      <button class="btn secondary" onclick="location.reload()">Restart Case</button>
    </div>
  `;
}

function saveAndGo(inputId, key, nextStage) { state[key] = document.getElementById(inputId).value; goTo(nextStage); }
function caseRefContentHtml() {
  const img = (typeof CASE_IMAGE !== 'undefined' && CASE_IMAGE)
    ? `<img src="${CASE_IMAGE}" alt="${(typeof CASE_IMAGE_ALT !== 'undefined' && CASE_IMAGE_ALT) || ''}" style="width:100%; margin-bottom:10px; display:block; border:1px solid var(--line);">`
    : '';
  const scene = (typeof CASE_SCENE !== 'undefined' && CASE_SCENE) ? `<p style="font-style:italic; font-size:12.5px; color:var(--ink-soft); margin:0 0 12px 0;">${CASE_SCENE}</p>` : '';
  const patientRows = (typeof PATIENT_INFO !== 'undefined' ? PATIENT_INFO : [])
    .map(p => `<p style="margin:0 0 8px 0; font-size:12.5px;"><strong>${p.label}:</strong> ${p.value}</p>`).join('');
  return `${img}${scene}<div>${patientRows}</div>`;
}

function ensureCaseRefSidebar() {
  if (document.getElementById('caseRefSidebar')) return;
  const appEl = document.querySelector('.app');
  if (!appEl) return;
  const aside = document.createElement('aside');
  aside.className = 'case-ref-sidebar';
  aside.id = 'caseRefSidebar';
  aside.innerHTML = `
    <div class="case-ref-header" onclick="toggleCaseRef()">
      <span class="case-ref-title-text">Case Reference</span>
      <span class="case-ref-chevron">&#9656;</span>
    </div>
    <div class="case-ref-body" id="caseRefBody">${caseRefContentHtml()}</div>
  `;
  appEl.appendChild(aside);
}
function toggleCaseRef() {
  const appEl = document.querySelector('.app');
  if (appEl) appEl.classList.toggle('ref-collapsed');
}
function updateCaseRefVisibility() {
  const appEl = document.querySelector('.app');
  if (!appEl) return;
  const showCaseRef = current >= 2; // hidden on Welcome (0) and Case Intro (1); shown from Subjective: Reflect onward
  appEl.classList.toggle('has-case-ref', showCaseRef);
}

function initShell() {
  document.getElementById('sidebarTitle').textContent = COURSE_TITLE;
  document.getElementById('sidebarCaseTitle').innerHTML = CASE_NUMBER + '<br>' + CASE_TITLE;
  document.querySelector('.author-credit').textContent = AUTHOR_CREDIT;
  document.title = CASE_NUMBER + ': ' + CASE_TITLE;
  ensureCaseRefSidebar();
}

function bootCase() {
  if (loadSavedProgress()) {
    renderResumePrompt();
  } else {
    initShell();
    render();
  }
}

const PASSWORD_STORAGE_KEY = 'casePasswordOK::' + CASE_NUMBER + '::' + CASE_TITLE;

function passwordGateRequired() {
  return typeof CASE_PASSWORD !== 'undefined' && CASE_PASSWORD;
}
function passwordAlreadyUnlocked() {
  try { return sessionStorage.getItem(PASSWORD_STORAGE_KEY) === 'ok'; } catch (e) { return false; }
}
function renderPasswordGate(showError) {
  document.title = CASE_NUMBER + ': Access Required';
  document.body.innerHTML = `
    <div style="max-width:420px; margin:80px auto; padding:0 20px;">
      <div class="eyebrow">${CASE_NUMBER}</div>
      <h1 class="stage-title">Enter Access Code</h1>
      <p class="lede">Ask your instructor for this session's access code.</p>
      <div class="panel">
        <input type="password" id="casePasswordInput" placeholder="Access code" style="font-size:15px; padding:10px 12px; width:100%; box-sizing:border-box; border:1px solid var(--line);" onkeydown="if(event.key==='Enter') attemptPasswordUnlock();">
        <button class="btn" style="margin-top:12px;" onclick="attemptPasswordUnlock()">Unlock</button>
        ${showError ? '<div class="note" style="color:var(--red); margin-top:10px;">Incorrect code — try again.</div>' : ''}
      </div>
    </div>
  `;
  document.getElementById('casePasswordInput').focus();
}
function attemptPasswordUnlock() {
  const val = document.getElementById('casePasswordInput').value;
  if (val === CASE_PASSWORD) {
    try { sessionStorage.setItem(PASSWORD_STORAGE_KEY, 'ok'); } catch (e) { /* ignore */ }
    document.body.innerHTML = `
      <div class="app">
        <nav class="sidebar">
          <div class="sidebar-title" id="sidebarTitle"></div>
          <div class="sidebar-case" id="sidebarCaseTitle"></div>
          <ul class="stage-list" id="stageList"></ul>
        </nav>
        <main class="main" id="main"></main>
      </div>
      <div class="author-credit"></div>
    `;
    bootCase();
  } else {
    renderPasswordGate(true);
  }
}

if (passwordGateRequired() && !passwordAlreadyUnlocked()) {
  renderPasswordGate(false);
} else {
  bootCase();
}
