"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useGPX, GPXProvider } from "@/context/GPXContext";
import GPXUploader from "@/components/GPXUploader";
import MapView from "@/components/MapView";
import ElevationChart from "@/components/ElevationChart";
import StatsPanel from "@/components/StatsPanel";
import ClimbsList from "@/components/ClimbsList";
import WeatherPanel from "@/components/WeatherPanel";
import RouteSelector from "@/components/RouteSelector";
import ThemeMenu from "@/components/ThemeMenu";

function GPXAnalyzerContent() {
  const { data, loading, error, clearData } = useGPX();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compactMenuOpen, setCompactMenuOpen] = useState(false);
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false);
  const [pwaTipsOpen, setPwaTipsOpen] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const sheetStartYRef = useRef<number | null>(null);
  const sheetOffsetRef = useRef(0);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setChartDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [data]);

  // Close sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
      if (window.innerWidth > 390) {
        setCompactMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (dataSourcesOpen) return;
    setSheetOffset(0);
    sheetOffsetRef.current = 0;
  }, [dataSourcesOpen]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800 dark:border-zinc-700 dark:border-t-zinc-200"></div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
            Processing GPX file...
          </p>
        </div>
      </div>
    );
  }

  // No data state - show uploader
  if (!data) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-zinc-50 to-sky-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-sky-950/30" />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-sky-400/20 dark:bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-sky-400/20 dark:bg-sky-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-2xl px-4 sm:px-8">
          <div className="mb-1 sm:mb-2 text-center">
            <div className="mb-3 sm:mb-4 flex justify-center">
              <Image
                src="/logo.png"
                alt="VeloWindLab"
                width={160}
                height={160}
                className="h-24 sm:h-40 w-auto drop-shadow-md rounded-2xl max-[390px]:h-20"
                priority
              />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 sm:mb-2 max-[390px]:text-xl">
              Velo<span className="text-sky-500">Wind</span>Lab
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-[390px]:text-sm">
              Upload your cycling route to generate a detailed, interactive
              elevation profile, toggle laps, detect and categorize climbs,
              compute ride statistics such as distance, time, total
              ascent/descent, gradient segments, and get accurate weather and
              wind forecasts for your planned rides.
            </p>
          </div>
          <GPXUploader />
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <footer className="absolute bottom-4 sm:bottom-6 left-0 right-0 z-10 text-center text-[11px] text-zinc-500 dark:text-zinc-400 px-4">
          <div className="hidden min-[901px]:flex flex-wrap items-center justify-center gap-x-2 gap-y-1 leading-tight">
            <span>
              Wind &amp; weather by{" "}
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
            </span>
            <span
              aria-hidden="true"
              className="text-zinc-400/60 hidden sm:inline"
            >
              •
            </span>
            <span>
              Maps by{" "}
              <a
                href="https://openfreemap.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-sky-400 hover:underline"
              >
                OpenFreeMap
              </a>
            </span>
            <span
              aria-hidden="true"
              className="text-zinc-400/60 hidden sm:inline"
            >
              •
            </span>
            <span>
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
          <div className="flex min-[901px]:hidden items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDataSourcesOpen(true)}
                  className="rounded-full border border-zinc-300/70 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/70 px-3 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 backdrop-blur"
                >
                  Data sources
                </button>
                <button
                  onClick={() => setPwaTipsOpen(true)}
                  className="rounded-full border border-zinc-300/70 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/70 px-3 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 backdrop-blur"
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
          </div>
        </footer>

        <div className="fixed inset-0 z-50 max-[900px]:block hidden pointer-events-none">
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
                Data sources
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
          </div>
        </div>

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
                  <li>Choose “Add to Home Screen”.</li>
                  <li>Confirm by tapping “Add”.</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  Android (Chrome)
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the menu (⋮).</li>
                  <li>Select “Add to Home screen”.</li>
                  <li>Confirm by tapping “Add”.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main layout with data
  return (
    <div className="flex h-screen w-full flex-col bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 sm:px-6 py-3 sm:py-4 shrink-0 gap-2">
        <button
          onClick={clearData}
          className="shrink-0 transition-opacity hover:opacity-70 cursor-pointer"
          title="Back to upload screen"
        >
          <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
            Velo<span className="text-sky-500">Wind</span>Lab
          </h1>
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <RouteSelector />
        </div>

        <div className="flex items-center gap-2 shrink-0 relative">
          <div className="max-[390px]:hidden flex items-center gap-2">
            <ThemeMenu />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer h-10 w-10 flex items-center justify-center"
              aria-label="Toggle stats panel"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </button>
          </div>
          <div className="hidden max-[390px]:block relative">
            <button
              onClick={() => setCompactMenuOpen(!compactMenuOpen)}
              className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
              aria-label="Open menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            {compactMenuOpen && (
              <>
                <button
                  className="fixed inset-0 z-40"
                  aria-label="Close menu"
                  onClick={() => setCompactMenuOpen(false)}
                />
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg p-2">
                  <div className="flex flex-col items-center gap-2">
                    <ThemeMenu compact />
                    <button
                      onClick={() => {
                        setSidebarOpen(!sidebarOpen);
                        setCompactMenuOpen(false);
                      }}
                      className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer h-10 w-10 flex items-center justify-center"
                      aria-label="Toggle stats panel"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={clearData}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 whitespace-nowrap cursor-pointer"
          >
            Upload New
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Map + Chart */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Map - responsive height */}
          <div className="h-[60%] sm:h-[55%] lg:h-[60%] border-b border-zinc-200 dark:border-zinc-800">
            <MapView />
          </div>

          {/* Elevation Chart - responsive height */}
          <div
            ref={chartContainerRef}
            className="h-[40%] sm:h-[45%] lg:h-[40%] relative min-h-[150px]"
          >
            {chartDimensions.width > 0 && chartDimensions.height > 0 && (
              <ElevationChart
                width={chartDimensions.width}
                height={chartDimensions.height}
              />
            )}
          </div>
        </div>

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Right sidebar: Stats + Climbs - responsive */}
        <aside
          className={`
            fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto
            w-[320px] sm:w-[360px] lg:w-[380px] 
            border-l border-zinc-200 dark:border-zinc-800 
            bg-white dark:bg-zinc-950 
            flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
            lg:transform-none
          `}
        >
          {/* Mobile close button */}
          <div className="lg:hidden flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 shrink-0">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Route Stats
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Close panel"
            >
              <svg
                className="h-5 w-5"
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <StatsPanel />
            <ClimbsList />
            <WeatherPanel />
          </div>
          <footer className="shrink-0 px-4 sm:px-6 py-2 border-t border-zinc-100 dark:border-zinc-800 text-center text-sm text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950">
            Made with &lt;3 by{" "}
            <a
              href="https://github.com/sindrehaugsvaer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline"
            >
              Sindre
            </a>
          </footer>
        </aside>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <GPXProvider>
      <GPXAnalyzerContent />
    </GPXProvider>
  );
}
