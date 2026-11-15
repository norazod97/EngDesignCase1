import { useEffect, useState } from "react";
import { useCell } from "../../controllers/CellController.jsx";
import { missingDocs, wpsConsumables } from "../../models/job.js";
import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/overlays.jsx";
import { Button, Checkbox } from "../components/primitives.jsx";

// Checklist items. "step" = in which step of the dialog they are shown
// (0 = Check equipment, 1 = Load parts). "process" = only for that cell type.
// Next only works when all items of that step are ticked.
const CHECKS = [
  { id: "equipment", step: 0, label: "Welding wire and shielding gas match the WPS." },
  { id: "grippers", step: 0, process: "GMAW", label: "ABB grippers are clean.", description: "No spatter, oil or debris on the gripper fingers." },
  { id: "clean", step: 1, label: "Parts are clean.", description: "Wiped with solvent, no oil or debris." },
  { id: "dry", step: 1, label: "Parts are dry.", description: "No moisture or condensation." },
];

/** Wire and gas from the WPS, shown big enough to compare with the spool and bottle labels. */
function WpsConsumables({ wire, gas, file }) {
  return (
    <span className="wps-consumables">
      <span><small>Welding wire</small><strong>{wire}</strong></span>
      <span><small>Shielding gas</small><strong>{gas}</strong></span>
      <span className="muted">From {file}</span>
    </span>
  );
}

/**
 * Guided preparation before starting: checklist → load bin → lock cell →
 * start. Merges the "instruction modal" and the "reminder before start" from
 * the workflow into one sequence so the operator confirms each item once.
 */
export function PrepareCellModal({ open, jobs, onClose, onStarted }) {
  const { state, actions } = useCell();
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setStep(0); setChecks([]); setLoaded(false); setError(""); } }, [open]);

  const STEPS = ["Check equipment", "Load parts", "Lock cell", "Start"];
  // The checklist items of one step, for this cell's process (GMAW or WAAM).
  const checksFor = (n) => CHECKS.filter((c) => c.step === n && (!c.process || c.process === state.process));

  // Wire and gas read from the WPS of the assembly being started.
  const consumables = wpsConsumables(jobs[0]);
  // Are all checklist items of this step ticked?
  const stepChecked = (n) => checksFor(n).every((c) => checks.includes(c.id));
  const canNext = [stepChecked(0), stepChecked(1) && loaded && state.bin.inEnvelope, state.door.locked, true][step];
  const toggleCheck = (id, on) => setChecks((x) => (on ? [...x, id] : x.filter((y) => y !== id)));

  function start() {
    const r = actions.start(jobs, checks);
    if (!r.ok) { setError(r.reason); return; }
    onStarted();
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" eyebrow={`Prepare the cell · ${jobs.length} assembl${jobs.length === 1 ? "y" : "ies"}`} title={STEPS[step]}
      footer={<>
        <Button variant="ghost" onClick={step ? () => setStep(step - 1) : onClose}>{step ? "Back" : "Cancel"}</Button>
        {step < 3
          ? <Button variant="accent" size="lg" iconRight="chevronRight" disabled={!canNext} onClick={() => setStep(step + 1)}>Next</Button>
          : <Button variant="accent" size="lg" icon="play" onClick={start}>Start cycle</Button>}
      </>}>
      <ol className="stepper" aria-label="Preparation steps">
        {STEPS.map((s, i) => <li key={s} className={i < step ? "is-done" : i === step ? "is-current" : ""}>{i < step ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}<span>{s}</span></li>)}
      </ol>

      {step === 0 && (
        <div className="stack">
          {checksFor(0).map((c) => (
            <Checkbox key={c.id} label={c.label} checked={checks.includes(c.id)}
              description={c.id === "equipment" && consumables
                ? <WpsConsumables {...consumables} />
                : c.description}
              onChange={(on) => toggleCheck(c.id, on)} />
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          {/* What to load comes from the assembly data (material + shape), e.g. "S355 steel plates". */}
          {state.process === "WAAM" ? (
            <p className="lead">Put the <strong>{jobs[0]?.parts ?? "part"}</strong> on the table in the cell.</p>
          ) : (
            <p className="lead">
              Put the <strong>{jobs[0]?.parts ?? "parts"}</strong> in the bin in the cell.
              No need to stack them. The robots will find and grab each piece.
            </p>
          )}
          <div className={`callout ${state.bin.inEnvelope ? "callout-positive" : "callout-error"}`}>
            <Icon name={state.bin.inEnvelope ? "check" : "alert"} />
            <div>
              <strong>{state.bin.inEnvelope ? "Bin is on its marked spot" : "Bin is out of the robots' reach"}</strong>
              {!state.bin.inEnvelope && <p>Push the bin back onto the marked spot on the floor.</p>}
            </div>
          </div>
          <ul className="job-mini">{jobs.map((j) => <li key={j.id}><strong>{j.name ?? j.id}</strong> — {j.tags.geometry}, {j.tags.material}</li>)}</ul>
          {/* Clean and dry: checked while loading the parts. */}
          {checksFor(1).map((c) => (
            <Checkbox key={c.id} label={c.label} description={c.description} checked={checks.includes(c.id)} onChange={(on) => toggleCheck(c.id, on)} />
          ))}
          <Checkbox label="I have loaded the parts into the bin" checked={loaded} onChange={setLoaded} />
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <p className="lead">Leave the cell and close the door. Then lock it.</p>
          <div className={`door-row ${state.door.locked ? "is-locked" : "is-unlocked"}`}>
            <Icon name={state.door.locked ? "lock" : "unlock"} size={30} />
            <strong>{state.door.locked ? "Cell door is locked" : "Cell door is unlocked"}</strong>
            {!state.door.locked && <Button variant="accent" icon="lock" onClick={() => actions.lockDoor(true)}>Lock door</Button>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="stack">
          <p className="lead">Everything is ready. The cell will start this assembly and call you if it needs help.</p>
          <ol className="job-mini">{jobs.map((j) => <li key={j.id}><strong>{j.name ?? j.id}</strong></li>)}</ol>
          {jobs.some((j) => missingDocs(j).length) && (
            <div className="callout callout-warning">
              <Icon name="file" />
              <div><strong>Some assemblies are missing CAD or WPS</strong><p>The cell will stop before them and ask you. You can request the documents now from the shift page.</p></div>
            </div>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
