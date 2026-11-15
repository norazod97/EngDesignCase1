# CLAUDE.md: standing instructions for this repo

## What this is
**COROB Weld Cell HMI**: a browser-based operator interface for multi-robot welding cells. It is a **front-end prototype for a Wizard-of-Oz lab study**:
- the cells, MES and AI services are simulated;
- an experimenter drives events from the `#/wizard` console tab;
- it never connects to or controls real equipment.

It is deployed as a static site on GitHub Pages.

**Where it is going** (see `docs/PLAN.md`):
1. Add a **WAAM repair cell** next to the existing jigless GMAW cell.
2. Build **two study versions** from this one codebase:
   - **chatbot**: LLM help chatbot, no colleague avatars;
   - **colleagues**: on-shift colleague avatars, no chatbot.
3. Drive anomalies from the **simulated alarm database** in `src/data/` (JSON), through the existing `CellGateway` (the stand-in for the AAS digital-twin middleware).
4. Each participant does 8 assemblies (4 GMAW, 4 WAAM): baseline, welding-process anomaly, robot-programming anomaly, ML-defect-detection anomaly.

## Read before any task
1. `README.md`: current architecture, design system, safety note.
2. `docs/PLAN.md`: **how the new requirements map onto this repo, open decisions, and the milestone prompts.**
3. `docs/design/`:
   - `08-human-centred-design.md`: **users and design rules; they override generic UI habits**;
   - `10-study-v2-two-conditions.md`: study design;
   - `12-help-chatbot.md`: chatbot behaviour;
   - `04-ai-transparency.md`: decision cards;
   - `09-wizard-of-oz-study.md`: logging, questionnaires, ethics;
   - `01`, `03`, `06` (background);
   - `05` (phase 2 only).
4. Data contracts: `src/data/alarms/alarm.schema.json`, `src/data/study/study-design.json`.

Where design docs and this repo disagree on **technology** (they mention TypeScript, shadcn/ui, FastAPI, SQLite), **this repo wins**. Keep the existing stack unless I approve a change.

## Architecture rules (existing MVC, keep it)
- **models/**: pure domain logic, no React, no I/O.
  - The cell state machine is `models/cellModel.js`.
  - New process logic (WAAM) goes into model code driven by data, not into views.
- **services/**: data access behind interfaces.
  - `services/gateway/CellGateway.js` is the contract; `MockCellGateway.js` is the simulator.
  - Alarms, scenarios and colleagues are loaded from `src/data/` by a service or repository, never imported directly into views.
  - A future `AasCellGateway` must be possible without touching controllers or views.
- **controllers/**: React context providers and hooks; the only bridge between models and views.
- **views/**: presentational components only. **No data loading, no business logic, no direct service imports in views.**
  - Exception to remove: `views/layout/Navbar.jsx` currently imports `getColleaguesOnShift` from a service. Move it into a controller hook.
- **conditions/** (new): the only place where the two study versions differ (see `docs/PLAN.md`). No `if (condition === ...)` scattered through views; components ask a controller for feature flags.
- **mock/**: SBAR alarm templates and fixtures. The new JSON alarm database replaces the hard-coded templates through a mapper, keeping the SBAR modal.

## Non-negotiable rules
1. **Keep the design system** in the README: HMI SYSTEMS-style primitives, tokens in `views/theme/tokens.css`, lamp + text for every status, purple "AI" badge on AI content, no vendor files or fonts.
2. **Users** (docs/design/08):
   - older workers, migrant workers with language barriers, casual workers;
   - no reliance on memory;
   - icon + short label;
   - sentences of max ~12 words;
   - 48 px minimum touch targets (64 px primary);
   - no fine dragging;
   - robot state always visible.
   - Prepare all text for translation: put strings in one dictionary per language, no hard-coded text in new components.
3. **Every AI or automated action is visible** (decision card or AI toast, purple AI badge). No silent automation.
4. **Help is always one tap away and always logged.**
   - Every help interaction is logged with timestamps: opened, channel, target colleague or chat turns, closed, resolution. It includes "help considered" (opened, then closed unused).
   - In the chatbot build, the colleague avatars are hidden. In the colleagues build, the assistant dock is hidden.
5. **Same help content in both builds.**
   - The "AI" chatbot is the wizard typing (Wizard-of-Oz, decision D1 = a); there is **no LLM and no API key**.
   - In both builds, the wizard sends the active alarm's `resolution_script` (plus free text): as the AI in the chatbot build, as the named colleague in the colleagues build.
   - Never show `ground_truth`, `expected_response` or `false_alarm_is_correct` to participants. They are for scoring only.
6. **The alarm flow is fixed by `docs/PLAN.md` section 2a:**
   - three buttons: I can fix it / False alarm / Ask AI or Call <name>;
   - a timer on the fix and help steps;
   - a required explanation for "False alarm" ("Why is this detection wrong?") and for "Problem solved" ("Describe what you did to fix it").

   Don't change this flow without asking me.
7. **Safety note stays true:** on-screen stop is only a simulated controlled stop.
8. **Study data:** logs are kept in the browser and exported by the wizard console as JSON/CSV. Participant codes only, no names.

## Working style
- I work in VS Code with Claude, and I commit to GitHub myself step by step. Pushing to `main` deploys to GitHub Pages.
- Work one milestone at a time from `docs/PLAN.md`. Start with a short plan (files to create or change) and wait for my OK.
- Do not rewrite working parts of the app unless the milestone requires it.
- After each milestone: what changed, how to try it (`npm run dev`, which pages), what is still a stub, and a suggested commit message.
- If something in the docs is unclear or conflicts with the repo, ask me.
