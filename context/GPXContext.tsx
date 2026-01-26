'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import type { GPXData, HoverState, SmoothingLevel } from '@/lib/gpx/types';
import type { RouteWindPoint } from '@/lib/weather/types';

export interface RaceWeatherData {
  windDirection: number;
  windSpeed: number;
  temperature: number;
  weatherCode: number;
}

export interface SavedRoute {
  id: string;
  name: string;
  data: GPXData;
  savedAt: number;
}

const STORAGE_KEY = 'velowindlab_saved_routes';

function generateRouteId(): string {
  return `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getRouteName(data: GPXData): string {
  return data.metadata.name || data.fileName.replace(/\.gpx$/i, '') || 'Unnamed Route';
}

interface GPXContextType {
  data: GPXData | null;
  loading: boolean;
  error: string | null;
  hoverState: HoverState;
  userSpeed: number;
  lapCount: number;
  raceDateTime: Date | null;
  raceWeather: RaceWeatherData | null;
  routeWindData: RouteWindPoint[];
  selectedClimbIndex: number | null;
  savedRoutes: SavedRoute[];
  activeRouteId: string | null;
  processGPX: (file: File, smoothingLevel?: SmoothingLevel) => Promise<{ success: boolean; error?: string }>;
  setHoverPoint: (point: GPXData['points'][0] | null, index: number | null) => void;
  setUserSpeed: (speed: number) => void;
  setLapCount: (laps: number) => void;
  setRaceDateTime: (date: Date | null) => void;
  setRaceWeather: (weather: RaceWeatherData | null) => void;
  setRouteWindData: (data: RouteWindPoint[]) => void;
  setSelectedClimbIndex: (index: number | null) => void;
  loadRoute: (routeId: string) => void;
  deleteRoute: (routeId: string) => void;
  hasRouteName: (name: string) => boolean;
  clearData: () => void;
}

const GPXContext = createContext<GPXContextType | null>(null);

export function GPXProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<GPXData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverState, setHoverState] = useState<HoverState>({ point: null, index: null });
  const [userSpeed, setUserSpeedState] = useState(25);
  const [lapCount, setLapCountState] = useState(1);
  const [raceDateTime, setRaceDateTimeState] = useState<Date | null>(null);
  const [raceWeather, setRaceWeatherState] = useState<RaceWeatherData | null>(null);
  const [routeWindData, setRouteWindDataState] = useState<RouteWindPoint[]>([]);
  const [selectedClimbIndex, setSelectedClimbIndexState] = useState<number | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedRoute[];
        setSavedRoutes(parsed);
      }
    } catch (err) {
      console.error('Failed to load routes from localStorage:', err);
    }
    setStorageLoaded(true);
  }, []);

  const persistRoutes = useCallback((routes: SavedRoute[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    } catch (err) {
      console.error('Failed to save routes to localStorage:', err);
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        const trimmedRoutes = routes.slice(-5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedRoutes));
        setSavedRoutes(trimmedRoutes);
      }
    }
  }, []);

  const hasRouteName = useCallback((name: string): boolean => {
    return savedRoutes.some(route => route.name.toLowerCase() === name.toLowerCase());
  }, [savedRoutes]);

  const resetRouteState = useCallback(() => {
    setHoverState({ point: null, index: null });
    setLapCountState(1);
    setRaceDateTimeState(null);
    setRaceWeatherState(null);
    setRouteWindDataState([]);
    setSelectedClimbIndexState(null);
  }, []);

  const processGPX = useCallback(async (file: File, smoothingLevel: SmoothingLevel = 'medium'): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    setData(null);
    resetRouteState();
    setActiveRouteId(null);

    try {
      const gpxString = await file.text();

      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../lib/workers/gpx-processor.worker.ts', import.meta.url)
        );
      }

      const worker = workerRef.current;

      const result = await new Promise<GPXData>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent) => {
          if (e.data.type === 'SUCCESS') {
            resolve(e.data.data);
          } else {
            reject(new Error(e.data.error || 'Processing failed'));
          }
        };

        worker.onerror = (err) => {
          reject(new Error('Worker error: ' + err.message));
        };

        worker.postMessage({
          type: 'PROCESS_GPX',
          gpxString,
          fileName: file.name,
          smoothingLevel
        });
      });

      const routeName = getRouteName(result);
      if (hasRouteName(routeName)) {
        setLoading(false);
        const errorMsg = `A route named "${routeName}" already exists`;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      const newRoute: SavedRoute = {
        id: generateRouteId(),
        name: routeName,
        data: result,
        savedAt: Date.now(),
      };

      const updatedRoutes = [...savedRoutes, newRoute];
      setSavedRoutes(updatedRoutes);
      persistRoutes(updatedRoutes);

      setData(result);
      setActiveRouteId(newRoute.id);
      setLoading(false);
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process GPX file';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [hasRouteName, savedRoutes, persistRoutes, resetRouteState]);

  const loadRoute = useCallback((routeId: string) => {
    const route = savedRoutes.find(r => r.id === routeId);
    if (route) {
      resetRouteState();
      setData(route.data);
      setActiveRouteId(routeId);
      setError(null);
    }
  }, [savedRoutes, resetRouteState]);

  const deleteRoute = useCallback((routeId: string) => {
    const updatedRoutes = savedRoutes.filter(route => route.id !== routeId);
    setSavedRoutes(updatedRoutes);
    persistRoutes(updatedRoutes);

    if (activeRouteId === routeId) {
      if (updatedRoutes.length > 0) {
        const nextRoute = updatedRoutes[updatedRoutes.length - 1];
        setData(nextRoute.data);
        setActiveRouteId(nextRoute.id);
      } else {
        setData(null);
        setActiveRouteId(null);
      }
      resetRouteState();
    }
  }, [savedRoutes, activeRouteId, persistRoutes, resetRouteState]);

  const setHoverPoint = useCallback((point: GPXData['points'][0] | null, index: number | null) => {
    setHoverState({ point, index });
  }, []);

  const setUserSpeed = useCallback((speed: number) => {
    setUserSpeedState(speed);
  }, []);

  const setLapCount = useCallback((laps: number) => {
    setLapCountState(Math.max(1, Math.min(100, laps)));
  }, []);

  const setRaceDateTime = useCallback((date: Date | null) => {
    setRaceDateTimeState(date);
  }, []);

  const setRaceWeather = useCallback((weather: RaceWeatherData | null) => {
    setRaceWeatherState(weather);
  }, []);

  const setRouteWindData = useCallback((windData: RouteWindPoint[]) => {
    setRouteWindDataState(windData);
  }, []);

  const setSelectedClimbIndex = useCallback((index: number | null) => {
    setSelectedClimbIndexState(index);
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
    setActiveRouteId(null);
    resetRouteState();
  }, [resetRouteState]);

  if (!storageLoaded) {
    return null;
  }

  return (
    <GPXContext.Provider
      value={{
        data,
        loading,
        error,
        hoverState,
        userSpeed,
        lapCount,
        raceDateTime,
        raceWeather,
        routeWindData,
        selectedClimbIndex,
        savedRoutes,
        activeRouteId,
        processGPX,
        setHoverPoint,
        setUserSpeed,
        setLapCount,
        setRaceDateTime,
        setRaceWeather,
        setRouteWindData,
        setSelectedClimbIndex,
        loadRoute,
        deleteRoute,
        hasRouteName,
        clearData
      }}
    >
      {children}
    </GPXContext.Provider>
  );
}

export function useGPX() {
  const context = useContext(GPXContext);
  if (!context) {
    throw new Error('useGPX must be used within GPXProvider');
  }
  return context;
}
