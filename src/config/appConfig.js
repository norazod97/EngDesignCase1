export const APP_CONFIG = {
  appName: "COROB Weld Cell",
  build: "0.2.0-backbone",
  /** "mock" = simulated cell. Add e.g. "aas" once a middleware endpoint exists. */
  gateway: "mock",
  /** Toasts for AI adjustments stay this long; they also remain in Notifications. */
  toastMs: 10000,
  /**
   * Alarm flow (docs/PLAN.md section 2).
   * timer: "visible" shows the count-up timer; "logged_only" hides it but still logs it.
   * (Who helps, AI or colleague, is set by the study version: src/conditions/.)
   */
  alarmFlow: { timer: "visible" },
};
