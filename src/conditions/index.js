// CONDITIONS — the ONLY place where the two study versions differ (CLAUDE.md).
//
// Which version runs is chosen when starting or building the app:
//   npm run dev:chatbot      / npm run build:chatbot      -> condition A
//   npm run dev:colleagues   / npm run build:colleagues   -> condition B
// (Vite's "--mode" sets import.meta.env.MODE.) Plain "npm run dev" = chatbot.
//
// Views never read this file directly: they ask the ConditionController
// (useCondition / useFeature).
import { chatbot } from "./chatbot.js";
import { colleagues } from "./colleagues.js";

export const CONDITION = import.meta.env.MODE === "colleagues" ? colleagues : chatbot;
