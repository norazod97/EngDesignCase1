import { CycleState, PROCESS_STEPS } from "../../models/cellModel.js";
import { Icon } from "../components/Icon.jsx";
import { ProgressBar } from "../components/primitives.jsx";

const STATE_TEXT = {
  [CycleState.RUNNING]: "Running",
  [CycleState.HALTED]: "Halted — needs you",
  [CycleState.WAITING]: "Waiting for documents",
  [CycleState.STOPPED]: "Stopped",
  [CycleState.COMPLETE]: "All done",
  [CycleState.IDLE]: "Not started",
};

/** Assembly in progress + step-by-step tracker (shown while a cycle is active). */
export function ProcessTracker({ cycle, compact = false }) {
  const { currentJobId, stepIndex, stepProgress, state } = cycle;
  const step = PROCESS_STEPS[stepIndex];
  return (
    <div className={`tracker tracker-${state} ${compact ? "tracker-compact" : ""}`}>
      <div className="tracker-head">
        <span className="tracker-label">Now in the cell</span>
        <strong className="tracker-job">{currentJobId ?? cycle.blocker?.jobId ?? "—"}</strong>
        <span className={`tracker-state state-${state}`}>{STATE_TEXT[state]}</span>
      </div>
      <ol className="tracker-steps">
        {PROCESS_STEPS.map((s, i) => {
          const status = !currentJobId ? "todo" : i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
          return (
            <li key={s.id} className={`tracker-step is-${status}`} aria-current={status === "current" ? "step" : undefined}>
              <span className="tracker-dot" aria-hidden="true">{status === "done" ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
              <span className="tracker-step-label">{s.label}</span>
            </li>
          );
        })}
      </ol>
      {!compact && currentJobId && (
        <div className="tracker-detail">
          <ProgressBar value={stepProgress} label={`${step.label} progress`} />
          <p>{step.hint}</p>
        </div>
      )}
    </div>
  );
}
