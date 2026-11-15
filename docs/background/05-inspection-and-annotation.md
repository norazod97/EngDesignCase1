# 05 · Data Explorer, annotation and training

A sidebar module for the **welding inspector** (and engineers): browse data captured during and after runs, select a subset, annotate it in **Label Studio**, build a versioned dataset, and train a **pre-picked model** suited to that kind of data.

## User flow

```
Data Explorer
 1 FILTER     cell · job / assembly · run(s) · sensor(s) · time window · data kind · has-annotation · AI flagged
 2 PREVIEW    image gallery / synced signal charts / 3D scan viewer · counts per filter
 3 SELECT     all filtered items, or pick items; optional sampling (random, flagged-first, uncertain-first)
 4 ANNOTATE   "Open in Label Studio" → project created with the right labelling template → inspector labels
 5 DATASET    annotations pulled back → dataset vX (frozen item list + labels + label schema + split by run)
 6 TRAIN      choose task → app proposes the pre-picked model(s) → train → evaluation report
 7 APPROVE    engineer reviews metrics and examples → approve → becomes the model behind an AI function
```

## 1 · Filter panel
- **Cell** (from registered cells) → **Job / assembly** → **Run(s)**.
- **Sensor**: a checklist built from the cell profile's `streams` (only streams that exist for the selected cells). Shows kind and unit, e.g. "Bead photos (image)", "Current and voltage (time series, 5 kHz)".
- **Time window**:
  - by date range across runs, or
  - **within a run**: a timeline brush over the run, with stage markers (dry run, weld, post-scan). This selects signal windows or image frames in that span.
- **Extra filters**: annotated / not annotated, AI flagged (decision status), check outcome (wrong / correct), confidence level.
- Filters are saved in the URL and can be stored as a named "view".

## 2 · Preview
- Images: grid with lazy loading; click opens full view with metadata (run, time, sensor).
- Time series: stacked charts with a shared time axis; AI events and stage changes as markers.
- 3D scans: viewer with nominal/CAD overlay.
- Header shows counts: items, runs, time span, already annotated.

## 4 · Label Studio integration
Label Studio runs as a separate service (Docker). The backend talks to it through its REST API / `label-studio-sdk`. Claude: **check the current Label Studio documentation** for exact endpoints and config tags.

Behaviour:
- **Create or reuse a project** per (cell profile, label set), e.g. `gmaw-fixtureless · bead_surface`.
- **Labelling template generated from the profile's `labels`** entry:
  - image + `classification` → `<Image>` + `<Choices>`
  - image + `detection` → `<Image>` + `<RectangleLabels>`
  - image + `segmentation` → `<Image>` + `<BrushLabels>` or `<PolygonLabels>`
  - timeseries + `timeseries_segments` → `<TimeSeries>` with channels + `<TimeSeriesLabels>`
  - scan3d: export a 2D representation first (height map or cross-section profile image), then treat as image classification. Native 3D labelling is out of scope.
- **Push tasks**: one task per DataItem, with a URL the Label Studio container can read (served by the backend or a shared storage mount), plus metadata (run, time, sensor).
- **Pre-annotation (optional)**: if a model exists for that label set, send its predictions as pre-annotations, clearly marked as AI suggestions, so the inspector corrects rather than starts from zero.
- **Open**: the button opens the Label Studio project in a new tab (or an iframe if allowed), filtered to the pushed tasks.
- **Pull back**: via webhook on annotation create/update, or a "Sync annotations" button. Store as `Annotation` rows linked to the DataItem.
- **Who labelled what** is recorded (annotator, time) for traceability and inter-rater checks.
- If Label Studio is not running, the UI explains how to start it rather than failing silently.

## 5 · Datasets
- A dataset version freezes item IDs, labels, label schema, filter used, and the **split assignment by run** (train/validation/test). Never split frames or windows of the same run across sets: the DED-Arc review (Georgousis et al. 2026) shows a 96.5% → 12.8% collapse when this is done wrong.
- Shows class balance; warns when a class has fewer than ~20 examples or when the test set lacks a class.

## 6 · Pre-picked model catalogue
The app does **not** ask the inspector to choose an architecture. It proposes a default per data kind and task, based mainly on Zhang et al. 2026 (real-time welding defect diagnosis review, Table 4 and Fig. 11), with support from Geng et al. 2025 and the DED-Arc review. An engineer can switch to the alternative.

| Model slot | Data and task | Default model | Alternative | Why (literature) | Explanation |
|---|---|---|---|---|---|
| `bead_image_classifier` | Bead photos → defect class | **Pre-trained CNN fine-tuned** (ResNet-18 / MobileNetV3 / DenseNet, transfer learning) | CNN + Random Forest on CNN features | CNNs are the standard for weld images; transfer learning works with limited labels (e.g. DenseNet 97.22% with limited data, Sassi et al. in Zhang 2026) | Grad-CAM heatmap |
| `bead_image_detector` | Bead photos → defect locations | **YOLO (small variant)** | U-Net if pixel masks exist | YOLO is fast but weaker on very small defects; U-Net needs pixel labels (Zhang 2026, Table 4); ELD-YOLO, Chen 2026 | Boxes + Grad-CAM |
| `bead_profile_classifier` | Profilometer profiles / laser stripe → defect class | **Random Forest on geometric features** (width, height, toe angles, undercut depth, misalignment) | Stacked autoencoder on contour data | RF on laser-stripe features: 96% on 5 GMAW defect types at 5.3 ms/image (Zhu et al. in Zhang 2026); structured-light autoencoder (Shu et al.) | **SHAP on named features** |
| `image_anomaly` | Images, few or no defect labels | **Autoencoder / MobileNet trained on normal samples only** | — | Normal welds are plentiful, defects rare; reconstruction error flags anomalies (Grad-MobileNet 99%, Xiao et al. in Zhang 2026) | Reconstruction-error map |
| `timeseries_anomaly` | Current/voltage (or sound) windows, unlabelled | **Autoencoder on windows** | Isolation Forest on window features | Unsupervised detection when labels are scarce (Zhang 2026, section 4.7) | Signal timeline with marked windows |
| `timeseries_classifier` | Current/voltage windows → stable / unstable / defect precursor | **LSTM (or 1D-CNN) on windows** | Decision tree / Random Forest on window statistics | LSTMs capture build-up of porosity precursors over hundreds of ms in GMAW; decision trees on GMAW current/voltage signatures (Sumesh et al.) as an interpretable baseline (Zhang 2026, 4.1 and 4.3) | Timeline + SHAP for the tree baseline |
| `image_sequence_classifier` | Thermal / pool image sequences (future camera) | **CNN-LSTM** | CNN per frame + vote | Thermal imaging with spatial and temporal information → CNN-LSTM for burn-through and incomplete fusion (Zhang 2026, Fig. 11) | Heatmap per frame + timeline |
| `bead_geometry_regressor` | Parameters → bead width / height (WAAM planning) | **Gaussian process** or **XGBoost** | Small MLP | The most established DED-Arc ML task; GP gives uncertainty, XGBoost gives exact SHAP (DED-Arc review 4.1) | SHAP or similar cases + interval |
| `multimodal_fusion` | Images + signals + parameters | *Later*: CNN/ResNet + transformer fusion | — | State of the art (98.94%, Jiang et al. in Zhang 2026) but needs synchronised multi-sensor data; not in v1 | — |

**Always train an interpretable baseline next to a deep model** (e.g. Random Forest on features alongside the CNN). If the baseline is nearly as good, prefer it: simpler and directly explainable with SHAP. This links to the Rashomon-set idea: among equally good models, choose the one whose explanation makes physical sense.

## Evaluation report (shown before approval)
- **Split by run** (stated on the report).
- Per-class **recall**, precision, F1, **MCC**, balanced accuracy; confusion matrix; precision-recall curve when defects are rare. For defects, a missed defect matters more than a false alarm: highlight recall and the false-negative rate (DED-Arc review section 5).
- Regression: MAE in mm **and** relative to the target range; calibration of the uncertainty intervals.
- **Inference time** per sample (relevant for later real-time use; Zhang 2026 notes inference above ~50 ms is too slow for immediate adjustments).
- Example gallery: correct, wrong, and least confident cases.
- Comparison with the current approved model and the interpretable baseline.
- Honest banner on simulated data: "Trained on simulated data. Results say nothing about real welds."

## 7 · Approval and deployment
- An engineer approves a candidate model; it becomes the model behind the matching `model_slot` in the cell profile.
- New decisions record the new `model_version`; the track record continues per version.
- One-click rollback to the previous approved version.
