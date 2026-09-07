"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Lets a student build the campus logtime index with their own 42 API key.
 *
 * 42 rate limits per application, not per user, so going through the site's own
 * key gives no extra headroom -- a key the student registers themselves is the
 * only way to afford one request per student across a campus. The index they
 * produce is shared, so everyone else reads it without a key of their own.
 *
 * The credentials are exchanged for a token once and never stored: only the
 * token lives here, in sessionStorage, and it dies with the tab.
 */

const TOKEN_STORAGE_KEY = "byok_42_token";
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

const readStoredToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export function LogtimeIndexBuilder({ campus, indexUpdatedAt }: Props) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    setToken(readStoredToken());
  }, []);

  const storeToken = (value: string) => {
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, value);
    } catch {
      // A private window can refuse storage; the token still works this session.
    }
    setToken(value);
  };

  const authenticate = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;

    setAuthenticating(true);
    try {
      const response = await fetch("/api/byok/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Could not authenticate those credentials");
        return;
      }

      storeToken(data.access_token);
      setClientId("");
      setClientSecret("");
      setDialogOpen(false);
      toast.success("Key accepted. You can build the logtime index.");
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setAuthenticating(false);
    }
  };

  const buildIndex = async () => {
    const activeToken = token ?? readStoredToken();
    if (!activeToken || !campus) return;

    setProgress({ done: 0, total: 0 });
    let offset: number | null = 0;

    try {
      while (offset !== null) {
        const response = await fetch(`/api/byok/logtime/${campus}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: activeToken,
            offset,
            limit: CHUNK_SIZE,
          }),
        });

        const data: ChunkResult = await response.json();

        if (response.status === 401) {
          try {
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {
            // nothing to clean up
          }
          setToken(null);
          toast.error("Your key expired. Enter it again to continue.");
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
        {token ? (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use your own 42 API key</DialogTitle>
            <DialogDescription>
              Logtime rankings need one API call per student, which the shared
              site key cannot afford. Create an application on the intra
              (Settings → API → Register a new app) and paste its credentials
              here. They are exchanged for a token and never stored — only the
              token is kept, in this tab. The index you build is shared with
              everyone on your campus.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Input
              placeholder="Client ID (UID)"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              autoComplete="off"
            />
            <Input
              type="password"
              placeholder="Client secret"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              onClick={authenticate}
              disabled={authenticating || !clientId.trim() || !clientSecret.trim()}
            >
              {authenticating ? "Checking…" : "Save key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
