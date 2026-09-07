"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LoadingScreenProps {
  message?: string;
}

/**
 * The wait shown while a page fetches.
 *
 * It used to poll a server-side progress channel, which needed somewhere to
 * write progress to. Nothing on the server keeps state between requests any
 * more, so it shows the elapsed time instead -- honest about the wait without
 * pretending to know how far along it is.
 *
 * A cold campus load is several seconds: the 42 API is paced at two requests a
 * second per key and a campus takes a dozen pages. The note after a few seconds
 * exists so that reads as work rather than as a hang.
 */
export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

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
          <p className="text-muted-foreground">{message}</p>
        </div>

        <p className="text-xs text-muted-foreground">
          {elapsed}s
          {elapsed > 3 && <span> · reading live from the 42 API</span>}
        </p>
      </div>
    </div>
  );
}
