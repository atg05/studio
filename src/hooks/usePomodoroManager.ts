"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerMode, TimerState, PomodoroSettingsValues, PomodoroLogEntry } from '@/types/pomodoro';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

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
  const [pomodoroLogs, setPomodoroLogs] = useState<PomodoroLogEntry[]>([]);
  
  const initialDurationForLogRef = useRef<number>(0); // Stores the full duration of the current segment when it starts

  const { toast } = useToast();

  useEffect(() => {
    const storedWorkDuration = localStorage.getItem('pomodoroWorkDuration');
    const storedBreakDuration = localStorage.getItem('pomodoroBreakDuration');

    if (storedWorkDuration) setWorkDuration(parseInt(storedWorkDuration, 10));
    if (storedBreakDuration) setBreakDuration(parseInt(storedBreakDuration, 10));
  }, []);

  useEffect(() => {
    if (timerState === 'stopped' || timerState === 'paused') {
      setCurrentTime((currentMode === 'work' ? workDuration : breakDuration) * 60);
    }
  }, [workDuration, breakDuration, currentMode, timerState]);

  const addPomodoroLog = useCallback(async (mode: TimerMode, durationSecondsLogged: number, currentSessionId: string) => {
    if (durationSecondsLogged <= 0 || !currentSessionId) return;
    try {
      await addDoc(collection(db, "pomodoroLogs"), {
        sessionId: currentSessionId,
        date: serverTimestamp(),
        mode: mode,
        durationMinutes: Math.round(durationSecondsLogged / 60),
      });
    } catch (error) {
      console.error("Error adding pomodoro log: ", error);
      toast({ title: "Log Error", description: "Could not save your session to our journal.", variant: "destructive" });
    }
  }, [toast]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState === 'running' && currentTime > 0) {
      interval = setInterval(() => {
        setCurrentTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timerState === 'running' && currentTime === 0) {
      if (sessionId) {
        addPomodoroLog(currentMode, initialDurationForLogRef.current, sessionId);
      }
      const nextMode: TimerMode = currentMode === 'work' ? 'break' : 'work';
      toast({
        title: `${currentMode === 'work' ? "Focus Time" : "Us Time"} complete!`,
        description: `Let's start our ${nextMode === 'work' ? "Focus Time" : "Us Time"}.`,
      });
      setCurrentMode(nextMode);
      const newDuration = (nextMode === 'work' ? workDuration : breakDuration) * 60;
      setCurrentTime(newDuration);
      initialDurationForLogRef.current = newDuration; // Set for next segment
      setTimerState('stopped'); 
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, currentTime, currentMode, workDuration, breakDuration, toast, sessionId, addPomodoroLog]);

  useEffect(() => {
    if (!sessionId) {
      setPomodoroLogs([]);
      return;
    }

    const q = query(
      collection(db, "pomodoroLogs"),
      where("sessionId", "==", sessionId),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logs: PomodoroLogEntry[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as PomodoroLogEntry);
      });
      setPomodoroLogs(logs);
    }, (error) => {
      console.error("Error fetching logs: ", error);
      toast({ title: "Error", description: "Could not fetch our focus journal.", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [sessionId, toast]);


  const generateSessionId = (): string => Math.random().toString(36).substring(2, 8).toUpperCase();

  const createSession = useCallback(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    setIsSessionCreator(true);
    setTimerState('stopped');
    setCurrentMode('work');
    const initialWorkTime = workDuration * 60;
    setCurrentTime(initialWorkTime);
    initialDurationForLogRef.current = initialWorkTime;
    toast({ title: "Our Session Created!", description: `Let's make memories with ID: ${newSessionId} 💕` });
  }, [workDuration, toast]);

  const joinSession = useCallback((idToJoin: string) => {
    if (idToJoin && idToJoin.trim().length > 0) {
      setSessionId(idToJoin.trim().toUpperCase());
      setIsSessionCreator(false);
      setTimerState('stopped'); 
      setCurrentMode('work');   
      const initialWorkTime = workDuration * 60;
      setCurrentTime(initialWorkTime);
      initialDurationForLogRef.current = initialWorkTime;
      toast({ title: "Joined Our Session!", description: `Ready to focus with ${idToJoin.trim().toUpperCase()} 🥰` });
    } else {
      toast({ title: "Oops!", description: "Please enter a valid Session ID, my love.", variant: "destructive" });
    }
  }, [workDuration, toast]);

  const startTimer = useCallback(() => {
    if (!sessionId) {
      toast({ title: "No Session", description: "Let's create or join a session first, darling.", variant: "destructive"});
      return;
    }
    let newCurrentTime = currentTime;
    if (currentTime === 0) { 
      newCurrentTime = (currentMode === 'work' ? workDuration : breakDuration) * 60;
      setCurrentTime(newCurrentTime);
    }
    initialDurationForLogRef.current = newCurrentTime; // Set full duration at start
    setTimerState('running');
  }, [sessionId, currentMode, workDuration, breakDuration, currentTime, toast]);

  const pauseTimer = useCallback(() => {
    setTimerState('paused');
  }, []);

  const stopTimer = useCallback(() => {
    if (timerState === 'running' || timerState === 'paused') {
      const timeSpentSeconds = initialDurationForLogRef.current - currentTime;
      if (sessionId && timeSpentSeconds > 0) {
         addPomodoroLog(currentMode, timeSpentSeconds, sessionId);
      }
    }
    setTimerState('stopped');
    const newDuration = (currentMode === 'work' ? workDuration : breakDuration) * 60;
    setCurrentTime(newDuration);
    initialDurationForLogRef.current = newDuration; // Reset for next potential start
  }, [currentMode, workDuration, breakDuration, toast, timerState, currentTime, sessionId, addPomodoroLog]);

  const switchTimerMode = useCallback((newMode: TimerMode) => {
    if (timerState === 'running' || timerState === 'paused') {
      const timeSpentSeconds = initialDurationForLogRef.current - currentTime;
       if (sessionId && timeSpentSeconds > 0) {
        addPomodoroLog(currentMode, timeSpentSeconds, sessionId);
      }
    }
    setCurrentMode(newMode);
    setTimerState('stopped');
    const newDuration = (newMode === 'work' ? workDuration : breakDuration) * 60;
    setCurrentTime(newDuration);
    initialDurationForLogRef.current = newDuration; // Set for the new mode
  }, [workDuration, breakDuration, timerState, currentTime, sessionId, currentMode, addPomodoroLog]);

  const handleSettingsChange = useCallback((newSettings: PomodoroSettingsValues) => {
    setWorkDuration(newSettings.workDuration);
    setBreakDuration(newSettings.breakDuration);
    localStorage.setItem('pomodoroWorkDuration', newSettings.workDuration.toString());
    localStorage.setItem('pomodoroBreakDuration', newSettings.breakDuration.toString());
    
    if (timerState === 'stopped' || timerState === 'paused') {
      const newCurrentTime = (currentMode === 'work' ? newSettings.workDuration : newSettings.breakDuration) * 60;
      setCurrentTime(newCurrentTime);
      initialDurationForLogRef.current = newCurrentTime;
    }
    toast({ title: "Our Settings Updated!", description: "Pomodoro durations are now perfect for us." });
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
    pomodoroLogs, // expose logs
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
