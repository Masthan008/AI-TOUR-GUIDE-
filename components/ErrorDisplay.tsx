
import React from 'react';
import { AlertIcon } from './Icons';

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  return (
    <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg border border-red-500/50 max-w-md w-full">
      <AlertIcon className="mx-auto h-12 w-12 text-red-400" />
      <h3 className="mt-2 text-xl font-semibold text-white">Analysis Failed</h3>
      <p className="mt-2 text-sm text-gray-400">
        {message}
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};
