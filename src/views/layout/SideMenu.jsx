import { NavLink } from "react-router-dom";
import { useSession } from "../../controllers/SessionController.jsx";
import { Icon } from "../components/Icon.jsx";
import { Avatar, Button } from "../components/primitives.jsx";

// Menu links. Shift, Event log, Label defects and My profile are parked for the study (PLAN T1).
const LINKS = [
  { to: "/dashboard", label: "Cell dashboard", icon: "grid" },
];

export function SideMenu({ open, onNavigate }) {
  const { operator, signOut, shift } = useSession();
  return (
    <nav id="side-menu" className={`side-menu ${open ? "is-open" : ""}`} aria-label="Main">
      <div className="side-profile">
        <Avatar name={operator.name} size={56} />
        <div>
          <strong>{operator.name}</strong>
          <small>{operator.role}</small>
          {shift && <small>{shift.process} · Cell {shift.cellId}</small>}
        </div>
      </div>
      <ul>
        {LINKS.map((l) => (
          <li key={l.to}>
            <NavLink to={l.to} onClick={onNavigate} className={({ isActive }) => `side-link ${isActive ? "is-active" : ""}`}>
              <Icon name={l.icon} /> {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="side-foot">
        <Button variant="ghost" icon="logout" onClick={signOut} block>Sign out</Button>
      </div>
    </nav>
  );
}
