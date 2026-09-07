"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { hasApiKey } from "@/lib/api-client";

/**
 * Connects a student's own 42 application, and shows what it has left.
 *
 * The site's credentials sign people in and do nothing else, so a key here is
 * what makes the site show anything at all. 42 meters per application: yours is
 * 1200 requests an hour that nobody else draws from.
 *
 * The credentials are exchanged for a token, sealed into an encrypted httpOnly
 * cookie that lasts a month, and never written anywhere else -- so the key is
 * entered once, not every session. "Forget" removes it.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface KeyQuota {
  keyId: string;
  used: number;
  remaining: number;
  limit: number;
  source?: "42" | "counted";
  observedAt?: string | null;
}

/** Says where a figure comes from, so nobody has to trust it blindly. */
const provenance = (quota: {
  source?: string;
  observedAt?: string | null;
}): string =>
  quota.source === "42"
    ? `Reported by the 42 API${
        quota.observedAt
          ? ` at ${new Date(quota.observedAt).toLocaleTimeString()}`
          : ""
      }.`
    : "This key has not been used yet on this server, so this is its full budget.";

const Meter = ({
  label,
  used,
  limit,
  note,
}: {
  label: string;
  used: number;
  limit: number;
  note?: string;
}) => {
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {Math.max(0, limit - used)} / {limit} left
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
};

export function ApiKeyDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyPresent, setKeyPresent] = useState(false);
  const [personal, setPersonal] = useState<KeyQuota | null>(null);


  useEffect(() => {
    if (!open) return;

    setKeyPresent(hasApiKey());

    fetch("/api/quota")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setPersonal(data?.personal?.present ? data.personal : null))
      .catch(() => setPersonal(null));
  }, [open]);

  const save = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;

    setSaving(true);
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

      setClientId("");
      setClientSecret("");
      onOpenChange(false);
      toast.success("Key connected. It stays for a month.");
      await queryClient.invalidateQueries();
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const forget = async () => {
    try {
      await fetch("/api/byok/token", { method: "DELETE" });
      setKeyPresent(false);
      setPersonal(null);
      toast.success("Key forgotten. Pages will ask for one again.");
      await queryClient.invalidateQueries();
    } catch {
      toast.error("Could not reach the server");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {keyPresent ? "Your 42 API key" : "Connect your 42 API key"}
          </DialogTitle>
          <DialogDescription>
            42Insight reads everything live from the 42 API, on your key. The
            site&apos;s own application is reserved for signing in — fetching on
            it would compete with logging in, and a busy day would lock people
            out. Create an application on the intra — Settings → API → Register
            a new app — and paste its credentials below. They are exchanged for
            a token and never stored in readable form.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {keyPresent && personal && (
            <Meter
              label="Your key, this hour"
              used={personal.used}
              limit={personal.limit}
              note={provenance(personal)}
            />
          )}

          {!keyPresent && (
            <p className="rounded-md border border-muted bg-muted/40 p-2 text-xs text-muted-foreground">
              Until you connect one, pages have nothing to load: the site&apos;s
              own 42 application is reserved for signing in, so no data is
              fetched on it. Yours takes about a minute to register.
            </p>
          )}

          {!keyPresent && (
            <>
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
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {keyPresent ? (
            <>
              <Button variant="outline" onClick={forget}>
                Forget my key
              </Button>
              <Button variant="secondary" onClick={() => setKeyPresent(false)}>
                Replace it
              </Button>
            </>
          ) : (
            <Button
              onClick={save}
              disabled={saving || !clientId.trim() || !clientSecret.trim()}
            >
              {saving ? "Checking…" : "Save key"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
