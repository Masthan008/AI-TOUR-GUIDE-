import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="w-full text-center pt-4 pb-20 mt-auto signature-animation">
            <p className="text-sm text-gray-500">
                A Project by <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">Masthan Valli</span>
            </p>
        </footer>
    );
};