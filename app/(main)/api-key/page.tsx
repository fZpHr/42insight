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
import { IntraKeyGuide } from "@/components/IntraKeyGuide";
import { ActivityGuide } from "@/components/ActivityGuide";
import {
  LANGUAGE_STORAGE_KEY,
  REPO_URL,
  copy,
  detectLanguage,
  type Language,
} from "@/lib/api-key-copy";

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
  const [language, setLanguage] = useState<Language>("fr");

  // After mount: navigator and localStorage do not exist on the server, and a
  // guess here would render the wrong language for a moment.
  useEffect(() => setLanguage(detectLanguage()), []);

  const t = copy[language];

  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Not remembering it is a smaller failure than not honouring it.
    }
  };

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
        toast.error(data.error ?? t.rejected);
        return;
      }

      setClientId("");
      setClientSecret("");
      toast.success(t.connected);
      await queryClient.invalidateQueries();
      refresh();
      router.push("/dashboard");
    } catch {
      toast.error(t.unreachable);
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
      toast.success(t.forgotten);
    } catch {
      toast.error(t.unreachable);
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
                {keyPresent ? t.titleConnected : t.titleConnect}
              </CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </div>

            <div className="ml-auto flex shrink-0 overflow-hidden rounded-md border text-xs">
              {(["fr", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => chooseLanguage(code)}
                  aria-pressed={language === code}
                  className={`px-2 py-1 transition-colors ${
                    language === code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t.why}</p>
            <p>{t.quota}</p>
            <p>{t.transparency}</p>
            <p>
              {t.storageBefore}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {t.storageLink}
                <ExternalLink className="h-3 w-3" />
              </a>
              {t.storageAfter}
            </p>
          </div>

          {keyPresent ? (
            <>
              {quota && (
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{t.thisHour}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {quota.remaining} / {quota.limit} {t.left}
                    </span>
                  </div>
                  <Progress value={percentageUsed} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {quota.source === "42"
                      ? t.reportedBy(
                          quota.observedAt
                            ? t.reportedAt(
                                new Date(quota.observedAt).toLocaleTimeString(),
                              )
                            : "",
                        )
                      : t.notUsedYet}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={forget}>
                  {t.forget}
                </Button>
                <Button variant="secondary" onClick={() => setKeyPresent(false)}>
                  {t.replace}
                </Button>
              </div>
            </>
          ) : (
            <>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  {t.step1Before}
                  <a
                    href="https://profile.intra.42.fr/oauth/applications/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {t.step1Link}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {t.step1After}
                </li>
                <li>
                  {t.step2Before}
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                    {t.step2Code}
                  </code>
                  {t.step2After}
                </li>
                <li>{t.step3}</li>
              </ol>

              <IntraKeyGuide language={language} />

              <p className="text-sm text-muted-foreground">
                {t.existingBefore}
                <a
                  href="https://profile.intra.42.fr/oauth/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {t.existingLink}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {t.existingAfter}
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="client-id" className="text-sm font-medium">{t.clientId}</label>
                  <Input
                    id="client-id"
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    autoComplete="off"
                    placeholder="u-s4t2ud-…"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="client-secret" className="text-sm font-medium">{t.clientSecret}</label>
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
                {saving ? t.checking : t.connect}
              </Button>
            </>
          )}

          <ActivityGuide language={language} />
        </CardContent>
      </Card>
    </div>
  );
}
