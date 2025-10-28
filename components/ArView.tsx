import React, { useEffect, useRef, useState } from 'react';
import { CloseIcon } from './Icons';
import { LoadingSpinner } from './LoadingSpinner';

interface ArViewProps {
  landmarkName: string;
  onClose: () => void;
}

export const ArView: React.FC<ArViewProps> = ({ landmarkName, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
                setIsLoading(false);
            };
          }
        } else {
            throw new Error("Your browser does not support camera access.");
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        if (err instanceof Error) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setError("Camera access was denied. Please enable camera permissions in your browser settings to use this feature.");
            } else {
                setError("Could not access the camera. Please ensure it is not being used by another application.");
            }
        } else {
            setError("An unknown error occurred while trying to access the camera.");
        }
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      // Cleanup: stop all tracks on the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      
      {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
             <LoadingSpinner message="Starting camera..." />
          </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4">
            <p className="text-red-400 mb-4 max-w-md">{error}</p>
            <button
                onClick={onClose}
                className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700"
            >
                Return
            </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
            {/* Overlay UI */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-11/12 max-w-md p-4 bg-black/40 backdrop-blur-md rounded-lg text-center border border-white/20">
                <h2 className="text-xl font-bold text-white">{landmarkName}</h2>
            </div>
            
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-3 bg-black/30 rounded-full text-white hover:bg-black/60 transition-colors"
                aria-label="Close AR view"
            >
                <CloseIcon className="w-6 h-6" />
            </button>
        </>
      )}
    </div>
  );
};
