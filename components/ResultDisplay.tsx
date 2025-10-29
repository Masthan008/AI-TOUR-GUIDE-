import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, SimilarImage } from '../types';
import { LandmarkIcon, LinkIcon, ShareIcon, PlayIcon, PauseIcon, CubeIcon, CalendarIcon, BuildingIcon, StarIcon, ZoomInIcon, LightbulbIcon, MapPinIcon, VolumeUpIcon, VolumeOffIcon, SpinnerIcon, SparklesIcon, ImageIcon } from './Icons';
import { ImageZoomModal } from './ImageZoomModal';
import { LoadingSpinner } from './LoadingSpinner';
import { fetchSimilarLandmarkInfo, generateSimilarImage } from '../services/geminiService';

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
  const [similarImages, setSimilarImages] = useState<SimilarImage[] | null>(null);
  const [isFetchingSimilar, setIsFetchingSimilar] = useState(false);
  const [similarImagesError, setSimilarImagesError] = useState<string | null>(null);

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
    
    // Initial check in case the event was missed
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
        // If user changes volume, unmute
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

  const handleFetchSimilarImages = async () => {
    setIsFetchingSimilar(true);
    setSimilarImagesError(null);
    setSimilarImages(null);
    
    try {
        const match = imageUrl.match(/^data:(image\/.+);base64,(.*)$/);
        if (!match) {
            throw new Error("Invalid image URL format");
        }
        const mimeType = match[1];
        const base64Data = match[2];

        const concepts = await fetchSimilarLandmarkInfo(result.landmarkName, mimeType, base64Data);

        if (!concepts || concepts.length === 0) {
            throw new Error("Could not generate concepts for similar images.");
        }
        
        const imagePromises = concepts.map(async (concept) => {
            const generatedImageBase64 = await generateSimilarImage(concept.description);
            return {
                imageUrl: `data:image/png;base64,${generatedImageBase64}`,
                description: concept.description,
            };
        });

        const generatedImages = await Promise.all(imagePromises);
        setSimilarImages(generatedImages);

    } catch (err: any) {
        console.error("Failed to fetch similar images:", err);
        setSimilarImagesError("Could not generate the visual tour. Please try again later.");
    } finally {
        setIsFetchingSimilar(false);
    }
  };


  return (
    <>
      <div className="w-full max-w-4xl p-4 sm:p-6 bg-black/20 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-xl border border-white/10 animate-slide-up-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col">
              <div 
                className="relative group cursor-pointer rounded-lg shadow-lg shadow-black/40 mb-4 overflow-hidden" 
                onClick={() => setIsZoomed(true)}
                aria-label={`Enlarge photo of ${result.landmarkName}`}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsZoomed(true); }}
              >
                  <img src={imageUrl} alt={`Uploaded landmark, ${result.landmarkName}`} className="w-full h-auto object-cover aspect-video border border-white/10 transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
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
                    <h3 className="text-xl font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-400">Key Details</h3>
                    <dl className="space-y-3">
                        <div className="flex items-start">
                            <dt className="flex-shrink-0 flex items-center text-gray-400">
                                <CalendarIcon className="h-5 w-5 mr-2 text-sky-400" />
                                <span className="font-semibold">Built:</span>
                            </dt>
                            <dd className="ml-2 text-gray-200">{result.details.constructionDate}</dd>
                        </div>
                        <div className="flex items-start">
                            <dt className="flex-shrink-0 flex items-center text-gray-400">
                                <BuildingIcon className="h-5 w-5 mr-2 text-sky-400" />
                                <span className="font-semibold">Style:</span>
                            </dt>
                            <dd className="ml-2 text-gray-200">{result.details.architecturalStyle}</dd>
                        </div>
                        <div className="flex items-start">
                            <dt className="flex-shrink-0 flex items-center text-gray-400">
                                <StarIcon className="h-5 w-5 mr-2 text-sky-400" />
                                <span className="font-semibold">Significance:</span>
                            </dt>
                            <dd className="ml-2 text-gray-200">{result.details.significance}</dd>
                        </div>
                    </dl>
                </div>
              )}
             
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-xl font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-400">Your Rating</h3>
                <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
                    <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, index) => {
                            const ratingValue = index + 1;
                            return (
                                <button
                                    key={ratingValue}
                                    onClick={() => handleRating(ratingValue)}
                                    onMouseEnter={() => setHoverRating(ratingValue)}
                                    className="p-1 transition-transform duration-150 ease-in-out hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-yellow-400 rounded-full"
                                    aria-label={`Rate ${ratingValue} out of 5 stars`}
                                >
                                    <StarIcon 
                                        className={`w-7 h-7 transition-colors ${ratingValue <= (hoverRating || result.rating || 0) ? 'text-yellow-400' : 'text-gray-500'}`} 
                                        fill="currentColor"
                                    />
                                </button>
                            );
                        })}
                    </div>
                    {isRatedMessageVisible && <span className="ml-4 text-sm text-green-400" style={{animation: 'fade-in 0.5s'}}>Thanks for rating!</span>}
                </div>
              </div>

              {result.discovery && (result.discovery.funFact || result.discovery.nearbyAttractions.length > 0) && (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-xl font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-400">Discover More</h3>
                  
                  {result.discovery.funFact && (
                    <div className="mb-4 p-3 bg-black/20 rounded-lg border border-white/10">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                          <LightbulbIcon className="h-5 w-5 text-yellow-300" />
                        </div>
                        <div className="ml-3">
                            <h4 className="font-semibold text-yellow-300">Fun Fact</h4>
                            <p className="text-gray-200 italic">"{result.discovery.funFact}"</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.discovery.nearbyAttractions.length > 0 && (
                    <div>
                      <div className="flex items-center mb-2">
                        <MapPinIcon className="h-5 w-5 mr-2 text-green-400" />
                        <h4 className="font-semibold text-gray-200">Nearby Attractions:</h4>
                      </div>
                      <ul className="space-y-2 pl-7 list-disc list-outside text-gray-300 marker:text-green-400">
                        {result.discovery.nearbyAttractions.map((attraction, index) => (
                          <li key={index} className="text-sm">
                            <strong className="text-gray-100">{attraction.name}:</strong>
                            <span className="text-gray-300 ml-1">{attraction.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            
              <div className="border-t border-white/10 pt-4">
                  <h3 className="text-xl font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Visual Tour</h3>
                  {isFetchingSimilar ? (
                      <LoadingSpinner message="Generating visual tour..." />
                  ) : similarImagesError ? (
                      <p className="text-center text-red-400">{similarImagesError}</p>
                  ) : similarImages ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {similarImages.map((image, index) => (
                              <div key={index} className="group relative overflow-hidden rounded-lg border border-white/10 shadow-lg">
                                  <img src={image.imageUrl} alt={image.description} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-end">
                                      <p className="text-xs text-white/90">{image.description}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <button
                          onClick={handleFetchSimilarImages}
                          className="w-full flex justify-center items-center gap-2 bg-violet-700/50 border border-white/10 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 transition-all duration-200 ease-in-out active:scale-95"
                      >
                          <ImageIcon className="w-5 h-5" />
                          <span>Generate a Visual Tour</span>
                      </button>
                  )}
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