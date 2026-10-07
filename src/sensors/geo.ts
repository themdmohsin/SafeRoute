/**
 * Pure geographic helpers used by the GPS tracker and the verification script.
 * No browser APIs here so everything is deterministic and testable.
 */

import type { GpsFix } from './contract';

/** Mean Earth radius in metres (IUGG). */
export const EARTH_RADIUS_M = 6_371_008.8;

/** Fixes with accuracy worse than this are ignored for the track. */
export const MAX_TRACK_ACCURACY_M = 50;
/** Fixes with accuracy worse than this are ignored even for the map dot. */
export const MAX_MAP_ACCURACY_M = 100;
/**
 * Consecutive fixes implying more movement than this (m/s) are treated as GPS
 * jumps and excluded from the distance (≈198 km/h, far above city traffic).
 */
export const MAX_PLAUSIBLE_SPEED_MPS = 55;
/** Displacements smaller than this (m) are treated as standing jitter. */
export const MIN_TRACK_STEP_M = 2;
/** A fix older than this is flagged as stale in the UI. */
export const STALE_FIX_MS = 15_000;

export function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Great-circle distance between two WGS-84 points, in metres. */
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface DistanceOptions {
  maxPlausibleSpeedMps?: number;
  minStepM?: number;
}

export interface TrackDistanceResult {
  /** Accumulated plausible distance in metres. */
  meters: number;
  /** Number of consecutive-fix pairs counted. */
  steps: number;
  /** Pairs discarded as impossible jumps. */
  rejectedJumps: number;
}

/**
 * Sum the great-circle distance over consecutive fixes, skipping:
 *  - fixes with invalid coordinates,
 *  - pairs implying more than maxPlausibleSpeedMps (GPS jumps),
 *  - sub-minStepM jitter while stationary.
 */
export function calculateTrackDistance(
  fixes: ReadonlyArray<Pick<GpsFix, 'lat' | 'lng' | 'timestamp'>>,
  options: DistanceOptions = {},
): TrackDistanceResult {
  const maxSpeed = options.maxPlausibleSpeedMps ?? MAX_PLAUSIBLE_SPEED_MPS;
  const minStep = options.minStepM ?? MIN_TRACK_STEP_M;

  let meters = 0;
  let steps = 0;
  let rejectedJumps = 0;
  let prev: Pick<GpsFix, 'lat' | 'lng' | 'timestamp'> | null = null;

  for (const fix of fixes) {
    if (!isValidLatitude(fix.lat) || !isValidLongitude(fix.lng)) {
      prev = null;
      continue;
    }
    if (prev) {
      const segmentM = haversineMeters(prev.lat, prev.lng, fix.lat, fix.lng);
      const dtS = (fix.timestamp - prev.timestamp) / 1000;
      const plausible = dtS > 0 && segmentM / dtS <= maxSpeed;
      if (!plausible) {
        rejectedJumps += 1;
        prev = fix;
        continue;
      }
      if (segmentM >= minStep) {
        meters += segmentM;
        steps += 1;
      }
    }
    prev = fix;
  }

  return { meters, steps, rejectedJumps };
}
