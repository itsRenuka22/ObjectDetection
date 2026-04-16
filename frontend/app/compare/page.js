'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import LatencyBadge from '@/components/LatencyBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { compareModels } from '@/lib/api';

function ModelCard({ modelResult, isFastest, mostDetections }) {
  const detections = modelResult?.detections ?? [];
  const isMostDetections = mostDetections && detections.length === mostDetections && detections.length > 0;

  return (
    <div className={`bg-gray-900 rounded-xl border p-4 flex flex-col gap-4 relative
      ${isFastest ? 'border-green-700 ring-1 ring-green-700/50' : 'border-gray-800'}
    `}>
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-white font-mono">{modelResult.model_name}</h3>
        {isFastest && (
          <span className="px-2 py-0.5 bg-green-900/60 border border-green-700 text-green-400 rounded-md text-xs font-semibold">
            Fastest
          </span>
        )}
        {isMostDetections && (
          <span className="px-2 py-0.5 bg-purple-900/60 border border-purple-700 text-purple-400 rounded-md text-xs font-semibold">
            Most Detections
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <LatencyBadge ms={modelResult.latency_ms} />
        <span className="text-sm text-gray-400">
          <span className="text-white font-semibold">{detections.length}</span> object{detections.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Annotated image */}
      {modelResult.annotated_image ? (
        <div className="rounded-lg overflow-hidden bg-black border border-gray-800">
          <img
            src={`data:image/jpeg;base64,${modelResult.annotated_image}`}
            alt={`${modelResult.model_name} result`}
            className="w-full object-contain max-h-56"
          />
        </div>
      ) : (
        <div className="rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center h-40 text-gray-600 text-sm">
          No image
        </div>
      )}

      {/* Detections list */}
      {detections.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {detections.map((det, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-gray-800/60 rounded-md px-2.5 py-1.5">
              <span className="text-gray-300 capitalize font-medium truncate">
                {det.label ?? det.class ?? det.name ?? 'Unknown'}
              </span>
              <span className="text-gray-500 font-mono ml-2 flex-shrink-0">
                {((det.confidence ?? det.score ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {detections.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-2">No objects detected</p>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCompare() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await compareModels(file);
      // API returns { comparison: { model_name: { latency_ms, detections, annotated_image } } }
      let list;
      if (Array.isArray(data)) {
        list = data;
      } else if (data.comparison) {
        list = Object.entries(data.comparison).map(([model_name, result]) => ({
          model_name,
          ...result,
        }));
      } else {
        list = data.results ?? [];
      }
      setResults(list);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Comparison failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const fastestLatency = results
    ? Math.min(...results.map((r) => r.latency_ms ?? Infinity))
    : null;

  const maxDetections = results
    ? Math.max(...results.map((r) => (r.detections ?? []).length))
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Compare Models</h1>
        <p className="mt-1 text-gray-400">Run all 4 models on the same image and compare results side by side</p>
      </div>

      {/* Upload card */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5 max-w-2xl">
        <ImageUpload onFileSelect={setFile} label="image" />

        <button
          onClick={handleCompare}
          disabled={!file || loading}
          className="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
            disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
            disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Running all models...' : 'Compare All Models'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl p-4 max-w-2xl">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingSpinner message="Running all 4 models, this may take a moment..." />}

      {/* Summary bar */}
      {!loading && results && results.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl px-5 py-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Models Run</p>
            <p className="text-2xl font-bold text-white">{results.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fastest</p>
            <p className="text-sm font-semibold text-green-400 font-mono">
              {results.find((r) => r.latency_ms === fastestLatency)?.model_name ?? '—'}
            </p>
            <p className="text-xs text-gray-500 font-mono">{fastestLatency?.toFixed(1)} ms</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Slowest</p>
            <p className="text-sm font-semibold text-red-400 font-mono">
              {results.reduce((a, b) => ((a.latency_ms ?? 0) > (b.latency_ms ?? 0) ? a : b))?.model_name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Detections Range</p>
            <p className="text-sm font-semibold text-white">
              {Math.min(...results.map((r) => (r.detections ?? []).length))}
              {' – '}
              {maxDetections} objects
            </p>
          </div>
        </div>
      )}

      {/* 2x2 Grid */}
      {!loading && results && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {results.map((r) => (
            <ModelCard
              key={r.model_name}
              modelResult={r}
              isFastest={r.latency_ms === fastestLatency}
              mostDetections={maxDetections}
            />
          ))}
        </div>
      )}
    </div>
  );
}
