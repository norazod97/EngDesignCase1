// Experimenter console for Wizard-of-Oz sessions. Open #/wizard in a second
// tab of the same browser; it drives the simulated cell in the participant tab.
import { useEffect, useRef, useState } from "react";
import { createWizardChannel } from "../../services/wizardChannel.js";
import { ALARM_TEMPLATES, AI_ADJUSTMENTS } from "../../mock/scenarios.js";
import { EquipmentStatus } from "../../models/equipment.js";
import { formatTime } from "../../models/job.js";
import { Button, Card, StatusLamp, Switch } from "../components/primitives.jsx";

const REPLIES = [
  "The camera that follows the seam may be dirty. Unlock the cell and wipe the lens with solvent, then lock the door and press Resume.",
  "The AI slowed the torch a little because the gap was wider than in the drawing. This is normal and is written in the event log.",
  "That step is outside your normal tasks. Use Help → Maintenance and they will come to the cell.",
];

export function WizardPage() {
  const channel = useRef(null);
  const [snap, setSnap] = useState(null);
  const [chat, setChat] = useState([]);
  const [reply, setReply] = useState("");
  const [aiText, setAiText] = useState(AI_ADJUSTMENTS[0]);

  useEffect(() => {
    document.title = "Wizard console · COROB";
    channel.current = createWizardChannel();
    const off = channel.current.listen((msg) => {
      if (msg?.type === "state") setSnap(msg);
      if (msg?.type === "chat" && msg.from === "operator") setChat((c) => [...c, { from: "operator", text: msg.text, at: new Date().toISOString() }]);
    });
    channel.current.post({ type: "hello" });
    return () => { off(); channel.current.close(); };
  }, []);

  const cmd = (name, args) => channel.current?.post({ type: "cmd", name, args });
  const say = (text) => {
    if (!text.trim()) return;
    channel.current?.post({ type: "chat", from: "assistant", text });
    setChat((c) => [...c, { from: "assistant", text, at: new Date().toISOString() }]);
    setReply("");
  };

  const s = snap?.state;
  const sim = snap?.sim;

  return (
    <div className="wizard">
      <header className="wizard-head">
        <h1>Wizard console</h1>
        <span className={`tag ${s ? "tag-positive" : "tag-warning"}`}>{s ? `Connected · cell ${s.cellId} · ${s.cycle.state}` : "Waiting for participant tab (sign in there)…"}</span>
        {!channel.current?.available && channel.current && <span className="tag tag-error">BroadcastChannel unsupported</span>}
      </header>

      <div className="wizard-grid">
        <Card title="Alarms (SBAR)">
          <div className="stack">
            {Object.values(ALARM_TEMPLATES).map((a) => (
              <Button key={a.id} variant={a.halts ? "danger" : "ink"} onClick={() => cmd("alarm", { id: a.id })}>{a.halts ? "HALT · " : "WARN · "}{a.situation}</Button>
            ))}
          </div>
        </Card>

        <Card title="AI events">
          <div className="stack">
            <select className="input" value={aiText} onChange={(e) => setAiText(e.target.value)}>
              {AI_ADJUSTMENTS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <Button onClick={() => cmd("aiAdjust", { message: aiText })}>Send AI adjustment toast</Button>
            <div className="row">Auto AI toast during weld <Switch checked={!!sim?.autoAi} onChange={(on) => cmd("autoAi", { on })} /></div>
            <div className="row">Next AI-SPECTO verdict
              <Switch checked={sim?.nextVerdict === "ok"} onText="OK" offText="NOK" onChange={(on) => cmd("nextVerdict", { verdict: on ? "ok" : "nok" })} />
            </div>
          </div>
        </Card>

        <Card title="Cell & parts">
          <div className="stack">
            <div className="row">Bin in robot reach <Switch checked={!!s?.bin.inEnvelope} onChange={(on) => cmd("bin", { inEnvelope: on })} /></div>
            <div className="row">Simulation speed
              <select className="input input-sm" value={sim?.speed ?? 1} onChange={(e) => cmd("speed", { speed: e.target.value })}>
                {[0.5, 1, 2, 4].map((v) => <option key={v} value={v}>{v}×</option>)}
              </select>
            </div>
            {s && Object.keys(s.jobs).filter((id) => !s.jobs[id].cad || !s.jobs[id].wps).map((id) => (
              <Button key={id} variant="ghost" onClick={() => cmd("docsAttached", { jobId: id })}>Supervisor uploads docs for {id}</Button>
            ))}
          </div>
        </Card>

        <Card title="Equipment">
          <ul className="equip-list">
            {s?.equipment.map((e) => (
              <li key={e.id}>
                <span><strong>{e.name}</strong> <StatusLamp status={e.status} size={14} /></span>
                <select className="input input-sm" value={e.status} onChange={(ev) => cmd("equipment", { id: e.id, status: ev.target.value })}>
                  {Object.values(EquipmentStatus).map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Assistant (you type the answers)" className="span-2">
          <ol className="assistant-list wizard-chat">
            {chat.map((m, i) => <li key={i} className={`bubble bubble-${m.from}`}><small>{formatTime(m.at)}</small> {m.text}</li>)}
          </ol>
          <div className="stack">
            <div className="row wrap">{REPLIES.map((r) => <button key={r} type="button" className="chip" onClick={() => say(r)}>{r.slice(0, 48)}…</button>)}</div>
            <form className="assistant-form" onSubmit={(e) => { e.preventDefault(); say(reply); }}>
              <input className="input" value={reply} onChange={(e) => setReply(e.target.value)} onFocus={() => channel.current?.post({ type: "chat-typing", on: true })} placeholder="Type the assistant's answer…" />
              <Button type="submit" variant="accent">Send</Button>
            </form>
          </div>
        </Card>

        <Card title="Live log" className="span-2">
          <ol className="event-mini">{s?.log.slice(0, 12).map((e) => <li key={e.id} className={`ev ev-${e.category}`}><time>{formatTime(e.at)}</time><span className="ev-cat">{e.category}</span><span>{e.message}</span></li>)}</ol>
        </Card>
      </div>
    </div>
  );
}
