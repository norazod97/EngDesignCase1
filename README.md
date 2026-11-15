# COROB Weld Cell — Operator HMI (simulation)

> **Next steps:** see [`docs/PLAN.md`](docs/PLAN.md) (study scope, alarm flow, task list) and [`CLAUDE.md`](CLAUDE.md) (instructions for Claude). Old design background is in [`docs/background/`](docs/background/), and the simulated alarm database is in [`src/data/`](src/data/).

Browser-based, mobile-responsive operator interface for a jigless GMAW multi-robot cell (use case UC1). It is a **front-end prototype for Wizard-of-Oz lab studies**: the cell, MES and AI services are simulated, and an experimenter drives events from a separate console tab. It does not connect to or control any equipment.

## Run

```
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
```

Demo accounts: `jack / weld123`, `operator2 / weld456` (client-side only — **not secure**).

## Wizard-of-Oz session

1. Open the app and sign in as the participant (e.g. `jack`).
2. In a **second tab of the same browser**, open `#/wizard` (e.g. `http://localhost:5173/#/wizard`).
3. From the console you can trigger SBAR alarms (halting or warning), send AI-adjustment toasts, move the parts bin out of reach, set equipment status, choose the next AI-SPECTO verdict, "upload" missing CAD/WPS, change simulation speed, and type the assistant's chat answers.

Tabs talk through `BroadcastChannel`, so both must be in the same browser profile. Each participant tab runs its own simulated cell. To run the console on a different device, replace `src/services/wizardChannel.js` with a WebSocket relay.

## Architecture (MVC)

```
src/
  models/        M — pure domain logic, no React
    cellModel.js     cell state machine (reducer) + guards: canStart, canResume
    job.js, equipment.js, historian.js
  services/      data access behind interfaces
    gateway/CellGateway.js       contract every cell adapter implements
    gateway/MockCellGateway.js   simulator (timers, telemetry, wizard commands)
    mesService.js                mock MES / identity (async, REST-ready)
    wizardChannel.js             Wizard-of-Oz transport
  controllers/   C — React context providers + hooks; the only bridge M ↔ V
    SessionController, CellController (+ useCellSummary),
    NotificationController, AssistantController
  views/         V — presentational components only
    components/  design-system primitives (Button, IconButton, Lamp, Checkbox, Switch, …)
    layout/      AppShell, Navbar, SideMenu, StatusBar, AssistantDock, Panels
    pages/       Login, Shift, Dashboard, Historian, Account, Labeling, Wizard
    widgets/     ProcessTracker, equipment / telemetry / stock / events cards
    modals/      SBAR alarm, prepare-cell stepper, inspection, WPS viewer
    theme/       tokens.css (design tokens) + app.css
  mock/          fixtures + scripted alarm scenarios (SBAR)
```

**Swapping in the real cell:** write e.g. `AasCellGateway` that implements the `CellGateway` contract and emits the same model events (`cycle/halt`, `telemetry`, `ai/adjust`, …), then set `gateway` in `src/config/appConfig.js`. Views and controllers do not change.

## Design system

The visual language follows [HMI SYSTEMS](https://docs.hmisystems.io/): light surfaces, `#1e1e1e` ink controls, `#ff7514` selection accent, square uppercase buttons, monospaced type, and red / blue / green / yellow lamps. The primitives in `views/components/primitives.jsx` mirror the HMI SYSTEMS property contracts (for example Lamp `type: error | active | positive | warning`, `value`, `labelText`).

HMI SYSTEMS ships WinCC Unified Custom Web Controls, not a React library, and its EULA forbids modifying, integrating or redistributing the controls. **No vendor files or fonts are included in this repo.** IBM Plex Mono / Sans stand in for DEF Mono. If the HMI is later built in WinCC Unified, each primitive maps one-to-one to the licensed control.

Adaptations for older operators: 17 px base size, 48 px minimum touch targets, orange used only as a fill behind dark text (never orange text on white), every status shown with lamp + text, and AI-generated content always marked with a purple "AI" badge.

## Safety note

The on-screen **Stop cycle** button requests a controlled stop in the simulation. In a real cell, emergency stop and door interlocks must be hard-wired, safety-rated devices (ISO 13850 / IEC 60204-1). A browser control can never replace them.

## GitHub Pages

`.github/workflows/deploy-pages.yml` builds and publishes `dist/` on every push to `main`. The app uses hash routing, so deep links work on Pages.
