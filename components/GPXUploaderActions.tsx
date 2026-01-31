"use client";

import { useCallback } from "react";
import { useGPX } from "@/context/GPXContext";

export default function GPXUploaderActions() {
  const { processGPX, loading, savedRoutes, loadRoute } = useGPX();

  const handleLoadSavedRoute = useCallback(() => {
    if (savedRoutes.length > 0) {
      loadRoute(savedRoutes[savedRoutes.length - 1].id);
    }
  }, [savedRoutes, loadRoute]);

  const handleSampleLoad = useCallback(async () => {
    try {
      const res = await fetch("/Oslo.gpx");
      if (!res.ok) throw new Error("Failed to fetch sample GPX");
      const text = await res.text();
      const blob = new Blob([text], { type: "application/gpx+xml" });
      const file = new File([blob], "Oslo.gpx", {
        type: "application/gpx+xml",
      });
      await processGPX(file);
    } catch {
      const fallback = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="GPX Analyzer Demo">\n  <trk>\n    <name>Sample Cycling Route</name>\n    <trkseg>\n      <trkpt lat="37.8000" lon="-122.4200"><ele>10</ele></trkpt>\n      <trkpt lat="37.8010" lon="-122.4190"><ele>15</ele></trkpt>\n      <trkpt lat="37.8020" lon="-122.4180"><ele>25</ele></trkpt>\n      <trkpt lat="37.8030" lon="-122.4170"><ele>40</ele></trkpt>\n      <trkpt lat="37.8040" lon="-122.4160"><ele>60</ele></trkpt>\n      <trkpt lat="37.8050" lon="-122.4150"><ele>85</ele></trkpt>\n    </trkseg>\n  </trk>\n</gpx>`;
      const blob = new Blob([fallback], { type: "application/gpx+xml" });
      const file = new File([blob], "sample-route-fallback.gpx", {
        type: "application/gpx+xml",
      });
      await processGPX(file);
    }
  }, [processGPX]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-3 mt-4 max-[390px]:mt-3">
        {savedRoutes.length > 0 && (
          <button
            onClick={handleLoadSavedRoute}
            disabled={loading}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-white dark:text-zinc-900
                       bg-sky-600 dark:bg-sky-400 hover:bg-sky-700 dark:hover:bg-sky-300
                       rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            View Saved Routes ({savedRoutes.length})
          </button>
        )}
        {!savedRoutes.some(r => r.name.toLowerCase() === "oslo") && (
          <button
            onClick={handleSampleLoad}
            disabled={loading}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-sky-600 dark:text-sky-400 
                       hover:text-sky-700 dark:hover:text-sky-300
                       border border-sky-600 dark:border-sky-500 
                       hover:border-sky-700 dark:hover:border-sky-400 rounded-lg
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                       bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm"
          >
            Load Sample Route
          </button>
        )}
      </div>
    </div>
  );
}
