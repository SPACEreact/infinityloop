import React from 'react';
import { SparklesIcon } from './IconComponents';

interface FloatingOutputButtonProps {
  onOpenModal: () => void;
}

const FloatingOutputButton: React.FC<FloatingOutputButtonProps> = ({ onOpenModal }) => {
  return (
    <div className="absolute bottom-4 right-4 z-20">
      <button
        onClick={onOpenModal}
        className="px-4 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all duration-300 group"
        style={{
          background: 'radial-gradient(circle at 20% 20%, rgba(103, 90, 205, 0.95), rgba(38, 31, 74, 0.95))',
          boxShadow: '0 10px 35px rgba(42, 33, 88, 0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
          border: '1px solid rgba(168, 148, 255, 0.35)',
          color: 'white',
          borderRadius: '12px'
        }}
        title="View Final Outputs"
      >
        <span className="rounded-full bg-white/10 p-1.5 transition-transform duration-300 group-hover:rotate-12">
          <SparklesIcon className="w-5 h-5" />
        </span>
        <span>Final Output</span>
      </button>
    </div>
  );
};

export default FloatingOutputButton;