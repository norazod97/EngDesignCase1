import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon.jsx";
import { IconButton } from "./primitives.jsx";

/**
 * Modal dialog. `dismissible={false}` for alarms: Escape and the backdrop do
 * nothing, the operator has to choose an action.
 */
export function Modal({ open, title, eyebrow, tone = "neutral", onClose, dismissible = true, children, footer, size = "md" }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const node = ref.current;
    node?.querySelector("[data-autofocus], button, input, textarea, select, a[href]")?.focus();
    function onKey(e) {
      if (e.key === "Escape" && dismissible) onClose?.();
      if (e.key === "Tab" && node) {
        const f = [...node.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea, select, a[href]")];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, dismissible, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose?.(); }}>
      <div ref={ref} className={`modal modal-${tone} modal-${size}`} role={tone === "error" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={titleId}>
        <header className="modal-head">
          <div>
            {eyebrow && <div className="modal-eyebrow">{eyebrow}</div>}
            <h2 id={titleId} className="modal-title">{title}</h2>
          </div>
          {dismissible && <IconButton icon="close" label="Close" onClick={onClose} className="icon-btn-plain" />}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

const TONE_ICON = { info: "info", warning: "alert", error: "alert", ai: "sparkle", success: "check" };

export function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} role="status">
          <span className="toast-icon"><Icon name={TONE_ICON[t.tone] ?? "info"} /></span>
          <div className="toast-body">
            <strong>{t.title}</strong>
            {t.body && <p>{t.body}</p>}
            {t.link && <Link to={t.link} onClick={() => onDismiss(t.id)}>{t.tone === "ai" ? "See why in the log" : "Open"}</Link>}
          </div>
          <IconButton icon="close" label="Dismiss" className="icon-btn-plain" onClick={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

/**
 * Stop button styled after the HMI SYSTEMS Safety Emergency Button. In the
 * prototype it requests a controlled stop of the cycle; it is labelled
 * "Stop cycle" rather than "Emergency stop" on purpose (see README).
 */
export function StopCycleButton({ onStop, disabled, compact }) {
  return (
    <button type="button" className={`stop-btn ${compact ? "stop-btn-compact" : ""}`} onClick={onStop} disabled={disabled} aria-label="Stop cycle">
      <span className="stop-btn-plate" aria-hidden="true"><span className="stop-btn-knob" /></span>
      <span className="stop-btn-text">Stop<br />cycle</span>
    </button>
  );
}
