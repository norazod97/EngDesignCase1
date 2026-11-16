// Wizard-of-Oz bridge between the participant's screen and the experimenter's
// console (#/wizard). It uses two routes at the same time:
//   1. BroadcastChannel: tabs/windows of the same browser on the same computer.
//   2. WebSocket relay (server/relay.mjs, "npm run study"): two DEVICES on the
//      lab network, e.g. participant tablet + wizard laptop. Only available when
//      the app is opened from the study server; on GitHub Pages it is skipped.
// A message can arrive by both routes, so every message gets an id and
// duplicates are dropped.

import { CONDITION } from "../conditions/index.js";

// One channel per study version, so a chatbot wizard never talks to a colleagues participant.
const CHANNEL_NAME = `corob-woz-${CONDITION.id}`;

// Short random id per message (to drop duplicates).
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Is the app opened from the study server (not GitHub Pages, not the Vite dev server)? */
function relayUrl() {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return null;
  const { hostname, protocol, host, port } = window.location;
  if (hostname.endsWith("github.io") || port === "5173" || port === "5174") return null;
  return `${protocol === "https:" ? "wss" : "ws"}://${host}/relay?room=${encodeURIComponent(CHANNEL_NAME)}`;
}

export function createWizardChannel() {
  const handlers = new Set();
  const seen = new Set(); // ids of messages already delivered
  const deliver = (msg) => {
    if (msg?.__id) {
      if (seen.has(msg.__id)) return; // came in by the other route too
      seen.add(msg.__id);
      if (seen.size > 2000) seen.clear(); // keep memory small
    }
    handlers.forEach((fn) => fn(msg));
  };

  // Route 1: same browser.
  const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
  bc?.addEventListener("message", (e) => deliver(e.data));

  // Route 2: relay between devices (reconnects every 3 s if the server restarts).
  let ws = null;
  let closed = false;
  const pending = []; // messages sent before the relay connection was open (sent as soon as it opens)
  const url = relayUrl();
  const connect = () => {
    if (!url || closed) return;
    ws = new WebSocket(url);
    ws.onopen = () => { while (pending.length) ws.send(pending.shift()); };
    ws.onmessage = (e) => { try { deliver(JSON.parse(e.data)); } catch { /* ignore broken message */ } };
    ws.onclose = () => { if (!closed) setTimeout(connect, 3000); };
  };
  connect();

  return {
    available: !!bc || !!url,
    usesRelay: !!url,
    post(message) {
      const msg = { ...message, __id: newId() };
      seen.add(msg.__id); // do not deliver our own message back to ourselves
      try { bc?.postMessage(msg); } catch { /* state may contain non-cloneable data; ignore */ }
      if (url) {
        const text = JSON.stringify(msg);
        if (ws?.readyState === 1) ws.send(text);
        else if (pending.length < 500) pending.push(text); // keep it until the relay is connected
      }
    },
    listen(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      closed = true;
      bc?.close();
      ws?.close();
    },
  };
}
