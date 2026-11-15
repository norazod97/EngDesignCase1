// VIEW — the alarm window (docs/PLAN.md section 2).
// Opens by itself when the cell has an active alarm and cannot be closed
// without finishing the flow. It shows what happened (no fix steps!), then:
//   [I can fix it]  [False alarm]  [Ask AI]
// All logic (steps, timer, logging) lives in controllers/AlarmFlowController.jsx.
import { useEffect, useRef, useState } from "react";
import { useAlarmFlow } from "../../controllers/AlarmFlowController.jsx";
import { useAssistant } from "../../controllers/AssistantController.jsx";
import { useCell } from "../../controllers/CellController.jsx";
import { ALARM_TEXT as T } from "../../i18n/en.js";
import { FlowStep, canSubmit } from "../../models/alarmFlow.js";
import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/overlays.jsx";
import { AiBadge, Button, Confidence, TextArea } from "../components/primitives.jsx";

export function SbarAlarmModal() {
  const f = useAlarmFlow();
  const { alarm, flow } = f;
  if (!alarm || !flow) return null;

  // Title line of the window changes with the step.
  const titles = {
    [FlowStep.CHOOSE]: alarm.situation,
    [FlowStep.FIX]: T.fixTitle,
    [FlowStep.HELP]: T.helpTitle,
    [FlowStep.FALSE_ALARM]: T.falseTitle,
    [FlowStep.SOLVED]: T.solvedTitle,
  };

  return (
    <Modal
      open
      dismissible={false}
      tone={alarm.halts ? "error" : "warning"}
      size="lg"
      eyebrow={`${alarm.halts ? T.eyebrowHalt : T.eyebrowCheck}${alarm.errorCode ? ` · ${T.errorCode} ${alarm.errorCode}` : ""}`}
      title={<><Icon name="alert" size={28} /> {titles[flow.step]}</>}
    >
      {/* Count-up timer: shown on the fix and help steps (and while writing after them). */}
      {f.timerVisible && flow.timerStartedAt && (
        <div className="flow-timer" role="timer" aria-label={T.timer}>
          <Icon name="clock" size={20} /> <span>{T.timer}</span> <strong>{f.timerText}</strong>
        </div>
      )}

      {flow.step === FlowStep.CHOOSE && <ChooseStep alarm={alarm} onChoose={f.choose} helpChannel={f.helpChannel} />}
      {flow.step === FlowStep.FIX && <FixStep onSolved={f.markSolved} onHelp={f.switchToHelp} />}
      {flow.step === FlowStep.HELP && <HelpStep since={flow.helpOpenedAt} onSolved={f.markSolved} />}
      {flow.step === FlowStep.FALSE_ALARM && (
        <TextStep key="false" lead={T.falseLead} chips={T.falseChips} onSubmit={f.submit} onBack={f.back} />
      )}
      {flow.step === FlowStep.SOLVED && (
        <TextStep key="solved" lead={T.solvedLead} chips={T.solvedChips} onSubmit={f.submit} />
      )}
    </Modal>
  );
}

/** Step 1: what happened + the three big buttons. */
function ChooseStep({ alarm, onChoose, helpChannel }) {
  return (
    <div className="sbar">
      {/* S: what happened, in plain words. */}
      <section className="sbar-block">
        <h3><span className="sbar-letter">S</span> {T.whatHappened}</h3>
        <p className="sbar-lead">{alarm.background}</p>
        <p className="sbar-meta">{new Date(alarm.raisedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
      </section>

      {/* B: the measurements that triggered the alarm. */}
      {alarm.data?.length > 0 && (
        <section className="sbar-block">
          <h3><span className="sbar-letter">B</span> {T.measurements}</h3>
          <table className="sbar-data">
            <thead><tr><th>{T.signal}</th><th>{T.now}</th><th>{T.limit}</th></tr></thead>
            <tbody>
              {alarm.data.map((d) => <tr key={d.label}><td>{d.label}</td><td className="is-bad">{d.value}</td><td>{d.limit}</td></tr>)}
            </tbody>
          </table>
        </section>
      )}

      {/* A: what the AI thinks (only for AI alarms). Always marked with the purple AI badge. */}
      {alarm.assessment && (
        <section className="sbar-block sbar-ai">
          <h3><span className="sbar-letter">A</span> {T.aiThinks} <AiBadge>{T.aiBadge}</AiBadge></h3>
          <p className="sbar-lead">{alarm.assessment.cause}</p>
          {alarm.assessment.confidence != null && <Confidence value={alarm.assessment.confidence} />}
          {alarm.assessment.unfamiliar && <p className="sbar-meta"><Icon name="alert" size={16} /> {T.aiUnfamiliar}</p>}
          <p className="sbar-meta">{T.aiNote}</p>
        </section>
      )}

      {/* No "R" (recommendation) block: the fix only comes through help (PLAN section 2). */}
      <h3 className="flow-question">{T.question}</h3>
      <div className="flow-choices">
        <button type="button" className="flow-choice" onClick={() => onChoose("fix")}>
          <Icon name="wrench" size={32} /><strong>{T.fixIt}</strong><small>{T.fixItHint}</small>
        </button>
        <button type="button" className="flow-choice" onClick={() => onChoose("false_alarm")}>
          <Icon name="close" size={32} /><strong>{T.falseAlarm}</strong><small>{T.falseAlarmHint}</small>
        </button>
        <button type="button" className="flow-choice flow-choice-help" onClick={() => onChoose("help")}>
          <Icon name="sparkle" size={32} />
          <strong>{helpChannel === "ai" ? T.askAi : T.callPerson("colleague")}</strong>
          <small>{helpChannel === "ai" ? T.askAiHint : T.callPersonHint}</small>
        </button>
      </div>
    </div>
  );
}

/** Door control, needed to go into the cell during the fix. */
function DoorRow() {
  const { state, actions } = useCell();
  const locked = state.door.locked;
  return (
    <div className={`door-row ${locked ? "is-locked" : "is-unlocked"}`}>
      <Icon name={locked ? "lock" : "unlock"} size={26} />
      <strong>{locked ? T.doorLocked : T.doorUnlocked}</strong>
      <Button variant={locked ? "ghost" : "accent"} icon={locked ? "unlock" : "lock"} onClick={() => actions.lockDoor(!locked)}>
        {locked ? T.unlock : T.lock}
      </Button>
    </div>
  );
}

/** Step "I can fix it": the timer runs; two buttons. */
function FixStep({ onSolved, onHelp }) {
  return (
    <div className="stack">
      <p className="lead">{T.fixLead}</p>
      <DoorRow />
      <div className="flow-actions">
        <Button variant="accent" size="lg" icon="check" onClick={onSolved}>{T.problemSolved}</Button>
        <Button variant="ink" size="lg" icon="sparkle" onClick={onHelp}>{T.askAi}</Button>
      </div>
    </div>
  );
}

/** Step "Ask AI": chat with the wizard (who types as the AI) + "Problem solved". */
function HelpStep({ since, onSolved }) {
  const { messages, typing, ask } = useAssistant();
  const [text, setText] = useState("");
  const listRef = useRef(null);
  // Only show the messages of this help session (not older chats).
  const shown = messages.filter((m) => new Date(m.at).getTime() >= since - 1000);

  // Keep the newest message in view.
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [shown.length, typing]);

  function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    ask(text.trim());
    setText("");
  }

  return (
    <div className="stack">
      <p className="lead">{T.helpLead} <AiBadge>AI</AiBadge></p>
      <ol className="assistant-list flow-chat" ref={listRef} aria-live="polite">
        {shown.map((m) => <li key={m.id} className={`bubble bubble-${m.from}`}>{m.text}</li>)}
        {typing && <li className="bubble bubble-assistant bubble-typing" aria-label={T.helpWaiting}><span /><span /><span /></li>}
      </ol>
      <form className="assistant-form" onSubmit={send}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={T.helpPlaceholder} aria-label={T.helpPlaceholder} />
        <Button type="submit" variant="ink" icon="send">{T.send}</Button>
      </form>
      <DoorRow />
      <div className="flow-actions">
        <Button variant="accent" size="lg" icon="check" onClick={onSolved}>{T.problemSolved}</Button>
      </div>
    </div>
  );
}

/** Required text (false alarm or problem solved), with quick chips. */
function TextStep({ lead, chips, onSubmit, onBack }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(false);

  // Tapping a chip adds its words to the text (less typing).
  const addChip = (c) => { setText((t) => (t.trim() ? `${t.trim()}. ${c}` : c)); setError(false); };

  function submit() {
    const r = onSubmit(text);
    if (!r.ok) setError(true);
  }

  return (
    <div className="stack">
      <p className="lead">{lead}</p>
      <div className="row wrap">
        {chips.map((c) => <button key={c} type="button" className="chip chip-lg" onClick={() => addChip(c)}>{c}</button>)}
      </div>
      <TextArea rows={4} value={text} onChange={(e) => { setText(e.target.value); setError(false); }} aria-label={lead} />
      {error && <p className="field-error" role="alert">{T.textRequired}</p>}
      <div className="flow-actions">
        {onBack && <Button variant="ghost" size="lg" onClick={onBack}>{T.back}</Button>}
        <Button variant="accent" size="lg" icon="send" onClick={submit} disabled={!canSubmit(text)}>{T.submit}</Button>
      </div>
    </div>
  );
}
