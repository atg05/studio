
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerMode, TimerState, PomodoroSettingsValues, PomodoroLogEntry, SharedPomodoroState } from '@/types/pomodoro';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, setDoc, updateDoc, getDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';

const DEFAULT_WORK_DURATION = 25; // minutes
const DEFAULT_BREAK_DURATION = 5; // minutes

export function usePomodoroManager() {
  const [userID, setUserIDState] = useState<string | null>(null);
  const [partnerID, setPartnerIDState] = useState<string | null>(null);
  const [coupleSessionID, setCoupleSessionID] = useState<string | null>(null);

  const [timerState, setTimerState] = useState<TimerState>('stopped');
  const [currentMode, setCurrentMode] = useState<TimerMode>('work');
  const [currentTime, setCurrentTime] = useState<number>(DEFAULT_WORK_DURATION * 60);
  const [workDuration, setWorkDuration] = useState<number>(DEFAULT_WORK_DURATION);
  const [breakDuration, setBreakDuration] = useState<number>(DEFAULT_BREAK_DURATION);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [pomodoroLogs, setPomodoroLogs] = useState<PomodoroLogEntry[]>([]);
  
  const initialDurationForLogRef = useRef<number>(0);
  const localTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Load UserID, PartnerID, and local duration preferences from localStorage on mount
  useEffect(() => {
    const storedUserID = localStorage.getItem('pomodoroUserID');
    if (storedUserID) setUserIDState(storedUserID);
    
    const storedPartnerID = localStorage.getItem('pomodoroPartnerID');
    if (storedPartnerID) setPartnerIDState(storedPartnerID);

    const storedWork = localStorage.getItem('pomodoroWorkDuration');
    setWorkDuration(storedWork ? parseInt(storedWork, 10) : DEFAULT_WORK_DURATION);
    
    const storedBreak = localStorage.getItem('pomodoroBreakDuration');
    setBreakDuration(storedBreak ? parseInt(storedBreak, 10) : DEFAULT_BREAK_DURATION);
  }, []);
  
  // Derive coupleSessionID when userID or partnerID changes
  useEffect(() => {
    if (userID && partnerID) {
      const ids = [userID, partnerID].sort();
      setCoupleSessionID(ids.join('_'));
    } else {
      setCoupleSessionID(null);
    }
  }, [userID, partnerID]);

  // Update local currentTime display when local durations change AND timer is not running/driven by Firestore
   useEffect(() => {
    if (timerState === 'stopped' || timerState === 'paused') {
      const newTime = (currentMode === 'work' ? workDuration : breakDuration) * 60;
      if (currentTime !== newTime) {
         setCurrentTime(newTime);
         initialDurationForLogRef.current = newTime;
      }
    }
  }, [workDuration, breakDuration, currentMode, timerState, currentTime]); 

  const addPomodoroLog = useCallback(async (mode: TimerMode, durationSecondsLogged: number, currentCoupleSessionId: string) => {
    if (durationSecondsLogged <= 0 || !currentCoupleSessionId) return;
    try {
      await addDoc(collection(db, "pomodoroLogs"), {
        sessionId: currentCoupleSessionId, 
        date: serverTimestamp(),
        mode: mode,
        durationMinutes: Math.round(durationSecondsLogged / 60),
      });
    } catch (error) {
      console.error("Error adding pomodoro log: ", error);
      toast({ title: "Log Error", description: "Could not save your session to our journal.", variant: "destructive" });
    }
  }, [toast]);

  const updateSharedState = useCallback(async (newState: Partial<SharedPomodoroState>) => {
    if (!coupleSessionID || !userID) return;
    try {
      const docRef = doc(db, 'sharedPomodoros', coupleSessionID);
      await updateDoc(docRef, {
        ...newState,
        lastUpdatedBy: userID,
        timestamp: serverTimestamp(),
      });
    } catch (error: any) {
        if (error.code === 'not-found' || !(await getDoc(doc(db, 'sharedPomodoros', coupleSessionID))).exists()) {
            console.warn("Shared document not found on update, attempting to re-initialize.", error);
            const reInitialState: SharedPomodoroState = {
                currentTime: newState.currentTime ?? currentTime,
                timerState: newState.timerState ?? timerState,
                currentMode: newState.currentMode ?? currentMode,
                workDuration: newState.workDuration ?? workDuration,
                breakDuration: newState.breakDuration ?? breakDuration,
                lastUpdatedBy: userID,
                timestamp: serverTimestamp() as Timestamp,
            };
            try {
                await setDoc(doc(db, 'sharedPomodoros', coupleSessionID), reInitialState);
            } catch (initError) {
                console.error("Error re-initializing shared state:", initError);
                toast({ title: "Sync Error", description: "Failed to re-sync our session.", variant: "destructive" });
            }
        } else {
            console.error("Error updating shared Pomodoro state: ", error);
            toast({ title: "Sync Error", description: "Our actions couldn't be synced.", variant: "destructive" });
        }
    }
  }, [coupleSessionID, userID, toast, currentTime, timerState, currentMode, workDuration, breakDuration]);

  // Firestore Sync Effect for shared state
  useEffect(() => {
    if (!coupleSessionID || !userID) return;

    const docRef = doc(db, 'sharedPomodoros', coupleSessionID);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SharedPomodoroState;

        if (data.lastUpdatedBy !== userID || 
            (timerState === 'stopped' && currentTime !== data.currentTime && data.lastUpdatedBy === userID && data.timerState === 'stopped') 
        ) {
          setCurrentTime(data.currentTime);
          setTimerState(data.timerState);
          setCurrentMode(data.currentMode);
          setWorkDuration(data.workDuration);
          setBreakDuration(data.breakDuration);
          initialDurationForLogRef.current = data.currentMode === 'work' ? data.workDuration * 60 : data.breakDuration * 60;
        }
      } else {
        const initialSharedState: SharedPomodoroState = {
          workDuration: workDuration, 
          breakDuration: breakDuration, 
          currentMode: 'work',
          currentTime: workDuration * 60,
          timerState: 'stopped',
          lastUpdatedBy: userID,
          timestamp: serverTimestamp() as Timestamp,
        };
        try {
          await setDoc(docRef, initialSharedState);
          setCurrentTime(initialSharedState.currentTime);
          setTimerState(initialSharedState.timerState);
          setCurrentMode(initialSharedState.currentMode);
          initialDurationForLogRef.current = initialSharedState.currentTime;

        } catch (error) {
          console.error("Error creating shared Pomodoro state: ", error);
          toast({ title: "Sync Error", description: "Could not initialize our shared session.", variant: "destructive" });
        }
      }
    });
    return () => unsubscribe();
  }, [coupleSessionID, userID, toast]); // Removed workDuration, breakDuration, timerState, currentTime from deps to avoid overwriting partner's initial set


  // Local timer countdown effect
  useEffect(() => {
    if (localTimerIntervalRef.current) clearInterval(localTimerIntervalRef.current);

    if (timerState === 'running' && currentTime > 0) {
      localTimerIntervalRef.current = setInterval(() => {
        setCurrentTime(prevTime => prevTime - 1); // Local countdown
      }, 1000);
    } else if (timerState === 'running' && currentTime === 0) {
      if (coupleSessionID && userID) { // Ensure userID is also present for logging
        // Log only if this client is the one that hit zero, or rely on shared state to trigger this for both.
        // To prevent double logging, perhaps only one client should log, or log based on who initiated the start.
        // For simplicity now, if timerState is 'running' and hits 0, this client logs.
        // This might need refinement for perfect single-log scenarios.
        addPomodoroLog(currentMode, initialDurationForLogRef.current, coupleSessionID);
      }
      const nextMode: TimerMode = currentMode === 'work' ? 'break' : 'work';
      const newDurationSeconds = (nextMode === 'work' ? workDuration : breakDuration) * 60;
      
      toast({
        title: `${currentMode === 'work' ? "Focus Time" : "Us Time"} complete!`,
        description: `Let's start our ${nextMode === 'work' ? "Focus Time" : "Us Time"}.`,
      });
      
      // Only the client that hits zero should trigger the updateSharedState to switch mode.
      // This logic relies on the Firestore listener to update the other client.
      // However, if both clients hit 0 "simultaneously" due to local countdown, both might try to update.
      // Firestore transactions or a "master client" logic might be needed for perfect sync on completion.
      // For now, let's assume `lastUpdatedBy` helps.
      // This specific update for completion should ideally only happen once.
      // We can check if `lastUpdatedBy` for the *current* running timer was this user before updating state.
      // This is getting complex, so a simpler approach: updateSharedState will handle `lastUpdatedBy`
      updateSharedState({
        currentMode: nextMode,
        currentTime: newDurationSeconds,
        timerState: 'stopped',
      });
       // Local state also needs to be updated immediately after shared state attempt.
       // Firestore listener will then confirm or correct if another client updated first.
       setCurrentMode(nextMode); 
       setCurrentTime(newDurationSeconds);
       setTimerState('stopped');
       initialDurationForLogRef.current = newDurationSeconds;

    }
    return () => {
      if (localTimerIntervalRef.current) clearInterval(localTimerIntervalRef.current);
    };
  }, [timerState, currentTime, coupleSessionID, userID, updateSharedState, currentMode, workDuration, breakDuration, toast, addPomodoroLog]);


  // Fetch pomodoro logs for the coupleSessionID
  useEffect(() => {
    if (!coupleSessionID) {
      setPomodoroLogs([]);
      return;
    }
    const q = query(collection(db, "pomodoroLogs"), where("sessionId", "==", coupleSessionID), orderBy("date", "desc"));
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
  }, [coupleSessionID, toast]);


  const handleSetUserID = (id: string) => {
    const trimmedId = id.trim().toUpperCase();
    if (trimmedId) {
      setUserIDState(trimmedId);
      localStorage.setItem('pomodoroUserID', trimmedId);
      toast({ title: "Welcome!", description: `Your ID is ${trimmedId}. Connect with your partner! ❤️` });
    } else {
      toast({ title: "Oops!", description: "Please enter a User ID.", variant: "destructive" });
    }
  };

  const handleSetPartnerID = (id: string) => {
    const trimmedId = id.trim().toUpperCase();
    if(trimmedId === userID) {
      toast({ title: "Hehe!", description: "Partner ID can't be your own ID, lovely! 😉", variant: "destructive" });
      return;
    }
    if (trimmedId) {
      setPartnerIDState(trimmedId);
      localStorage.setItem('pomodoroPartnerID', trimmedId);
      toast({ title: "Partner Linked!", description: `Ready for focused time with ${trimmedId}! 🥰` });
    } else {
      toast({ title: "Oops!", description: "Please enter your partner's User ID.", variant: "destructive" });
    }
  };
  
  const logoutAndReset = () => {
    setUserIDState(null);
    setPartnerIDState(null);
    setCoupleSessionID(null); 
    localStorage.removeItem('pomodoroUserID');
    localStorage.removeItem('pomodoroPartnerID');
    
    const localWork = localStorage.getItem('pomodoroWorkDuration');
    const localBreak = localStorage.getItem('pomodoroBreakDuration');
    const defaultWork = localWork ? parseInt(localWork, 10) : DEFAULT_WORK_DURATION;
    const defaultBreak = localBreak ? parseInt(localBreak, 10) : DEFAULT_BREAK_DURATION;

    setTimerState('stopped');
    setCurrentMode('work');
    setWorkDuration(defaultWork);
    setBreakDuration(defaultBreak);
    setCurrentTime(defaultWork * 60);
    initialDurationForLogRef.current = defaultWork * 60;
    setPomodoroLogs([]);
    setIsSettingsModalOpen(false);
    toast({ title: "Logged Out", description: "Come back soon for more lovely focus time! 👋" });
  };

  const startTimer = useCallback(() => {
    if (!coupleSessionID || !userID) {
      toast({ title: "Not Connected", description: "Please set your User ID and connect with your partner first.", variant: "destructive"});
      return;
    }
    let newCurrentTime = currentTime;
    // If timer is stopped and at 0, reset to full duration for the current mode before starting
    if (timerState === 'stopped' && newCurrentTime === 0) { 
        newCurrentTime = (currentMode === 'work' ? workDuration : breakDuration) * 60;
    } else if (timerState === 'stopped' && newCurrentTime > 0) {
      // If timer is stopped but not at 0 (e.g. paused then stopped), use existing time.
      // Or, always reset to full duration on start from 'stopped' state if preferred.
      // For now, let's assume it should resume or start fresh if at 0.
      // If it was paused, and then stopped, then started again, it should use the paused time.
      // If it was stopped (completed a cycle), it should use full time of current mode.
      // The `initialDurationForLogRef` should be the starting point of *this* run.
      // This logic means if you hit stop, then start, it uses the reset time. If you pause, then start, it uses paused time.
      newCurrentTime = (currentMode === 'work' ? workDuration : breakDuration) * 60;
    }


    initialDurationForLogRef.current = newCurrentTime; 
    
    // Set local state immediately for responsiveness
    setTimerState('running'); 
    setCurrentTime(newCurrentTime); 

    updateSharedState({ timerState: 'running', currentTime: newCurrentTime, currentMode }); // ensure currentMode is also sent
  }, [coupleSessionID, userID, toast, updateSharedState, currentTime, currentMode, workDuration, breakDuration, timerState]);

  const pauseTimer = useCallback(() => {
    if (!coupleSessionID || !userID) return;
    setTimerState('paused'); 
    updateSharedState({ timerState: 'paused' });
  }, [coupleSessionID, userID, updateSharedState]);

  const stopTimer = useCallback(() => {
    if (!coupleSessionID || !userID) return;
    
    const timeSpentSeconds = initialDurationForLogRef.current - currentTime;
    if (timerState !== 'stopped' && timeSpentSeconds > 0) { // Log if it was running or paused and some time passed
        addPomodoroLog(currentMode, timeSpentSeconds, coupleSessionID);
    }

    const newDuration = (currentMode === 'work' ? workDuration : breakDuration) * 60;
    initialDurationForLogRef.current = newDuration; 

    setTimerState('stopped'); 
    setCurrentTime(newDuration); 

    updateSharedState({ timerState: 'stopped', currentTime: newDuration, currentMode });
  }, [coupleSessionID, userID, updateSharedState, addPomodoroLog, currentMode, workDuration, breakDuration, currentTime, timerState]);

  const switchTimerMode = useCallback((newMode: TimerMode) => {
    if (!coupleSessionID || !userID) return;

    const timeSpentSeconds = initialDurationForLogRef.current - currentTime;
    if (timerState !== 'stopped' && timeSpentSeconds > 0) { // Log if it was running or paused
      addPomodoroLog(currentMode, timeSpentSeconds, coupleSessionID);
    }
    
    const newDurationSeconds = (newMode === 'work' ? workDuration : breakDuration) * 60;
    initialDurationForLogRef.current = newDurationSeconds; 

    setCurrentMode(newMode); 
    setTimerState('stopped'); 
    setCurrentTime(newDurationSeconds); 

    updateSharedState({
      currentMode: newMode,
      timerState: 'stopped',
      currentTime: newDurationSeconds,
    });
  }, [coupleSessionID, userID, updateSharedState, addPomodoroLog, currentMode, workDuration, breakDuration, currentTime, timerState]);

  const handleSettingsChange = useCallback((newSettings: PomodoroSettingsValues) => {
    if (!coupleSessionID || !userID) {
        // Handle local-only settings update if not connected
        setWorkDuration(newSettings.workDuration);
        setBreakDuration(newSettings.breakDuration);
        localStorage.setItem('pomodoroWorkDuration', newSettings.workDuration.toString());
        localStorage.setItem('pomodoroBreakDuration', newSettings.breakDuration.toString());
        if (timerState === 'stopped' || timerState === 'paused') {
            const newCurrentTimeValue = (currentMode === 'work' ? newSettings.workDuration : newSettings.breakDuration) * 60;
            setCurrentTime(newCurrentTimeValue);
            initialDurationForLogRef.current = newCurrentTimeValue;
        }
        toast({ title: "Local Settings Updated!", description: "Connect with your partner to sync them with love." });
        return;
    }
    
    // If connected, update local and shared state
    setWorkDuration(newSettings.workDuration); 
    setBreakDuration(newSettings.breakDuration); 
    localStorage.setItem('pomodoroWorkDuration', newSettings.workDuration.toString());
    localStorage.setItem('pomodoroBreakDuration', newSettings.breakDuration.toString());

    let newCurrentTimeForSync = currentTime;
    // If timer is stopped or paused, reflect new duration settings immediately in current time
    if (timerState === 'stopped' || timerState === 'paused') {
      newCurrentTimeForSync = (currentMode === 'work' ? newSettings.workDuration : newSettings.breakDuration) * 60;
      setCurrentTime(newCurrentTimeForSync); 
      initialDurationForLogRef.current = newCurrentTimeForSync;
    }
    
    updateSharedState({
      workDuration: newSettings.workDuration,
      breakDuration: newSettings.breakDuration,
      currentTime: newCurrentTimeForSync, // Send the potentially updated currentTime
      // currentMode and timerState remain as they are unless settings change implies a reset
    });
    toast({ title: "Our Settings Synced!", description: "Pomodoro durations are updated for both of us. Perfect!" });
  }, [coupleSessionID, userID, toast, updateSharedState, currentMode, timerState, currentTime]);

  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  return {
    userID,
    partnerID,
    coupleSessionID,
    timerState,
    currentMode,
    currentTime,
    workDuration,
    breakDuration,
    isSettingsModalOpen,
    pomodoroLogs,
    handleSetUserID,
    handleSetPartnerID,
    logoutAndReset,
    startTimer,
    pauseTimer,
    stopTimer,
    switchTimerMode,
    handleSettingsChange,
    openSettingsModal,
    closeSettingsModal,
  };
}

    