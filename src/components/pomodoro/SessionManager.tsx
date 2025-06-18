
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Users, LogOut, HeartCrack, VenetianMask } from 'lucide-react'; // User for My ID, Users for Partner ID
import { useToast } from "@/hooks/use-toast";

interface SessionManagerProps {
  currentUserID: string | null;
  currentPartnerID: string | null;
  onSetUserID: (id: string) => void;
  onSetPartnerID: (id: string) => void;
  onLogout: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ 
  currentUserID, 
  currentPartnerID, 
  onSetUserID, 
  onSetPartnerID,
  onLogout
}) => {
  const [userIDInput, setUserIDInput] = useState('');
  const [partnerIDInput, setPartnerIDInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // If currentUserID changes (e.g. loaded from localStorage), clear the input field
    // to avoid confusion if user wants to change it.
    if(currentUserID) setUserIDInput(''); 
  }, [currentUserID]);

  useEffect(() => {
    if(currentPartnerID) setPartnerIDInput('');
  }, [currentPartnerID]);

  const handleSetMyID = () => {
    if (userIDInput.trim()) {
      onSetUserID(userIDInput.trim());
    } else {
      toast({ title: "My Dearest,", description: "Please enter your special User ID.", variant: "destructive" });
    }
  };

  const handleSetPartner = () => {
    if (partnerIDInput.trim()) {
      onSetPartnerID(partnerIDInput.trim());
    } else {
      toast({ title: "My Love,", description: "Please enter your partner's User ID to connect.", variant: "destructive" });
    }
  };

  const handleDisconnectPartner = () => {
    // This will effectively set partnerID to null in the hook via onSetPartnerID('') or similar
    // The hook should then clear localStorage for partnerID.
    // For now, let's assume onSetPartnerID('') or onSetPartnerID(null) handles this.
    // A dedicated function in the hook like `disconnectPartner` would be cleaner.
    // For simplicity with current hook structure, we'll call onSetPartnerID with empty.
    // This requires the hook to interpret empty string as disconnect.
    // A better approach is: onSetPartnerID(null) which is not directly supported by input.
    // So, we add a specific function for this in the hook: logoutAndReset clears both.
    // For just partner, we need a new function in hook, or rely on onLogout to clear everything.
    // Let's make onLogout the primary way to "reset" connections.
    // If only partner disconnect is needed, the hook should provide a specific function.
    // For now, onLogout will serve as a full reset.
    // A "Disconnect Partner" could set partnerID to empty string,
    // and the hook `handleSetPartnerID` function could treat empty string as `null`.
    localStorage.removeItem('pomodoroPartnerID'); // Manually clear for now
    onSetPartnerID(''); // Signal to hook to clear partner
    toast({title: "Partner Disconnected", description: "You can link with your partner again anytime. ❤️"});
  }


  if (!currentUserID) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <User className="mr-2 h-6 w-6" /> Identify Yourself, My Love
          </CardTitle>
          <CardDescription>Let's start by setting your unique User ID for our special Pomodoro sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="user-id-input" className="text-base">Your Secret User ID</Label>
            <Input
              id="user-id-input"
              type="text"
              value={userIDInput}
              onChange={(e) => setUserIDInput(e.target.value.toUpperCase())}
              placeholder="e.g., YASHI or AVINASH"
              className="text-base mt-1"
              aria-label="Enter your User ID"
            />
          </div>
          <Button onClick={handleSetMyID} className="w-full py-3 text-base bg-accent hover:bg-accent/90 text-accent-foreground">
            Save My ID & Find My Love <VenetianMask className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (currentUserID && !currentPartnerID) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
             <Users className="mr-2 h-6 w-6" /> Connect With Your Soulmate
          </CardTitle>
          <CardDescription>Your ID is <strong className="text-accent">{currentUserID}</strong>. Now, let's find your partner!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="partner-id-input" className="text-base">Your Partner's Secret User ID</Label>
            <Input
              id="partner-id-input"
              type="text"
              value={partnerIDInput}
              onChange={(e) => setPartnerIDInput(e.target.value.toUpperCase())}
              placeholder="Enter Partner's User ID"
              className="text-base mt-1"
              aria-label="Enter your partner's User ID"
            />
          </div>
          <Button onClick={handleSetPartner} className="w-full py-3 text-base">
            Link Our Hearts <HeartCrack className="ml-2 h-5 w-5 fill-destructive group-hover:fill-destructive-foreground" />
          </Button>
          <Button variant="outline" onClick={onLogout} className="w-full text-base">
            <LogOut className="mr-2 h-5 w-5" /> Change My ID / Logout
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Both UserID and PartnerID are set
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Connected in Love & Focus!</CardTitle>
        <CardDescription>
          You: <strong className="text-accent">{currentUserID}</strong> <br/>
          Partner: <strong className="text-accent">{currentPartnerID}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
         <p className="text-center text-muted-foreground">Our hearts and timers are now in sync. Let's make every moment count! 🥰</p>
        <Button variant="destructive" onClick={onLogout} className="w-full text-base">
          <LogOut className="mr-2 h-5 w-5" /> Disconnect & Logout
        </Button>
      </CardContent>
    </Card>
  );
};

export default SessionManager;
