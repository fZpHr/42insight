"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/api-client";

/**
 * Asks before reading all 42 at once.
 *
 * Every other campus on this site is a few seconds and a handful of requests.
 * Global is the whole network -- tens of thousands of students, several
 * minutes, and a large share of the hour's quota, all of it on the visitor's
 * own key. That is worth a question rather than a click.
 *
 * The numbers are 42's own, fetched when the dialog opens, so the price quoted
 * is the price of doing it today.
 */

interface GlobalCost {
  campuses: number;
  students: number;
  requests: number;
  seconds: number;
  hourlyLimit: number;
}

const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

export function GlobalFetchDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { data: cost, isLoading } = useQuery({
    queryKey: ["global-cost"],
    queryFn: () => fetchJson<GlobalCost>("/api/campuses/cost"),
    enabled: open,
    staleTime: 60 * 60 * 1000,
  });

  const share = cost
    ? Math.round((cost.requests / cost.hourlyLimit) * 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Read every campus?
          </DialogTitle>
          <DialogDescription>
            Global covers all of 42, not one school. It runs on your own key, so
            here is what it costs before you spend it.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Asking 42 how big it is…
          </div>
        )}

        {cost && (
          <div className="grid grid-cols-2 gap-3 py-2">
            <Figure value={cost.students.toLocaleString()} label="students" />
            <Figure value={String(cost.campuses)} label="campuses" />
            <Figure value={`~${minutes(cost.seconds)} min`} label="to load" />
            <Figure
              value={`~${cost.requests.toLocaleString()}`}
              label={
                share === null
                  ? "requests"
                  : `requests, ${share}% of your hour`
              }
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          It is kept for fifteen minutes afterwards, and campuses you have
          already opened are reused rather than fetched again. You can keep
          browsing while it runs.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            Load all of 42
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Figure = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-md border bg-muted/40 px-3 py-2">
    <p className="text-lg font-semibold leading-none tabular-nums">{value}</p>
    <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
  </div>
);
