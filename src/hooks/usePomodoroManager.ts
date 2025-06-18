"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TimerMode, TimerState, PomodoroSettingsValues } from '@/types/pomodoro';
import { useToast } from "@/hooks/use-toast";

const DEFAULT_WORK_DURATION = 25; // minutes
const DEFAULT_BREAK_DURATION = 5; // minutes

export function usePomodoroManager() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timerState, setTimerState] = useState<TimerState>('stopped');
  const [currentMode, setCurrentMode] = useState<TimerMode>('work');
  const [currentTime, setCurrentTime] = useState<number>(DEFAULT_WORK_DURATION * 60); // in seconds
  const [workDuration, setWorkDuration] = useState<number>(DEFAULT_WORK_DURATION);
  const [breakDuration, setBreakDuration] = useState<number>(DEFAULT_BREAK_DURATION);
  const [isSessionCreator, setIsSessionCreator] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const { toast } = useToast();

  // Load settings from localStorage
  useEffect(() => {
    const storedWorkDuration = localStorage.getItem('pomodoroWorkDuration');
    const storedBreakDuration = localStorage.getItem('pomodoroBreakDuration');

    if (storedWorkDuration) {
      setWorkDuration(parseInt(storedWorkDuration, 10));
    }
    if (storedBreakDuration) {
      setBreakDuration(parseInt(storedBreakDuration, 10));
    }
  }, []);

  // Update currentTime when durations or mode change and timer is stopped/paused
  useEffect(() => {
    if (timerState === 'stopped' || timerState === 'paused') {
      setCurrentTime((currentMode === 'work' ? workDuration : breakDuration) * 60);
    }
  }, [workDuration, breakDuration, currentMode, timerState]);


  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState === 'running' && currentTime > 0) {
      interval = setInterval(() => {
        setCurrentTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timerState === 'running' && currentTime === 0) {
      // Time's up, switch mode
      const nextMode: TimerMode = currentMode === 'work' ? 'break' : 'work';
      setCurrentMode(nextMode);
      setCurrentTime((nextMode === 'work' ? workDuration : breakDuration) * 60);
      setTimerState('stopped'); // Or 'paused' if auto-start next is desired
      toast({
        title: `${currentMode === 'work' ? "Work" : "Break"} session complete!`,
        description: `Starting ${nextMode} mode.`,
      });
      // Here you could play a sound
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, currentTime, currentMode, workDuration, breakDuration, toast]);

  const generateSessionId = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createSession = useCallback(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    setIsSessionCreator(true);
    setTimerState('stopped');
    setCurrentMode('work');
    setCurrentTime(workDuration * 60);
    // Mock Firebase: In a real app, this would write to Firebase
    toast({ title: "Session Created", description: `Session ID: ${newSessionId}` });
  }, [workDuration, toast]);

  const joinSession = useCallback((idToJoin: string) => {
    if (idToJoin && idToJoin.length > 0) { // Basic validation
      // Mock Firebase: In a real app, try to read session `idToJoin` from Firebase
      // For this mock, we'll just join successfully if an ID is provided.
      // And assume we are not the creator unless it's the one we "created".
      // This part is highly simplified.
      setSessionId(idToJoin);
      setIsSessionCreator(false); // Assume joining means not creator
      setTimerState('stopped'); // Assume default state from "Firebase"
      setCurrentMode('work');   // Assume default state
      setCurrentTime(workDuration * 60); // Assume default state
      toast({ title: "Session Joined", description: `Joined session: ${idToJoin}` });
    } else {
      toast({ title: "Error", description: "Invalid Session ID.", variant: "destructive" });
    }
  }, [workDuration, toast]);

  const startTimer = useCallback(() => {
    if (!sessionId) {
      toast({ title: "No active session", description: "Please create or join a session first.", variant: "destructive"});
      return;
    }
    if (currentTime === 0) { // If timer ended, reset to current mode's duration before starting
      setCurrentTime((currentMode === 'work' ? workDuration : breakDuration) * 60);
    }
    setTimerState('running');
    // Mock Firebase: Update timerState in Firebase
  }, [sessionId, currentMode, workDuration, breakDuration, currentTime, toast]);

  const pauseTimer = useCallback(() => {
    setTimerState('paused');
    // Mock Firebase: Update timerState in Firebase
  }, []);

  const stopTimer = useCallback(() => {
    setTimerState('stopped');
    setCurrentTime((currentMode === 'work' ? workDuration : breakDuration) * 60);
    // Mock Firebase: Update timerState and currentTime in Firebase
  }, [currentMode, workDuration, breakDuration]);

  const switchTimerMode = useCallback((newMode: TimerMode) => {
    setCurrentMode(newMode);
    setTimerState('stopped');
    setCurrentTime((newMode === 'work' ? workDuration : breakDuration) * 60);
    // Mock Firebase: Update currentMode, timerState, currentTime
  }, [workDuration, breakDuration]);

  const handleSettingsChange = useCallback((newSettings: PomodoroSettingsValues) => {
    setWorkDuration(newSettings.workDuration);
    setBreakDuration(newSettings.breakDuration);
    localStorage.setItem('pomodoroWorkDuration', newSettings.workDuration.toString());
    localStorage.setItem('pomodoroBreakDuration', newSettings.breakDuration.toString());
    
    // If timer is stopped or paused, update its current time based on the new duration for the current mode
    if (timerState === 'stopped' || timerState === 'paused') {
      setCurrentTime((currentMode === 'work' ? newSettings.workDuration : newSettings.breakDuration) * 60);
    }

    toast({ title: "Settings Updated", description: "Pomodoro durations have been saved." });
    // Mock Firebase: If isSessionCreator, update session settings in Firebase
  }, [currentMode, timerState, toast]);

  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  return {
    sessionId,
    timerState,
    currentMode,
    currentTime,
    workDuration,
    breakDuration,
    isSessionCreator,
    isSettingsModalOpen,
    createSession,
    joinSession,
    startTimer,
    pauseTimer,
    stopTimer,
    switchTimerMode,
    handleSettingsChange,
    openSettingsModal,
    closeSettingsModal,
  };
}
