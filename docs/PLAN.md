# PLAN: from the current GMAW HMI to the two-condition study app

This plan adapts the design docs in `docs/design/` to **this repo's existing architecture**:
- React (JavaScript) + Vite;
- MVC folders;
- `CellGateway`;
- SBAR alarms;
- BroadcastChannel wizard;
- a static site on GitHub Pages.

## 1 · What already exists vs what is new

| Requirement | Already in the repo | To add |
|---|---|---|
| MVC, modular | `models/`, `services/`, `controllers/`, `views/` | Keep it; move the Navbar's service call into a controller |
| Data from the cells via the AAS middleware | `CellGateway` contract + `MockCellGateway`; `appConfig.gateway` | Feed the mock from `src/data/` JSON; later an `AasCellGateway` |
| Simulated alarm database | `mock/scenarios.js` (3 SBAR templates) | `src/data/alarms/*.json` (18 alarms) + an alarm repository + a JSON→SBAR mapper |
| GMAW cell | Jigless GMAW cell 54, process tracker, dashboard | Map the new GMAW alarms onto its steps |
| WAAM cell | — | New cell: mount, hand-guided scan, edge marking, confirm regions, plan, layer build with interpass, final scan, NDT |
| Wizard-of-Oz | `#/wizard`: alarms, AI toasts, equipment, chat replies | Study session setup, trial schedule, scheduled alarm injection, colleague role-play, log export |
| Help | Help modal (colleagues), assistant dock (wizard-typed chat), colleagues in the navbar | Two versions; one help log; hints from the alarm JSON |
| AI transparency | Purple AI badge, AI-adjustment toasts, AI-SPECTO verdict | Decision cards for ML alarms incl. "AI was wrong" |
| Users | 17 px base, 48 px targets, lamp + text | The rest of docs/design/08 (language, memory, guided mode) |

## 2 · Open decisions (answer before milestone M1)

**D1 · DECIDED: (a) wizard-typed chatbot.**
- No real LLM and no API key. The "AI" in the chatbot build is the researcher typing in the `#/wizard` console, as the assistant dock does today.
- The wizard sends the **same resolution script** in both builds: as the AI in the chatbot build, as the named colleague in the colleagues build. Only the channel differs.
- Milestone M6 (LLM server) is **dropped**. `docs/design/12-help-chatbot.md` is background only.

**D2 · DECIDED: alarm resolution flow (section 2a).** The alarm window no longer shows the step-by-step fix. The fix reaches the participant only if they ask for help.

## 2a · Alarm resolution flow (both builds)

```
Cell halts → ALARM WINDOW
  Situation, background, data, AI assessment, error code (no recommendation steps)
  ┌──────────────────┬──────────────────┬──────────────────────────────────────────┐
  │ [I can fix it]   │ [False alarm]    │ [Ask AI]  (chatbot build)                │
  │                  │                  │ [Call Henk] (colleagues build: name of   │
  │                  │                  │  the matching colleague, see below)      │
  └────────┬─────────┴────────┬─────────┴───────────────┬──────────────────────────┘
           ▼                  ▼                         ▼
   FIX STEP + timer   FALSE-ALARM STEP           HELP STEP + timer
   [Problem solved]   "Why is this detection     chat panel / call panel opens;
   [Ask AI / Call …]  wrong?" (text, required)   the wizard sends the alarm's
           │          [Submit] → alarm closed    resolution_script step by step
           │                                     [Problem solved]
           ▼                                            │
   PROBLEM SOLVED ◄─────────────────────────────────────┘
   "Describe what you did to fix it." (text, required) [Submit] → alarm closed, cell can resume
```

**Rules**
- **Both "I can fix it" and the help button start the timer.** The timer keeps running if the participant switches from fixing to asking for help. It stops on Submit.
  - Visibility is configurable (`visible` / `logged_only`), because a visible countdown can stress older users.
  - It counts **up**, with no time limit, unless I set one.
- **From the fix step**, the participant can still ask for help at any time. From the help step they can press "Problem solved" at any time.
- **False alarm**: a required free-text box asks "Why is this detection wrong?". Large text box, voice input option, and quick chips to lower typing effort, e.g. "The scan looks fine", "I checked the part myself", "Light reflection". Then the alarm closes and the case is logged.
- **Problem solved**: a required free-text box asks "Describe what you did to fix it", with the same input aids. Then the alarm closes and the cell may resume.
- **Which colleague is named** on the help button (colleagues build): the first available colleague whose expertise matches the alarm's `help_content.who_knows`, from `src/data/people/colleagues.json`. The colleague avatars in the navbar stay available for free choice. Both routes are logged, and both get the same script.
- **The wizard console** shows the active alarm's `error_code` and `resolution_script` with:
  - "Send next step" and "Send all";
  - a typing indicator and a configurable reply delay;
  - free-text replies for follow-up questions.

  Messages appear as the AI (chatbot build) or as the named colleague (colleagues build).
- **Scoring** (never shown to the participant):
  - each alarm's `expected_response` and `false_alarm_is_correct`;
  - "False alarm" is the correct choice for the AI false alarms (GMAW-ML-01, WAAM-ML-02) and wrong for every other alarm.

**Logged per alarm**
- alarm id, variant, error code, onset time;
- first button chosen and its time;
- every switch (fix → help);
- help opened, script steps sent, colleague named or chosen;
- "Problem solved" or "False alarm" time;
- the free-text answers;
- total time, and whether the outcome was correct.

**D3 · "Two versions in two folders" in a single-page app.**
- *Recommendation:* one codebase with two condition folders:
  - `src/conditions/chatbot/`
  - `src/conditions/colleagues/`

  Each holds its config and its help component.
- Two build commands produce two sites: `npm run build:chatbot`, `npm run build:colleagues`.
- The Pages workflow publishes them at `/EngDesignCase1/chatbot/` and `/EngDesignCase1/colleagues/`.
- You maintain one app, with no copied code.

**D4 · Wizard on a second device.**
`BroadcastChannel` works only between tabs of the same browser. If the participant uses a tablet and you sit at a laptop, you need a small WebSocket relay. `wizardChannel.js` is already the single place to swap it in. It can live in the same `server/` as D1.

**D5 · Trial order.**
Fixed (none → welding → robot → ML, your plan) or Latin square after the baseline (recommended; see docs/design/10). Both are in `src/data/study/study-design.json`.

## 3 · Target structure (additions only)

```
src/
  data/                      JSON "database" (alarms, scenarios, people, study) – read through services only
  conditions/
    index.js                 picks the condition from import.meta.env.VITE_CONDITION
    chatbot/condition.js     { id: "A_chatbot", features: { assistantDock: true, colleagueAvatars: false }, ... }
    chatbot/HelpPanel.jsx    chat UI (wraps AssistantDock)
    colleagues/condition.js  { id: "B_colleagues", features: { assistantDock: false, colleagueAvatars: true }, ... }
    colleagues/HelpPanel.jsx colleague list + request sheet
  services/
    alarmRepository.js       loads + validates src/data/alarms, getVariant(process, domain, variant)
    alarmMapper.js           JSON alarm → existing SBAR template shape
    studyScheduler.js        8-trial schedule from study-design.json (participant n, block order, variants)
    studyLog.js              append-only event log (localStorage) + JSON/CSV export
  controllers/
    ConditionController.jsx  feature flags for views (useFeature("colleagueAvatars"))
    HelpController.jsx       one help log for both conditions
    StudyController.jsx      session, trial, schedule
  models/
    waamModel.js             WAAM cell state (layers, interpass) – or generalise cellModel by process steps from data
server/                      (only if D4) small Node WebSocket relay so the wizard console can run on a second device
```

## 4 · Milestone prompts (paste one at a time into Claude in VS Code)

**M0 · Read and check**
```
Read CLAUDE.md, README.md, docs/PLAN.md, docs/design/ and src/data/. Then read the whole src/ folder.
Do not change code. Give me: (1) a short map of the current code; (2) where each item in PLAN section 1 will plug in;
(3) anything in PLAN or the design docs that does not fit this code, with a proposal. I will also give you my answers to D1–D5.
```

**M1 · Two conditions from one codebase (D3)**
```
Implement src/conditions/ and ConditionController per docs/PLAN.md section 3:
- VITE_CONDITION selects the condition; npm scripts dev:chatbot, dev:colleagues, build:chatbot, build:colleagues, and build (builds both into dist/chatbot and dist/colleagues plus a small index page).
- In the chatbot build, hide colleague avatars everywhere. In the colleagues build, hide the assistant dock. Views ask useFeature(), never the env var.
- Update the Pages workflow and vite base path so both builds deploy.
- Move getColleaguesOnShift out of Navbar into a controller hook.
Do not change anything else.
```

**M2 · Alarm database through the gateway**
```
Add services/alarmRepository.js (load and validate src/data/alarms against alarm.schema.json with Ajv at start-up; a readable error on failure) and services/alarmMapper.js (JSON alarm → the SBAR template shape the SbarAlarmModal already uses; keep signals, AI decision and hints).
MockCellGateway injects alarms by id at their trigger (stage/step/offset; WAAM layer). The wizard console can pick any of the 18 alarms. Keep the old templates working until the new path is tested.
Rebuild the SbarAlarmModal flow exactly as docs/PLAN.md section 2a:
- show situation, background, data, AI assessment and error_code, with no recommendation steps;
- three buttons: I can fix it / False alarm / Ask AI or Call <colleague> (label from the condition and the matching colleague);
- a fix step and a help step with a count-up timer (visible or logged_only from config) that keeps running when switching from fix to help;
- a required "Why is this detection wrong?" text for False alarm and a required "Describe what you did to fix it" text for Problem solved, both with quick chips and optional voice input;
- the alarm closes and the cell resumes only after Submit.
Log every step listed in section 2a "Logged per alarm". Put the flow logic in a controller (AlarmFlowController) and the step rules in a model, with views only rendering.
```

**M3 · WAAM repair cell**
```
Add the WAAM repair cell from docs/design/03 (WAAM profile) and src/data/scenarios/waam-baseline.json:
mount guide, hand-guided scan with coverage %, edge-finder marking, confirm regions (deviation map, each region must be opened before confirming), build plan (AI proposal card with similar cases), layer-by-layer build with interpass temperature curve and wait, final scan vs CAD, NDT entry (method required; PT/MT surface-only warning).
Drive steps from data (no if-GMAW/if-WAAM in views); generalise PROCESS_STEPS per process. Add the cell to fixtures/shift so an operator can be assigned either cell.
```

**M4 · One help log, two help channels**
```
Add HelpController and services/studyLog.js. Every help interaction is logged (opened, channel, colleague or chat turns, timings, closed, resolution, "help considered").
Colleagues build: avatars from src/data/people/colleagues.json (availability, languages, expertise badges), ordered by availability, shared language and match with the active alarm's help_content.who_knows; request sheet (help / come to cell / quick message); the wizard plays the colleague.
Chatbot build: the assistant dock opens with the active alarm and its error code as context, plus quick-reply chips (what does it mean / what to check / what to do).
In both builds the wizard console shows the active alarm's error_code and resolution_script with "Send next step", "Send all", a typing indicator, a configurable reply delay and free text. Messages appear as the AI (chatbot build) or as the named colleague (colleagues build). The "Ask AI / Call <name>" button in the alarm flow opens this same channel.
```

**M5 · AI decision cards**
```
Show ai_decision from ML alarms as decision cards (docs/design/04): what, why (overlay / heatmap / similar cases), confidence, unfamiliar warning, "AI was wrong" / "Agree" buttons, logged. Baseline scenarios show correct AI decisions the same way.
```

**M6 · (dropped: D1 = a, no LLM server)**

**M7 · Study mode in the wizard console**
```
Extend #/wizard: session setup (participant code, persona group, language, condition = this build), the 8-trial schedule from studyScheduler (fixed or latin_square_after_baseline, variant rotation), start / next trial, trigger the scheduled alarm (highlighted when due) or an ad-hoc one (flagged), the resolution-script sender from M4 (as AI or as colleague), observation tags, and export of all logs as JSON and CSV. If D4 is chosen, swap wizardChannel to the WebSocket relay in server/.
```

**M8 · Questionnaires**
```
Likert questionnaire screens after each process block, items from JSON files I will supply (HUROX 7-point, METUX). Do not invent items; use placeholders. One item per screen, big labelled answer buttons, read-aloud, export with reverse-scored items recoded.
```

**M9 · Persona pass and pilot**
```
Run the docs/design/08 section 4 checklist on every participant screen in both builds; move all new UI text into per-language dictionaries (en, nl + placeholders); then run a full 8-trial simulated session per build and show me the exported log.
```

After each milestone: run it (`npm run dev:chatbot` / `npm run dev:colleagues`), check it, then commit and push from VS Code. Pushing to `main` redeploys GitHub Pages.
