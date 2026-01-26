'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import type { GPXData, HoverState, SmoothingLevel, Climb } from '@/lib/gpx/types';
import type { RouteWindPoint } from '@/lib/weather/types';

export interface RaceWeatherData {
  windDirection: number;
  windSpeed: number;
  temperature: number;
  weatherCode: number;
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
  processGPX: (file: File, smoothingLevel?: SmoothingLevel) => Promise<void>;
  setHoverPoint: (point: GPXData['points'][0] | null, index: number | null) => void;
  setUserSpeed: (speed: number) => void;
  setLapCount: (laps: number) => void;
  setRaceDateTime: (date: Date | null) => void;
  setRaceWeather: (weather: RaceWeatherData | null) => void;
  setRouteWindData: (data: RouteWindPoint[]) => void;
  setSelectedClimbIndex: (index: number | null) => void;
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
  const workerRef = useRef<Worker | null>(null);

  const processGPX = useCallback(async (file: File, smoothingLevel: SmoothingLevel = 'medium') => {
    setLoading(true);
    setError(null);
    setData(null);
    setLapCountState(1);
    setRaceDateTimeState(null);
    setRaceWeatherState(null);
    setRouteWindDataState([]);

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

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process GPX file');
    } finally {
      setLoading(false);
    }
  }, []);

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
    setHoverState({ point: null, index: null });
    setLapCountState(1);
    setRaceDateTimeState(null);
    setRaceWeatherState(null);
    setRouteWindDataState([]);
    setSelectedClimbIndexState(null);
  }, []);

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
        processGPX,
        setHoverPoint,
        setUserSpeed,
        setLapCount,
        setRaceDateTime,
        setRaceWeather,
        setRouteWindData,
        setSelectedClimbIndex,
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
