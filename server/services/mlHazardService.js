import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RandomForestClassifier } from 'ml-random-forest';
import { buildFeatureVector, FEATURE_NAMES, labelFromIndex } from '../ml/featureVector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.join(__dirname, '..', 'ml', 'modelArtifact.json');

let cachedArtifact = null;

export function asConfidence(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(1, Math.max(0, numericValue));
}

export async function loadModelArtifact(artifactLocation = artifactPath) {
  if (cachedArtifact && artifactLocation === artifactPath) return cachedArtifact;

  try {
    const rawArtifact = await fs.readFile(artifactLocation, 'utf8');
    const parsedArtifact = JSON.parse(rawArtifact);
    if (parsedArtifact.status === 'training-blocked' || !parsedArtifact.model) {
      throw new Error('No valid ML model artifact is available. Real labelled dataset training is required before inference can run.');
    }
    if (artifactLocation === artifactPath) cachedArtifact = parsedArtifact;
    return parsedArtifact;
  } catch (error) {
    throw new Error(`No valid ML model artifact is available. Real labelled dataset training is required before inference can run. ${error.message}`);
  }
}

export function getHazardThreshold() {
  const configured = Number(process.env.ML_HAZARD_CONFIDENCE_THRESHOLD ?? '0.72');
  if (!Number.isFinite(configured)) return 0.72;
  return Math.min(1, Math.max(0, configured));
}

export function imputeMissingValues(values, medians = []) {
  return values.map((value, index) => {
    if (Number.isFinite(value)) return value;
    if (Number.isFinite(medians[index])) return medians[index];
    return 0;
  });
}

export async function inferWindow(window = {}, options = {}) {
  if (!window || typeof window !== 'object') {
    throw new Error('A telemetry window object is required for inference.');
  }

  const artifact = await loadModelArtifact(options.modelPath || artifactPath);
  const model = RandomForestClassifier.load(artifact.model);
  const featureVector = buildFeatureVector(window);
  const imputedVector = imputeMissingValues(featureVector, artifact.medians ?? Array(FEATURE_NAMES.length).fill(0));

  const prediction = model.predict([imputedVector])[0];
  const label = labelFromIndex(prediction);
  const confidence = asConfidence(model.predictProbability([imputedVector], prediction)[0]);

  return {
    label,
    confidence,
    modelVersion: artifact.modelVersion,
    features: FEATURE_NAMES,
    featureVector: imputedVector,
  };
}

export function shouldDebounceMlDetection(candidate, previousHazard) {
  if (!candidate || !previousHazard) return false;
  if (candidate.label !== previousHazard.mlLabel) return false;

  const candidateCoords = candidate.location?.coordinates ?? candidate.coordinates ?? [];
  const previousCoords = previousHazard.location?.coordinates ?? previousHazard.coordinates ?? [];

  if (!Array.isArray(candidateCoords) || !Array.isArray(previousCoords) || candidateCoords.length !== 2 || previousCoords.length !== 2) return false;

  const lng1 = Number(candidateCoords[0]);
  const lat1 = Number(candidateCoords[1]);
  const lng2 = Number(previousCoords[0]);
  const lat2 = Number(previousCoords[1]);

  if (!Number.isFinite(lng1) || !Number.isFinite(lat1) || !Number.isFinite(lng2) || !Number.isFinite(lat2)) return false;

  const deltaLat = lat1 - lat2;
  const deltaLng = lng1 - lng2;
  const distanceMeters = Math.hypot(deltaLat * 111_000, deltaLng * 111_000 * Math.cos((lat1 + lat2) / 2 * (Math.PI / 180)));
  const elapsedMs = new Date(candidate.timestamp || Date.now()).getTime() - new Date(previousHazard.createdAt || previousHazard.timestamp || Date.now()).getTime();

  return distanceMeters <= 50 && elapsedMs <= 30 * 60 * 1000;
}
