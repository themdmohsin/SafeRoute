# SafeRoute Sensor-Window Contract (schemaVersion 1)

**Audience:** the ML workstream developer. This is the exact JSON the client
pipeline produces and the backend stores. Implement against this document and
against the TypeScript source of truth in `src/sensors/contract.ts`
(frontend) / `server/services/telemetryValidation.js` (backend). If code and
this doc ever disagree, both are wrong — fix both and bump `schemaVersion`.

## Transport

```
POST /api/rides/:rideId/telemetry
Authorization: Bearer <jwt>            # same auth as every other /api route
Content-Type: application/json
```

Request body:

```json
{
  "schemaVersion": 1,
  "windows": [ SensorWindow, ... ]     // 1..120 windows per request
}
```

Response `202 Accepted`:

```json
{ "accepted": 38, "duplicates": 2, "firstSeq": 40, "lastSeq": 79 }
```

Windows are **write-once**: the pair `(rideId, seq)` is unique in the
database; re-sent windows are counted in `duplicates` and not duplicated.
Reading back (owner only): `GET /api/rides/:rideId/telemetry?limit=200&beforeSeq=<n>`
returns `{ windows: [...], count }` sorted newest-seq-first.

## One SensorWindow

```json
{
  "schemaVersion": 1,
  "windowId": "68f1a2b3c4d5e6f7a8b9c0d1:42",
  "rideId": "68f1a2b3c4d5e6f7a8b9c0d1",
  "seq": 42,
  "startedAt": "2026-10-07T09:31:24.000Z",
  "endedAt": "2026-10-07T09:31:26.000Z",
  "durationMs": 2000,
  "sampleCount": 118,
  "nominalIntervalMs": 16.6667,
  "gps": {
    "lat": 12.9716,
    "lng": 77.5946,
    "accuracyM": 8.5,
    "speedMps": 4.21,
    "headingDeg": 271.4,
    "timestamp": "2026-10-07T09:31:25.900Z"
  },
  "accel": {
    "mean":   { "x": 0.0421, "y": -0.1180, "z": 0.0312 },
    "std":    { "x": 0.5120, "y": 0.2871,  "z": 0.4103 },
    "min":    { "x": -1.9340, "y": -1.2210, "z": -1.0030 },
    "max":    { "x": 2.2100,  "y": 1.1103,  "z": 1.8720 },
    "magnitude": { "mean": 0.7531, "std": 0.4410, "max": 3.1204 }
  },
  "gravity": { "x": 0.2110, "y": -0.4032, "z": 9.5641, "tiltDeg": 87.4 },
  "gyro": {
    "mean": { "x": 1.2104, "y": -0.3310, "z": 0.0821 },
    "std":  { "x": 3.4410, "y": 2.1104,  "z": 1.0031 },
    "maxMagnitudeDegPerS": 21.4403
  }
}
```

Every numeric value is rounded to **4 decimal places**. `null` means "sensor
absent / not reported" — fields are never zero-fabricated.

## Field-by-field definition

| Field | Type | Definition |
| --- | --- | --- |
| `schemaVersion` | int, constant `1` | Contract version. Reject anything else. |
| `windowId` | string | Stable id: `` `${rideId}:${seq}` ``. Unique per ride, ≤128 chars. |
| `rideId` | string | Mongo `_id` of the `RideSession`. |
| `seq` | int ≥ 0 | Monotonic per-ride window counter starting at 0, +1 per closed window. Gaps are legal (silent periods produce no window). |
| `startedAt` | ISO-8601 UTC | Wall-clock start, aligned down to the window grid: `floor(receivedAtMs / 2000) * 2000`. |
| `endedAt` | ISO-8601 UTC | Window end (exclusive). Grid-aligned unless flushed early at ride end. |
| `durationMs` | int | `endedAt − startedAt`. Normally 2000; smaller on the final flushed window. |
| `sampleCount` | int | DeviceMotion events aggregated into this window (cap 2000/window). |
| `nominalIntervalMs` | number \| null | Median of `event.interval` values in the window. |
| `gps.lat` | number [−90, 90] | Latitude of the **latest accepted GPS fix at window close** (not an average). |
| `gps.lng` | number [−180, 180] | Longitude of the same fix. |
| `gps.accuracyM` | number \| null | Browser-reported 68% confidence radius in metres. |
| `gps.speedMps` | number \| null | Device speed over ground in m/s (`position.coords.speed`). |
| `gps.headingDeg` | number \| null | Degrees clockwise from true north, [0, 360). |
| `gps.timestamp` | ISO-8601 UTC | `position.timestamp` of that fix — usually inside `[startedAt, endedAt]`. |
| `accel.*` | object \| null | **Linear acceleration in m/s², device frame, gravity removed.** `mean`/`std`/`min`/`max` per axis (`x`, `y`, `z`) across the window's samples, plus `magnitude` stats of `√(x²+y²+z²)`. |
| `gravity.*` | object \| null | Phone-orientation proxy: low-pass (EMA α=0.1) estimate of the gravity vector in the device frame (m/s²) + `tiltDeg` = angle between the gravity vector and device +Z, [0, 180]. |
| `gyro.*` | object \| null | Rotation rate in **deg/s**, device frame: per-axis `mean`/`std` (`x`=α roll, `y`=β pitch, `z`=γ yaw) + `maxMagnitudeDegPerS`. |
| `sampleCount` vs `accel`/`gyro` nulls | — | A window with `sampleCount > 0` can still have `accel: null` / `gyro: null` when the browser omits those fields. |

## Preprocessing assumptions (already applied client-side)

1. **Bucketing:** samples land in windows by their `receivedAt` wall-clock
   time, `windowMs = 2000`, grid-aligned → deterministic boundaries.
2. **Linear acceleration:** taken from `event.acceleration` when the browser
   supplies it; otherwise computed as
   `accelerationIncludingGravity − gravityEma` (EMA α = 0.1).
3. **Gravity estimate:** EMA over `accelerationIncludingGravity`, giving the
   orientation proxy (`gravity.tiltDeg`) without raw per-sample data.
4. **Units:** accelerometer in m/s² (converted from g where a browser reports
   g), gyroscope in deg/s (converted from deg/s — browsers differ, we pass
   through what the DOM spec defines).
5. **Rounding:** 4 decimals everywhere; numbers are plain JSON numbers.
6. **No raw events are ever sent** — only the aggregates above, so a batch of
   120 windows is ~40 KB.
7. **GPS context** is the newest fix with accuracy ≤ 50 m at window close;
   `gps: null` until the first such fix (e.g. permission just granted).

## Backend validation you can rely on

`server/services/telemetryValidation.js` enforces, per window:
`schemaVersion === 1`; `windowId` non-empty ≤128 chars; integer `seq` in
[0, 1e9]; parseable `startedAt` ≤ `endedAt`; integer `durationMs` ≤ 10 s;
integer `sampleCount` ≤ 5000; `gps.lat/lng` in range, `accuracyM ≤ 10 000`,
`speedMps ≤ 100`, `headingDeg ∈ [0, 360]`; all accel values |a| ≤ 500 m/s²
(≈50 g), gravity |g| ≤ 100 m/s², gyro ≤ 4000 deg/s; every number finite
(`NaN`/`Infinity` rejected). Batch: 1–120 windows, ≤1 MB body, duplicate
`windowId`s inside one batch rejected. `startedAt` must fall inside the
ride's lifetime (±5 min clock-skew slack), and the ride must belong to the
authenticated user and still be active — otherwise `404`/`409`.

## What the ML side must NOT expect

- No per-sample arrays, no raw waveforms — window aggregates only.
- No labels, no classification, no confidence: that is the ML workstream's
  own layer on top of this contract.
- Windows are not guaranteed contiguous: GPS-denied or sensor-denied periods
  simply have no windows (client keeps seq monotonic).
- `nominalIntervalMs` and `sampleCount` are quality signals — use them to
  weight or discard windows rather than assuming a fixed rate.
