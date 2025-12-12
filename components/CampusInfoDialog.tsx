"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const supportedCampuses = ["Angouleme", "Nice"];

interface CampusInfoDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CampusInfoDialog({ open: controlledOpen, onOpenChange }: CampusInfoDialogProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    if (user?.campus && !supportedCampuses.includes(user.campus)) {
      const hasSeenPopup = localStorage.getItem('campus-info-seen');
      if (!hasSeenPopup) {
        setOpen(true);
      }
    }
  }, [user?.campus, setOpen]);

  const handleClose = () => {
    localStorage.setItem('campus-info-seen', 'true');
    setOpen(false);
  };

  if (!user?.campus || supportedCampuses.includes(user.campus)) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Welcome to 42insight!
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <p className="text-foreground">
              This website is primarily designed for <span className="font-semibold">42 Angoulême</span> and <span className="font-semibold">42 Nice</span> campuses.
            </p>
            <p className="text-muted-foreground">
              Due to privacy considerations, certain features are restricted to these campuses. 
              Some tabs in the navigation will not be accessible from your campus ({user?.campus}).
            </p>
            <p className="text-muted-foreground">
              If you have any questions or would like to discuss expanding support to your campus, 
              feel free to reach out on Slack: <span className="font-semibold text-foreground">@hbelle</span>
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={handleClose}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
