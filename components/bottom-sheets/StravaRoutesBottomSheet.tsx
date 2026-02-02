"use client";

import { useCallback, useRef, useState } from "react";
import type { StravaRoute } from "@/components/StravaConnect";
import { formatRouteDistanceKm, polylineToSvgPath } from "@/lib/stravaRoutes";

interface StravaRoutesBottomSheetProps {
  open: boolean;
  routes: StravaRoute[];
  importLoading: boolean;
  importingRouteId: string | null;
  importError: string | null;
  loadingMoreRoutes: boolean;
  hasMoreRoutes: boolean;
  refreshingRoutes: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  onImportRoute: (route: StravaRoute) => void;
  onLoadMore: () => void;
}

export default function StravaRoutesBottomSheet({
  open,
  routes,
  importLoading,
  importingRouteId,
  importError,
  loadingMoreRoutes,
  hasMoreRoutes,
  refreshingRoutes,
  onClose,
  onRefresh,
  onImportRoute,
  onLoadMore,
}: StravaRoutesBottomSheetProps) {
  const routesScrollRef = useRef<HTMLDivElement | null>(null);
  const routesOverscrollRef = useRef(0);
  const routesTouchStartYRef = useRef<number | null>(null);
  const routesRefreshTriggeredRef = useRef(false);
  const [routesPullDistance, setRoutesPullDistance] = useState(0);
  const [routesPulling, setRoutesPulling] = useState(false);
  const routesWheelResetRef = useRef<number | null>(null);

  const routesPullThreshold = 60;
  const routesPullMax = 90;

  const resetRoutesOverscroll = useCallback(() => {
    routesOverscrollRef.current = 0;
    routesRefreshTriggeredRef.current = false;
    setRoutesPullDistance(0);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (routesRefreshTriggeredRef.current || refreshingRoutes) return;
    routesRefreshTriggeredRef.current = true;
    setRoutesPullDistance((prev) => Math.max(prev, 48));
    try {
      await onRefresh();
    } finally {
      setRoutesPullDistance(0);
      routesOverscrollRef.current = 0;
      routesRefreshTriggeredRef.current = false;
    }
  }, [onRefresh, refreshingRoutes]);

  const handleRoutesScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const nearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < 100;
      if (nearBottom && hasMoreRoutes && !loadingMoreRoutes) {
        onLoadMore();
      }
    },
    [hasMoreRoutes, loadingMoreRoutes, onLoadMore],
  );

  const handleRoutesWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (refreshingRoutes) return;
      const target = e.currentTarget;
      if (target.scrollTop <= 0 && e.deltaY < 0) {
        routesOverscrollRef.current += Math.abs(e.deltaY);
        const clamped = Math.min(routesPullMax, routesOverscrollRef.current);
        setRoutesPullDistance(clamped);
        if (routesOverscrollRef.current > routesPullThreshold) {
          triggerRefresh();
        }
        if (routesWheelResetRef.current !== null) {
          window.clearTimeout(routesWheelResetRef.current);
        }
        routesWheelResetRef.current = window.setTimeout(() => {
          if (routesRefreshTriggeredRef.current || refreshingRoutes) return;
          resetRoutesOverscroll();
        }, 140);
      } else if (target.scrollTop > 0 || e.deltaY > 0) {
        resetRoutesOverscroll();
      }
    },
    [refreshingRoutes, resetRoutesOverscroll, routesPullMax, routesPullThreshold, triggerRefresh],
  );

  const handleRoutesTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (refreshingRoutes) return;
      const target = e.currentTarget;
      if (target.scrollTop <= 0) {
        routesTouchStartYRef.current = e.touches[0]?.clientY ?? null;
        setRoutesPulling(true);
      } else {
        routesTouchStartYRef.current = null;
        setRoutesPulling(false);
      }
    },
    [refreshingRoutes],
  );

  const handleRoutesTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (refreshingRoutes) return;
      const target = e.currentTarget;
      if (target.scrollTop > 0) {
        routesTouchStartYRef.current = null;
        setRoutesPulling(false);
        return;
      }
      const startY = routesTouchStartYRef.current;
      if (startY === null) return;
      const currentY = e.touches[0]?.clientY ?? startY;
      const delta = currentY - startY;
      if (delta > 0) {
        const clamped = Math.min(routesPullMax, delta);
        setRoutesPullDistance(clamped);
        if (clamped >= routesPullThreshold) {
          triggerRefresh();
        }
      } else {
        setRoutesPullDistance(0);
      }
    },
    [refreshingRoutes, routesPullMax, routesPullThreshold, triggerRefresh],
  );

  const handleRoutesTouchEnd = useCallback(() => {
    routesTouchStartYRef.current = null;
    setRoutesPulling(false);
    if (!refreshingRoutes) {
      resetRoutesOverscroll();
    }
  }, [refreshingRoutes, resetRoutesOverscroll]);

  const routesPullProgress = Math.min(1, routesPullDistance / routesPullThreshold);
  const routesReadyToRefresh = routesPullDistance >= routesPullThreshold;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-3 rounded-t-2xl rounded-b-none bg-white dark:bg-zinc-950 shadow-2xl border-t border-x border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"} pointer-events-auto max-h-[70vh] flex flex-col`}
      >
        <div className="p-4 pb-2 shrink-0">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Select a route to import
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={triggerRefresh}
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
                onClick={onClose}
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
          onWheel={handleRoutesWheel}
          onTouchStart={handleRoutesTouchStart}
          onTouchMove={handleRoutesTouchMove}
          onTouchEnd={handleRoutesTouchEnd}
          onTouchCancel={handleRoutesTouchEnd}
        >
          <div>
            <div
              className="flex items-center justify-center text-zinc-500 dark:text-zinc-400"
              style={{
                height: routesPullDistance,
                opacity: routesPullDistance > 4 || refreshingRoutes ? 1 : 0,
                transition: routesPulling
                  ? "none"
                  : "height 200ms ease, opacity 200ms ease",
              }}
            >
              {refreshingRoutes ? (
                <svg
                  className="h-4 w-4 animate-spin"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 transition-transform duration-200"
                    style={{
                      transform: `rotate(${routesReadyToRefresh ? 180 : 0}deg)`,
                      opacity: routesPullProgress,
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v10m0 0l-4-4m4 4l4-4"
                    />
                  </svg>
                  <span className="text-[11px]">
                    {routesReadyToRefresh ? "Release to refresh" : "Pull to refresh"}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {routes.map((route) => (
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
                      {formatRouteDistanceKm(route.distance)}
                    </p>
                  </div>
                  <button
                    onClick={() => onImportRoute(route)}
                    disabled={importLoading || importingRouteId !== null}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-lg hover:border-sky-300 dark:hover:border-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importingRouteId === route.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <svg
                          className="h-3.5 w-3.5 animate-spin"
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Importing
                      </span>
                    ) : (
                      "Import"
                    )}
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
              {routes.length === 0 && !loadingMoreRoutes && (
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
