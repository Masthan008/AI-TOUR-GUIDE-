import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import PhotoTourView from './PhotoTourView';
import CreateStudioView from './CreateStudioView';
import ChatView from './ChatView';
import ConverseView from './ConverseView';
import { BottomNavBar } from './components/BottomNavBar';
import { AppView } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('tour');

  const renderContent = () => {
    switch (view) {
      case 'tour':
        return <PhotoTourView />;
      case 'create':
        return <CreateStudioView />;
      case 'chat':
        return <ChatView />;
      case 'converse':
        return <ConverseView />;
      default:
        return <PhotoTourView />;
    }
  };

  return (
    <div className="min-h-screen text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 relative">
      <Header />
      <main className="w-full max-w-4xl flex-grow flex flex-col items-center justify-center z-10 pb-24">
        {renderContent()}
      </main>
      <Footer />
      <BottomNavBar currentView={view} setView={setView} />
    </div>
  );
};

export default App;