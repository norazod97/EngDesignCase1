// Scripted events the Wizard-of-Oz console can inject into the simulation.
// parked: ALARM_TEMPLATES are the old demo alarms. The app now uses the JSON
// alarm database (src/data/alarms via services/alarmRepository.js).
// Alarms follow SBAR: Situation, Background, Assessment, Recommendation.

export const ALARM_TEMPLATES = {
  misalignment: {
    id: "misalignment",
    severity: "fault",
    halts: true,
    title: "Weld cycle halted",
    situation: "Excessive joint misalignment",
    background:
      "The arc is sputtering and the joint gap is widening. Heat build-up may be warping the metal and pulling the plates apart.",
    data: [
      { label: "Joint gap", value: "2.4 mm", limit: "≤ 1.5 mm" },
      { label: "Arc voltage spread", value: "±3.8 V", limit: "≤ ±1.5 V" },
    ],
    assessment: { cause: "Profilometer camera lens dirty with spatter or smoke", confidence: 0.72 },
    steps: [
      "Unlock the cell.",
      "Check the profilometer lens and wipe it clean with solvent.",
      "Check the weld seam: add a quick tack weld or a clamp to hold it tight.",
      "If allowed by the WPS, change to pulsed-arc transfer with weave pattern.",
      "Leave the cell and lock it again.",
    ],
    equipment: "PF",
  },
  wireFeed: {
    id: "wireFeed",
    severity: "fault",
    halts: true,
    title: "Weld cycle halted",
    situation: "Wire feed stalled",
    background: "Wire feed speed dropped to zero for 1.2 s while the arc was on.",
    data: [{ label: "Wire feed speed", value: "0.0 m/min", limit: "8.0 ± 0.5 m/min" }],
    assessment: { cause: "Wire tangled on the spool or worn contact tip", confidence: 0.64 },
    steps: ["Unlock the cell.", "Check the spool and the liner for tangles.", "Replace the contact tip if worn.", "Leave the cell and lock it again."],
    equipment: "PS",
  },
  lowPenetration: {
    id: "lowPenetration",
    severity: "warning",
    halts: false,
    title: "Check requested",
    situation: "Predicted penetration lower than expected",
    background: "The penetration model predicts incomplete root fusion on the last 40 mm of the seam.",
    data: [{ label: "Predicted penetration", value: "68 %", limit: "≥ 90 %" }],
    assessment: { cause: "Travel speed too high for this plate thickness", confidence: 0.58 },
    steps: ["Look at the seam during the visual NDT.", "Note what you see in the comment box."],
    equipment: "R3",
  },
};

export const AI_ADJUSTMENTS = [
  "Torch path shifted 0.6 mm to follow the detected joint line.",
  "Wire feed speed reduced 4 % to compensate for a wider gap.",
  "Travel speed lowered from 6.0 to 5.6 mm/s to keep penetration on target.",
];
