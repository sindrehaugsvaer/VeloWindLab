import type { GPXPoint, SimplifiedPoint } from '../gpx/types';
import { CALCULATION_CONFIG as CONFIG } from '../gpx/types';

const DEFAULT_TOLERANCE = CONFIG.SIMPLIFY_TOLERANCE;

export function simplifyWithElevation(
  points: GPXPoint[],
  tolerance: number = DEFAULT_TOLERANCE
): SimplifiedPoint[] {
  if (points.length === 0) return [];

  const pointsFor3D = points.map(p => ({
    x: p.longitude,
    y: p.latitude,
    z: p.elevation ?? 0
  }));

  const result: Array<{ x: number; y: number; z: number }> = [pointsFor3D[0]];
  
  if (pointsFor3D.length <= 2) {
    return pointsFor3D.map(p => ({
      lat: p.y,
      lon: p.x,
      ele: p.z
    }));
  }

  const sqTolerance = tolerance * tolerance;

  const simplifyDouglasPeucker = (
    points: Array<{ x: number; y: number; z: number }>,
    first: number,
    last: number,
    sqTol: number,
    simplified: Array<{ x: number; y: number; z: number }>
  ) => {
    let maxSqDist = sqTol;
    let index = 0;

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSquareSegmentDistance(
        points[i],
        points[first],
        points[last]
      );

      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTol) {
      if (index - first > 1) {
        simplifyDouglasPeucker(points, first, index, sqTol, simplified);
      }
      simplified.push(points[index]);
      if (last - index > 1) {
        simplifyDouglasPeucker(points, index, last, sqTol, simplified);
      }
    }
  };

  simplifyDouglasPeucker(
    pointsFor3D,
    0,
    pointsFor3D.length - 1,
    sqTolerance,
    result
  );
  
  result.push(pointsFor3D[pointsFor3D.length - 1]);

  return result.map(p => ({
    lat: p.y,
    lon: p.x,
    ele: p.z
  }));
}

function getSquareSegmentDistance(
  p: { x: number; y: number; z: number },
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number {
  let x = p1.x;
  let y = p1.y;
  let z = p1.z;

  let dx = p2.x - x;
  let dy = p2.y - y;
  let dz = p2.z - z;

  if (dx !== 0 || dy !== 0 || dz !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy + (p.z - z) * dz) /
              (dx * dx + dy * dy + dz * dz);

    if (t > 1) {
      x = p2.x;
      y = p2.y;
      z = p2.z;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
      z += dz * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;
  dz = p.z - z;

  return dx * dx + dy * dy + dz * dz;
}

export function adaptiveTolerance(pointCount: number): number {
  if (pointCount < 1000) return 0.00005;
  if (pointCount < 10000) return 0.0001;
  if (pointCount < 50000) return 0.0002;
  return 0.0005;
}
