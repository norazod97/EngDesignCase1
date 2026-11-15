import { useCell, useCellSummary } from "../../controllers/CellController.jsx";
import { useSession } from "../../controllers/SessionController.jsx";
import { Icon } from "../components/Icon.jsx";
import { ProcessTracker } from "../widgets/ProcessTracker.jsx";

/** Persistent strip under the navbar: shift, progress ratio, door, live tracker. */
export function StatusBar() {
  const { shift } = useSession();
  const { state } = useCell();
  const { total, finished, active, cycle, steps, jobName, cellName } = useCellSummary();

  return (
    <div className="statusbar" role="region" aria-label="Shift status">
      <div className="statusbar-item">
        <span className="statusbar-label">Cell</span>
        <strong>{cellName ?? (shift ? `Cell ${shift.cellId}` : "—")}</strong>
      </div>
      <div className="statusbar-item">
        <span className="statusbar-label">Assemblies</span>
        <strong><span className="big-num">{finished}</span> / {total} done</strong>
      </div>
      <div className={`statusbar-item door ${state.door.locked ? "is-locked" : "is-unlocked"}`}>
        <Icon name={state.door.locked ? "lock" : "unlock"} />
        <strong>{state.door.locked ? "Cell locked" : "Cell unlocked"}</strong>
      </div>
      {active && <div className="statusbar-tracker"><ProcessTracker cycle={cycle} steps={steps} jobName={jobName} compact /></div>}
    </div>
  );
}
