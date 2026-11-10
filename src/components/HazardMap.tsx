import React, { useEffect, useRef, useState } from 'react';
import type { LatLng } from '../lib/geo';
import { useAuth } from '../auth/AuthContext';

export interface MapHazard {
  _id: string;
  hazardType: string;
  severity: string;
  description: string;
  status: string;
  location: { coordinates: [number, number] };
}

export interface MapPath { points: LatLng[]; color: string; width?: number; dashed?: boolean }

interface Props {
  center: LatLng;
  hazards?: MapHazard[];
  paths?: MapPath[];
  user?: LatLng | null;
  initialZoom?: number;
  className?: string;
  /** Called by the recenter button; parent should fetch GPS and update `center`. */
  onRecenter?: () => void;
  children?: React.ReactNode;
}

const TILE = 256;
const SEVERITY_FILL: Record<string, string> = { high: '#ba1a1a', medium: '#dd9202', low: '#059669' };

// Web Mercator: lat/lng -> world pixel at zoom z.
function project(p: LatLng, z: number) {
  const scale = TILE * 2 ** z;
  const sin = Math.sin((p.lat * Math.PI) / 180);
  return { x: ((p.lng + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}
function unproject(x: number, y: number, z: number): LatLng {
  const scale = TILE * 2 ** z;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return { lng: (x / scale) * 360 - 180, lat: (180 / Math.PI) * Math.atan(Math.sinh(n)) };
}

export default function HazardMap({ center, hazards = [], paths = [], user, initialZoom = 14, className = 'h-80', onRecenter, children }: Props) {
  const { user: account } = useAuth();
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 320 });
  const [zoom, setZoom] = useState(initialZoom);
  const [view, setView] = useState<LatLng>(center);
  const [showHazards, setShowHazards] = useState(true);
  const [selected, setSelected] = useState<MapHazard | null>(null);
  const drag = useRef<{ x: number; y: number; start: { x: number; y: number } } | null>(null);

  useEffect(() => { setView(center); }, [center.lat, center.lng]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const c = project(view, zoom);
  const left = c.x - size.w / 2;
  const top = c.y - size.h / 2;
  const toScreen = (p: LatLng) => { const w = project(p, zoom); return { x: w.x - left, y: w.y - top }; };

  const tiles = [];
  const max = 2 ** zoom;
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.w) / TILE); tx += 1) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.h) / TILE); ty += 1) {
      if (ty < 0 || ty >= max) continue;
      tiles.push(
        <img
          key={`${zoom}-${tx}-${ty}`}
          alt=""
          draggable={false}
          src={`https://tile.openstreetmap.org/${zoom}/${((tx % max) + max) % max}/${ty}.png`}
          className="absolute select-none"
          style={{ left: tx * TILE - left, top: ty * TILE - top, width: TILE, height: TILE }}
        />,
      );
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { x: e.clientX, y: e.clientY, start: c };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { start } = drag.current;
    setView(unproject(start.x - (e.clientX - drag.current.x), start.y - (e.clientY - drag.current.y), zoom));
  };

  const controlClass = 'w-10 h-10 rounded-xl bg-white/95 shadow-md flex items-center justify-center text-primary cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-primary';

  return (
    <div
      ref={boxRef}
      className={`relative w-full overflow-hidden bg-surface-container touch-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => { drag.current = null; }}
    >
      {/* Night theme from profile preferences: invert the light OSM tiles. */}
      <div className="absolute inset-0" style={account?.preferences?.nightMap ? { filter: 'invert(0.92) hue-rotate(180deg) brightness(0.9)' } : undefined}>
        {tiles}
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {paths.map((path, i) => (
          <polyline
            key={i}
            points={path.points.map((p) => { const s = toScreen(p); return `${s.x},${s.y}`; }).join(' ')}
            fill="none"
            stroke={path.color}
            strokeWidth={path.width ?? 5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={path.dashed ? '8 6' : undefined}
          />
        ))}
      </svg>

      {showHazards && hazards.map((h) => {
        const s = toScreen({ lng: h.location.coordinates[0], lat: h.location.coordinates[1] });
        if (s.x < -20 || s.y < -20 || s.x > size.w + 20 || s.y > size.h + 20) return null;
        return (
          <button
            key={h._id}
            type="button"
            aria-label={`${h.severity} ${h.hazardType.replaceAll('_', ' ')}`}
            onClick={() => setSelected(h)}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow cursor-pointer"
            style={{ left: s.x, top: s.y, background: SEVERITY_FILL[h.severity] || '#475569', opacity: h.status === 'resolved' ? 0.45 : 1 }}
          />
        );
      })}

      {user && (() => {
        const s = toScreen(user);
        return <span aria-label="Your location" className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-600/30 border-2 border-white" style={{ left: s.x, top: s.y }} />;
      })()}

      {selected && (
        <div className="absolute left-3 right-16 bottom-3 z-20 rounded-xl bg-white p-3 shadow-lg text-on-surface">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold capitalize">{selected.hazardType.replaceAll('_', ' ')}, {selected.severity} severity</p>
            <button type="button" aria-label="Close hazard details" onClick={() => setSelected(null)} className="material-symbols-outlined text-[18px] text-secondary cursor-pointer">close</button>
          </div>
          <p className="text-xs text-secondary capitalize">Status: {selected.status}</p>
          <p className="mt-1 text-xs line-clamp-3">{selected.description}</p>
        </div>
      )}

      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        {onRecenter && (
          <button type="button" aria-label="Center on my location" onClick={() => { setView(center); onRecenter(); }} className={controlClass}>
            <span className="material-symbols-outlined text-[20px]">my_location</span>
          </button>
        )}
        <button type="button" aria-label={showHazards ? 'Hide hazard pins' : 'Show hazard pins'} aria-pressed={showHazards} onClick={() => setShowHazards((v) => !v)} className={controlClass}>
          <span className="material-symbols-outlined text-[20px]">{showHazards ? 'layers' : 'layers_clear'}</span>
        </button>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(18, z + 1))} className={controlClass}>
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(10, z - 1))} className={controlClass}>
          <span className="material-symbols-outlined text-[20px]">remove</span>
        </button>
      </div>

      {children}

      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute right-1 bottom-1 z-10 rounded bg-white/80 px-1 text-[10px] text-slate-700">
        © OpenStreetMap
      </a>
    </div>
  );
}
