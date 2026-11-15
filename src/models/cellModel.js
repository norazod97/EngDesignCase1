// MODEL — the cell's state and its rules, as a pure reducer.
//
// The reducer knows nothing about timers, React, or where events come from.
// The mock simulator (services/gateway/MockCellGateway) emits these events
// today; a future AAS/OPC UA gateway can emit the same ones from the real cell.

import { EquipmentStatus } from "./equipment.js";
import { EventCategory, logEntry } from "./historian.js";
import { JobStatus, missingDocs } from "./job.js";

export const CycleState = Object.freeze({
  IDLE: "idle", // nothing started yet
  RUNNING: "running",
  WAITING: "waiting", // blocked on something the operator must sort out (e.g. missing WPS)
  AWAITING_OPERATOR: "awaiting_operator", // at an operator step (press Weld, do the visual NDT)
  HALTED: "halted", // stopped by an alarm
  STOPPED: "stopped", // stopped by the operator (stop button)
  COMPLETE: "complete", // queue finished
});

// The steps of each process. Ids match the step keys used in src/data/alarms (trigger.step).
// Flags on a step:
//   operator: true -> the cell waits here until the operator acts.
//   arc: true      -> the arc is on (weld signals are shown).
//   scan: true     -> the AI inspection that ends with an OK / NOT OK result.
//   action         -> label of the button the operator presses at a "ready" step.
// "ready" and "ndt" are used by both processes, so the dashboard can treat them the same.
export const STEPS_BY_PROCESS = {
  GMAW: [
    { id: "load", label: "Pick & align", hint: "Robots 1 and 2 pick the parts and hold them together." },
    { id: "seam_scan", label: "Find the seam", hint: "The profilometer finds the seam." },
    { id: "dry_run", label: "Dry run", hint: "The torch follows the path without welding." },
    { id: "ready", label: "Ready to weld", hint: "Check the path, then press Weld.", operator: true, action: "Weld" },
    { id: "weld", label: "Weld", hint: "The welding robot follows the seam.", arc: true },
    { id: "post_scan", label: "AI inspection", hint: "The AI checks the bead.", scan: true },
    { id: "ndt", label: "Visual NDT", hint: "Look at the weld and record OK or NOT OK.", operator: true },
  ],
  // WAAM: placeholder steps until the full WAAM screens are built (PLAN task T14/T15).
  WAAM: [
    { id: "mount", label: "Mount part", hint: "The damaged part is clamped on the table." },
    { id: "scan", label: "Scan part", hint: "The scanner measures the part." },
    { id: "confirm_regions", label: "Find damage", hint: "The scan is compared with the CAD of the intact part." },
    { id: "params", label: "Plan build", hint: "The build path and layers are planned." },
    { id: "ready", label: "Ready to build", hint: "Check the plan, then press Build.", operator: true, action: "Build" },
    { id: "build", label: "Build layers", hint: "The robot adds metal layer by layer.", arc: true },
    { id: "final_scan", label: "Final scan", hint: "The AI compares the new shape with the CAD.", scan: true },
    { id: "ndt", label: "NDT check", hint: "Check the repaired area and record OK or NOT OK.", operator: true },
  ],
};

/** Steps for a process ("GMAW" or "WAAM"). Unknown process -> GMAW steps. */
export function stepsFor(process) {
  return STEPS_BY_PROCESS[process] ?? STEPS_BY_PROCESS.GMAW;
}

/** Cycle states in which the Stop button is available. */
export const STOPPABLE_STATES = [CycleState.RUNNING, CycleState.AWAITING_OPERATOR, CycleState.HALTED, CycleState.WAITING];

const MAX_LOG = 500;

export function createCellState(cell) {
  return {
    cellId: cell.id,
    area: cell.area,
    name: cell.name,
    process: cell.process, // "GMAW" or "WAAM"
    steps: stepsFor(cell.process), // the steps this cell goes through for each assembly
    equipment: cell.equipment.map((e) => ({ ...e, status: EquipmentStatus.IDLE })),
    door: { locked: false },
    bin: { inEnvelope: true },
    jobs: {}, // jobId -> job (copied from MES when a cycle starts)
    jobProgress: {}, // jobId -> { status, inspection }
    cycle: { state: CycleState.IDLE, queue: [], currentJobId: null, stepIndex: 0, stepProgress: 0, blocker: null },
    activeAlarm: null,
    telemetry: { voltage: 0, current: 0, wireFeed: 0, travelSpeed: 0, penetration: 0 },
    log: [],
  };
}

// ---- helpers --------------------------------------------------------------

function withLog(state, category, message, details) {
  const log = [logEntry(category, message, details), ...state.log].slice(0, MAX_LOG);
  return { ...state, log };
}

function setEquipment(state, fn) {
  return { ...state, equipment: state.equipment.map((e) => ({ ...e, status: fn(e) ?? e.status })) };
}

function setJob(state, jobId, patch) {
  const prev = state.jobProgress[jobId] ?? {};
  return { ...state, jobProgress: { ...state.jobProgress, [jobId]: { ...prev, ...patch } } };
}

const allRunning = (e) => (e.status === EquipmentStatus.DISCONNECTED ? undefined : EquipmentStatus.RUNNING);
const allIdle = (e) => (e.status === EquipmentStatus.DISCONNECTED ? undefined : EquipmentStatus.IDLE);

/** Load the next job in the queue, or finish. Blocks if its CAD/WPS are missing. */
function loadNextJob(state) {
  const [nextId, ...rest] = state.cycle.queue;
  if (!nextId) {
    const s = setEquipment({ ...state, cycle: { ...state.cycle, state: CycleState.COMPLETE, currentJobId: null, stepIndex: 0, stepProgress: 0 } }, allIdle);
    return withLog(s, EventCategory.PROCESS, "All selected assemblies are finished.");
  }
  const job = state.jobs[nextId];
  const missing = job ? missingDocs(job) : [];
  if (missing.length) {
    const s = setEquipment(
      { ...state, cycle: { ...state.cycle, state: CycleState.WAITING, blocker: { kind: "missingDocs", jobId: nextId, missing } } },
      allIdle,
    );
    return withLog(s, EventCategory.PROCESS, `Next assembly ${nextId} is missing ${missing.join(" and ")}. Cell is waiting.`, { jobId: nextId });
  }
  let s = { ...state, cycle: { ...state.cycle, state: CycleState.RUNNING, queue: rest, currentJobId: nextId, stepIndex: 0, stepProgress: 0, blocker: null } };
  s = setJob(s, nextId, { status: JobStatus.IN_PROGRESS, startedAt: new Date().toISOString() });
  s = setEquipment(s, allRunning);
  return withLog(s, EventCategory.PROCESS, `Started assembly ${nextId}.`, { jobId: nextId });
}

// ---- guards (used by the gateway before accepting a command) --------------

export function canStart(state) {
  if (!state.door.locked) return { ok: false, reason: "Lock the cell door first." };
  if (!state.bin.inEnvelope) return { ok: false, reason: "Move the parts bin back to its marked spot." };
  if (STOPPABLE_STATES.includes(state.cycle.state)) return { ok: false, reason: "A cycle is already active." };
  return { ok: true };
}

export function canResume(state) {
  if (!state.door.locked) return { ok: false, reason: "Lock the cell door before resuming." };
  if (!state.bin.inEnvelope) return { ok: false, reason: "Move the parts bin back to its marked spot." };
  if (state.activeAlarm?.halts) return { ok: false, reason: "Close the alarm first." };
  if (![CycleState.HALTED, CycleState.STOPPED].includes(state.cycle.state)) return { ok: false, reason: "Nothing to resume." };
  return { ok: true };
}

// ---- reducer --------------------------------------------------------------

export function cellReducer(state, event) {
  const p = event.payload ?? {};
  switch (event.type) {
    case "door/set":
      return withLog({ ...state, door: { locked: p.locked } }, EventCategory.SAFETY, p.locked ? "Cell door locked." : "Cell door unlocked.", { by: p.by });

    case "bin/set": {
      const s = { ...state, bin: { inEnvelope: p.inEnvelope } };
      return withLog(s, EventCategory.SAFETY, p.inEnvelope ? "Parts bin is back in position." : "Parts bin is outside the robots' reach.");
    }

    case "equipment/set": {
      const s = setEquipment(state, (e) => (e.id === p.id ? p.status : undefined));
      const name = state.equipment.find((e) => e.id === p.id)?.name ?? p.id;
      return withLog(s, EventCategory.PROCESS, `${name} is now ${p.status}.`, { equipmentId: p.id });
    }

    case "cycle/start": {
      const jobs = { ...state.jobs };
      p.jobs.forEach((j) => { jobs[j.id] = j; });
      let s = { ...state, jobs, cycle: { ...state.cycle, queue: p.jobs.map((j) => j.id), blocker: null } };
      p.jobs.forEach((j) => { s = setJob(s, j.id, { status: JobStatus.QUEUED }); });
      s = withLog(s, EventCategory.OPERATOR, `Cycle started for ${p.jobs.length} assembl${p.jobs.length === 1 ? "y" : "ies"}.`, { by: p.by, checklist: p.checklist });
      return loadNextJob(s);
    }

    case "cycle/progress":
      return { ...state, cycle: { ...state.cycle, stepProgress: p.progress } };

    case "cycle/nextStep": {
      const stepIndex = state.cycle.stepIndex + 1;
      const s = { ...state, cycle: { ...state.cycle, stepIndex, stepProgress: 0 } };
      return withLog(s, EventCategory.PROCESS, `${state.cycle.currentJobId}: ${state.steps[stepIndex]?.label ?? "step"} started.`);
    }

    case "cycle/await": {
      const s = setEquipment({ ...state, cycle: { ...state.cycle, state: CycleState.AWAITING_OPERATOR } }, allIdle);
      return withLog(s, EventCategory.PROCESS, `${state.cycle.currentJobId}: waiting for operator (${state.steps[state.cycle.stepIndex]?.label}).`);
    }

    case "cycle/operatorConfirm": {
      const stepIndex = state.cycle.stepIndex + 1;
      let s = { ...state, cycle: { ...state.cycle, state: CycleState.RUNNING, stepIndex, stepProgress: 0 } };
      s = setEquipment(s, allRunning);
      return withLog(s, EventCategory.OPERATOR, `${state.cycle.currentJobId}: operator confirmed "${state.steps[state.cycle.stepIndex]?.label}".`, { by: p.by });
    }

    case "cycle/jobScanned": {
      // AI inspection done: move to the Visual NDT step and wait for the operator.
      const jobId = state.cycle.currentJobId;
      let s = setJob(state, jobId, { status: JobStatus.AWAITING_REVIEW, inspection: { aiVerdict: p.verdict, findings: p.findings, scannedAt: new Date().toISOString() } });
      s = { ...s, cycle: { ...s.cycle, state: CycleState.AWAITING_OPERATOR, stepIndex: s.cycle.stepIndex + 1, stepProgress: 0 } };
      s = setEquipment(s, allIdle);
      return withLog(s, EventCategory.QUALITY, `AI inspection result for ${jobId}: ${p.verdict === "ok" ? "OK" : "NOT OK"}.`, { jobId, findings: p.findings });
    }

    case "cycle/halt": {
      const alarm = { ...p.alarm, raisedAt: new Date().toISOString(), jobId: state.cycle.currentJobId };
      let s = { ...state, activeAlarm: alarm };
      if (alarm.halts) {
        s = { ...s, cycle: { ...s.cycle, state: CycleState.HALTED } };
        s = setEquipment(s, (e) => (e.id === alarm.equipment ? EquipmentStatus.FAULT : allIdle(e)));
      }
      return withLog(s, EventCategory.ALARM, `${alarm.situation}${alarm.halts ? " — cycle halted" : ""}.`, { alarmId: alarm.id, confidence: alarm.assessment?.confidence });
    }

    case "alarm/close": {
      const alarm = state.activeAlarm;
      if (!alarm) return state;
      let s = { ...state, activeAlarm: null };
      s = setEquipment(s, (e) => (e.status === EquipmentStatus.FAULT ? EquipmentStatus.IDLE : undefined));
      const verb = { fixed: "checked and fixed", dismissed: "dismissed as not relevant", help: "handed over to support" }[p.resolution] ?? p.resolution;
      return withLog(s, EventCategory.OPERATOR, `Alarm "${alarm.situation}" ${verb}.`, { by: p.by, comment: p.comment, stepsDone: p.stepsDone, aiCause: alarm.assessment?.cause });
    }

    case "cycle/resume": {
      let s = { ...state, cycle: { ...state.cycle, state: CycleState.RUNNING } };
      s = setEquipment(s, allRunning);
      return withLog(s, EventCategory.OPERATOR, "Cycle resumed.", { by: p.by });
    }

    case "cycle/stop": {
      let s = { ...state, cycle: { ...state.cycle, state: CycleState.STOPPED } };
      s = setEquipment(s, allIdle);
      return withLog(s, EventCategory.SAFETY, "Cycle stopped by operator.", { by: p.by });
    }

    case "cycle/skipBlocked": {
      const blocked = state.cycle.blocker?.jobId;
      if (!blocked) return state;
      let s = { ...state, cycle: { ...state.cycle, queue: state.cycle.queue.filter((id) => id !== blocked), blocker: null } };
      s = setJob(s, blocked, { status: JobStatus.QUEUED, skipped: true });
      s = withLog(s, EventCategory.OPERATOR, `Skipped ${blocked} until documents arrive.`, { by: p.by });
      return loadNextJob(s);
    }

    case "job/docsAttached": {
      const job = state.jobs[p.jobId];
      if (!job) return state;
      const patched = { ...job, cad: job.cad ?? { file: `${p.jobId}.step` }, wps: job.wps ?? { file: `WPS-${p.jobId}.pdf`, hasNote: false } };
      let s = withLog({ ...state, jobs: { ...state.jobs, [p.jobId]: patched } }, EventCategory.REQUEST, `CAD/WPS for ${p.jobId} uploaded by supervisor.`);
      if (s.cycle.blocker?.jobId === p.jobId) {
        s = { ...s, cycle: { ...s.cycle, blocker: null } };
        s = loadNextJob(s);
      }
      return s;
    }

    case "telemetry":
      return { ...state, telemetry: { ...state.telemetry, ...p } };

    case "ai/adjust":
      return withLog(state, EventCategory.AI, p.message, { jobId: state.cycle.currentJobId, model: p.model ?? "trajectory-optimiser" });

    case "inspection/confirm": {
      const aiVerdict = state.jobProgress[p.jobId]?.inspection?.aiVerdict;
      const agree = p.operatorVerdict === aiVerdict;
      const finalStatus = p.operatorVerdict === "ok" ? JobStatus.DONE : JobStatus.REJECTED;
      let s = setJob(state, p.jobId, { status: finalStatus, review: { operatorVerdict: p.operatorVerdict, agreesWithAi: agree, comment: p.comment, by: p.by } });
      s = withLog(s, EventCategory.QUALITY, `${p.jobId}: visual NDT ${p.operatorVerdict === "ok" ? "OK" : "NOT OK"} (${agree ? "agrees" : "disagrees"} with AI).`, { by: p.by, comment: p.comment });
      // Visual NDT of the current assembly finishes it; the cell moves on.
      const atNdt = state.steps[state.cycle.stepIndex]?.id === "ndt";
      if (p.jobId === state.cycle.currentJobId && atNdt && state.cycle.state === CycleState.AWAITING_OPERATOR) s = loadNextJob(s);
      return s;
    }

    case "request/log":
      return withLog(state, EventCategory.REQUEST, p.message, p.details);

    default:
      return state;
  }
}
