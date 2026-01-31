"use client";

import { useGPX } from "@/context/GPXContext";
import { useState, useRef, useEffect, useMemo } from "react";

export default function RouteSelector() {
  const { savedRoutes, activeRouteId, loadRoute, deleteRoute } = useGPX();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const sortedRoutes = useMemo(() => {
    return [...savedRoutes].sort((a, b) => a.name.localeCompare(b.name));
  }, [savedRoutes]);

  if (sortedRoutes.length === 0) {
    return null;
  }

  const routeCount = sortedRoutes.length;

  return (
    <>
      {/* Mobile/Compact: Icon dropdown */}
      <div className="lg:hidden relative" ref={menuRef}>
        {isOpen && (
          <button
            className="fixed inset-0 z-40 bg-transparent"
            aria-label="Close route selector"
            onClick={() => setIsOpen(false)}
          />
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer relative h-10 w-10 flex items-center justify-center"
          aria-label="Route selector"
          title={`Routes (${routeCount})`}
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          {routeCount > 1 && (
            <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {routeCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-64 rounded-lg bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-zinc-700 overflow-hidden z-50 max-h-80 overflow-y-auto max-[430px]:fixed max-[430px]:left-0 max-[430px]:right-0 max-[430px]:mx-4 max-[430px]:w-auto max-[430px]:top-16">
            {sortedRoutes.map((route) => (
              <div
                key={route.id}
                className={`
                  flex items-center justify-between px-4 py-2.5 transition-colors
                  ${
                    activeRouteId === route.id
                      ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  }
                `}
              >
                <button
                  onClick={() => {
                    loadRoute(route.id);
                    setIsOpen(false);
                  }}
                  className="flex-1 text-left text-sm truncate"
                  title={route.name}
                >
                  {route.name}
                  {activeRouteId === route.id && (
                    <svg
                      className="inline-block ml-2 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRoute(route.id);
                  }}
                  className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title={`Delete ${route.name}`}
                  aria-label={`Delete ${route.name}`}
                >
                  <svg
                    className="w-4 h-4"
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
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Horizontal scroll */}
      <div className="hidden lg:flex items-center min-w-0 flex-1 mx-4">
        <div
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent py-1 px-0.5"
          style={{
            scrollbarWidth: "thin",
            msOverflowStyle: "none",
          }}
        >
          {sortedRoutes.map((route) => (
            <div
              key={route.id}
              className={`
                group flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
                whitespace-nowrap shrink-0 transition-all duration-150
                ${
                  activeRouteId === route.id
                    ? "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-700"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }
              `}
            >
              <button
                onClick={() => loadRoute(route.id)}
                className="max-w-[120px] truncate cursor-pointer"
                title={route.name}
              >
                {route.name}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRoute(route.id);
                }}
                className={`
                  ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer
                  hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400
                `}
                title={`Delete ${route.name}`}
                aria-label={`Delete ${route.name}`}
              >
                <svg
                  className="w-3 h-3"
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
          ))}
        </div>
      </div>
    </>
  );
}
