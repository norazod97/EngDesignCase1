// Mock MES / identity services. Async on purpose so a real REST client can
// replace them without changing the controllers that await them.
// NOT secure authentication: credentials are client-side demo data.

import { COLLEAGUES, JOBS, OPERATORS, SHIFTS, STOCK } from "../mock/fixtures.js";
import STUDY_DESIGN from "../data/study/study-design.json";
import ROSTER from "../data/people/colleagues.json";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

/** Date `days` from today at "HH:MM" (local time), as an ISO string. Negative days = in the past. */
function relativeDate(days, time) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
const clone = (x) => structuredClone(x);

export async function authenticate(operatorId, password) {
  await delay();
  const op = OPERATORS[operatorId.trim().toLowerCase()];
  if (!op || op.password !== password) return null;
  const { password: _omit, ...profile } = op;
  return clone(profile);
}

export async function getOperator(operatorId) {
  const op = OPERATORS[operatorId];
  if (!op) return null;
  const { password: _omit, ...profile } = op;
  return clone(profile);
}

/**
 * The cell this operator works in, plus the study assemblies for that cell.
 * The number of assemblies comes from the study design (assemblies_per_process, now 4).
 */
export async function getShiftAssignment(operatorId) {
  await delay();
  const shift = SHIFTS[operatorId];
  if (!shift) return null;
  const perProcess = STUDY_DESIGN.design?.assemblies_per_process ?? 4;
  const jobs = JOBS.filter((j) => j.cellId === shift.cellId).slice(0, perProcess)
    .map((j) => ({ ...j, receivedAt: relativeDate(-j.received.daysAgo, j.received.time), dueAt: relativeDate(j.due.inDays, j.due.time) }));
  return { shift: clone(shift), jobs: clone(jobs) };
}

/**
 * Colleagues on the shop floor, from the study roster (src/data/people/colleagues.json).
 * Out: [{ id, name, role, status, online, location, expertise, photo }].
 * photo is a picture in public/avatars (stock photo or drawn picture).
 */
export async function getColleaguesOnShift() {
  await delay(50);
  return ROSTER.colleagues.map((c) => ({
    id: c.id,
    name: c.first_name,
    role: c.role_label,
    status: c.default_status, // "available" | "busy"
    online: c.default_status !== "offline",
    location: c.location,
    expertise: c.expertise,
    // Photo from the roster if there is one, otherwise the drawn picture.
    photo: `${import.meta.env.BASE_URL}${c.photo ?? `avatars/${c.id}.svg`}`,
  }));
}
// parked: COLLEAGUES in mock/fixtures.js (old demo names) is no longer used.

export async function getStock() {
  await delay(50);
  return clone(STOCK);
}
