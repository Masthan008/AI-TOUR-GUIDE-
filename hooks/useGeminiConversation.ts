import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, Blob, LiveSession, LiveServerMessage } from '@google/genai';

// --- Audio Encoding/Decoding Utilities ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const useGeminiConversation = () => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [modelTranscript, setModelTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<{user: string, model: string}[]>([]);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  let nextStartTime = 0;

  const cleanup = useCallback(async () => {
    setIsListening(false);
    
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    
    if (inputAudioContextRef.current?.state !== 'closed') await inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') await outputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;

    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) { console.error("Error closing session:", e); }
        sessionPromiseRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => { cleanup(); }, [cleanup]);

  const startListening = useCallback(async () => {
    if (isListening) return;

    setError(null);
    setUserTranscript('');
    setModelTranscript('');
    setConversationHistory([]);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
    setIsListening(true);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: createBlob(inputData) }));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        currentInputTranscription.current += text;
                        setUserTranscript(currentInputTranscription.current);
                    }
                    if (message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        currentOutputTranscription.current += text;
                        setModelTranscript(currentOutputTranscription.current);
                    }
                    if (message.serverContent?.turnComplete) {
                        setConversationHistory(prev => [...prev, {user: currentInputTranscription.current, model: currentOutputTranscription.current}]);
                        currentInputTranscription.current = '';
                        currentOutputTranscription.current = '';
                        setUserTranscript('');
                        setModelTranscript('');
                    }
                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (audioData) {
                        const outputCtx = outputAudioContextRef.current!;
                        nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
                        const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                        const source = outputCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputCtx.destination);
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    setError('An API error occurred.');
                    cleanup();
                },
                onclose: (e: CloseEvent) => { cleanup(); },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: "You are a friendly AI assistant. Keep your responses conversational and concise."
            },
        });

    } catch (err: any) {
      let errorMessage = 'Could not start listening.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') errorMessage = 'Microphone permission denied.';
      else if (err.name === 'NotFoundError') errorMessage = 'No microphone found.';
      setError(errorMessage);
      cleanup();
    }
  }, [isListening, cleanup]);

  useEffect(() => { return () => { cleanup(); }; }, [cleanup]);

  return {
    isListening,
    isSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    startListening,
    stopListening,
    error,
    userTranscript,
    modelTranscript,
    conversationHistory,
  };
};