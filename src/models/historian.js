// Historian / audit-trail entries. Every state change in the cell model is
// recorded here so AI decisions and operator actions can be inspected later.

export const EventCategory = Object.freeze({
  OPERATOR: "operator",
  PROCESS: "process",
  AI: "ai",
  ALARM: "alarm",
  SAFETY: "safety",
  QUALITY: "quality",
  REQUEST: "request",
});

export const CATEGORY_LABEL = {
  operator: "Operator action",
  process: "Process",
  ai: "AI decision",
  alarm: "Alarm",
  safety: "Safety",
  quality: "Quality",
  request: "Request",
};

let seq = 0;
export function logEntry(category, message, details = {}) {
  seq += 1;
  return { id: `${Date.now()}-${seq}`, at: new Date().toISOString(), category, message, details };
}
