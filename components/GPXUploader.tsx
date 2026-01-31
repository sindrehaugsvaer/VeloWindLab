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

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative w-full min-h-[90px] sm:min-h-[120px] lg:min-h-[200px]
          p-2 sm:p-3 lg:p-5 border-2 border-dashed rounded-xl
          transition-all duration-200 cursor-pointer backdrop-blur-sm
          flex items-center justify-center
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
            className="mx-auto h-6 w-6 sm:h-10 sm:w-10 text-zinc-400 dark:text-zinc-500"
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

          <h3 className="mt-1 sm:mt-2 text-xs sm:text-base font-medium text-zinc-900 dark:text-zinc-100">
            {loading ? "Processing GPX file..." : "Upload GPX file"}
          </h3>

          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-zinc-500 dark:text-zinc-400">
            Drag and drop your GPX file here, or click to browse
          </p>
        </div>
      </div>
    </div>
  );
}
