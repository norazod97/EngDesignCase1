# 04 · AI transparency layer

Every AI or automated decision is a **DecisionRecord**, shown as a **decision card**, collected in a **decision log**, later **verified by an independent check**, and summarised in a **track record**.

## DecisionRecord (backend)

```json
{
  "id": "dec_0192",
  "run_id": "run_0457",
  "ai_function_key": "path_correction",
  "model_version": "seam-finder 1.3.0",
  "what": "Shifted the weld path 1.2 mm left at the start of the seam",
  "why": {
    "type": "overlay",
    "summary": "The scan shows the plate edge here, not where the CAD expects it",
    "evidence": { "scan_item": "di_8812", "nominal_path": "...", "corrected_path": "..." },
    "top_factors": []
  },
  "confidence": { "level": "high", "value": 0.93, "basis": "clear edge; similar to 240 earlier parts" },
  "unfamiliar": false,
  "autonomy": "apply_with_veto",
  "status": "applied",
  "user_actions": ["view_detail", "veto_before_weld", "flag_wrong"],
  "verified_by_check_id": null,
  "outcome": "unknown",
  "created_at": "..."
}
```

`why.type` decides how the card explains itself:

| type | Use for | Shown as |
|---|---|---|
| `overlay` | Geometric decisions (seam, path, regions, alignment, layer height) | 3D or 2D overlay of nominal vs measured vs decided |
| `similar_cases` | Proposals based on past jobs (parameters) | 2–3 most similar past runs with their outcome |
| `shap` | Numeric models on named inputs | Top 3 contributions in mm or %, in plain words |
| `heatmap` | Image models | Image with highlighted region (Grad-CAM) |
| `signal_timeline` | Time-series models | Signal chart with the unusual moment marked |
| `rule` | Simple rules and thresholds | "Above 9 mm/s the bead gets too narrow" |

## Decision card (frontend)

```
┌──────────────────────────────────────────────────────────┐
│ Seam finder                         ● High confidence    │
│ WHAT   Shifted the path 1.2 mm left at the seam start    │
│ WHY    The plate edge is here, not where the CAD says    │
│        [ small overlay preview ]           More detail ▸ │
│ YOU CAN  Stop before welding · Flag as wrong             │
│ CHECKED LATER BY  Bead scan after welding                │
└──────────────────────────────────────────────────────────┘
```

Rules:
- Lines are short, in shop-floor words; units always shown.
- **Confidence**: three levels (high / medium / low) plus number on hover. Low confidence = amber card and a sentence on what to check.
- **Unfamiliar case** banner when inputs are outside the training range: "This part looks different from anything I've seen. Check carefully."
- **Autonomy badge**: Suggestion · Applied, you can stop it · Applied automatically.
- **"You can"** always lists real actions or says "Nothing can be changed during this weld. Review it afterwards."
- **More detail** opens a drawer with full evidence, model version and raw values (for engineers and inspectors).

## Decision log
A per-run timeline of all decision cards, alongside stage changes and checks. It is the backbone of the Replay view.

## Cross-checks (making errors visible)
Each AI function names a `verified_by` check in the cell profile. When the check result arrives, the backend sets `outcome`:
- `correct`: check agrees within tolerance.
- `wrong`: check disagrees. The card turns red in the log, the run gets a "the AI was wrong here" marker, and the case is added to the track record's list of misses.
- `unknown`: no check yet.

Examples:
- `path_correction` vs post-weld bead scan (bead centred on the real seam?).
- `bead_defects` vs NDT findings.
- `param_proposal` vs final scan (height reached?) and NDT.

## Track record (for each AI function)
On the Models page and inside "More detail":
- "Correct on 197 of the last 200 checked decisions." Show the misses, and their runs, one click away.
- Breakdown by confidence level ("when it said high confidence, it was right 99% of the time; medium 85%"). This helps people learn when to trust it.
- Trend over model versions.

## Feedback ("the AI was wrong")
- On every card: Agree · Wrong · Not sure, with an optional comment.
- Feedback is stored and shown to engineers. It can become an annotation for retraining.
- Make clear what feedback is used for. It evaluates the AI, **not the person**.

## Training mode (research feature)
On past runs, the user first predicts the result (e.g. "will the bead scan pass?"), then sees the AI decision and the real outcome. This supports trust-calibration studies (cognitive-forcing idea; general HCI literature, e.g. Buçinca et al. 2021).

## Wording guide (examples)
| Avoid | Use |
|---|---|
| Inference confidence 0.62 | Medium confidence: check the start of the seam |
| Anomaly score exceeded threshold | The arc looked unusual for 0.3 s here |
| Feature `ctwd` SHAP −0.31 | Longer stick-out made the bead about 0.3 mm shallower |
| Model output: class 3 | Possible undercut on the left edge |
