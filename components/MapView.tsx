'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { useGPX } from '@/context/GPXContext';
import type { RouteWindPoint } from '@/lib/weather/types';
import 'maplibre-gl/dist/maplibre-gl.css';

function getGradeColor(grade: number): string {
  if (grade < -5) return '#166534';
  if (grade < -1) return '#22c55e';
  if (grade < 3) return '#9ca3af';
  if (grade < 6) return '#eab308';
  if (grade < 10) return '#f97316';
  return '#ef4444';
}

export default function MapView() {
  const { data, hoverState, routeWindData } = useGPX();
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 3
  });

  const fitToBounds = useCallback(() => {
    if (!data || !mapRef.current || data.simplifiedPoints.length === 0) return;
    
    const lons = data.simplifiedPoints.map(p => p.lon);
    const lats = data.simplifiedPoints.map(p => p.lat);
    
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    mapRef.current.fitBounds(
      [[minLon, minLat], [maxLon, maxLat]],
      { padding: 50, duration: 1000 }
    );
  }, [data]);

  useEffect(() => {
    if (mapLoaded && data) {
      fitToBounds();
    }
  }, [mapLoaded, data, fitToBounds]);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const gradientSegments = data ? data.points.slice(0, -1).map((point, i) => {
    const nextPoint = data.points[i + 1];
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [point.longitude, point.latitude],
          [nextPoint.longitude, nextPoint.latitude]
        ]
      },
      properties: {
        color: getGradeColor(point.grade)
      }
    };
  }) : [];

  const gradientGeoJson = {
    type: 'FeatureCollection' as const,
    features: gradientSegments
  };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={handleMapLoad}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        style={{ width: '100%', height: '100%' }}
        attributionControl={{ compact: true }}
      >
        {data && gradientSegments.length > 0 && (
          <Source id="route-gradient" type="geojson" data={gradientGeoJson}>
            <Layer
              id="route-gradient-line"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 4,
                'line-opacity': 0.9
              }}
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
            />
          </Source>
        )}

        {routeWindData.map((windPoint, index) => (
          <WindArrowMarker key={`wind-${index}`} windPoint={windPoint} />
        ))}

        {hoverState.point && (
          <Marker
            longitude={hoverState.point.longitude}
            latitude={hoverState.point.latitude}
            anchor="bottom"
          >
            <div className="relative">
              <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                {hoverState.point.elevation !== null 
                  ? `${Math.round(hoverState.point.elevation)}m`
                  : 'No elevation'
                }
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {routeWindData.length > 0 && <WindLegend windData={routeWindData} />}
    </div>
  );
}

function WindArrowMarker({ windPoint }: { windPoint: RouteWindPoint }) {
  return (
    <Marker
      longitude={windPoint.longitude}
      latitude={windPoint.latitude}
      anchor="center"
    >
      <div 
        className="flex items-center justify-center"
        style={{ 
          transform: `rotate(${windPoint.windDirection + 180}deg)`,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24">
          <path
            d="M12 2L8 12h3v8h2v-8h3L12 2z"
            fill="#1d4ed8"
            stroke="white"
            strokeWidth="1"
          />
        </svg>
      </div>
    </Marker>
  );
}

function WindLegend({ windData }: { windData: RouteWindPoint[] }) {
  const avgSpeed = windData.reduce((sum, w) => sum + w.windSpeed, 0) / windData.length;
  const maxGust = Math.max(...windData.map(w => w.windGust));

  return (
    <div className="absolute top-3 right-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-lg shadow-lg p-3 pointer-events-auto">
      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">
        🏁 Race Wind
      </div>
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex justify-between gap-4">
          <span>Avg Speed:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(avgSpeed)} km/h</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Max Gust:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(maxGust)} km/h</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Samples:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{windData.length}</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
        <svg width="12" height="12" viewBox="0 0 24 24" className="text-blue-600">
          <path d="M12 2L8 12h3v8h2v-8h3L12 2z" fill="currentColor" />
        </svg>
        <span>Arrow = wind direction</span>
      </div>
    </div>
  );
}
