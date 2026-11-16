// Job (assembly) entity helpers. A job comes from MES; its progress in the
// cell is tracked separately in the cell model (see cellModel.js).

export const JobStatus = Object.freeze({
  QUEUED: "queued",
  IN_PROGRESS: "in_progress",
  AWAITING_REVIEW: "awaiting_review",
  DONE: "done",
  REJECTED: "rejected",
  SCRAPPED: "scrapped",
});

export const JOB_STATUS_LABEL = {
  queued: "To do",
  in_progress: "In the cell",
  awaiting_review: "Check result",
  done: "Done",
  rejected: "Not OK",
  scrapped: "Scrapped",
};

export function missingDocs(job) {
  const missing = [];
  if (!job.cad) missing.push("CAD");
  if (!job.wps) missing.push("WPS");
  return missing;
}

/**
 * Welding wire and shielding gas from the assembly's WPS, for the start checklist.
 * Out: { wire, gas, file } or null when the WPS is missing or has no consumables.
 */
export function wpsConsumables(job) {
  if (!job?.wps?.wire || !job?.wps?.gas) return null;
  return { wire: job.wps.wire, gas: job.wps.gas, file: job.wps.file };
}

export function isReady(job) {
  return missingDocs(job).length === 0;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Unambiguous date ("14 Nov 2026, 18:00") instead of 11/12/26. */
export function formatDateTime(iso) {
  const d = new Date(iso);
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

/**
 * Short date for the assembly table, e.g. "13/11/25 h 10 AM" or "14/11/25 h 9:30 AM".
 * Day/month/year (European order), 12-hour clock; minutes only when not :00.
 */
export function formatShortDateTime(iso) {
  const d = new Date(iso);
  const two = (n) => String(n).padStart(2, "0");
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minutes = d.getMinutes() ? `:${two(d.getMinutes())}` : "";
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${two(d.getFullYear() % 100)} h ${hour12}${minutes} ${h < 12 ? "AM" : "PM"}`;
}

export function formatTime(dateOrIso) {
  return timeFmt.format(new Date(dateOrIso));
}
