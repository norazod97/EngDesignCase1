/**
 * CellGateway — the contract between controllers and wherever cell data comes
 * from. Controllers only ever talk to this interface, so the mock simulator can
 * later be replaced by an adapter for the AAS digital twin / OPC UA / SCADA
 * without touching views or controllers.
 *
 * Read side
 *   getSnapshot(): CellState                 current state (see models/cellModel.js)
 *   subscribe(listener): () => void          called after every state change
 *   onEvent(listener): () => void            called with (event, nextState) — used for toasts
 *
 * Commands (each returns { ok: boolean, reason?: string })
 *   setDoorLocked(locked, by)
 *   startCycle(jobs, checklist, by)
 *   stopCycle(by)
 *   resumeCycle(by)
 *   confirmStep(by)                          operator completes an operator step (e.g. Weld)
 *   closeAlarm({ resolution, comment, stepsDone, by })
 *   skipBlockedJob(by)
 *   confirmInspection({ jobId, operatorVerdict, comment, by })
 *   logRequest(message, details)
 *
 * Real deployment note: door locking and stopping the cycle must also exist
 * as hard-wired, safety-rated controls on the cell. The browser can only
 * request a controlled stop; it can never be the safety function itself.
 */
export const GATEWAY_METHODS = [
  "getSnapshot", "subscribe", "onEvent",
  "setDoorLocked", "startCycle", "stopCycle", "resumeCycle", "confirmStep",
  "closeAlarm", "skipBlockedJob", "confirmInspection", "logRequest",
];

export function assertGateway(gateway) {
  const missing = GATEWAY_METHODS.filter((m) => typeof gateway[m] !== "function");
  if (missing.length) throw new Error(`Cell gateway is missing: ${missing.join(", ")}`);
  return gateway;
}
