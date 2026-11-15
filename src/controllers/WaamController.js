// CONTROLLER — data for the WAAM repair screens (PLAN T14 + T15).
// Combines the scenario (regions, AI plan, final scan) with the live cell
// readings (scan coverage, layer, interpass temperature). Views only render it.
import { useMemo } from "react";
import { getWaamScenario } from "../services/scenarioRepository.js";
import { useCell } from "./CellController.jsx";

/** Out: { isWaam, step, scenario, live: { scanCoverage, layer, layers, phase, interpassC, tempHistory }, confirm, log }. */
export function useWaam() {
  const { state, actions } = useCell();
  const scenario = useMemo(() => getWaamScenario(), []);
  const t = state.telemetry;
  return {
    isWaam: state.process === "WAAM",
    step: state.steps[state.cycle.stepIndex] ?? null,
    waiting: state.cycle.state === "awaiting_operator",
    scenario,
    maxInterpassC: 200, // from the AI plan: "max interpass 200 °C"
    live: {
      scanCoverage: t.scanCoverage ?? 0,
      layer: t.layer, layers: t.layers ?? scenario.layers.length,
      phase: t.phase, interpassC: t.interpassC, tempHistory: t.tempHistory ?? [],
    },
    /** Finish the current operator step (mount, mark, confirm areas, start build). Returns { ok, reason }. */
    confirm: () => actions.confirmStep(),
    /** Write a short line to the cell log (e.g. "Opened repair area 2"). */
    log: (message, details) => actions.log(message, details),
    doorLocked: state.door.locked,
    lockDoor: () => actions.lockDoor(true),
  };
}
