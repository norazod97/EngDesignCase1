// SERVICE — reads the scenario files in src/data/scenarios (the normal course
// of one assembly, without anomaly). Used for the WAAM screens: the part's
// damaged regions, the AI build plan, the layers and the final scan.
import WAAM from "../data/scenarios/waam-baseline.json";

/** Find the first timeline event of a step (and optionally of an AI function). */
function find(timeline, step, aiKey) {
  return timeline.find((e) => e.step === step && (!aiKey || e.ai_function_key === aiKey)) ?? null;
}

/**
 * Everything the WAAM screens need, in plain fields.
 * Out: { part, regions, scanCoverage, alignment, regionAi, plan, layers, finalScan, messages }.
 */
export function getWaamScenario() {
  const t = WAAM.timeline;
  const plan = find(t, "params", "param_proposal");
  return {
    part: WAAM.part,
    regions: WAAM.part.regions ?? [],
    scanCoverage: find(t, "scan")?.value ?? null,
    alignment: find(t, "scan", "cad_alignment"), // AI: scan lined up with the CAD
    regionAi: find(t, "confirm_regions", "region_detection"), // AI: regions found
    plan, // AI: layers, height, max interpass
    layers: t.filter((e) => e.event === "layer"), // [{ layer, height_mm, interpass_C }]
    finalScan: find(t, "final_scan"), // AI: height reached vs CAD
    messages: {
      mount: find(t, "mount")?.message,
      scan: find(t, "scan")?.message,
      mark: find(t, "mark")?.message,
    },
  };
}
