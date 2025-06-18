"use client";

import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PomodoroLogEntry } from '@/types/pomodoro';
import { format } from 'date-fns';

interface PomodoroLogTableProps {
  logs: PomodoroLogEntry[];
}

const PomodoroLogTable: React.FC<PomodoroLogTableProps> = ({ logs }) => {
  const formatDate = (date: Date | any) => {
    if (date instanceof Date) {
      return format(date, "MMM dd, yyyy 'at' hh:mm a");
    }
    if (date && typeof date.toDate === 'function') { // Firebase Timestamp
      return format(date.toDate(), "MMM dd, yyyy 'at' hh:mm a");
    }
    return 'Invalid Date';
  };

  return (
    <Card className="w-full shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Our Focus Journey ❤️</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground">No focus sessions logged yet. Let's start one!</p>
        ) : (
          <Table>
            <TableCaption>A log of our shared focus and break times.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Date & Time</TableHead>
                <TableHead>Our Slot</TableHead>
                <TableHead className="text-right">Duration Together</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{formatDate(log.date)}</TableCell>
                  <TableCell>{log.mode === 'work' ? 'Focus Time 💪' : 'Us Time 🥰'}</TableCell>
                  <TableCell className="text-right">{log.durationMinutes} min</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PomodoroLogTable;
