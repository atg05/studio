"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2 } from 'lucide-react';

import TimerDisplay from '@/components/pomodoro/TimerDisplay';
import TimerControls from '@/components/pomodoro/TimerControls';
import SessionManager from '@/components/pomodoro/SessionManager';
import ModeTabs from '@/components/pomodoro/ModeTabs';
import PomodoroSettingsModal from '@/components/pomodoro/PomodoroSettingsModal';

import { usePomodoroManager } from '@/hooks/usePomodoroManager';

export default function PomodoroPage() {
  const {
    sessionId,
    timerState,
    currentMode,
    currentTime,
    workDuration,
    breakDuration,
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
  } = usePomodoroManager();

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen selection:bg-accent/30">
      <header className="w-full max-w-2xl mb-8 text-center">
        <h1 className="text-5xl font-headline font-bold text-primary mb-2">Pomodoro Together</h1>
        <p className="text-lg text-foreground/80">Focus, collaborate, and achieve more.</p>
      </header>

      <SessionManager
        sessionId={sessionId}
        onCreateSession={createSession}
        onJoinSession={joinSession}
      />

      {sessionId && (
         <div className="w-full max-w-md relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={openSettingsModal} 
            className="absolute top-4 right-4 text-primary hover:text-accent hover:bg-accent/10"
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
      )}

      {!sessionId && (
        <Card className="w-full max-w-md mt-8 p-8 text-center bg-card shadow-lg rounded-xl">
          <h2 className="text-2xl font-semibold text-primary mb-4">Welcome!</h2>
          <p className="text-muted-foreground text-lg">
            Create a new session to start your Pomodoro timer, or join an existing session using an ID.
          </p>
        </Card>
      )}


      <PomodoroSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        initialWorkDuration={workDuration}
        initialBreakDuration={breakDuration}
        onSave={handleSettingsChange}
      />
      
      <footer className="mt-auto pt-12 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Pomodoro Together. Stay focused!</p>
      </footer>
    </div>
  );
}
