// CONTROLLER — the "AI assistant" chat. In the Wizard-of-Oz study the
// experimenter types the replies in the #/wizard console; with no wizard
// connected a scripted fallback answers, so the UI never hangs.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CONDITION } from "../conditions/index.js";
import { appendEvent } from "../services/studyLog.js";
import { wizardChannel } from "./CellController.jsx";

const AssistantContext = createContext(null);

// Unique id for each chat message (several can arrive in the same millisecond).
let messageCounter = 0;
const nextId = () => `${Date.now()}-${++messageCounter}`;

// Shown only if nobody answers in time (no wizard connected). Wording depends on the study version.
const FALLBACK = CONDITION.helpChannel === "ai"
  ? "I can't answer right now. Please try again in a moment."
  : "No answer yet. Try again, or call another colleague.";

export function AssistantController({ children }) {
  const [messages, setMessages] = useState([
    { id: "hello", from: "assistant", text: "Hi! Ask me anything about the cell, an alarm, or a WPS. I answer from the event log and the cell manuals.", at: new Date().toISOString() },
  ]);
  const [typing, setTyping] = useState(false);
  const fallbackTimer = useRef(null);

  useEffect(() => wizardChannel.listen((msg) => {
    if (msg?.type === "chat" && msg.from === "assistant") {
      clearTimeout(fallbackTimer.current);
      setTyping(false);
      setMessages((m) => [...m, { id: nextId(), from: "assistant", text: msg.text, at: new Date().toISOString() }]);
      appendEvent("participant", { type: "chat_received", choice: CONDITION.helpChannel, text: msg.text }); // help message shown to the participant
    }
    if (msg?.type === "chat-typing") setTyping(!!msg.on);
  }), []);

  const ask = useCallback((text) => {
    const entry = { id: nextId(), from: "operator", text, at: new Date().toISOString() };
    setMessages((m) => [...m, entry]);
    setTyping(true);
    wizardChannel.post({ type: "chat", from: "operator", text });
    appendEvent("participant", { type: "chat_sent", text }); // participant's question
    clearTimeout(fallbackTimer.current);
    fallbackTimer.current = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: nextId(), from: "assistant", text: FALLBACK, at: new Date().toISOString() }]);
    }, wizardChannel.available ? 45000 : 1500);
  }, []);

  useEffect(() => () => clearTimeout(fallbackTimer.current), []);

  const value = useMemo(() => ({ messages, typing, ask }), [messages, typing, ask]);
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used inside <AssistantController>");
  return ctx;
}
