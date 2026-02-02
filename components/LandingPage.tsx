"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import GPXUploader from "@/components/GPXUploader";
import GPXUploaderActions from "@/components/GPXUploaderActions";
import DataSourcesBottomSheet from "@/components/bottom-sheets/DataSourcesBottomSheet";
import PwaTipsBottomSheet from "@/components/bottom-sheets/PwaTipsBottomSheet";
import StravaRoutesBottomSheet from "@/components/bottom-sheets/StravaRoutesBottomSheet";
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
  const [importingRouteId, setImportingRouteId] = useState<string | null>(null);
  const [hasMoreRoutes, setHasMoreRoutes] = useState(false);
  const [loadingMoreRoutes, setLoadingMoreRoutes] = useState(false);
  const loadMoreRoutesRef = useRef<(() => Promise<void>) | null>(null);
  const refreshRoutesRef = useRef<(() => Promise<void>) | null>(null);
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

  const handleLoadMoreRoutes = useCallback(() => {
    if (hasMoreRoutes && !loadingMoreRoutes && loadMoreRoutesRef.current) {
      setLoadingMoreRoutes(true);
      loadMoreRoutesRef.current();
    }
  }, [hasMoreRoutes, loadingMoreRoutes]);

  const handleImportRoute = useCallback(
    async (route: StravaRoute) => {
      setImportError(null);
      setImportingRouteId(route.id);
      try {
        const result = await importRoute(route);
        if (!result.success) {
          setImportError(result.error || "Failed to import route");
        } else {
          setStravaRoutesOpen(false);
        }
      } finally {
        setImportingRouteId(null);
      }
    },
    [importRoute],
  );

  const handleCloseStravaRoutes = useCallback(() => {
    setStravaRoutesOpen(false);
    setImportingRouteId(null);
  }, []);

  return (
    <div className="relative flex min-h-screen min-h-[100svh] w-full flex-col overflow-hidden">
      <div className="absolute inset-0 landing-bg" />
      <div className="absolute inset-0 landing-noise" />

      {/* Header - sticky top */}
      <header className="relative z-10 shrink-0 pt-4 pb-2 px-4 sm:px-8 text-center">
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
          <div className="grid w-full grid-cols-1 gap-1 sm:gap-3 lg:grid-cols-2 lg:items-start">
            <div className="flex w-full justify-center">
              <div className="w-full max-w-[350px] sm:max-w-[400px] lg:max-w-[520px]">
                <GPXUploader />
              </div>
            </div>
            <div className="flex w-full justify-center">
              <div className="w-full max-w-[350px] sm:max-w-[400px] lg:max-w-[520px]">
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

      <DataSourcesBottomSheet
        open={dataSourcesOpen}
        onClose={() => setDataSourcesOpen(false)}
      />
      <PwaTipsBottomSheet
        open={pwaTipsOpen}
        onClose={() => setPwaTipsOpen(false)}
      />
      <StravaRoutesBottomSheet
        open={stravaRoutesOpen}
        routes={stravaRoutes}
        importLoading={importLoading}
        importingRouteId={importingRouteId}
        importError={importError}
        loadingMoreRoutes={loadingMoreRoutes}
        hasMoreRoutes={hasMoreRoutes}
        refreshingRoutes={refreshingRoutes}
        onClose={handleCloseStravaRoutes}
        onRefresh={handleRefreshRoutes}
        onImportRoute={handleImportRoute}
        onLoadMore={handleLoadMoreRoutes}
      />
    </div>
  );
}
