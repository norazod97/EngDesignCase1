// Experimenter console for Wizard-of-Oz sessions. Open #/wizard in a second
// tab of the same browser; it drives the simulated cell in the participant tab.
import { useEffect, useRef, useState } from "react";
import { createWizardChannel } from "../../services/wizardChannel.js";
import { AI_ADJUSTMENTS } from "../../mock/scenarios.js";
// The wizard is the researcher's tool, so it reads the alarm database directly.
import { getAlarm, isOutcomeCorrect, listAlarms } from "../../services/alarmRepository.js";
import { participantNumber, scheduleFor } from "../../services/studyScheduler.js";
import { appendEvent, clearLog, countEvents, downloadText, getParticipantCode, readAll, setParticipantCode, storeRemoteEvent, toCsv } from "../../services/studyLog.js";
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
  const [build, setBuild] = useState(null); // which study version the participant tab runs

  useEffect(() => {
    document.title = "Wizard console · COROB";
    channel.current = createWizardChannel();
    const off = channel.current.listen((msg) => {
      if (msg?.type === "state") setSnap(msg);
      if (msg?.type === "chat" && msg.from === "operator") setChat((c) => [...c, { from: "operator", text: msg.text, at: new Date().toISOString() }]);
      if (msg?.type === "help-opened") setHelpNote({ ...msg, at: new Date().toISOString() });
      if (msg?.type === "condition") setBuild(msg);
      if (msg?.type === "log-event") storeRemoteEvent(msg.event); // participant event from the other device
    });
    channel.current.post({ type: "hello" });
    return () => { off(); channel.current.close(); };
  }, []);

  const cmd = (name, args) => {
    channel.current?.post({ type: "cmd", name, args });
    // Study log. planned = fired from the schedule; false = off-script (from the full list).
    if (name === "alarm") appendEvent("wizard", { type: "wizard_alarm_triggered", alarmId: args.id, choice: args.planned ? "planned" : "off_script" });
  };
  const say = (text) => {
    if (!text.trim()) return;
    channel.current?.post({ type: "chat", from: "assistant", text });
    appendEvent("wizard", { type: "wizard_message", alarmId: snap?.state?.activeAlarm?.id, text }); // study log
    setChat((c) => [...c, { from: "assistant", text, at: new Date().toISOString() }]);
    setReply("");
  };

  const s = snap?.state;
  const sim = snap?.sim;

  // ---- Study log: participant code + export (PLAN T10) ----
  const [code, setCode] = useState(() => getParticipantCode());
  const [logCount, setLogCount] = useState(() => countEvents());
  useEffect(() => {
    // Refresh the event counter every 2 s (the participant tab writes to the same storage).
    const id = setInterval(() => setLogCount(countEvents()), 2000);
    return () => clearInterval(id);
  }, []);
  function saveCode(value) {
    setCode(value);
    setParticipantCode(value);
  }
  // ---- Trial schedule for this participant (PLAN T13, D5 = fixed order) ----
  const pNum = participantNumber(code);
  const schedule = pNum ? scheduleFor(pNum) : null;
  const block = schedule?.blocks.find((b) => b.process === s?.process) ?? null; // the cell the participant is in now
  // Which assembly is in the cell now (job ids end in A1..A4), and which step.
  const nowAssembly = Number(s?.cycle.currentJobId?.match(/A(\d)$/)?.[1]) || null;
  const nowStep = s?.cycle.currentJobId ? s?.steps?.[s.cycle.stepIndex]?.id : null;

  // Auto-fire (default on): when an assembly starts, arm its planned alarm. The cell
  // then fires it by itself at the trigger step, so it cannot be missed.
  const [autoFire, setAutoFire] = useState(true);
  const armedFor = useRef(null); // "P05|GMAW|3": which assembly was already armed
  useEffect(() => {
    if (!autoFire || !block || !nowAssembly || !s?.cycle.currentJobId) return;
    const key = `${pNum}|${block.process}|${nowAssembly}|${s.cycle.currentJobId}`;
    if (armedFor.current === key) return;
    armedFor.current = key;
    const trial = block.trials.find((t) => t.assembly === nowAssembly);
    const alarm = trial?.alarmId ? getAlarm(trial.alarmId) : null;
    if (!alarm) return;
    channel.current?.post({ type: "cmd", name: "arm", args: { id: alarm.id, step: alarm.trigger?.step, offset: alarm.trigger?.offset_s } });
    appendEvent("wizard", { type: "wizard_alarm_armed", alarmId: alarm.id, choice: "planned_auto", details: { step: alarm.trigger?.step } });
  }, [autoFire, block, nowAssembly, pNum, s?.cycle.currentJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // All events, with the scoring column filled in for finished alarm flows.
  function exportRows() {
    return readAll().map((e) => (e.type === "alarm_flow_done" ? { ...e, falseAlarmCorrect: isOutcomeCorrect(e.alarmId, e.outcome) } : e));
  }
  // File name with the LOCAL date and time, e.g. corob-log-P07-2026-11-16-09-30 (the times inside the log are UTC).
  const fileBase = () => {
    const d = new Date();
    const two = (n) => String(n).padStart(2, "0");
    return `corob-log-${code || "no-code"}-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}-${two(d.getMinutes())}`;
  };
  function exportJson() { downloadText(`${fileBase()}.json`, JSON.stringify(exportRows(), null, 2), "application/json"); }
  function exportCsv() { downloadText(`${fileBase()}.csv`, toCsv(exportRows()), "text/csv"); }
  function clearAll() {
    if (window.confirm(`Delete all ${countEvents()} logged events? Export them first. This cannot be undone.`)) {
      clearLog();
      setLogCount(0);
    }
  }

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
        {build && <span className="tag tag-info">Version: {build.label}</span>}
        {channel.current?.usesRelay && <span className="tag tag-info">Two-device mode (study server)</span>}
        {helpNote && <span className="tag tag-warning">Help opened via {helpNote.via}{helpNote.colleague ? ` · talking to ${helpNote.colleague}` : build?.label === "Colleagues" ? " · choosing a colleague" : " · AI"} · {formatTime(helpNote.at)}</span>}
        {!channel.current?.available && channel.current && <span className="tag tag-error">BroadcastChannel unsupported</span>}
      </header>

      <div className="wizard-grid">
        <Card title="Study session · log">
          <div className="stack">
            <label className="field-label" htmlFor="pcode">Participant code (no names)</label>
            <input id="pcode" className="input" value={code} onChange={(e) => saveCode(e.target.value)} placeholder="e.g. P07" />
            <p><strong>{logCount}</strong> events logged{code ? ` · next events get code ${code}` : " · set a code before the session"}</p>
            <div className="row wrap">
              <Button variant="accent" icon="download" onClick={exportCsv} disabled={!logCount}>Export CSV</Button>
              <Button variant="ink" icon="download" onClick={exportJson} disabled={!logCount}>Export JSON</Button>
              <Button variant="ghost" onClick={clearAll} disabled={!logCount}>Clear log</Button>
            </div>
            <p className="muted">The log stays in this browser until you clear it. Export after each participant.</p>
          </div>
        </Card>

        <Card title="Trial schedule">
          {!schedule ? <p className="muted">Type a participant code with a number (e.g. P07) to see the schedule.</p> : (
            <div className="stack">
              <div className="row">Auto-fire planned alarm at its step <Switch checked={autoFire} onChange={setAutoFire} /></div>
              {sim?.armed && <p className="tag tag-info">Armed: {sim.armed} (fires by itself at its step)</p>}
              {/* Which study version this participant must use, and a warning if another one is running. */}
              {build && !build.id.startsWith(schedule.version) && (
                <p className="callout callout-error"><strong>Wrong version!</strong> P{schedule.n} needs {schedule.version.replace("_", " ")}, but this console runs {build.id.replace("_", " ")}.</p>
              )}
              <p>
                <strong>P{schedule.n}</strong> · version {schedule.version.replace("_", " ")} · alarm variant {schedule.variant} · cell order:{" "}
                {schedule.blocks.map((b) => `${b.order}. ${b.process}`).join("  →  ")}
              </p>
              {!block ? <p className="muted">The participant tab is not signed in to a cell yet.</p> : (
                <ol className="wizard-schedule">
                  {block.trials.map((t) => {
                    const alarm = t.alarmId ? getAlarm(t.alarmId) : null;
                    const isNow = nowAssembly === t.assembly;
                    const due = isNow && alarm && nowStep === alarm.trigger?.step;
                    return (
                      <li key={t.assembly} className={`${isNow ? "is-now" : ""} ${due ? "is-due" : ""}`}>
                        <strong>Assembly {t.assembly}</strong> · {t.label}
                        {alarm ? (
                          <>
                            <span> · {alarm.id} · {alarm.title}</span>
                            <small> · fire at step "{alarm.trigger?.step}"{alarm.trigger?.layer ? `, layer ${alarm.trigger.layer}` : ""}{alarm.trigger?.offset_s ? `, +${alarm.trigger.offset_s} s` : ""}</small>
                            {isNow && (
                              <Button variant={due ? "danger" : "ink"} size="sm" onClick={() => { channel.current?.post({ type: "cmd", name: "arm", args: {} }); cmd("alarm", { id: alarm.id, planned: true }); }}>
                                {due ? "DUE NOW · fire" : "Fire planned alarm"}
                              </Button>
                            )}
                          </>
                        ) : <span className="muted"> · no alarm, just watch</span>}
                      </li>
                    );
                  })}
                </ol>
              )}
              <p className="muted">Now: {nowAssembly ? `assembly ${nowAssembly}, step "${nowStep}"` : "no assembly running"}. Alarms from the full list below are logged as off-script.</p>
            </div>
          )}
        </Card>

        <Card title={`Alarms · ${s?.process ?? "sign in first"} (off-script)`}>
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
              {helpNote?.alarmId === active.id && <p className="tag tag-warning">Participant opened help · {helpNote.colleague ? `your messages appear as ${helpNote.colleague}` : helpNote.channel === "ai" ? "your messages appear as the AI" : "waiting for them to pick a colleague"} · {formatTime(helpNote.at)}</p>}
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

        <Card title={`Chat · you type as ${helpNote?.colleague ?? (build?.label === "Colleagues" ? "the colleague" : "the AI")}`} className="span-2">
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
