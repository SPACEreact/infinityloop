import React from 'react';
import { FracturedLoopLogo } from './IconComponents';

interface WorkspaceHeaderProps {
  appLabel: string;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  appLabel,
  isChatOpen,
  onToggleChat
}) => {
  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-700">
      <div></div>
      
      <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
        <FracturedLoopLogo className="w-10 h-10" />
        <h1 className="text-2xl font-bold text-white/90 tracking-wide">
          L<span className="inline-block mx-1 text-3xl bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent">∞</span>P
          <span className="text-xs block text-center text-white/60 font-light tracking-wider">idea to visualisation</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleChat}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
            isChatOpen 
              ? 'bg-gradient-to-r from-pink-400/80 to-purple-400/80 text-white shadow-lg hover:shadow-xl' 
              : 'bg-gradient-to-r from-pink-300/60 to-purple-300/60 text-gray-700 hover:from-pink-400/70 hover:to-purple-400/70 hover:text-white shadow-md hover:shadow-lg'
          }`}
          style={{
            background: isChatOpen
              ? 'linear-gradient(145deg, #f472b6, #a855f7)' 
              : 'linear-gradient(145deg, #fce7f3, #e0e7ff)',
            boxShadow: isChatOpen
              ? '0 8px 25px rgba(244, 114, 182, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
              : '0 6px 20px rgba(244, 114, 182, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '2px solid rgba(255,255,255,0.3)'
          }}
        >
          <span className="flex items-center gap-2">
            {isChatOpen ? '💬 Chat Active' : '🤖 Chat Assistant'}
            {isChatOpen && <span className="animate-pulse">●</span>}
          </span>
        </button>
      </div>
    </header>
  );
};

export default WorkspaceHeader;