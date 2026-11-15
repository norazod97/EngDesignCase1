// VIEW — the cell dashboard, the first page after login.
// Shows: the list of study assemblies (start the next one), the assembly in the
// cell with its steps, and the robots / weld signals. No logic here: data and
// actions come from the CellController hooks.
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAssemblies, useCell, useCellSummary } from "../../controllers/CellController.jsx";
import { CycleState } from "../../models/cellModel.js";
import { Icon } from "../components/Icon.jsx";
import { Button, Card, Tag } from "../components/primitives.jsx";
import { InspectionModal } from "../modals/InspectionModal.jsx";
import { WpsModal } from "../modals/WpsModal.jsx";
import { PrepareCellModal } from "../modals/PrepareCellModal.jsx";
import { ProcessTracker } from "../widgets/ProcessTracker.jsx";
import { EquipmentWidget } from "../widgets/Widgets.jsx";
// parked for the study (PLAN T1): StockWidget, HistorianWidget, LabelingWidget, TelemetryWidget (weld signals).

// Colour of the status tag in the assembly list.
const STATUS_TONE = { todo: "neutral", active: "info", done: "positive" };

/**
 * The table of assemblies for this cell: weld ID, CAD drawing, WPS and status.
 * Only the next assembly has a Start button. The table never shows which
 * assembly has an anomaly (study rule).
 */
function AssemblyList({ onStart, onOpenWps }) {
  const assemblies = useAssemblies();
  const { process, cellName } = useCellSummary();
  return (
    <Card title={`Your assemblies · ${cellName ?? process}`} icon="box" className="span-2 assembly-card">
      <div className="table-wrap">
        <table className="job-table assembly-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Assembly</th>
              <th scope="col">Weld ID</th>
              <th scope="col">CAD</th>
              <th scope="col">WPS</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {assemblies.map((a, i) => (
              <tr key={a.id} className={`is-${a.status} ${a.isNext ? "is-next" : ""}`}>
                {/* Number circle: a tick when done. */}
                <td data-label="#">
                  <span className="assembly-dot" aria-hidden="true">
                    {a.status === "done" ? <Icon name="check" size={18} strokeWidth={3} /> : i + 1}
                  </span>
                </td>
                <td data-label="Assembly">
                  <strong className="assembly-title">{a.name}</strong>
                  <small className="muted assembly-sub">{a.tags.geometry} · {a.tags.material}</small>
                </td>
                <td data-label="Weld ID"><span className="mono">{a.weldNo}</span></td>
                {/* CAD drawing of the part (.STEP). */}
                <td data-label="CAD">
                  {a.cad ? <span className="doc"><Icon name="file" size={18} /> .STEP</span> : <Tag tone="error" icon="alert">Missing</Tag>}
                </td>
                {/* Welding procedure: opens the PDF viewer. */}
                <td data-label="WPS">
                  {a.wps ? <Button variant="ghost" size="sm" icon="file" onClick={() => onOpenWps(a)}>Open PDF</Button> : <Tag tone="error" icon="alert">Missing</Tag>}
                </td>
                <td data-label="Status"><Tag tone={STATUS_TONE[a.status]}>{a.statusText}</Tag></td>
                {/* Start button only on the next assembly, and only when the cell is free. */}
                <td data-label="">
                  {a.isNext && (
                    <Button variant="accent" size="lg" icon="play" disabled={!a.canStart} onClick={() => onStart(a)}>Start</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {assemblies.every((a) => a.status === "done") && (
        <div className="callout callout-positive"><Icon name="check" /><div><strong>All assemblies are done.</strong><p>Thank you! Please tell the researcher.</p></div></div>
      )}
    </Card>
  );
}

/** The assembly in the cell: its steps, and what the operator must do now. */
function CycleCard() {
  const { state, actions } = useCell();
  const { cycle, active, steps, step, jobName, waitingFor, ndtItem } = useCellSummary();
  const { requestHelp } = useOutletContext();
  const [error, setError] = useState("");
  const [ndtOpen, setNdtOpen] = useState(false);

  // Operator presses Weld / Build at the "ready" step.
  function confirmReady() {
    const r = actions.confirmStep();
    setError(r.ok ? "" : r.reason);
  }

  function resume() {
    const r = actions.resume();
    setError(r.ok ? "" : r.reason);
  }

  // Nothing in the cell yet: the assembly list above is enough.
  if (!active && cycle.state !== CycleState.COMPLETE) return null;

  return (
    <Card title="Now in the cell" icon="robot" className="span-2" tone={cycle.state === CycleState.HALTED ? "error" : undefined}>
      <ProcessTracker cycle={cycle} steps={steps} jobName={jobName} />

      {/* Operator step 1: check the path / plan, then start the arc. */}
      {waitingFor === "ready" && (
        <div className="callout callout-accent">
          <Icon name="play" />
          <div>
            <strong>{step.label}</strong>
            <p>{step.hint}</p>
            <div className="row">
              {!state.door.locked && <Button variant="ink" icon="lock" onClick={() => actions.lockDoor(true)}>Lock door</Button>}
              <Button variant="accent" size="lg" icon="play" onClick={confirmReady}>{step.action ?? "Continue"}</Button>
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
          </div>
        </div>
      )}

      {/* Operator step 2: look at the result and record OK / NOT OK. */}
      {waitingFor === "ndt" && ndtItem && (
        <div className="callout callout-accent">
          <Icon name="eye" />
          <div>
            <strong>{step.label}</strong>
            <p>The AI finished scanning. {step.hint}</p>
            <div className="row">
              <Button variant="accent" size="lg" icon="eye" onClick={() => setNdtOpen(true)}>Check the result</Button>
            </div>
          </div>
          <InspectionModal item={ndtOpen ? ndtItem : null} onClose={() => setNdtOpen(false)} />
        </div>
      )}

      {/* Stopped with no open alarm (stop button, or alarm already handled). */}
      {(cycle.state === CycleState.HALTED || cycle.state === CycleState.STOPPED) && !state.activeAlarm && (
        <div className="callout callout-warning">
          <Icon name="stop" />
          <div>
            <strong>The cell is stopped</strong>
            <p>Make sure nobody is inside. Lock the door, then resume.</p>
            <div className="row">
              {!state.door.locked && <Button variant="ink" icon="lock" onClick={() => actions.lockDoor(true)}>Lock door</Button>}
              <Button variant="accent" size="lg" icon="play" onClick={resume}>Resume</Button>
              <Button variant="ghost" icon="wrench" onClick={() => requestHelp({ topic: "Cell stopped" })}>Request help</Button>
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
          </div>
        </div>
      )}

      {cycle.state === CycleState.COMPLETE && (
        <div className="callout callout-positive"><Icon name="check" /><div><strong>Assembly done.</strong><p>Start the next one in the list.</p></div></div>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const [starting, setStarting] = useState(null); // the assembly being prepared, or null
  const [wpsJob, setWpsJob] = useState(null); // the assembly whose WPS is open, or null

  useEffect(() => { document.title = "Cell dashboard · COROB Weld Cell"; }, []);

  return (
    <div className="page">
      <h1 className="page-title">Cell dashboard</h1>
      <div className="dash-grid">
        <AssemblyList onStart={setStarting} onOpenWps={setWpsJob} />
        <CycleCard />
        <EquipmentWidget />
      </div>
      <WpsModal job={wpsJob} onClose={() => setWpsJob(null)} />
      {/* Guided start: checklist -> load parts -> lock cell -> start (one assembly at a time). */}
      <PrepareCellModal open={!!starting} jobs={starting ? [starting] : []} onClose={() => setStarting(null)} onStarted={() => setStarting(null)} />
    </div>
  );
}
