/**
 * Orchestrates every real subsystem of an active ride:
 * GPS tracking, device motion sampling, sensor windowing, telemetry upload,
 * wake lock, and Mapbox routing. Owns nothing visual.
 *
 * All statuses are honest: a subsystem reports exactly
 * unavailable / requesting-permission / active / error — never a fake
 * connected state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GpsFix } from '../sensors/contract';
import { GpsTracker, type GpsSnapshot } from '../sensors/gps';
import { MotionTracker, type MotionSnapshot } from '../sensors/motion';
import { SensorWindowBuffer } from '../sensors/windowing';
import { TelemetryUploader, type TelemetrySnapshot } from '../sensors/telemetry';
import { WakeLockController, type WakeLockSnapshot } from '../sensors/wakeLock';
import { apiRequest } from '../lib/api';
import {
  fetchDrivingRoute,
  geocodeDestination,
  requireMapboxToken,
  RouteError,
} from '../map/routing';

const RIDE_ID_KEY = 'saferoute_active_ride_id';
const RIDE_START_KEY = 'saferoute_active_ride_start_time';
const RIDE_DESTINATION_KEY = 'saferoute_active_ride_destination';
const RIDE_REPORTS_KEY = 'saferoute_active_ride_reports';

export type RouteStatus = 'idle' | 'resolving' | 'ready' | 'error';

export interface RouteState {
  status: RouteStatus;
  label: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  coordinates: Array<[number, number]> | null;
  errorMessage: string | null;
}

export interface RideSensorState {
  rideId: string | null;
  destinationQuery: string | null;
  elapsedSeconds: number;
  gps: GpsSnapshot;
  motion: MotionSnapshot;
  wakeLock: WakeLockSnapshot;
  telemetry: TelemetrySnapshot;
  route: RouteState;
  /** km, computed from the real GPS track */
  distanceKm: number;
  /** km/h from the device GPS speed when available */
  speedKmh: number | null;
  /** [lng, lat] points of the real GPS track for the map */
  trackCoordinates: Array<[number, number]>;
  mapPosition: { lat: number; lng: number; headingDeg: number | null } | null;
  follow: boolean;
  isEnding: boolean;
  endError: string | null;
}

export interface ActiveRideController extends RideSensorState {
  /** iOS-style explicit motion permission request, from a user gesture. */
  requestMotionAccess: () => Promise<void>;
  /** Re-enable map follow mode. */
  recenter: () => void;
  /** Recalculate the route from the current GPS position. */
  reroute: () => void;
  /** Stop everything, flush telemetry, persist real stats and exit. */
  endRide: () => Promise<void>;
}

export function useActiveRide(): ActiveRideController {
  const navigate = useNavigate();

  const rideId = useRef<string | null>(localStorage.getItem(RIDE_ID_KEY)).current;
  const destinationQuery = useRef<string | null>(
    localStorage.getItem(RIDE_DESTINATION_KEY),
  ).current;
  const startTimeMs = useMemo(() => {
    const parsed = Date.parse(localStorage.getItem(RIDE_START_KEY) || '');
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }, []);

  const gpsTrackerRef = useRef<GpsTracker | null>(null);
  const motionTrackerRef = useRef<MotionTracker | null>(null);
  const wakeLockRef = useRef<WakeLockController | null>(null);
  const uploaderRef = useRef<TelemetryUploader | null>(null);
  const windowBufferRef = useRef<SensorWindowBuffer | null>(null);

  const [gps, setGps] = useState<GpsSnapshot>(() =>
    gpsTrackerRef.current?.snapshot() ?? {
      status: 'idle',
      fix: null,
      rawFixCount: 0,
      acceptedFixCount: 0,
      isStale: false,
      distanceM: 0,
      rejectedJumps: 0,
      lastError: null,
    },
  );
  const [motion, setMotion] = useState<MotionSnapshot>(() =>
    motionTrackerRef.current?.snapshot() ?? {
      status: 'idle',
      sampleCount: 0,
      lastSampleAt: null,
      lastError: null,
    },
  );
  const [wakeLock, setWakeLock] = useState<WakeLockSnapshot>(() => ({
    status: 'idle',
    lastError: null,
  }));
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(() => ({
    status: 'idle',
    pendingCount: 0,
    uploadedCount: 0,
    droppedCount: 0,
    lastError: null,
    lastUploadedAt: null,
  }));
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000)),
  );
  const [route, setRoute] = useState<RouteState>({
    status: 'idle',
    label: null,
    distanceKm: null,
    durationMin: null,
    coordinates: null,
    errorMessage: null,
  });
  const [follow, setFollow] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  // --- lifecycle: create subsystems exactly once per mounted ride ----------
  useEffect(() => {
    if (!rideId) return;

    const gpsTracker = new GpsTracker();
    const motionTracker = new MotionTracker();
    const wakeLock = new WakeLockController();
    const uploader = new TelemetryUploader(rideId, (batch) =>
      apiRequest(`/rides/${rideId}/telemetry`, { method: 'POST', body: batch }),
    );
    const windowBuffer = new SensorWindowBuffer({
      rideId,
      getGpsFix: () => gpsTracker.getDisplayFix(),
    });

    gpsTrackerRef.current = gpsTracker;
    motionTrackerRef.current = motionTracker;
    wakeLockRef.current = wakeLock;
    uploaderRef.current = uploader;
    windowBufferRef.current = windowBuffer;

    const unsubscribeGps = gpsTracker.subscribe(setGps);
    const unsubscribeMotion = motionTracker.subscribe(setMotion);
    const unsubscribeWakeLock = wakeLock.subscribe(setWakeLock);
    const unsubscribeTelemetry = uploader.subscribe(setTelemetry);

    gpsTracker.start();
    uploader.start();
    void wakeLock.acquire();

    // Auto-start motion where the browser does not require a permission
    // gesture; iOS users get an explicit enable button instead.
    if (!MotionTracker.requiresPermission()) {
      if (!MotionTracker.isSupported()) {
        motionTracker.start(() => {}); // sets honest 'unsupported' status
      } else {
        motionTracker.start((sample) => windowBuffer.addMotionSample(sample));
      }
    }

    return () => {
      unsubscribeGps();
      unsubscribeMotion();
      unsubscribeWakeLock();
      unsubscribeTelemetry();
      uploader.stop();
      gpsTracker.stop();
      motionTracker.stop();
      void wakeLock.release();
      gpsTrackerRef.current = null;
      motionTrackerRef.current = null;
      wakeLockRef.current = null;
      uploaderRef.current = null;
      windowBufferRef.current = null;
    };
  }, [rideId]);

  // --- elapsed timer -------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTimeMs]);

  // --- route calculation from real GPS origin ------------------------------
  const originFixRef = useRef<GpsFix | null>(null);
  const calculateRoute = useCallback(async () => {
    if (!destinationQuery) {
      setRoute({
        status: 'idle',
        label: null,
        distanceKm: null,
        durationMin: null,
        coordinates: null,
        errorMessage: null,
      });
      return;
    }
    const fix = originFixRef.current;
    if (!fix) {
      setRoute((current) => ({
        ...current,
        status: 'error',
        errorMessage: 'Waiting for a GPS fix before routing.',
      }));
      return;
    }
    setRoute((current) => ({ ...current, status: 'resolving', errorMessage: null }));
    try {
      const token = requireMapboxToken();
      const destination = await geocodeDestination(destinationQuery, token);
      const result = await fetchDrivingRoute(
        { lat: fix.lat, lng: fix.lng },
        { lat: destination.lat, lng: destination.lng },
        token,
      );
      setRoute({
        status: 'ready',
        label: destination.label,
        distanceKm: result.distanceM / 1000,
        durationMin: Math.max(1, Math.round(result.durationS / 60)),
        coordinates: result.coordinates,
        errorMessage: null,
      });
    } catch (error) {
      setRoute({
        status: 'error',
        label: null,
        distanceKm: null,
        durationMin: null,
        coordinates: null,
        errorMessage:
          error instanceof RouteError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Route calculation failed.',
      });
    }
  }, [destinationQuery]);

  // Route as soon as the first display-quality fix arrives; recalculate on
  // manual reroute only (no surprise re-geocoding mid-ride).
  const hasRoutedRef = useRef(false);
  useEffect(() => {
    if (hasRoutedRef.current || gps.fix === null) return;
    if (gps.fix.accuracyM !== null && gps.fix.accuracyM > 100) return;
    originFixRef.current = gps.fix;
    hasRoutedRef.current = true;
    void calculateRoute();
  }, [gps.fix, calculateRoute]);

  // --- user actions ---------------------------------------------------------
  const requestMotionAccess = useCallback(async () => {
    const motionTracker = motionTrackerRef.current;
    const windowBuffer = windowBufferRef.current;
    if (!motionTracker || !windowBuffer) return;
    const granted = await motionTracker.requestPermission();
    if (granted) {
      motionTracker.start((sample) => windowBuffer.addMotionSample(sample));
    }
  }, []);

  const recenter = useCallback(() => setFollow(true), []);

  const reroute = useCallback(() => {
    hasRoutedRef.current = false;
    void calculateRoute();
  }, [calculateRoute]);

  /** Stop everything, flush telemetry, persist real distance, exit. */
  const endRide = useCallback(async () => {
    const gpsTracker = gpsTrackerRef.current;
    const uploader = uploaderRef.current;
    const windowBuffer = windowBufferRef.current;
    const wakeLock = wakeLockRef.current;
    if (!rideId || !gpsTracker || !uploader || !windowBuffer) return;

    setIsEnding(true);
    setEndError(null);
    try {
      // Stop live listeners first so nothing feeds the pipeline mid-teardown.
      gpsTracker.stop();
      motionTrackerRef.current?.stop();

      uploader.enqueue(windowBuffer.flush());
      // Best-effort final flush; bounded so ending never hangs the UI.
      const flushed = await Promise.race([
        uploader.flush(true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000)),
      ]);

      const durationMinutes = Math.max(
        0,
        Math.round((Date.now() - startTimeMs) / 60000),
      );
      await apiRequest(`/rides/${rideId}`, {
        method: 'PATCH',
        body: {
          distanceKm: Math.round(gpsTracker.getDistanceMeters()) / 1000,
          durationMinutes,
          hazardsReportedCount: Number(localStorage.getItem(RIDE_REPORTS_KEY) || 0),
          endTime: new Date().toISOString(),
        },
      });

      await wakeLock?.release();
      uploader.stop();
      localStorage.setItem('saferoute_summary_ride_id', rideId);
      localStorage.setItem('saferoute_summary_telemetry_flushed', flushed ? '1' : '0');
      localStorage.removeItem(RIDE_ID_KEY);
      localStorage.removeItem(RIDE_START_KEY);
      localStorage.removeItem(RIDE_DESTINATION_KEY);
      localStorage.removeItem(RIDE_REPORTS_KEY);
      navigate('/ride/summary');
    } catch (error) {
      setEndError(
        error instanceof Error ? error.message : 'Unable to finish this ride.',
      );
    } finally {
      setIsEnding(false);
    }
  }, [navigate, rideId, startTimeMs]);

  const trackCoordinates = useMemo<Array<[number, number]>>(
    () =>
      gpsTrackerRef.current
        ?.getTrack()
        .map((fix) => [fix.lng, fix.lat] as [number, number]) ?? [],
    [gps.rawFixCount],
  );

  const state: RideSensorState = {
    rideId,
    destinationQuery,
    elapsedSeconds,
    gps,
    motion,
    wakeLock,
    telemetry,
    route,
    distanceKm: gps.distanceM / 1000,
    speedKmh: gps.fix?.speedMps != null ? gps.fix.speedMps * 3.6 : null,
    trackCoordinates,
    mapPosition:
      gps.fix !== null
        ? { lat: gps.fix.lat, lng: gps.fix.lng, headingDeg: gps.fix.headingDeg }
        : null,
    follow,
    isEnding,
    endError,
  };

  return {
    ...state,
    requestMotionAccess,
    recenter,
    reroute,
    endRide,
  };
}
