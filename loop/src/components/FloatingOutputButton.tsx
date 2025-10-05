import React from 'react';

interface FloatingOutputButtonProps {
  onOpenModal: () => void;
}

const FloatingOutputButton: React.FC<FloatingOutputButtonProps> = ({ onOpenModal }) => {
  return (
    <div className="absolute bottom-4 right-4 z-20">
      <button
        onClick={onOpenModal}
        className="px-4 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg transform hover:scale-110 transition-all duration-300 group"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          border: '2px solid rgba(255,255,255,0.3)',
          color: 'white',
          borderRadius: '12px'
        }}
        title="View Final Outputs"
      >
        <span className="text-lg">✨</span>
        <span>Final Output</span>
      </button>
    </div>
  );
};

export default FloatingOutputButton;