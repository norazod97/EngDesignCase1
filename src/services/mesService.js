// Mock MES / identity services. Async on purpose so a real REST client can
// replace them without changing the controllers that await them.
// NOT secure authentication: credentials are client-side demo data.

import { COLLEAGUES, JOBS, OPERATORS, SHIFTS, STOCK } from "../mock/fixtures.js";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));
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

export async function getShiftAssignment(operatorId) {
  await delay();
  const shift = SHIFTS[operatorId];
  if (!shift) return null;
  return { shift: clone(shift), jobs: clone(JOBS.filter((j) => j.cellId === shift.cellId)) };
}

export async function getColleaguesOnShift() {
  await delay(50);
  return clone(COLLEAGUES);
}

export async function getStock() {
  await delay(50);
  return clone(STOCK);
}
