import React, { useState, useEffect } from 'react';
import { MicrophoneIcon } from './Icons';

interface VoiceControlProps {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ isListening, isSupported, startListening, stopListening, error }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000); // Hide message after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  if (!isSupported) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="px-4 py-2 bg-red-500/80 text-white text-xs rounded-lg shadow-lg">
          Voice control not supported on this browser.
        </div>
      </div>
    );
  }

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col-reverse items-end gap-2">
       {errorMessage && (
        <div 
          className="px-3 py-2 bg-red-800/90 text-white text-sm rounded-lg shadow-lg"
          style={{ animation: 'fade-in 0.3s' }}
        >
          {errorMessage}
        </div>
      )}
      <button
        onClick={handleToggleListening}
        aria-label={isListening ? 'Stop listening for voice commands' : 'Start listening for voice commands'}
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ease-in-out transform active:scale-90
                    ${isListening ? 'bg-red-500 animate-pulse' : 'bg-sky-500 hover:bg-sky-600'}`}
      >
          <MicrophoneIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
      </button>
    </div>
  );
};