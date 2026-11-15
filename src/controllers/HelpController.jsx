// CONTROLLER — one help channel for both study versions (PLAN T4 + T12, CLAUDE.md rule 4).
//
// What it does:
//   - opens and closes help (from the navbar, the dashboard or the alarm window),
//   - remembers WHO helps: the AI (chatbot build) or a colleague (colleagues build),
//   - picks the colleague to name on the alarm's "Call <name>" button,
//   - logs every help interaction to the study log, including "help considered"
//     (help opened, then closed without sending a message),
//   - tells the wizard console who was called, so the researcher can answer as them.
// The chat itself (messages, typing) stays in AssistantController.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CONDITION } from "../conditions/index.js";
import { appendEvent } from "../services/studyLog.js";
import { useAssistant } from "./AssistantController.jsx";
import { useCell, wizardChannel } from "./CellController.jsx";
import { useColleaguesOnShift } from "./useColleagues.js";

const HelpContext = createContext(null);

/**
 * The colleague to name on the alarm's help button: the first AVAILABLE colleague
 * whose expertise matches the alarm (help_content.who_knows). null if nobody fits;
 * then the participant picks someone from the list.
 */
export function suggestColleague(colleagues, alarm) {
  if (!alarm) return null;
  const knows = alarm.whoKnows ?? [];
  return colleagues.find((c) => c.status === "available" && c.expertise?.some((x) => knows.includes(x))) ?? null;
}

export function HelpController({ children }) {
  const { state } = useCell();
  const { ask } = useAssistant();
  const colleagues = useColleaguesOnShift();
  const isAi = CONDITION.helpChannel === "ai";

  const [panelOpen, setPanelOpen] = useState(false); // the help drawer / AI dock (outside the alarm window)
  const [colleague, setColleague] = useState(null); // who is helping now (colleagues build)
  const [openedAt, setOpenedAt] = useState(0); // start of the help session (the chat shows messages from then on)
  const session = useRef(null); // the open help session: { via, openedAt, sent, received }

  // Write one help event to the study log, with the cell context.
  const log = useCallback((type, fields = {}) => {
    appendEvent("participant", {
      type, process: state.process, cellId: state.cellId,
      assembly: state.cycle.currentJobId ?? undefined,
      alarmId: state.activeAlarm?.id, errorCode: state.activeAlarm?.errorCode, ...fields,
    });
  }, [state]);

  // Tell the wizard who the participant is talking to (AI or a named colleague).
  const tellWizard = useCallback((via, who) => {
    wizardChannel.post({
      type: "help-opened", via, channel: CONDITION.helpChannel,
      colleague: who?.name ?? null, alarmId: state.activeAlarm?.id ?? null, errorCode: state.activeAlarm?.errorCode ?? null,
    });
  }, [state.activeAlarm]);

  /**
   * Start a help session.
   * via: where it was opened ("navbar", "avatar", "alarm", "cell_stopped").
   * who: the colleague (colleagues build), or null to let the participant choose.
   * showPanel: false when the alarm window shows the chat itself.
   */
  const openHelp = useCallback(({ via, who = null, showPanel = true }) => {
    session.current = { via, openedAt: Date.now(), sent: 0, received: 0 };
    setOpenedAt(session.current.openedAt);
    setColleague(who);
    if (showPanel) setPanelOpen(true);
    log("help_opened", { choice: via, details: { channel: CONDITION.helpChannel, colleague: who?.name ?? null } });
    if (isAi || who) tellWizard(via, who);
  }, [log, tellWizard, isAi]);

  /** Colleagues build: the participant picks a colleague from the list. */
  const chooseColleague = useCallback((who) => {
    setColleague(who);
    // Did they pick an expert for this alarm? (for the analysis)
    const knows = state.activeAlarm?.whoKnows ?? [];
    const matches = state.activeAlarm ? who.expertise?.some((x) => knows.includes(x)) : null;
    log("help_colleague_chosen", { choice: who.name, outcome: who.status, details: { expertise: who.expertise, matchesAlarm: matches } });
    tellWizard(session.current?.via ?? "list", who);
  }, [log, tellWizard, state.activeAlarm]);

  /** Send a message in the help chat (counted, so we know if help was really used). */
  const send = useCallback((text) => {
    if (session.current) session.current.sent += 1;
    ask(text);
  }, [ask]);

  /** Close the help session. resolution: e.g. "closed", "problem_solved". */
  const closeHelp = useCallback((resolution = "closed") => {
    const s = session.current;
    if (s) {
      // "help considered": opened, but no message sent and no answer received.
      const used = s.sent > 0 || s.received > 0;
      log("help_closed", {
        outcome: used ? resolution : "considered_only", choice: s.via,
        totalS: Math.round((Date.now() - s.openedAt) / 1000),
        details: { messagesSent: s.sent, messagesReceived: s.received, colleague: colleague?.name ?? null },
      });
    }
    session.current = null;
    setPanelOpen(false);
  }, [log, colleague]);

  // Count the answers from the AI / colleague during an open help session.
  useEffect(() => wizardChannel.listen((msg) => {
    if (msg?.type === "chat" && msg.from === "assistant" && session.current) session.current.received += 1;
  }), []);

  // Answer the wizard's "hello" with the build name, so the console shows it.
  useEffect(() => {
    const announce = () => wizardChannel.post({ type: "condition", id: CONDITION.id, label: CONDITION.label });
    announce();
    return wizardChannel.listen((msg) => { if (msg?.type === "hello") announce(); });
  }, []);

  // Who the participant is talking to, for the chat header and message bubbles.
  const persona = isAi
    ? { kind: "ai", name: "AI assistant" }
    : colleague ? { kind: "colleague", name: colleague.name, role: colleague.role, photo: colleague.photo, status: colleague.status } : null;

  const value = useMemo(() => ({
    isAi, colleagues, colleague, persona, panelOpen, openedAt,
    suggested: suggestColleague(colleagues, state.activeAlarm),
    openHelp, chooseColleague, send, closeHelp,
  }), [isAi, colleagues, colleague, persona, panelOpen, openedAt, state.activeAlarm, openHelp, chooseColleague, send, closeHelp]);

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used inside <HelpController>");
  return ctx;
}
