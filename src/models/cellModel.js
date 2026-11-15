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
  HALTED: "halted", // stopped by an alarm
  STOPPED: "stopped", // stopped by the operator (stop button)
  COMPLETE: "complete", // queue finished
});

export const PROCESS_STEPS = [
  { id: "detect", label: "Find parts", hint: "Cameras find the parts in the bin using the CAD model." },
  { id: "pick", label: "Pick & align", hint: "Robots 1 and 2 pick the parts and hold them together." },
  { id: "weld", label: "Weld", hint: "The welding robot follows the seam and adjusts in real time." },
  { id: "scan", label: "AI-SPECTO scan", hint: "The 3D scanner checks the bead against the CAD." },
];

const MAX_LOG = 500;

export function createCellState(cell) {
  return {
    cellId: cell.id,
    area: cell.area,
    name: cell.name,
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
  if ([CycleState.RUNNING, CycleState.HALTED, CycleState.WAITING].includes(state.cycle.state)) return { ok: false, reason: "A cycle is already active." };
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
      return withLog(s, EventCategory.PROCESS, `${state.cycle.currentJobId}: ${PROCESS_STEPS[stepIndex]?.label ?? "step"} started.`);
    }

    case "cycle/jobScanned": {
      const jobId = state.cycle.currentJobId;
      let s = setJob(state, jobId, { status: JobStatus.AWAITING_REVIEW, inspection: { aiVerdict: p.verdict, findings: p.findings, scannedAt: new Date().toISOString() } });
      s = withLog(s, EventCategory.QUALITY, `AI-SPECTO result for ${jobId}: ${p.verdict === "ok" ? "OK" : "NOT OK"}.`, { jobId, findings: p.findings });
      return loadNextJob(s);
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
      const s = setJob(state, p.jobId, { status: finalStatus, review: { operatorVerdict: p.operatorVerdict, agreesWithAi: agree, comment: p.comment, by: p.by } });
      return withLog(s, EventCategory.QUALITY, `${p.jobId}: operator says ${p.operatorVerdict === "ok" ? "OK" : "NOT OK"} (${agree ? "agrees" : "disagrees"} with AI).`, { by: p.by, comment: p.comment });
    }

    case "request/log":
      return withLog(state, EventCategory.REQUEST, p.message, p.details);

    default:
      return state;
  }
}
