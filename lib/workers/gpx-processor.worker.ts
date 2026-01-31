import { parseGPXFile, isParseError } from '../gpx/parser';
import {
  calculateCumulativeDistance,
  calculateRollingGrade,
  calculateRouteStats,
  enhancePoints,
  isLoopRoute
} from '../calculations/distance';
import { detectClimbs } from '../calculations/climbs';
import { simplifyWithElevation, adaptiveTolerance } from '../calculations/simplify';
import type { GPXData, SmoothingLevel } from '../gpx/types';
import { SMOOTHING_CONFIG as SMOOTHING_THRESHOLDS } from '../gpx/types';

interface WorkerInput {
  type: 'PROCESS_GPX';
  gpxString: string;
  fileName: string;
  smoothingLevel: SmoothingLevel;
}

interface WorkerOutput {
  type: 'SUCCESS' | 'ERROR';
  data?: GPXData;
  error?: string;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { type, gpxString, fileName, smoothingLevel } = e.data;

  if (type !== 'PROCESS_GPX') {
    self.postMessage({
      type: 'ERROR',
      error: 'Invalid message type'
    } as WorkerOutput);
    return;
  }

  try {
    const parseResult = parseGPXFile(gpxString);

    if (isParseError(parseResult)) {
      self.postMessage({
        type: 'ERROR',
        error: parseResult.message + (parseResult.details ? `: ${parseResult.details}` : '')
      } as WorkerOutput);
      return;
    }

    const { points, hasElevation, hasTime } = parseResult;
    
    const distances = calculateCumulativeDistance(points);
    const grades = calculateRollingGrade(points, distances);
    const enhancedPoints = enhancePoints(points, distances, grades);

    const verticalThreshold = SMOOTHING_THRESHOLDS[smoothingLevel];
    const stats = calculateRouteStats(enhancedPoints, verticalThreshold);

    const climbs = hasElevation ? detectClimbs(enhancedPoints) : [];

    const tolerance = adaptiveTolerance(points.length);
    const simplifiedPoints = simplifyWithElevation(points, tolerance);

    const gpxData: GPXData = {
      fileName,
      metadata: {
        name: null,
        description: null
      },
      points: enhancedPoints,
      simplifiedPoints,
      stats,
      climbs,
      hasElevation,
      hasTime,
      isLoop: isLoopRoute(points)
    };

    self.postMessage({
      type: 'SUCCESS',
      data: gpxData
    } as WorkerOutput);

  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Processing failed'
    } as WorkerOutput);
  }
};
