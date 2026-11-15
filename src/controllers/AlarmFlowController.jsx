// CONTROLLER — runs the alarm flow for the alarm window (docs/PLAN.md section 2).
//
// It connects three things:
//   - the rules in models/alarmFlow.js (which step comes next),
//   - the cell (useCell): the active alarm, closing it, writing to the log,
//   - the clock: a count-up timer that ticks every second.
// The view (views/modals/SbarAlarmModal.jsx) only shows what this hook returns.

import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_CONFIG } from "../config/appConfig.js";
import * as flowModel from "../models/alarmFlow.js";
import { useAssistant } from "./AssistantController.jsx";
import { useCell, wizardChannel } from "./CellController.jsx";

/**
 * Hook for the alarm window.
 * Out: { alarm, flow, seconds, timerVisible, helpChannel, choose, switchToHelp,
 *        markSolved, back, submit(text) }. alarm is null when there is no alarm.
 */
export function useAlarmFlow() {
  const { state, actions } = useCell();
  const { ask } = useAssistant();
  const alarm = state.activeAlarm;
  const [flow, setFlow] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // 1. A new alarm appears -> start a fresh flow. (raisedAt changes for every alarm.)
  useEffect(() => {
    setFlow(alarm ? flowModel.createFlow(alarm, Date.now()) : null);
  }, [alarm?.raisedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. While the timer runs, update "now" every second so the timer moves.
  const timerRunning = !!flow?.timerStartedAt;
  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // Small helper: write one line to the cell log (the wizard sees it live).
  const log = useCallback((message, details) => {
    actions.log(message, { alarmId: alarm?.id, errorCode: alarm?.errorCode, ...details });
  }, [actions, alarm]);

  // Tell the wizard console that help was opened, so the researcher can send the script.
  const announceHelp = useCallback(() => {
    wizardChannel.post({ type: "help-opened", alarmId: alarm?.id, errorCode: alarm?.errorCode, channel: APP_CONFIG.alarmFlow.helpChannel });
  }, [alarm]);

  // 3. The actions the view can call. Each one moves the flow and logs it.
  const choose = useCallback((choice) => {
    const t = Date.now();
    setNow(t);
    setFlow((f) => flowModel.choose(f, choice, t));
    log(`Alarm flow: chose "${choice}".`, { choice });
    if (choice === "help") {
      announceHelp();
      // First message in the chat, so the wizard knows which error this is about.
      ask(`I need help with error ${alarm?.errorCode ?? ""}: ${alarm?.title ?? ""}`.trim());
    }
  }, [log, announceHelp, ask, alarm]);

  const switchToHelp = useCallback(() => {
    setFlow((f) => flowModel.switchToHelp(f, Date.now()));
    log("Alarm flow: switched from fix to help.", { switch: "fix->help" });
    announceHelp();
    ask(`I tried to fix error ${alarm?.errorCode ?? ""}. Can you help me?`.trim());
  }, [log, announceHelp, ask, alarm]);

  const markSolved = useCallback(() => {
    setFlow((f) => flowModel.markSolved(f));
    log("Alarm flow: problem solved pressed.");
  }, [log]);

  const back = useCallback(() => setFlow((f) => flowModel.backToChoice(f)), []);

  /** Submit the required text. Returns { ok, reason }. Closes the alarm when ok. */
  const submit = useCallback((text) => {
    if (!flowModel.canSubmit(text)) return { ok: false, reason: "text" };
    const record = flowModel.flowRecord(flow, text, Date.now());
    // The full record goes into the cell log (exported later, PLAN T10).
    log(`Alarm flow done: ${record.outcome} after ${record.totalS} s.`, { record });
    actions.closeAlarm(record.outcome === "false_alarm" ? "dismissed" : "fixed", { comment: record.text });
    return { ok: true };
  }, [flow, log, actions]);

  const seconds = flow ? flowModel.elapsedSeconds(flow, now) : 0;

  return useMemo(() => ({
    alarm,
    flow,
    seconds,
    timerText: flowModel.formatTimer(seconds),
    timerVisible: APP_CONFIG.alarmFlow.timer === "visible",
    helpChannel: APP_CONFIG.alarmFlow.helpChannel,
    choose,
    switchToHelp,
    markSolved,
    back,
    submit,
  }), [alarm, flow, seconds, choose, switchToHelp, markSolved, back, submit]);
}
