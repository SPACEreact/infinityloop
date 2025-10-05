
import React from 'react';
import { SparklesIcon } from './IconComponents';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex items-center gap-2 text-gray-400">
            <SparklesIcon className="w-5 h-5 animate-pulse" />
            <span>Thinking...</span>
        </div>
    );
};

export default LoadingSpinner;
