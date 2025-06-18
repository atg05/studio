"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, Share2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface SessionManagerProps {
  sessionId: string | null;
  onCreateSession: () => void;
  onJoinSession: (id: string) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ sessionId, onCreateSession, onJoinSession }) => {
  const [joinInputId, setJoinInputId] = useState('');
  const { toast } = useToast();

  const handleJoin = () => {
    if (joinInputId.trim()) {
      onJoinSession(joinInputId.trim().toUpperCase());
    } else {
      toast({ title: "Input Error", description: "Please enter a session ID to join.", variant: "destructive" });
    }
  };

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
        .then(() => toast({ title: "Copied!", description: "Session ID copied to clipboard." }))
        .catch(() => toast({ title: "Error", description: "Failed to copy session ID.", variant: "destructive" }));
    }
  };
  
  const shareSessionId = () => {
    if (sessionId && navigator.share) {
      navigator.share({
        title: 'Pomodoro Together Session',
        text: `Join my Pomodoro session: ${sessionId}`,
        url: window.location.href, // Or a direct link if sessions have unique URLs
      })
      .then(() => toast({ title: "Shared!", description: "Session link shared."}))
      .catch((error) => console.log('Error sharing', error));
    } else if (sessionId) {
      // Fallback for browsers that don't support navigator.share
      copySessionId();
      toast({ title: "Link Copied", description: "Session link copied. Share it manually!" });
    }
  };


  return (
    <Card className="w-full shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Session Management</CardTitle>
        <CardDescription>Create a new session or join an existing one.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sessionId ? (
          <div className="space-y-3 text-center">
            <p className="text-lg">Current Session ID: 
              <strong className="ml-2 font-mono text-accent p-1 bg-accent/10 rounded-md">{sessionId}</strong>
            </p>
            <div className="flex justify-center space-x-2">
              <Button variant="outline" size="sm" onClick={copySessionId} aria-label="Copy session ID">
                <Copy className="h-4 w-4 mr-2" /> Copy ID
              </Button>
              {navigator.share && (
                <Button variant="outline" size="sm" onClick={shareSessionId} aria-label="Share session ID">
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={onCreateSession} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base">
              Create New Session
            </Button>
            <div className="flex items-center space-x-2">
              <hr className="flex-grow border-t border-border" />
              <span className="text-sm text-muted-foreground">OR</span>
              <hr className="flex-grow border-t border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-session-id" className="text-base">Join Existing Session</Label>
              <div className="flex space-x-2">
                <Input
                  id="join-session-id"
                  type="text"
                  value={joinInputId}
                  onChange={(e) => setJoinInputId(e.target.value)}
                  placeholder="Enter Session ID"
                  className="text-base"
                  aria-label="Enter Session ID to join"
                />
                <Button onClick={handleJoin} variant="secondary" className="py-3 text-base">Join</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionManager;
