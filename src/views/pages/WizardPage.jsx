// Experimenter console for Wizard-of-Oz sessions. Open #/wizard in a second
// tab of the same browser; it drives the simulated cell in the participant tab.
import { useEffect, useRef, useState } from "react";
import { createWizardChannel } from "../../services/wizardChannel.js";
import { AI_ADJUSTMENTS } from "../../mock/scenarios.js";
// The wizard is the researcher's tool, so it reads the alarm database directly.
import { listAlarms } from "../../services/alarmRepository.js";
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
  // Resolution script: how many steps were already sent for the current alarm.
  const [sent, setSent] = useState({ alarmAt: null, count: 0 });
  const [helpNote, setHelpNote] = useState(null); // "Participant opened help" banner

  useEffect(() => {
    document.title = "Wizard console · COROB";
    channel.current = createWizardChannel();
    const off = channel.current.listen((msg) => {
      if (msg?.type === "state") setSnap(msg);
      if (msg?.type === "chat" && msg.from === "operator") setChat((c) => [...c, { from: "operator", text: msg.text, at: new Date().toISOString() }]);
      if (msg?.type === "help-opened") setHelpNote({ ...msg, at: new Date().toISOString() });
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

  // Alarms for the connected cell's process (GMAW or WAAM), grouped by knowledge domain.
  const alarms = listAlarms(s?.process);
  const active = s?.activeAlarm ?? null;
  const script = active?.resolutionScript ?? [];
  // Reset the "sent" counter when a new alarm starts.
  const sentCount = sent.alarmAt === active?.raisedAt ? sent.count : 0;
  function sendSteps(n) {
    const steps = script.slice(sentCount, sentCount + n);
    steps.forEach((step, i) => say(`Step ${sentCount + i + 1}: ${step}`));
    setSent({ alarmAt: active.raisedAt, count: sentCount + steps.length });
  }

  return (
    <div className="wizard">
      <header className="wizard-head">
        <h1>Wizard console</h1>
        <span className={`tag ${s ? "tag-positive" : "tag-warning"}`}>{s ? `Connected · cell ${s.cellId} · ${s.cycle.state}` : "Waiting for participant tab (sign in there)…"}</span>
        {!channel.current?.available && channel.current && <span className="tag tag-error">BroadcastChannel unsupported</span>}
      </header>

      <div className="wizard-grid">
        <Card title={`Alarms · ${s?.process ?? "sign in first"}`}>
          <div className="stack">
            {alarms.map((a) => (
              <Button key={a.id} variant={a.halts ? "danger" : "ink"} onClick={() => cmd("alarm", { id: a.id })}>
                {a.halts ? "HALT" : "WARN"} · {a.id} · {a.title}
              </Button>
            ))}
          </div>
        </Card>

        <Card title="Active alarm · resolution script">
          {!active ? <p className="muted">No active alarm.</p> : (
            <div className="stack">
              <p><strong>{active.errorCode}</strong> · {active.id} · {active.title}</p>
              {helpNote?.alarmId === active.id && <p className="tag tag-warning">Participant opened help ({helpNote.channel}) at {formatTime(helpNote.at)}</p>}
              <ol className="wizard-script">
                {script.map((step, i) => <li key={i} className={i < sentCount ? "is-sent" : ""}>{step}</li>)}
              </ol>
              <div className="row wrap">
                <Button variant="accent" disabled={sentCount >= script.length} onClick={() => sendSteps(1)}>Send next step ({Math.min(sentCount + 1, script.length)}/{script.length})</Button>
                <Button variant="ink" disabled={sentCount >= script.length} onClick={() => sendSteps(script.length)}>Send all</Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="AI events">
          <div className="stack">
            <select className="input" value={aiText} onChange={(e) => setAiText(e.target.value)}>
              {AI_ADJUSTMENTS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <Button onClick={() => cmd("aiAdjust", { message: aiText })}>Send AI adjustment toast</Button>
            <div className="row">Auto AI toast during weld <Switch checked={!!sim?.autoAi} onChange={(on) => cmd("autoAi", { on })} /></div>
            <div className="row">Next AI inspection result
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
