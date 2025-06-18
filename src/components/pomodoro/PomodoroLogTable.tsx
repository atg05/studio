
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
import { format, isValid } from 'date-fns'; // Import isValid

interface PomodoroLogTableProps {
  logs: PomodoroLogEntry[];
}

const PomodoroLogTable: React.FC<PomodoroLogTableProps> = ({ logs }) => {
  const formatDate = (date: Date | any, logId: string) => {
    if (date instanceof Date) {
      if (isValid(date)) {
        return format(date, "MMM dd, yyyy 'at' hh:mm a");
      } else {
        console.warn(`Invalid JS Date object encountered for log ID ${logId}:`, date);
        return 'Invalid Date Obj';
      }
    }
    if (date && typeof date.toDate === 'function') { // Firebase Timestamp
      try {
        const jsDate = date.toDate();
        if (isValid(jsDate)) {
          return format(jsDate, "MMM dd, yyyy 'at' hh:mm a");
        } else {
          console.warn(`Firebase Timestamp toDate() resulted in an invalid date for log ID ${logId}:`, jsDate, date);
          return 'Invalid Conv. Date';
        }
      } catch (e) {
        console.error(`Error converting Firebase Timestamp to Date for log ID ${logId}:`, e, date);
        return 'Conversion Error';
      }
    }
    console.warn(`Unformattable date value encountered for log ID ${logId}:`, date);
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
                  <TableCell className="font-medium">{formatDate(log.date, log.id)}</TableCell>
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
