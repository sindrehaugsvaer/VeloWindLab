"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import GPXUploader from "@/components/GPXUploader";
import GPXUploaderActions from "@/components/GPXUploaderActions";
import StravaConnect, {
  StravaRoute,
  useStravaImport,
} from "@/components/StravaConnect";

interface LandingPageProps {
  error: string | null;
}

export default function LandingPage({ error }: LandingPageProps) {
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false);
  const [pwaTipsOpen, setPwaTipsOpen] = useState(false);
  const [stravaRoutesOpen, setStravaRoutesOpen] = useState(false);
  const [stravaRoutes, setStravaRoutes] = useState<StravaRoute[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [hasMoreRoutes, setHasMoreRoutes] = useState(false);
  const [loadingMoreRoutes, setLoadingMoreRoutes] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const sheetStartYRef = useRef<number | null>(null);
  const sheetOffsetRef = useRef(0);
  const loadMoreRoutesRef = useRef<(() => Promise<void>) | null>(null);
  const refreshRoutesRef = useRef<(() => Promise<void>) | null>(null);
  const routesScrollRef = useRef<HTMLDivElement | null>(null);
  const [refreshingRoutes, setRefreshingRoutes] = useState(false);

  const { importRoute, loading: importLoading } = useStravaImport();

  const handleRoutesLoaded = useCallback(
    (routes: StravaRoute[], hasMore: boolean) => {
      setStravaRoutes(routes);
      setHasMoreRoutes(hasMore);
      setStravaRoutesOpen(true);
      setImportError(null);
    },
    [],
  );

  const handleMoreRoutesLoaded = useCallback(
    (routes: StravaRoute[], hasMore: boolean) => {
      setStravaRoutes((prev) => [...prev, ...routes]);
      setHasMoreRoutes(hasMore);
      setLoadingMoreRoutes(false);
    },
    [],
  );

  const handleLoadMoreReady = useCallback((loadMore: () => Promise<void>) => {
    loadMoreRoutesRef.current = loadMore;
  }, []);

  const handleRefreshReady = useCallback((refresh: () => Promise<void>) => {
    refreshRoutesRef.current = refresh;
  }, []);

  const handleRefreshRoutes = useCallback(async () => {
    if (refreshRoutesRef.current && !refreshingRoutes) {
      setRefreshingRoutes(true);
      await refreshRoutesRef.current();
      setRefreshingRoutes(false);
    }
  }, [refreshingRoutes]);

  const handleRoutesScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const nearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < 100;
      if (
        nearBottom &&
        hasMoreRoutes &&
        !loadingMoreRoutes &&
        loadMoreRoutesRef.current
      ) {
        setLoadingMoreRoutes(true);
        loadMoreRoutesRef.current();
      }
    },
    [hasMoreRoutes, loadingMoreRoutes],
  );

  const handleImportRoute = useCallback(
    async (route: StravaRoute) => {
      setImportError(null);
      const result = await importRoute(route);
      if (!result.success) {
        setImportError(result.error || "Failed to import route");
      } else {
        setStravaRoutesOpen(false);
      }
    },
    [importRoute],
  );

  const formatDistance = useCallback((meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  }, []);

  // Decode Google polyline encoding to lat/lng array
  const decodePolyline = useCallback((encoded: string): [number, number][] => {
    const points: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      lat += result & 1 ? ~(result >> 1) : result >> 1;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      lng += result & 1 ? ~(result >> 1) : result >> 1;

      points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
  }, []);

  // Convert decoded polyline to SVG path
  const polylineToSvgPath = useCallback(
    (encoded: string, width: number, height: number): string => {
      const points = decodePolyline(encoded);
      if (points.length < 2) return "";

      const lats = points.map((p) => p[0]);
      const lngs = points.map((p) => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const padding = 2;
      const scaleX = (width - padding * 2) / (maxLng - minLng || 1);
      const scaleY = (height - padding * 2) / (maxLat - minLat || 1);
      const scale = Math.min(scaleX, scaleY);

      const offsetX = (width - (maxLng - minLng) * scale) / 2;
      const offsetY = (height - (maxLat - minLat) * scale) / 2;

      const svgPoints = points.map(([lat, lng]) => {
        const x = (lng - minLng) * scale + offsetX;
        const y = height - ((lat - minLat) * scale + offsetY);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      return `M${svgPoints.join("L")}`;
    },
    [decodePolyline],
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-zinc-50 to-sky-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-sky-950/30" />
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-sky-400/20 dark:bg-sky-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-sky-400/20 dark:bg-sky-500/10 rounded-full blur-3xl" />

      {/* Header - sticky top */}
      <header className="relative z-10 shrink-0 pt-4 sm:pt-6 pb-2 sm:pb-4 px-4 sm:px-8 text-center">
        <div className="mb-1.5 sm:mb-3 flex justify-center">
          <Image
            src="/logo.png"
            alt="VeloWindLab"
            width={160}
            height={160}
            className="h-20 sm:h-28 lg:h-36 w-auto drop-shadow-md rounded-2xl"
            priority
          />
        </div>
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-0.5 sm:mb-1">
          Velo<span className="text-sky-500">Wind</span>Lab
        </h1>
        <p className="sm:text-base lg:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Upload your cycling route to generate a detailed, interactive
          elevation profile, toggle laps, detect and categorize climbs, compute
          ride statistics such as distance, time, total ascent/descent, gradient
          segments, and get accurate weather and wind forecasts for your planned
          rides.
        </p>
      </header>

      {/* Main content - centered */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-2 sm:py-4">
        <div className="w-full max-w-6xl">
          <div className="grid w-full grid-cols-1 gap-1.5 sm:gap-3 lg:grid-cols-2 lg:items-start">
            <div className="flex w-full justify-center">
              <div className="w-full max-w-[240px] sm:max-w-[400px] lg:max-w-[520px]">
                <GPXUploader />
              </div>
            </div>
            <div className="flex w-full justify-center">
              <div className="w-full max-w-[240px] sm:max-w-[400px] lg:max-w-[520px]">
                <StravaConnect
                  onRoutesLoaded={handleRoutesLoaded}
                  onMoreRoutesLoaded={handleMoreRoutesLoaded}
                  onLoadMoreReady={handleLoadMoreReady}
                  onRefreshReady={handleRefreshReady}
                />
              </div>
            </div>
          </div>
          <div className="mt-2 flex w-full flex-col items-center gap-1 sm:gap-2">
            <div className="w-full max-w-[520px]">
              <GPXUploaderActions />
            </div>
            <p className="hidden min-[901px]:block text-[13px] sm:text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed sm:leading-normal max-w-lg">
              All processing runs locally in your browser for privacy and
              responsiveness. Use the built-in sample route to explore features
              like climb detection, weather forecasts, and interactive elevation
              profiles.
            </p>
          </div>
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Footer - sticky bottom */}
      <footer className="relative z-10 shrink-0 pb-3 sm:pb-4 pt-2 px-4 text-center text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDataSourcesOpen(true)}
              className="rounded-full border border-zinc-300/70 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/70 px-3 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 backdrop-blur"
            >
              Data & privacy
            </button>
            <button
              onClick={() => setPwaTipsOpen(true)}
              className="max-[900px]:block hidden rounded-full border border-zinc-300/70 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/70 px-3 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 backdrop-blur"
            >
              Add to home screen
            </button>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Made with &lt;3 by{" "}
            <a
              href="https://github.com/sindrehaugsvaer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline"
            >
              Sindre
            </a>
          </span>
        </div>
      </footer>

      {/* Data sources bottom sheet */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${dataSourcesOpen ? "opacity-100" : "opacity-0"}`}
          style={{
            opacity: dataSourcesOpen ? Math.max(0, 1 - sheetOffset / 60) : 0,
          }}
        />
        <button
          className={`absolute inset-0 ${dataSourcesOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-label="Close data sources"
          onClick={() => setDataSourcesOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 mx-3 rounded-t-2xl rounded-b-none bg-white dark:bg-zinc-950 p-4 shadow-2xl border-t border-x border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-out ${dataSourcesOpen ? "translate-y-0" : "translate-y-full"} pointer-events-auto`}
          style={{
            transform: `translateY(${dataSourcesOpen ? sheetOffset : 100}%)`,
          }}
          onTouchStart={(e) => {
            if (!dataSourcesOpen) return;
            sheetStartYRef.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchMove={(e) => {
            if (!dataSourcesOpen || sheetStartYRef.current === null) return;
            const currentY = e.touches[0]?.clientY ?? sheetStartYRef.current;
            const delta = Math.max(0, currentY - sheetStartYRef.current);
            const percent = Math.min(60, (delta / window.innerHeight) * 100);
            sheetOffsetRef.current = percent;
            setSheetOffset(percent);
          }}
          onTouchEnd={() => {
            if (!dataSourcesOpen) return;
            if (sheetOffsetRef.current > 20) {
              setDataSourcesOpen(false);
            } else {
              setSheetOffset(0);
              sheetOffsetRef.current = 0;
            }
          }}
        >
          <div className="mx-auto mb-0.5 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Data sources & processing
            </h3>
          </div>
          <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
            <p>
              Weather & Wind:{" "}
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
              )
            </p>
            <p>
              Maps:{" "}
              <a
                href="https://openfreemap.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-sky-400 hover:underline"
              >
                OpenFreeMap
              </a>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              All processing runs locally in your browser for privacy and
              responsiveness. Use the built-in sample route to explore features
              like climb detection, weather forecasts, and interactive elevation
              profiles.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Strava data use
            </h4>
            <ul className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed space-y-1.5">
              <li>
                VeloWindLab connects to your Strava account only to access your
                saved routes — never your activities or profile.
              </li>
              <li>You choose whether to include private routes.</li>
              <li>
                Nothing is stored or shared — all data stays in your browser.
              </li>
              <li>
                You can disconnect anytime via your Strava settings or by
                clearing local storage.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* PWA tips bottom sheet */}
      <div className="fixed inset-0 z-50 max-[900px]:block hidden pointer-events-none">
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${pwaTipsOpen ? "opacity-100" : "opacity-0"}`}
        />
        <button
          className={`absolute inset-0 ${pwaTipsOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-label="Close add to home screen"
          onClick={() => setPwaTipsOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 mx-3 rounded-t-2xl rounded-b-none bg-white dark:bg-zinc-950 p-4 shadow-2xl border-t border-x border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-out ${pwaTipsOpen ? "translate-y-0" : "translate-y-full"} pointer-events-auto`}
        >
          <div className="mx-auto mb-0.5 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Add to Home Screen
          </h3>
          <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                iOS (Safari)
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap the Share button.</li>
                <li>Choose &quot;Add to Home Screen&quot;.</li>
                <li>Confirm by tapping &quot;Add&quot;.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                Android (Chrome)
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap the menu (⋮).</li>
                <li>Select &quot;Add to Home screen&quot;.</li>
                <li>Confirm by tapping &quot;Add&quot;.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Strava routes bottom sheet */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${stravaRoutesOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setStravaRoutesOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 mx-3 rounded-t-2xl rounded-b-none bg-white dark:bg-zinc-950 shadow-2xl border-t border-x border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-out ${stravaRoutesOpen ? "translate-y-0" : "translate-y-full"} pointer-events-auto max-h-[70vh] flex flex-col`}
        >
          <div className="p-4 pb-2 shrink-0">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Select a route to import
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshRoutes}
                  disabled={refreshingRoutes}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50"
                  title="Refresh routes"
                >
                  <svg
                    className={`w-5 h-5 ${refreshingRoutes ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setStravaRoutesOpen(false)}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {importError && (
              <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-200">
                {importError}
              </div>
            )}
          </div>
          <div
            ref={routesScrollRef}
            className="flex-1 overflow-y-auto px-4 pb-4"
            onScroll={handleRoutesScroll}
          >
            <div className="space-y-2">
              {stravaRoutes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5"
                >
                  {route.polyline && (
                    <div className="shrink-0 w-12 h-12 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                      <svg
                        viewBox="0 0 48 48"
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <path
                          d={polylineToSvgPath(route.polyline, 48, 48)}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-sky-500 dark:text-sky-400"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {route.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDistance(route.distance)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleImportRoute(route)}
                    disabled={importLoading}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-lg hover:border-sky-300 dark:hover:border-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importLoading ? "..." : "Import"}
                  </button>
                </div>
              ))}
              {loadingMoreRoutes && (
                <div className="flex justify-center py-3">
                  <svg
                    className="animate-spin h-5 w-5 text-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              )}
              {stravaRoutes.length === 0 && !loadingMoreRoutes && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                  No routes found in your Strava account.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
