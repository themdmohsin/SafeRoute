# ML hazard detection pipeline

Model version: **`roadsens4m-rf-20261110`** — RandomForest (60 trees) trained on RoadSens-4M. Metrics, limits and threshold trade-off: [ml-model-evaluation.md](ml-model-evaluation.md).

## Classes

`normal`, `speed_breaker`, `pothole` (this order is the model's label index order).

## Flow

```
phone DeviceMotion (~60 Hz) -> 2 s window -> computeWindowFeatures (src/lib/sensorWindow.ts)
  -> POST /api/ml/hazard { window: { schemaVersion: 2, gps, features, ...legacy summaries } }
  -> buildFeatureVector (server/ml/featureVector.js) -> RandomForest (ml-random-forest JSON)
  -> P(hazard) = 1 - P(normal) >= hazardThreshold ? likelier hazard class : normal
```

- Features: 72 orientation-independent values (6 signals × 12 stats; see the evaluation doc). Raw per-axis values are not used, so the phone can sit at any angle. Missing features stay `NaN` and are imputed with training medians.
- Threshold: `artifact.hazardThreshold` (0.65, tuned on validation), overridable with `ML_HAZARD_CONFIDENCE_THRESHOLD`. `confidence` in the response is `P(hazard)` for hazards and `P(normal)` otherwise; `probabilities` gives all three.
- The phone skips the request when the window's linear-accel max is below 2.5 m/s².
- Debounce: no new ML hazard with the same label within ~50 m and 30 minutes.
- Endpoints: `POST /api/ml/infer`, `POST /api/ml/hazard`.

## Dataset

RoadSens-4M (Khandakar et al., 2026, *Scientific Data*), https://doi.org/10.6084/m9.figshare.30341143.v3, CC BY 4.0. It is publicly downloadable from Figshare; we use the "Isolated Data" archive. Label mapping: `Bump -> speed_breaker`, `Pothole -> pothole`, Normal Road files -> `normal`. The dataset is never committed (`ml/data/` is git-ignored).

## Rerun

Needs Python 3 with numpy, pandas, scipy, scikit-learn; Windows `tar.exe` (bsdtar) or `unrar` for the `.rar` files.

```bash
mkdir -p ml/data/raw/normal ml/data/raw/anom ml/logs
curl -L -o ml/data/isolated.zip https://ndownloader.figshare.com/files/58678315
cd ml/data && python -c "import zipfile; zipfile.ZipFile('isolated.zip').extractall('.')"
(cd raw/normal && tar -xf "../../Isolated Data/Normal Road/Normal Road.rar")
(cd raw/anom && tar -xf "../../Isolated Data/Road Anomalies/Road Anomalies (1-86).rar" \
             && tar -xf "../../Isolated Data/Road Anomalies/87-103-GIS-integrated.rar")
cd ../..
python ml/convert.py > ml/logs/convert.log 2>&1   # windows + features + parity fixture
python ml/train.py   > ml/logs/train.log   2>&1   # baselines, RF, eval, exports server/ml/modelArtifact.json
npm test                                          # TS/Python feature parity + JS/Python model parity
```

Metrics land in `ml/logs/metrics.json`; copy changes into `docs/ml-model-evaluation.md`.

## Files

- [ml/features.py](../ml/features.py) — feature definitions (Python, used for training).
- [src/lib/sensorWindow.ts](../src/lib/sensorWindow.ts) — same features on the phone.
- [ml/convert.py](../ml/convert.py) — parse, resample to 60 Hz, window, augment, split by drive.
- [ml/train.py](../ml/train.py) — baselines, model selection, threshold, evaluation, export to the `ml-random-forest` format.
- [server/tests/featureParity.test.js](../server/tests/featureParity.test.js) — asserts TS features == Python features and JS model votes == Python votes on 24 real windows.
- `server/ml/modelArtifact.json.bak` — the previous (training-blocked) artifact, kept for rollback.

## Not yet validated

Real-phone behaviour in the app (browser sensor rates, iOS sign conventions, holders, two-wheelers), Bengaluru roads, rain/night, long-ride false-alarm rate.
