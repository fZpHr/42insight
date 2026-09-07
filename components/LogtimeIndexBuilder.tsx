"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { hasApiKey } from "@/lib/api-client";
import { mergeLogtimeChunk, readLogtimeIndex } from "@/lib/logtime-store";
import { recordResponse } from "@/lib/quota-store";

/**
 * Builds the campus logtime index into this browser, with the visitor's key.
 *
 * Logtime needs one API call per student, which is more than the site's hourly
 * budget and more than any page load can wait for -- and the server keeps
 * nothing between requests, so there is nowhere to put it even if it could be
 * fetched. The visitor's own quota pays for it and their own browser holds it.
 */

const CHUNK_SIZE = 40;

interface Props {
  campus: string;
  /** Called after a successful build so the page can re-read the index. */
  onBuilt?: () => void;
}

interface ChunkResult {
  entries: Record<string, any>;
  processed: number;
  total: number;
  failed: number;
  nextOffset: number | null;
  done: boolean;
  error?: string;
}

export function LogtimeIndexBuilder({ campus, onBuilt }: Props) {
  const [keyPresent, setKeyPresent] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [builtAt, setBuiltAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    setKeyPresent(hasApiKey());
  }, [dialogOpen]);

  useEffect(() => {
    setBuiltAt(readLogtimeIndex(campus)?.builtAt ?? null);
  }, [campus]);

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

        recordResponse(response);
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

        if (!mergeLogtimeChunk(campus, data.entries)) {
          toast.error(
            "This browser refused to store the index — it may be full or in private mode.",
          );
          return;
        }

        setProgress({ done: data.processed, total: data.total });
        offset = data.nextOffset;
      }

      setBuiltAt(readLogtimeIndex(campus)?.builtAt ?? null);
      onBuilt?.();
      toast.success("Logtime index built. The logtime sorts are available.");
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

        {builtAt && progress === null && (
          <span className="text-xs text-muted-foreground">
            Built {new Date(builtAt).toLocaleDateString()}, in this browser
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
