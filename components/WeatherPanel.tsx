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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function WeatherPanel() {
  const {
    data,
    raceDateTime,
    setRaceDateTime,
    setRaceWeather,
    setRouteWindData,
  } = useGPX();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [raceTimeWeather, setRaceTimeWeatherState] =
    useState<RaceTimeWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [raceLoading, setRaceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    const min = new Date(now);
    min.setMinutes(0, 0, 0);

    const max = new Date(now);
    max.setDate(max.getDate() + 7);

    return {
      minDate: min,
      maxDate: max,
    };
  }, []);

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
          fetchRouteWindData(data.points, raceDateTime),
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
  }, [data, raceDateTime, setRaceWeather, setRouteWindData]);

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
    <Accordion title="Weather" badge={raceDateTime ? "Race Mode" : "Current"}>
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-2">
            🏁 Race Date & Time
          </label>
          <div className="flex gap-2 items-center">
            <DatePicker
              selected={raceDateTime}
              calendarStartDay={1}
              onChange={(date: Date | null) => setRaceDateTime(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={60}
              timeCaption="Time"
              dateFormat="EEE, MMM d, HH:mm"
              minDate={minDate}
              maxDate={maxDate}
              placeholderText="Select date & time"
              className="flex-1 px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full"
            />
            {raceDateTime && (
              <button
                onClick={clearRaceTime}
                className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
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
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
          <span className="text-sm">Updating forecast...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{weatherInfo.icon}</span>
          <div>
            <h3 className="font-semibold">Race Forecast</h3>
            <p className="text-sm text-blue-100">
              {formatDateTime(raceDateTime)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold">
            {Math.round(weather.temperature)}°C
          </div>
          <div className="text-sm text-blue-100">
            Feels {Math.round(weather.apparentTemperature)}°C
          </div>
        </div>
      </div>

      <div className="text-sm text-blue-100 mb-3">
        {weatherInfo.description}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-blue-200 text-xs">Wind</div>
          <div className="font-semibold flex items-center gap-1">
            <WindArrow
              direction={weather.windDirection}
              size={16}
              color="white"
            />
            {Math.round(weather.windSpeed)} km/h {windDir}
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-blue-200 text-xs">Precipitation</div>
          <div className="font-semibold">
            {weather.precipitationProbability}% chance
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-blue-200 text-xs">Humidity</div>
          <div className="font-semibold">{weather.humidity}%</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2">
          <div className="text-blue-200 text-xs">Cloud Cover</div>
          <div className="font-semibold">{weather.cloudCover}%</div>
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
              {Math.round(current.windSpeed)} km/h {windDir}
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
