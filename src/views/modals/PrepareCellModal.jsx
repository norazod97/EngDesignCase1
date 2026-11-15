import { useEffect, useState } from "react";
import { useCell } from "../../controllers/CellController.jsx";
import { missingDocs } from "../../models/job.js";
import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/overlays.jsx";
import { Button, Checkbox } from "../components/primitives.jsx";

const CHECKS = [
  { id: "equipment", label: "The right equipment is in the cell", description: "Wire, gas and torch match the WPS." },
  { id: "clean", label: "Parts and equipment are clean", description: "Wiped with solvent, no oil or debris." },
  { id: "dry", label: "Parts are dry", description: "No moisture or condensation." },
];

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

  const STEPS = ["Check", "Load parts", "Lock cell", "Start"];
  const canNext = [checks.length === CHECKS.length, loaded && state.bin.inEnvelope, state.door.locked, true][step];

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
          {CHECKS.map((c) => (
            <Checkbox key={c.id} label={c.label} description={c.description} checked={checks.includes(c.id)}
              onChange={(on) => setChecks((x) => (on ? [...x, c.id] : x.filter((y) => y !== c.id)))} />
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <p className="lead">Put the parts in the bin inside the cell. You don't need to line them up — the robots find them.</p>
          <div className={`callout ${state.bin.inEnvelope ? "callout-positive" : "callout-error"}`}>
            <Icon name={state.bin.inEnvelope ? "check" : "alert"} />
            <div>
              <strong>{state.bin.inEnvelope ? "Bin is on its marked spot" : "Bin is out of the robots' reach"}</strong>
              {!state.bin.inEnvelope && <p>Push the bin back onto the marked spot on the floor.</p>}
            </div>
          </div>
          <ul className="job-mini">{jobs.map((j) => <li key={j.id}><span className="mono">{j.id}</span> — {j.tags.geometry}, {j.tags.material}</li>)}</ul>
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
          <p className="lead">Everything is ready. The cell will weld these assemblies one after the other and call you if it needs help.</p>
          <ol className="job-mini">{jobs.map((j) => <li key={j.id}><span className="mono">{j.id}</span></li>)}</ol>
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
