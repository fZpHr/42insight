"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Collects a student's own 42 application credentials.
 *
 * The site's keys carry every page whose cost does not grow with the size of
 * the campus. A key here is for the work that does: building the campus logtime
 * index, which is one API call per student, and querying the API console
 * without the shared-key rate limit.
 *
 * The credentials are posted once, exchanged for a token server-side, and never
 * stored. The token comes back as an httpOnly cookie that page scripts cannot
 * read.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);

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
      toast.success("Key connected.");
      await queryClient.invalidateQueries();
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect your 42 API key</DialogTitle>
          <DialogDescription>
            Optional. The site runs on its own keys; yours pays for the work
            that costs one API call per student — building the campus logtime
            index — and lifts the rate limit on the API console. Create an
            application on the intra — Settings → API → Register a new app — and
            paste its credentials below. They are exchanged for a token and
            never stored.
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
            onClick={save}
            disabled={saving || !clientId.trim() || !clientSecret.trim()}
          >
            {saving ? "Checking…" : "Save key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
