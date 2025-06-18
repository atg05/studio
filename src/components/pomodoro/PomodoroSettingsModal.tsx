"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { PomodoroSettingsValues } from '@/types/pomodoro';

interface PomodoroSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWorkDuration: number;
  initialBreakDuration: number;
  onSave: (settings: PomodoroSettingsValues) => void;
  // isSessionCreator: boolean; // To disable if not creator and session active (simplified for now)
}

const PomodoroSettingsModal: React.FC<PomodoroSettingsModalProps> = ({
  isOpen,
  onClose,
  initialWorkDuration,
  initialBreakDuration,
  onSave,
}) => {
  const [workDuration, setWorkDuration] = useState(initialWorkDuration);
  const [breakDuration, setBreakDuration] = useState(initialBreakDuration);

  useEffect(() => {
    setWorkDuration(initialWorkDuration);
    setBreakDuration(initialBreakDuration);
  }, [initialWorkDuration, initialBreakDuration, isOpen]);

  const handleSave = () => {
    onSave({ workDuration, breakDuration });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary">Pomodoro Settings</DialogTitle>
          <DialogDescription className="text-base">
            Adjust your work and break durations (in minutes).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-6">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="work-duration" className="text-right text-base col-span-1">
              Work
            </Label>
            <Input
              id="work-duration"
              type="number"
              value={workDuration}
              onChange={(e) => setWorkDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="col-span-3 text-base"
              min="1"
              aria-label="Work duration in minutes"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="break-duration" className="text-right text-base col-span-1">
              Break
            </Label>
            <Input
              id="break-duration"
              type="number"
              value={breakDuration}
              onChange={(e) => setBreakDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="col-span-3 text-base"
              min="1"
              aria-label="Break duration in minutes"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="text-base">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground text-base">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PomodoroSettingsModal;
