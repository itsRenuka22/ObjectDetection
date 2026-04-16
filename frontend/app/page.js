'use client';

import { useEffect, useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import DetectionResults from '@/components/DetectionResults';
import VideoResults from '@/components/VideoResults';
import LoadingSpinner from '@/components/LoadingSpinner';
import { fetchModels, detectImage, detectVideo } from '@/lib/api';

export default function HomePage() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'image' | 'video'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    fetchModels()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.models ?? [];
        setModels(list);
        if (list.length > 0) setSelectedModel(list[0]);
      })
      .catch(() => {
        const fallback = ['yolov8_pytorch', 'yolov8_onnx', 'rtdetr_pytorch', 'rtdetr_onnx'];
        setModels(fallback);
        setSelectedModel(fallback[0]);
      })
      .finally(() => setModelsLoading(false));
  }, []);

  function handleFileSelect(f) {
    setFile(f);
    setResult(null);
    setError(null);
    setFileType(f?.type?.startsWith('video/') ? 'video' : 'image');
  }

  async function handleDetect() {
    if (!file || !selectedModel) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = fileType === 'video'
        ? await detectVideo(file, selectedModel)
        : await detectImage(file, selectedModel);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Detection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isVideo = fileType === 'video';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Object Detection</h1>
        <p className="mt-1 text-gray-400">Upload an image or video and select a model to detect objects</p>
      </div>

      {/* Upload & config */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
        <ImageUpload onFileSelect={handleFileSelect} />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={modelsLoading}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modelsLoading
                ? <option>Loading models...</option>
                : models.map((m) => <option key={m} value={m}>{m}</option>)
              }
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDetect}
              disabled={!file || !selectedModel || loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
                disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                disabled:cursor-not-allowed text-sm"
            >
              {loading
                ? (isVideo ? 'Processing video...' : 'Detecting...')
                : (isVideo ? 'Detect in Video' : 'Detect Objects')}
            </button>
          </div>
        </div>

        {isVideo && !loading && (
          <p className="text-xs text-yellow-500/80">
            Video processing runs detection on every frame (up to 300). This may take a minute.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl p-4">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <LoadingSpinner message={isVideo
          ? `Processing video with ${selectedModel} (this may take a minute)...`
          : `Running ${selectedModel}...`}
        />
      )}

      {!loading && result && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Results</h2>
          {isVideo
            ? <VideoResults result={result} modelName={selectedModel} />
            : <DetectionResults result={result} modelName={selectedModel} />
          }
        </div>
      )}
    </div>
  );
}
