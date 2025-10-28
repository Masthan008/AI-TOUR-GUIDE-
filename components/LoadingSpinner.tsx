import React from 'react';

interface LoadingSpinnerProps {
    message: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 animate-slide-up-fade-in">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-sky-400 rounded-full animate-spin"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-b-cyan-400 rounded-full animate-spin" style={{animationDuration: '1.5s'}}></div>
      </div>
      <p className="mt-4 text-lg font-medium text-gray-300">{message}</p>
    </div>
  );
};