
import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { CloseIcon, HistoryIcon, StarIcon } from './Icons';

interface HistoryLogProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => Promise<void>;
  onClose: () => void;
}

const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

export const HistoryLog: React.FC<HistoryLogProps> = ({ items, onSelect, onClose }) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const handleItemSelect = async (item: HistoryItem) => {
    if (loadingItemId) return;
    setLoadingItemId(item.id);
    try {
      await onSelect(item);
    } catch (error) {
      console.error("Failed to load history item.", error);
      setLoadingItemId(null); // Reset on error to allow user to try again
    }
  };

  return (
    <div className="w-full max-w-2xl p-4 sm:p-6 bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/30 border border-white/10 animate-slide-up-fade-in">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
                <HistoryIcon className="h-6 w-6 text-sky-300 mr-3" />
                <h2 className="text-xl font-bold text-white">Your Tour History</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors" aria-label="Close history">
                <CloseIcon className="h-6 w-6" />
            </button>
        </div>

        {items.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Your history is empty. Analyze a photo to start your collection!</p>
        ) : (
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {items.map(item => (
                    <li key={item.id}>
                        <button
                            onClick={() => handleItemSelect(item)}
                            disabled={loadingItemId !== null}
                            className="w-full flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-not-allowed group"
                        >
                            <img src={item.imageUrl} alt={item.landmarkName} className="w-16 h-12 object-cover rounded-md mr-4 flex-shrink-0 border border-white/10" loading="lazy" />
                            <div className="flex-grow overflow-hidden">
                                <p className="font-medium text-gray-200 truncate group-hover:text-white">{item.landmarkName}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-400">{formatDate(item.id)}</p>
                                    {item.rating && item.rating > 0 && (
                                        <div className="flex items-center">
                                            {[...Array(5)].map((_, i) => (
                                                <StarIcon 
                                                    key={i} 
                                                    className={`w-3 h-3 ${i < item.rating! ? 'text-yellow-400' : 'text-gray-600'}`} 
                                                    fill="currentColor"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {loadingItemId === item.id && (
                                <div className="ml-4 flex items-center text-xs text-gray-300 flex-shrink-0">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Loading Tour...</span>
                                </div>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        )}
    </div>
  );
};