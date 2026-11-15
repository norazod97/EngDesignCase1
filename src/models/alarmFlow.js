// MODEL — the rules of the alarm flow (docs/PLAN.md section 2). Pure functions:
// no React, no timers. Each function takes the current flow and returns a new one.
//
//   choose ──► fix ───────► solved ──► (submit text) ──► closed
//     │         │  ▲
//     │         ▼  │ (from help you can still press "Problem solved")
//     ├──────► help ──────► solved
//     └──────► false_alarm ──► (submit text) ──► closed

export const FlowStep = Object.freeze({
  CHOOSE: "choose", // the three buttons
  FIX: "fix", // "I can fix it": operator works on it, timer runs
  HELP: "help", // "Ask AI / Call <name>": help channel open, timer runs
  FALSE_ALARM: "false_alarm", // "Why is this detection wrong?"
  SOLVED: "solved", // "Describe what you did to fix it."
});

// Minimum length of the required texts (a few words, not a single letter).
export const MIN_TEXT_LENGTH = 3;

/** A fresh flow for a new alarm. `now` is a timestamp in milliseconds. */
export function createFlow(alarm, now) {
  return {
    alarmId: alarm.id,
    errorCode: alarm.errorCode ?? null,
    alarmAt: now, // when the alarm appeared
    step: FlowStep.CHOOSE,
    firstChoice: null, // "fix" | "help" | "false_alarm"
    firstChoiceAt: null,
    timerStartedAt: null, // starts on "I can fix it" or help, keeps running when switching
    switches: [], // e.g. [{ from: "fix", to: "help", at }]
    helpOpenedAt: null,
  };
}

/** The participant presses one of the three buttons. */
export function choose(flow, choice, now) {
  const step = { fix: FlowStep.FIX, help: FlowStep.HELP, false_alarm: FlowStep.FALSE_ALARM }[choice];
  if (!step || flow.step !== FlowStep.CHOOSE) return flow;
  return {
    ...flow,
    step,
    // Remember only the very first choice (for the study log).
    firstChoice: flow.firstChoice ?? choice,
    firstChoiceAt: flow.firstChoiceAt ?? now,
    // The timer starts on fix or help, not on false alarm.
    timerStartedAt: step === FlowStep.FALSE_ALARM ? flow.timerStartedAt : flow.timerStartedAt ?? now,
    helpOpenedAt: step === FlowStep.HELP ? flow.helpOpenedAt ?? now : flow.helpOpenedAt,
  };
}

/** From the fix step, the participant asks for help. The timer keeps running. */
export function switchToHelp(flow, now) {
  if (flow.step !== FlowStep.FIX) return flow;
  return {
    ...flow,
    step: FlowStep.HELP,
    switches: [...flow.switches, { from: FlowStep.FIX, to: FlowStep.HELP, at: now }],
    helpOpenedAt: flow.helpOpenedAt ?? now,
  };
}

/** "Problem solved" (from the fix or the help step). */
export function markSolved(flow) {
  if (![FlowStep.FIX, FlowStep.HELP].includes(flow.step)) return flow;
  return { ...flow, step: FlowStep.SOLVED };
}

/** "Back" from the false-alarm text to the three buttons (nothing has started yet). */
export function backToChoice(flow) {
  if (flow.step !== FlowStep.FALSE_ALARM) return flow;
  return { ...flow, step: FlowStep.CHOOSE };
}

/** Is the required text long enough to submit? */
export function canSubmit(text) {
  return (text ?? "").trim().length >= MIN_TEXT_LENGTH;
}

/** Seconds on the timer (0 if it has not started). */
export function elapsedSeconds(flow, now) {
  if (!flow.timerStartedAt) return 0;
  return Math.max(0, Math.floor((now - flow.timerStartedAt) / 1000));
}

/** Timer as mm:ss, e.g. 75 -> "01:15". */
export function formatTimer(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * What goes into the study log when the participant submits.
 * Out: one plain object with every field from PLAN section 2 "Logged per alarm".
 */
export function flowRecord(flow, text, now) {
  return {
    alarmId: flow.alarmId,
    errorCode: flow.errorCode,
    alarmAt: new Date(flow.alarmAt).toISOString(),
    firstChoice: flow.firstChoice,
    firstChoiceAfterS: flow.firstChoiceAt ? Math.round((flow.firstChoiceAt - flow.alarmAt) / 1000) : null,
    switches: flow.switches.map((s) => ({ ...s, at: new Date(s.at).toISOString() })),
    helpOpened: !!flow.helpOpenedAt,
    outcome: flow.step === FlowStep.FALSE_ALARM ? "false_alarm" : "problem_solved",
    text: text.trim(),
    timerS: elapsedSeconds(flow, now),
    totalS: Math.round((now - flow.alarmAt) / 1000),
    submittedAt: new Date(now).toISOString(),
  };
}
