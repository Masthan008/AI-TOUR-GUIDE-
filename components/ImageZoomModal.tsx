import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface ImageZoomModalProps {
  imageUrl: string;
  altText: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, altText, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      style={{ animation: 'fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Zoomed image view"
    >
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
      >
        <img
          src={imageUrl}
          alt={altText}
          className="block max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          style={{ animation: 'zoom-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-gray-800/60 rounded-full text-white hover:bg-gray-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close zoomed image"
      >
        <CloseIcon className="w-8 h-8" />
      </button>
    </div>
  );
};
