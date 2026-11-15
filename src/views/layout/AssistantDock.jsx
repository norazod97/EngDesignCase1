import { useEffect, useRef, useState } from "react";
import { useAssistant } from "../../controllers/AssistantController.jsx";
import { Icon } from "../components/Icon.jsx";
import { AiBadge, IconButton } from "../components/primitives.jsx";

const SUGGESTIONS = ["What does this alarm mean?", "How do I clean the camera lens?", "Why did the AI change the speed?"];

/** Always-available assistant; collapses to a tab on small screens. */
export function AssistantDock({ open, onToggle }) {
  const { messages, typing, ask } = useAssistant();
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, typing, open]);

  function submit(e) {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    ask(q);
    setText("");
  }

  if (!open) {
    return (
      <button type="button" className="assistant-tab" onClick={onToggle} aria-expanded="false">
        <Icon name="sparkle" /> <span>Ask the assistant</span>
      </button>
    );
  }

  return (
    <aside className="assistant" aria-label="Assistant">
      <header className="assistant-head">
        <h2><Icon name="sparkle" /> Assistant <AiBadge>AI</AiBadge></h2>
        <IconButton icon="close" label="Hide assistant" className="icon-btn-plain" onClick={onToggle} />
      </header>
      <ol className="assistant-list" ref={listRef} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={`bubble bubble-${m.from}`}>{m.text}</li>
        ))}
        {typing && <li className="bubble bubble-assistant bubble-typing" aria-label="Assistant is typing"><span /><span /><span /></li>}
      </ol>
      <div className="assistant-suggestions">
        {SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" onClick={() => ask(s)}>{s}</button>)}
      </div>
      <form className="assistant-form" onSubmit={submit}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a question…" aria-label="Question for the assistant" />
        <IconButton icon="send" label="Send" type="submit" selected />
      </form>
      <p className="assistant-note">Answers come from the event log and cell manuals. Check with your supervisor if unsure.</p>
    </aside>
  );
}
