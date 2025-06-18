import type { Timestamp } from 'firebase/firestore';

export type TimerMode = 'work' | 'break';
export type TimerState = 'stopped' | 'running' | 'paused';

export interface PomodoroSettingsValues {
  workDuration: number;
  breakDuration: number;
}

export interface PomodoroLogEntry {
  id: string;
  sessionId: string; // Will store coupleSessionID
  date: Timestamp | Date; 
  mode: TimerMode;
  durationMinutes: number;
}

// Represents the shared state in Firestore
export interface SharedPomodoroState {
  currentTime: number;
  timerState: TimerState;
  currentMode: TimerMode;
  workDuration: number;
  breakDuration: number;
  lastUpdatedBy: string | null;
  timestamp: Timestamp;
}
