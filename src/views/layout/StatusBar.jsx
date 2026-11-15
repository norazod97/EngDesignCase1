import { useCell, useCellSummary } from "../../controllers/CellController.jsx";
import { useSession } from "../../controllers/SessionController.jsx";
import { Icon } from "../components/Icon.jsx";
import { ProcessTracker } from "../widgets/ProcessTracker.jsx";
import { ALARM_TEXT } from "../../i18n/en.js";

/** Persistent strip under the navbar: shift, progress ratio, door, live tracker. */
export function StatusBar() {
  const { shift } = useSession();
  const { state } = useCell();
  const { total, finished, active, cycle, steps, jobName, cellName } = useCellSummary();
  // Quiet alerts recorded for the assembly in the cell (shown later in the assembly report).
  const recorded = state.quietEvents.filter((e) => e.jobId === cycle.currentJobId && !e.shown).length;

  return (
    <div className="statusbar" role="region" aria-label="Shift status">
      {/* Shift time slot, e.g. 14:00–22:00. */}
      <div className="statusbar-item">
        <span className="statusbar-label">Shift</span>
        <strong>{shift?.start ? `${shift.start}–${shift.end}` : "—"}</strong>
      </div>
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
      {recorded > 0 && (
        <div className="statusbar-item">
          <Icon name="note" />
          <strong>{ALARM_TEXT.eventsRecorded(recorded)}</strong>
        </div>
      )}
      {active && <div className="statusbar-tracker"><ProcessTracker cycle={cycle} steps={steps} jobName={jobName} compact /></div>}
    </div>
  );
}
