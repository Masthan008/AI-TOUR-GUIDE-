
import React from 'react';
import { CameraIcon, HistoryIcon } from './Icons';

interface HeaderProps {
    onToggleHistory?: () => void;
    showHistoryButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleHistory, showHistoryButton = false }) => {
    return (
        <header className="w-full max-w-4xl mb-6 md:mb-10 text-center relative">
            <div className="flex items-center justify-center mb-2">
                <CameraIcon className="w-8 h-8 md:w-10 md:h-10 mr-3 text-cyan-400" />
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-400">
                    AI Photo Tour Guide
                </h1>
            </div>
            <p className="text-gray-400">Snap a landmark, get an instant audio tour.</p>
            {showHistoryButton && (
                <button 
                    onClick={onToggleHistory}
                    className="absolute right-0 top-0 p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    aria-label="View history"
                >
                    <HistoryIcon className="w-7 h-7" />
                </button>
            )}
        </header>
    );
};
