import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, Blob, LiveSession, LiveServerMessage } from '@google/genai';

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const useGeminiLive = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentTranscriptRef = useRef('');

  const cleanup = useCallback(async () => {
    setIsListening(false);
    
    if (scriptProcessorRef.current && audioContextRef.current) {
        scriptProcessorRef.current.disconnect(audioContextRef.current.destination);
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
        sessionPromiseRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const startListening = useCallback(async () => {
    if (isListening) return;

    setError(null);
    setTranscript('');
    currentTranscriptRef.current = '';
    setIsListening(true);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = inputAudioContext;

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        
                        sessionPromiseRef.current?.then((session) => {
                           session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                },
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        currentTranscriptRef.current += text;
                    }
                    if (message.serverContent?.turnComplete) {
                        const finalTranscript = currentTranscriptRef.current.trim();
                        if (finalTranscript) {
                            setTranscript(finalTranscript);
                        }
                        currentTranscriptRef.current = '';
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Gemini Live API Error:', e);
                    setError('An error occurred with voice recognition.');
                    cleanup();
                },
                onclose: (e: CloseEvent) => {
                    // This can be called when stopListening is initiated, so we don't always treat it as an error.
                    // The cleanup function handles state changes.
                },
            },
            config: {
                inputAudioTranscription: {},
            },
        });

    } catch (err: any) {
      console.error('Error starting voice recognition:', err);
      let errorMessage = 'Could not start listening.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found.';
      }
      setError(errorMessage);
      cleanup();
    }
  }, [isListening, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    transcript,
    isListening,
    isSupported: true, // Assuming if the library loads, it's supported.
    startListening,
    stopListening,
    error,
  };
};