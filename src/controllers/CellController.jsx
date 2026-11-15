// CONTROLLER — exposes the cell model to views and turns UI intents into
// gateway commands. Views never import the gateway or the reducer directly.
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { createCellGateway } from "../services/gateway/index.js";
import { createWizardChannel } from "../services/wizardChannel.js";
import { CycleState, STOPPABLE_STATES } from "../models/cellModel.js";
import { JobStatus } from "../models/job.js";
import { useSession } from "./SessionController.jsx";

// One gateway per cell for the lifetime of the tab (survives sign-out and
// React StrictMode double-mounting).
const gateways = new Map();
export const wizardChannel = createWizardChannel();

function gatewayFor(cellId) {
  if (!gateways.has(cellId)) gateways.set(cellId, createCellGateway(cellId, wizardChannel));
  return gateways.get(cellId);
}

const CellContext = createContext(null);

export function CellController({ cellId, children }) {
  const gateway = gatewayFor(cellId);
  const state = useSyncExternalStore(gateway.subscribe, gateway.getSnapshot);
  const { operator } = useSession();
  const by = operator?.id;

  const actions = useMemo(() => ({
    lockDoor: (locked) => gateway.setDoorLocked(locked, by),
    start: (jobs, checklist) => gateway.startCycle(jobs, checklist, by),
    stop: () => gateway.stopCycle(by),
    resume: () => gateway.resumeCycle(by),
    confirmStep: () => gateway.confirmStep(by),
    closeAlarm: (resolution, { comment = "", stepsDone = [] } = {}) => gateway.closeAlarm({ resolution, comment, stepsDone, by }),
    skipBlockedJob: () => gateway.skipBlockedJob(by),
    confirmInspection: (jobId, operatorVerdict, comment) => gateway.confirmInspection({ jobId, operatorVerdict, comment, by }),
    log: (message, details) => gateway.logRequest(message, { by, ...details }),
  }), [gateway, by]);

  const value = useMemo(() => ({ state, actions, gateway }), [state, actions, gateway]);
  return <CellContext.Provider value={value}>{children}</CellContext.Provider>;
}

export function useCell() {
  const ctx = useContext(CellContext);
  if (!ctx) throw new Error("useCell must be used inside <CellController>");
  return ctx;
}

/** Derived, view-friendly values so views stay free of business logic. */
export function useCellSummary() {
  const { state } = useCell();
  const { jobs } = useSession();
  return useMemo(() => {
    const progress = Object.values(state.jobProgress);
    const finished = progress.filter((p) => [JobStatus.DONE, JobStatus.REJECTED].includes(p.status)).length;
    const { cycle } = state;
    const steps = state.steps; // the steps of this cell's process (GMAW or WAAM)
    const step = steps[cycle.stepIndex];
    const overall = cycle.currentJobId ? (cycle.stepIndex + cycle.stepProgress) / steps.length : 0;
    // Neutral name of the assembly in the cell (e.g. "Assembly 2 · Flange"), never its job id.
    const jobName = cycle.currentJobId ? state.jobs[cycle.currentJobId]?.name ?? cycle.currentJobId : null;
    const active = [...STOPPABLE_STATES, CycleState.STOPPED].includes(cycle.state);
    const canStop = STOPPABLE_STATES.includes(cycle.state);
    const waitingFor = cycle.state === CycleState.AWAITING_OPERATOR ? step?.id : null; // "ready" | "ndt"
    // The assembly waiting for its visual NDT (with the AI inspection result).
    const ndtItem = waitingFor === "ndt" ? { id: cycle.currentJobId, ...state.jobProgress[cycle.currentJobId], job: state.jobs[cycle.currentJobId] } : null;
    return { total: jobs.length, finished, steps, step, jobName, overall, active, canStop, waitingFor, ndtItem, cycle, process: state.process, cellName: state.name };
  }, [state, jobs]);
}

// Status words for the assembly list (short, plain language).
const ASSEMBLY_STATUS = { todo: "To do", active: "In progress", done: "Done" };

/**
 * The study assemblies of this cell, for the list on the dashboard.
 * Out: [{ id, name, status: "todo" | "active" | "done", statusText, isNext }].
 * Only the first assembly that is not done is "next", and only it can be started.
 * The list never says which assembly has an anomaly (study rule).
 */
export function useAssemblies() {
  const { state } = useCell();
  const { jobs } = useSession();
  return useMemo(() => {
    // 1. Work out the status of each assembly from the cell's progress.
    const rows = jobs.map((j) => {
      const progress = state.jobProgress[j.id]?.status;
      const status = [JobStatus.DONE, JobStatus.REJECTED].includes(progress) ? "done"
        : progress && progress !== JobStatus.QUEUED ? "active" : "todo";
      return { ...j, status, statusText: ASSEMBLY_STATUS[status] };
    });
    // 2. The cell can start a new assembly only when nothing is running.
    const cellFree = !STOPPABLE_STATES.includes(state.cycle.state) && state.cycle.state !== CycleState.STOPPED;
    // 3. Mark the first assembly that is still "to do" as the next one.
    const nextId = rows.find((r) => r.status === "todo")?.id;
    return rows.map((r) => ({ ...r, isNext: r.id === nextId, canStart: cellFree && r.id === nextId }));
  }, [state, jobs]);
}
