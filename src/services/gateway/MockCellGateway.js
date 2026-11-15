// Simulated cell. Drives the pure cell model (models/cellModel.js) with timers
// and random-walk telemetry, and accepts Wizard-of-Oz commands so an
// experimenter can inject alarms and AI events during a lab session.

import { canResume, canStart, cellReducer, createCellState, CycleState, STOPPABLE_STATES } from "../../models/cellModel.js";
import { AI_ADJUSTMENTS } from "../../mock/scenarios.js";
import { getAlarm } from "../alarmRepository.js";
import { getWaamScenario } from "../scenarioRepository.js";

// How long each automatic step takes, in seconds (GMAW and WAAM step ids).
// Operator steps (ready, ndt) have no duration: the cell waits for the operator.
const DEFAULT_STEP_SECONDS = {
  load: 8, seam_scan: 5, dry_run: 8, weld: 16, post_scan: 5, // GMAW
  scan: 10, params: 6, build: 36, final_scan: 6, // WAAM (mount, mark, confirm_regions are operator steps)
};
const TICK_MS = 500;

const jitter = (base, spread) => +(base + (Math.random() - 0.5) * spread).toFixed(1);

export class MockCellGateway {
  constructor({ cell, wizardChannel, stepSeconds = DEFAULT_STEP_SECONDS }) {
    this.state = createCellState(cell);
    this.stepSeconds = stepSeconds;
    this.speed = 1;
    this.nextVerdict = "ok";
    this.autoAi = false; // AI-adjustment toasts are parked for the study (PLAN T1); the wizard can switch them on.
    this.listeners = new Set();
    this.eventListeners = new Set();
    this.wizard = wizardChannel;
    this.aiFiredForJob = null;
    // Armed planned alarm (wizard schedule): fires by itself when the cell reaches its step.
    this.armed = null; // { id, step, offset, since }

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
    this.wizard?.post({ type: "state", state: this.state, sim: { speed: this.speed, nextVerdict: this.nextVerdict, autoAi: this.autoAi, armed: this.armed?.id ?? null } });
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
    if (!STOPPABLE_STATES.includes(this.state.cycle.state)) {
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

  /**
   * Operator completes the current operator step: Weld / Start build at "ready",
   * or a WAAM preparation step (mount, mark edges, confirm areas). The NDT step
   * is finished by the inspection instead.
   */
  confirmStep = (by) => {
    const { cycle } = this.state;
    const step = this.state.steps[cycle.stepIndex];
    if (cycle.state !== CycleState.AWAITING_OPERATOR || !step?.operator || step.id === "ndt") return { ok: false, reason: "Nothing to confirm now." };
    // Only starting the arc needs a locked door; mounting and marking happen inside the cell.
    if (step.id === "ready" && !this.state.door.locked) return { ok: false, reason: "Lock the cell door first." };
    if (step.id === "ready" && !this.state.bin.inEnvelope) return { ok: false, reason: "Move the parts bin back to its marked spot." };
    this.#emit("cycle/operatorConfirm", { by });
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
  /**
   * Armed planned alarm: fire it when the assembly reaches the alarm's step.
   * Automatic steps: after the alarm's offset (seconds, at simulation speed).
   * Operator steps (the cell waits for the person): at once, so a fast
   * participant cannot slip past it.
   */
  #checkArmed() {
    const a = this.armed;
    if (!a) return;
    const { cycle } = this.state;
    const step = this.state.steps[cycle.stepIndex];
    const active = [CycleState.RUNNING, CycleState.AWAITING_OPERATOR].includes(cycle.state);
    if (!cycle.currentJobId || !active || this.state.activeAlarm || step?.id !== a.step) { a.since = null; return; }
    a.since ??= Date.now();
    const waited = ((Date.now() - a.since) / 1000) * this.speed;
    if (step.operator || waited >= (a.offset ?? 0)) {
      this.armed = null;
      const alarm = getAlarm(a.id);
      if (alarm) this.#emit("cycle/halt", { alarm });
    }
  }

  #tick() {
    this.#checkArmed();
    const { cycle } = this.state;
    if (cycle.state !== CycleState.RUNNING) return;

    const step = this.state.steps[cycle.stepIndex];
    if (step.operator) {
      this.#emit("cycle/await");
      return;
    }
    const progress = Math.min(1, cycle.stepProgress + (TICK_MS / 1000 / (this.stepSeconds[step.id] ?? 6)) * this.speed);

    // WAAM build: layer by layer, with the interpass temperature (PLAN T15).
    if (step.arc && this.state.process === "WAAM") {
      this.#emit("telemetry", this.#waamTelemetry(progress));
    } else if (step.arc) {
      // GMAW weld: send live weld signals.
      this.#emit("telemetry", {
        voltage: jitter(24.5, 1.2), current: jitter(210, 12), wireFeed: jitter(8.0, 0.4),
        travelSpeed: jitter(6.0, 0.3), penetration: jitter(94, 4),
      });
      if (this.autoAi && progress >= 0.5 && this.aiFiredForJob !== cycle.currentJobId) {
        this.aiFiredForJob = cycle.currentJobId;
        this.#emit("ai/adjust", { message: AI_ADJUSTMENTS[Math.floor(Math.random() * AI_ADJUSTMENTS.length)] });
      }
    } else if (this.state.telemetry.current !== 0) {
      this.#emit("telemetry", { voltage: 0, current: 0, wireFeed: 0, travelSpeed: 0, phase: null });
    }
    // WAAM scan: coverage grows with the step progress (up to the scenario value, e.g. 97 %).
    if (step.id === "scan") this.#emit("telemetry", { scanCoverage: Math.round(progress * 100 * (getWaamScenario().scanCoverage ?? 1)) });

    if (progress < 1) {
      this.#emit("cycle/progress", { progress });
    } else if (!step.scan) {
      this.#emit("cycle/nextStep");
    } else {
      const verdict = this.nextVerdict;
      this.nextVerdict = "ok";
      const waam = this.state.process === "WAAM";
      const final = waam ? getWaamScenario().finalScan : null;
      this.#emit("cycle/jobScanned", {
        verdict,
        findings: waam
          ? (verdict === "ok"
            ? [{ area: "Repair height", note: final?.what ?? "Height reached", confidence: final?.confidence_value ?? 0.9 }]
            : [{ area: "Repair area 1", note: "1.3 mm too low compared with the CAD", confidence: 0.74 }])
          : (verdict === "ok"
            ? [{ area: "Top bead", note: "Within tolerance (ISO 5817 level B)", confidence: 0.93 }]
            : [{ area: "Root side, 120–160 mm", note: "Possible lack of penetration", confidence: 0.71 }]),
      });
    }
  }

  /**
   * WAAM build signals for the current progress of the build step.
   * Each layer: 60 % adding metal (temperature rises), 40 % cooling (temperature falls).
   * Cooling between layers is normal work: the cell stays "running".
   */
  #waamTelemetry(progress) {
    const plan = getWaamScenario().layers;
    const total = plan.length || 6;
    const pos = Math.min(progress * total, total - 0.0001);
    const layer = Math.floor(pos) + 1;
    const frac = pos - (layer - 1);
    const adding = frac < 0.6;
    const base = plan[layer - 1]?.interpass_C ?? 150; // interpass temperature before this layer
    const peak = base + 60; // the part heats up while metal is added, then cools below the limit
    const interpassC = Math.round(adding ? base + (peak - base) * (frac / 0.6) : peak - (peak - base) * ((frac - 0.6) / 0.4));
    const history = [...(this.state.telemetry.tempHistory ?? []), interpassC].slice(-90);
    return {
      layer, layers: total, phase: adding ? "adding" : "cooling", interpassC, tempHistory: history,
      voltage: adding ? jitter(15.5, 0.8) : 0, current: adding ? jitter(160, 10) : 0,
      wireFeed: adding ? jitter(6.5, 0.3) : 0, travelSpeed: adding ? jitter(9, 0.4) : 0,
    };
  }

  // ---- Wizard-of-Oz ------------------------------------------------------
  #handleWizardCommand(name, args) {
    switch (name) {
      // The wizard triggers an alarm from the JSON alarm database by its id (e.g. "GMAW-RP-01").
      case "alarm": {
        const alarm = getAlarm(args.id);
        if (alarm) this.#emit("cycle/halt", { alarm });
        break;
      }
      // Wizard schedule: arm (or clear) the planned alarm of this assembly.
      case "arm":
        this.armed = args.id ? { id: args.id, step: args.step, offset: Number(args.offset) || 0, since: null } : null;
        this.#broadcast();
        break;
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
