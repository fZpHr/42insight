"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LoadingScreenProps {
  message?: string;
  /**
   * Scope of a server-side fetch to follow, e.g. "campus:Nice". When the fetch
   * is long enough to publish progress, the screen shows the real count instead
   * of a spinner with nothing behind it.
   */
  progressScope?: string;
}

interface FetchProgress {
  phase: string;
  done: number;
  total: number;
}

const POLL_INTERVAL_MS = 700;

export function LoadingScreen({
  message = "Loading...",
  progressScope,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!progressScope) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/progress/${encodeURIComponent(progressScope)}`,
        );
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setProgress(data);
      } catch {
        // The screen still works without progress; keep quiet.
      }
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [progressScope]);

  const percentage =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>

      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground">
            {progress?.phase ?? message}
          </p>
        </div>

        {percentage !== null && (
          <div className="flex flex-col items-center gap-2 w-full max-w-sm">
            <Progress value={percentage} className="h-2 w-full" />
            <p className="text-xs text-muted-foreground tabular-nums">
              {progress!.done} / {progress!.total} students · {percentage}%
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {elapsed}s
          {percentage === null && elapsed > 3 && (
            <span> · building from the 42 API, this is slower than a cached load</span>
          )}
        </p>
      </div>
    </div>
  );
}
