import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icons';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  }, [onImageUpload]);

  return (
    <div className="w-full max-w-lg text-center p-4 animate-slide-up-fade-in">
      <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-violet-400">
        Start Your Tour
      </h2>
      <p className="text-gray-400 mb-6">Upload a photo of a landmark to begin your journey.</p>
      <label
        htmlFor="file-upload"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        aria-label="Image upload area: Click to select or drag and drop an image. Supports JPEG, PNG, and WEBP files up to 10MB."
        className={`relative block w-full rounded-2xl border border-dashed p-12 text-center cursor-pointer transition-all duration-300 ease-in-out group
                    ${isDragging 
                        ? 'border-sky-400 bg-sky-500/10 scale-105 shadow-2xl shadow-sky-500/20' 
                        : 'border-gray-500 hover:border-sky-400 hover:bg-white/5 bg-black/20 backdrop-blur-lg'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative">
          <UploadIcon className="mx-auto h-12 w-12 text-gray-500 group-hover:text-sky-300 transition-colors duration-300" />
          <div className="mt-4">
              <p className="text-sm text-gray-300">
                  Drag &amp; drop a file or <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">click to upload</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                  Supported: JPEG, PNG, WEBP (Max 10MB)
              </p>
          </div>
        </div>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" aria-label="File input for landmark image"/>
      </label>
    </div>
  );
};