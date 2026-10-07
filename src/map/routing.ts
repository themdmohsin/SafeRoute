/**
 * Real routing against the Mapbox APIs used elsewhere for the ride map.
 *
 * The origin ALWAYS comes from the device's real GPS fix and the destination
 * comes from the ride flow — nothing here is hardcoded to any Bengaluru
 * route. Failures surface as typed errors with UI-presentable messages.
 */

const GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export class RouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteError';
  }
}

export interface DestinationPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface RouteResult {
  /** GeoJSON [lng, lat] positions for the route line. */
  coordinates: Array<[number, number]>;
  /** metres along the road network */
  distanceM: number;
  /** seconds of expected travel time */
  durationS: number;
}

export function requireMapboxToken(): string {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (typeof token !== 'string' || token.trim() === '') {
    throw new RouteError('Missing Mapbox token. Set VITE_MAPBOX_TOKEN in the frontend environment.');
  }
  return token.trim();
}

/** Resolve free-text destination into coordinates via Mapbox Geocoding. */
export async function geocodeDestination(query: string, token: string): Promise<DestinationPoint> {
  const trimmed = query.trim();
  if (!trimmed) throw new RouteError('No destination was provided for this ride.');

  const url =
    `${GEOCODING_URL}/${encodeURIComponent(trimmed)}.json` +
    `?access_token=${encodeURIComponent(token)}&limit=1&country=IN`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new RouteError(`Destination lookup failed (${response.status}).`);
  }
  const data = (await response.json()) as {
    features?: Array<{ center: [number, number]; place_name?: string; text?: string }>;
  };
  const feature = data.features?.[0];
  if (!feature || feature.center.length !== 2) {
    throw new RouteError(`Could not find a map location for "${trimmed}".`);
  }
  const [lng, lat] = feature.center;
  return {
    lng,
    lat,
    label: feature.place_name || feature.text || trimmed,
  };
}

/**
 * Calculate the driving route from the device's real GPS position to the
 * resolved destination.
 */
export async function fetchDrivingRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  token: string,
): Promise<RouteResult> {
  const coordinatesParam = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url =
    `${DIRECTIONS_URL}/${encodeURIComponent(coordinatesParam)}` +
    `?access_token=${encodeURIComponent(token)}&overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new RouteError(`Route calculation failed (${response.status}).`);
  }
  const data = (await response.json()) as {
    code?: string;
    routes?: Array<{
      geometry?: { coordinates?: Array<[number, number]> };
      distance?: number;
      duration?: number;
    }>;
  };
  const route = data.routes?.[0];
  if (data.code === 'NoRoute' || !route?.geometry?.coordinates?.length) {
    throw new RouteError('No drivable route was found to this destination.');
  }
  return {
    coordinates: route.geometry.coordinates,
    distanceM: route.distance ?? 0,
    durationS: route.duration ?? 0,
  };
}
