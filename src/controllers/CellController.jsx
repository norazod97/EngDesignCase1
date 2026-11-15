// CONTROLLER — exposes the cell model to views and turns UI intents into
// gateway commands. Views never import the gateway or the reducer directly.
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { createCellGateway } from "../services/gateway/index.js";
import { createWizardChannel } from "../services/wizardChannel.js";
import { CycleState, PROCESS_STEPS, STOPPABLE_STATES } from "../models/cellModel.js";
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
    const step = PROCESS_STEPS[cycle.stepIndex];
    const overall = cycle.currentJobId ? (cycle.stepIndex + cycle.stepProgress) / PROCESS_STEPS.length : 0;
    const active = [...STOPPABLE_STATES, CycleState.STOPPED].includes(cycle.state);
    const canStop = STOPPABLE_STATES.includes(cycle.state);
    const waitingFor = cycle.state === CycleState.AWAITING_OPERATOR ? step?.id : null; // "ready" | "ndt"
    // The assembly waiting for its visual NDT (with the AI inspection result).
    const ndtItem = waitingFor === "ndt" ? { id: cycle.currentJobId, ...state.jobProgress[cycle.currentJobId], job: state.jobs[cycle.currentJobId] } : null;
    return { total: jobs.length, finished, step, overall, active, canStop, waitingFor, ndtItem, cycle };
  }, [state, jobs]);
}
