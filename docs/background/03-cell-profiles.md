# 03 · Cell profiles

A **cell profile** is a YAML file that fully describes one cell type. The app validates it against a JSON Schema and builds the UI from it. Adding a new cell = writing a new profile, with **no code changes** unless a genuinely new step type or widget is needed.

## Schema (summary)

```yaml
id: string                  # e.g. gmaw-fixtureless
version: semver
name: string                # shown to users
process: string             # free text label, e.g. "GMAW", "WAAM (DED-Arc) repair"
description: string

equipment:                  # shown on the cell home page
  - { key, kind: robot|cobot|power_source|positioner|scanner|sensor|tool, name, role }

streams:                    # every data stream the cell produces
  - key: string
    name: string            # welder-friendly name
    kind: image|timeseries|scan3d|scalar|event
    unit: string?
    rate_hz: number?
    source: equipment key
    phase: [prepare|preview|run|inspect]   # when it records

parameters:                 # editable or display-only settings
  - key, name, unit, type: number|integer|enum|bool
    default, min, max, options?
    editable_by: [welder|engineer]
    locked_from: stage      # e.g. run → cannot change once running
    explain: string         # one-line plain-language meaning

workflow:                   # ordered steps, grouped by lifecycle stage
  - key: string
    stage: prepare|preview|run|inspect|review
    title: string
    kind: manual|automatic|ai_proposal|confirm|scan|dry_run|process|checkpoint|data_entry
    instructions: string    # what the person does, plain language
    ui: string              # widget id, e.g. checklist, scan_viewer, region_confirm, param_form
    produces: [stream keys or decision keys]
    blocks_until: string?   # condition, e.g. "scan_coverage >= 0.95"
    can_abort: bool

ai_functions:               # every automated or AI decision the cell can make
  - key: string
    name: string            # welder-friendly
    decides: string         # one-line description of what it decides
    inputs: [stream or parameter keys]
    autonomy: propose|apply_with_veto|apply
    explanation: overlay|similar_cases|shap|heatmap|signal_timeline|rule
    verified_by: check key  # the independent later check
    model_slot: string?     # links to the ML model catalogue (see 05)

checks:                     # independent verifications
  - { key, name, kind: post_scan|layer_scan|ndt|visual|measurement, methods?: [..], compares: string }

labels:                     # annotation vocabularies offered in Label Studio
  - key, applies_to: [stream kinds], task: classification|detection|segmentation|timeseries_segments
    classes: [..]
```

## Example 1: fixtureless GMAW (abridged)

```yaml
id: gmaw-fixtureless
version: 0.1.0
name: GMAW cell, no fixtures
process: GMAW
description: Two robots hold the parts; a cobot welds along a predefined path. Parameters are set before welding and cannot change during the weld.

equipment:
  - { key: holder_a, kind: robot, name: Holding robot A, role: holds part 1 }
  - { key: holder_b, kind: robot, name: Holding robot B, role: holds part 2 }
  - { key: torch_cobot, kind: cobot, name: Welding cobot, role: moves the torch }
  - { key: psu, kind: power_source, name: Welding power source, role: preset parameters }
  - { key: profilometer, kind: scanner, name: Laser profilometer, role: finds the seam, checks the bead }

streams:
  - { key: seam_scan, name: Seam scan, kind: scan3d, source: profilometer, phase: [preview] }
  - { key: dry_run_path, name: Dry-run path, kind: event, source: torch_cobot, phase: [preview] }
  - { key: weld_signals, name: Current and voltage, kind: timeseries, unit: "A, V", rate_hz: 5000, source: psu, phase: [run] }   # assumed: logged by the power source
  - { key: bead_scan, name: Bead scan, kind: scan3d, source: profilometer, phase: [inspect] }
  - { key: bead_photo, name: Bead photos, kind: image, source: profilometer, phase: [inspect] }

parameters:
  - { key: current, name: Current, unit: A, type: number, default: 220, min: 80, max: 350, editable_by: [engineer], locked_from: run, explain: More current means deeper penetration and more heat. }
  - { key: voltage, name: Voltage, unit: V, type: number, default: 24, editable_by: [engineer], locked_from: run, explain: Sets arc length and bead width. }
  - { key: wire_feed, name: Wire feed speed, unit: m/min, type: number, default: 8, editable_by: [engineer], locked_from: run, explain: How fast wire is fed; linked to current. }
  - { key: travel_speed, name: Travel speed, unit: mm/s, type: number, default: 8, editable_by: [engineer], locked_from: run, explain: Faster travel means a smaller bead and less penetration. }

workflow:
  - { key: load, stage: prepare, title: Load parts, kind: manual, ui: checklist, instructions: Place parts in the pick-up stations and confirm part IDs., can_abort: true }
  - { key: seam_scan, stage: preview, title: Find the seam, kind: scan, ui: scan_viewer, produces: [seam_scan, path_correction], can_abort: true }
  - { key: dry_run, stage: preview, title: Dry run (no arc), kind: dry_run, ui: path_check, produces: [dry_run_path, path_check], can_abort: true }
  - { key: ready, stage: preview, title: Ready to weld, kind: confirm, ui: ready_summary, instructions: Check the corrected path and the dry-run result. Welding cannot be changed once it starts., can_abort: true }
  - { key: weld, stage: run, title: Welding, kind: process, ui: live_status, produces: [weld_signals], can_abort: false }
  - { key: post_scan, stage: inspect, title: Check the bead, kind: scan, ui: compare_viewer, produces: [bead_scan, bead_photo, geometry_check] }
  - { key: ndt, stage: inspect, title: Record inspection, kind: data_entry, ui: ndt_form }
  - { key: review, stage: review, title: Review, kind: checkpoint, ui: replay }

ai_functions:
  - { key: path_correction, name: Seam finder, decides: Where the real seam is and how far to shift the welding path, inputs: [seam_scan], autonomy: apply_with_veto, explanation: overlay, verified_by: geometry_check }
  - { key: path_check, name: Dry-run check, decides: Whether the torch path stays on the seam and clear of the holding robots, inputs: [dry_run_path, seam_scan], autonomy: propose, explanation: overlay, verified_by: geometry_check }
  - { key: weld_anomaly, name: Arc watch (after the weld), decides: Whether the current and voltage looked unusual during welding, inputs: [weld_signals], autonomy: propose, explanation: signal_timeline, verified_by: ndt, model_slot: timeseries_anomaly }
  - { key: bead_defects, name: Bead check, decides: Whether the bead shape or surface shows defects, inputs: [bead_scan, bead_photo], autonomy: propose, explanation: heatmap, verified_by: ndt, model_slot: bead_profile_classifier }

checks:
  - { key: geometry_check, name: Bead vs plan, kind: post_scan, compares: bead_scan vs corrected path and nominal bead }
  - { key: ndt, name: Inspection, kind: ndt, methods: [visual, PT, MT, UT, RT], compares: findings vs AI predictions }

labels:
  - { key: bead_surface, applies_to: [image], task: detection, classes: [porosity, undercut, spatter, crack, lack_of_fusion, overlap, burn_through, ok] }
  - { key: bead_profile, applies_to: [scan3d], task: classification, classes: [ok, undercut, excess_reinforcement, insufficient_fill, misalignment] }
  - { key: arc_events, applies_to: [timeseries], task: timeseries_segments, classes: [stable, short_circuit_burst, arc_outage, unstable] }
```

**On the dry-run pass:** it should catch path, programming and part-position errors **before** the arc starts: wrong seam position, reach or collision problems, and gripper misplacement. It **cannot** catch deviations that appear **during** welding, chiefly thermal distortion of parts held only by grippers (Curiel et al. list thermal distortion among the most common problems). The UI must say so: "Dry run OK = path correct before heating. Heat can still move the parts; the bead scan will check this." General engineering note, not from the reviewed papers: holding the parts perfectly still between dry run and weld is essential, and many fixtureless set-ups tack-weld first to lock the geometry.

## Example 2: WAAM repair (abridged)

```yaml
id: waam-repair
version: 0.1.0
name: WAAM repair cell
process: WAAM (DED-Arc) repair
streams:
  - { key: part_scan, name: Part scan, kind: scan3d, source: scanner, phase: [prepare] }
  - { key: edge_marks, name: Marked repair edges, kind: event, source: edge_finder, phase: [prepare] }
  - { key: interpass_temp, name: Interpass temperature, kind: scalar, unit: °C, source: pyrometer, phase: [run] }   # assumed sensor
  - { key: layer_scan, name: Layer scan, kind: scan3d, source: scanner, phase: [run] }                             # future option
  - { key: weld_signals, name: Current and voltage, kind: timeseries, source: psu, phase: [run] }
  - { key: final_scan, name: Final scan, kind: scan3d, source: scanner, phase: [inspect] }

parameters:
  - { key: layers, name: Number of layers, type: integer, editable_by: [welder, engineer], locked_from: run, explain: Follows from the missing height divided by layer height. }
  - { key: layer_height, name: Layer height, unit: mm, type: number, editable_by: [engineer], locked_from: run, explain: Set by wire feed and travel speed. }
  - { key: wire_feed, name: Wire feed speed, unit: m/min, type: number, editable_by: [engineer], locked_from: run }
  - { key: travel_speed, name: Travel speed, unit: mm/s, type: number, editable_by: [engineer], locked_from: run }
  - { key: stepover, name: Bead overlap (step-over), unit: mm, type: number, editable_by: [engineer], locked_from: run, explain: Distance between neighbouring beads. }
  - { key: max_interpass, name: Max interpass temperature, unit: °C, type: number, editable_by: [welder, engineer], locked_from: run, explain: The robot waits until the part has cooled to this before the next layer. }

workflow:
  - { key: mount, stage: prepare, title: Mount the part, kind: manual, ui: mount_guide, instructions: Mount the part in the jaws as shown on the CAD. }
  - { key: scan, stage: prepare, title: Scan the part, kind: scan, ui: scan_coverage, blocks_until: "scan_coverage >= 0.95", produces: [part_scan, cad_alignment] }
  - { key: mark, stage: prepare, title: Mark the repair area, kind: manual, ui: edge_marking, produces: [edge_marks] }
  - { key: confirm_regions, stage: prepare, title: Confirm repair regions, kind: confirm, ui: region_confirm, produces: [region_detection] }
  - { key: params, stage: preview, title: Set up the build, kind: ai_proposal, ui: param_form, produces: [param_proposal] }
  - { key: build, stage: run, title: Building, kind: process, ui: layer_status, produces: [interpass_temp, weld_signals, layer_scan] }
  - { key: final_scan, stage: inspect, title: Final scan, kind: scan, ui: compare_viewer, produces: [final_scan, geometry_check] }
  - { key: ndt, stage: inspect, title: Record NDT, kind: data_entry, ui: ndt_form }

ai_functions:
  - { key: cad_alignment, name: Part alignment, decides: How the scan lines up with the CAD, autonomy: apply_with_veto, explanation: overlay, verified_by: geometry_check }
  - { key: region_detection, name: Missing-volume finder, decides: Which regions are missing compared with the intact CAD, autonomy: propose, explanation: overlay, verified_by: geometry_check }
  - { key: param_proposal, name: Build planner, decides: Layers, layer height, step-over and interpass limit, autonomy: propose, explanation: similar_cases, verified_by: geometry_check, model_slot: bead_geometry_regressor }
  - { key: layer_drift, name: Layer check, decides: Whether the layer height is drifting from plan, autonomy: propose, explanation: overlay, verified_by: geometry_check }

checks:
  - { key: geometry_check, name: Repair vs CAD, kind: post_scan, compares: final_scan vs CAD plus machining allowance }
  - { key: ndt, name: NDT, kind: ndt, methods: [visual, PT, MT, UT, RT, CT], compares: findings vs predictions }
```

The NDT form must record the **method**, and the UI must warn: PT and MT detect surface or near-surface defects only; internal porosity or lack of fusion needs UT, RT or CT. (General NDT knowledge.)

## Example 3: laser-arc hybrid (stub, to prove modularity)

```yaml
id: laser-arc-hybrid
version: 0.0.1
name: Laser-arc hybrid cell (future)
process: Laser-arc hybrid welding
streams:
  - { key: coaxial_cam, name: Keyhole camera, kind: image, rate_hz: 1000, source: laser_head, phase: [run] }
  - { key: photodiode, name: Plasma light, kind: timeseries, rate_hz: 20000, source: laser_head, phase: [run] }
  - { key: seam_scan, name: Seam scan, kind: scan3d, source: profilometer, phase: [preview] }
parameters:
  - { key: laser_power, name: Laser power, unit: kW, type: number, locked_from: run }
  - { key: focal_position, name: Focus position, unit: mm, type: number, locked_from: run }
  - { key: arc_lead, name: Laser–arc distance, unit: mm, type: number, locked_from: run }
ai_functions:
  - { key: keyhole_watch, name: Keyhole watch, decides: Whether penetration looked stable, autonomy: propose, explanation: heatmap, verified_by: ndt, model_slot: image_sequence_classifier }
```

## Sensor modules (add-ons)
A sensor module adds streams, AI functions and labels to an existing profile, e.g. `thermal-camera.module.yaml` adds `pool_ir` (image, run phase), an AI function `pool_anomaly` (model slot `image_sequence_classifier` or `image_anomaly`), and IR labels. Profiles list modules under `modules: [thermal-camera]`.
