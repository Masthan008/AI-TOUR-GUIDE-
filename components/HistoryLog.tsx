import React from 'react';
import { HistoryItem } from '../types';
import { CloseIcon, HistoryIcon } from './Icons';

interface HistoryLogProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
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
  return (
    <div className="w-full max-w-2xl p-4 sm:p-6 bg-gray-800/50 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
                <HistoryIcon className="h-6 w-6 text-cyan-300 mr-3" />
                <h2 className="text-xl font-bold text-white">Your Tour History</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Close history">
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
                            onClick={() => onSelect(item)}
                            className="w-full flex items-center p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors duration-200 text-left"
                        >
                            <img src={item.imageUrl} alt={item.landmarkName} className="w-16 h-12 object-cover rounded-md mr-4 flex-shrink-0" loading="lazy" />
                            <div className="flex-grow overflow-hidden">
                                <p className="font-medium text-gray-200 truncate">{item.landmarkName}</p>
                                <p className="text-xs text-gray-400">{formatDate(item.id)}</p>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        )}
    </div>
  );
};