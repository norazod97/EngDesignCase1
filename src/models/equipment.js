// Equipment status vocabulary and its mapping to the HMI Lamp "type" contract
// (error | active | positive | warning). Colour is never the only cue: every
// status also carries a text label and an icon shape.

export const EquipmentStatus = Object.freeze({
  RUNNING: "running",
  IDLE: "idle",
  FAULT: "fault",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
});

const STATUS_META = {
  running: { lamp: "positive", on: true, label: "Running", shape: "circle" },
  idle: { lamp: "warning", on: true, label: "Idle", shape: "pause" },
  fault: { lamp: "error", on: true, label: "Fault", shape: "cross", blink: true },
  connected: { lamp: "active", on: true, label: "Connected", shape: "link" },
  disconnected: { lamp: "active", on: false, label: "Disconnected", shape: "unlink" },
};

export function statusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.disconnected;
}

export function daysUntil(isoDate, now = new Date()) {
  if (!isoDate) return null;
  const ms = new Date(`${isoDate}T00:00:00`) - new Date(now.toDateString());
  return Math.round(ms / 86400000);
}

/** Equipment whose periodic check-up is due within `withinDays`. */
export function serviceDue(equipment, withinDays = 3, now = new Date()) {
  return equipment.filter((e) => {
    const d = daysUntil(e.nextServiceDue, now);
    return d !== null && d <= withinDays;
  });
}
