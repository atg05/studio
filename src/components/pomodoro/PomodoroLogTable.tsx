
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
import { format, isValid } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

interface PomodoroLogTableProps {
  logs: PomodoroLogEntry[];
}

const PomodoroLogTable: React.FC<PomodoroLogTableProps> = ({ logs }) => {
  const formatDate = (dateValue: Timestamp | Date | null, logId: string): string => {
    if (dateValue === null || typeof dateValue === 'undefined') {
      console.warn(`[LogTable] Date value is null or undefined for log ID ${logId}.`);
      return 'Date Missing';
    }

    // If it's already a JavaScript Date object
    if (dateValue instanceof Date) {
      if (isValid(dateValue)) {
        return format(dateValue, "MMM dd, yyyy 'at' hh:mm a");
      } else {
        console.warn(`[LogTable] Invalid JS Date object encountered for log ID ${logId}:`, dateValue);
        return 'Invalid Date Obj';
      }
    }

    // Check if it's a Firebase Timestamp (common structure)
    // Firestore Timestamps have toDate method
    if (typeof (dateValue as Timestamp).toDate === 'function') {
      try {
        const jsDate = (dateValue as Timestamp).toDate();
        if (isValid(jsDate)) {
          return format(jsDate, "MMM dd, yyyy 'at' hh:mm a");
        } else {
          console.warn(`[LogTable] Firebase Timestamp toDate() resulted in an invalid date for log ID ${logId}:`, jsDate, "Original Firestore Timestamp:", dateValue);
          return 'Invalid Conv. Date';
        }
      } catch (e) {
        console.error(`[LogTable] Error converting Firebase Timestamp to Date for log ID ${logId}:`, e, "Original Firestore Timestamp:", dateValue);
        return 'Conversion Error';
      }
    }
    
    // Fallback for other types, e.g. a string representation if any such data exists
    if (typeof dateValue === 'string') {
      try {
        const parsedDate = new Date(dateValue);
        if (isValid(parsedDate)) {
          return format(parsedDate, "MMM dd, yyyy 'at' hh:mm a");
        } else {
          console.warn(`[LogTable] Invalid date string encountered for log ID ${logId}:`, dateValue);
          return 'Invalid Date Str';
        }
      } catch (e) {
         console.error(`[LogTable] Error parsing date string for log ID ${logId}:`, e, dateValue);
         return 'Parsing Error Str';
      }
    }

    console.warn(`[LogTable] Unformattable date value type encountered for log ID ${logId}:`, dateValue, typeof dateValue);
    return 'Unknown Date Fmt';
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
