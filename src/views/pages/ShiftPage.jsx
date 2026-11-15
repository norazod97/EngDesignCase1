import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCell } from "../../controllers/CellController.jsx";
import { useNotifications } from "../../controllers/NotificationController.jsx";
import { useSession } from "../../controllers/SessionController.jsx";
import { formatDateTime, JOB_STATUS_LABEL, JobStatus, missingDocs } from "../../models/job.js";
import { Icon } from "../components/Icon.jsx";
import { Button, Checkbox, Tag } from "../components/primitives.jsx";
import { PrepareCellModal } from "../modals/PrepareCellModal.jsx";
import { WpsModal } from "../modals/WpsModal.jsx";

export function ShiftPage() {
  const { operator, shift, jobs } = useSession();
  const { state, actions } = useCell();
  const { push } = useNotifications();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [requested, setRequested] = useState({});
  const [wpsJob, setWpsJob] = useState(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => { document.title = "My shift · COROB Weld Cell"; }, []);

  // Docs may have been uploaded mid-shift (wizard) — prefer the cell's copy.
  const rows = useMemo(() => jobs.map((j) => ({ ...j, ...(state.jobs[j.id] ?? {}), progress: state.jobProgress[j.id] })), [jobs, state.jobs, state.jobProgress]);
  // Jobs without CAD/WPS can be queued: the cell stops before them and asks
  // for the documents (workflow UC1). Only finished jobs are locked.
  const selectable = (j) => !j.progress || j.progress.status === JobStatus.QUEUED;
  const cellBusy = ["running", "halted", "waiting"].includes(state.cycle.state);
  const selectedJobs = rows.filter((r) => selected.includes(r.id));

  function toggle(id, on) {
    setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  }

  function requestDocs(job) {
    const missing = missingDocs(job);
    actions.log(`Requested ${missing.join(" + ")} upload for ${job.id}.`, { jobId: job.id, to: "supervisor" });
    setRequested((r) => ({ ...r, [job.id]: true }));
    push({ tone: "info", title: "Request sent", body: `Your supervisor was asked to upload the ${missing.join(" and ")} for ${job.id}.` });
  }

  function onStarted() {
    setPreparing(false);
    setSelected([]);
    navigate("/dashboard");
  }

  return (
    <div className="page">
      <section className="welcome">
        <h1>Nice to see you here, {operator.firstName}!</h1>
        {shift ? (
          <p className="welcome-lead">
            In the current shift you have been assigned to <strong>{shift.process}</strong> in <strong>cell {shift.cellId}</strong>, <strong>Area {shift.area}</strong>.
            <span className="muted"> {shift.label}, {shift.start}–{shift.end}.</span>
          </p>
        ) : <p>No shift assigned. Please ask your supervisor.</p>}
      </section>

      <section className="card">
        <header className="card-head">
          <h2 className="card-title"><Icon name="box" /> Assemblies for this shift</h2>
          <div className="card-actions">
            <span className="muted">{selected.length} selected</span>
            <Button variant="accent" size="lg" icon="play" disabled={!selected.length || cellBusy} onClick={() => setPreparing(true)}>
              Prepare &amp; start
            </Button>
          </div>
        </header>
        {cellBusy && <p className="inline-note"><Icon name="info" size={18} /> The cell is busy. You can add more assemblies when it has finished.</p>}

        <div className="table-wrap">
          <table className="job-table">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Select</span></th>
                <th scope="col">Job ID</th>
                <th scope="col">Weld</th>
                <th scope="col">CAD</th>
                <th scope="col">WPS</th>
                <th scope="col">Received</th>
                <th scope="col">Due</th>
                <th scope="col">Welding engineer</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => {
                const missing = missingDocs(j);
                const status = j.progress?.status ?? JobStatus.QUEUED;
                return (
                  <tr key={j.id} className={selected.includes(j.id) ? "is-selected" : ""}>
                    <td data-label="Select">
                      <Checkbox label={<span className="sr-only">Select {j.id}</span>} checked={selected.includes(j.id)} disabled={!selectable(j) || cellBusy} onChange={(on) => toggle(j.id, on)} />
                    </td>
                    <td data-label="Job ID"><strong className="mono">{j.id}</strong><br /><span className="muted">Weld {j.weldNo}</span></td>
                    <td data-label="Weld">
                      <div className="tags"><Tag>{j.tags.geometry}</Tag><Tag>{j.tags.material}</Tag></div>
                    </td>
                    <td data-label="CAD">
                      {j.cad ? <span className="doc"><Icon name="file" size={18} /> .STEP</span> : <Tag tone="error" icon="alert">Missing</Tag>}
                    </td>
                    <td data-label="WPS">
                      {j.wps ? (
                        <div className="doc-cell">
                          <Button variant="ghost" size="sm" icon="file" onClick={() => setWpsJob(j)}>Open PDF</Button>
                          <div className="tags">
                            <Tag>{j.tags.bevel}-bevel</Tag>
                            {j.wps.hasNote && <Tag tone="warning" icon="note">Note</Tag>}
                          </div>
                        </div>
                      ) : <Tag tone="error" icon="alert">Missing</Tag>}
                    </td>
                    <td data-label="Received">{formatDateTime(j.receivedAt)}</td>
                    <td data-label="Due"><strong>{formatDateTime(j.dueAt)}</strong></td>
                    <td data-label="Engineer">
                      <span className="contact">
                        {j.commissioner.name}
                        <a href={`mailto:${j.commissioner.email}`} aria-label={`Email ${j.commissioner.name}`}><Icon name="mail" size={18} /></a>
                        <a href={`tel:${j.commissioner.phone}`} aria-label={`Call ${j.commissioner.name}`}><Icon name="phone" size={18} /></a>
                      </span>
                    </td>
                    <td data-label="Status">
                      {missing.length ? (
                        requested[j.id]
                          ? <Tag tone="info" icon="check">Requested</Tag>
                          : <Button variant="ghost" size="sm" icon="upload" onClick={() => requestDocs(j)}>Ask for {missing.join(" + ")}</Button>
                      ) : <Tag tone={status === JobStatus.DONE ? "positive" : status === JobStatus.REJECTED ? "error" : "neutral"}>{JOB_STATUS_LABEL[status]}</Tag>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <WpsModal job={wpsJob} onClose={() => setWpsJob(null)} />
      <PrepareCellModal open={preparing} jobs={selectedJobs} onClose={() => setPreparing(false)} onStarted={onStarted} />
    </div>
  );
}
