import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCell, useCellSummary } from "../../controllers/CellController.jsx";
import { CycleState } from "../../models/cellModel.js";
import { Icon } from "../components/Icon.jsx";
import { Button, Card, ProgressBar } from "../components/primitives.jsx";
import { InspectionModal } from "../modals/InspectionModal.jsx";
import { ProcessTracker } from "../widgets/ProcessTracker.jsx";
import { EquipmentWidget, HistorianWidget, LabelingWidget, StockWidget, TelemetryWidget } from "../widgets/Widgets.jsx";

function CycleCard() {
  const { state, actions } = useCell();
  const { cycle, active, total, finished } = useCellSummary();
  const { requestHelp } = useOutletContext();
  const [error, setError] = useState("");

  function resume() {
    const r = actions.resume();
    setError(r.ok ? "" : r.reason);
  }

  if (!active && cycle.state !== CycleState.COMPLETE) {
    return (
      <Card title="Cell is ready" icon="play" className="span-2">
        <p className="lead">No assemblies are running. Choose what to weld on the shift page.</p>
        <Link to="/shift" className="btn btn-accent btn-lg"><span>Go to my assemblies</span></Link>
      </Card>
    );
  }

  return (
    <Card title="Current assembly" icon="robot" className="span-2" tone={cycle.state === CycleState.HALTED ? "error" : cycle.state === CycleState.WAITING ? "warning" : undefined}>
      <ProcessTracker cycle={cycle} />
      <div className="shift-ratio">
        <span>Shift progress: <strong>{finished} of {total}</strong> assemblies</span>
        <ProgressBar value={total ? finished / total : 0} label="Shift progress" />
      </div>

      {cycle.state === CycleState.WAITING && cycle.blocker && (
        <div className="callout callout-warning">
          <Icon name="file" />
          <div>
            <strong>{cycle.blocker.jobId} is missing its {cycle.blocker.missing.join(" and ")}</strong>
            <p>The cell can't weld without them. Ask your supervisor to upload them, or skip this assembly for now.</p>
            <div className="row">
              <Button variant="accent" icon="upload" onClick={() => actions.log(`Requested ${cycle.blocker.missing.join(" + ")} for ${cycle.blocker.jobId}.`, { jobId: cycle.blocker.jobId })}>Ask supervisor</Button>
              <Button variant="ghost" onClick={actions.skipBlockedJob}>Skip this one</Button>
            </div>
          </div>
        </div>
      )}

      {(cycle.state === CycleState.HALTED || cycle.state === CycleState.STOPPED) && !state.activeAlarm && (
        <div className="callout callout-warning">
          <Icon name="stop" />
          <div>
            <strong>The cell is stopped</strong>
            <p>Make sure nobody is inside, lock the door, then resume.</p>
            <div className="row">
              {!state.door.locked && <Button variant="ink" icon="lock" onClick={() => actions.lockDoor(true)}>Lock door</Button>}
              <Button variant="accent" icon="play" onClick={resume}>Resume cycle</Button>
              <Button variant="ghost" icon="wrench" onClick={() => requestHelp({ topic: "Cell stopped" })}>Request help</Button>
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
          </div>
        </div>
      )}

      {cycle.state === CycleState.COMPLETE && (
        <div className="callout callout-positive"><Icon name="check" /><div><strong>All selected assemblies are welded.</strong><p>Check the results below, then pick the next ones on the shift page.</p></div></div>
      )}
    </Card>
  );
}

function ReviewCard() {
  const { awaitingReview } = useCellSummary();
  const [item, setItem] = useState(null);
  return (
    <Card title="Parts to check" icon="eye" id="review" tone={awaitingReview.length ? "accent" : undefined}>
      {awaitingReview.length === 0 ? <p className="empty">Finished parts that need your check will show up here.</p> : (
        <ul className="review-list">
          {awaitingReview.map((r) => (
            <li key={r.id}>
              <span className="mono">{r.id}</span>
              <span className={`verdict-pill ${r.inspection.aiVerdict}`}>AI: {r.inspection.aiVerdict === "ok" ? "OK" : "NOT OK"}</span>
              <Button variant="accent" size="sm" onClick={() => setItem(r)}>Check part</Button>
            </li>
          ))}
        </ul>
      )}
      <InspectionModal item={item} onClose={() => setItem(null)} />
    </Card>
  );
}

export function DashboardPage() {
  useEffect(() => { document.title = "Cell dashboard · COROB Weld Cell"; }, []);
  return (
    <div className="page">
      <h1 className="page-title">Cell dashboard</h1>
      <div className="dash-grid">
        <CycleCard />
        <ReviewCard />
        <EquipmentWidget />
        <TelemetryWidget />
        <StockWidget />
        <HistorianWidget />
        <LabelingWidget />
      </div>
    </div>
  );
}
