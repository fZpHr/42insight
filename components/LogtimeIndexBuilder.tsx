"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { hasApiKey } from "@/lib/api-client";

/**
 * Builds the shared campus logtime index with the visitor's own key.
 *
 * Logtime needs one API call per student, so it is the one dataset that cannot
 * ride along with a campus-wide request. Whoever runs the build pays for it on
 * their own quota, and everyone on the campus reads the result afterwards.
 */

const CHUNK_SIZE = 40;

interface Props {
  campus: string;
  indexUpdatedAt?: string | null;
}

interface ChunkResult {
  processed: number;
  total: number;
  failed: number;
  nextOffset: number | null;
  done: boolean;
  error?: string;
}

export function LogtimeIndexBuilder({ campus, indexUpdatedAt }: Props) {
  const queryClient = useQueryClient();
  const [keyPresent, setKeyPresent] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    setKeyPresent(hasApiKey());
  }, [dialogOpen]);

  const buildIndex = async () => {
    if (!campus) return;

    setProgress({ done: 0, total: 0 });
    let offset: number | null = 0;

    try {
      while (offset !== null) {
        const response = await fetch(`/api/byok/logtime/${campus}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, limit: CHUNK_SIZE }),
        });

        const data: ChunkResult = await response.json();

        if (response.status === 428 || response.status === 401) {
          setKeyPresent(false);
          toast.error("Your key is missing or expired. Connect it again.");
          setDialogOpen(true);
          return;
        }

        if (!response.ok) {
          toast.error(data.error ?? "The build failed");
          return;
        }

        setProgress({ done: data.processed, total: data.total });
        offset = data.nextOffset;
      }

      await queryClient.invalidateQueries({ queryKey: ["campus-students"] });
      toast.success("Logtime index built. Every sort is available campus-wide.");
    } catch {
      toast.error("The build was interrupted");
    } finally {
      setProgress(null);
    }
  };

  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <div className="flex items-center gap-2">
        {keyPresent ? (
          <Button
            variant="outline"
            size="sm"
            onClick={buildIndex}
            disabled={progress !== null}
            className="gap-2"
          >
            {progress !== null ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {progress !== null ? "Building…" : "Build logtime index"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-2"
          >
            <KeyRound className="h-4 w-4" />
            Unlock logtime
          </Button>
        )}

        {indexUpdatedAt && progress === null && (
          <span className="text-xs text-muted-foreground">
            Index updated {new Date(indexUpdatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {progress !== null && (
        <div className="flex items-center gap-2">
          <Progress value={percentage} className="h-2 w-40" />
          <span className="text-xs text-muted-foreground tabular-nums">
            {progress.done}/{progress.total || "…"}
          </span>
        </div>
      )}

      <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
