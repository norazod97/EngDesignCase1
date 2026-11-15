# 06 · Mock data and simulator

No real cell data is available, so a **simulator** produces believable runs, sensor data and AI decisions, **including deliberate AI errors**, so the transparency features can be designed and tested.

## Principles
- Deterministic with a seed, so demos and user tests are repeatable.
- Plausible, not physically exact. Label everything "Simulated".
- Configurable error rates per AI function, so studies can vary how often the AI is wrong.
- Generated from the cell profile: the simulator reads the profile's streams and AI functions.

## GMAW simulation
For each run:
- **Seam scan**: a synthetic 3D point grid of a fillet or butt joint; the real seam is offset from nominal by a random 0–2.5 mm (sometimes larger, to trigger "unfamiliar").
- **Path correction decision**: estimates the offset with small noise; in ~3% of runs a wrong estimate (e.g. locks onto a plate edge).
- **Dry run**: reports whether path deviation stays under 0.5 mm and clearances are OK; occasional "too close to holding robot A".
- **Weld signals**: current and voltage at, say, 5 kHz for 20–60 s. Base values from the recipe; short-circuit spikes; noise; in ~10% of runs an inserted instability (bursts or a drift) a few hundred ms before a defect.
- **Thermal distortion**: random small part shift during the weld (0–1 mm), which the dry run cannot catch.
- **Bead scan and photos**: synthetic profiles (width, height, toe angles) derived from parameters plus distortion; defects inserted consistently with the instabilities (porosity, undercut, misalignment). Bead photos can be simple procedurally generated images with drawn defects, or a small set of public weld images if licences allow (check licences; otherwise generate).
- **NDT results**: generated from the ground truth with an inspection method and a detection probability per method (PT misses internal pores).

## WAAM repair simulation
- A simple part CAD (e.g. a block with a chipped edge or worn surface); scan = CAD minus a missing volume, plus noise and some unscanned holes (coverage < 100%).
- Region detection: usually right; sometimes misses a small region or includes a scan artefact.
- Parameter proposal: layers = missing height / layer height ± drift; similar past cases drawn from a synthetic history.
- Per layer: interpass temperature curve (heating, cooling, wait until below the limit); layer height drift growing with heat build-up.
- Final scan and NDT as above.

## Volume
Seed script creates roughly 2 cells × 150 runs, so that track records, Data Explorer filters and training have something to show. Big binary data (images, scans) are kept small (low-resolution) to keep the repo light.

## Event stream
The simulator can "play" a run in real time (or faster) over WebSocket, so the Run view shows live updates exactly as a real connector would.
