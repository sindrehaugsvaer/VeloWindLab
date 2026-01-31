/**
 * Core TypeScript types for GPX analysis
 */

// Raw GPX point from parser
export interface GPXPoint {
  latitude: number;
  longitude: number;
  elevation: number | null;
  time: Date | null;
}

// Enhanced point with computed metrics
export interface EnhancedPoint extends GPXPoint {
  distance: number; // Cumulative distance in meters
  grade: number; // Grade percentage at this point
}

// Simplified point for rendering (after Douglas-Peucker)
export interface SimplifiedPoint {
  lat: number;
  lon: number;
  ele: number;
}

// Climb segment detected in the route
export interface Climb {
  startIndex: number;
  endIndex: number;
  startDistance: number; // meters
  endDistance: number; // meters
  distance: number; // meters
  elevationGain: number; // meters
  avgGrade: number; // percentage
  maxGrade: number; // percentage
  category: 'HC' | '1' | '2' | '3' | '4' | null; // Strava categorization
}

// Route statistics
export interface RouteStats {
  totalDistance: number; // meters
  totalElevationGain: number; // meters
  totalElevationLoss: number; // meters
  minElevation: number; // meters
  maxElevation: number; // meters
  totalTime: number | null; // seconds
  movingTime: number | null; // seconds (with stop detection)
  avgSpeed: number | null; // m/s
  maxSpeed: number | null; // m/s
}

// Segment stats (for brush selection)
export interface SegmentStats extends RouteStats {
  startDistance: number;
  endDistance: number;
}

// Complete GPX data structure
export interface GPXData {
  fileName: string;
  metadata: {
    name: string | null;
    description: string | null;
  };
  points: EnhancedPoint[]; // Full-resolution points with metrics
  simplifiedPoints: SimplifiedPoint[]; // For map rendering
  stats: RouteStats;
  climbs: Climb[];
  hasElevation: boolean;
  hasTime: boolean;
  isLoop: boolean; // True if start/end are within LOOP_THRESHOLD_METERS
}

// Smoothing levels for elevation gain calculation
export type SmoothingLevel = 'off' | 'low' | 'medium' | 'high';

// Smoothing configuration (vertical threshold in meters)
export const SMOOTHING_CONFIG: Record<SmoothingLevel, number> = {
  off: 0,
  low: 3,
  medium: 6,
  high: 9,
};

// Configuration constants for calculations
export const CALCULATION_CONFIG = {
  // Climb detection
  CLIMB_MIN_GRADE: 3.0, // percentage
  CLIMB_MIN_DISTANCE: 300, // meters
  CLIMB_END_GRADE: 2.0, // percentage (when to end a climb)
  
  // Gradient calculation
  GRADE_WINDOW_SIZE: 10, // points for rolling window
  
  // Speed calculation (stop detection)
  STOP_SPEED_THRESHOLD: 0.5, // m/s (below this is considered stopped)
  
  // Douglas-Peucker simplification
  SIMPLIFY_TOLERANCE: 0.0001, // degrees (adjust based on zoom)
  
  // Earth radius for distance calculations
  EARTH_RADIUS: 6371000, // meters
  
  // Loop detection threshold
  LOOP_THRESHOLD_METERS: 500,
} as const;

// Hover state for synchronized map + chart interactions
export interface HoverState {
  point: EnhancedPoint | null;
  index: number | null;
}

// GeoJSON types for map rendering
export interface GeoJSONLineString {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lon, lat]
  };
  properties: Record<string, unknown>;
}
