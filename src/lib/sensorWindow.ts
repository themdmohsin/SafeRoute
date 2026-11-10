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

export function summarizeWindow(samples: MotionSample[]) {
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
  };
}
