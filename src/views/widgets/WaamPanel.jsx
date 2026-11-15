// VIEW — the WAAM repair screens (PLAN T15), shown under the step tracker on the
// dashboard. One panel per step: mount guide, scan coverage, edge marking,
// damaged areas (open each before confirming), AI build plan, layer-by-layer
// build with the interpass temperature, final scan. Data and actions come from
// the WaamController hook; this file only draws them.
import { useEffect, useState } from "react";
import { useWaam } from "../../controllers/WaamController.js";
import { WAAM_TEXT as T } from "../../i18n/en.js";
import { Icon } from "../components/Icon.jsx";
import { AiBadge, Button, Confidence, ProgressBar } from "../components/primitives.jsx";

/** Simple drawing of the part between two clamping jaws (mount guide). */
function MountGuide() {
  return (
    <svg className="waam-figure" viewBox="0 0 220 110" role="img" aria-label={T.mountFigure}>
      <rect x="20" y="30" width="34" height="56" fill="#5c5c5c" />
      <rect x="166" y="30" width="34" height="56" fill="#5c5c5c" />
      <rect x="54" y="38" width="112" height="40" fill="#d9d9d9" stroke="#1e1e1e" strokeWidth="2" />
      <path d="M8 58h10M212 58h-10" stroke="#ff7514" strokeWidth="4" markerEnd="url(#arr)" />
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0L6 3L0 6z" fill="#ff7514" /></marker></defs>
    </svg>
  );
}

/** Deviation map: the part with the damaged areas the AI found (opened areas in orange). */
function DeviationMap({ regions, opened, current }) {
  return (
    <svg className="waam-figure" viewBox="0 0 100 80" role="img" aria-label={T.mapFigure}>
      <rect x="8" y="10" width="84" height="60" fill="#e6e6e6" stroke="#1e1e1e" strokeWidth="1" />
      {regions.map((r) => (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={opened.includes(r.id) ? "rgba(255,117,20,.45)" : "rgba(238,32,32,.35)"}
            stroke={current === r.id ? "#1e1e1e" : "#ee2020"} strokeWidth={current === r.id ? 1.5 : 0.8} strokeDasharray="2 1" />
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 2} textAnchor="middle" fontSize="6" fontWeight="700" fill="#1e1e1e">{r.id}</text>
        </g>
      ))}
    </svg>
  );
}

/** AI card: what the AI decided, with confidence. Always marked with the purple AI badge. */
function AiCard({ title, decision }) {
  if (!decision) return null;
  return (
    <section className="sbar-block sbar-ai">
      <h3>{title} <AiBadge /></h3>
      <p className="sbar-lead">{decision.what}</p>
      {decision.confidence_value != null && <Confidence value={decision.confidence_value} />}
    </section>
  );
}

/** Interpass temperature over time, with the maximum allowed as a red line. */
function TempChart({ history, max }) {
  const W = 300; const H = 110; const top = 300; // °C at the top of the chart
  const y = (c) => H - (c / top) * H;
  const pts = history.map((c, i) => `${(i / Math.max(1, history.length - 1)) * W},${y(c).toFixed(1)}`).join(" ");
  return (
    <svg className="waam-chart" viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label={T.chartLabel}>
      <line x1="0" x2={W} y1={y(max)} y2={y(max)} stroke="#ee2020" strokeDasharray="5 4" strokeWidth="1.5" />
      <text x={W - 2} y={y(max) - 4} textAnchor="end" fontSize="10" fill="#b30f0f">{T.maxLine(max)}</text>
      {history.length > 1 && <polyline points={pts} fill="none" stroke="#ff7514" strokeWidth="2.5" />}
      <line x1="0" x2={W} y1={H} y2={H} stroke="#1e1e1e" />
      <text x="0" y={H + 12} fontSize="10" fill="#5c5c5c">{T.chartAxis}</text>
    </svg>
  );
}

export function WaamPanel() {
  const w = useWaam();
  const [opened, setOpened] = useState([]); // damaged areas the operator has opened
  const [current, setCurrent] = useState(null); // area shown in detail
  const [error, setError] = useState("");
  const stepId = w.step?.id;

  // New step: clear messages; new assembly: clear opened areas.
  useEffect(() => { setError(""); if (stepId === "mount") { setOpened([]); setCurrent(null); } }, [stepId]);
  if (!w.isWaam || !w.step || stepId === "ndt") return null;

  function confirm() {
    const r = w.confirm();
    setError(r.ok ? "" : r.reason);
  }

  function openArea(r) {
    setCurrent(r.id);
    if (!opened.includes(r.id)) {
      setOpened((o) => [...o, r.id]);
      w.log(`Opened damaged area ${r.id} (${r.label}).`, { region: r.id });
    }
  }

  const s = w.scenario;
  const button = (label, disabled) => (
    <Button variant="accent" size="lg" icon="check" disabled={disabled} onClick={confirm}>{label}</Button>
  );

  return (
    <div className="waam-panel">
      {/* 1. Mount the part (operator). */}
      {stepId === "mount" && w.waiting && (
        <div className="callout callout-accent">
          <Icon name="wrench" />
          <div className="stack">
            <strong>{w.step.label}</strong>
            <p>{s.messages.mount ?? w.step.hint}</p>
            <MountGuide />
            <p className="muted">{T.mountCaption}</p>
            <div className="row">{button(w.step.action)}</div>
          </div>
        </div>
      )}

      {/* 2. Scan (robot guided by hand): coverage grows. */}
      {stepId === "scan" && (
        <div className="stack">
          <p>{s.messages.scan}</p>
          <ProgressBar value={w.live.scanCoverage / 100} label={T.coverage} />
          <p><strong>{T.coverage}: {w.live.scanCoverage} %</strong></p>
        </div>
      )}

      {/* 3. Mark the edges with the edge finder (operator). The AI says how well the scan matches the CAD. */}
      {stepId === "mark" && w.waiting && (
        <div className="stack">
          <AiCard title={T.alignment} decision={s.alignment} />
          <div className="callout callout-accent">
            <Icon name="eye" />
            <div className="stack">
              <strong>{w.step.label}</strong>
              <p>{s.messages.mark ?? w.step.hint}</p>
              <div className="row">{button(w.step.action)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Damaged areas: open each one before confirming (operator). */}
      {stepId === "confirm_regions" && w.waiting && (
        <div className="stack">
          <AiCard title={T.regionsTitle} decision={s.regionAi} />
          <div className="waam-regions">
            <DeviationMap regions={s.regions} opened={opened} current={current} />
            <ul className="waam-region-list">
              {s.regions.map((r) => (
                <li key={r.id} className={opened.includes(r.id) ? "is-opened" : ""}>
                  <Button variant={current === r.id ? "ink" : "ghost"} icon={opened.includes(r.id) ? "check" : "eye"} onClick={() => openArea(r)}>
                    {T.openArea(r.id)}
                  </Button>
                  {current === r.id && <p><strong>{r.label}</strong><br />{T.areaDetail(r.depth_mm, r.length_mm)}</p>}
                </li>
              ))}
            </ul>
          </div>
          {opened.length < s.regions.length && <p className="muted">{T.openAll(s.regions.length - opened.length)}</p>}
          <div className="row">{button(w.step.action, opened.length < s.regions.length)}</div>
        </div>
      )}

      {/* 5 + 6. The AI build plan, then the operator starts the build. */}
      {(stepId === "params" || stepId === "ready") && (
        <div className="stack">
          <AiCard title={T.planTitle} decision={s.plan} />
          {stepId === "params" && <p className="muted">{T.planning}</p>}
          {stepId === "ready" && w.waiting && (
            <div className="callout callout-accent">
              <Icon name="play" />
              <div className="stack">
                <strong>{w.step.label}</strong>
                <p>{w.step.hint}</p>
                <div className="row">
                  {!w.doorLocked && <Button variant="ink" icon="lock" onClick={w.lockDoor}>{T.lockDoor}</Button>}
                  <Button variant="accent" size="lg" icon="play" onClick={confirm}>{w.step.action}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Build layer by layer. Cooling between layers is normal work (still running). */}
      {stepId === "build" && w.live.layer && (
        <div className="stack">
          <div className="waam-build-head">
            <span className="big-num">{T.layerOf(w.live.layer, w.live.layers)}</span>
            <span className={`tag ${w.live.phase === "cooling" ? "tag-info" : "tag-positive"}`}>
              {w.live.phase === "cooling" && w.live.layer < w.live.layers ? T.cooling(w.live.layer + 1) : T.adding}
            </span>
            <span>{T.interpass}: <strong>{w.live.interpassC} °C</strong></span>
          </div>
          <TempChart history={w.live.tempHistory} max={w.maxInterpassC} />
        </div>
      )}

      {/* 8. Final scan: the step text above already says what happens. */}

      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
