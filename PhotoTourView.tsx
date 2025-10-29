import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ImageUploader, ImageUploaderRef } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { recognizeLandmark, fetchLandmarkHistory, narrateText, fetchLandmarkDetails, fetchDiscoveryDetails, fetchDetailedLandmarkHistory } from './services/geminiService';
import { AppState, AnalysisResult, HistoryItem } from './types';
import { ErrorDisplay } from './components/ErrorDisplay';
import { HistoryLog } from './components/HistoryLog';
import { ArView } from './components/ArView';
import { HistoryIcon } from './components/Icons';

const HISTORY_KEY = 'photoTourHistory';
const MAX_HISTORY_ITEMS = 10;

function decodeBase64(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

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

async function createThumbnail(dataUrl: string, maxWidth: number = 400, maxHeight: number = 300): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));
            let { width, height } = img;
            if (width > height) {
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (err) => reject(new Error(`Failed to load image for thumbnail creation: ${err}`));
    });
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

const PhotoTourView: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [showArView, setShowArView] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  const [detailedHistory, setDetailedHistory] = useState<string | null>(null);
  const [isFetchingDetailedHistory, setIsFetchingDetailedHistory] = useState(false);

  useEffect(() => {
    return () => {
      if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
    };
  }, [activeAudioUrl]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const resetState = () => {
    setAppState(AppState.IDLE);
    setImageUrl(null);
    setAnalysisResult(null);
    setError(null);
    setRawError(null);
    setLoadingMessage('');
    setShowHistory(false);
    setShowArView(false);
    setDetailedHistory(null);
    setIsFetchingDetailedHistory(false);
    if (activeAudioUrl) setActiveAudioUrl(null);
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (isOffline) {
        setError("You are currently offline. Please check your connection to analyze a new landmark.");
        setAppState(AppState.ERROR);
        return;
    }
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const imgUrl = reader.result as string;
      setImageUrl(imgUrl);
      setAppState(AppState.ANALYZING);
      setError(null);

      try {
        setLoadingMessage('Identifying landmark...');
        const landmarkName = await recognizeLandmark(file.type, imgUrl.split(',')[1]);
        if (landmarkName.toLowerCase().includes('unknown landmark')) {
          throw new Error("Could not identify a landmark in the photo. Please try another one.");
        }
        setLoadingMessage('Uncovering its history...');
        const { history, sources } = await fetchLandmarkHistory(landmarkName);
        setLoadingMessage('Gathering key details...');
        const details = await fetchLandmarkDetails(landmarkName);
        setLoadingMessage('Finding nearby attractions...');
        const discovery = await fetchDiscoveryDetails(landmarkName);
        setLoadingMessage('Creating your audio guide...');
        const audioBase64 = await narrateText(history);
        const pcmData = decodeBase64(audioBase64);
        const wavBlob = pcmToWav(pcmData, 24000, 1, 16);
        const audioUrl = URL.createObjectURL(wavBlob);
        setActiveAudioUrl(audioUrl);
        
        const analysisData: AnalysisResult = { landmarkName, history, sources, audioDataUrl: audioUrl, details, discovery, rating: undefined };
        setAnalysisResult(analysisData);
        setAppState(AppState.SUCCESS);
        
        const thumbnailUrl = await createThumbnail(imgUrl);
        const newItem: HistoryItem = { id: new Date().toISOString(), imageUrl: thumbnailUrl, landmarkName, history, sources, details, discovery, rating: undefined };
        
        setHistory(prevHistory => {
            const existingItem = prevHistory.find(item => item.landmarkName === newItem.landmarkName);
            if (existingItem) {
                newItem.rating = existingItem.rating;
                const filteredHistory = prevHistory.filter(item => item.landmarkName !== newItem.landmarkName);
                const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
                saveHistory(updatedHistory);
                return updatedHistory;
            }
            const updatedHistory = [newItem, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
            saveHistory(updatedHistory);
            return updatedHistory;
        });
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred. Please try again.');
        setRawError(err.stack || String(err));
        setAppState(AppState.ERROR);
      } finally {
        setLoadingMessage('');
      }
    };
    reader.onerror = () => {
        setError('Failed to read the image file.');
        setRawError('FileReader onerror event triggered.');
        setAppState(AppState.ERROR);
    }
  }, [isOffline]);
  
  const handleSelectHistoryItem = async (item: HistoryItem) => {
    const audioBase64 = await narrateText(item.history);
    const pcmData = decodeBase64(audioBase64);
    const wavBlob = pcmToWav(pcmData, 24000, 1, 16);
    const audioUrl = URL.createObjectURL(wavBlob);
    setActiveAudioUrl(audioUrl);
    setImageUrl(item.imageUrl);
    setAnalysisResult({ ...item, sources: item.sources || [], audioDataUrl: audioUrl });
    setAppState(AppState.SUCCESS);
    setShowHistory(false);
    setDetailedHistory(null);
  };

  const handleSetRating = (landmarkName: string, rating: number) => {
    setHistory(prevHistory => {
        const updatedHistory = prevHistory.map(item =>
            item.landmarkName === landmarkName ? { ...item, rating } : item
        );
        saveHistory(updatedHistory);
        return updatedHistory;
    });
    setAnalysisResult(prevResult => prevResult && prevResult.landmarkName === landmarkName ? { ...prevResult, rating } : prevResult);
  };

  const handleFetchDetailedHistory = useCallback(async (landmarkName: string) => {
    setIsFetchingDetailedHistory(true);
    setDetailedHistory(null);
    try {
        const detailed = await fetchDetailedLandmarkHistory(landmarkName);
        setDetailedHistory(detailed);
    } catch (err: any) {
        setDetailedHistory("Could not load detailed history at this time. Please try again later.");
    } finally {
        setIsFetchingDetailedHistory(false);
    }
  }, []);

  const handleToggleArView = () => setShowArView(prev => !prev);

  const renderContent = () => {
    if (showHistory) {
      return <HistoryLog items={history} onSelect={handleSelectHistoryItem} onClose={() => setShowHistory(false)} />;
    }
    switch (appState) {
      case AppState.ANALYZING: return <LoadingSpinner message={loadingMessage} />;
      case AppState.SUCCESS: return analysisResult && imageUrl && (
        <ResultDisplay imageUrl={imageUrl} result={analysisResult} onReset={resetState} onToggleArView={handleToggleArView} onSetRating={handleSetRating} voiceCommand={null} onCommandExecuted={() => {}} onFetchDetailedHistory={handleFetchDetailedHistory} detailedHistory={detailedHistory} isFetchingDetailedHistory={isFetchingDetailedHistory}/>
      );
      case AppState.ERROR: return <ErrorDisplay message={error || 'An error occurred.'} rawError={rawError} onRetry={resetState} />;
      default: return <ImageUploader ref={imageUploaderRef} onImageUpload={handleImageUpload} />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
        {history.length > 0 && appState !== AppState.ANALYZING && !showHistory && (
             <button onClick={() => setShowHistory(true)} className="absolute top-0 right-0 p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors z-20" aria-label="View history">
                <HistoryIcon className="w-7 h-7" />
             </button>
        )}
        {renderContent()}
        {showArView && analysisResult && <ArView landmarkName={analysisResult.landmarkName} onClose={handleToggleArView} />}
    </div>
  );
};

export default PhotoTourView;