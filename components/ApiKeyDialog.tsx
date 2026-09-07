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
import {
  clearPersonalQuota,
  readPersonalQuota,
  type PersonalQuota,
} from "@/lib/quota-store";

/**
 * Connects a student's own 42 application, and shows what it has left.
 *
 * 42 meters per application, so everyone browsing on the site's keys shares one
 * queue and waits behind each other at busy moments. A key of your own is a
 * lane of your own: 1200 requests an hour that nobody else is drawing from.
 *
 * The credentials are exchanged for a token, sealed into an encrypted httpOnly
 * cookie that lasts a month, and never written anywhere else -- so the key is
 * entered once, not every session. "Forget" removes it.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SharedQuota {
  keyId: string;
  used: number;
  remaining: number;
  limit: number;
  headers?: Record<string, string>;
}

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
  const [personal, setPersonal] = useState<PersonalQuota | null>(null);
  const [shared, setShared] = useState<SharedQuota[]>([]);

  useEffect(() => {
    if (!open) return;

    setKeyPresent(hasApiKey());
    setPersonal(readPersonalQuota());

    fetch("/api/quota")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setShared(data?.shared ?? []))
      .catch(() => setShared([]));
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
      clearPersonalQuota();
      setKeyPresent(false);
      setPersonal(readPersonalQuota());
      toast.success("Key forgotten. Back on the shared keys.");
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
            Optional. 42 allows each application 1200 requests an hour, and
            everyone without a key of their own shares the site&apos;s — so at
            busy moments your pages queue behind other people&apos;s. Your own
            key is your own lane. Create an application on the intra — Settings
            → API → Register a new app — and paste its credentials below. They
            are exchanged for a token and never stored in readable form.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {keyPresent && personal && (
            <Meter
              label="Your key, this hour"
              used={personal.used}
              limit={personal.limit}
              note={
                personal.resetAt
                  ? `Oldest request drops off at ${personal.resetAt.toLocaleTimeString()}`
                  : "Nothing spent yet."
              }
            />
          )}

          {shared.map((quota) => (
            <Meter
              key={quota.keyId}
              label={`Shared: ${quota.keyId}`}
              used={quota.used}
              limit={quota.limit}
              note="Counted by one server instance, so the real figure is at least this."
            />
          ))}

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
