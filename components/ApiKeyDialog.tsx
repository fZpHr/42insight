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
 * 42 rate limits per application, and this deployment runs a single registered
 * app that next-auth also uses to sign people in -- so data requests made on it
 * compete with logging in. Students therefore bring their own key for data, and
 * the site key does nothing but OAuth.
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
      toast.success("Key saved. Loading your data.");
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
            42Insight reads everything live from the 42 API using your own key,
            so that browsing never eats into the shared quota that signing in
            depends on. Create an application on the intra — Settings → API →
            Register a new app — and paste its credentials below. They are
            exchanged for a token and never stored.
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
