export const APP_CONFIG = {
  appName: "COROB Weld Cell",
  build: "0.2.0-backbone",
  /** "mock" = simulated cell. Add e.g. "aas" once a middleware endpoint exists. */
  gateway: "mock",
  /** Toasts for AI adjustments stay this long; they also remain in Notifications. */
  toastMs: 10000,
  /**
   * Alarm flow (docs/PLAN.md section 2).
   * helpChannel: "ai" = chatbot build ("Ask AI"). The colleagues build ("Call <name>")
   *              comes with the two-build task (PLAN T4/T12).
   * timer: "visible" shows the count-up timer; "logged_only" hides it but still logs it.
   */
  alarmFlow: { helpChannel: "ai", timer: "visible" },
};
