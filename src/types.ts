export interface UserProfile {
  name: string;
  email: string;
  level: string;
  badge: string;
  xp: number;
  maxXp: number;
  ridesCompleted: number;
  kmScanned: number;
  hazardsMarked: number;
  bbmpRepaired: number;
  ridersWarned: number;
  vehicle: string;
}

export interface HazardItem {
  id: string;
  type: 'pothole' | 'speed_breaker' | 'waterlog' | 'cave_in';
  title: string;
  location: string;
  distance: string;
  severity: 'low' | 'medium' | 'high';
  severityLabel: string;
  depth?: string;
  verifiedCount: number;
  bbmpNotified: boolean;
  notes: string;
  imageUrl?: string;
  isConfirmed?: boolean;
}

export interface RideTelemetry {
  distanceKm: number;
  durationMins: number;
  hazardsDetected: number;
  hazardsReported: number;
  safetyScore: number;
  avgSpeedKmH: number;
  currentSpeedKmH: number;
  currentRoad: string;
  destination: string;
}
