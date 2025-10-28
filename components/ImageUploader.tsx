
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
    <div className="w-full max-w-lg text-center p-4">
      <h2 className="text-2xl font-bold mb-2 text-cyan-300">Start Your Tour</h2>
      <p className="text-gray-400 mb-6">Upload a photo of a landmark to get started.</p>
      <label
        htmlFor="file-upload"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        aria-label="Image upload area: Click to select or drag and drop an image"
        className={`relative block w-full rounded-lg border-2 border-dashed ${isDragging ? 'border-cyan-400 bg-gray-800' : 'border-gray-600'} p-12 text-center hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 cursor-pointer transition-colors duration-200`}
      >
        <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
        <span className="mt-2 block text-sm font-medium text-gray-300">
          <span className="text-cyan-400">Upload a file</span> or drag and drop
        </span>
        <p className="mt-1 text-xs text-gray-500">Supported formats: JPEG, PNG, WEBP. Max size: 10MB.</p>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" aria-label="File input for landmark image"/>
      </label>
    </div>
  );
};
