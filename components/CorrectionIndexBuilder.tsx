"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mergeCorrectionChunk, readCorrectionIndex } from "@/lib/corrections-store";

/**
 * Builds the campus correction ratios into this browser, with the visitor's key.
 *
 * A ratio is two requests per student -- one counting the passes, one the
 * fails -- so a campus of 739 is 1478 requests against an hourly budget of
 * 1200. That is more than a page load can spend and more than the server has
 * anywhere to keep, which is why it is asked for rather than automatic, and
 * why what it produces lives in the reader's own browser.
 *
 * Same shape as the logtime builder next door, for the same reasons.
 */

const CHUNK_SIZE = 20;

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

export function CorrectionIndexBuilder({ campus, onBuilt }: Props) {
  const router = useRouter();
  const [builtAt, setBuiltAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    setBuiltAt(readCorrectionIndex(campus)?.builtAt ?? null);
  }, [campus]);

  const buildIndex = async () => {
    if (!campus) return;

    setProgress({ done: 0, total: 0 });
    let offset: number | null = 0;

    try {
      while (offset !== null) {
        const response = await fetch(`/api/byok/corrections/${campus}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, limit: CHUNK_SIZE }),
        });

        const data: ChunkResult = await response.json();

        if (response.status === 428 || response.status === 401) {
          toast.error("Your key is missing or expired. Connect it again.");
          router.push("/api-key");
          return;
        }

        if (!response.ok) {
          toast.error(data.error ?? "The build failed");
          return;
        }

        if (!mergeCorrectionChunk(campus, data.entries)) {
          toast.error(
            "This browser refused to store the index. It may be full, or in private mode.",
          );
          return;
        }

        setProgress({ done: data.processed, total: data.total });
        offset = data.nextOffset;
      }

      setBuiltAt(readCorrectionIndex(campus)?.builtAt ?? null);
      onBuilt?.();
      toast.success("Correction ratios built.");
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
            <Percent className="h-4 w-4" />
          )}
          {progress !== null
            ? "Building…"
            : builtAt
              ? "Rebuild correction ratios"
              : "Build correction ratios"}
        </Button>

        {builtAt && progress === null && (
          <span className="text-xs text-muted-foreground">
            Built {new Date(builtAt).toLocaleDateString()}, in this browser.
            It does not update itself.
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

    </div>
  );
}
