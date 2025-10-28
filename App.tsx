import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { recognizeLandmark, fetchLandmarkHistory, narrateText } from './services/geminiService';
import { AppState, AnalysisResult, HistoryItem } from './types';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { HistoryLog } from './components/HistoryLog';
import { ArView } from './components/ArView';

const HISTORY_KEY = 'photoTourHistory';
const MAX_HISTORY_ITEMS = 10;

// --- Audio Conversion Utilities ---

/**
 * Decodes a base64 string into a Uint8Array.
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Writes a string to a DataView.
 */
function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Converts raw PCM audio data into a WAV file Blob.
 * Assumes 16-bit, 1-channel audio at 24000 Hz sample rate from Gemini TTS.
 */
function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Blob {
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    new Uint8Array(buffer).set(pcmData, 44);
    
    return new Blob([view], { type: 'audio/wav' });
}


function getHistory(): HistoryItem[] {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Failed to parse history from localStorage", error);
    return [];
  }
}

function saveHistory(history: HistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save history to localStorage", error);
  }
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [showArView, setShowArView] = useState<boolean>(false);


  // Effect to manage and revoke the active blob URL to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (activeAudioUrl) {
        URL.revokeObjectURL(activeAudioUrl);
      }
    };
  }, [activeAudioUrl]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const resetState = () => {
    setAppState(AppState.IDLE);
    setImageUrl(null);
    setAnalysisResult(null);
    setError(null);
    setLoadingMessage('');
    setShowHistory(false);
    setShowArView(false);
    if (activeAudioUrl) {
        setActiveAudioUrl(null); // This will trigger the useEffect cleanup to revoke
    }
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const imgUrl = reader.result as string;
      setImageUrl(imgUrl);
      setAppState(AppState.ANALYZING);
      setError(null);

      try {
        const base64Data = imgUrl.split(',')[1];
        
        setLoadingMessage('Identifying landmark...');
        const landmarkName = await recognizeLandmark(file.type, base64Data);

        if (landmarkName.toLowerCase().includes('unknown landmark')) {
          throw new Error("Could not identify a landmark in the photo. Please try another one.");
        }
        
        setLoadingMessage('Uncovering its history...');
        const { history, sources } = await fetchLandmarkHistory(landmarkName);

        setLoadingMessage('Creating your audio guide...');
        const audioBase64 = await narrateText(history);
        
        const pcmData = decodeBase64(audioBase64);
        const wavBlob = pcmToWav(pcmData, 24000, 1, 16);
        const audioUrl = URL.createObjectURL(wavBlob);
        setActiveAudioUrl(audioUrl);
        
        const analysisData: AnalysisResult = {
          landmarkName,
          history,
          sources,
          audioDataUrl: audioUrl,
        };
        
        setAnalysisResult(analysisData);
        setAppState(AppState.SUCCESS);

        const newItem: HistoryItem = { 
            id: new Date().toISOString(),
            imageUrl: imgUrl,
            landmarkName,
            history,
            sources,
            audioDataBase64: audioBase64,
        };
        setHistory(prevHistory => {
            if (prevHistory.some(item => item.landmarkName === newItem.landmarkName)) {
                return prevHistory;
            }
            const updatedHistory = [newItem, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
            saveHistory(updatedHistory);
            return updatedHistory;
        });

      } catch (err: any) {
        console.error("Analysis failed:", err);
        setError(err.message || 'An unexpected error occurred. Please try again.');
        setAppState(AppState.ERROR);
      } finally {
        setLoadingMessage('');
      }
    };
    reader.onerror = () => {
        setError('Failed to read the image file.');
        setAppState(AppState.ERROR);
    }
  }, []);
  
  const handleSelectHistoryItem = (item: HistoryItem) => {
    const pcmData = decodeBase64(item.audioDataBase64);
    const wavBlob = pcmToWav(pcmData, 24000, 1, 16);
    const audioUrl = URL.createObjectURL(wavBlob);
    setActiveAudioUrl(audioUrl);

    setImageUrl(item.imageUrl);
    setAnalysisResult({
      landmarkName: item.landmarkName,
      history: item.history,
      sources: item.sources,
      audioDataUrl: audioUrl,
    });
    setAppState(AppState.SUCCESS);
    setShowHistory(false);
  };

  const handleToggleArView = () => {
    setShowArView(prev => !prev);
  }

  const renderContent = () => {
    if (showHistory) {
      return <HistoryLog items={history} onSelect={handleSelectHistoryItem} onClose={() => setShowHistory(false)} />;
    }

    switch (appState) {
      case AppState.ANALYZING:
        return <LoadingSpinner message={loadingMessage} />;
      case AppState.SUCCESS:
        return analysisResult && imageUrl && (
          <ResultDisplay
            imageUrl={imageUrl}
            result={analysisResult}
            onReset={resetState}
            onToggleArView={handleToggleArView}
          />
        );
      case AppState.ERROR:
        return <ErrorDisplay message={error || 'An error occurred.'} onRetry={resetState} />;
      case AppState.IDLE:
      default:
        return <ImageUploader onImageUpload={handleImageUpload} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <Header onToggleHistory={() => setShowHistory(true)} showHistoryButton={history.length > 0} />
      <main className="w-full max-w-4xl flex-grow flex flex-col items-center justify-center">
        {renderContent()}
      </main>
      {showArView && analysisResult && (
        <ArView 
          landmarkName={analysisResult.landmarkName}
          onClose={handleToggleArView}
        />
      )}
    </div>
  );
};

export default App;