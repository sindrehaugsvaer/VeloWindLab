import { parseGPXWithCustomParser } from '@we-gold/gpxjs';
import { DOMParser } from 'xmldom-qsa';
import type { GPXPoint } from './types';

export interface ParseResult {
  points: GPXPoint[];
  hasElevation: boolean;
  hasTime: boolean;
}

export interface ParseError {
  message: string;
  details?: string;
}

function parseXML(gpxString: string): Document | null {
  try {
    const parser = new DOMParser();
    return parser.parseFromString(gpxString, 'text/xml');
  } catch {
    return null;
  }
}

export function parseGPXFile(gpxString: string): ParseResult | ParseError {
  try {
    const [parsed, error] = parseGPXWithCustomParser(gpxString, parseXML);
    
    if (error || !parsed) {
      return {
        message: 'Failed to parse GPX file',
        details: error?.message || 'Unknown parsing error'
      };
    }

    if (!parsed.tracks || parsed.tracks.length === 0) {
      return {
        message: 'No tracks found in GPX file',
        details: 'The file must contain at least one track with points'
      };
    }

    const allPoints: GPXPoint[] = [];
    let hasElevation = false;
    let hasTime = false;

    for (const track of parsed.tracks) {
      if (!track.points || track.points.length === 0) {
        continue;
      }

      for (const point of track.points) {
        allPoints.push({
          latitude: point.latitude,
          longitude: point.longitude,
          elevation: point.elevation,
          time: point.time
        });

        if (point.elevation !== null) {
          hasElevation = true;
        }
        if (point.time !== null) {
          hasTime = true;
        }
      }
    }

    if (allPoints.length === 0) {
      return {
        message: 'No valid points found in GPX tracks',
        details: 'All tracks appear to be empty'
      };
    }

    if (allPoints.length < 2) {
      return {
        message: 'Insufficient points',
        details: 'At least 2 points are required for analysis'
      };
    }

    return {
      points: allPoints,
      hasElevation,
      hasTime
    };
  } catch (err) {
    return {
      message: 'GPX parsing failed',
      details: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export function isParseError(result: ParseResult | ParseError): result is ParseError {
  return 'message' in result && typeof result.message === 'string';
}
