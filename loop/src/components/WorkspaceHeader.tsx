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

  const headerClassName = `workspace-header flex items-center p-4 ${
    isLight ? 'workspace-header--classic' : ''
  }`;

  const appBadgeClassName = `hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${
    isLight
      ? 'bg-white/10 border-white/30 text-white/80'
      : 'bg-[hsl(var(--card)/0.7)] border-[hsl(var(--border))] ink-subtle'
  }`;

  const titleClassName = `text-5xl font-bold text-center tracking-wide ${
    isLight ? 'text-white/90' : 'ink-strong'
  }`;

  const subtitleClassName = `text-sm md:text-base lg:text-lg text-center font-light tracking-wider uppercase ${
    isLight ? 'text-white/70' : 'ink-subtle'
  }`;

  const themeToggleClassName = `theme-toggle ${
    isLight ? 'theme-toggle--classic' : 'theme-toggle--dark'
  }`;

  const chatButtonClassName = `workspace-header__chat-button ${
    isChatOpen ? 'is-open' : ''
  } ${isLight ? 'workspace-header__chat-button--classic' : ''}`;

  const chatButtonStyle = isLight
    ? {
        background: isChatOpen
          ? 'linear-gradient(145deg, #f472b6, #a855f7)'
          : 'linear-gradient(145deg, #fce7f3, #e0e7ff)',
        boxShadow: isChatOpen
          ? '0 8px 25px rgba(244, 114, 182, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
          : '0 6px 20px rgba(244, 114, 182, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
        border: '2px solid rgba(255,255,255,0.3)',
        color: isChatOpen ? '#ffffff' : '#374151'
      }
    : undefined;

  return (
    <header className={headerClassName}>
      <div className="flex-1 flex items-center gap-3">
        <div className={appBadgeClassName}>
          <FracturedLoopLogo className="w-8 h-8" title="Loop" />
          <span
            className={`text-sm font-semibold uppercase tracking-[0.2em] ${
              isLight ? 'text-white/70' : 'ink-subtle'
            }`}
          >
            {appLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 px-6 py-3 rounded-2xl">
        <h1 className={titleClassName}>
          L
          <span className="inline-block mx-1 text-6xl bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent">
            ∞
          </span>
          P
        </h1>
        <span className={subtitleClassName}>
          Idea to Visualization
        </span>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className={themeToggleClassName}
          aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          <span className="theme-toggle__icon" aria-hidden="true">{isLight ? '🌞' : '🌜'}</span>
          <span className="hidden md:inline text-sm font-medium">
            {isLight ? 'Light mode' : 'Dark mode'}
          </span>
        </button>
        <button
          onClick={onToggleChat}
          className={chatButtonClassName}
          style={chatButtonStyle}
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
