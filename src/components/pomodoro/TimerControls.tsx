"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';
import type { TimerState } from '@/types/pomodoro';

interface TimerControlsProps {
  timerState: TimerState;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

const TimerControls: React.FC<TimerControlsProps> = ({ timerState, onStart, onPause, onStop }) => {
  return (
    <div className="flex justify-center space-x-4 my-6">
      {timerState !== 'running' ? (
        <Button
          onClick={onStart}
          aria-label="Start timer"
          className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 text-lg rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105"
        >
          <Play className="mr-2 h-5 w-5" /> Start
        </Button>
      ) : (
        <Button
          onClick={onPause}
          aria-label="Pause timer"
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10 px-6 py-3 text-lg rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105"
        >
          <Pause className="mr-2 h-5 w-5" /> Pause
        </Button>
      )}
      <Button
        onClick={onStop}
        aria-label="Stop timer and reset"
        variant="destructive"
        className="px-6 py-3 text-lg rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105"
        disabled={timerState === 'stopped'}
      >
        <Square className="mr-2 h-5 w-5" /> Stop
      </Button>
    </div>
  );
};

export default TimerControls;
