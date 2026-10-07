# ML hazard detection pipeline

## Problem statement

SafeRoute uses a simple 2-second sensor window with aggregated accelerometer, gravity, gyroscope, and GPS features. The ML layer classifies each window into one of the three supported labels: `normal`, `speed_breaker`, and `pothole`.

## Supported classes

- `normal`
- `speed_breaker`
- `pothole`

This project intentionally does not attempt to detect `broken_patch`, `crack`, or `rough_road`, because the project aims for a credible college-level baseline rather than a large production detector.

## Dataset

The repository does not contain a validated field-collection dataset, so the saved model is trained on a small synthetic demo dataset for smoke testing and API verification. The synthetic rows are clearly labelled as demo-only and are not representative of live road conditions.

## Feature vector

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

Missing numeric values are preserved as `NaN` during feature extraction and then imputed using the model's training medians at inference time. This avoids inserting fake zeros, while still keeping the model input valid.

## Model

The implementation uses a Random Forest classifier from `ml-random-forest` with a small synthetic dataset. The trained artifact is stored in [server/ml/modelArtifact.json](../server/ml/modelArtifact.json).

## Inference flow

`telemetry window -> feature extraction -> imputation -> Random Forest -> label/confidence`

The backend exposes:

- `POST /api/ml/infer`: returns `{ label, confidence }`
- `POST /api/ml/hazard`: decides whether a hazard should be created based on confidence threshold and duplicate suppression

## Confidence threshold

The default confidence floor is `0.72` and is configurable via `ML_HAZARD_CONFIDENCE_THRESHOLD`.

## Debounce logic

A hazard is only created when the predicted label is not `normal`, the confidence exceeds the configured threshold, and there is no recent nearby hazard with the same `mlLabel` within 50 meters and 30 minutes.

## Limitations

- no large-scale real-world validation yet
- small synthetic demo dataset only
- sensor aggregation is limited to 2-second windows
- different mounts, phones, road surfaces, and speed profiles can change signal quality
- model should be retrained with real labelled windows before claiming production reliability

## Training and validation workflow

1. collect labelled 2-second telemetry windows
2. convert them into the fixed feature vector
3. split by ride/session to avoid leakage
4. train and evaluate a Random Forest model
5. save the artifact and feature metadata
6. use the configured confidence threshold for hazard creation
