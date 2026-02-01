"use client";

import { useGPX } from "@/context/GPXContext";
import Accordion from "./Accordion";

export default function StatsPanel() {
  const { data, userSpeed, setUserSpeed, lapCount, setLapCount } = useGPX();

  if (!data) {
    return null;
  }

  const { stats, isLoop } = data;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const totalDistance = stats.totalDistance * lapCount;
  const totalElevationGain = stats.totalElevationGain * lapCount;
  const totalElevationLoss = stats.totalElevationLoss * lapCount;
  const estimatedTimeSeconds = (totalDistance / 1000 / userSpeed) * 3600;

  return (
    <Accordion title="Route Statistics">
      {isLoop && (
        <div className="pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Number of Laps
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLapCount(lapCount - 1)}
              disabled={lapCount <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max="100"
              value={lapCount}
              onChange={(e) => setLapCount(Math.max(1, Number(e.target.value)))}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setLapCount(lapCount + 1)}
              disabled={lapCount >= 100}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <StatItem
          label="Distance"
          value={`${(totalDistance / 1000).toFixed(2)} km`}
        />

        {data.hasElevation && (
          <>
            <StatItem
              label="Elevation Gain"
              value={`${Math.round(totalElevationGain)} m`}
            />
            <StatItem
              label="Elevation Loss"
              value={`${Math.round(totalElevationLoss)} m`}
            />
            <StatItem
              label="Max Elevation"
              value={`${Math.round(stats.maxElevation)} m`}
            />
            <StatItem
              label="Min Elevation"
              value={`${Math.round(stats.minElevation)} m`}
            />
          </>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Time & Speed
        </h3>
        <div className="mb-4">
          <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Average Speed (km/h)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={userSpeed}
            onChange={(e) => setUserSpeed(Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatItem
            label="Estimated Time"
            value={formatTime(estimatedTimeSeconds)}
          />
          <StatItem label="Avg Speed" value={`${userSpeed} km/h`} />
        </div>
      </div>
    </Accordion>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
        {value}
      </div>
    </div>
  );
}
