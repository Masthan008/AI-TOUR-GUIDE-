import React from 'react';
import { useGeminiConversation } from './hooks/useGeminiConversation';
import { MicrophoneIcon, StopIcon, BotIcon, UserIcon } from './components/Icons';

const ConverseView: React.FC = () => {
  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
    error,
    userTranscript,
    modelTranscript,
    conversationHistory,
  } = useGeminiConversation();

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className="text-center p-4">
        <p className="text-red-400">Your browser does not support the necessary audio features for this conversation.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col glass-pane animate-slide-up-fade-in max-w-2xl mx-auto overflow-hidden">
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4">
          {conversationHistory.map((turn, index) => (
            <React.Fragment key={index}>
              <div className="flex items-start gap-3 justify-end">
                <div className="px-4 py-2 rounded-2xl max-w-sm md:max-w-md bg-sky-600 text-white rounded-br-none">
                  <p className="whitespace-pre-wrap">{turn.user}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                  <BotIcon className="w-5 h-5 text-white" />
                </div>
                <div className="px-4 py-2 rounded-2xl max-w-sm md:max-w-md bg-gray-700 text-gray-200 rounded-bl-none">
                  <p className="whitespace-pre-wrap">{turn.model}</p>
                </div>
              </div>
            </React.Fragment>
          ))}
          {userTranscript && (
             <div className="flex items-start gap-3 justify-end">
                <div className="px-4 py-2 rounded-2xl max-w-sm md:max-w-md bg-sky-600/70 text-white/80 rounded-br-none">
                  <p className="whitespace-pre-wrap italic">{userTranscript}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              </div>
          )}
           {modelTranscript && (
             <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                  <BotIcon className="w-5 h-5 text-white" />
                </div>
                <div className="px-4 py-2 rounded-2xl max-w-sm md:max-w-md bg-gray-700/70 text-gray-200/80 rounded-bl-none">
                  <p className="whitespace-pre-wrap italic">{modelTranscript}</p>
                </div>
              </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-white/10 flex flex-col items-center justify-center">
        <button
          onClick={handleToggleListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ease-in-out transform active:scale-90
                      ${isListening ? 'bg-red-500 animate-pulse' : 'bg-sky-500 hover:bg-sky-600'}`}
          aria-label={isListening ? 'Stop conversation' : 'Start conversation'}
        >
          {isListening ? (
            <StopIcon className="w-8 h-8 text-white" />
          ) : (
            <MicrophoneIcon className="w-9 h-9 text-white" />
          )}
        </button>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
         <p className="text-gray-400 text-sm mt-3">
            {isListening ? "Listening..." : "Tap to start speaking"}
        </p>
      </div>
    </div>
  );
};

export default ConverseView;