
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

  useEffect(() => {
    const storedUserID = localStorage.getItem('pomodoroUserID');
    if (storedUserID) {
      console.log("[LocalStorage] Loaded UserID:", storedUserID);
      setUserIDState(storedUserID);
    }
    
    const storedPartnerID = localStorage.getItem('pomodoroPartnerID');
    if (storedPartnerID) {
      console.log("[LocalStorage] Loaded PartnerID:", storedPartnerID);
      setPartnerIDState(storedPartnerID);
    }

    const storedWork = localStorage.getItem('pomodoroWorkDuration');
    const initialWork = storedWork ? parseInt(storedWork, 10) : DEFAULT_WORK_DURATION;
    setWorkDuration(initialWork);
    console.log("[LocalStorage] Initial Work Duration:", initialWork);
    
    const storedBreak = localStorage.getItem('pomodoroBreakDuration');
    const initialBreak = storedBreak ? parseInt(storedBreak, 10) : DEFAULT_BREAK_DURATION;
    setBreakDuration(initialBreak);
    console.log("[LocalStorage] Initial Break Duration:", initialBreak);

    setCurrentTime(initialWork * 60); 
    initialDurationForLogRef.current = initialWork * 60;
    console.log(`[LocalStorage] Initial currentTime set to ${initialWork * 60} seconds for mode 'work'.`);

  }, []);
  
  useEffect(() => {
    if (userID && partnerID) {
      const ids = [userID, partnerID].sort();
      const newCoupleSessionID = ids.join('_');
      setCoupleSessionID(newCoupleSessionID);
      console.log("[Session] Generated coupleSessionID:", newCoupleSessionID);
    } else {
      setCoupleSessionID(null);
      console.log("[Session] Cleared coupleSessionID (userID or partnerID is null)");
    }
  }, [userID, partnerID]);

   useEffect(() => {
    if (timerState === 'stopped' || timerState === 'paused') {
      const newTime = (currentMode === 'work' ? workDuration : breakDuration) * 60;
      if (currentTime !== newTime) {
         setCurrentTime(newTime);
         initialDurationForLogRef.current = newTime;
         console.log(`[Timer] Mode/Duration changed locally while stopped/paused. New time: ${newTime/60}m for ${currentMode}`);
      }
    }
  }, [workDuration, breakDuration, currentMode, timerState]); 

  const addPomodoroLog = useCallback(async (mode: TimerMode, durationSecondsLogged: number, currentCoupleSessionId: string | null) => {
    if (durationSecondsLogged <= 0 || !currentCoupleSessionId) {
      console.warn("[Log] Skipping log: duration or session ID invalid.", {durationSecondsLogged, currentCoupleSessionId});
      return;
    }
    const durationMinutes = Math.round(durationSecondsLogged / 60);
    if (durationMinutes === 0) {
      console.warn(`[Log] Skipping log for session ${currentCoupleSessionId}: duration rounds to 0 minutes.`);
      return;
    }
    console.log(`[Log] Attempting to add log for session ${currentCoupleSessionId}: mode=${mode}, duration=${durationMinutes}min`);
    try {
      await addDoc(collection(db, "pomodoroLogs"), {
        sessionId: currentCoupleSessionId, 
        date: serverTimestamp(),
        mode: mode,
        durationMinutes: durationMinutes,
      });
      console.log(`[Log] Successfully added log for session ${currentCoupleSessionId}`);
    } catch (error) {
      console.error("[Log] Error adding pomodoro log: ", error);
      toast({ title: "Log Error", description: "Could not save your session to our journal.", variant: "destructive" });
    }
  }, [toast]);

  const updateSharedState = useCallback(async (newState: Partial<SharedPomodoroState>) => {
    if (!coupleSessionID || !userID) {
      console.warn("[Firestore] Skipping updateSharedState: coupleSessionID or userID is null.", {coupleSessionID, userID});
      return;
    }
    console.log(`[Firestore] Attempting to update shared state for ${coupleSessionID} by ${userID}:`, newState);
    try {
      const docRef = doc(db, 'sharedPomodoros', coupleSessionID);
      const payload: any = { // Use 'any' temporarily for flexibility with serverTimestamp
        ...newState,
        lastUpdatedBy: userID,
        timestamp: serverTimestamp(),
      };
      
      // Ensure specific fields are numbers if they exist in newState
      if ('currentTime' in newState && typeof newState.currentTime !== 'number') payload.currentTime = Number(newState.currentTime);
      if ('workDuration' in newState && typeof newState.workDuration !== 'number') payload.workDuration = Number(newState.workDuration);
      if ('breakDuration' in newState && typeof newState.breakDuration !== 'number') payload.breakDuration = Number(newState.breakDuration);

      await updateDoc(docRef, payload);
      console.log(`[Firestore] Successfully updated shared state for ${coupleSessionID}.`);
    } catch (error: any) {
        if (error.code === 'not-found' || !(await getDoc(doc(db, 'sharedPomodoros', coupleSessionID))).exists()) {
            console.warn(`[Firestore] Document ${coupleSessionID} not found on update, attempting to re-initialize. Error:`, error);
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
                console.log(`[Firestore] Successfully re-initialized shared state for ${coupleSessionID}.`);
            } catch (initError) {
                console.error("[Firestore] Error re-initializing shared state:", initError);
                toast({ title: "Sync Error", description: "Failed to re-sync our session.", variant: "destructive" });
            }
        } else {
            console.error("[Firestore] Error updating shared Pomodoro state: ", error);
            toast({ title: "Sync Error", description: "Our actions couldn't be synced.", variant: "destructive" });
        }
    }
  }, [coupleSessionID, userID, toast, currentTime, timerState, currentMode, workDuration, breakDuration]);

  useEffect(() => {
    if (!coupleSessionID || !userID) {
      console.log("[Firestore Sync] Aborting: coupleSessionID or userID is not set.", { coupleSessionID, userID });
      return;
    }
    console.log(`[Firestore Sync] Setting up listener for sharedPomodoros/${coupleSessionID} by user ${userID}`);

    const docRef = doc(db, 'sharedPomodoros', coupleSessionID);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      console.log(`[Firestore Sync] Received snapshot for ${coupleSessionID}. Exists: ${docSnap.exists()}`);
      if (docSnap.exists()) {
        const data = docSnap.data() as SharedPomodoroState;
        console.log("[Firestore Sync] Data received:", data);

        if (data.lastUpdatedBy !== userID) {
          console.log("[Firestore Sync] Updating local state from Firestore (data updated by partner).");
          setCurrentTime(data.currentTime);
          setTimerState(data.timerState);
          setCurrentMode(data.currentMode);
          
          if (data.workDuration !== workDuration) setWorkDuration(data.workDuration);
          if (data.breakDuration !== breakDuration) setBreakDuration(data.breakDuration);
          initialDurationForLogRef.current = data.currentMode === 'work' ? data.workDuration * 60 : data.breakDuration * 60;
        } else {
          console.log("[Firestore Sync] Data last updated by current user or state matches, no local update needed from this snapshot.");
        }
      } else {
        console.log(`[Firestore Sync] Document ${coupleSessionID} does not exist. Initializing...`);
        const initialSharedState: SharedPomodoroState = {
          workDuration: workDuration, 
          breakDuration: breakDuration, 
          currentMode: 'work',
          currentTime: workDuration * 60,
          timerState: 'stopped',
          lastUpdatedBy: userID,
          timestamp: serverTimestamp() as Timestamp, // Firestore will convert this
        };
        console.log("[Firestore Sync] Initial state to be set:", initialSharedState);
        try {
          await setDoc(docRef, initialSharedState);
          console.log(`[Firestore Sync] Successfully created shared state for ${coupleSessionID}.`);
          setCurrentTime(initialSharedState.currentTime);
          setTimerState(initialSharedState.timerState);
          setCurrentMode(initialSharedState.currentMode);
          initialDurationForLogRef.current = initialSharedState.currentTime;
        } catch (error) {
          console.error("[Firestore Sync] Error creating shared Pomodoro state: ", error);
          toast({ title: "Sync Error", description: "Could not initialize our shared session.", variant: "destructive" });
        }
      }
    }, (error) => {
      console.error(`[Firestore Sync] Error in onSnapshot for ${coupleSessionID}:`, error);
      toast({ title: "Sync Error", description: "Lost connection to our shared session.", variant: "destructive" });
    });
    return () => {
      console.log(`[Firestore Sync] Unsubscribing listener for ${coupleSessionID}`);
      unsubscribe();
    };
  }, [coupleSessionID, userID, toast, workDuration, breakDuration]); // Firestore sync depends on initial durations too


  useEffect(() => {
    if (localTimerIntervalRef.current) clearInterval(localTimerIntervalRef.current);

    if (timerState === 'running' && currentTime > 0) {
      localTimerIntervalRef.current = setInterval(() => {
        setCurrentTime(prevTime => prevTime - 1); 
      }, 1000);
    } else if (timerState === 'running' && currentTime === 0) {
      console.log(`[Timer] Timer finished for mode: ${currentMode}. Duration logged: ${initialDurationForLogRef.current / 60}min`);
      if (coupleSessionID && userID) {
        addPomodoroLog(currentMode, initialDurationForLogRef.current, coupleSessionID);
      }
      const nextMode: TimerMode = currentMode === 'work' ? 'break' : 'work';
      const newDurationSeconds = (nextMode === 'work' ? workDuration : breakDuration) * 60;
      
      toast({
        title: `${currentMode === 'work' ? "Focus Time" : "Us Time"} complete!`,
        description: `Let's start our ${nextMode === 'work' ? "Focus Time" : "Us Time"}.`,
      });
      
      console.log(`[Timer] Switching mode to ${nextMode}, new duration ${newDurationSeconds / 60}min. Updating shared state.`);
      
      setCurrentMode(nextMode); 
      setCurrentTime(newDurationSeconds);
      setTimerState('stopped');
      initialDurationForLogRef.current = newDurationSeconds;

      updateSharedState({ // This should be called after local state updates for consistency if partner joins mid-update
        currentMode: nextMode,
        currentTime: newDurationSeconds,
        timerState: 'stopped',
      });
    }
    return () => {
      if (localTimerIntervalRef.current) clearInterval(localTimerIntervalRef.current);
    };
  }, [timerState, currentTime, coupleSessionID, userID, updateSharedState, currentMode, workDuration, breakDuration, toast, addPomodoroLog]);


  useEffect(() => {
    if (!coupleSessionID) {
      setPomodoroLogs([]);
      console.log("[Logs] Cleared logs as coupleSessionID is null.");
      return;
    }
    console.log(`[Logs] Setting up listener for pomodoroLogs with sessionId=${coupleSessionID}`);
    const q = query(collection(db, "pomodoroLogs"), where("sessionId", "==", coupleSessionID), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logs: PomodoroLogEntry[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as PomodoroLogEntry);
      });
      setPomodoroLogs(logs);
      console.log(`[Logs] Fetched ${logs.length} logs for session ${coupleSessionID}.`);
    }, (error) => {
      console.error("[Logs] Error fetching logs: ", error);
      toast({ title: "Error Fetching Journal", description: "Could not fetch our focus journal. Check browser console for details.", variant: "destructive" });
    });
    return () => {
      console.log(`[Logs] Unsubscribing listener for pomodoroLogs (sessionId=${coupleSessionID})`);
      unsubscribe();
    };
  }, [coupleSessionID, toast]);


  const handleSetUserID = (id: string) => {
    const trimmedId = id.trim().toUpperCase();
    if (trimmedId) {
      setUserIDState(trimmedId);
      localStorage.setItem('pomodoroUserID', trimmedId);
      console.log("[Session] UserID set to:", trimmedId);
      toast({ title: "Welcome!", description: `Your ID is ${trimmedId}. Connect with your partner! ❤️` });
    } else {
      toast({ title: "Oops!", description: "Please enter a User ID.", variant: "destructive" });
    }
  };

  const handleSetPartnerID = (id: string) => {
    const trimmedId = id.trim().toUpperCase();
    if(userID && trimmedId === userID) {
      toast({ title: "Hehe!", description: "Partner ID can't be your own ID, lovely! 😉", variant: "destructive" });
      return;
    }
    if (trimmedId) {
      setPartnerIDState(trimmedId);
      localStorage.setItem('pomodoroPartnerID', trimmedId);
      console.log("[Session] PartnerID set to:", trimmedId);
      toast({ title: "Partner Linked!", description: `Ready for focused time with ${trimmedId}! 🥰` });
    } else { // Removed partnerID from localStorage if input is empty
      setPartnerIDState(null);
      localStorage.removeItem('pomodoroPartnerID');
      console.log("[Session] PartnerID cleared.");
      toast({ title: "Partner Disconnected", description: "You can link with your partner again anytime.", variant: "destructive" });
    }
  };
  
  const logoutAndReset = () => {
    console.log("[Session] Logging out and resetting state.");
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
      console.warn("[Timer] Start prevented: Not connected.");
      return;
    }
    let newCurrentTime = currentTime;
    if (timerState === 'stopped' || timerState === 'paused' || newCurrentTime === 0 ) { 
        newCurrentTime = (currentMode === 'work' ? workDuration : breakDuration) * 60;
    }
    initialDurationForLogRef.current = newCurrentTime; 
    
    console.log(`[Timer] Starting timer. Mode: ${currentMode}, Time: ${newCurrentTime/60}m. User: ${userID}`);
    setTimerState('running'); 
    setCurrentTime(newCurrentTime); 

    updateSharedState({ timerState: 'running', currentTime: newCurrentTime, currentMode });
  }, [coupleSessionID, userID, toast, updateSharedState, currentTime, currentMode, workDuration, breakDuration, timerState]);

  const pauseTimer = useCallback(() => {
    if (!coupleSessionID || !userID) return;
    console.log(`[Timer] Pausing timer. User: ${userID}`);
    setTimerState('paused'); 
    updateSharedState({ timerState: 'paused' }); // Only update what changed
  }, [coupleSessionID, userID, updateSharedState]);

  const stopTimer = useCallback(() => {
    if (!coupleSessionID || !userID) return;
    
    const timeSpentSeconds = initialDurationForLogRef.current - currentTime;
    console.log(`[Timer] Stopping timer. Time spent: ${timeSpentSeconds}s. User: ${userID}`);
    if (timerState !== 'stopped' && timeSpentSeconds > 0) {
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
    console.log(`[Timer] Switching mode to ${newMode}. Time spent in old mode: ${timeSpentSeconds}s. User: ${userID}`);
    if (timerState !== 'stopped' && timeSpentSeconds > 0) { 
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
    console.log("[Settings] Settings changed. New:", newSettings);
    localStorage.setItem('pomodoroWorkDuration', newSettings.workDuration.toString());
    localStorage.setItem('pomodoroBreakDuration', newSettings.breakDuration.toString());
    
    setWorkDuration(newSettings.workDuration); 
    setBreakDuration(newSettings.breakDuration); 

    let newCurrentTimeForSync = currentTime;
    // If timer is not running, update its current time to reflect the new duration of the current mode
    if (timerState === 'stopped' || timerState === 'paused') {
      newCurrentTimeForSync = (currentMode === 'work' ? newSettings.workDuration : newSettings.breakDuration) * 60;
      setCurrentTime(newCurrentTimeForSync); 
      initialDurationForLogRef.current = newCurrentTimeForSync;
      console.log(`[Settings] Timer is stopped/paused. Reflecting new duration in currentTime: ${newCurrentTimeForSync/60}m for ${currentMode}`);
    }
    
    if (!coupleSessionID || !userID) {
        toast({ title: "Local Settings Updated!", description: "Connect with your partner to sync them with love." });
        console.log("[Settings] Updated locally as not connected.");
        return;
    }
    
    updateSharedState({
      workDuration: newSettings.workDuration,
      breakDuration: newSettings.breakDuration,
      currentTime: newCurrentTimeForSync, // Send the potentially updated currentTime
      currentMode: currentMode, // Ensure currentMode is part of the update
      timerState: timerState // Ensure timerState is part of the update
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
