import { useCellSummary } from "../../controllers/CellController.jsx";
import { useNotifications } from "../../controllers/NotificationController.jsx";
import { useSession } from "../../controllers/SessionController.jsx";
import { useClock } from "../../controllers/useClock.js";
import { useFeature } from "../../controllers/ConditionController.js";
import { useHelp } from "../../controllers/HelpController.jsx";
import { Avatar, IconButton } from "../components/primitives.jsx";
import { StopCycleButton } from "../components/overlays.jsx";

const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

export function Navbar({ onToggleMenu, menuOpen, panel, onPanel, helpOpen, onHelp, onStopRequest }) {
  const { operator } = useSession();
  const { canStop } = useCellSummary();
  const { unread } = useNotifications();
  const now = useClock();
  const help = useHelp();
  // Colleague pictures only in the colleagues build (chatbot build: no avatars).
  const showColleagues = useFeature("colleagueAvatars");
  const onShift = help.colleagues.filter((c) => c.online);

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
            Green dot = available, red dot = busy. Tap = call that colleague (logged). */}
        {showColleagues && <ul className="navbar-stories" aria-label={`${onShift.length} colleagues on the shop floor`}>
          {onShift.map((c) => (
            <li key={c.id}>
              <button type="button" className={`story is-${c.status}`} onClick={() => help.openHelp({ via: "avatar", who: c })} title={`${c.name} · ${c.role} · ${c.status}`}>
                <span className="story-ring"><Avatar name={c.name} photo={c.photo} status={c.status} size={44} /></span>
                <span className="story-name">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>}
      </div>

      <div className="navbar-right">
        <IconButton icon="bell" label={`Notifications${unread ? `, ${unread} new` : ""}`} badge={unread} selected={panel === "notifications"} onClick={() => onPanel("notifications")} />
        {/* Help is always one tap away: opens the AI (chatbot build) or the colleague list (colleagues build). */}
        <button type="button" className={`help-btn ${helpOpen ? "is-selected" : ""}`} onClick={onHelp}>
          <span aria-hidden="true">?</span> Help
        </button>
        <StopCycleButton onStop={onStopRequest} disabled={!canStop} compact />
      </div>
    </header>
  );
}
