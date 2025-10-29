import React from 'react';
import { AppView } from '../types';
import { LandmarkIcon, SparklesIcon, ChatBubbleIcon, WaveformIcon } from './Icons';

interface BottomNavBarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

interface NavItem {
  id: AppView;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
  { id: 'tour', label: 'Tour', icon: LandmarkIcon },
  { id: 'create', label: 'Create', icon: SparklesIcon },
  { id: 'chat', label: 'Chat', icon: ChatBubbleIcon },
  { id: 'converse', label: 'Converse', icon: WaveformIcon },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, setView }) => {
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-sm h-16 glass-pane z-50">
      <ul className="flex justify-around items-center h-full px-4">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 rounded-lg ${
                currentView === item.id ? 'text-sky-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label={item.label}
              aria-current={currentView === item.id}
            >
              <item.icon className={`w-6 h-6 mb-1 transition-transform duration-200 ${currentView === item.id ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};