"""RoadSens-4M "Isolated Data" -> SafeRoute 2 s feature windows.

Usage: python ml/convert.py   (expects extracted CSVs under ml/data/raw/{anom,normal})
Output: ml/data/processed/windows.npz, ml/data/processed/features.json, server/tests/fixtures/featureParity.json
"""
import glob, json, os, re
import numpy as np
import pandas as pd
from scipy.spatial.transform import Rotation
from features import FEATURE_NAMES, window_features

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, 'data', 'raw')
OUT = os.path.join(ROOT, 'data', 'processed')
FS = 60.0            # browser DeviceMotion rate (src/lib/sensorWindow.ts windows are ~2 s of ~60 Hz events)
WIN_S = 2.0          # ActiveRideScreen posts one window every 2000 ms
N = int(FS * WIN_S)  # 120 samples
MIN_EVENT_S = 1.0    # isolated anomaly spans shorter than this are dropped; 1-2 s spans give a shorter window
MAX_SHIFT_S = 0.6    # train-time shift: event need not sit at the window centre in the app
AUG_COPIES = 5
SEED = 7
LABELS = {'Pothole': 'pothole', 'Bump': 'speed_breaker'}
CLASSES = ['normal', 'speed_breaker', 'pothole']
AX = lambda p: [f'{p}_x', f'{p}_y', f'{p}_z']
rng = np.random.default_rng(SEED)


def segments(df, min_s=WIN_S):
    """Resample each gap-free, single-label stretch of a 100 Hz recording onto a uniform 60 Hz grid (linear interp).
    Yields (label, grid, acc, grav, gyro_deg)."""
    df = df.dropna(subset=['seconds_elapsed'] + [c for k in ('accelerometer', 'gravity', 'gyroscope') for c in AX(k)])
    t = df.seconds_elapsed.to_numpy()
    lab = df['annotation_text'].astype(str).to_numpy() if 'annotation_text' in df else np.full(len(t), 'normal')
    cuts = np.where((np.diff(t) > 0.05) | (lab[1:] != lab[:-1]))[0] + 1
    for s, e in zip(np.r_[0, cuts], np.r_[cuts, len(t)]):
        if t[e - 1] - t[s] < min_s:
            continue
        grid = np.arange(t[s], t[e - 1] + 1e-9, 1 / FS)
        cols = {k: np.stack([np.interp(grid, t[s:e], df[c].to_numpy()[s:e]) for c in AX(k)], 1)
                for k in ('accelerometer', 'gravity', 'gyroscope')}
        yield lab[s].strip(), grid, cols['accelerometer'], cols['gravity'], np.degrees(cols['gyroscope'])  # rad/s -> deg/s


def vertical(acc, grav):
    return (acc * grav / np.linalg.norm(grav, axis=1, keepdims=True)).sum(1)


def drive_id(path):
    return int(re.match(r'(\d+)', os.path.basename(os.path.dirname(path)) if 'anom' in path else os.path.basename(path)).group(1))


def load():
    """Returns list of (label, drive, segment arrays, centre index, is_event).
    Each anomaly is a start/end annotation-press pair, so one labelled segment = one event; the window is centred
    on its peak |vertical| acceleration."""
    items, skipped, kept = [], {'shorter_than_min': 0, 'unknown_label': 0}, 0
    for f in sorted(glob.glob(os.path.join(RAW, 'anom', '*', '*isolated_all_anomalies.csv'))):
        df = pd.read_csv(f)
        for raw_lab, t, a, g, w in segments(df, min_s=0):
            lab = LABELS.get(raw_lab)
            if lab is None:
                skipped['unknown_label'] += 1
            elif t[-1] - t[0] < MIN_EVENT_S:
                skipped['shorter_than_min'] += 1
            else:
                items.append((lab, drive_id(f), (a, g, w), int(np.argmax(np.abs(vertical(a, g)))), True))
    for f in sorted(glob.glob(os.path.join(RAW, 'normal', '*.csv'))):
        df = pd.read_csv(f, encoding='latin1')
        for _, t, a, g, w in segments(df):
            for c in range(N // 2, len(t) - N // 2, int(FS * 0.5)):  # 0.5 s stride; dedup per split below
                items.append(('normal', drive_id(f), (a, g, w), c, False))
    print('skipped segments', skipped, 'events', sum(i[4] for i in items))
    return items


def cut(arrs, c, shift=0):
    n = min(N, len(arrs[0]))
    s = int(np.clip(c - n // 2 + shift, 0, len(arrs[0]) - n))
    return [x[s:s + n] for x in arrs]


def augment(a, g, w, noise=0.05, scale=(0.9, 1.1)):
    r = Rotation.random(random_state=rng.integers(1 << 31)).as_matrix()
    k = rng.uniform(*scale)
    return (k * a @ r.T + rng.normal(0, noise, a.shape), g @ r.T,
            k * w @ r.T + rng.normal(0, noise * 10, w.shape))


def split_drives(items):
    """Group split by drive (no leakage). Normal drives are few, so split them first, then anomaly-only drives 70/15/15."""
    normal = sorted({d for l, d, *_ in items if l == 'normal'})
    other = sorted({d for l, d, *_ in items} - set(normal))
    r = np.random.default_rng(SEED)
    r.shuffle(normal); r.shuffle(other)
    out = {d: 'train' for d in normal[:-2]} | {normal[-2]: 'val', normal[-1]: 'test'}
    n = len(other)
    for i, d in enumerate(other):
        out[d] = 'train' if i < 0.7 * n else 'val' if i < 0.85 * n else 'test'
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    items = load()
    split = split_drives(items)
    rows = []  # (features, label, drive, split, variant)

    def add(arrs, lab, d, sp, variant):
        rows.append((window_features(*arrs, len(arrs[0]) / FS), CLASSES.index(lab), d, sp, variant))

    parity = []
    for lab, d, arrs, c, is_event in items:
        sp = split[d]
        if not is_event and sp != 'train' and (c - N // 2) % N:
            continue  # val/test normals: non-overlapping 2 s windows like the app
        add(cut(arrs, c), lab, d, sp, 'orig')
        if sp == 'train':
            for _ in range(AUG_COPIES if is_event else 1):
                sh = int(rng.uniform(-MAX_SHIFT_S, MAX_SHIFT_S) * FS) if is_event else 0
                add(augment(*cut(arrs, c, sh)), lab, d, sp, 'aug')
        elif sp == 'test':
            a, g, w = cut(arrs, c)
            add(augment(a, g, w, noise=0, scale=(1, 1)), lab, d, sp, 'rot')
            sd = lambda x: x.std(0, keepdims=True)  # 10% noise level = 0.1 x per-axis window std
            add((a + rng.normal(size=a.shape) * 0.1 * sd(a), g, w + rng.normal(size=w.shape) * 0.1 * sd(w)), lab, d, sp, 'noise10')
            sh = int(rng.choice([-1, 1]) * rng.uniform(0.3, MAX_SHIFT_S) * FS) if is_event else 0
            add(cut(arrs, c, sh), lab, d, sp, 'shift')
            if sum(p['label'] == lab for p in parity) < 8:  # 8 windows per class
                ra, rg, rw = (np.round(x, 6) for x in (a, g, w))
                parity.append({'label': lab, 'durationS': len(a) / FS,
                               'samples': [[*ra[i], *rg[i], *rw[i]] for i in range(len(a))],
                               'features': window_features(ra, rg, rw, len(a) / FS).tolist()})

    X = np.array([r[0] for r in rows]); y = np.array([r[1] for r in rows])
    drive = np.array([r[2] for r in rows]); sp = np.array([r[3] for r in rows]); var = np.array([r[4] for r in rows])
    assert np.isfinite(X).all(), 'non-finite features'
    np.savez_compressed(os.path.join(OUT, 'windows.npz'), X=X, y=y, drive=drive, split=sp, variant=var, features=FEATURE_NAMES)
    with open(os.path.join(OUT, 'features.json'), 'w') as fh:
        json.dump({'features': FEATURE_NAMES, 'classes': CLASSES, 'X': np.round(X, 6).tolist(), 'y': y.tolist(),
                   'split': sp.tolist(), 'variant': var.tolist()}, fh)
    with open(os.path.join(ROOT, '..', 'server', 'tests', 'fixtures', 'featureParity.json'), 'w') as fh:
        json.dump({'features': FEATURE_NAMES, 'sampleOrder': 'ax,ay,az,gx,gy,gz,rx,ry,rz', 'windows': parity}, fh)
    print('X', X.shape, 'drives', len(set(drive)), 'parity windows', len(parity))
    df = pd.DataFrame({'split': sp, 'variant': var, 'label': [CLASSES[i] for i in y]})
    print(df.groupby(['split', 'variant', 'label']).size().unstack(fill_value=0).to_string())


if __name__ == '__main__':
    main()
