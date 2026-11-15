# 01 · Product brief

## Vision
A web platform that lets a welder operate advanced, AI-assisted multi-robot welding cells **confidently**: it explains what the automation and AI are doing in the welder's own terms, shows how sure it is, and makes its mistakes visible so people can catch them.

## Context and honesty about scope
- The cells described here exist at R&D centres; their behaviour is known only in broad strokes, and **no real data is available**. The prototype is **speculative** and runs on **simulated data**.
- Its purpose is design research: to explore and test interfaces, information architecture and explanation styles with welders and inspectors, and to compare the cells with the state of the art in the literature.

## Users (personas)
**Who the operators are** (details and design rules in `08-human-centred-design.md`):
- older workers with weaker memory, slower learning and musculoskeletal disorders;
- younger migrant workers facing language barriers;
- casual workers hired at short notice.

All have little robot-programming experience and little time, help each other, and are likely to distrust the system at first. Design goals: perceived competence, situational awareness of robot state, ownership of robot actions, calibrated trust.

**Roles** (any persona can hold the welder/operator role):

| Role | Main goals | Main screens |
|---|---|---|
| **Welder / cell operator**: skilled in welding, limited IT and AI background | Prepare parts, start jobs, understand what the cell did and why, notice when something is off | Cell home, Job wizard, Run view, Decision cards |
| **Welding inspector**: knows standards and NDT | Review captured data, record inspection and NDT results, annotate samples, judge AI quality | Data Explorer, Inspection, Annotation |
| **Process / ML engineer** | Configure cells and recipes, train and approve models, monitor AI track records | Cell configuration, Recipes, Models |
| **Admin** | Users, roles, data-sharing settings | Settings |

## Design principles
1. **Show the part, not the algorithm.** Explanations appear on the 3D part, the bead, the scan.
2. **Speak shop-floor language.** Units and words welders use.
3. **Progressive detail:** status → reason → full detail, on demand.
4. **Say what can be done now**, or say clearly that nothing can be changed until the next part.
5. **No silent automation.** Every automatic action is a visible decision card.
6. **Honest uncertainty.** Confidence on every AI output; an "unfamiliar case" warning when inputs are outside past experience.
7. **The welder is the expert reviewer.** Confirmation steps make the person actually check (deviation maps, highlighted areas), not just click OK. Literature: van der Waa et al. 2021 found explanations increased reliance on *wrong* advice.
8. **One lifecycle for every cell:** Prepare → Preview → Run → Inspect → Review & Learn.
9. **Modular:** new cells and sensors plug in through configuration.

## Cells in scope (first version)
### A. Fixtureless GMAW cell
- Two manipulator robots pick up and hold the parts; a cobot carries the torch along a predefined path.
- Welding parameters are preset in the power source and **locked** once the weld starts.
- Sensor: **profilometer** (laser line), used (1) to find the seam before welding and (2) to compare the final geometry with the scan after welding.
- Sequence: seam scan → **dry-run pass** (torch follows the path without arc, to check it) → return to start → weld pass → post-weld scan.
- A weld is too short for a person to intervene mid-weld, so explanations happen **before** (preview), **after** (replay) and **between parts**.
- Future option: thermal camera on the pool, images stored for ML after the weld.

### B. WAAM repair cell
1. Mount the part (matching a pre-uploaded CAD of the intact part) with jaws.
2. Scan its geometry by hand-guiding a robot with a mounted 3D scanner.
3. Mark the perimeter of areas with missing volume using a digital edge finder.
4. Confirm the scanned mesh regions were identified correctly.
5. Indicate or validate parameters (number of layers, interpass temperature or wait time; AI may propose).
6. Start the process.
7. After the build: geometry scan; NDT by the operator (record which method: PT and MT find surface defects only; UT and RT are needed for internal porosity and lack of fusion).

### C. Future: laser-arc hybrid cell
Not built now, but the architecture must accept it through a new cell profile.

## Core features (first version)
- Shopfloor overview of all cells.
- Job wizard driven by the cell profile's workflow steps.
- Run view (live status, simulated) and Replay ("flight recorder").
- AI decision cards, decision log, track record for each AI function.
- Inspection: geometry comparison results, NDT result entry.
- **Data Explorer** for inspectors: filter by cell, job, sensor and time window; preview; send to **Label Studio** for annotation; datasets; training with pre-picked models; model registry with human approval.
- Cell configuration: load and validate cell profiles.

## Non-goals (for now)
- Real equipment connectivity (OPC UA, robot controllers, power sources). Only a simulated event stream, behind an interface that a real connector could implement later.
- Real-time closed-loop control.
- Multi-site data sharing or federated learning (documented as future work).
- Production-grade security. Basic login and roles only.

## First evaluation
A within-subject Wizard-of-Oz study:
- each participant does 3 GMAW and 3 WAAM jobs in the app;
- the researcher triggers fake anomalies from a hidden console;
- measures: think-aloud, HUROX, METUX and logged behaviour.

See `09-wizard-of-oz-study.md`.

## Research questions the prototype should help answer
- Which explanation style helps welders most for each kind of decision: geometric overlay, similar past cases, or SHAP?
- Do decision cards plus a track record help people catch AI errors, or mainly increase trust?
- How much autonomy should each AI function have (propose / apply with veto / apply)?
- What would welders and workshops be willing to share, and under what conditions?
