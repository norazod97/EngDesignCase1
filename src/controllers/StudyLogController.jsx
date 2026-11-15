// CONTROLLER — writes the cell's events into the study log (services/studyLog.js).
//
// It has no screen. It listens to every event of the simulated cell and keeps
// the ones that matter for the analysis: assemblies, steps, alarms, operator
// actions, safety. The alarm flow and the chat write their own, more detailed
// events (see AlarmFlowController and AssistantController).
import { useEffect, useRef } from "react";
import { appendEvent } from "../services/studyLog.js";
import { useCell } from "./CellController.jsx";

/**
 * Turn one cell event into a study-log event, or null to skip it.
 * In: the event ({ type, payload }) and the cell state right after it.
 */
function toStudyEvent(event, state) {
  const p = event.payload ?? {};
  const step = state.steps[state.cycle.stepIndex];
  switch (event.type) {
    case "cycle/start":
      return { type: "assembly_start", assembly: p.jobs.map((j) => j.id).join(" ") };
    case "cycle/nextStep":
    case "cycle/operatorConfirm":
      return { type: "step_start", details: { step: step?.id, label: step?.label } };
    case "cycle/await":
      return { type: "waiting_for_operator", details: { step: step?.id } };
    case "cycle/jobScanned":
      return { type: "ai_scan_result", outcome: p.verdict };
    case "inspection/confirm":
      return { type: "ndt_result", outcome: p.operatorVerdict, text: p.comment };
    case "cycle/halt":
      return p.alarm.halts
        ? { type: "alarm_shown", alarmId: p.alarm.id, errorCode: p.alarm.errorCode, outcome: "halts_cell" }
        : { type: "quiet_alert_recorded", alarmId: p.alarm.id, errorCode: p.alarm.errorCode, outcome: "no_stop" };
    case "alarm/close":
      return { type: "alarm_closed", outcome: p.resolution, text: p.comment };
    case "cycle/resume":
      return { type: "cycle_resumed" };
    case "cycle/stop":
      return { type: "cycle_stopped_by_operator" };
    case "door/set":
      return { type: p.locked ? "door_locked" : "door_unlocked" };
    case "bin/set":
      return { type: p.inEnvelope ? "bin_ok" : "bin_out_of_reach" };
    case "equipment/set":
      return { type: "equipment_status", details: { id: p.id, status: p.status } };
    case "request/log":
      // Alarm-flow lines are logged in detail by AlarmFlowController; keep other requests (e.g. Help modal).
      return p.details?.alarmId && p.message?.startsWith("Alarm flow") ? null : { type: "request", text: p.message, details: p.details };
    default:
      return null; // telemetry, progress ticks: too many and not needed
  }
}

/** Mount once inside <CellController>. Renders nothing. */
export function StudyLogController({ children }) {
  const { gateway } = useCell();
  const lastReport = useRef(null); // last report event already logged

  useEffect(() => gateway.onEvent((event, state) => {
    // Assembly report: a recorded quiet event is now shown in the alarm window.
    const a = state.activeAlarm;
    if (a?.report && a.raisedAt !== lastReport.current) {
      lastReport.current = a.raisedAt;
      appendEvent("participant", { process: state.process, cellId: state.cellId, assembly: a.jobId, type: "report_event_shown", alarmId: a.id, errorCode: a.errorCode, details: a.report });
    }
    const e = toStudyEvent(event, state);
    if (!e) return;
    // Every event also says which cell and assembly it belongs to.
    appendEvent("participant", { process: state.process, cellId: state.cellId, assembly: state.cycle.currentJobId ?? undefined, ...e });
  }), [gateway]);

  return children;
}
