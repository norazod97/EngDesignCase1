# CLAUDE.md

**What this is:** a front-end prototype (React 19, JavaScript, Vite) for a Wizard-of-Oz lab study about welding-cell operators. The cells, AI and colleagues are simulated. The researcher drives events from the `#/wizard` tab. It is deployed as a static site on GitHub Pages. It never controls real equipment.

**How to work with me**
- I am not a programmer. Explain in plain words.
- Do **one task** from `docs/PLAN.md` section 3 at a time. Read **only** this file, the task, and the files the task names. Ask me before reading more.
- **Plan first:** list the files you will change, then wait for my OK.
- Change at most ~3 files per task. Do not rewrite or "improve" anything the task does not ask for.
- **Comment the code for a beginner.** I must understand every file I commit.
  - At the top of each file: 1–3 lines saying what the file does and which MVC layer it belongs to.
  - Above each function or component: what it does, what goes in, what comes out.
  - Above each block of lines (a few lines that do one job): one short comment saying what the block does and why.
  - Plain English, short sentences, no jargon without a short explanation.
  - When you change a file, add or update the comments in the parts you touch. Do not leave old comments that are no longer true.
- When done, tell me: what changed, how to test it (`npm run dev`, which page, what to click), and a commit message. I commit myself.
- Do not read `docs/background/` unless I ask. It is old design background and mentions another stack (TypeScript, Python, Docker, LLM): ignore that stack.

**Code structure (MVC, keep it)**
- `models/`: pure logic, no React. The cell state machine is `models/cellModel.js`.
- `services/`: data access. `services/gateway/MockCellGateway.js` simulates the cell. JSON data in `src/data/` is loaded only by services.
- `controllers/`: React providers and hooks. The only bridge between models/services and views.
- `views/`: show things only. No data loading, no business logic, no service imports.
- `conditions/`: the only place where the chatbot and colleagues builds differ. Views ask `useFeature(...)`.

**Rules that never change**
1. Keep the design system: follow `docs/STYLE.md` (HMI SYSTEMS look, built by us). Tokens in `views/theme/tokens.css`, lamp + text for every status, purple "AI" badge on AI content. Never add HMI SYSTEMS vendor files or fonts to the repo.
2. Users are older, migrant and casual workers: icon + short label, sentences of max ~12 words, buttons at least 48 px (64 px main actions), no fine dragging, cell state always visible. New text goes in a dictionary, not hard-coded.
3. The "AI" chatbot is me typing in the wizard console. **No LLM, no API key.**
4. Both builds get the same help content: the alarm's `resolution_script`, sent by the wizard.
5. Never show `ground_truth`, `expected_response` or `false_alarm_is_correct` to participants.
6. The alarm flow is fixed by `docs/PLAN.md` section 2. Do not change it without asking me.
7. Every help request is logged. Logs stay in the browser and are exported by the wizard. Participant codes only, no names.
8. The on-screen stop is a simulated stop. Never claim it is a safety device.
