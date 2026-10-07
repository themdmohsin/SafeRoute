# ML hazard detection pipeline

## Implemented

This branch implements the SafeRoute ML boundary around the existing telemetry window contract rather than reinventing the sensor pipeline.

### Supported classes

- `normal`
- `speed_breaker`
- `pothole`

This project does not include the extra classes from the broader road-surface taxonomies, because the project requirement explicitly limits the target classes to the three above.

### Canonical feature extractor

The exact feature ordering is fixed in [server/ml/featureVector.js](../server/ml/featureVector.js):

- `accel_mean_x`, `accel_mean_y`, `accel_mean_z`
- `accel_std_x`, `accel_std_y`, `accel_std_z`
- `accel_min_x`, `accel_min_y`, `accel_min_z`
- `accel_max_x`, `accel_max_y`, `accel_max_z`
- `accel_magnitude_mean`, `accel_magnitude_std`, `accel_magnitude_max`
- `gravity_x`, `gravity_y`, `gravity_z`, `gravity_tiltDeg`
- `gyro_mean_x`, `gyro_mean_y`, `gyro_mean_z`
- `gyro_std_x`, `gyro_std_y`, `gyro_std_z`
- `gyro_maxMagnitudeDegPerS`
- `gps_speedMps`

Missing numeric values are preserved as `NaN` during extraction and imputed only when the downstream model requires it. The code does not fabricate zero values for unavailable sensors.

### Inference flow

`telemetry window -> canonical feature extraction -> model -> label/confidence`

The backend exposes:

- `POST /api/ml/infer`
- `POST /api/ml/hazard`

The confidence gate is configurable using `ML_HAZARD_CONFIDENCE_THRESHOLD` and defaults to `0.72`.

### Debounce logic

A hazard is only created when:

- the model predicts a non-normal label
- confidence is at or above the configured threshold
- there is no recent nearby ML hazard with the same `mlLabel` within roughly 50 m and 30 minutes

This avoids duplicate hazards from repeated windows from the same road defect.

## Real dataset research and access audit

The following public smartphone/IMU road-event datasets were reviewed before changing the training path. The main conclusion is that no single legitimate dataset was directly downloadable in this environment without unclear or restricted access, so the final training step remains blocked until a public dataset is actually obtained.

| Dataset | Source / reference | Sensors | Sampling rate | Phone / mount | Labels | License / access | Downloadable here? | Pothole | Speed breaker | Normal | GPS / speed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Khandakar smartphone pothole dataset | Khandakar et al. smartphone pothole detection papers; title patterns include road pothole detection from smartphone sensor data and automated machine learning pothole detection using smartphone sensor data | Smartphone accelerometer / gyroscope; often IMU + optional GPS | Usually 20-50 Hz or similar phone sampling in the paper methods | Smartphone mounted in vehicle; exact mount varies by study | Pothole / normal (and often rough-road variants depending on the study) | Usually paper-based publication; no standard public dataset license was confirmed in the available metadata | Not confirmed as a directly downloadable public dataset in this environment | Yes | Not usually | Yes | Sometimes GPS/speed metadata present, but not guaranteed |
| RoadSense / RSC smartphone road-surface condition work | RoadSense: smartphone application to estimate road conditions using accelerometer and gyroscope; Road Surface Condition / roughness papers | Accelerometer + gyroscope | Paper-specific; often tens of Hz from phone sensors | Consumer smartphone mounted in vehicle | Rough / smooth / varied road condition labels; not always pothole-specific | Academic paper only; dataset access not clearly published as a reusable public archive | Not confirmed as directly downloadable public data in this environment | Sometimes indirectly, but not as a clean pothole class | Not reliably | Yes | Often limited or context-dependent |
| Kaggle road-surface / pothole sensor datasets | Kaggle search results for "pothole sensor data", "speed breaker accelerometer", "road surface condition accelerometer" | Accelerometer / gyroscope / sometimes GPS | Varies by dataset | Varies by dataset | Pothole / normal / speed breaker / road quality | Kaggle terms + dataset-specific licensing; often requires login and agreement | Not available here because Kaggle access/login was not established | Often yes | Often yes | Often yes | Dataset-dependent |
| PVS / traffic-driving-style-road-surface-condition dataset | Kaggle result for road surface condition and passive vehicular sensors | Passive vehicular sensors, accelerometer, likely smartphone/vehicle telemetry | Varies | Vehicle-embedded or phone-based setups | Road surface condition / traffic / driving style categories | Kaggle or dataset-specific terms apply; not confirmed as open/reusable without login | Not available here because Kaggle access/login was not established | Depends on labels | Depends on labels | Yes | Sometimes present |

### Access conclusions

- The Khandakar and RoadSense/RSC papers are legitimate academic references and are relevant to the problem, but the dataset files themselves were not accessed in a way that would allow a reproducible training run in this environment.
- The Kaggle datasets are the closest practical public candidates, but they are not directly downloadable without a Kaggle account and acceptance of dataset terms.
- Because no real dataset was obtained here, the final model training remains blocked and no real evaluation metrics are available.

## Dataset conversion pipeline

The project includes a real-data conversion interface, but it is intentionally blocked until a real labelled dataset is supplied.

The conversion flow is:

```
raw public sensor dataset
  -> dataset-specific parser
  -> SafeRoute-style 2-second window synthesis
  -> canonical SafeRoute feature extraction
  -> label mapping to normal / speed_breaker / pothole
  -> grouped train/validation/test split by ride/session
  -> Random Forest training/evaluation
```

This is implemented in [server/ml/trainModel.js](../server/ml/trainModel.js) and relies on the canonical feature extractor in [server/ml/featureVector.js](../server/ml/featureVector.js).

## Label mapping policy

The SafeRoute target labels are:

- `normal`
- `speed_breaker`
- `pothole`

Only source labels that map cleanly to those semantics are accepted. For example:

- `speed bump`, `speed breaker`, `hump` -> `speed_breaker`
- `pothole`, `road_hole` -> `pothole`
- `smooth`, `asphalt`, `good_road` -> `normal`

Classes that cannot be mapped with confidence are intentionally excluded rather than forced into the wrong class.

## Current status: training blocked

The project does not currently have a legitimate, downloaded, reusable labelled dataset for final training. To avoid fake results, the production artifact at [server/ml/modelArtifact.json](../server/ml/modelArtifact.json) is intentionally left in a `training-blocked` state instead of pretending a synthetic smoke-test model is real.

The synthetic unit-test model is kept only under the test-fixture path and is explicitly not used as the final model for training or evaluation.

## Model and evaluation status

### Actual model

- algorithm: Random Forest (implementation ready)
- feature count: 27
- classes: `normal`, `speed_breaker`, `pothole`
- artifact: [server/ml/modelArtifact.json](../server/ml/modelArtifact.json)
- model version: blocked; real training not performed

### Actual evaluation metrics

None are reported because no real labelled dataset has been obtained. This is intentional and required to avoid fabricated results.

## Not yet validated

- SafeRoute phone-to-phone transfer
- Bengaluru-specific road behavior
- different phone mounts
- different road surfaces
- real speed dependence
- live device calibration

## Small SafeRoute-specific calibration path

The pipeline is ready for later addition of a local labelled dataset with a format such as:

```
ride_id,timestamp,label,accel_mean_x,...,gps_speedMps
```

or a JSON row-per-window format where each row includes the exact SafeRoute feature values alongside the label and ride/session metadata.

This allows a small SafeRoute-specific calibration set to be added without rewriting the model architecture.

## Summary

The ML boundary is in place, the feature extractor is canonical, the dataset conversion path is defined, and the inference/hazard integration is working structurally. The remaining blocker is not implementation work; it is the absence of a legitimate real labelled dataset that can be downloaded and reused in this environment.
