import React, { useState } from 'react';
import { SendIcon } from './Icons';

interface CommandInputProps {
  onSubmit: (command: string) => void;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onSubmit }) => {
  const [command, setCommand] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      onSubmit(command.trim());
      setCommand('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="relative flex items-center">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type a command (e.g., 'show history')"
          aria-label="Command input"
          className="w-full h-14 sm:h-16 pl-4 pr-14 text-base text-white bg-black/40 backdrop-blur-md rounded-full border border-white/20 focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-gray-400 transition-shadow shadow-lg"
        />
        <button
          type="submit"
          aria-label="Submit command"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-sky-500 rounded-full flex items-center justify-center text-white hover:bg-sky-600 transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!command.trim()}
        >
          <SendIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </form>
  );
};
