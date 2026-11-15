import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../controllers/NotificationController.jsx";
import { useColleaguesOnShift } from "../../controllers/useColleagues.js";
import { formatTime } from "../../models/job.js";
import { Icon } from "../components/Icon.jsx";
import { Modal } from "../components/overlays.jsx";
import { Avatar, Button, Field, IconButton, TextArea } from "../components/primitives.jsx";

function Drawer({ title, onClose, children }) {
  return (
    <aside className="drawer" aria-label={title}>
      <header className="drawer-head">
        <h2>{title}</h2>
        <IconButton icon="close" label={`Close ${title}`} className="icon-btn-plain" onClick={onClose} />
      </header>
      <div className="drawer-body">{children}</div>
    </aside>
  );
}

export function NotificationsPanel({ onClose }) {
  const { items, markAllRead } = useNotifications();
  useEffect(() => () => markAllRead(), [markAllRead]);
  return (
    <Drawer title="Notifications" onClose={onClose}>
      {items.length === 0 && <p className="empty">Nothing new. Notifications about the cell will appear here.</p>}
      <ul className="notif-list">
        {items.map((n) => (
          <li key={n.id} className={`notif notif-${n.tone} ${n.read ? "" : "is-unread"}`}>
            <time>{formatTime(n.at)}</time>
            <strong>{n.title}</strong>
            {n.body && <p>{n.body}</p>}
            {n.link && <Link to={n.link} onClick={onClose}>Open</Link>}
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

export function MessagesPanel({ onClose }) {
  const people = useColleaguesOnShift();
  return (
    <Drawer title="Messages" onClose={onClose}>
      <p className="muted">Chat with colleagues on this shift. (Conversation threads come in the next iteration.)</p>
      <ul className="people-list">
        {people.map((p) => (
          <li key={p.id}>
            <Avatar name={p.name} photo={p.photo} size={48} status={p.status} />
            <span><strong>{p.name}</strong><small>{p.role} · {p.status === "available" ? "available" : "busy"} · {p.location}</small></span>
            <IconButton icon="chat" label={`Message ${p.name}`} disabled={!p.online} />
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

const HELP_TARGETS = [
  { id: "supervisor", label: "Shift supervisor", who: "Lena de Vries", icon: "user", desc: "Questions about the job, WPS or planning." },
  { id: "maintenance", label: "Maintenance", who: "On-call technician", icon: "wrench", desc: "Something on the cell is broken or worn." },
  { id: "integrator", label: "System integrator", who: "Remote support", icon: "robot", desc: "Robot or software problem you cannot fix here." },
];

/** Help: pick who to call; the request is written to the event log. */
export function HelpModal({ open, context, onClose, onSend }) {
  const [target, setTarget] = useState("supervisor");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(null);

  useEffect(() => { if (open) { setSent(null); setNote(""); setTarget(context ? "maintenance" : "supervisor"); } }, [open, context]);

  const chosen = HELP_TARGETS.find((t) => t.id === target);
  return (
    <Modal open={open} onClose={onClose} title="Call for help" eyebrow={context ? `About: ${context.topic}` : "Help"}
      footer={sent
        ? <Button variant="accent" onClick={onClose}>Close</Button>
        : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" icon="send" onClick={() => { onSend({ target, note, context }); setSent(chosen); }}>Send request</Button></>}
    >
      {sent ? (
        <div className="help-sent"><Icon name="check" size={32} /><p><strong>{sent.label}</strong> has been asked to help. You'll get a notification when they answer.</p></div>
      ) : (
        <>
          <div className="choice-list" role="radiogroup" aria-label="Who do you need?">
            {HELP_TARGETS.map((t) => (
              <label key={t.id} className={`choice ${target === t.id ? "is-selected" : ""}`}>
                <input type="radio" name="help-target" value={t.id} checked={target === t.id} onChange={() => setTarget(t.id)} />
                <Icon name={t.icon} size={28} />
                <span><strong>{t.label}</strong><small>{t.who} — {t.desc}</small></span>
              </label>
            ))}
          </div>
          <Field label="Anything they should know? (optional)" id="help-note">
            <TextArea id="help-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </>
      )}
    </Modal>
  );
}
