// CONTROLLER — turns cell events into toasts and a persistent notification
// list. Toasts are short-lived, so everything also stays in Notifications
// (the operator is often away from the screen).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { APP_CONFIG } from "../config/appConfig.js";
import { useCell } from "./CellController.jsx";

const NotificationContext = createContext(null);

function toNotification(event, state) {
  const p = event.payload ?? {};
  switch (event.type) {
    case "ai/adjust":
      return { tone: "ai", title: "AI adjusted the weld", body: p.message }; // event log page is parked
    case "bin/set":
      return p.inEnvelope ? null : { tone: "warning", title: "Parts bin out of reach", body: "Open the cell and push the bin back onto the marked spot.", sticky: true };
    case "cycle/jobScanned":
      return { tone: "ai", title: "AI finished scanning", body: "Do the visual NDT: look at the weld and record the result.", link: "/dashboard", linkText: "Open the check" };
    case "cycle/halt":
      return null; // halting alarms open the alarm window; quiet alerts stay silent until the assembly report (PLAN 2b)
    case "job/docsAttached":
      return { tone: "info", title: "Documents received", body: `CAD/WPS for ${p.jobId} are now available.` };
    default:
      return null;
  }
}

function blockerNotification(blocker) {
  return { tone: "warning", title: "Next assembly needs documents", body: `${blocker.jobId} is missing ${blocker.missing.join(" and ")}. Ask your supervisor to upload them, or skip it.`, link: "/dashboard" };
}

export function NotificationController({ children }) {
  const { gateway } = useCell();
  const [items, setItems] = useState([]); // newest first
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const push = useCallback((n) => {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), read: false, ...n };
    setItems((list) => [item, ...list].slice(0, 100));
    setToasts((t) => [...t.slice(-2), item]); // at most 3 on screen
    if (!item.sticky) timers.current.set(item.id, setTimeout(() => dismissToast(item.id), APP_CONFIG.toastMs));
  }, [dismissToast]);

  const lastBlocker = useRef(null);
  useEffect(() => gateway.onEvent((event, state) => {
    const n = toNotification(event, state);
    if (n) push(n);
    const blocker = state.cycle.blocker;
    if (blocker && blocker.jobId !== lastBlocker.current) push(blockerNotification(blocker));
    lastBlocker.current = blocker?.jobId ?? null;
    if (event.type === "bin/set" && event.payload.inEnvelope) setToasts((t) => t.filter((x) => x.title !== "Parts bin out of reach"));
  }), [gateway, push]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const markAllRead = useCallback(() => setItems((l) => l.map((i) => ({ ...i, read: true }))), []);

  const value = useMemo(() => ({
    items, toasts, unread: items.filter((i) => !i.read).length, push, dismissToast, markAllRead,
  }), [items, toasts, push, dismissToast, markAllRead]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationController>");
  return ctx;
}
