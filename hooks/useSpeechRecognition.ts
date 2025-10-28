import { useState, useEffect, useRef } from 'react';

// TypeScript definitions for the Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | string;
}

// FIX: Define a constructor type for SpeechRecognition to resolve the error
// where 'SpeechRecognition' only referred to a type but was used as a value.
type SpeechRecognitionConstructor = new () => SpeechRecognition;

// Extend the window object to include webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = !!SpeechRecognitionAPI;

  useEffect(() => {
    if (!isSupported) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage: string | null = null;
      switch (event.error) {
          case 'no-speech':
              // This isn't a fatal error, just an indication that the user didn't speak.
              // We can choose to ignore it to avoid bothering the user.
              break;
          case 'audio-capture':
              errorMessage = "Microphone problem. Please check your microphone.";
              break;
          case 'not-allowed':
              errorMessage = "Permission to use microphone was denied.";
              break;
          case 'network':
              errorMessage = "Network error. Please check your connection.";
              break;
          default:
              errorMessage = "An unknown voice recognition error occurred.";
              break;
      }

      if (errorMessage) {
          setError(errorMessage);
      }
      console.error(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      // The final transcript is needed by the App component to process the command,
      // so we should not clear it here. It's cleared when listening starts.
    };

    recognitionRef.current = recognition;

    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setError(null); // Clear previous errors on start
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setError("Could not start listening.");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  };

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    error,
  };
};