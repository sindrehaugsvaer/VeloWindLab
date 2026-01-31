import type { EnhancedPoint, Climb } from '../gpx/types';
import { CALCULATION_CONFIG as CONFIG } from '../gpx/types';

const CLIMB_MIN_GRADE = CONFIG.CLIMB_MIN_GRADE;
const CLIMB_MIN_DISTANCE = CONFIG.CLIMB_MIN_DISTANCE;
const CLIMB_END_GRADE = CONFIG.CLIMB_END_GRADE;

function categorizeClimb(distance: number, avgGrade: number): Climb['category'] {
  const score = distance * avgGrade;
  
  if (avgGrade < CLIMB_MIN_GRADE || distance < CLIMB_MIN_DISTANCE) {
    return null;
  }
  
  if (score > 80000) return 'HC';
  if (score > 64000) return '1';
  if (score > 32000) return '2';
  if (score > 16000) return '3';
  if (score > 8000) return '4';
  
  return null;
}

export function detectClimbs(points: EnhancedPoint[]): Climb[] {
  if (points.length < 2) return [];
  
  const climbs: Climb[] = [];
  let inClimb = false;
  let climbStartIndex = 0;
  let climbStartDistance = 0;
  let climbElevationGain = 0;
  let climbMaxGrade = 0;

  for (let i = 1; i < points.length; i++) {
    const currentGrade = points[i].grade;
    const currentElevation = points[i].elevation ?? 0;
    const prevElevation = points[i - 1].elevation ?? 0;
    const elevationDiff = currentElevation - prevElevation;

    if (!inClimb && currentGrade >= CLIMB_MIN_GRADE) {
      inClimb = true;
      climbStartIndex = i;
      climbStartDistance = points[i].distance;
      climbElevationGain = 0;
      climbMaxGrade = currentGrade;
    }

    if (inClimb) {
      if (elevationDiff > 0) {
        climbElevationGain += elevationDiff;
      }
      if (currentGrade > climbMaxGrade) {
        climbMaxGrade = currentGrade;
      }

      const isLastPoint = i === points.length - 1;
      const shouldEndClimb = currentGrade < CLIMB_END_GRADE || isLastPoint;

      if (shouldEndClimb) {
        const climbDistance = points[i].distance - climbStartDistance;
        
        if (climbDistance >= CLIMB_MIN_DISTANCE) {
          const avgGrade = (climbElevationGain / climbDistance) * 100;
          
          climbs.push({
            startIndex: climbStartIndex,
            endIndex: i,
            startDistance: climbStartDistance,
            endDistance: points[i].distance,
            distance: climbDistance,
            elevationGain: climbElevationGain,
            avgGrade,
            maxGrade: climbMaxGrade,
            category: categorizeClimb(climbDistance, avgGrade)
          });
        }
        
        inClimb = false;
      }
    }
  }

  return climbs;
}

export function getClimbCategoryLabel(category: Climb['category']): string {
  if (!category) return 'Uncategorized';
  if (category === 'HC') return 'Hors Catégorie';
  return `Category ${category}`;
}

export function getClimbCategoryColor(category: Climb['category']): string {
  switch (category) {
    case 'HC': return '#dc2626';
    case '1': return '#ea580c';
    case '2': return '#f59e0b';
    case '3': return '#84cc16';
    case '4': return '#22c55e';
    default: return '#6b7280';
  }
}
