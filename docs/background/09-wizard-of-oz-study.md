# 09 · Wizard-of-Oz study: app support and protocol

> **Updated by `10-study-v2-two-conditions.md`.** The study now compares two help conditions with 8 assemblies per participant. The schedule and anomaly catalogue in sections 4–5 below are replaced by doc 10 and `src/data/alarms/`. The rest of this document (wizard console, logging, questionnaires, ethics) still applies.

## 1 · Study in one paragraph
A **within-subject Wizard-of-Oz** study:
- Each participant completes **3 GMAW assemblies and 3 WAAM repairs** through the app.
- The cells' activity is **simulated**. The researcher (the **wizard**) controls the simulation from a hidden console and triggers **fake anomalies** in some trials.
- UX is assessed with **think-aloud**, the **HUROX** and **METUX** questionnaires, and behavioural data the app logs automatically.

## 2 · Points to settle before building (critical review)

1. **Independent variable.** As described, every participant does the same six tasks, so the main comparisons are:
   - anomaly vs no-anomaly trials;
   - GMAW vs WAAM;
   - change over repetitions (learning, trust development).

   Decide which of these is the research question, because it drives the trial schedule (section 5). If you also want to test a design choice (e.g. guided vs expert mode, or explanation type), it needs its own manipulation.
2. **Order effects.** Counterbalance which process comes first (GMAW-first vs WAAM-first, alternating between participants). Within each block, fix anomaly positions by a balanced schedule rather than pure randomness, so every participant gets the same number and kinds of anomalies.
3. **Session length and fatigue.** Six jobs plus think-aloud plus questionnaires is long for older participants and for people with musculoskeletal complaints. Plan breaks between blocks, seating, and keep each simulated job short (about 5–8 minutes). Consider two sessions.
4. **Think-aloud and language.** Concurrent think-aloud in a second language is hard and adds load for Persona B.
   - Allow thinking aloud in the participant's own language, recorded for later translation, or
   - use **retrospective think-aloud**: replay the screen recording and ask them to comment.

   *(general HCI method knowledge)*
5. **Questionnaires and language.** Use validated translations where they exist, and offer read-aloud for low literacy. Translating a validated questionnaire yourself weakens its validity. Note this as a limitation.
6. **HUROX and METUX.**
   - **METUX** (Peters, Calvo & Ryan 2018) measures basic psychological needs (autonomy, competence, relatedness) in technology use. It fits your goals of perceived competence and ownership. Its items still have to be supplied.
   - **HUROX** (Apraiz, Lasa, Mazmela, Escallada & González de Heredia, Mondragon Unibertsitatea, 2023) is summarised in 6a below.
   - Marvel et al. warn that many HRI questionnaires are unvalidated. Report the validation status of each.

6a. **HUROX: what it is and what to watch out for.**
   - **Structure:** 41 items in 9 constructs, each rated on a **7-point agree–disagree scale**. Some items are **reverse-worded**, marked with * in the paper; score them reversed.

     | Construct | Items |
     |---|---|
     | Perceived usefulness | 7 |
     | Perceived ease of use | 11 |
     | Perceived safety | 3 |
     | Comfort | 1 |
     | Learnability | 3 |
     | Controllability | 6 |
     | Attitude | 3 |
     | Trust | 1 |
     | Satisfaction | 6 |

   - **Fit with your goals.** Controllability matches your *ownership* goal and learnability your *perceived competence* goal. Trust has a single item, so pair it with your behavioural trust measures (did they catch AI errors?). METUX covers competence and autonomy in more depth.
   - **Validation so far is limited.** It covers content and face validity only, based on ratings by **15 experts** (thresholds: item impact score ≥ 1.5, CVR ≥ 0.49, I-CVI ≥ 0.79). The authors list as future work:
     - reliability (Cronbach's α);
     - whether the 9 constructs hold up in real data;
     - **cross-cultural validity**.

     For your migrant-worker persona, translated versions are therefore unvalidated. Your study could report HUROX reliability in your sample, which is a small contribution in itself.
   - **The exact final 41 items cannot be reconstructed reliably from this paper.**
     - Its lists of rejected items don't add up to its per-construct counts. Its own rejection lists would leave 55 items, not 41.
     - Some item codes appear in both the "rejected" and the "modify" lists.
     - The item table is misaligned in the PDF.

     **Get the final item list from the authors (Mondragon Unibertsitatea) or a later publication** before running the study. Do not assemble it from Table 4.
   - **Wording mismatch.** Items refer to "the robot" and "the control mode". In your study people work with robot cells *through the app*. Decide once how to refer to the system, e.g. "the robot cell" for the robot and "the app" as the control mode. Keep the wording identical for GMAW and WAAM, and report the adaptation.
   - **Questionnaire burden.** 41 HUROX items plus METUX after each of 2 blocks is a lot for older and low-literacy participants. Options:
     - administer HUROX once per process block (as planned), with read-aloud;
     - allow breaks;
     - don't add further questionnaires beyond an optional NASA-TLX.
7. **Collaboration.** Personas help each other in reality, but the study is individual. Either:
   - include a scripted "colleague" the participant can call (the wizard, or a confederate), and log calls as assistance requests; or
   - run a separate pair condition.
8. **Deception and ethics.** Participants believe they control real or realistic cells. Plan a debrief explaining the wizard and the simulation, and get ethics approval (TU/e ethical review board) *(general)*. Never simulate safety-critical alarms in a way that could cause real alarm.
9. **Recruiting the three personas.** Define inclusion criteria for each, and report persona as a variable. With small samples, keep analyses descriptive or qualitative per persona.

## 3 · What the app must provide

### 3.1 Study mode
- A **study session** = participant code (no names), persona group, language, counterbalancing order, and the trial schedule.
- In study mode the participant app looks exactly like the normal app. Only the "Simulated data" badge is hidden, because it would reveal the simulation; the debrief covers this.
- Each trial = one job (GMAW or WAAM) with a scripted run.

### 3.2 Wizard console (hidden route, second device)
- Shows the participant's current screen, step, and a live event log.
- **Help requests appear instantly** with a sound and a banner showing the option chosen, step and active anomaly. The wizard answers as "colleague" or "engineer" from scripted replies, or with free text, and closes the request with a resolution type. In study mode every help request is routed to the wizard.
- **Simulated colleagues on shift.** The study session defines 3–5 fictional colleagues, each with a first name, role, languages, skills and availability. They appear as avatars in the participant's navbar. The wizard plays them all:
  - accept or decline with scripted replies;
  - change their availability during a trial, e.g. the WAAM expert goes on break;
  - send their replies in the participant's language.

  Keep the colleague roster identical for all participants, so choices can be compared. Which colleague a participant picks, for example the one who speaks their language or the one with the right skill, is a finding in itself.
- **Controls:**
  - start/advance the simulated cell activity;
  - pause the simulation;
  - **trigger an anomaly** from the catalogue (scheduled ones are highlighted when due, ad-hoc ones are allowed and flagged as off-script);
  - send a message as "colleague" or "system";
  - mark observations with a hotkey and short tag, e.g. "confused", "hesitates", "asks help";
  - end the trial.
- **Scripts**: each anomaly is a sequence of simulated events that triggers decision cards, alerts and data changes, consistent with the cell profile.
- The console must work fast under pressure: big buttons, a keyboard shortcut per scheduled anomaly, and one-tap undo of the last injected event.

### 3.3 Automatic logging (for analysis)
All with timestamps, exportable as CSV/JSON per participant:
- screens and steps visited, time per step, back-navigation;
- every tap or click on decision cards, help, "More detail", "Ask a colleague", language switch, mode switch;
- **anomaly onset → first noticed** (first interaction with the alert or relevant view) **→ response** (action chosen) **→ resolved**. This gives reaction time (Marvel: reaction time, fault detection and recovery);
- correct or incorrect response to each anomaly, including **AI-error trials**: did they catch an AI false alarm or an AI miss?
- **help requests** from the always-visible "Help" button (docs/08 section 3.8):
  - option chosen (show how / colleague / engineer / stop and wait);
  - "help considered" when the sheet is opened and closed without choosing;
  - step and active anomaly;
  - time into the step;
  - time to resolution;
  - how it was resolved.

  This gives Marvel's "% human assistance requests" per participant, persona, process and anomaly. Each request also records whether it came from the Help button or a colleague avatar, which colleague was chosen (role, shared language, skill), and whether the request was accepted, declined or timed out;
- interruptions;
- questionnaire answers (if filled in the app);
- wizard tags.

### 3.4 Optional measures (Marvel et al.)
- **Situation awareness probes (SAGAT-style):** the wizard can freeze the screen at a scripted moment and show 2–3 questions ("Which robot is welding now?", "What happens next?"). Use sparingly.
- **NASA-TLX** after each block, for mental workload.

## 4 · Anomaly catalogue (simulated)
Based on faults common in the literature. Each one has what the participant sees, the "correct" response, and its source.

### GMAW (fixtureless)

| ID | Anomaly | When | What the participant sees | Expected response | Source |
|---|---|---|---|---|---|
| G1 | **Seam offset larger than usual** | Seam scan | Path correction card, *medium* confidence, unfamiliar warning | Check the overlay; rescan or confirm | Seam finding and part-variation problems (Curiel 2023; Li 2026) |
| G2 | **Part slipped in gripper** | Dry run | Dry-run check: path off the seam by 2 mm near holding robot B | Stop; re-seat the part; rerun the dry run | Fixture and clamping issues (Geng 2025; Curiel 2023) |
| G3 | **Collision risk** | Dry run | Torch too close to holding robot A in the 3D preview | Stop; call engineer (colleague) | Robot-workspace issues (general cobot practice) |
| G4 | **Arc instability during weld** | Run → replay | Arc-watch card after the weld: unusual current/voltage bursts at 12 s; possible porosity | Mark the weld for inspection; check the replay | Signal precursors of porosity (Zhang 2026; Geng 2025) |
| G5 | **Low shielding gas** | Before or during weld | Gas-flow warning; afterwards a porosity suspicion | Stop before welding; check gas | Classic porosity cause (weld defects document; general) |
| G6 | **Heat distortion caught by bead scan** | Post-scan | Bead off-centre at the seam end, although the dry run was OK | Mark for inspection; understand why the dry run could not catch it | Thermal distortion (Curiel 2023) |
| G7 | **AI false alarm** | Post-scan | Bead check flags "undercut", but the bead scan profile looks fine | Inspect, overrule with "AI was wrong" | Trust calibration (van der Waa 2021) |
| G8 | **AI miss** | Inspection | Bead check says OK; NDT entry later shows a crack; the card turns red | Notice and flag; see the track record update | Cross-check design (doc 04) |
| G9 | **Profilometer dirty** | Seam scan | Scan with gaps and noise; low-confidence card | Clean the lens (pictogram) and rescan | Sensor contamination and drift (Zhang 2026) |

### WAAM repair

| ID | Anomaly | When | What the participant sees | Expected response | Source |
|---|---|---|---|---|---|
| W1 | **Incomplete scan coverage** | Scan | Coverage 82%, hole highlighted on a shiny surface | Rescan that area | Scanning challenges (Li 2026) |
| W2 | **Part mounted wrongly** | Scan → alignment | Alignment card: poor fit to CAD, residual 3 mm | Re-mount using the guide | CAD registration (Li 2026) |
| W3 | **Missed small region** | Confirm regions | Region finder shows 2 regions; edge marks suggest 3 | Add the missing region | Region detection (Pang et al. in Georgousis 2026) |
| W4 | **Scan artefact taken as damage** | Confirm regions | Extra region on an intact surface | Remove the false region | Same |
| W5 | **Proposal with low confidence** | Parameters | Build planner: "unlike past repairs", wide interval | Ask colleague or engineer; adjust | Single-bead models don't transfer (Georgousis 2026) |
| W6 | **Interpass temperature not reached** | Run | Long wait between layers, temperature curve flat above limit | Wait, or call engineer (no override) | Interpass control (Georgousis 2026) |
| W7 | **Layer height drifting** | Run | Layer check: layer 4 is 0.6 mm too low, growing | Accept the proposed extra layer, or stop | Heat accumulation (Georgousis 2026) |
| W8 | **Humping / irregular bead at layer end** | Run | Layer scan bump at the end of the layer | Stop or continue per proposal | WAAM in-situ defects (Georgousis 2026) |
| W9 | **NDT method mismatch** | Inspection | PT passed; app reminds that internal porosity needs UT/RT | Record and request UT | NDT limits (general) |

### Suggested schedule (per participant)
- 6 trials in 2 blocks (GMAW ×3, WAAM ×3), block order counterbalanced.
- In each block:
  - **trial 1:** no anomaly (baseline and learning);
  - **trial 2:** one process anomaly (e.g. G2 or W1);
  - **trial 3:** one **AI-error** anomaly (G7/G8 or W3/W4).
- Rotate which specific anomalies appear across participants with a Latin square, so effects are not tied to one fault.
- An alternative that hides the pattern: put anomalies in 2 of 3 trials at varying positions. Participants who expect "the last one always fails" stop being surprised.

## 5 · Trial flow
1. Welcome, consent, language and persona questions (pre-questionnaire, e.g. age band, welding and robot experience, language comfort).
2. Short first-use tour: watch one simulated job.
3. Block 1 (3 trials) with think-aloud → questionnaires (METUX, HUROX, optional NASA-TLX).
4. Break.
5. Block 2 (3 trials) → questionnaires.
6. Retrospective think-aloud on 1–2 anomaly moments (replay).
7. Debrief (Wizard-of-Oz revealed), short interview.
