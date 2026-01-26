'use client';

import { useGPX } from '@/context/GPXContext';

export default function RouteSelector() {
  const { savedRoutes, activeRouteId, loadRoute, deleteRoute } = useGPX();

  if (savedRoutes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center min-w-0 flex-1 mx-4">
      <div 
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent py-1 px-0.5"
        style={{ 
          scrollbarWidth: 'thin',
          msOverflowStyle: 'none',
        }}
      >
        {savedRoutes.map((route) => (
          <div
            key={route.id}
            className={`
              group flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
              whitespace-nowrap shrink-0 transition-all duration-150
              ${activeRouteId === route.id
                ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
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
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
