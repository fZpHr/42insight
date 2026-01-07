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
import { useCampus } from "@/contexts/CampusContext";

const supportedCampuses = ["Angouleme", "Nice"];

interface CampusInfoDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CampusInfoDialog({ open: controlledOpen, onOpenChange }: CampusInfoDialogProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const { selectedCampus } = useCampus();
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const effectiveCampus = selectedCampus || user?.campus;

  useEffect(() => {
    if (effectiveCampus && !supportedCampuses.includes(effectiveCampus)) {
      const hasSeenPopup = localStorage.getItem(`campus-info-seen-${effectiveCampus}`);
      if (!hasSeenPopup) {
        setOpen(true);
      }
    }
  }, [effectiveCampus, setOpen]);

  const handleClose = () => {
    if (effectiveCampus) {
      localStorage.setItem(`campus-info-seen-${effectiveCampus}`, 'true');
    }
    setOpen(false);
  };

  if (!effectiveCampus || supportedCampuses.includes(effectiveCampus)) {
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
              Some tabs in the navigation will not be accessible from your campus ({effectiveCampus}).
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
