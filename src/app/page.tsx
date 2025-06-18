
"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, UserCog, Link2, LogOut } from 'lucide-react';

import TimerDisplay from '@/components/pomodoro/TimerDisplay';
import TimerControls from '@/components/pomodoro/TimerControls';
import SessionManager from '@/components/pomodoro/SessionManager'; // Will be updated for UserID management
import ModeTabs from '@/components/pomodoro/ModeTabs';
import PomodoroSettingsModal from '@/components/pomodoro/PomodoroSettingsModal';
import PomodoroLogTable from '@/components/pomodoro/PomodoroLogTable';

import { usePomodoroManager } from '@/hooks/usePomodoroManager';

export default function PomodoroPage() {
  const {
    userID,
    partnerID,
    coupleSessionID, // Derived from userID and partnerID
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
  } = usePomodoroManager();

  const isFullyConnected = userID && partnerID && coupleSessionID;

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen selection:bg-accent/30">
      <header className="w-full max-w-2xl mb-8 text-center">
        <h1 className="text-5xl font-headline font-bold text-primary mb-2 flex items-center justify-center">
          Welcome
        </h1>
        <p className="text-lg text-foreground/80">Our special time to focus and grow together.</p>
      </header>

      <SessionManager
        currentUserID={userID}
        currentPartnerID={partnerID}
        onSetUserID={handleSetUserID}
        onSetPartnerID={handleSetPartnerID}
        onLogout={logoutAndReset}
      />

      {isFullyConnected ? (
         <div className="w-full max-w-md relative mt-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={openSettingsModal} 
            className="absolute top-4 right-4 text-primary hover:text-accent hover:bg-accent/10 z-10"
            aria-label="Open Pomodoro settings"
          >
            <Settings2 className="h-6 w-6" />
          </Button>
          <Card className="w-full shadow-xl rounded-xl overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <ModeTabs currentMode={currentMode} onModeChange={switchTimerMode} />
              <TimerDisplay currentTimeInSeconds={currentTime} />
              <TimerControls
                timerState={timerState}
                onStart={startTimer}
                onPause={pauseTimer}
                onStop={stopTimer}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="w-full max-w-md mt-8 shadow-lg">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground text-lg">
              { !userID ? "Please set your User ID above to begin." 
              : !partnerID ? "Now, link with your partner above to start your synced session!" 
              : "Connecting..."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Our love grows with every shared moment. ❤️
            </p>
          </CardContent>
        </Card>
      )}

      {isFullyConnected && pomodoroLogs.length > 0 && (
        <div className="w-full max-w-2xl mt-8">
          <PomodoroLogTable logs={pomodoroLogs} />
        </div>
      )}
       {isFullyConnected && pomodoroLogs.length === 0 && (
         <p className="text-center text-muted-foreground mt-8">No focus sessions logged yet for this beautiful connection. Let's start one! 🥰</p>
       )}
      

      <PomodoroSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        initialWorkDuration={workDuration}
        initialBreakDuration={breakDuration}
        onSave={handleSettingsChange}
      />
      
    </div>
  );
}
