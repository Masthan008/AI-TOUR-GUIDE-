import React from 'react';
import { CameraIcon } from './Icons';

interface HeaderProps {
}

export const Header: React.FC<HeaderProps> = () => {
    return (
        <header className="w-full max-w-4xl mb-6 md:mb-10 text-center relative z-10 animate-slide-up-fade-in">
            <div className="flex items-center justify-center mb-2">
                <CameraIcon className="w-8 h-8 md:w-10 md:h-10 mr-3 text-sky-400" />
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-violet-400">
                    AI Multitool
                </h1>
            </div>
            <p className="text-gray-400">Explore, create, and converse with the power of AI.</p>
        </header>
    );
};