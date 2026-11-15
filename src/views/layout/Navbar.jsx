import { useEffect, useState } from "react";
import { useCellSummary } from "../../controllers/CellController.jsx";
import { useNotifications } from "../../controllers/NotificationController.jsx";
import { useSession } from "../../controllers/SessionController.jsx";
import { useClock } from "../../controllers/useClock.js";
import { getColleaguesOnShift } from "../../services/mesService.js";
import { Avatar, IconButton } from "../components/primitives.jsx";
import { StopCycleButton } from "../components/overlays.jsx";

const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

export function Navbar({ onToggleMenu, menuOpen, panel, onPanel, onStopRequest }) {
  const { operator } = useSession();
  const { canStop } = useCellSummary();
  const { unread } = useNotifications();
  const now = useClock();
  const [colleagues, setColleagues] = useState([]);

  useEffect(() => { getColleaguesOnShift().then(setColleagues); }, []);
  const onShift = colleagues.filter((c) => c.online);

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
      </div>

      <div className="navbar-center">
        <div className="navbar-team" aria-label={`${onShift.length} colleagues on shift`}>
          {onShift.slice(0, 4).map((c) => <Avatar key={c.id} name={c.name} size={32} online />)}
        </div>
        <time className="navbar-clock" dateTime={now.toISOString()}>
          <strong>{timeFmt.format(now)}</strong>
          <small>{dateFmt.format(now)}</small>
        </time>
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
