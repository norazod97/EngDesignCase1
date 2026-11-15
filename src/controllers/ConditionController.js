// CONTROLLER — tells views which study version is running (chatbot or colleagues).
// Views use these hooks instead of checking the condition themselves.
import { CONDITION } from "../conditions/index.js";

/** The running condition: { id, label, helpChannel, features }. */
export function useCondition() {
  return CONDITION;
}

/** Is a feature on in this build? e.g. useFeature("colleagueAvatars"). */
export function useFeature(name) {
  return !!CONDITION.features[name];
}
