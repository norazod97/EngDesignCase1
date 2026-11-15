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
import { appendEvent } from "../services/studyLog.js";
import { useCell } from "./CellController.jsx";
import { useHelp } from "./HelpController.jsx";

/**
 * Hook for the alarm window.
 * Out: { alarm, flow, seconds, timerVisible, helpChannel, choose, switchToHelp,
 *        markSolved, back, submit(text) }. alarm is null when there is no alarm.
 */
export function useAlarmFlow() {
  const { state, actions } = useCell();
  const help = useHelp(); // the help channel of this build: AI or a colleague
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

  // Write one event to the study log (kept for the analysis and exported by the wizard).
  const study = useCallback((type, fields = {}) => {
    appendEvent("participant", {
      type, process: state.process, cellId: state.cellId, assembly: alarm?.jobId ?? state.cycle.currentJobId ?? undefined,
      alarmId: alarm?.id, errorCode: alarm?.errorCode, ...fields,
    });
  }, [state, alarm]);

  // First chat message, so the wizard knows which error this is about.
  // Chatbot build: to the AI. Colleagues build: to the named colleague.
  const intro = useCallback((who, tried) => {
    const hello = who ? `Hi ${who.name}, ` : "";
    help.send(`${hello}${tried ? "I tried to fix" : "I need help with"} error ${alarm?.errorCode ?? ""}.${tried ? " Can you help me?" : ""}`.trim());
  }, [help, alarm]);

  // Open the help channel inside the alarm window. In the colleagues build the
  // suggested colleague is named; if nobody fits, the participant picks from a list.
  const startHelp = useCallback((tried) => {
    const who = help.isAi ? null : help.suggested;
    help.openHelp({ via: "alarm", who, showPanel: false });
    if (help.isAi || who) intro(who, tried);
  }, [help, intro]);

  /** Colleagues build, nobody suggested: the participant picks a colleague. */
  const pickColleague = useCallback((who) => {
    help.chooseColleague(who);
    intro(who, flow?.switches.length > 0);
  }, [help, intro, flow]);

  // 3. The actions the view can call. Each one moves the flow and logs it.
  const choose = useCallback((choice) => {
    const t = Date.now();
    setNow(t);
    setFlow((f) => flowModel.choose(f, choice, t));
    log(`Alarm flow: chose "${choice}".`, { choice });
    study("alarm_choice", { choice });
    if (choice === "help") startHelp(false);
  }, [log, study, startHelp]);

  const switchToHelp = useCallback(() => {
    setFlow((f) => flowModel.switchToHelp(f, Date.now()));
    log("Alarm flow: switched from fix to help.", { switch: "fix->help" });
    study("alarm_switch_to_help");
    startHelp(true);
  }, [log, study, startHelp]);

  const markSolved = useCallback(() => {
    setFlow((f) => flowModel.markSolved(f));
    log("Alarm flow: problem solved pressed.");
    study("alarm_problem_solved_pressed");
  }, [log, study]);

  const back = useCallback(() => setFlow((f) => flowModel.backToChoice(f)), []);

  /** Submit the required text. Returns { ok, reason }. Closes the alarm when ok. */
  const submit = useCallback((text) => {
    if (!flowModel.canSubmit(text)) return { ok: false, reason: "text" };
    const record = flowModel.flowRecord(flow, text, Date.now());
    // The full record goes into the cell log (exported later, PLAN T10).
    log(`Alarm flow done: ${record.outcome} after ${record.totalS} s.`, { record });
    // The full record, one row in the export (PLAN section 2 "Logged per alarm").
    study("alarm_flow_done", {
      choice: record.firstChoice, outcome: record.outcome, text: record.text,
      firstChoiceAfterS: record.firstChoiceAfterS, timerS: record.timerS, totalS: record.totalS,
      helpOpened: record.helpOpened, switches: record.switches.length, details: record,
    });
    if (record.helpOpened) help.closeHelp("problem_solved"); // ends the help session in the log
    actions.closeAlarm(record.outcome === "false_alarm" ? "dismissed" : "fixed", { comment: record.text });
    return { ok: true };
  }, [flow, log, study, actions, help]);

  const seconds = flow ? flowModel.elapsedSeconds(flow, now) : 0;

  return useMemo(() => ({
    alarm,
    flow,
    seconds,
    timerText: flowModel.formatTimer(seconds),
    timerVisible: APP_CONFIG.alarmFlow.timer === "visible",
    helpChannel: help.isAi ? "ai" : "colleague",
    suggested: help.suggested, // colleague named on "Call <name>" (colleagues build), or null
    colleagues: help.colleagues,
    persona: help.persona, // who answers in the chat
    pickColleague,
    sendMessage: help.send,
    choose,
    switchToHelp,
    markSolved,
    back,
    submit,
  }), [alarm, flow, seconds, help, pickColleague, choose, switchToHelp, markSolved, back, submit]);
}
