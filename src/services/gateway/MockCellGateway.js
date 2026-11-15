// Simulated cell. Drives the pure cell model (models/cellModel.js) with timers
// and random-walk telemetry, and accepts Wizard-of-Oz commands so an
// experimenter can inject alarms and AI events during a lab session.

import { canResume, canStart, cellReducer, createCellState, CycleState, PROCESS_STEPS } from "../../models/cellModel.js";
import { ALARM_TEMPLATES, AI_ADJUSTMENTS } from "../../mock/scenarios.js";

const DEFAULT_STEP_SECONDS = { detect: 4, pick: 6, weld: 16, scan: 5 };
const TICK_MS = 500;

const jitter = (base, spread) => +(base + (Math.random() - 0.5) * spread).toFixed(1);

export class MockCellGateway {
  constructor({ cell, wizardChannel, stepSeconds = DEFAULT_STEP_SECONDS }) {
    this.state = createCellState(cell);
    this.stepSeconds = stepSeconds;
    this.speed = 1;
    this.nextVerdict = "ok";
    this.autoAi = true;
    this.listeners = new Set();
    this.eventListeners = new Set();
    this.wizard = wizardChannel;
    this.aiFiredForJob = null;

    this.timer = setInterval(() => this.#tick(), TICK_MS);
    this.unlistenWizard = this.wizard?.listen((msg) => {
      if (msg?.type === "cmd") this.#handleWizardCommand(msg.name, msg.args ?? {});
      if (msg?.type === "hello") this.#broadcast();
    });
  }

  dispose() {
    clearInterval(this.timer);
    this.unlistenWizard?.();
  }

  // ---- read side ---------------------------------------------------------
  getSnapshot = () => this.state;

  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  onEvent = (fn) => {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  };

  #emit(type, payload) {
    const event = { type, payload };
    this.state = cellReducer(this.state, event);
    this.listeners.forEach((fn) => fn());
    this.eventListeners.forEach((fn) => fn(event, this.state));
    if (type !== "telemetry" && type !== "cycle/progress") this.#broadcast();
  }

  #broadcast() {
    this.wizard?.post({ type: "state", state: this.state, sim: { speed: this.speed, nextVerdict: this.nextVerdict, autoAi: this.autoAi } });
  }

  // ---- operator commands -------------------------------------------------
  setDoorLocked = (locked, by) => {
    if (!locked && this.state.cycle.state === CycleState.RUNNING) {
      return { ok: false, reason: "Stop the cycle before unlocking the door." };
    }
    this.#emit("door/set", { locked, by });
    return { ok: true };
  };

  startCycle = (jobs, checklist, by) => {
    const check = canStart(this.state);
    if (!check.ok) return check;
    this.#emit("cycle/start", { jobs, checklist, by });
    return { ok: true };
  };

  stopCycle = (by) => {
    if (![CycleState.RUNNING, CycleState.HALTED, CycleState.WAITING].includes(this.state.cycle.state)) {
      return { ok: false, reason: "The cell is not running." };
    }
    this.#emit("cycle/stop", { by });
    return { ok: true };
  };

  resumeCycle = (by) => {
    const check = canResume(this.state);
    if (!check.ok) return check;
    this.#emit("cycle/resume", { by });
    return { ok: true };
  };

  closeAlarm = (details) => {
    this.#emit("alarm/close", details);
    return { ok: true };
  };

  skipBlockedJob = (by) => {
    this.#emit("cycle/skipBlocked", { by });
    return { ok: true };
  };

  confirmInspection = (details) => {
    this.#emit("inspection/confirm", details);
    return { ok: true };
  };

  logRequest = (message, details = {}) => {
    this.#emit("request/log", { message, details });
    return { ok: true };
  };

  // ---- simulation loop ---------------------------------------------------
  #tick() {
    const { cycle } = this.state;
    if (cycle.state !== CycleState.RUNNING) return;

    const step = PROCESS_STEPS[cycle.stepIndex];
    const progress = Math.min(1, cycle.stepProgress + (TICK_MS / 1000 / this.stepSeconds[step.id]) * this.speed);

    if (step.id === "weld") {
      this.#emit("telemetry", {
        voltage: jitter(24.5, 1.2), current: jitter(210, 12), wireFeed: jitter(8.0, 0.4),
        travelSpeed: jitter(6.0, 0.3), penetration: jitter(94, 4),
      });
      if (this.autoAi && progress >= 0.5 && this.aiFiredForJob !== cycle.currentJobId) {
        this.aiFiredForJob = cycle.currentJobId;
        this.#emit("ai/adjust", { message: AI_ADJUSTMENTS[Math.floor(Math.random() * AI_ADJUSTMENTS.length)] });
      }
    } else if (this.state.telemetry.current !== 0) {
      this.#emit("telemetry", { voltage: 0, current: 0, wireFeed: 0, travelSpeed: 0 });
    }

    if (progress < 1) {
      this.#emit("cycle/progress", { progress });
    } else if (cycle.stepIndex < PROCESS_STEPS.length - 1) {
      this.#emit("cycle/nextStep");
    } else {
      const verdict = this.nextVerdict;
      this.nextVerdict = "ok";
      this.#emit("cycle/jobScanned", {
        verdict,
        findings: verdict === "ok"
          ? [{ area: "Top bead", note: "Within tolerance (ISO 5817 level B)", confidence: 0.93 }]
          : [{ area: "Root side, 120–160 mm", note: "Possible lack of penetration", confidence: 0.71 }],
      });
    }
  }

  // ---- Wizard-of-Oz ------------------------------------------------------
  #handleWizardCommand(name, args) {
    switch (name) {
      case "alarm": {
        const t = ALARM_TEMPLATES[args.id];
        if (t) this.#emit("cycle/halt", { alarm: t });
        break;
      }
      case "aiAdjust":
        this.#emit("ai/adjust", { message: args.message || AI_ADJUSTMENTS[0] });
        break;
      case "bin":
        this.#emit("bin/set", { inEnvelope: !!args.inEnvelope });
        break;
      case "equipment":
        this.#emit("equipment/set", { id: args.id, status: args.status });
        break;
      case "docsAttached":
        this.#emit("job/docsAttached", { jobId: args.jobId });
        break;
      case "nextVerdict":
        this.nextVerdict = args.verdict === "nok" ? "nok" : "ok";
        this.#broadcast();
        break;
      case "speed":
        this.speed = Number(args.speed) || 1;
        this.#broadcast();
        break;
      case "autoAi":
        this.autoAi = !!args.on;
        this.#broadcast();
        break;
      default:
        break;
    }
  }
}
