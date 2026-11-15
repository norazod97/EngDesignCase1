// Design-system primitives. Prop names follow the HMI SYSTEMS control
// contracts (Button, IconButton, Lamp, Checkbox, Switch, Input, Label) so a
// screen could later be mapped onto the licensed WinCC Unified controls.
import { useId } from "react";
import { statusMeta } from "../../models/equipment.js";
import { Icon } from "./Icon.jsx";

/** variant: "ink" (kit default) | "accent" (primary CTA) | "ghost" | "danger" */
export function Button({ variant = "ink", size = "md", icon, iconRight, children, className = "", block, ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant} btn-${size} ${block ? "btn-block" : ""} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === "lg" ? 24 : 20} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={20} />}
    </button>
  );
}

/** HMI IconButton: `selected` renders the orange state. Always pass a `label`. */
export function IconButton({ icon, label, selected = false, badge, className = "", ...rest }) {
  return (
    <button type="button" className={`icon-btn ${selected ? "is-selected" : ""} ${className}`} aria-label={label} title={label} aria-pressed={selected || undefined} {...rest}>
      <Icon name={icon} />
      {badge ? <span className="icon-btn-badge" aria-hidden="true">{badge > 9 ? "9+" : badge}</span> : null}
    </button>
  );
}

/** HMI Lamp: type = error | active | positive | warning; value = on/off. */
export function Lamp({ type = "active", value = false, blink = false, size = 20, labelText, labelPosition = "right" }) {
  return (
    <span className={`lamp-wrap lamp-label-${labelPosition}`}>
      <span className={`lamp lamp-${type} ${value ? "is-on" : ""} ${blink && value ? "is-blinking" : ""}`} style={{ width: size, height: size }} aria-hidden="true" />
      {labelText && <span className="lamp-label">{labelText}</span>}
    </span>
  );
}

/** Lamp + text label for an equipment status (never colour alone). */
export function StatusLamp({ status, size = 18, showText = true }) {
  const m = statusMeta(status);
  return (
    <span className={`status-lamp status-${status}`}>
      <Lamp type={m.lamp} value={m.on} blink={m.blink} size={size} />
      {showText && <span className="status-text">{m.label}</span>}
    </span>
  );
}

export function Checkbox({ label, description, checked, onChange, disabled, id }) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <label className={`checkbox ${disabled ? "is-disabled" : ""}`} htmlFor={cid}>
      <input id={cid} type="checkbox" checked={checked} onChange={(e) => onChange?.(e.target.checked)} disabled={disabled} />
      <span className="checkbox-pin" aria-hidden="true"><span className="checkbox-mark" /></span>
      <span className="checkbox-text">
        <span>{label}</span>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

/** HMI Switch with on/off texts inside the track. */
export function Switch({ checked, onChange, onText = "On", offText = "Off", label, disabled }) {
  return (
    <label className={`switch ${checked ? "is-on" : ""} ${disabled ? "is-disabled" : ""}`}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange?.(e.target.checked)} disabled={disabled} aria-label={label} />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-text">{onText}</span>
        <span className="switch-text">{offText}</span>
        <span className="switch-pin" />
      </span>
    </label>
  );
}

export function Field({ label, hint, error, children, id }) {
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      {label && <label className="field-label" htmlFor={id}>{label}</label>}
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function Input({ icon, className = "", ...rest }) {
  return (
    <div className={`input-wrap ${icon ? "has-icon" : ""} ${className}`}>
      {icon && <Icon name={icon} size={20} />}
      <input className="input" {...rest} />
    </div>
  );
}

export function TextArea(props) {
  return <textarea className="input textarea" {...props} />;
}

export function Tag({ children, tone = "neutral", icon }) {
  return <span className={`tag tag-${tone}`}>{icon && <Icon name={icon} size={14} />}{children}</span>;
}

export function Card({ title, icon, actions, children, className = "", id, tone }) {
  return (
    <section className={`card ${tone ? `card-${tone}` : ""} ${className}`} id={id} aria-label={typeof title === "string" ? title : undefined}>
      {(title || actions) && (
        <header className="card-head">
          <h2 className="card-title">{icon && <Icon name={icon} size={20} />}{title}</h2>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

/**
 * Round avatar: a picture if `photo` is given, otherwise the initials.
 * status "available" -> green dot, "busy" -> red dot. (online is the older on/off dot.)
 */
const STATUS_WORD = { available: "available", busy: "busy" };
export function Avatar({ name, size = 40, online, photo, status }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} title={name}>
      {photo ? <img className="avatar-img" src={photo} alt="" /> : initials}
      {status ? <span className={`avatar-dot is-${status}`} aria-label={STATUS_WORD[status] ?? status} />
        : online !== undefined && <span className={`avatar-dot ${online ? "is-online" : ""}`} aria-label={online ? "on shift" : "away"} />}
    </span>
  );
}

export function ProgressBar({ value, label }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <span className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** AI-generated content is always visibly marked. */
export function AiBadge({ children = "AI" }) {
  return <span className="ai-badge"><Icon name="sparkle" size={14} />{children}</span>;
}

export function Confidence({ value }) {
  const pct = Math.round(value * 100);
  const word = pct >= 85 ? "high" : pct >= 60 ? "medium" : "low";
  return (
    <span className={`confidence confidence-${word}`}>
      <span className="confidence-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
      <span>{pct}% sure <small>({word})</small></span>
    </span>
  );
}
