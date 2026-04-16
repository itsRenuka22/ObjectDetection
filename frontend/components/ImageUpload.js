'use client';

import { useRef, useState } from 'react';

export default function ImageUpload({ onFileSelect, accept = 'image/*,video/*', label = 'image or video' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState(null); // 'image' | 'video'
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (isImage || isVideo) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setPreviewType(isImage ? 'image' : 'video');
    } else {
      setPreview(null);
      setPreviewType(null);
    }
    onFileSelect(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors
        ${isDragging
          ? 'border-blue-400 bg-blue-950/30'
          : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {preview && previewType === 'image' && (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full max-h-72 object-contain rounded-xl" />
          <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-gray-300 truncate">
            {fileName}
          </div>
        </div>
      )}

      {preview && previewType === 'video' && (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <video
            src={preview}
            controls
            className="w-full max-h-72 rounded-xl bg-black"
          />
          <div className="mt-1 px-3 py-1.5 text-xs text-gray-400 truncate">{fileName}</div>
        </div>
      )}

      {!preview && (
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          <div className="flex gap-3 mb-4 text-gray-600">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-300 font-medium mb-1">
            Drop your {label} here, or <span className="text-blue-400">browse</span>
          </p>
          <p className="text-gray-500 text-sm">Images: PNG, JPG, WebP &nbsp;·&nbsp; Video: MP4, MOV, AVI</p>
        </div>
      )}
    </div>
  );
}
