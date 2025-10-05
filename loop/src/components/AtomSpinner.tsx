import React from 'react';

const AtomSpinner = () => {
  return (
    <div className="atom-spinner" aria-label="Loading">
      <div className="atom-spinner-inner">
        <div className="orbit orbit1"></div>
        <div className="orbit orbit2"></div>
        <div className="orbit orbit3"></div>
        <div className="core"></div>
      </div>
    </div>
  );
};

export default AtomSpinner;
