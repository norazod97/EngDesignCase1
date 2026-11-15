import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/overlays.jsx";
import { Button, Tag } from "../components/primitives.jsx";

/** Mock WPS viewer. In production this would open the PDF from the PLM/MES. */
export function WpsModal({ job, onClose }) {
  if (!job) return null;
  return (
    <Modal open title={job.wps.file} eyebrow={`Welding procedure · ${job.id}`} onClose={onClose}
      footer={<>
        <Button variant="ghost" icon="download" disabled title="No real file in the simulation">Download PDF</Button>
        <Button variant="accent" onClick={onClose}>Close</Button>
      </>}>
      {job.wps.hasNote && (
        <div className="callout callout-warning">
          <Icon name="note" /> <div><strong>Note from the welding engineer</strong><p>{job.wps.note}</p></div>
        </div>
      )}
      <dl className="spec">
        <dt>Joint</dt><dd>{job.tags.geometry}, butt joint, {job.tags.bevel}-bevel</dd>
        <dt>Base metal</dt><dd>{job.tags.material}</dd>
        <dt>Process</dt><dd>GMAW (135), short-circuit / pulsed</dd>
        <dt>Filler</dt><dd>G3Si1 Ø1.0 mm</dd>
        <dt>Shielding gas</dt><dd>Ar + 18 % CO₂, 14 l/min</dd>
        <dt>Current / voltage</dt><dd>190–230 A / 23–26 V</dd>
        <dt>Travel speed</dt><dd>5.5–6.5 mm/s</dd>
      </dl>
      <p className="muted"><Tag>Simulation</Tag> Parameters are placeholders, not a qualified procedure.</p>
    </Modal>
  );
}
