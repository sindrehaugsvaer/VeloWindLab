"use client";

import { useEffect, useState, useMemo } from "react";
import { useGPX } from "@/context/GPXContext";
import {
  fetchWeatherForRoute,
  fetchRaceTimeWeather,
  fetchRouteWindData,
} from "@/lib/weather/api";
import { getWeatherDescription, getWindDirection } from "@/lib/weather/types";
import type { WeatherData, LocationWeather } from "@/lib/weather/types";
import type { RaceTimeWeather } from "@/lib/weather/api";
import Accordion from "./Accordion";

export default function WeatherPanel() {
  const {
    data,
    raceDateTime,
    setRaceDateTime,
    setRaceWeather,
    setRouteWindData,
    userSpeed,
    lapCount,
  } = useGPX();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [raceTimeWeather, setRaceTimeWeatherState] =
    useState<RaceTimeWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [raceLoading, setRaceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format date to datetime-local input format (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const { minDateStr, maxDateStr } = useMemo(() => {
    const now = new Date();
    const min = new Date(now);
    min.setMinutes(0, 0, 0);

    const max = new Date(now);
    max.setDate(max.getDate() + 7);

    return {
      minDateStr: formatDateTimeLocal(min),
      maxDateStr: formatDateTimeLocal(max),
    };
  }, []);

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setRaceDateTime(new Date(value));
    } else {
      setRaceDateTime(null);
    }
  };

  useEffect(() => {
    if (!data || data.points.length < 2) {
      setWeather(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        const startPoint = data.points[0];
        const endPoint = data.points[data.points.length - 1];

        const weatherData = await fetchWeatherForRoute(
          startPoint.latitude,
          startPoint.longitude,
          endPoint.latitude,
          endPoint.longitude,
          data.isLoop,
        );

        setWeather(weatherData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch weather",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [data]);

  useEffect(() => {
    if (!data || !raceDateTime || data.points.length < 2) {
      setRaceTimeWeatherState(null);
      setRaceWeather(null);
      setRouteWindData([]);
      return;
    }

    const fetchRaceWeather = async () => {
      setRaceLoading(true);

      try {
        const startPoint = data.points[0];

        const [raceWeatherData, routeWind] = await Promise.all([
          fetchRaceTimeWeather(
            startPoint.latitude,
            startPoint.longitude,
            raceDateTime,
          ),
          fetchRouteWindData(
            data.points,
            raceDateTime,
            userSpeed,
            lapCount,
            data.stats.totalDistance
          ),
        ]);

        setRaceTimeWeatherState(raceWeatherData);
        setRouteWindData(routeWind);

        if (raceWeatherData) {
          setRaceWeather({
            windDirection: raceWeatherData.windDirection,
            windSpeed: raceWeatherData.windSpeed,
            temperature: raceWeatherData.temperature,
            weatherCode: raceWeatherData.weatherCode,
          });
        } else {
          setRaceWeather(null);
        }
      } catch (err) {
        console.error("Failed to fetch race weather:", err);
        setRaceTimeWeatherState(null);
        setRaceWeather(null);
        setRouteWindData([]);
      } finally {
        setRaceLoading(false);
      }
    };

    fetchRaceWeather();
  }, [data, raceDateTime, setRaceWeather, setRouteWindData, userSpeed, lapCount]);

  const clearRaceTime = () => {
    setRaceDateTime(null);
    setRaceTimeWeatherState(null);
    setRaceWeather(null);
    setRouteWindData([]);
  };

  if (!data) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Loading weather...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6">
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <Accordion title="Weather" badge={raceDateTime ? "Race Mode" : "Current"} defaultOpen={false}>
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-2">
            🏁 Race Date & Time
          </label>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
              type="datetime-local"
              value={raceDateTime ? formatDateTimeLocal(raceDateTime) : ""}
              onChange={handleDateTimeChange}
              min={minDateStr}
              max={maxDateStr}
              className="flex-1 px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full [color-scheme:light] dark:[color-scheme:dark]"
            />
            {raceDateTime && (
              <button
                onClick={clearRaceTime}
                className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            Set race time for accurate forecast (up to 7 days ahead)
          </p>
        </div>

        {raceDateTime && raceTimeWeather && (
          <RaceWeatherCard
            weather={raceTimeWeather}
            raceDateTime={raceDateTime}
            loading={raceLoading}
          />
        )}

        {raceDateTime && !raceTimeWeather && !raceLoading && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              No forecast available for selected time. Try a different time.
            </p>
          </div>
        )}

        {!raceDateTime &&
          weather.locations.map((locationWeather, index) => (
            <LocationWeatherCard
              key={index}
              data={locationWeather}
              showDivider={index < weather.locations.length - 1}
            />
          ))}
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Wind and weather data powered by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-400 hover:underline"
          >
            Open-Meteo
          </a>{" "}
          (
          <a
            href="https://open-meteo.com/en/docs#license"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-400 hover:underline"
          >
            CC BY 4.0
          </a>
          ).
        </p>
      </div>
    </Accordion>
  );
}

function RaceWeatherCard({
  weather,
  raceDateTime,
  loading,
}: {
  weather: RaceTimeWeather;
  raceDateTime: Date;
  loading: boolean;
}) {
  const weatherInfo = getWeatherDescription(weather.weatherCode);
  const windDir = getWindDirection(weather.windDirection);

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-zinc-700 dark:text-zinc-200">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200"></div>
          <span className="text-sm">Updating forecast...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-zinc-900 dark:text-zinc-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{weatherInfo.icon}</span>
          <div>
            <h3 className="font-semibold">Race Forecast</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatDateTime(raceDateTime)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold">
            {Math.round(weather.temperature)}°C
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Feels {Math.round(weather.apparentTemperature)}°C
          </div>
        </div>
      </div>

      <div className="text-sm text-zinc-600 dark:text-zinc-300 mb-3">
        {weatherInfo.description}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2 border border-zinc-200/60 dark:border-zinc-700/60">
          <div className="text-zinc-500 dark:text-zinc-400 text-xs">Wind</div>
          <div className="font-semibold flex items-center gap-1 text-zinc-900 dark:text-zinc-100">
            <WindArrow
              direction={weather.windDirection}
              size={16}
              color="currentColor"
            />
            {weather.windSpeed.toFixed(1)} m/s {windDir}
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2 border border-zinc-200/60 dark:border-zinc-700/60">
          <div className="text-zinc-500 dark:text-zinc-400 text-xs">Precipitation</div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            {weather.precipitationProbability}% chance
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2 border border-zinc-200/60 dark:border-zinc-700/60">
          <div className="text-zinc-500 dark:text-zinc-400 text-xs">Humidity</div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{weather.humidity}%</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2 border border-zinc-200/60 dark:border-zinc-700/60">
          <div className="text-zinc-500 dark:text-zinc-400 text-xs">Cloud Cover</div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{weather.cloudCover}%</div>
        </div>
      </div>
    </div>
  );
}

function WindArrow({
  direction,
  size = 20,
  color = "currentColor",
}: {
  direction: number;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${direction + 180}deg)` }}
    >
      <path d="M12 2L6 12h4v10h4V12h4L12 2z" fill={color} />
    </svg>
  );
}

function LocationWeatherCard({
  data,
  showDivider,
}: {
  data: LocationWeather;
  showDivider: boolean;
}) {
  const { current, daily, location } = data;
  const weatherInfo = getWeatherDescription(current.weatherCode);
  const windDir = getWindDirection(current.windDirection);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={
        showDivider ? "pb-6 border-b border-gray-200 dark:border-gray-700" : ""
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{weatherInfo.icon}</span>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {location.label}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {weatherInfo.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(current.temperature)}°C
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Feels like {Math.round(current.apparentTemperature)}°C
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Wind</span>
            <span className="text-gray-900 dark:text-gray-100">
              {current.windSpeed.toFixed(1)} m/s {windDir}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Humidity</span>
            <span className="text-gray-900 dark:text-gray-100">
              {current.humidity}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              Cloud cover
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {current.cloudCover}%
            </span>
          </div>
        </div>
      </div>

      {daily.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            3-Day Forecast
          </h4>
          <div className="space-y-2">
            {daily.map((day, i) => {
              const dayWeather = getWeatherDescription(day.weatherCode);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span>{dayWeather.icon}</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatDate(day.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {day.precipitationProbabilityMax > 0 && (
                      <span className="text-blue-500 text-xs">
                        💧 {day.precipitationProbabilityMax}%
                      </span>
                    )}
                    <span className="text-gray-900 dark:text-gray-100 font-medium w-16 text-right">
                      {Math.round(day.temperatureMax)}° /{" "}
                      {Math.round(day.temperatureMin)}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {daily.length > 0 && (
        <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          🌅 {formatTime(daily[0].sunrise)} · 🌇 {formatTime(daily[0].sunset)}
        </div>
      )}
    </div>
  );
}
