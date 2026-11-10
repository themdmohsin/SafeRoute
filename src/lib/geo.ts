export interface LatLng { lat: number; lng: number }

export const BENGALURU: LatLng = { lat: 12.9716, lng: 77.5946 };

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This browser does not provide device location.'));
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Allow location access in your browser to use this.')), { enableHighAccuracy: true, timeout: 10000 });
  });
}

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Shortest distance in metres from a point to a polyline (flat-earth, fine at city scale). */
export function distanceToLineM(p: LatLng, line: LatLng[]): number {
  if (!line.length) return Infinity;
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110540;
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i += 1) {
    const ax = (line[i].lng - p.lng) * kx; const ay = (line[i].lat - p.lat) * ky;
    const bx = (line[i + 1].lng - p.lng) * kx; const by = (line[i + 1].lat - p.lat) * ky;
    const dx = bx - ax; const dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return line.length === 1 ? distanceM(p, line[0]) : best;
}

export function pathLengthKm(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += distanceM(points[i - 1], points[i]);
  return total / 1000;
}

// OpenStreetMap Nominatim: free, 1 request/second, so only call on user actions.
export async function reverseGeocode(p: LatLng): Promise<{ roadName: string; area: string }> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${p.lat}&lon=${p.lng}`);
    const data = await res.json();
    const a = data.address || {};
    return {
      roadName: a.road || a.pedestrian || a.neighbourhood || '',
      area: a.suburb || a.neighbourhood || a.city_district || a.city || 'Bengaluru',
    };
  } catch {
    return { roadName: '', area: 'Bengaluru' };
  }
}

export async function geocode(query: string): Promise<LatLng & { label: string }> {
  // viewbox keeps results inside greater Bengaluru.
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&bounded=1&viewbox=77.35,13.20,77.85,12.75&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const [hit] = await res.json();
  if (!hit) throw new Error(`Could not find "${query}" in Bengaluru. Try a more specific place name.`);
  return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name.split(',').slice(0, 2).join(',') };
}

export interface RouteOption { path: LatLng[]; distanceKm: number; durationMin: number }

// OSRM public demo router: driving routes with up to 2 alternatives.
export async function fetchRoutes(from: LatLng, to: LatLng): Promise<RouteOption[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=true&overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No road route found between these points.');
  return data.routes.map((r: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }) => ({
    path: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceKm: r.distance / 1000,
    durationMin: Math.round(r.duration / 60),
  }));
}

/** Speak a short alert if the browser supports it. */
export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}
