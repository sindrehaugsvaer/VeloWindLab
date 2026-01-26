'use client';

import { useCallback, useState } from 'react';
import { useGPX } from '@/context/GPXContext';

export default function GPXUploader() {
  const { processGPX, loading } = useGPX();
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      alert('Please upload a .gpx file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      if (!confirm('This file is larger than 50MB. Processing may take a while. Continue?')) {
        return;
      }
    }

    await processGPX(file);
  }, [processGPX]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

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

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleSampleLoad = useCallback(async () => {
    const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Analyzer Demo">
  <trk>
    <name>Sample Cycling Route</name>
    <trkseg>
      <trkpt lat="37.8000" lon="-122.4200"><ele>10</ele></trkpt>
      <trkpt lat="37.8010" lon="-122.4190"><ele>15</ele></trkpt>
      <trkpt lat="37.8020" lon="-122.4180"><ele>25</ele></trkpt>
      <trkpt lat="37.8030" lon="-122.4170"><ele>40</ele></trkpt>
      <trkpt lat="37.8040" lon="-122.4160"><ele>60</ele></trkpt>
      <trkpt lat="37.8050" lon="-122.4150"><ele>85</ele></trkpt>
      <trkpt lat="37.8060" lon="-122.4140"><ele>115</ele></trkpt>
      <trkpt lat="37.8070" lon="-122.4130"><ele>150</ele></trkpt>
      <trkpt lat="37.8080" lon="-122.4120"><ele>180</ele></trkpt>
      <trkpt lat="37.8090" lon="-122.4110"><ele>200</ele></trkpt>
      <trkpt lat="37.8100" lon="-122.4100"><ele>205</ele></trkpt>
      <trkpt lat="37.8110" lon="-122.4090"><ele>200</ele></trkpt>
      <trkpt lat="37.8120" lon="-122.4080"><ele>190</ele></trkpt>
      <trkpt lat="37.8130" lon="-122.4070"><ele>175</ele></trkpt>
      <trkpt lat="37.8140" lon="-122.4060"><ele>155</ele></trkpt>
      <trkpt lat="37.8150" lon="-122.4050"><ele>130</ele></trkpt>
      <trkpt lat="37.8160" lon="-122.4040"><ele>100</ele></trkpt>
      <trkpt lat="37.8170" lon="-122.4030"><ele>70</ele></trkpt>
      <trkpt lat="37.8180" lon="-122.4020"><ele>45</ele></trkpt>
      <trkpt lat="37.8190" lon="-122.4010"><ele>25</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([sampleGPX], { type: 'application/gpx+xml' });
    const file = new File([blob], 'sample-route.gpx', { type: 'application/gpx+xml' });
    await handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative w-full max-w-2xl p-12 border-2 border-dashed rounded-lg
          transition-all duration-200 cursor-pointer
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }
          ${loading ? 'opacity-50 pointer-events-none' : ''}
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
            className="mx-auto h-12 w-12 text-gray-400"
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
          
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {loading ? 'Processing GPX file...' : 'Upload GPX file'}
          </h3>
          
          <p className="mt-2 text-sm text-gray-500">
            Drag and drop your GPX file here, or click to browse
          </p>
          
          <p className="mt-1 text-xs text-gray-400">
            Supports GPX 1.0/1.1 with elevation data
          </p>
        </div>
      </div>

      <button
        onClick={handleSampleLoad}
        disabled={loading}
        className="mt-6 px-6 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 
                   border border-blue-600 hover:border-blue-700 rounded-md
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Load Sample Route
      </button>
    </div>
  );
}
