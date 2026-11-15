import { NavLink } from "react-router-dom";
import { useSession } from "../../controllers/SessionController.jsx";
import { Icon } from "../components/Icon.jsx";
import { Avatar, Button } from "../components/primitives.jsx";

const LINKS = [
  { to: "/shift", label: "My shift", icon: "home" },
  { to: "/dashboard", label: "Cell dashboard", icon: "grid" },
  { to: "/historian", label: "Event log", icon: "history" },
  { to: "/labeling", label: "Label defects", icon: "tag" },
  { to: "/account", label: "My profile", icon: "user" },
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
          {shift && <small>Cell {shift.cellId} · Area {shift.area}</small>}
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
