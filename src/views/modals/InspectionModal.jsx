import { useEffect, useState } from "react";
import { WAAM_TEXT } from "../../i18n/en.js";
import { useCell } from "../../controllers/CellController.jsx";
import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/overlays.jsx";
import { AiBadge, Button, Confidence, Field, TextArea } from "../components/primitives.jsx";

/** Visual NDT: the operator confirms or overrides the AI inspection. The operator has the final say. */
export function InspectionModal({ item, onClose }) {
  const { state, actions } = useCell();
  const [verdict, setVerdict] = useState(null);
  const [comment, setComment] = useState("");
  const [method, setMethod] = useState(null); // WAAM: NDT method (required)
  useEffect(() => { setVerdict(null); setComment(""); setMethod(null); }, [item?.id]);
  if (!item) return null;
  const waam = state.process === "WAAM";

  const ai = item.inspection;
  const disagrees = verdict && verdict !== ai.aiVerdict;

  function confirm() {
    // WAAM: the NDT method is saved with the comment, e.g. "[PT] small pore at the edge".
    actions.confirmInspection(item.id, verdict, waam ? `[${method}] ${comment}`.trim() : comment);
    onClose();
  }

  return (
    <Modal open size="lg" title={`Check · ${item.job?.name ?? item.id}`} eyebrow="Your check" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Later</Button><Button variant="accent" size="lg" icon="check" disabled={!verdict || (disagrees && !comment.trim()) || (waam && !method)} onClick={confirm}>Save my check</Button></>}>
      <div className="inspect">
        <figure className="scan-mock" aria-label="3D scan of the weld bead (simulated)">
          <svg viewBox="0 0 320 120" role="img" aria-hidden="true">
            <rect x="10" y="40" width="140" height="40" fill="#d9d9d9" stroke="#939393" />
            <rect x="170" y="40" width="140" height="40" fill="#d9d9d9" stroke="#939393" />
            <path d="M150 40 Q160 30 170 40 L170 80 Q160 90 150 80 Z" fill="#b5b5b5" stroke="#5c5c5c" />
            {ai.aiVerdict !== "ok" && <ellipse cx="160" cy="78" rx="34" ry="12" fill="rgba(238,32,32,.25)" stroke="#ee2020" strokeDasharray="4 3" />}
          </svg>
          <figcaption>{waam ? "3D scan of the repair compared with the drawing (simulated)" : "Scan of top and root side (simulated)"}{ai.aiVerdict !== "ok" && " — red area: where the AI looked"}</figcaption>
        </figure>

        <section className={`callout ${ai.aiVerdict === "ok" ? "callout-positive" : "callout-error"}`}>
          <Icon name={ai.aiVerdict === "ok" ? "check" : "alert"} />
          <div>
            <strong>AI inspection says: {ai.aiVerdict === "ok" ? "OK" : "NOT OK"} <AiBadge /></strong>
            {ai.findings.map((f) => <p key={f.area}>{f.area}: {f.note} <Confidence value={f.confidence} /></p>)}
          </div>
        </section>

        {/* WAAM: which NDT method was used. PT and MT only see surface defects. */}
        {waam && (
          <fieldset className="verdict ndt-method">
            <legend>{WAAM_TEXT.ndtMethod}</legend>
            <div className="row wrap">
              {[["VT", "Visual"], ["PT", "Dye penetrant"], ["MT", "Magnetic particle"], ["UT", "Ultrasonic"], ["RT", "X-ray"]].map(([code, name]) => (
                <button key={code} type="button" className={`chip chip-lg ${method === code ? "is-selected" : ""}`} onClick={() => setMethod(code)}>
                  <strong>{code}</strong> · {name}
                </button>
              ))}
            </div>
            {(method === "PT" || method === "MT") && <p className="callout callout-warning"><Icon name="alert" /> {WAAM_TEXT.ndtSurfaceWarning}</p>}
            {!method && <p className="muted">{WAAM_TEXT.ndtMethodRequired}</p>}
          </fieldset>
        )}

        <fieldset className="verdict">
          <legend>Look at the part. What do you think?</legend>
          <label className={`choice ${verdict === "ok" ? "is-selected" : ""}`}><input type="radio" name="verdict" checked={verdict === "ok"} onChange={() => setVerdict("ok")} /><Icon name="check" size={28} /><span><strong>OK</strong><small>{waam ? "The repair is good." : "The weld is good."}</small></span></label>
          <label className={`choice ${verdict === "nok" ? "is-selected" : ""}`}><input type="radio" name="verdict" checked={verdict === "nok"} onChange={() => setVerdict("nok")} /><Icon name="close" size={28} /><span><strong>NOT OK</strong><small>{waam ? "The repair has a defect." : "The weld has a defect."}</small></span></label>
        </fieldset>

        <Field label={disagrees ? "You disagree with the AI — please say what you see" : "Comment (optional)"} id="insp-comment">
          <TextArea id="insp-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
