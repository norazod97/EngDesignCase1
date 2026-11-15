// SERVICE — the trial schedule of one participant (PLAN task T13, decision D5 = fixed).
//
// Everything comes from src/data/study/study-design.json:
//   - cell order: alternates by participant number (P1: GMAW then WAAM, P2: WAAM then GMAW, ...),
//   - trial order inside each cell: FIXED (no anomaly, welding process, robot programming, ML),
//   - alarm variant: rotates by participant number (P1 -> variant 1, P2 -> 2, P3 -> 3, P4 -> 1, ...).
// So assembly 2 of P5 in the GMAW cell gets alarm GMAW-WP-02, and so on.

import DESIGN from "../data/study/study-design.json";

// Short code of each anomaly type in the alarm ids (e.g. GMAW-WP-01).
const TYPE_CODE = { welding_process: "WP", robot_programming: "RP", ml_defect_detection: "ML" };

/** Participant number from a code like "P07" -> 7. null if the code has no number. */
export function participantNumber(code) {
  const m = String(code ?? "").match(/(\d+)/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * The full schedule for participant number n.
 * Out: { n, variant, blocks: [{ process, order, trials: [{ assembly, type, label, alarmId }] }] }
 *      alarmId is null for the assembly without anomaly.
 */
export function scheduleFor(n) {
  const { ordering, trial_types: types } = DESIGN;
  const sequences = ordering.process_block_order.sequences;
  const processes = sequences[(n - 1) % sequences.length]; // e.g. ["GMAW", "WAAM"]
  const variants = ordering.alarm_variant.variants;
  const variant = variants[(n - 1) % variants.length];
  const order = ordering.trial_order_within_block.fixed; // D5 = fixed

  const blocks = processes.map((process, i) => ({
    process,
    order: i + 1, // 1 = first cell, 2 = second cell
    trials: order.map((type, j) => ({
      assembly: j + 1, // assembly number in the dashboard list
      type,
      label: types[type]?.label ?? type,
      alarmId: TYPE_CODE[type] ? `${process}-${TYPE_CODE[type]}-0${variant}` : null,
    })),
  }));
  return { n, variant, blocks };
}
