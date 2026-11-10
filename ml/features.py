"""Orientation-independent window features. Must stay identical to computeWindowFeatures in src/lib/sensorWindow.ts
(parity test: server/tests/featureParity.test.js)."""
import numpy as np

SIGNALS = ['accTotal', 'accLinear', 'vertical', 'horizontal', 'gyro', 'jerk']
STATS = ['mean', 'std', 'min', 'max', 'ptp', 'rms', 'skew', 'kurt', 'zcr', 'domFreq', 'bandLow', 'bandHigh']
FEATURE_NAMES = [f'{s}_{t}' for s in SIGNALS for t in STATS]
BAND_LOW = (0.5, 5.0)   # Hz: body/suspension motion
BAND_HIGH = (5.0, 15.0)  # Hz: sharp impacts


def _stats(x, duration):
    n = len(x)
    m = x.mean()
    d = x - m
    var = (d * d).mean()
    sd = np.sqrt(var)
    skew = (d ** 3).mean() / sd ** 3 if sd > 1e-9 else 0.0
    kurt = (d ** 4).mean() / var ** 2 - 3 if sd > 1e-9 else 0.0
    zcr = np.count_nonzero(d[:-1] * d[1:] < 0) / duration
    k = np.arange(n // 2 + 1)
    t = np.arange(n)
    # plain DFT (not rfft) so the TS port is a line-for-line copy
    re = (d[None, :] * np.cos(2 * np.pi * k[:, None] * t[None, :] / n)).sum(1)
    im = (d[None, :] * np.sin(2 * np.pi * k[:, None] * t[None, :] / n)).sum(1)
    power = (re * re + im * im) / (n * n)
    freq = k / duration
    dom = freq[1 + int(np.argmax(power[1:]))] if n > 2 else 0.0
    band = lambda lo, hi: float(power[(freq >= lo) & (freq < hi)].sum())
    return [m, sd, x.min(), x.max(), x.max() - x.min(), np.sqrt((x * x).mean()), skew, kurt, zcr, dom,
            band(*BAND_LOW), band(*BAND_HIGH)]


def window_features(acc, grav, gyro_deg, duration):
    """acc: (N,3) linear accel m/s^2 (gravity removed), grav: (N,3) m/s^2, gyro_deg: (N,3) deg/s, duration: s."""
    acc, grav, gyro_deg = (np.asarray(v, dtype=float) for v in (acc, grav, gyro_deg))
    gnorm = np.linalg.norm(grav, axis=1)
    gunit = grav / np.where(gnorm > 1e-6, gnorm, 1.0)[:, None]
    lin = np.linalg.norm(acc, axis=1)
    vert = (acc * gunit).sum(1)
    sig = {
        'accTotal': np.linalg.norm(acc + grav, axis=1),
        'accLinear': lin,
        'vertical': vert,
        'horizontal': np.sqrt(np.maximum(lin * lin - vert * vert, 0)),
        'gyro': np.linalg.norm(gyro_deg, axis=1),
        'jerk': np.linalg.norm(np.diff(acc, axis=0), axis=1) * len(acc) / duration,
    }
    return np.array([v for s in SIGNALS for v in _stats(sig[s], duration)], dtype=float)


if __name__ == '__main__':  # self-check: rotation invariance
    rng = np.random.default_rng(0)
    a, w = rng.normal(size=(120, 3)), rng.normal(size=(120, 3)) * 20
    g = np.tile([0, 9.8, 0.5], (120, 1))
    q, _ = np.linalg.qr(rng.normal(size=(3, 3)))
    f1, f2 = window_features(a, g, w, 2.0), window_features(a @ q.T, g @ q.T, w @ q.T, 2.0)
    assert len(f1) == len(FEATURE_NAMES) and np.allclose(f1, f2, atol=1e-6), 'features not rotation invariant'
    print('ok', len(FEATURE_NAMES))
