import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RandomForestClassifier } from 'ml-random-forest';
import { buildFeatureVector, FEATURE_NAMES, LABEL_CLASSES, labelFromIndex } from '../ml/featureVector.js';

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

// ML_HAZARD_CONFIDENCE_THRESHOLD overrides the threshold tuned at training time (artifact.hazardThreshold).
export function getHazardThreshold(artifact) {
  const configured = Number(process.env.ML_HAZARD_CONFIDENCE_THRESHOLD ?? artifact?.hazardThreshold ?? 0.72);
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
  // Build the forest once per cached artifact (60 trees; rebuilding per request is wasteful).
  const model = (artifact.loadedModel ??= RandomForestClassifier.load(artifact.model));
  const featureVector = buildFeatureVector(window);
  const imputedVector = imputeMissingValues(featureVector, artifact.medians ?? Array(FEATURE_NAMES.length).fill(0));

  // Per-class vote fractions (the library's predictProbability skips the first tree's vote).
  const votes = model.predictionValues([imputedVector]).getRow(0);
  const probabilities = LABEL_CLASSES.map((_, c) => votes.filter((v) => v === c).length / votes.length);
  // Hazard iff P(hazard) = 1 - P(normal) clears the threshold; type = likelier hazard class (ml/train.py `decide`).
  const hazardProbability = asConfidence(1 - probabilities[0]);
  const threshold = getHazardThreshold(artifact);
  const label = hazardProbability >= threshold ? labelFromIndex(probabilities[2] > probabilities[1] ? 2 : 1) : 'normal';

  return {
    label,
    confidence: label === 'normal' ? asConfidence(probabilities[0]) : hazardProbability,
    probabilities: Object.fromEntries(LABEL_CLASSES.map((name, c) => [name, probabilities[c]])),
    threshold,
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
