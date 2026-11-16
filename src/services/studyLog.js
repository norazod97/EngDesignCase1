// SERVICE — the study log (PLAN task T10).
//
// Every event that matters for the analysis is appended here and kept in the
// browser (localStorage), so it survives a page reload. The wizard console
// exports it as JSON or CSV at the end of a session.
//
// Two tabs write at the same time (participant + wizard). To avoid one tab
// overwriting the other, each tab writes to its own list ("participant" or
// "wizard"). The export merges both lists and sorts them by time.
//
// Privacy (CLAUDE.md rule 8): only the participant CODE is stored, never a name.

import { CONDITION } from "../conditions/index.js";
import { createWizardChannel } from "./wizardChannel.js";

const KEY_PREFIX = "corob:studylog:";
const CODE_KEY = "corob:participantCode";
// "remote" = participant events received from ANOTHER device (two-device sessions).
const SOURCES = ["participant", "wizard", "remote"];

// Channel used to copy participant events to the wizard (created on first use).
let channel = null;
const getChannel = () => (channel ??= createWizardChannel());

// Columns of the CSV file, in this order. Every event can fill any of them.
export const CSV_COLUMNS = [
  "at", "participant", "version", "source", "type", "process", "cellId", "assembly",
  "alarmId", "errorCode", "choice", "outcome", "falseAlarmCorrect", "text",
  "firstChoiceAfterS", "timerS", "totalS", "helpOpened", "switches", "details",
];

// ---- small helpers (never throw: storage can be blocked) -------------------

function readList(source) {
  try {
    return JSON.parse(localStorage.getItem(KEY_PREFIX + source) ?? "[]");
  } catch {
    return [];
  }
}

function writeList(source, list) {
  try {
    localStorage.setItem(KEY_PREFIX + source, JSON.stringify(list));
  } catch {
    console.error("Study log could not be saved (storage full or blocked).");
  }
}

// ---- participant code ------------------------------------------------------

/** The current participant code (e.g. "P07"), set in the wizard console. */
export function getParticipantCode() {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Set the participant code. Use a code only, never a name. */
export function setParticipantCode(code) {
  try {
    localStorage.setItem(CODE_KEY, code.trim());
  } catch { /* ignore */ }
}

// ---- writing ---------------------------------------------------------------

/**
 * Add one event to the log.
 * In: source ("participant" or "wizard") and an event object, e.g.
 *     { type: "alarm_shown", alarmId: "GMAW-RP-01", errorCode: "E-GMAW-201" }.
 * The time and the participant code are added here.
 */
export function appendEvent(source, event) {
  const list = readList(source);
  // id = unique per event (removes duplicates when the same event arrives twice).
  // version = which study version wrote it (A_chatbot / B_colleagues).
  const entry = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, at: new Date().toISOString(), participant: getParticipantCode(), version: CONDITION.id, source, ...event };
  list.push(entry);
  writeList(source, list);
  // Two devices: the participant's tablet keeps its own copy AND sends every event
  // to the wizard, so the wizard's export contains everything.
  if (source === "participant") getChannel().post({ type: "log-event", event: entry });
}

/**
 * Wizard side: save a participant event that came from the other device.
 * The participant code is the wizard's code (the tablet may not have one set).
 */
export function storeRemoteEvent(event) {
  if (!event?.id) return;
  if (SOURCES.some((s) => readList(s).some((e) => e.id === event.id))) return; // already stored
  const list = readList("remote");
  list.push({ ...event, participant: event.participant || getParticipantCode() });
  writeList("remote", list);
}

// ---- reading and export ----------------------------------------------------

/** All events (this device + received from the other device), each once, oldest first. */
export function readAll() {
  const byId = new Map();
  SOURCES.flatMap(readList).forEach((e) => { if (!e.id || !byId.has(e.id)) byId.set(e.id ?? Math.random(), e); });
  return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at));
}

/** Number of events in the log. */
export function countEvents() {
  return readAll().length;
}

/** Delete the whole log (after it has been exported). */
export function clearLog() {
  SOURCES.forEach((s) => writeList(s, []));
}

/** One CSV cell: wrap in quotes and double any quotes inside (standard CSV). */
function csvCell(value) {
  if (value === undefined || value === null) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** The log as CSV text (one row per event, columns = CSV_COLUMNS). */
export function toCsv(events) {
  const rows = events.map((e) => CSV_COLUMNS.map((c) => csvCell(e[c])).join(","));
  return [CSV_COLUMNS.join(","), ...rows].join("\r\n");
}

/** Ask the browser to save a text file (used by the wizard's export buttons). */
export function downloadText(filename, text, mime) {
  // "﻿" at the start lets Excel read special characters (Ø, °, ₂) correctly.
  const blob = new Blob([mime === "text/csv" ? "﻿" + text : text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
