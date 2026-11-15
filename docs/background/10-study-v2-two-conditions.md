# 10 · Study v2: chatbot vs colleagues

**This replaces the trial schedule in `09`.** Doc 09 still applies for the wizard console, logging, questionnaires (HUROX notes) and ethics. The machine-readable version of this design is `src/data/study/study-design.json`.

## Design

| Factor | Type | Levels |
|---|---|---|
| **Help condition** | between subjects (recommended, see below) | **A · LLM chatbot** (build `chatbot`) · **B · colleagues on shift** (build `colleagues`) |
| **Process** | within | GMAW, WAAM (block order counterbalanced) |
| **Trial type** (knowledge needed to solve the anomaly) | within | 1 none · 2 welding process · 3 robot programming · 4 ML defect detection |

- Each participant does **8 assemblies**: 4 GMAW and 4 WAAM.
- Every anomaly trial has **exactly one** alarm, taken from `src/data/alarms/`.
- There are **3 variants per anomaly type**, rotated by participant number. Participant *n* gets variant ((n−1) mod 3)+1.

## Decisions to confirm (critical review)

1. **Between or within for the help condition?**
   - With 8 assemblies, giving each participant both apps means each condition gets only one process block. Help condition would then be confounded with process, or the session would grow to 16 assemblies.
   - **Recommendation: between subjects.** Assign by alternating participant numbers *within each persona group*, so both conditions get similar mixes of older, migrant and casual workers.
   - The cost: you need more participants. With small groups, analyse with mixed-effects models (participant as random effect) and report descriptively per persona.
2. **Fixed trial order (your plan) vs rotation.**
   - With the fixed order none → welding → robot → ML, anomaly type is confounded with practice and fatigue. ML anomalies always come last, when people are most practised and most tired.
   - `study-design.json` supports both:
     - `fixed` (your plan);
     - `latin_square_after_baseline`: keeps trial 1 as the baseline and rotates trials 2–4 over 3 orders.
   - I recommend the Latin square. If you keep the fixed order, report the confound.
3. **Keep the information equal between conditions.**
   - The comparison should be about *how* help is given (an AI chat vs a human colleague), not about *what* help is given.
   - So both conditions draw on **the same help content**: the three graded hints in each alarm's `help_content`.
   - The chatbot is instructed to answer only from that content.
   - The wizard, playing colleagues, replies with the same hints.
4. **Expertise routing is part of condition B.**
   - In B, participants must choose *whom* to ask. Each colleague covers one knowledge domain (`people/colleagues.json`), and Sanne, the team lead, is busy by default.
   - In A, the chatbot knows everything.
   - This difference is real and interesting. Log the colleague chosen and whether it matched `help_content.who_knows`.
5. **Response time.**
   - Human replies take time; the LLM is fast.
   - Simulate a colleague delay of 8–20 s (`condition.json`), log the chatbot's real latency, and report both.
   - Optional: add a small minimum delay to chatbot answers, to separate speed from channel.
6. **Session length.**
   - 8 assemblies of about 3–6 minutes each (timelines are compressed), plus think-aloud and 2 × (HUROX + METUX), is roughly 90–120 minutes.
   - For older participants and those with musculoskeletal disorders: a break between blocks, seating, or two sessions.
7. **Chatbot data and consent.** In condition A, participants' typed messages go to an external AI service. The consent form must say so. Use participant codes only, and tell participants not to type personal details.

## Trial flow (per participant)
1. Consent; persona questions; language choice.
2. Tutorial assembly (not analysed) in the participant's condition, including one help request, so everyone has tried the help channel once.
3. Block 1 (process X): trials 1–4 → HUROX + METUX.
4. Break.
5. Block 2 (process Y): trials 1–4 → HUROX + METUX.
6. Retrospective think-aloud on 1–2 alarm moments (replay).
7. Debrief (Wizard-of-Oz and simulation revealed); short interview.

## What is measured
| Measure | Source | Compare |
|---|---|---|
| Help requests (count, time to first request, channel) | HelpRequest log | condition × trial type |
| Chat turns / colleague chosen, and whether the choice matched the needed expertise | chat log / HelpRequest | condition B: routing accuracy |
| Alarm onset → noticed → response → resolved | event log | condition × trial type × process |
| Correct / acceptable / wrong actions | `expected_response` in alarm JSON | same |
| AI errors caught (ML trials) | "AI was wrong" flags vs `ai_decision.is_correct` | condition |
| HUROX constructs, METUX needs | questionnaires per block | condition, process |
| Think-aloud themes | audio, coded later | qualitative |

## Alarm overview (`src/data/alarms/`)

| Type | GMAW variants | WAAM variants |
|---|---|---|
| Welding process | WP-01 low gas flow · WP-02 worn contact tip (unstable arc) · WP-03 gap too wide | WP-01 interpass too hot · WP-02 layer height drift · WP-03 draft disturbs gas shield |
| Robot programming | RP-01 correction not applied to whole path · RP-02 torch too close to holding robot · RP-03 wrong program for part | RP-01 scan not aligned with CAD · RP-02 toolpath crosses a jaw · RP-03 unreachable corner |
| ML defect detection | ML-01 false alarm (glare) · ML-02 unfamiliar material · ML-03 miss caught by X-ray | ML-01 missed small region · ML-02 false region on shiny surface · ML-03 uncertain build plan |

All ML alarms are deliberate **AI errors** (`ai_decision.is_correct: false`). Baseline runs contain only correct AI decisions, so participants experience the AI being right before they meet its mistakes.
