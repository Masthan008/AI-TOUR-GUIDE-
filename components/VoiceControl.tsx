import React from 'react';
import { MicrophoneIcon } from './Icons';

interface VoiceControlProps {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ isListening, isSupported, startListening, stopListening }) => {
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
    <button
      onClick={handleToggleListening}
      aria-label={isListening ? 'Stop listening for voice commands' : 'Start listening for voice commands'}
      className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ease-in-out transform active:scale-90
                  ${isListening ? 'bg-red-500 animate-pulse' : 'bg-sky-500 hover:bg-sky-600'}`}
    >
        <MicrophoneIcon className="w-8 h-8 text-white" />
    </button>
  );
};
