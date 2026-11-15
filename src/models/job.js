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

export function formatTime(dateOrIso) {
  return timeFmt.format(new Date(dateOrIso));
}
