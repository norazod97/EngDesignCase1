// Wizard-of-Oz bridge between the participant's tab and the experimenter's
// console tab (#/wizard), using BroadcastChannel. Both tabs must be open in
// the same browser profile. A second device would need a small WebSocket
// relay instead; keep this module as the single place to swap that in.

const CHANNEL_NAME = "corob-woz";

export function createWizardChannel() {
  if (typeof BroadcastChannel === "undefined") {
    return { post() {}, listen() { return () => {}; }, close() {}, available: false };
  }
  const channel = new BroadcastChannel(CHANNEL_NAME);
  return {
    available: true,
    post(message) {
      try { channel.postMessage(message); } catch { /* state may contain non-cloneable data; ignore */ }
    },
    listen(handler) {
      const fn = (e) => handler(e.data);
      channel.addEventListener("message", fn);
      return () => channel.removeEventListener("message", fn);
    },
    close() { channel.close(); },
  };
}
