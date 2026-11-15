import { useCellSummary } from "../../controllers/CellController.jsx";
import { useNotifications } from "../../controllers/NotificationController.jsx";
import { useSession } from "../../controllers/SessionController.jsx";
import { useClock } from "../../controllers/useClock.js";
import { useColleaguesOnShift } from "../../controllers/useColleagues.js";
import { Avatar, IconButton } from "../components/primitives.jsx";
import { StopCycleButton } from "../components/overlays.jsx";

const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

export function Navbar({ onToggleMenu, menuOpen, panel, onPanel, onStopRequest }) {
  const { operator } = useSession();
  const { canStop } = useCellSummary();
  const { unread } = useNotifications();
  const now = useClock();
  // Colleagues on the shop floor (from the controller, not from a service).
  const onShift = useColleaguesOnShift().filter((c) => c.online);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <IconButton icon={menuOpen ? "close" : "menu"} label={menuOpen ? "Close menu" : "Open menu"} onClick={onToggleMenu} aria-expanded={menuOpen} aria-controls="side-menu" />
        {/* Profile page is parked (PLAN T1), so this is plain text, not a link. */}
        <div className="navbar-profile">
          <Avatar name={operator.name} size={40} />
          <span className="navbar-profile-text">
            <strong>{operator.firstName}</strong>
            <small>{operator.badge}</small>
          </span>
        </div>
        {/* Current time and date, on the left next to the operator. */}
        <time className="navbar-clock navbar-clock-left" dateTime={now.toISOString()}>
          <strong>{timeFmt.format(now)}</strong>
          <small>{dateFmt.format(now)}</small>
        </time>
      </div>

      <div className="navbar-center">
        {/* Colleagues as "stories": round picture with the first name under it.
            Green dot = available, red dot = busy. Tap opens the Messages panel. */}
        <ul className="navbar-stories" aria-label={`${onShift.length} colleagues on the shop floor`}>
          {onShift.map((c) => (
            <li key={c.id}>
              <button type="button" className={`story is-${c.status}`} onClick={() => onPanel("messages")} title={`${c.name} · ${c.role} · ${c.status}`}>
                <span className="story-ring"><Avatar name={c.name} photo={c.photo} status={c.status} size={44} /></span>
                <span className="story-name">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="navbar-right">
        <IconButton icon="chat" label="Messages" selected={panel === "messages"} onClick={() => onPanel("messages")} />
        <IconButton icon="bell" label={`Notifications${unread ? `, ${unread} new` : ""}`} badge={unread} selected={panel === "notifications"} onClick={() => onPanel("notifications")} />
        <button type="button" className={`help-btn ${panel === "help" ? "is-selected" : ""}`} onClick={() => onPanel("help")}>
          <span aria-hidden="true">?</span> Help
        </button>
        <StopCycleButton onStop={onStopRequest} disabled={!canStop} compact />
      </div>
    </header>
  );
}
