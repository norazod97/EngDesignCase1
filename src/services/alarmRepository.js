// SERVICE — the simulated alarm database.
//
// Loads every alarm file in src/data/alarms when the app starts and gives the
// rest of the app simple ways to get alarms. In the real system these alarms
// would come from the cells through the AAS middleware instead.

import { toAppAlarm } from "./alarmMapper.js";

// Vite feature: import all JSON files in the folder at build time.
// The schema file is excluded; it describes the format but holds no alarms.
const files = import.meta.glob(["../data/alarms/*.json", "!../data/alarms/alarm.schema.json"], { eager: true, import: "default" });

// Build one flat list of alarms (already mapped to the app's shape).
const ALARMS = [];
for (const [path, file] of Object.entries(files)) {
  // Small safety check: a broken file gives a clear message in the console instead of a crash.
  if (!Array.isArray(file?.alarms)) {
    console.error(`Alarm file ${path} has no "alarms" list and was skipped.`);
    continue;
  }
  file.alarms.forEach((a) => ALARMS.push(toAppAlarm(a)));
}
ALARMS.sort((a, b) => a.id.localeCompare(b.id));

/** All alarms for one process ("GMAW" or "WAAM"), sorted by id. */
export function listAlarms(process) {
  return ALARMS.filter((a) => !process || a.process === process);
}

/** One alarm by id (e.g. "GMAW-RP-01"), or null if it does not exist. */
export function getAlarm(id) {
  return ALARMS.find((a) => a.id === id) ?? null;
}
