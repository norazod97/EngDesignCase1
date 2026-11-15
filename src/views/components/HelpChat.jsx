// VIEW — the help chat and the colleague list, shared by the alarm window and
// the help panel. Shows who answers: the AI (purple AI badge) or a colleague
// (photo + name). All data comes in as props; no logic here.
import { useEffect, useRef, useState } from "react";
import { HELP_TEXT as T } from "../../i18n/en.js";
import { Icon } from "./Icon.jsx";
import { AiBadge, Avatar, Button } from "./primitives.jsx";

/**
 * Chat with the AI or a colleague.
 * In: persona ({ kind: "ai" | "colleague", name, role, photo }), messages, typing,
 *     since (only show messages from this time on), onSend(text).
 */
export function HelpChat({ persona, messages, typing, since = 0, onSend }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);
  const isAi = persona?.kind === "ai";
  // Only the messages of this help session.
  const shown = messages.filter((m) => new Date(m.at).getTime() >= since - 1000);

  // Keep the newest message in view.
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [shown.length, typing]);

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <div className="stack help-chat">
      {/* Who is answering. */}
      <div className="help-chat-head">
        {isAi
          ? <><Icon name="sparkle" size={28} /> <strong>{T.aiName}</strong> <AiBadge>AI</AiBadge></>
          : <><Avatar name={persona.name} photo={persona.photo} size={44} status={persona.status} /><span><strong>{persona.name}</strong><small>{persona.role}</small></span></>}
      </div>
      <ol className="assistant-list flow-chat" ref={listRef} aria-live="polite">
        {shown.map((m) => (
          <li key={m.id} className={`bubble ${m.from === "operator" ? "bubble-operator" : isAi ? "bubble-assistant" : "bubble-colleague"}`}>{m.text}</li>
        ))}
        {typing && <li className={`bubble ${isAi ? "bubble-assistant" : "bubble-colleague"} bubble-typing`} aria-label={T.typing}><span /><span /><span /></li>}
      </ol>
      <form className="assistant-form" onSubmit={submit}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={T.placeholder} aria-label={T.placeholder} />
        <Button type="submit" variant="ink" icon="send">{T.send}</Button>
      </form>
    </div>
  );
}

/**
 * List of colleagues to call (colleagues build). Busy colleagues can still be
 * chosen, but are marked with a red dot and the word "busy".
 * In: colleagues, onPick(colleague).
 */
export function ColleaguePicker({ colleagues, onPick }) {
  return (
    <div className="stack">
      <p className="lead">{T.pickLead}</p>
      <ul className="people-list">
        {colleagues.map((c) => (
          <li key={c.id}>
            <Avatar name={c.name} photo={c.photo} size={48} status={c.status} />
            <span><strong>{c.name}</strong><small>{c.role} · {c.status === "available" ? T.available : T.busy} · {c.location}</small></span>
            <Button variant={c.status === "available" ? "accent" : "ghost"} icon="phone" onClick={() => onPick(c)}>{T.call}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
