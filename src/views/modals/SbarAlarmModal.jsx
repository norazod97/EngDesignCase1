import { useEffect, useState } from "react";
import { useCell } from "../../controllers/CellController.jsx";
import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/overlays.jsx";
import { AiBadge, Button, Checkbox, Confidence, Field, TextArea } from "../components/primitives.jsx";

/**
 * SBAR alarm: Situation → Background (data) → Assessment (AI cause +
 * confidence) → Recommendation (steps to tick). Opens automatically when the
 * cell model has an active alarm and cannot be dismissed without a choice.
 */
export function SbarAlarmModal({ onRequestHelp }) {
  const { state, actions } = useCell();
  const alarm = state.activeAlarm;
  const [done, setDone] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setDone([]); setComment(""); setError(""); }, [alarm?.raisedAt]);
  if (!alarm) return null;

  const halts = alarm.halts;
  const allDone = done.length === alarm.steps.length;
  const toggle = (i, on) => setDone((d) => (on ? [...d, i] : d.filter((x) => x !== i)));

  function close(resolution) {
    actions.closeAlarm(resolution, { comment, stepsDone: done });
  }

  function fixedAndResume() {
    if (!state.door.locked) { setError("Lock the cell door first, then press Resume."); return; }
    close("fixed");
    const r = actions.resume();
    if (!r.ok) setError(r.reason);
  }

  function askHelp() {
    close("help");
    onRequestHelp({ topic: alarm.situation, alarmId: alarm.id, jobId: alarm.jobId });
  }

  return (
    <Modal
      open
      dismissible={false}
      tone={halts ? "error" : "warning"}
      size="lg"
      eyebrow={halts ? "Message for welder · Weld cycle halted" : "Message for welder · Please check"}
      title={<><Icon name="alert" size={28} /> {alarm.situation}</>}
      footer={
        <div className="sbar-actions">
          <div className="sbar-actions-secondary">
            <Button variant="ghost" icon="wrench" onClick={askHelp}>Request help</Button>
            <Button variant="ghost" onClick={() => close("dismissed")}>Not a real problem</Button>
          </div>
          {halts ? (
            <Button variant="accent" size="lg" icon="play" onClick={fixedAndResume} disabled={!allDone || !state.door.locked} title={!allDone ? "Tick every step first" : !state.door.locked ? "Lock the door first" : undefined}>
              Fixed — resume cycle
            </Button>
          ) : (
            <Button variant="accent" size="lg" icon="check" onClick={() => close("fixed")}>OK, checked</Button>
          )}
        </div>
      }
    >
      <div className="sbar">
        <section className="sbar-block">
          <h3><span className="sbar-letter">S</span> What happened</h3>
          <p className="sbar-lead">{alarm.background}</p>
          <p className="sbar-meta">Assembly {alarm.jobId ?? "—"} · {new Date(alarm.raisedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
        </section>

        <section className="sbar-block">
          <h3><span className="sbar-letter">B</span> Measurements</h3>
          <table className="sbar-data">
            <thead><tr><th>Signal</th><th>Now</th><th>Should be</th></tr></thead>
            <tbody>
              {alarm.data.map((d) => <tr key={d.label}><td>{d.label}</td><td className="is-bad">{d.value}</td><td>{d.limit}</td></tr>)}
            </tbody>
          </table>
        </section>

        <section className="sbar-block sbar-ai">
          <h3><span className="sbar-letter">A</span> Likely cause <AiBadge>AI estimate</AiBadge></h3>
          <p className="sbar-lead">{alarm.assessment.cause}</p>
          <Confidence value={alarm.assessment.confidence} />
          <p className="sbar-meta">This is a best guess. You know the process: if you see something else, write it below.</p>
        </section>

        <section className="sbar-block">
          <h3><span className="sbar-letter">R</span> What to do</h3>
          <ol className="sbar-steps">
            {alarm.steps.map((s, i) => (
              <li key={s}><Checkbox label={`${i + 1}. ${s}`} checked={done.includes(i)} onChange={(on) => toggle(i, on)} /></li>
            ))}
          </ol>
        </section>

        {halts && (
          <div className={`door-row ${state.door.locked ? "is-locked" : "is-unlocked"}`}>
            <Icon name={state.door.locked ? "lock" : "unlock"} size={26} />
            <strong>{state.door.locked ? "Cell door is locked" : "Cell door is unlocked"}</strong>
            <Button variant={state.door.locked ? "ghost" : "accent"} icon={state.door.locked ? "unlock" : "lock"} onClick={() => { setError(""); actions.lockDoor(!state.door.locked); }}>
              {state.door.locked ? "Unlock to enter" : "Lock door"}
            </Button>
          </div>
        )}

        <Field label="What did you find? (optional — helps the AI and your colleagues)" id="alarm-comment">
          <TextArea id="alarm-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Lens was clean — the real cause was a loose ground clamp." />
        </Field>
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
