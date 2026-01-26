import type { 
  WeatherLocation, 
  LocationWeather, 
  WeatherData,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  RouteWindPoint
} from './types';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

interface OpenMeteoResponse {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
    precipitation: number;
    cloud_cover: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    relative_humidity_2m: number[];
    cloud_cover: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export interface RaceTimeWeather {
  time: Date;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  precipitation: number;
  precipitationProbability: number;
  cloudCover: number;
}

async function fetchLocationWeather(location: WeatherLocation, raceDateTime?: Date): Promise<LocationWeather> {
  const forecastDays = raceDateTime ? 7 : 3;
  
  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'relative_humidity_2m',
      'cloud_cover'
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'weather_code',
      'wind_speed_10m_max',
      'sunrise',
      'sunset'
    ].join(','),
    timezone: 'auto',
    forecast_days: forecastDays.toString()
  });

  if (!raceDateTime) {
    params.append('current', [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'weather_code',
      'precipitation',
      'cloud_cover',
      'is_day'
    ].join(','));
  }

  const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  let current: CurrentWeather;
  
  if (data.current) {
    current = {
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      weatherCode: data.current.weather_code,
      precipitation: data.current.precipitation,
      cloudCover: data.current.cloud_cover,
      isDay: data.current.is_day === 1,
    };
  } else {
    current = {
      temperature: data.hourly.temperature_2m[0],
      apparentTemperature: data.hourly.apparent_temperature[0],
      humidity: data.hourly.relative_humidity_2m[0],
      windSpeed: data.hourly.wind_speed_10m[0],
      windDirection: data.hourly.wind_direction_10m[0],
      weatherCode: data.hourly.weather_code[0],
      precipitation: data.hourly.precipitation[0],
      cloudCover: data.hourly.cloud_cover[0],
      isDay: true,
    };
  }

  const now = new Date();
  const allHourly: HourlyForecast[] = data.hourly.time.map((time, i) => ({
    time,
    temperature: data.hourly.temperature_2m[i],
    precipitation: data.hourly.precipitation[i],
    precipitationProbability: data.hourly.precipitation_probability[i],
    weatherCode: data.hourly.weather_code[i],
    windSpeed: data.hourly.wind_speed_10m[i],
    windDirection: data.hourly.wind_direction_10m[i],
  }));

  const next24Hours = allHourly
    .filter(h => new Date(h.time) >= now)
    .slice(0, 24);

  const daily: DailyForecast[] = data.daily.time.map((date, i) => ({
    date,
    temperatureMax: data.daily.temperature_2m_max[i],
    temperatureMin: data.daily.temperature_2m_min[i],
    precipitationSum: data.daily.precipitation_sum[i],
    precipitationProbabilityMax: data.daily.precipitation_probability_max[i],
    weatherCode: data.daily.weather_code[i],
    windSpeedMax: data.daily.wind_speed_10m_max[i],
    sunrise: data.daily.sunrise[i],
    sunset: data.daily.sunset[i],
  }));

  return {
    location,
    current,
    hourly: next24Hours,
    daily,
    fetchedAt: new Date(),
  };
}

export async function fetchRaceTimeWeather(
  latitude: number,
  longitude: number,
  raceDateTime: Date
): Promise<RaceTimeWeather | null> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'relative_humidity_2m',
      'cloud_cover'
    ].join(','),
    timezone: 'auto',
    forecast_days: '7'
  });

  const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  const raceHour = raceDateTime.getHours();
  const raceDateStr = raceDateTime.toISOString().split('T')[0];
  
  const matchingIndex = data.hourly.time.findIndex(time => {
    const hourDate = new Date(time);
    const hourDateStr = time.split('T')[0];
    return hourDateStr === raceDateStr && hourDate.getHours() === raceHour;
  });

  if (matchingIndex === -1) {
    return null;
  }

  return {
    time: new Date(data.hourly.time[matchingIndex]),
    temperature: data.hourly.temperature_2m[matchingIndex],
    apparentTemperature: data.hourly.apparent_temperature[matchingIndex],
    humidity: data.hourly.relative_humidity_2m[matchingIndex],
    windSpeed: data.hourly.wind_speed_10m[matchingIndex],
    windDirection: data.hourly.wind_direction_10m[matchingIndex],
    weatherCode: data.hourly.weather_code[matchingIndex],
    precipitation: data.hourly.precipitation[matchingIndex],
    precipitationProbability: data.hourly.precipitation_probability[matchingIndex],
    cloudCover: data.hourly.cloud_cover[matchingIndex],
  };
}

export async function fetchWeatherForRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  isLoop: boolean,
  raceDateTime?: Date
): Promise<WeatherData> {
  const locations: WeatherLocation[] = isLoop
    ? [{ latitude: startLat, longitude: startLon, label: 'Start/Finish' }]
    : [
        { latitude: startLat, longitude: startLon, label: 'Start' },
        { latitude: endLat, longitude: endLon, label: 'Finish' },
      ];

  const weatherPromises = locations.map(loc => fetchLocationWeather(loc, raceDateTime));
  const locationWeathers = await Promise.all(weatherPromises);

  return {
    locations: locationWeathers,
    isLoop,
  };
}

interface RoutePoint {
  latitude: number;
  longitude: number;
  distance: number;
}

const WIND_SAMPLE_INTERVAL_METERS = 5000;

export function sampleRoutePoints(
  points: Array<{ latitude: number; longitude: number; distance: number }>
): RoutePoint[] {
  if (points.length === 0) return [];

  const sampled: RoutePoint[] = [points[0]];
  let lastSampledDistance = 0;

  for (const point of points) {
    if (point.distance - lastSampledDistance >= WIND_SAMPLE_INTERVAL_METERS) {
      sampled.push(point);
      lastSampledDistance = point.distance;
    }
  }

  const lastPoint = points[points.length - 1];
  if (sampled[sampled.length - 1].distance !== lastPoint.distance) {
    sampled.push(lastPoint);
  }

  return sampled;
}

interface OpenMeteoHourlyWindResponse {
  hourly: {
    time: string[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    wind_direction_10m: number[];
    temperature_2m: number[];
    weather_code: number[];
  };
}

async function fetchWindForPoint(
  point: RoutePoint,
  raceDateTime: Date
): Promise<RouteWindPoint | null> {
  const params = new URLSearchParams({
    latitude: point.latitude.toString(),
    longitude: point.longitude.toString(),
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,weather_code',
    timezone: 'auto',
    forecast_days: '7'
  });

  try {
    const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);
    if (!response.ok) return null;

    const data: OpenMeteoHourlyWindResponse = await response.json();

    const raceHour = raceDateTime.getHours();
    const raceDateStr = raceDateTime.toISOString().split('T')[0];

    const matchingIndex = data.hourly.time.findIndex(time => {
      const hourDate = new Date(time);
      const hourDateStr = time.split('T')[0];
      return hourDateStr === raceDateStr && hourDate.getHours() === raceHour;
    });

    if (matchingIndex === -1) return null;

    return {
      latitude: point.latitude,
      longitude: point.longitude,
      distance: point.distance,
      windSpeed: data.hourly.wind_speed_10m[matchingIndex],
      windGust: data.hourly.wind_gusts_10m[matchingIndex],
      windDirection: data.hourly.wind_direction_10m[matchingIndex],
      temperature: data.hourly.temperature_2m[matchingIndex],
      weatherCode: data.hourly.weather_code[matchingIndex],
    };
  } catch {
    return null;
  }
}

export async function fetchRouteWindData(
  points: Array<{ latitude: number; longitude: number; distance: number }>,
  raceDateTime: Date
): Promise<RouteWindPoint[]> {
  const sampledPoints = sampleRoutePoints(points);

  const windPromises = sampledPoints.map(point => fetchWindForPoint(point, raceDateTime));
  const results = await Promise.all(windPromises);

  return results.filter((r): r is RouteWindPoint => r !== null);
}
