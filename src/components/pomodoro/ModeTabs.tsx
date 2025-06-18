"use client";

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimerMode } from '@/types/pomodoro';

interface ModeTabsProps {
  currentMode: TimerMode;
  onModeChange: (mode: TimerMode) => void;
}

const ModeTabs: React.FC<ModeTabsProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex justify-center my-6">
      <Tabs value={currentMode} onValueChange={(value) => onModeChange(value as TimerMode)} className="w-auto">
        <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg">
          <TabsTrigger 
            value="work" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md py-2 text-base transition-all duration-150"
            aria-label="Switch to Work mode"
          >
            Work
          </TabsTrigger>
          <TabsTrigger 
            value="break" 
            className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md rounded-md py-2 text-base transition-all duration-150"
            aria-label="Switch to Break mode"
          >
            Break
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default ModeTabs;
