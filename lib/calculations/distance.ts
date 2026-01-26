import turfDistance from '@turf/distance';
import { point } from '@turf/helpers';
import type { GPXPoint, EnhancedPoint, RouteStats, CALCULATION_CONFIG } from '../gpx/types';
import { CALCULATION_CONFIG as CONFIG } from '../gpx/types';

const EARTH_RADIUS = 6371000;

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const from = point([lon1, lat1]);
  const to = point([lon2, lat2]);
  return turfDistance(from, to, { units: 'meters' });
}

export function isLoopRoute(points: GPXPoint[]): boolean {
  if (points.length < 2) return false;
  
  const first = points[0];
  const last = points[points.length - 1];
  const distance = calculateDistance(first.latitude, first.longitude, last.latitude, last.longitude);
  
  return distance <= CONFIG.LOOP_THRESHOLD_METERS;
}

export function calculateCumulativeDistance(points: GPXPoint[]): number[] {
  const distances: number[] = [0];
  let cumulative = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segmentDistance = calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    cumulative += segmentDistance;
    distances.push(cumulative);
  }

  return distances;
}

export function calculateElevationStats(
  points: GPXPoint[],
  verticalThreshold: number = 6
): {
  gain: number;
  loss: number;
  min: number;
  max: number;
} {
  if (points.length === 0) {
    return { gain: 0, loss: 0, min: 0, max: 0 };
  }

  let gain = 0;
  let loss = 0;
  let lastElevation = points[0].elevation ?? 0;
  let minElevation = points[0].elevation ?? 0;
  let maxElevation = points[0].elevation ?? 0;

  for (const point of points) {
    const elevation = point.elevation ?? 0;
    
    if (elevation < minElevation) minElevation = elevation;
    if (elevation > maxElevation) maxElevation = elevation;

    const diff = elevation - lastElevation;
    
    if (Math.abs(diff) >= verticalThreshold) {
      if (diff > 0) {
        gain += diff;
      } else {
        loss += Math.abs(diff);
      }
      lastElevation = elevation;
    }
  }

  return {
    gain,
    loss,
    min: minElevation,
    max: maxElevation
  };
}

export function calculateRollingGrade(
  points: GPXPoint[],
  distances: number[],
  windowSize: number = 10
): number[] {
  const grades: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const halfWindow = Math.floor(windowSize / 2);
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length - 1, i + halfWindow);

    if (start === end) {
      grades.push(0);
      continue;
    }

    const horizontalDistance = distances[end] - distances[start];
    const elevationDiff = (points[end].elevation ?? 0) - (points[start].elevation ?? 0);

    if (horizontalDistance === 0) {
      grades.push(0);
    } else {
      const grade = (elevationDiff / horizontalDistance) * 100;
      grades.push(Math.max(-30, Math.min(30, grade)));
    }
  }

  return grades;
}

export function calculateTimeStats(points: GPXPoint[]): {
  totalTime: number | null;
  movingTime: number | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
} {
  const firstTime = points[0]?.time;
  const lastTime = points[points.length - 1]?.time;

  if (!firstTime || !lastTime) {
    return {
      totalTime: null,
      movingTime: null,
      avgSpeed: null,
      maxSpeed: null
    };
  }

  const totalTime = (lastTime.getTime() - firstTime.getTime()) / 1000;
  let movingTime = 0;
  let maxSpeed = 0;
  const STOP_THRESHOLD = 0.5;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (!prev.time || !curr.time) continue;

    const timeDiff = (curr.time.getTime() - prev.time.getTime()) / 1000;
    if (timeDiff === 0) continue;

    const dist = calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    const speed = dist / timeDiff;

    if (speed > STOP_THRESHOLD) {
      movingTime += timeDiff;
    }

    if (speed > maxSpeed) {
      maxSpeed = speed;
    }
  }

  return {
    totalTime,
    movingTime,
    avgSpeed: movingTime > 0 ? 
      (points[points.length - 1].elevation !== null ? 
        calculateDistance(
          points[0].latitude,
          points[0].longitude,
          points[points.length - 1].latitude,
          points[points.length - 1].longitude
        ) / movingTime : null) : null,
    maxSpeed
  };
}

export function enhancePoints(
  points: GPXPoint[],
  distances: number[],
  grades: number[]
): EnhancedPoint[] {
  return points.map((point, i) => ({
    ...point,
    distance: distances[i],
    grade: grades[i]
  }));
}

export function calculateRouteStats(
  enhancedPoints: EnhancedPoint[],
  verticalThreshold: number
): RouteStats {
  if (enhancedPoints.length === 0) {
    return {
      totalDistance: 0,
      totalElevationGain: 0,
      totalElevationLoss: 0,
      minElevation: 0,
      maxElevation: 0,
      totalTime: null,
      movingTime: null,
      avgSpeed: null,
      maxSpeed: null
    };
  }

  const elevStats = calculateElevationStats(enhancedPoints, verticalThreshold);
  const timeStats = calculateTimeStats(enhancedPoints);
  const totalDistance = enhancedPoints[enhancedPoints.length - 1].distance;

  return {
    totalDistance,
    totalElevationGain: elevStats.gain,
    totalElevationLoss: elevStats.loss,
    minElevation: elevStats.min,
    maxElevation: elevStats.max,
    ...timeStats
  };
}
