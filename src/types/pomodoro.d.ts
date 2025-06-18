export type TimerMode = 'work' | 'break';
export type TimerState = 'stopped' | 'running' | 'paused';

export interface PomodoroSettingsValues {
  workDuration: number;
  breakDuration: number;
}
