# Sensor + Navigation Workstream — Implementation Notes

Scope: real GPS tracking, Mapbox navigation/routing, DeviceMotion capture,
sensor windowing, ride telemetry API, real ride distance, wake lock and PWA
support for the active ride. **ML classification is intentionally out of
scope** (owned by the ML branch).

## Architecture

```
src/sensors/
  contract.ts    — sensor-window contract types + constants (source of truth)
  geo.ts         — pure haversine math, jump filtering, coordinate validation
  gps.ts         — GpsTracker: watchPosition lifecycle, quality gating, track
  motion.ts      — MotionTracker: devicemotion, iOS permission, gravity EMA
  windowing.ts   — SensorWindowBuffer: deterministic 2 s window aggregation
  telemetry.ts   — TelemetryUploader: batching, retry/backoff, queue caps
  wakeLock.ts    — WakeLockController: acquire/release/re-acquire on visibility

src/map/
  routing.ts     — Mapbox geocoding + directions (token from VITE_MAPBOX_TOKEN)
  RideMap.tsx    — Mapbox GL map: GPS follow, live track, route line, markers

src/hooks/useActiveRide.ts — orchestrates all of the above for the ride screen
```

Backend additions: `POST/GET /api/rides/:id/telemetry`
(`server/controllers/telemetryController.js`,
`server/services/telemetryValidation.js`,
`server/models/RideTelemetryWindow.js`), mounted inside the existing
`protect`-guarded ride router. Ownership is derived from the JWT
(`req.user.id`) — never from the client body.

## Environment variables

Frontend (`.env`, see `.env.example`):
- `VITE_API_URL` — backend base URL (existing).
- `VITE_MAPBOX_TOKEN` — Mapbox GL public token. Without it the ride screen
  shows an honest "Live map unavailable" state and skips routing.

Backend (`server/.env`): unchanged.

## Statuses are honest

GPS: `idle / requesting / active / denied / unavailable / error` (+ stale
flag). Motion: `idle / unsupported / permission-required / denied / active /
error`. Wake lock: `idle / unsupported / active / released / error`.
Telemetry: `idle / syncing / error` with queued/uploaded counts. Map:
`waiting-gps / no-token / initializing / ready / error`. None of these fake a
connected state.

## Error handling matrix

| Failure | Behaviour |
| --- | --- |
| GPS permission denied | status `denied`, ride continues, no track/distance |
| GPS unavailable/timeout | status `unavailable`/`error`, retries keep watching |
| Stale/low-quality fix | flagged stale; >100 m accuracy not drawn; >50 m not counted into track/distance |
| DeviceMotion unsupported | status `unsupported`, ride continues GPS-only |
| iOS motion permission | explicit Enable button; pipeline starts only after grant |
| Missing Mapbox token | map overlay explains; routing skipped; GPS still tracked |
| Mapbox init failure | honest overlay; map resources removed on unmount |
| Routing failure / bad destination | route card shows the message; reroute button retries |
| Telemetry failure | windows stay queued, retried with backoff; queue cap drops oldest with a visible counter |
| Wake lock unsupported | status `unsupported`; never an error state |
| Tab hidden | wake lock re-acquires on visibility; listeners keep running |
| Ride end | GPS watcher, motion listener, telemetry timer, wake lock all stopped; final flush races an 8 s cap so saving never hangs |

## What was verified (see git commit messages for the run log)

- `npx tsc --noEmit` (frontend lint/typecheck): clean.
- `npm run build` (Vite production build incl. PWA assets): clean.
- `node --check` on all changed backend files: clean.
- Backend endpoint smoke test: start ride → post valid telemetry batch (202,
  accepted counts) → post with a foreign ride id (404) → post to an ended
  ride (409) → post malformed windows (400, field-level messages) → get
  telemetry returns stored windows only for the owner.
- Deterministic pipeline check (`node scripts/verify-sensor-logic.mjs`):
  window bucketing, seq/windowId stability, stats math, haversine distance,
  GPS-jump rejection, batch validation invariants.

## What requires a physical device (honestly NOT verified here)

- Real GPS fixes from a phone (browser geolocation on desktop uses Wi-Fi
  triangulation; `speed`/`heading` are usually null).
- Real DeviceMotion events — desktop Chrome/Firefox do not emit `devicemotion`
  without hardware; Safari requires HTTPS + an explicit permission gesture.
- Screen Wake Lock keeping a real screen awake (Chromium on Android).
- Mapbox tile rendering on a real GPU/phone browser.
- PWA install prompt (needs HTTPS + a supported browser).

To smoke-test on a phone: deploy the frontend behind HTTPS, set
`VITE_API_URL`/`VITE_MAPBOX_TOKEN`, log in, press Begin Ride, grant
location (+ motion on iOS), ride ~200 m, confirm the distance/tick/track
update, then End & Save and check the summary + telemetry collection in Mongo.
