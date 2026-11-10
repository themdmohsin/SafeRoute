# ML hazard model — evaluation

Model version: `roadsens4m-rf-20261110` (artifact: [server/ml/modelArtifact.json](../server/ml/modelArtifact.json), 1.15 MB JSON, loaded server-side only).

## Dataset

**RoadSens-4M** — Khandakar et al., 2026, *Scientific Data*. https://doi.org/10.6084/m9.figshare.30341143.v3. Licensed CC BY 4.0; used here with attribution. We use the "Isolated Data" archive (Figshare file 58678315).

- 100 Hz Android Sensor Logger recordings: linear accelerometer (m/s², gravity removed), gravity (m/s²), gyroscope (rad/s), GPS lat/lon.
- Each anomaly is marked by a start/end annotation press; the rows between them carry the label (`Pothole` or `Bump`). One labelled stretch = one event.
- 326 events kept (134 pothole, 192 bump) across 97 drive folders; 32 stretches shorter than 1 s dropped. Plus 5 "Normal Road" drives (~7.3 min total).
- Label mapping: `Bump -> speed_breaker`, `Pothole -> pothole`, Normal Road files -> `normal`.

| split | normal | speed_breaker | pothole |
| --- | ---: | ---: | ---: |
| train (original windows) | 658 | 146 | 97 |
| train (augmented copies) | 658 | 730 | 485 |
| validation | 16 | 26 | 18 |
| test | 36 | 20 | 19 |

Split is by drive (folder / normal file number), seed 7: normal drives 3/1/1, other drives 70/15/15. No drive appears in two splits. Train normals use a 0.5 s stride; val/test normals are non-overlapping 2 s windows like the app.

## Method

1. Resample each gap-free stretch to 60 Hz (linear interpolation on a uniform grid); gyro rad/s -> deg/s.
2. 2 s windows (120 samples). Anomaly windows are centred on the peak |vertical acceleration| of the event; stretches of 1–2 s give a shorter window (features are duration-normalised).
3. 72 orientation-independent features: for each of 6 signals — total-accel magnitude, linear-accel magnitude, vertical component (projection on gravity), horizontal magnitude, gyro magnitude, jerk magnitude — mean, std, min, max, peak-to-peak, RMS, skew, kurtosis, zero-crossing rate, dominant frequency, band energy 0.5–5 Hz and 5–15 Hz. No raw per-axis values. Same code in [ml/features.py](../ml/features.py) and `computeWindowFeatures` in [src/lib/sensorWindow.ts](../src/lib/sensorWindow.ts).
4. Train-only augmentation (5 copies per event, 1 per normal): random 3D rotation of all vectors, amplitude scale 0.9–1.1, Gaussian noise (0.05 m/s², 0.5 deg/s), time shift ±0.6 s for events.
5. Imbalance: `class_weight='balanced'`.
6. Models: vertical-peak threshold and logistic regression baselines, HistGradientBoosting for comparison, RandomForest deployed (8-config grid on validation macro-F1; picked 60 trees, depth 12, min leaf 2). Total wall time 11 s.
7. **Speed is not used.** The Normal Road files have no GPS columns, so any speed feature would leak the label.

## Decision rule and threshold

`P(hazard) = 1 − P(normal)` (per-tree vote fraction). Hazard iff `P(hazard) ≥ 0.65`; its type is the likelier of pothole / speed_breaker. 0.65 is the lowest threshold whose validation hazard precision is ≥ 0.90. `ML_HAZARD_CONFIDENCE_THRESHOLD` overrides it.

Validation sweep (only 16 normal windows — noisy):

| threshold | hazard precision | hazard recall |
| --- | ---: | ---: |
| 0.5 | 0.79 | 0.84 |
| 0.6 | 0.88 | 0.82 |
| 0.7 | 0.92 | 0.80 |
| 0.8 | 0.94 | 0.68 |
| 0.9 | 1.00 | 0.57 |

Trade-off: raising the threshold cuts false alerts on smooth road but misses more hazards. Pothole-vs-bump confusion does not create false alerts, only a wrong hazard type.

## Test results (held-out drives, never used for tuning)

Deployed rule (threshold 0.65): **macro-F1 0.724**

| class | precision | recall | F1 | support |
| --- | ---: | ---: | ---: | ---: |
| normal | 0.854 | 0.972 | 0.909 | 36 |
| speed_breaker | 0.632 | 0.600 | 0.615 | 20 |
| pothole | 0.733 | 0.579 | 0.647 | 19 |

Confusion matrix (rows = true, cols = predicted; normal, speed_breaker, pothole):

```
normal        35   0   1
speed_breaker  5  12   3
pothole        1   7  11
```

Hazard vs normal: precision 0.971, recall 0.846, false-alarm rate on normal windows 2.8% (1/36).
Pothole recall at 90% pothole precision: 0.21. Speed-breaker recall at 90% precision: 0.00. The model is reliable at "something is here", weak at telling pothole from bump.

With the app's pre-filter (windows with linear-accel max < 2.5 m/s² are never sent): macro-F1 0.690; 3 of 39 test hazards fall below it, pothole recall drops to 0.47.

Baselines on the same test set:

| model | macro-F1 |
| --- | ---: |
| vertical peak-to-peak threshold (2.93 m/s²) | 0.466 |
| logistic regression | 0.709 |
| HistGradientBoosting | 0.724 |
| **RandomForest (deployed)** | **0.724** |

## Robustness (test set, deployed rule)

| variant | macro-F1 | change | hazard recall | false-alarm rate |
| --- | ---: | ---: | ---: | ---: |
| original | 0.724 | — | 0.846 | 0.028 |
| random 3D rotation | 0.724 | 0.000 | 0.846 | 0.028 |
| 10% noise (σ = 0.1 × per-axis window std) | 0.708 | −0.016 | 0.821 | 0.028 |
| event shifted 0.3–0.6 s off-centre | 0.742 | +0.018 | 0.846 | 0.028 |

Rotation has no effect because every feature is rotation-invariant.

Top features (RF importance): accTotal_domFreq, accLinear_bandLow, vertical_zcr, vertical_bandLow, horizontal_bandLow.

## Known limits

- Tiny test set (75 windows); one normal drive in test and one in validation. Expect ±10 points of noise in every number above.
- Single city in Bangladesh, daytime, dry roads, one Samsung phone, car-aligned fixed mount. No rain, night, two-wheeler or Bengaluru data.
- Only ~7 min of normal driving; real false-alarm rate on long rides is unmeasured.
- Annotation presses are human-timed; event centres use the signal peak, not ground truth.
- No speed feature (missing in normal files); speed would help pothole vs bump.
- Class imbalance (134 pothole vs 192 bump events; normal windows outnumber both).
- Browser DeviceMotion differs from Android Sensor Logger (rate, filtering, iOS sign conventions). **Not validated on a real phone in the app.**
