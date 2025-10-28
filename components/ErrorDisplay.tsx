import React from 'react';
import { AlertIcon } from './Icons';

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  return (
    <div className="text-center p-8 bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl shadow-red-500/10 border border-red-500/50 max-w-md w-full animate-slide-up-fade-in">
      <AlertIcon className="mx-auto h-12 w-12 text-red-400" />
      <h3 className="mt-4 text-xl font-semibold text-white">Analysis Failed</h3>
      <p className="mt-2 text-sm text-red-200/80">
        {message}
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:opacity-90 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};