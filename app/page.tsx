'use client';

import { useRef, useState, useEffect } from 'react';
import { useGPX, GPXProvider } from '@/context/GPXContext';
import GPXUploader from '@/components/GPXUploader';
import MapView from '@/components/MapView';
import ElevationChart from '@/components/ElevationChart';
import StatsPanel from '@/components/StatsPanel';
import ClimbsList from '@/components/ClimbsList';
import WeatherPanel from '@/components/WeatherPanel';

function GPXAnalyzerContent() {
  const { data, loading, error, clearData } = useGPX();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800 dark:border-zinc-700 dark:border-t-zinc-200"></div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">Processing GPX file...</p>
        </div>
      </div>
    );
  }

  // No data state - show uploader
  if (!data) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
        <div className="w-full max-w-2xl px-4 sm:px-8">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2 sm:mb-3">
              VeloWindLab
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
              Upload your cycling route to analyze elevation, climbs, and statistics
            </p>
          </div>
          <GPXUploader />
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main layout with data
  return (
    <div className="flex h-screen w-full flex-col bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
            VeloWindLab
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 truncate">
            {data.metadata.name || data.fileName.replace(/\.gpx$/i, '')}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
            aria-label="Toggle stats panel"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={clearData}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 whitespace-nowrap"
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
          <div className="h-[50%] sm:h-[55%] lg:h-[60%] border-b border-zinc-200 dark:border-zinc-800">
            <MapView />
          </div>

          {/* Elevation Chart - responsive height */}
          <div ref={chartContainerRef} className="h-[50%] sm:h-[45%] lg:h-[40%] relative min-h-[150px]">
            {chartDimensions.width > 0 && chartDimensions.height > 0 && (
              <ElevationChart width={chartDimensions.width} height={chartDimensions.height} />
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
            overflow-y-auto
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            lg:transform-none
          `}
        >
          {/* Mobile close button */}
          <div className="lg:hidden flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Route Stats</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Close panel"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <StatsPanel />
            <ClimbsList />
            <WeatherPanel />
          </div>
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
