import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCell } from "../../controllers/CellController.jsx";
import { useSession } from "../../controllers/SessionController.jsx";
import { CATEGORY_LABEL, EventCategory } from "../../models/historian.js";
import { formatDateTime } from "../../models/job.js";
import { Icon } from "../components/Icon.jsx";
import { AiBadge, Avatar, Button, Card, Field, Input, Tag } from "../components/primitives.jsx";

const CERT_TONE = { verified: "positive", pending: "warning", rejected: "error" };
const CERT_TEXT = { verified: "Verified", pending: "Waiting for supervisor", rejected: "Not accepted" };

export function AccountPage() {
  const { operator, shift, addCertification } = useSession();
  const [form, setForm] = useState({ name: "", issuer: "", file: null });
  useEffect(() => { document.title = "My profile · COROB Weld Cell"; }, []);

  function submit(e) {
    e.preventDefault();
    addCertification({ name: form.name, issuer: form.issuer, fileName: form.file?.name ?? null, validUntil: null });
    setForm({ name: "", issuer: "", file: null });
    e.target.reset();
  }

  return (
    <div className="page">
      <h1 className="page-title">My profile</h1>
      <div className="dash-grid">
        <Card title="Me" icon="user">
          <div className="profile">
            <Avatar name={operator.name} size={88} />
            <div>
              <strong className="profile-name">{operator.name}</strong>
              <p>{operator.role} · {operator.badge}</p>
              {shift && <p className="muted">Cell {shift.cellId}, Area {shift.area} · {shift.label}</p>}
            </div>
          </div>
        </Card>
        <Card title="Certificates" icon="file" className="span-2">
          <ul className="cert-list">
            {operator.certifications.length === 0 && <li className="empty">No certificates yet.</li>}
            {operator.certifications.map((c) => (
              <li key={c.id}>
                <span><strong>{c.name}</strong><small>{c.issuer}{c.validUntil ? ` · valid until ${c.validUntil}` : ""}</small></span>
                <Tag tone={CERT_TONE[c.status]} icon={c.status === "verified" ? "check" : undefined}>{CERT_TEXT[c.status]}</Tag>
              </li>
            ))}
          </ul>
          <form className="cert-form" onSubmit={submit}>
            <h3>Add a certificate</h3>
            <Field label="Certificate name" id="c-name" hint="For example: AWS CRAW-O (Certified Robotic Arc Welding Operator)">
              <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Issued by" id="c-issuer"><Input id="c-issuer" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} required /></Field>
            <Field label="Photo or PDF of the certificate" id="c-file" hint="Your supervisor will check it.">
              <input id="c-file" className="file-input" type="file" accept="image/*,application/pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
            </Field>
            <Button type="submit" variant="accent" icon="upload" disabled={!form.name || !form.issuer}>Send for checking</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export function HistorianPage() {
  const { state } = useCell();
  const [filter, setFilter] = useState("all");
  useEffect(() => { document.title = "Event log · COROB Weld Cell"; }, []);
  const rows = useMemo(() => (filter === "all" ? state.log : state.log.filter((e) => e.category === filter)), [state.log, filter]);

  return (
    <div className="page">
      <h1 className="page-title">Event log</h1>
      <p className="muted">Everything the cell, the AI and you did this shift. AI decisions are marked so you can check them later.</p>
      <div className="filter-row" role="group" aria-label="Filter events">
        {["all", ...Object.values(EventCategory)].map((c) => (
          <button key={c} type="button" className={`chip ${filter === c ? "is-selected" : ""}`} aria-pressed={filter === c} onClick={() => setFilter(c)}>
            {c === "all" ? "All" : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <Card>
        {rows.length === 0 ? <p className="empty">No events yet.</p> : (
          <ol className="event-list">
            {rows.map((e) => (
              <li key={e.id} className={`ev ev-${e.category}`}>
                <time dateTime={e.at}>{formatDateTime(e.at)}</time>
                <span className="ev-cat">{e.category === "ai" ? <AiBadge>AI decision</AiBadge> : CATEGORY_LABEL[e.category]}</span>
                <span className="ev-msg">{e.message}{e.details?.comment ? <em> — “{e.details.comment}”</em> : null}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

export function LabelingPage() {
  useEffect(() => { document.title = "Label defects · COROB Weld Cell"; }, []);
  return (
    <div className="page">
      <h1 className="page-title">Teach the defect finder <AiBadge /></h1>
      <Card>
        <div className="placeholder">
          <Icon name="tag" size={40} />
          <p><strong>Planned for the next iteration.</strong> Images from the profilometer and AI-SPECTO will appear here with the AI's attention map (SHAP). You mark what is really a defect with one tap.</p>
          <Link to="/dashboard" className="btn btn-ghost btn-md"><span>Back to dashboard</span></Link>
        </div>
      </Card>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="page"><h1 className="page-title">Page not found</h1><Link to="/shift" className="btn btn-accent btn-md"><span>Go to my shift</span></Link></div>
  );
}
