import { CycleState } from "../../models/cellModel.js";
import { Icon } from "../components/Icon.jsx";
import { ProgressBar } from "../components/primitives.jsx";

const STATE_TEXT = {
  [CycleState.RUNNING]: "Running",
  [CycleState.AWAITING_OPERATOR]: "Waiting for you",
  [CycleState.HALTED]: "Halted — needs you",
  [CycleState.WAITING]: "Waiting for documents",
  [CycleState.STOPPED]: "Stopped",
  [CycleState.COMPLETE]: "Assembly done",
  [CycleState.IDLE]: "Not started",
};

/**
 * Assembly in progress + step-by-step tracker (shown while a cycle is active).
 * In: cycle (from the cell model), steps (this cell's process steps),
 *     jobName (neutral assembly name), compact (small version for the status bar).
 */
export function ProcessTracker({ cycle, steps, jobName, compact = false }) {
  const { currentJobId, stepIndex, stepProgress, state } = cycle;
  const step = steps[stepIndex];
  return (
    <div className={`tracker tracker-${state} ${compact ? "tracker-compact" : ""}`}>
      <div className="tracker-head">
        <span className="tracker-label">Now in the cell</span>
        <strong className="tracker-job">{jobName ?? "—"}</strong>
        <span className={`tracker-state state-${state}`}>{STATE_TEXT[state]}</span>
      </div>
      <ol className="tracker-steps">
        {steps.map((s, i) => {
          const status = !currentJobId ? "todo" : i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
          return (
            <li key={s.id} className={`tracker-step is-${status}`} aria-current={status === "current" ? "step" : undefined}>
              <span className="tracker-dot" aria-hidden="true">{status === "done" ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
              <span className="tracker-step-label">{s.label}</span>
            </li>
          );
        })}
      </ol>
      {!compact && currentJobId && step && (
        <div className="tracker-detail">
          {!step.operator && <ProgressBar value={stepProgress} label={`${step.label} progress`} />}
          <p>{step.hint}</p>
        </div>
      )}
    </div>
  );
}
