// SERVICE — turns one alarm from the JSON alarm database (src/data/alarms)
// into the shape the alarm window and the cell model use.
//
// Why a mapper: the JSON files follow the AAS-style schema (alarm.schema.json).
// The rest of the app should not care about that format. If the real cells
// (AAS middleware) send alarms in another format later, only this file changes.
//
// IMPORTANT (study rule): scoring fields are NOT copied. The participant's
// screen must never see ground_truth, expected_response or false_alarm_is_correct,
// nor whether the AI decision is correct (ai_decision.is_correct).

// Which machine in the cell each alarm source belongs to (used to show a fault lamp).
// Left: source_asset in the JSON. Right: equipment id in src/mock/fixtures.js (CELLS).
const EQUIPMENT_BY_SOURCE = {
  GMAW: { profilometer: "PF", psu: "PS", torch_cobot: "R3" },
  WAAM: { psu: "PS", pyrometer: "PY", robot: "R1", scanner: "SC" },
};

/** Show a number with its unit, e.g. 310 "°C" -> "310 °C". Empty value -> "—". */
function withUnit(value, unit) {
  if (value === null || value === undefined) return "—";
  return unit ? `${value} ${unit}` : String(value);
}

/**
 * JSON alarm -> alarm for the app.
 * In:  one entry of the "alarms" array of a file in src/data/alarms.
 * Out: { id, errorCode, situation, background, data, assessment, halts, ... }.
 */
export function toAppAlarm(json) {
  // The measurements that triggered the alarm, as rows of a small table.
  const data = json.signals.map((s) => ({
    label: s.name,
    value: withUnit(s.value, s.unit),
    limit: s.limit === null || s.limit === undefined ? "—" : withUnit(s.limit, s.unit),
  }));

  // What the AI thinks (only for alarms that come from an AI function).
  // We keep "what" and the confidence; is_correct is for scoring only and is dropped.
  const ai = json.ai_decision;
  const assessment = ai
    ? { cause: ai.what, confidence: ai.confidence_value, unfamiliar: !!ai.unfamiliar }
    : null;

  return {
    id: json.id, // e.g. "GMAW-RP-01" (for logs and the wizard)
    variant: json.variant,
    process: json.process,
    knowledgeDomain: json.knowledge_domain, // for logs and for picking a colleague, never shown as a hint
    errorCode: json.error_code, // e.g. "E-GMAW-201", shown to the participant
    severity: json.severity,
    // Alarms with stop_behaviour "none" do not halt the cell (see PLAN section 2b).
    halts: json.stop_behaviour !== "none",
    title: json.title, // researcher's label (wizard console only; may give the answer away)
    // Headline in the alarm window. operator_title is neutral: it never says the cause
    // or whether the AI is right. Falls back to title only if a file has no operator_title.
    situation: json.operator_title ?? json.title,
    background: json.operator_message, // plain-language message for the welder
    data,
    assessment,
    equipment: EQUIPMENT_BY_SOURCE[json.process]?.[json.source_asset] ?? null,
    whoKnows: json.help_content?.who_knows ?? [],
    // Step-by-step fix. Never shown in the alarm window: the wizard sends it
    // through the help channel when the participant asks for help (PLAN section 2).
    resolutionScript: json.resolution_script ?? [],
    // When the alarm should fire (wizard schedule): process step, seconds into it, WAAM layer.
    trigger: json.trigger ?? null,
  };
}
