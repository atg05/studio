"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, Share2, Heart } from 'lucide-react';
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
      toast({ title: "Input Error", description: "Please enter your session ID to join.", variant: "destructive" });
    }
  };

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
        .then(() => toast({ title: "Copied!", description: "Our session ID copied to clipboard." }))
        .catch(() => toast({ title: "Error", description: "Failed to copy our session ID.", variant: "destructive" }));
    }
  };
  
  const shareSessionId = () => {
    if (sessionId && navigator.share) {
      navigator.share({
        title: 'Our Pomodoro Session - Yashi & Avinash',
        text: `Join our Pomodoro session: ${sessionId}`,
        url: window.location.href, 
      })
      .then(() => toast({ title: "Shared!", description: "Our session link shared."}))
      .catch((error) => console.log('Error sharing', error));
    } else if (sessionId) {
      copySessionId();
      toast({ title: "Link Copied", description: "Our session link copied. Share it with your love!" });
    }
  };


  return (
    <Card className="w-full shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Our Special Session</CardTitle>
        <CardDescription>Let's start our focused time together or join our ongoing session, Yashi & Avinash.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sessionId ? (
          <div className="space-y-3 text-center">
            <p className="text-lg">Our Current Session ID: 
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
              Start Our Session <Heart className="ml-2 h-4 w-4 fill-current" />
            </Button>
            <div className="flex items-center space-x-2">
              <hr className="flex-grow border-t border-border" />
              <span className="text-sm text-muted-foreground">OR</span>
              <hr className="flex-grow border-t border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-session-id" className="text-base">Join Our Session</Label>
              <div className="flex space-x-2">
                <Input
                  id="join-session-id"
                  type="text"
                  value={joinInputId}
                  onChange={(e) => setJoinInputId(e.target.value)}
                  placeholder="Enter Our Session ID"
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
