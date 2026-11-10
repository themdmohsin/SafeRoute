import type { MapHazard } from '../components/HazardMap.tsx';
import { distanceToLineM, type LatLng, type RouteOption } from './geo';

export interface PlannedRoute extends RouteOption { hazardCount: number }
export interface RidePlan { destination: string; routes: PlannedRoute[]; selected: number }

export const PLAN_KEY = 'saferoute_ride_plan';
export const AUTODETECT_KEY = 'saferoute_ride_autodetect';
export const TRACK_KEY = 'saferoute_ride_track';
const ON_ROUTE_M = 40;

export const hazardPoint = (h: MapHazard): LatLng => ({ lng: h.location.coordinates[0], lat: h.location.coordinates[1] });

/** Open (not resolved) hazards within 40 m of the path. */
export const countOnRoute = (path: LatLng[], hazards: MapHazard[]) =>
  hazards.filter((h) => h.status !== 'resolved' && distanceToLineM(hazardPoint(h), path) <= ON_ROUTE_M).length;

export function readJson<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null') as T | null; } catch { return null; }
}
