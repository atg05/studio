"use client";

import React from 'react';

interface TimerDisplayProps {
  currentTimeInSeconds: number;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ currentTimeInSeconds }) => {
  const minutes = Math.floor(currentTimeInSeconds / 60);
  const seconds = currentTimeInSeconds % 60;

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="my-8 text-center">
      <h2
        className="text-7xl md:text-8xl font-bold font-mono text-primary tabular-nums"
        aria-live="polite"
        aria-atomic="true"
        role="timer"
      >
        {formattedTime}
      </h2>
    </div>
  );
};

export default TimerDisplay;
