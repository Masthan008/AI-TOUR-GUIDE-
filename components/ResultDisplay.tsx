import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { LandmarkIcon, LinkIcon, ShareIcon, PlayIcon, PauseIcon } from './Icons';

interface ResultDisplayProps {
  imageUrl: string;
  result: AnalysisResult;
  onReset: () => void;
}

const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};


export const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageUrl, result, onReset }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isCopied, setIsCopied] = useState(false);

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnd);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = Number(e.target.value);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (audio) {
        audio.playbackRate = rate;
        setPlaybackRate(rate);
    }
  }
  
  const handleShare = () => {
      if (navigator.clipboard) {
          const shareText = `I just took a virtual tour of ${result.landmarkName} with the AI Photo Tour Guide! Here's a cool fact:\n\n"${result.history}"`;
          navigator.clipboard.writeText(shareText).then(() => {
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2500);
          }).catch(err => {
              console.error("Failed to copy text:", err);
              alert("Failed to copy to clipboard.");
          })
      }
  }

  return (
    <div className="w-full max-w-4xl p-4 sm:p-6 bg-gray-800/50 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col">
            <img src={imageUrl} alt="Uploaded landmark" className="w-full h-auto object-cover rounded-lg shadow-md mb-4 aspect-video" loading="lazy" />
            <div className="flex-grow flex flex-col justify-center bg-black/20 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                    <LandmarkIcon className="h-6 w-6 text-cyan-300 mr-3"/>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">{result.landmarkName}</h2>
                </div>
                <div className="w-full">
                    {/* Hidden Audio element */}
                    <audio ref={audioRef} src={result.audioDataUrl} preload="metadata" />
                    
                    {/* Custom Player UI */}
                    <div className="flex items-center gap-3">
                        <button onClick={togglePlayPause} className="p-2 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 transition-colors" aria-label={isPlaying ? "Pause" : "Play"}>
                            {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                        </button>
                        <span className="text-xs text-gray-400 w-12 text-center">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleScrubberChange}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
                            aria-label="Audio scrubber"
                        />
                        <span className="text-xs text-gray-400 w-12 text-center">{formatTime(duration)}</span>
                        <div className="flex items-center gap-1 bg-gray-700 rounded-full px-1">
                            {playbackRates.map(rate => (
                                <button
                                    key={rate}
                                    onClick={() => changePlaybackRate(rate)}
                                    className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${playbackRate === rate ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                    aria-label={`Set playback speed to ${rate}x`}
                                >
                                    {rate}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="flex flex-col space-y-4">
            <div>
                <h3 className="text-xl font-semibold mb-2 text-cyan-300">Your AI Tour Guide Says...</h3>
                <p className="text-gray-300 leading-relaxed text-justify">{result.history}</p>
            </div>
          
            {result.sources.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold mb-2 flex items-center text-cyan-300">
                        <LinkIcon className="h-5 w-5 mr-2"/>
                        Sources
                    </h4>
                    <ul className="space-y-1 text-sm list-disc list-inside">
                        {result.sources.slice(0, 3).map((source, index) => (
                            <li key={index}>
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-200">
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleShare}
                disabled={isCopied}
                className="w-full flex justify-center items-center gap-2 bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
              >
                  <ShareIcon className="w-5 h-5" />
                  <span>{isCopied ? 'Copied to Clipboard!' : 'Share Tour'}</span>
              </button>
              <button
                onClick={onReset}
                className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-transform duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
              >
                Analyze Another Photo
              </button>
             </div>
        </div>
      </div>
    </div>
  );
};