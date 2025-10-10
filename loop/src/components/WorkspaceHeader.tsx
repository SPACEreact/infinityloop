import React from 'react';
import { FracturedLoopLogo } from './IconComponents';
import { useTheme } from '../state/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <header className="workspace-header flex items-center p-4">
      <div className="flex-1 flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--card)/0.7)] border border-[hsl(var(--border))] shadow-sm">
          <FracturedLoopLogo className="w-8 h-8" title="Loop" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em] ink-subtle">{appLabel}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 px-6 py-3 rounded-2xl">
        <h1 className="text-5xl font-bold text-center ink-strong tracking-wide">
          L
          <span className="inline-block mx-1 text-6xl bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent">
            ∞
          </span>
          P
        </h1>
        <span className="text-sm md:text-base lg:text-lg text-center ink-subtle font-light tracking-wider uppercase">
          Idea to Visualization
        </span>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className={`theme-toggle ${isLight ? 'theme-toggle--light' : 'theme-toggle--dark'}`}
          aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          <span className="theme-toggle__icon" aria-hidden="true">{isLight ? '🌞' : '🌜'}</span>
          <span className="hidden md:inline text-sm font-medium">
            {isLight ? 'Light mode' : 'Dark mode'}
          </span>
        </button>
        <button
          onClick={onToggleChat}
          className={`workspace-header__chat-button ${isChatOpen ? 'is-open' : ''}`}
          type="button"
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
