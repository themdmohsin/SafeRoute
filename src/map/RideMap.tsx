/**
 * Real Mapbox GL JS map for the active ride screen.
 *
 * Responsibilities:
 *  - initialise Mapbox from VITE_MAPBOX_TOKEN (never hardcoded),
 *  - centre on the device's first real GPS fix and follow it while riding,
 *  - draw the actual GPS track and the calculated route,
 *  - update sources in place and remove everything cleanly on unmount.
 *
 * The map is only initialised once the tracker has produced a real fix, so
 * there is never a fake default location on screen. If the token is missing
 * or Mapbox fails to load, an honest status overlay is shown instead.
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { requireMapboxToken } from './routing';

export type RideMapStatus = 'waiting-gps' | 'no-token' | 'initializing' | 'ready' | 'error';

export interface RideMapProps {
  /** Latest display-quality GPS fix (lat/lng required). */
  position: { lat: number; lng: number; headingDeg: number | null } | null;
  /** Real GPS track in [lng, lat] GeoJSON order. */
  track: Array<[number, number]>;
  /** Calculated route in [lng, lat] GeoJSON order, or null. */
  route: Array<[number, number]> | null;
  destination: { lat: number; lng: number; label: string } | null;
  /** When true the map keeps easing to the rider's position. */
  follow: boolean;
  onStatusChange?: (status: RideMapStatus, detail?: string) => void;
}

const TRACK_SOURCE = 'saferoute-ride-track';
const ROUTE_SOURCE = 'saferoute-ride-route';

function ensureLineLayer(
  map: mapboxgl.Map,
  sourceId: string,
  color: string,
  beforeId?: string,
) {
  if (!map.getLayer(`${sourceId}-line`) && map.getSource(sourceId)) {
    map.addLayer(
      {
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-width': sourceId === TRACK_SOURCE ? 5 : 6,
          'line-opacity': 0.9,
        },
      },
      beforeId,
    );
  }
}

function createMarkerElement(kind: 'user' | 'destination'): HTMLElement {
  const element = document.createElement('div');
  if (kind === 'user') {
    element.style.cssText =
      'width:22px;height:22px;border-radius:50%;background:#1f3864;border:3px solid #ffffff;box-shadow:0 0 0 6px rgba(31,56,100,0.25),0 2px 6px rgba(0,0,0,0.4);';
  } else {
    element.innerHTML =
      '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#dd9202;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>';
  }
  return element;
}

export default function RideMap({
  position,
  track,
  route,
  destination,
  follow,
  onStatusChange,
}: RideMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const followedRef = useRef(false);
  const [overlay, setOverlay] = useState<{ status: RideMapStatus; detail?: string }>({
    status: position ? 'initializing' : 'waiting-gps',
  });

  const reportStatus = (status: RideMapStatus, detail?: string) => {
    setOverlay({ status, detail });
    onStatusChange?.(status, detail);
  };

  const hasPosition = position !== null;

  // Initialise the map exactly once a real GPS fix exists.
  useEffect(() => {
    if (!position || mapRef.current) return;
    let token: string;
    try {
      token = requireMapboxToken();
    } catch (error) {
      reportStatus(
        'no-token',
        error instanceof Error ? error.message : 'Missing Mapbox token.',
      );
      return;
    }

    let cancelled = false;
    reportStatus('initializing');
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [position.lng, position.lat],
      zoom: 17,
      pitch: 30,
      attributionControl: true,
    });
    mapRef.current = map;

    map.on('load', () => {
      if (cancelled) return;
      map.addSource(TRACK_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addSource(ROUTE_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      ensureLineLayer(map, TRACK_SOURCE, '#1f3864');
      ensureLineLayer(map, ROUTE_SOURCE, '#dd9202');
      userMarkerRef.current = new mapboxgl.Marker({ element: createMarkerElement('user') })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
      reportStatus('ready');
    });

    map.on('error', (event) => {
      const detail =
        event && 'error' in event && event.error instanceof Error
          ? event.error.message
          : 'Mapbox failed to load.';
      // Style/route fetch hiccups surface in the overlay; the map may recover.
      if (!mapRef.current || !map.isStyleLoaded()) {
        reportStatus('error', detail);
      }
    });

    return () => {
      cancelled = true;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      followedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPosition]); // Re-run only when existence of a fix flips.

  // Keep the user marker, follow behaviour and track/route layers in sync.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([position.lng, position.lat]);
    }
    if (follow && !followedRef.current) {
      followedRef.current = true;
      map.easeTo({ center: [position.lng, position.lat], zoom: 17, duration: 800 });
    } else if (follow) {
      map.easeTo({ center: [position.lng, position.lat], duration: 600 });
    }
  }, [position, follow]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const trackSource = map.getSource(TRACK_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      trackSource?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: track },
      });
      ensureLineLayer(map, TRACK_SOURCE, '#1f3864');
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [track]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const routeSource = map.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      if (!routeSource) return;
      routeSource.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route ?? [] },
      });
      ensureLineLayer(map, ROUTE_SOURCE, '#dd9202');

      if (destination) {
        if (!destinationMarkerRef.current) {
          destinationMarkerRef.current = new mapboxgl.Marker({
            element: createMarkerElement('destination'),
          })
            .setLngLat([destination.lng, destination.lat])
            .addTo(map);
        } else {
          destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
        }
      } else {
        destinationMarkerRef.current?.remove();
        destinationMarkerRef.current = null;
      }

      if (route && position) {
        const lats = route.map(([, lat]) => lat).concat(position.lat);
        const lngs = route.map(([lng]) => lng).concat(position.lng);
        const bounds = new mapboxgl.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        );
        map.fitBounds(bounds, { padding: 90, duration: 900, maxZoom: 17 });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, destination]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" data-testid="ride-map-container" />

      {overlay.status !== 'ready' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary p-6 text-center">
          <div className="flex flex-col items-center gap-2 text-on-primary">
            <span className="material-symbols-outlined text-3xl">
              {overlay.status === 'waiting-gps'
                ? 'location_searching'
                : overlay.status === 'error'
                  ? 'map'
                  : overlay.status === 'no-token'
                    ? 'key_off'
                    : 'sync'}
            </span>
            <p className="font-label-lg font-bold">
              {overlay.status === 'waiting-gps' && 'Waiting for your first GPS fix…'}
              {overlay.status === 'initializing' && 'Loading live map…'}
              {overlay.status === 'no-token' && 'Live map unavailable'}
              {overlay.status === 'error' && 'Map failed to load'}
            </p>
            {overlay.detail && (
              <p className="font-body-sm text-sm opacity-80 max-w-xs">{overlay.detail}</p>
            )}
            {overlay.status === 'no-token' && (
              <p className="font-body-sm text-xs opacity-70 max-w-xs">
                Set VITE_MAPBOX_TOKEN in your frontend .env to enable live navigation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
