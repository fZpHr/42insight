"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasApiKey } from "@/lib/api-client";

/**
 * Where a visitor connects their own 42 application.
 *
 * The site's credentials sign people in and do nothing else -- 42 meters per
 * application, so fetching pages on that key would compete with logging in, and
 * a busy day would lock everyone out. Data therefore runs on a key each visitor
 * registers, and until there is one the rest of the site has nothing to show.
 * That is why this is a page of its own with the other tabs disabled behind it,
 * rather than a prompt appearing on each one in turn.
 */

interface Quota {
  used: number;
  remaining: number;
  limit: number;
  source?: "42" | "counted";
  observedAt?: string | null;
}

export default function ApiKeyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyPresent, setKeyPresent] = useState<boolean | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);

  const refresh = () => {
    setKeyPresent(hasApiKey());
    fetch("/api/quota")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setQuota(data?.personal?.present ? data.personal : null))
      .catch(() => setQuota(null));
  };

  useEffect(refresh, []);

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
      toast.success("Key connected. The rest of the site is open.");
      await queryClient.invalidateQueries();
      refresh();
      router.push("/dashboard");
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const forget = async () => {
    try {
      await fetch("/api/byok/token", { method: "DELETE" });
      await queryClient.invalidateQueries();
      setQuota(null);
      setKeyPresent(false);
      toast.success("Key forgotten.");
    } catch {
      toast.error("Could not reach the server");
    }
  };

  const percentageUsed =
    quota && quota.limit > 0 ? Math.min(100, (quota.used / quota.limit) * 100) : 0;

  return (
    <div className="container mx-auto max-w-2xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>
                {keyPresent ? "Your 42 API key" : "Connect your 42 API key"}
              </CardTitle>
              <CardDescription>
                42Insight reads everything live from the 42 API, on your key.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              The site&apos;s own 42 application is reserved for signing people
              in. 42 meters per application, so if pages were fetched on it too,
              a busy afternoon would spend the budget logging in depends on —
              and nobody could sign in until the hour rolled over. Your key is
              yours alone: 1200 requests an hour that nobody else draws from.
            </p>
            <p>
              Your credentials are exchanged for a token and sealed into an
              encrypted, httpOnly cookie that lasts a month. They are never
              written to a database or a log — there is no database here.
            </p>
          </div>

          {keyPresent ? (
            <>
              {quota && (
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">This hour</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {quota.remaining} / {quota.limit} left
                    </span>
                  </div>
                  <Progress value={percentageUsed} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {quota.source === "42"
                      ? `Reported by the 42 API${
                          quota.observedAt
                            ? ` at ${new Date(quota.observedAt).toLocaleTimeString()}`
                            : ""
                        }.`
                      : "Not used yet on this server, so this is the full budget."}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={forget}>
                  Forget my key
                </Button>
                <Button variant="secondary" onClick={() => setKeyPresent(false)}>
                  Replace it
                </Button>
              </div>
            </>
          ) : (
            <>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  Open{" "}
                  <a
                    href="https://profile.intra.42.fr/oauth/applications/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Settings → API → Register a new app
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  on the intra.
                </li>
                <li>Give it any name; no redirect URI is needed.</li>
                <li>Copy its UID and secret below.</li>
              </ol>

              <p className="text-sm text-muted-foreground">
                Already registered an application?{" "}
                <a
                  href="https://profile.intra.42.fr/oauth/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Find it in your existing apps
                  <ExternalLink className="h-3 w-3" />
                </a>{" "}
                and reuse its credentials — there is no need to create another.
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="client-id" className="text-sm font-medium">Client ID (UID)</label>
                  <Input
                    id="client-id"
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    autoComplete="off"
                    placeholder="u-s4t2ud-…"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="client-secret" className="text-sm font-medium">Client secret</label>
                  <Input
                    id="client-secret"
                    type="password"
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                    autoComplete="off"
                    placeholder="s-s4t2ud-…"
                  />
                </div>
              </div>

              <Button
                onClick={save}
                disabled={saving || !clientId.trim() || !clientSecret.trim()}
                className="w-full gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {saving ? "Checking with 42…" : "Connect my key"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
