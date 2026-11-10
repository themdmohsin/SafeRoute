"""Train + evaluate on ml/data/processed/windows.npz; export the deployed model to server/ml/modelArtifact.json.

Usage: python ml/train.py > ml/logs/train.log 2>&1
Deployed model: scikit-learn RandomForest exported to the ml-random-forest JSON format the server already loads
(server/services/mlHazardService.js). ml-random-forest itself trains ~1 tree/10 s here, too slow to tune.
Probabilities everywhere are per-tree hard-vote fractions, which is exactly what the JS runtime computes.
"""
import json, os, time
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, f1_score, precision_recall_fscore_support
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight

ROOT = os.path.dirname(os.path.abspath(__file__))
SEED = 7
CLASSES = ['normal', 'speed_breaker', 'pothole']
PRECISION_TARGET = 0.9
APP_GATE = 2.5  # ActiveRideScreen skips windows whose linear-accel max is below this (m/s^2)
t_start = time.time()

d = np.load(os.path.join(ROOT, 'data', 'processed', 'windows.npz'))
X, y, split, variant, FEATURES = d['X'], d['y'], d['split'], d['variant'], list(d['features'])
sel = lambda sp, v=None: (split == sp) & ((variant == v) if v else True)
tr, va = sel('train'), sel('val', 'orig')
w_tr = compute_sample_weight('balanced', y[tr])


def votes(rf, Xs):
    v = np.stack([t.predict(Xs) for t in rf.estimators_], 1).astype(int)  # hard vote per tree, like ml-random-forest
    return np.stack([(v == c).mean(1) for c in range(3)], 1)


def decide(p, thr=None):
    """thr=None: plain argmax. Else hazard iff P(hazard)=1-P(normal) >= thr; type = likelier hazard class.
    Mirrors inferWindow in server/services/mlHazardService.js."""
    if thr is None:
        return p.argmax(1)
    return np.where(1 - p[:, 0] >= thr, 1 + p[:, 1:].argmax(1), 0)


def report(yt, yp):
    p, r, f, s = precision_recall_fscore_support(yt, yp, labels=[0, 1, 2], zero_division=0)
    return {'macroF1': round(f1_score(yt, yp, labels=[0, 1, 2], average='macro', zero_division=0), 3),
            'perClass': {CLASSES[c]: {'precision': round(p[c], 3), 'recall': round(r[c], 3), 'f1': round(f[c], 3), 'support': int(s[c])} for c in range(3)},
            'confusion': confusion_matrix(yt, yp, labels=[0, 1, 2]).tolist()}


def recall_at_precision(yt, score, cls, target=PRECISION_TARGET):
    order = np.argsort(-score)
    hit = (yt[order] == cls)
    prec = np.cumsum(hit) / np.arange(1, len(hit) + 1)
    rec = np.cumsum(hit) / max(hit.sum(), 1)
    ok = prec >= target
    return round(float(rec[ok].max()), 3) if ok.any() else 0.0


results = {'baselines': {}}
# Baseline 1: single threshold on vertical peak-to-peak (hazard vs normal; hazard type = majority hazard class in train)
fi = FEATURES.index('vertical_ptp')
cands = np.unique(X[tr, fi])
best_t = max(cands[::10], key=lambda t: f1_score(y[va] > 0, X[va, fi] >= t))
hz = int(np.bincount(y[tr][y[tr] > 0]).argmax())
results['baselines']['vertical_ptp_threshold'] = {'threshold': round(float(best_t), 3), **report(y[sel('test', 'orig')], np.where(X[sel('test', 'orig'), fi] >= best_t, hz, 0))}
# Baseline 2: logistic regression
lr = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight='balanced')).fit(X[tr], y[tr])
results['baselines']['logistic_regression'] = report(y[sel('test', 'orig')], lr.predict(X[sel('test', 'orig')]))
# Gradient boosting (comparison; not deployable without a new runtime)
gb = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, max_depth=4, random_state=SEED).fit(X[tr], y[tr], sample_weight=w_tr)
results['baselines']['hist_gradient_boosting'] = {'valMacroF1': report(y[va], gb.predict(X[va]))['macroF1'], **report(y[sel('test', 'orig')], gb.predict(X[sel('test', 'orig')]))}
print('baselines', {k: v['macroF1'] for k, v in results['baselines'].items()}, flush=True)

# Deployed model: small RF grid, selected on validation macro-F1 only
grid = [dict(n_estimators=n, max_depth=md, min_samples_leaf=ml) for n in (60, 120) for md in (8, 12) for ml in (2, 5)]
scored = []
for g in grid:
    rf = RandomForestClassifier(max_features='sqrt', class_weight='balanced', random_state=SEED, n_jobs=-1, **g).fit(X[tr], y[tr])
    scored.append((report(y[va], decide(votes(rf, X[va])))['macroF1'], -g['n_estimators'] * g['max_depth'], g, rf))
    print('grid', g, 'val macroF1', scored[-1][0], flush=True)
val_f1, _, best, rf = max(scored, key=lambda s: s[:2])  # ties -> smaller model

# Hazard gate on validation: lowest P(hazard) threshold whose hazard-vs-normal precision reaches PRECISION_TARGET
pv = votes(rf, X[va])
ok = [t for t in np.arange(0.3, 0.96, 0.05) if (y[va][1 - pv[:, 0] >= t] > 0).mean() >= PRECISION_TARGET]
thr = round(float(min(ok)), 2) if ok else 0.5
results['rf'] = {'params': best, 'valMacroF1': val_f1, 'hazardThreshold': thr,
                 'valThresholdSweep': {round(float(t), 2): {'hazardPrecision': round(float((y[va][1 - pv[:, 0] >= t] > 0).mean()), 3),
                                       'hazardRecall': round(float((1 - pv[y[va] > 0, 0] >= t).mean()), 3)} for t in np.arange(0.3, 0.96, 0.1)}}


def hazard_report(yt, yp):
    tp = ((yt > 0) & (yp > 0)).sum()
    return {'hazardPrecision': round(float(tp / max((yp > 0).sum(), 1)), 3), 'hazardRecall': round(float(tp / max((yt > 0).sum(), 1)), 3),
            'normalFalseAlarmRate': round(float(((yt == 0) & (yp > 0)).sum() / max((yt == 0).sum(), 1)), 3)}

te = sel('test', 'orig')
pt = votes(rf, X[te])
results['test'] = {'argmax': report(y[te], decide(pt)), 'withThresholds': report(y[te], decide(pt, thr)),
                   'hazardVsNormal': hazard_report(y[te], decide(pt, thr)),
                   'potholeRecallAtP90': recall_at_precision(y[te], pt[:, 2], 2),
                   'speedBreakerRecallAtP90': recall_at_precision(y[te], pt[:, 1], 1)}
gate = X[te, FEATURES.index('accLinear_max')] >= APP_GATE
yg = np.where(gate, decide(pt, thr), 0)  # windows below the gate never reach the model -> effectively "normal"
results['test']['withThresholdsAndAppGate'] = report(y[te], yg)
results['test']['hazardWindowsBelowAppGate'] = int((~gate & (y[te] > 0)).sum())
results['robustness'] = {}
for v in ('rot', 'noise10', 'shift'):
    m = sel('test', v)
    yp = decide(votes(rf, X[m]), thr)
    results['robustness'][v] = {**report(y[m], yp), **hazard_report(y[m], yp)}
imp = np.argsort(-rf.feature_importances_)[:10]
results['topFeatures'] = [[FEATURES[i], round(float(rf.feature_importances_[i]), 3)] for i in imp]


def node(t, i):
    if t.children_left[i] == -1:
        v = t.value[i][0]
        return {'distribution': [list(v / v.sum())]}
    # sklearn: x <= thr goes left; ml-cart: x < splitValue goes left
    return {'splitColumn': int(t.feature[i]), 'splitValue': float(np.nextafter(t.threshold[i], np.inf)),
            'left': node(t, t.children_left[i]), 'right': node(t, t.children_right[i])}


tree_opts = {'gainFunction': 'gini', 'splitFunction': 'mean', 'minNumSamples': best['min_samples_leaf'], 'maxDepth': best['max_depth'], 'kind': 'classifier'}
model = {'name': 'RFClassifier', 'baseModel': {
    'indexes': [list(range(len(FEATURES)))] * len(rf.estimators_), 'n': int(tr.sum()), 'replacement': False,
    'maxFeatures': 'sqrt', 'nEstimators': len(rf.estimators_), 'treeOptions': tree_opts, 'isClassifier': True,
    'seed': SEED, 'useSampleBagging': True,
    'estimators': [{'name': 'DTClassifier', 'options': tree_opts, 'root': node(e.tree_, 0)} for e in rf.estimators_]}}
version = f'roadsens4m-rf-{time.strftime("%Y%m%d")}'
artifact = {
    'modelVersion': version, 'status': 'trained', 'classes': CLASSES, 'features': FEATURES,
    'featureSchema': 'orientation-independent v2 (src/lib/sensorWindow.ts computeWindowFeatures == ml/features.py)',
    'hazardThreshold': thr,
    'medians': [round(float(v), 6) for v in np.median(X[tr], 0)],
    'training': {'source': 'RoadSens-4M Isolated Data (Khandakar et al., 2026, Scientific Data), CC BY 4.0, doi:10.6084/m9.figshare.30341143.v3',
                 'algorithm': 'RandomForest (scikit-learn, exported to ml-random-forest JSON)', 'params': best,
                 'testMacroF1': results['test']['withThresholds']['macroF1'], 'evaluation': 'docs/ml-model-evaluation.md'},
    'model': model,
}
art_path = os.path.join(ROOT, '..', 'server', 'ml', 'modelArtifact.json')
with open(art_path, 'w') as fh:
    json.dump(artifact, fh, separators=(',', ':'))
results['artifactBytes'] = os.path.getsize(art_path)
results['trainWallSeconds'] = round(time.time() - t_start, 1)
results['counts'] = {f'{sp}/{v}': np.bincount(y[sel(sp, v)], minlength=3).tolist() for sp in ('train', 'val', 'test') for v in ('orig', 'aug') if sel(sp, v).any()}

# Expected end-to-end outputs for the parity test (TS features -> JS model must match these)
pf = os.path.join(ROOT, '..', 'server', 'tests', 'fixtures', 'featureParity.json')
fix = json.load(open(pf))
for wdw in fix['windows']:
    wdw['expectedProbs'] = votes(rf, np.array([wdw['features']]))[0].tolist()
fix['modelVersion'] = version
json.dump(fix, open(pf, 'w'))

json.dump(results, open(os.path.join(ROOT, 'logs', 'metrics.json'), 'w'), indent=1)
print('done', version, 'bytes', results['artifactBytes'], 'wall s', results['trainWallSeconds'], flush=True)
