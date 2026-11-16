# PLAN

## 1 · What the study needs (and nothing more)

Each participant does 8 assemblies (4 GMAW, 4 WAAM): no anomaly, welding-process anomaly, robot-programming anomaly, ML-defect-detection anomaly. Two builds of the same app:
- **chatbot build:** help = chat with the "AI" (the wizard typing). No colleague avatars.
- **colleagues build:** help = call a colleague (the wizard typing as them). No chatbot.

**Keep for the study:** login, dashboard with the assembly list and process steps, alarm window, help, wizard console, log export. (The Shift page is parked: login goes straight to the dashboard.)

**Login = cell** (demo accounts, client-side only):
| Login | Cell | Dashboard after login |
|---|---|---|
| `operator1` / `weld123` | Jigless **GMAW** cell (#52) | 4 GMAW assemblies |
| `operator2` / `weld456` | **WAAM** repair cell | 4 WAAM assemblies |

**Assembly list (dashboard, right after login)**
- 4 assemblies per cell, from `src/data/study/study-design.json` (`assemblies_per_process`): 1 without anomaly, 3 with one anomaly each (welding process, robot programming, ML defect detection).
- The list shows **neutral names only**, e.g. "Bracket" (the number is in the # column), with status To do / In progress / Done. It **never** says which assembly has an anomaly or what kind. Same look for all 4.
- Only the next assembly can be started. Done assemblies stay in the list with a tick.
- Which assembly gets which anomaly (and which variant) is decided by the study schedule and the wizard, not shown in the UI.

**The anomaly is a surprise.** It pops up during the process, never before:
- GMAW: between **Pick & align** (bin picking) and the **end of the weld path** (steps `load` … `weld`).
- WAAM: between **mount / scan** and the **end of the build** (`build`).
- Alarms outside this window must be moved into it (see T6b).

**Parked (hidden, not deleted):** Historian, Labeling, Account, AI-adjustment toasts, stock card. They come back after the study if needed.

**Decisions**
- D1: no LLM. The wizard types the AI replies.
- D2: the alarm flow in section 2.
- D3: one codebase, folder `src/conditions/` with `chatbot/` and `colleagues/`, two builds.
- D4: **DECIDED (16 Nov 2026): two devices.** `npm run study` starts `server/relay.mjs` on the lab laptop: it serves the built app and relays wizard messages over WebSocket (rooms per study version). `wizardChannel.js` uses BroadcastChannel and the relay at the same time, without duplicates; participant log events are copied to the wizard (`storeRemoteEvent`). Data stays on the lab network.
- D5: **DECIDED (15 Nov 2026): fixed trial order** within each cell: assembly 1 no anomaly, 2 welding process, 3 robot programming, 4 ML defect detection (`trial_order_within_block.mode = "fixed"` in `src/data/study/study-design.json`). Cell order (GMAW first or WAAM first) alternates by participant number; the alarm variant rotates by participant number.
- Cycle states: only **idle / running / halted**, with a short reason.
- GMAW has 7 steps: Pick & align → Find the seam → Dry run → Ready to weld (operator) → Weld → AI inspection → Visual NDT (operator). Step ids match `trigger.step` in the alarm files.

## 2 · Alarm flow (both builds)

```
Cell halts → ALARM WINDOW: what happened, data, AI assessment, error code (no fix steps)
   [I can fix it]        [False alarm]                 [Ask AI] or [Call <name>]
        │                     │                               │
   FIX STEP + timer      "Why is this detection        HELP STEP + timer
   [Problem solved]       wrong?" (text, required)     wizard sends the resolution_script
   [Ask AI / Call …]      [Submit] → alarm closed      [Problem solved]
        │                                                     │
        └──────────► "Describe what you did to fix it." (text, required)
                     [Submit] → alarm closed, cell can resume
```

- The timer counts up. It starts on "I can fix it" or help, keeps running when switching from fix to help, and stops on Submit. Setting: `visible` or `logged_only`.
- Text boxes are large, with quick chips (e.g. "The scan looks fine", "Light reflection") and optional voice input.
- `<name>` = the first available colleague whose expertise matches the alarm's `help_content.who_knows` (`src/data/people/colleagues.json`).
- Wizard console: shows `error_code` and `resolution_script`, with "Send next step", "Send all" and free text.
- Scoring (hidden): "False alarm" is correct only for GMAW-ML-01 and WAAM-ML-02.
- **Logged per alarm:** alarm id, error code, start time, first button + time, switches fix → help, help opened, script steps sent, colleague, Submit time, the texts typed, total time, correct or not.

## 2b · Non-disruptive alerts (example: GMAW-WP-02)

An alert with `stop_behaviour: "none"` does **not** halt the cell and does **not** open the alarm window.
- While the process runs, it is only **recorded as an event** (time, error code, signals). At most a small "1 event recorded" line in the status bar, no pop-up, no sound.
- When the assembly is **completed** (after Visual NDT), an **Assembly report** opens. It lists every recorded event in plain words: what happened, when (e.g. "12–19 s into the weld"), and the signals.
- Each event in the report has the same three buttons as section 2: **I can fix it / False alarm / Ask AI or Call <name>**, with the same timer, required texts and logging. So the data stays comparable with halting alarms.
- The participant closes the report with "Assembly done" only after every event has been handled.
- Logged: event time, report opened, time until each event is handled, the button chosen, and the texts.

*Study note:* GMAW-WP-02 is variant 2 of the welding-process anomaly. Participants who get variant 2 meet it in the report, not as a pop-up. Keep this in mind in the analysis, or make all three variants of one type behave the same way.

## 3 · Tasks (one at a time; plan first; test; commit)

**Done on 15 Nov 2026:** T1, T1b, T6 (without Ajv schema check), T7, T8, T9, T11 (AI channel only). Also: every alarm has a neutral `operator_title` shown to participants (`title` is the researcher's label and may give the answer away).
Also done (UI polish): T3 (colleagues via a controller hook), colleague photos with green/red status dots, assembly table with weld ID / CAD / WPS, WPS wire and gas in the start checklist, connection plugs, duty cycle chart, cell numbers GMAW #52 and WAAM #21.
**Done on 15 Nov 2026 (evening):** T10 study log + export (`services/studyLog.js`, `controllers/StudyLogController.jsx`; wizard card "Study session · log" with participant code, Export CSV / JSON, Clear log; column `falseAlarmCorrect` scores each alarm flow).
**Done on 15 Nov 2026 (night):** T4 + T12 two study versions. `src/conditions/` (chatbot, colleagues), `useCondition` / `useFeature`, `HelpController` (one logged help channel: help_opened, help_colleague_chosen, help_closed with "considered_only"), shared `HelpChat` / `ColleaguePicker`, colleague help panel. Alarm button: chatbot "Ask AI"; colleagues "Call <name>" = first AVAILABLE colleague whose expertise matches the alarm, otherwise "Call a colleague" with a list (busy colleagues can still be chosen). Old HelpModal and Messages panel are parked.
**Done:** T5 publish both versions. `npm run build` runs `scripts/build-all.mjs`: dist/chatbot, dist/colleagues and a start page dist/index.html. Each version has its own wizard channel, and every log event has a `version` column.
**Done:** T13 trial schedule (`services/studyScheduler.js`; wizard card "Trial schedule": from the participant code it shows variant, cell order and the planned alarm per assembly, highlights it red "DUE NOW" at its trigger step, and logs fired alarms as planned or off-script).
**Done:** T6b. The three GMAW ML alarms are now in-weld AI monitoring (seam camera + arc signals) at step `weld` and halt the cell; GMAW-ML-01 is still the false alarm. GMAW-WP-02 fires at `weld` +12 s and stays non-halting. All 18 alarms are inside the surprise window and pass the schema.
**Done (16 Nov 2026):**
- **T9b** quiet alerts: alerts with `stop_behaviour: "none"` are only recorded (status bar: "1 event recorded"); after the NDT they open one by one as "Assembly report · event n of m" with the same 3-button flow. Log: `quiet_alert_recorded`, `report_event_shown`, `alarm_flow_done` with `report: true`.
- **T14 + T15** WAAM repair: steps mount (operator), scan (coverage %), mark edges (operator, AI alignment card), find damage (operator: open every area on the deviation map before confirming), AI build plan, start build (operator), layer-by-layer build with part temperature curve ("Cooling before layer n" = still running), final scan, NDT with required method (VT/PT/MT/UT/RT; PT/MT surface-only warning). Data: `src/data/scenarios/waam-baseline.json` via `services/scenarioRepository.js`.
- **T17** persona check: all participant targets ≥ 48 px, smallest text ~15 px, one primary action per screen, every alarm sentence ≤ 12 words. Gaps: only English; no virtual light tower.
- **T17** pilots: P01 chatbot and P02 colleagues, 8 assemblies each, logs exported (175 and 195 rows). Finding: an alarm due at an operator step could be missed by a fast participant. Fix: the wizard now **arms** the planned alarm when each assembly starts ("Auto-fire planned alarm", on by default) and the cell fires it by itself at its step.

**Done:** cell camera. `src/data/cameras/camera-views.json` maps a muted clip (public/videos/<process>/<step>.mp4 + poster .jpg) to each step; `CameraFeed` plays it while running and freezes it when stopped. GMAW: all 7 steps (5 clips + stills for Ready to weld and Visual NDT). WAAM: Scan only; the WAAM demonstrator has no usable clean footage for the other steps (people, overlays, blurry montage) - ask the R&D centre for raw clips. Source: COROB demonstrator videos, R&D centre consent obtained. Clips must stay neutral (never show the anomaly before the alarm).

**Open:** T0 comments for older files, T2 (three cycle states), T2b (style check); translations (nl, …); virtual light tower.
**Done:** counterbalancing. Version: odd P = chatbot, even P = colleagues. Cell order changes every two participants (P1-P2 GMAW first, P3-P4 WAAM first, ...). Variant rotates 1-2-3. P1-P12 cover all 12 combinations once. The wizard shows each participant's version and warns when the wrong version is open.

**Order to finish the study app** (most important first):
1. ~~T10 study log + export~~ (done).
2. ~~T4 + T12 two versions~~ and ~~T5 publish both~~ (done).
3. ~~T13 participant code + trial schedule~~ (done).
4. ~~T6b + T9b~~ (done).
5. ~~T14 + T15 WAAM steps and screens~~ (done).
6. ~~T17 persona check + pilots~~ (done).
*On hold (researcher's decision, 15 Nov 2026):* **T16** questionnaires (HUROX, METUX). Do not build or plan for it until asked.
Optional any time: T0 comments, T2 three cycle states, T2b style check.

Paste a task into a **new chat** in Claude in VS Code. Each task starts with:
`Read CLAUDE.md and docs/PLAN.md. Do task Tn. Read only the files named. Plan first, wait for my OK.`

| # | Task | Files to read |
|---|---|---|
| T0 | **Comment the existing code** for a beginner (CLAUDE.md rules). Comments only, no code changes. One folder per chat: `models/`, then `services/`, then `controllers/`, then `views/`. | the folder of that chat |
| T1 | **Park unused pages.** Hide Historian, Labeling, Account and Shift from the menu and routes; after login go straight to the dashboard. Hide the stock card and AI-adjustment toasts. Don't delete the code: leave a `// parked` comment. | `src/App.jsx`, `src/views/layout/SideMenu.jsx`, `src/views/pages/LoginPage.jsx`, `src/views/pages/DashboardPage.jsx` |
| T1b | **Login = cell, assembly list** (section 1). Accounts `operator1`/`weld123` → GMAW cell 52, `operator2`/`weld456` → WAAM cell (add the WAAM cell to `CELLS`, with placeholder steps until T14). Remove `jack`. The dashboard shows the 4 assemblies of that cell from `study-design.json`, with neutral names and To do / In progress / Done; only the next one can start. Load the study design through a service, not in the view. Update the README demo accounts. | `src/mock/fixtures.js`, `src/services/mesService.js`, `src/views/pages/DashboardPage.jsx`, `src/data/study/study-design.json` |
| T2 | **Three cycle states.** idle / running / halted (today there are 7). complete → idle with `lastResult: "complete"`. stopped → halted, `reason: "operator_stop"`. waiting → halted, `reason: "missing_docs"`. awaiting_operator → running with `note: "your_turn"` ("Your turn: press Weld" / "Your turn: check the weld"); this is normal work, not a problem. Show the reason or note as one short line next to the lamp. Keep the 7 GMAW steps (load … ndt) and `STOPPABLE_STATES`. Start only from idle; resume only from halted when the cause is cleared. | `src/models/cellModel.js`, then each file that uses `CycleState` |
| T2b | **Style check.** Compare our primitives with `docs/STYLE.md`. Make main buttons 64 px and status text 24 px. Add a display-only `SafetyIndicator` (e-stop, light curtain, scanner) and show it in the status bar. | `docs/STYLE.md`, `src/views/components/primitives.jsx`, `src/views/theme/tokens.css`, `src/views/layout/StatusBar.jsx` |
| T3 | **Navbar fix.** Move `getColleaguesOnShift` out of `Navbar.jsx` into a controller hook. | `src/views/layout/Navbar.jsx`, `src/controllers/` |
| T4 | **Two builds.** `src/conditions/` with a chatbot and a colleagues config, and `useFeature()`. Scripts `dev:chatbot`, `dev:colleagues`. Chatbot build hides avatars; colleagues build hides the assistant dock. | `src/views/layout/Navbar.jsx`, `AssistantDock.jsx`, `package.json` |
| T5 | **Publish both builds** on Pages at `/chatbot/` and `/colleagues/`. | `vite.config.js`, `.github/workflows/` |
| T6 | **Alarm database.** `services/alarmRepository.js` loads `src/data/alarms/*.json`. `services/alarmMapper.js` turns them into the shape the alarm window uses. The wizard can pick any of the 18 alarms. Keep the old alarms working. | `src/data/alarms/`, `src/mock/scenarios.js`, `MockCellGateway.js`, `WizardPage.jsx` |
| T6b | **Alarms only during the process** (section 1, "The anomaly is a surprise"). Move every alarm whose `trigger.step` is outside the window: GMAW-ML-01, GMAW-ML-02 (`post_scan`), GMAW-ML-03 (`ndt`) and GMAW-WP-02 (`review`) → step `weld`. Rewrite their text so it fits: the ML alarms become in-process monitoring (the AI watches the arc and seam during welding). The moved ML alarms must halt the cell, so the alarm window opens (`stop_behaviour` not "none"). GMAW-WP-02 stays non-disruptive (`stop_behaviour: "none"`, section 2b): set its trigger to step `weld`, about 12 s in, so it is recorded during the weld and shown in the assembly report. Keep GMAW-ML-01 a false alarm. Check all 18 still pass `alarm.schema.json`. | `src/data/alarms/gmaw-ml-defect-detection.json`, `gmaw-welding-process.json`, `alarm.schema.json` |
| T7 | **Alarm window, first screen.** Remove fix steps; show the error code; the three buttons from section 2 (buttons only lead to placeholder steps). | `src/views/modals/SbarAlarmModal.jsx` |
| T8 | **Fix and help steps with timer** (section 2). Logic in a controller `AlarmFlowController`, rules in a model. | `SbarAlarmModal.jsx`, `src/controllers/` |
| T9 | **Required texts** for False alarm and Problem solved, with quick chips. Alarm closes only after Submit. | `SbarAlarmModal.jsx`, `AlarmFlowController` |
| T9b | **Non-disruptive alerts + assembly report** (section 2b). Alerts with `stop_behaviour: "none"` are stored as events in the cell model, not shown as pop-ups. After Visual NDT an Assembly report lists them, each with the section 2 three-button flow (reuse the T7–T9 components). "Assembly done" only when all events are handled. | `src/models/cellModel.js`, `AlarmFlowController`, `src/views/pages/DashboardPage.jsx` |
| T10 | **Study log + export.** `services/studyLog.js` keeps events in localStorage; the wizard exports JSON and CSV. Log everything in section 2 "Logged per alarm". | `AlarmFlowController`, `WizardPage.jsx` |
| T11 | **Wizard script sender.** Wizard sees the active alarm's `error_code` and `resolution_script`, with "Send next step", "Send all", free text. Messages appear as AI or as the named colleague. | `WizardPage.jsx`, `AssistantController.jsx`, `wizardChannel.js` |
| T12 | **Colleagues help panel.** Avatars from `colleagues.json`; the "Call <name>" button opens the same channel as T11. Log every help request. | `Navbar.jsx`, `src/conditions/colleagues/` |
| T13 | **Participant code + trial order** in the wizard console: start trial, next trial, scheduled alarm highlighted. | `WizardPage.jsx`, `src/data/study/study-design.json` |
| T14 | **WAAM cell, part 1.** Process steps come from data per process (GMAW / WAAM), no if-GMAW in views. | `cellModel.js`, `src/data/scenarios/` |
| T15 | **WAAM cell, part 2.** WAAM screens: mount, scan, mark edges, confirm regions, plan, layer build (cooling = running), final scan, NDT. | `src/data/scenarios/waam-baseline.json`, `docs/background/03-cell-profiles.md` |
| T16 | **Questionnaires** (HUROX, METUX) from JSON files I will give you. Do not invent items. | — |
| T17 | **Persona check** of every participant screen, then one full test session per build. | `docs/background/08-human-centred-design.md` |

After each task: `npm run dev`, try it, commit in VS Code, then start a new chat for the next task.
