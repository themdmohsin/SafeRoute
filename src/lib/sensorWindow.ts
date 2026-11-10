// Turns ~2 s of DeviceMotion samples into the telemetry-window shape the server ML model expects
// (see server/ml/featureVector.js).
export interface MotionSample { ax: number; ay: number; az: number; gx: number; gy: number; gz: number; rx: number; ry: number; rz: number }

const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / (v.length || 1);
const std = (v: number[]) => { const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))); };
const axis = (samples: MotionSample[], key: keyof MotionSample) => samples.map((s) => s[key]);

export function sampleFromEvent(e: DeviceMotionEvent): MotionSample | null {
  const a = e.acceleration;
  const g = e.accelerationIncludingGravity;
  if (!a || !g || a.x == null || g.x == null) return null;
  const r = e.rotationRate;
  return {
    ax: a.x ?? 0, ay: a.y ?? 0, az: a.z ?? 0,
    // gravity = (acceleration with gravity) - (linear acceleration)
    gx: (g.x ?? 0) - (a.x ?? 0), gy: (g.y ?? 0) - (a.y ?? 0), gz: (g.z ?? 0) - (a.z ?? 0),
    rx: r?.beta ?? 0, ry: r?.gamma ?? 0, rz: r?.alpha ?? 0,
  };
}

// Orientation-independent features the model uses. Must match ml/features.py exactly
// (parity test: server/tests/featureParity.test.js).
const SIGNALS = ['accTotal', 'accLinear', 'vertical', 'horizontal', 'gyro', 'jerk'] as const;
const STATS = ['mean', 'std', 'min', 'max', 'ptp', 'rms', 'skew', 'kurt', 'zcr', 'domFreq', 'bandLow', 'bandHigh'] as const;
export const FEATURE_NAMES = SIGNALS.flatMap((s) => STATS.map((t) => `${s}_${t}`));

function signalStats(x: number[], duration: number): number[] {
  const n = x.length;
  const m = mean(x);
  const d = x.map((v) => v - m);
  const variance = mean(d.map((v) => v * v));
  const sd = Math.sqrt(variance);
  const skew = sd > 1e-9 ? mean(d.map((v) => v ** 3)) / sd ** 3 : 0;
  const kurt = sd > 1e-9 ? mean(d.map((v) => v ** 4)) / variance ** 2 - 3 : 0;
  let crossings = 0;
  for (let i = 0; i + 1 < n; i++) if (d[i] * d[i + 1] < 0) crossings++;
  let dom = 0; let best = -1; let low = 0; let high = 0;
  for (let k = 0; k <= Math.floor(n / 2); k++) {
    let re = 0; let im = 0;
    for (let t = 0; t < n; t++) { const a = (2 * Math.PI * k * t) / n; re += d[t] * Math.cos(a); im += d[t] * Math.sin(a); }
    const power = (re * re + im * im) / (n * n);
    const f = k / duration;
    if (k >= 1 && power > best) { best = power; dom = f; }
    if (f >= 0.5 && f < 5) low += power;
    if (f >= 5 && f < 15) high += power;
  }
  const min = Math.min(...x); const max = Math.max(...x);
  return [m, sd, min, max, max - min, Math.sqrt(mean(x.map((v) => v * v))), skew, kurt, crossings / duration, n > 2 ? dom : 0, low, high];
}

export function computeWindowFeatures(samples: MotionSample[], durationS: number): Record<string, number> {
  const lin = samples.map((s) => Math.hypot(s.ax, s.ay, s.az));
  const vert = samples.map((s) => {
    const g = Math.hypot(s.gx, s.gy, s.gz);
    return (s.ax * s.gx + s.ay * s.gy + s.az * s.gz) / (g > 1e-6 ? g : 1);
  });
  const signals: Record<(typeof SIGNALS)[number], number[]> = {
    accTotal: samples.map((s) => Math.hypot(s.ax + s.gx, s.ay + s.gy, s.az + s.gz)),
    accLinear: lin,
    vertical: vert,
    horizontal: lin.map((l, i) => Math.sqrt(Math.max(l * l - vert[i] * vert[i], 0))),
    gyro: samples.map((s) => Math.hypot(s.rx, s.ry, s.rz)),
    jerk: samples.slice(1).map((s, i) => Math.hypot(s.ax - samples[i].ax, s.ay - samples[i].ay, s.az - samples[i].az) * samples.length / durationS),
  };
  const values = SIGNALS.flatMap((s) => signalStats(signals[s], durationS));
  return Object.fromEntries(FEATURE_NAMES.map((name, i) => [name, values[i]]));
}

export function summarizeWindow(samples: MotionSample[], durationS = 2) {
  const stats = (keys: [keyof MotionSample, keyof MotionSample, keyof MotionSample]) => {
    const [x, y, z] = keys.map((k) => axis(samples, k));
    return {
      mean: { x: mean(x), y: mean(y), z: mean(z) },
      std: { x: std(x), y: std(y), z: std(z) },
      min: { x: Math.min(...x), y: Math.min(...y), z: Math.min(...z) },
      max: { x: Math.max(...x), y: Math.max(...y), z: Math.max(...z) },
    };
  };
  const accel = stats(['ax', 'ay', 'az']);
  const magnitude = samples.map((s) => Math.hypot(s.ax, s.ay, s.az));
  const gyro = stats(['rx', 'ry', 'rz']);
  const gx = mean(axis(samples, 'gx')); const gy = mean(axis(samples, 'gy')); const gz = mean(axis(samples, 'gz'));
  return {
    sampleCount: samples.length,
    accel: { ...accel, magnitude: { mean: mean(magnitude), std: std(magnitude), max: Math.max(...magnitude) } },
    gravity: { x: gx, y: gy, z: gz, tiltDeg: (Math.atan2(Math.abs(gz), Math.hypot(gx, gy)) * 180) / Math.PI },
    gyro: { mean: gyro.mean, std: gyro.std, maxMagnitudeDegPerS: Math.max(...samples.map((s) => Math.hypot(s.rx, s.ry, s.rz))) },
    features: computeWindowFeatures(samples, durationS),
  };
}
