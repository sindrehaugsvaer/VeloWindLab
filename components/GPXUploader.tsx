"use client";

import { useCallback, useState } from "react";
import { useGPX } from "@/context/GPXContext";

export default function GPXUploader() {
  const { processGPX, loading } = useGPX();
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".gpx")) {
        alert("Please upload a .gpx file");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        if (
          !confirm(
            "This file is larger than 50MB. Processing may take a while. Continue?",
          )
        ) {
          return;
        }
      }

      await processGPX(file);
    },
    [processGPX],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile],
  );

  const handleSampleLoad = useCallback(async () => {
    try {
      const res = await fetch("/Oslo.gpx");
      if (!res.ok) throw new Error("Failed to fetch sample GPX");
      const text = await res.text();
      const blob = new Blob([text], { type: "application/gpx+xml" });
      const file = new File([blob], "Oslo.gpx", {
        type: "application/gpx+xml",
      });
      await handleFile(file);
    } catch (err) {
      const fallback = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="GPX Analyzer Demo">\n  <trk>\n    <name>Sample Cycling Route</name>\n    <trkseg>\n      <trkpt lat="37.8000" lon="-122.4200"><ele>10</ele></trkpt>\n      <trkpt lat="37.8010" lon="-122.4190"><ele>15</ele></trkpt>\n      <trkpt lat="37.8020" lon="-122.4180"><ele>25</ele></trkpt>\n      <trkpt lat="37.8030" lon="-122.4170"><ele>40</ele></trkpt>\n      <trkpt lat="37.8040" lon="-122.4160"><ele>60</ele></trkpt>\n      <trkpt lat="37.8050" lon="-122.4150"><ele>85</ele></trkpt>\n    </trkseg>\n  </trk>\n</gpx>`;
      const blob = new Blob([fallback], { type: "application/gpx+xml" });
      const file = new File([blob], "sample-route-fallback.gpx", {
        type: "application/gpx+xml",
      });
      await handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative w-full max-w-2xl p-12 border-2 border-dashed rounded-xl
          transition-all duration-200 cursor-pointer backdrop-blur-sm
          ${
            dragActive
              ? "border-sky-500 bg-sky-50/80 dark:bg-sky-950/50"
              : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 bg-white/80 dark:bg-zinc-900/80"
          }
          ${loading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          type="file"
          accept=".gpx"
          onChange={handleFileInput}
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {loading ? "Processing GPX file..." : "Upload GPX file"}
          </h3>

          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Drag and drop your GPX file here, or click to browse
          </p>

          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Supports GPX 1.0/1.1 with elevation data
          </p>
        </div>
      </div>

      <button
        onClick={handleSampleLoad}
        disabled={loading}
        className="mt-6 px-6 py-2 text-sm font-medium text-sky-600 dark:text-sky-400 
                   hover:text-sky-700 dark:hover:text-sky-300
                   border border-sky-600 dark:border-sky-500 
                   hover:border-sky-700 dark:hover:border-sky-400 rounded-lg
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm"
      >
        Load Sample Route
      </button>

      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl text-center">
        All processing runs locally in your browser for privacy and
        responsiveness. Use the built-in sample route to explore features like
        segment selection, route simplification for smooth map rendering, and
        exportable metrics to analyze performance or plan future rides.
      </p>
    </div>
  );
}
