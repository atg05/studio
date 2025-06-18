import type { Timestamp } from 'firebase/firestore';

export type TimerMode = 'work' | 'break';
export type TimerState = 'stopped' | 'running' | 'paused';

export interface PomodoroSettingsValues {
  workDuration: number;
  breakDuration: number;
}

export interface PomodoroLogEntry {
  id: string;
  sessionId: string;
  date: Timestamp | Date; // Firestore timestamp, Date when displayed
  mode: TimerMode;
  durationMinutes: number;
}
