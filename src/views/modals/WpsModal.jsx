import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/overlays.jsx";
import { Button, Tag } from "../components/primitives.jsx";

/** Mock WPS viewer. In production this would open the PDF from the PLM/MES. */
export function WpsModal({ job, onClose }) {
  if (!job) return null;
  return (
    <Modal open title={job.wps.file} eyebrow={`Welding procedure · ${job.name ?? job.id}`} onClose={onClose}
      footer={<Button variant="accent" onClick={onClose}>Close</Button>}>
      {job.wps.hasNote && (
        <div className="callout callout-warning">
          <Icon name="note" /> <div><strong>Note from the welding engineer</strong><p>{job.wps.note}</p></div>
        </div>
      )}
      <dl className="spec">
        <dt>Joint</dt><dd>{job.tags.geometry}, butt joint, {job.tags.bevel}-bevel</dd>
        <dt>Base metal</dt><dd>{job.tags.material}</dd>
        {/* Values come from the assembly's WPS data (src/mock/fixtures.js). */}
        <dt>Process</dt><dd>{job.wps.process}</dd>
        <dt>Welding wire</dt><dd>{job.wps.wire}</dd>
        <dt>Shielding gas</dt><dd>{job.wps.gas}, {job.wps.gasFlow}</dd>
        <dt>Current / voltage</dt><dd>{job.wps.current} / {job.wps.voltage}</dd>
        <dt>Travel speed</dt><dd>{job.wps.travelSpeed}</dd>
      </dl>
      <p className="muted"><Tag>Simulation</Tag> Parameters are placeholders, not a qualified procedure.</p>
    </Modal>
  );
}
