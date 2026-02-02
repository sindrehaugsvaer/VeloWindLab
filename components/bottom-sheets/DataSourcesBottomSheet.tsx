"use client";

import { useCallback, useRef, useState } from "react";

interface DataSourcesBottomSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function DataSourcesBottomSheet({
  open,
  onClose,
}: DataSourcesBottomSheetProps) {
  const [sheetOffset, setSheetOffset] = useState(0);
  const sheetStartYRef = useRef<number | null>(null);
  const sheetOffsetRef = useRef(0);

  const resetSheet = useCallback(() => {
    setSheetOffset(0);
    sheetOffsetRef.current = 0;
    sheetStartYRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    resetSheet();
    onClose();
  }, [onClose, resetSheet]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        style={{
          opacity: open ? Math.max(0, 1 - sheetOffset / 60) : 0,
        }}
      />
      <button
        className={`absolute inset-0 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-label="Close data sources"
        onClick={handleClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-3 rounded-t-2xl rounded-b-none bg-white dark:bg-zinc-950 p-4 shadow-2xl border-t border-x border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"} pointer-events-auto`}
        style={{
          transform: `translateY(${open ? sheetOffset : 100}%)`,
        }}
        onTouchStart={(e) => {
          if (!open) return;
          sheetStartYRef.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchMove={(e) => {
          if (!open || sheetStartYRef.current === null) return;
          const currentY = e.touches[0]?.clientY ?? sheetStartYRef.current;
          const delta = Math.max(0, currentY - sheetStartYRef.current);
          const percent = Math.min(60, (delta / window.innerHeight) * 100);
          sheetOffsetRef.current = percent;
          setSheetOffset(percent);
        }}
        onTouchEnd={() => {
          if (!open) return;
          if (sheetOffsetRef.current > 20) {
            handleClose();
          } else {
            resetSheet();
          }
        }}
        onTouchCancel={resetSheet}
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
              You can disconnect anytime via your{" "}
              <a
                href="https://www.strava.com/settings/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-sky-400 hover:underline"
              >
                Strava settings
              </a>{" "}
              or by clearing local storage.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
