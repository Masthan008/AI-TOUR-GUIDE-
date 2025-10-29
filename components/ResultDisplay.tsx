import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnalysisResult, SimilarImage, NearbyPlace } from '../types';
import { LandmarkIcon, LinkIcon, ShareIcon, PlayIcon, PauseIcon, CubeIcon, CalendarIcon, BuildingIcon, StarIcon, ZoomInIcon, LightbulbIcon, MapPinIcon, VolumeUpIcon, VolumeOffIcon, SpinnerIcon, SparklesIcon, ImageIcon, AlertIcon } from './Icons';
import { ImageZoomModal } from './ImageZoomModal';
import { LoadingSpinner } from './LoadingSpinner';
import { fetchNearbyPlaces } from '../services/geminiService';

interface ResultDisplayProps {
  imageUrl: string;
  result: AnalysisResult;
  onReset: () => void;
  onToggleArView: () => void;
  onSetRating: (landmarkName: string, rating: number) => void;
  voiceCommand: string | null;
  onCommandExecuted: () => void;
  onFetchDetailedHistory: (landmarkName: string) => void;
  detailedHistory: string | null;
  isFetchingDetailedHistory: boolean;
}

const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};


export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    imageUrl, result, onReset, onToggleArView, onSetRating, voiceCommand, onCommandExecuted,
    onFetchDetailedHistory, detailedHistory, isFetchingDetailedHistory 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [isRatedMessageVisible, setIsRatedMessageVisible] = useState(false);
  const [isMainImageLoaded, setIsMainImageLoaded] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(true);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    setIsFetchingPlaces(true);
    setGeolocationError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const places = await fetchNearbyPlaces(result.landmarkName, position.coords.latitude, position.coords.longitude);
            setNearbyPlaces(places);
          } catch (error) {
            console.error("Error fetching nearby places:", error);
            setGeolocationError("Could not fetch nearby places at this time.");
          } finally {
            setIsFetchingPlaces(false);
          }
        },
        (error) => {
          console.error("Error getting geolocation:", error);
           if (error.code === error.PERMISSION_DENIED) {
            setGeolocationError("Location access denied. Please enable location services in your browser settings to see nearby places.");
          } else {
            setGeolocationError("Could not determine your location. Please ensure location services are enabled.");
          }
          setIsFetchingPlaces(false);
        }
      );
    } else {
      setGeolocationError("Geolocation is not supported by your browser.");
      setIsFetchingPlaces(false);
    }
  }, [result.landmarkName]);


  useEffect(() => {
    if (!voiceCommand) return;

    switch (voiceCommand) {
        case 'play':
            if (!isPlaying) togglePlayPause();
            break;
        case 'pause':
            if (isPlaying) togglePlayPause();
            break;
        case 'share':
            handleShare();
            break;
    }
    onCommandExecuted();
  }, [voiceCommand, isPlaying, onCommandExecuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnd = () => setIsPlaying(false);
    const handleVolumeChange = () => {
        setVolume(audio.volume);
        setIsMuted(audio.muted);
    };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnd);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handleCanPlay);
    audio.addEventListener('canplay', handleCanPlay);
    
    if (audio.readyState < 3) {
        setIsBuffering(true);
    }

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handleCanPlay);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (audio && !isBuffering) {
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
  
  const toggleMute = () => {
    const audio = audioRef.current;
    if(audio) {
        audio.muted = !audio.muted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if(audio) {
        const newVolume = Number(e.target.value);
        audio.volume = newVolume;
        if(newVolume > 0 && audio.muted) {
            audio.muted = false;
        }
    }
  };

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

  const handleRating = (newRating: number) => {
    onSetRating(result.landmarkName, newRating);
    setIsRatedMessageVisible(true);
    setTimeout(() => setIsRatedMessageVisible(false), 2500);
  };
  
  return (
    <>
      <div className="w-full max-w-4xl p-4 sm:p-6 bg-black/20 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-xl border border-white/10 animate-slide-up-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col">
              <div 
                className="relative group cursor-pointer rounded-lg shadow-lg shadow-black/40 mb-4 overflow-hidden aspect-video bg-black/20 border border-white/10 flex items-center justify-center" 
                onClick={() => setIsZoomed(true)}
                aria-label={`Enlarge photo of ${result.landmarkName}`}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsZoomed(true); }}
              >
                  {!isMainImageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-0">
                          <ImageIcon className="w-12 h-12 animate-pulse" />
                      </div>
                  )}
                  <img 
                      src={imageUrl} 
                      alt={`Uploaded landmark, ${result.landmarkName}`} 
                      className={`w-full h-auto object-cover transition-all duration-500 group-hover:scale-105 relative z-10 ${isMainImageLoaded ? 'opacity-100' : 'opacity-0'}`} 
                      loading="lazy" 
                      onLoad={() => setIsMainImageLoaded(true)}
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                    <ZoomInIcon className="w-12 h-12 text-white" />
                  </div>
              </div>
              <div className="flex-grow flex flex-col justify-center bg-black/20 p-4 rounded-lg border border-white/10">
                  <div className="flex items-center mb-3">
                      <LandmarkIcon className="h-6 w-6 text-sky-300 mr-3"/>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">{result.landmarkName}</h2>
                  </div>
                  <div className="w-full">
                      <audio ref={audioRef} src={result.audioDataUrl} preload="metadata" />
                      <div className="flex items-center gap-3">
                          <button onClick={togglePlayPause} className="p-2 rounded-full bg-sky-500/20 text-sky-300 hover:bg-sky-500/40 transition-all active:scale-90 disabled:cursor-not-allowed" aria-label={isPlaying ? `Pause audio tour of ${result.landmarkName}` : `Play audio tour of ${result.landmarkName}`} disabled={isBuffering}>
                              {isBuffering && !isPlaying ? <SpinnerIcon className="w-6 h-6 animate-spin" /> : (isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />)}
                          </button>
                          <span className="text-xs text-gray-400 w-12 text-center">{formatTime(currentTime)}</span>
                          <input
                              type="range"
                              min="0"
                              max={duration || 0}
                              value={currentTime}
                              onChange={handleScrubberChange}
                              className="w-full h-1.5 bg-gray-600/50 rounded-lg appearance-none cursor-pointer range-thumb"
                              style={{'--thumb-color': '#38bdf8'} as React.CSSProperties}
                              aria-label={`Audio scrubber for ${result.landmarkName} tour`}
                          />
                          <span className="text-xs text-gray-400 w-12 text-center">{formatTime(duration)}</span>
                          <div className="flex items-center group">
                            <button onClick={toggleMute} className="p-1 text-gray-300 hover:text-white" aria-label={isMuted || volume === 0 ? `Unmute audio for ${result.landmarkName}` : `Mute audio for ${result.landmarkName}`}>
                                {isMuted || volume === 0 ? <VolumeOffIcon className="w-5 h-5" /> : <VolumeUpIcon className="w-5 h-5" />}
                            </button>
                            <div className="w-0 group-hover:w-20 transition-all duration-300 overflow-hidden">
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1.5 ml-1 bg-gray-600/50 rounded-lg appearance-none cursor-pointer range-thumb"
                                    style={{'--thumb-color': '#38bdf8'} as React.CSSProperties}
                                    aria-label={`Volume control for ${result.landmarkName}`}
                                />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-black/20 rounded-full px-1 border border-white/10">
                              {playbackRates.map(rate => (
                                  <button
                                      key={rate}
                                      onClick={() => changePlaybackRate(rate)}
                                      className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${playbackRate === rate ? 'bg-sky-500 text-white' : 'text-gray-300 hover:bg-white/10'}`}
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
                  <h3 className="text-xl font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-400">Your AI Tour Guide Says...</h3>
                  <p className="text-gray-300 leading-relaxed text-justify">{result.history}</p>
              </div>

               <div className="border-t border-white/10 pt-4">
                <h3 className="text-xl font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Deep Dive</h3>
                {isFetchingDetailedHistory ? (
                  <div className="flex justify-center items-center py-4">
                    <LoadingSpinner message="Thinking..." />
                  </div>
                ) : detailedHistory ? (
                  <p className="text-gray-300 leading-relaxed text-justify whitespace-pre-wrap">{detailedHistory}</p>
                ) : (
                  <button
                    onClick={() => onFetchDetailedHistory(result.landmarkName)}
                    className="w-full flex justify-center items-center gap-2 bg-violet-700/50 border border-white/10 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 transition-all duration-200 ease-in-out active:scale-95"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    <span>Get Detailed History with Thinking Mode</span>
                  </button>
                )}
              </div>

              {result.details && (
                <div className="border-t border-white/10 pt-4">
                    <h3 className="text-xl font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-400">Landmark Snapshot</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                        <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                            <CalendarIcon className="h-7 w-7 mx-auto mb-2 text-sky-400" />
                            <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wider">Built</h4>
                            <p className="text-gray-100 font-medium mt-1">{result.details.constructionDate}</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                            <BuildingIcon className="h-7 w-7 mx-auto mb-2 text-sky-400" />
                            <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wider">Style</h4>
                            <p className="text-gray-100 font-medium mt-1">{result.details.architecturalStyle}</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                            <StarIcon className="h-7 w-7 mx-auto mb-2 text-sky-400" />
                            <h4 className="font-bold text-sm text-gray-400 uppercase tracking-wider">Significance</h4>
                            <p className="text-gray-100 font-medium mt-1 text-sm">{result.details.significance}</p>
                        </div>
                    </div>
                </div>
              )}

              <div className="border-t border-white/10 pt-4">
                  <h3 className="text-xl font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Explore Nearby</h3>
                  {isFetchingPlaces ? <LoadingSpinner message="Finding nearby places..." /> :
                    geolocationError ? <p className="text-yellow-400 text-sm text-center p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">{geolocationError}</p> :
                    nearbyPlaces.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {nearbyPlaces.map((place) => (
                                <div key={place.name} className="bg-black/20 p-3 rounded-lg border border-white/10">
                                    <h4 className="font-bold text-sm text-gray-200">{place.name}</h4>
                                    <p className="text-xs text-gray-400">{place.shortFormattedAddress}</p>
                                    <p className="text-xs text-sky-400 mt-1 capitalize">{place.types.join(', ').replace(/_/g, ' ')}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm text-center">Could not find nearby places.</p>
                    )
                  }
              </div>

              {result.sources && result.sources.length > 0 && (
                  <div className="border-t border-white/10 pt-4">
                      <h4 className="text-lg font-semibold mb-2 flex items-center text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-400">
                          <LinkIcon className="h-5 w-5 mr-2 text-sky-400"/>
                          Sources
                      </h4>
                      <ul className="space-y-1 text-sm list-disc list-inside">
                          {result.sources.slice(0, 3).map((source, index) => (
                              <li key={index}>
                                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 hover:underline transition-colors duration-200">
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
                  className="w-full flex justify-center items-center gap-2 bg-gray-700/50 border border-white/10 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-gray-500 transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                  aria-label={`Share tour of ${result.landmarkName}`}
                >
                    <ShareIcon className="w-5 h-5" />
                    <span>{isCopied ? 'Copied to Clipboard!' : 'Share Tour'}</span>
                </button>
                <button
                  onClick={onToggleArView}
                  className="w-full flex justify-center items-center gap-2 bg-gray-700/50 border border-white/10 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-gray-500 transition-all duration-200 ease-in-out active:scale-95"
                  aria-label={`Open AR View for ${result.landmarkName}`}
                >
                    <CubeIcon className="w-5 h-5" />
                    <span>AR View</span>
                </button>
                <button
                  onClick={onReset}
                  className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-all duration-200 ease-in-out active:scale-95 shadow-lg shadow-cyan-500/20"
                  aria-label="Analyze another photo"
                >
                  Analyze Another Photo
                </button>
               </div>
          </div>
        </div>
      </div>
      {isZoomed && (
          <ImageZoomModal 
              imageUrl={imageUrl}
              altText={`Zoomed view of ${result.landmarkName}`}
              onClose={() => setIsZoomed(false)}
          />
      )}
    </>
  );
};