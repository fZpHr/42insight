"use client";

import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasApiKey } from "@/lib/api-client";

/**
 * What the site is doing to the 42 API, always on screen.
 *
 * Two things this architecture makes worth showing, because nothing else can:
 *
 * A page here is not a page load, it is a walk through the 42 API -- a campus
 * is a dozen paginated requests at two per second. That is seconds of real
 * work, and without a live count it reads as the site being stuck. So the
 * number of requests in flight is shown as it happens.
 *
 * And every one of those requests spends from the visitor's own hourly budget
 * of 1200, which runs out quietly. The figure shown is the 42 API's own -- it
 * reports what is left on every response -- so it is a reading, not an
 * estimate. That is why it sits in the header rather than behind a menu.
 */

const POLL_MS = 30000;
/** Never re-read the quota more than this often, whatever triggers it. */
const MIN_REFRESH_MS = 5000;

interface QuotaLine {
  keyId: string;
  used: number;
  remaining: number;
  limit: number;
  source?: "42" | "counted";
}

interface ApiCall {
  path: string;
  status: number;
  durationMs: number;
  at: string;
}

/** "/cursus_users?filter[campus_id]=41&…" -> "cursus_users · campus 41" */
const readable = (path: string): string => {
  const [endpoint, query = ""] = path.replace(/^\//, "").split("?");
  const filters = [...query.matchAll(/(?:filter|range)\[([a-z_]+)\]=([^&]*)/g)]
    .filter(([, name]) => name !== "cursus_id" && name !== "cursus")
    .map(([, name, value]) => `${name.replace(/_id$/, "")} ${decodeURIComponent(value).slice(0, 14)}`)
    .slice(0, 2);
  const page = query.match(/page\[number\]=(\d+)/);

  return [endpoint, ...filters, page ? `page ${page[1]}` : ""]
    .filter(Boolean)
    .join(" · ");
};

export function ApiStatusBar() {
  const fetching = useIsFetching();
  const [keyPresent, setKeyPresent] = useState(false);
  const [personal, setPersonal] = useState<QuotaLine | null>(null);
  const [calls, setCalls] = useState<ApiCall[] | null>(null);
  const lastRefresh = useRef(0);
  const wasFetching = useRef(false);

  const refresh = () => {
    // useIsFetching changes on every query start and stop, so an unthrottled
    // refresh turns the header into a firehose against /api/quota.
    const now = Date.now();
    if (now - lastRefresh.current < MIN_REFRESH_MS) return;
    lastRefresh.current = now;

    setKeyPresent(hasApiKey());

    fetch("/api/quota")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setPersonal(data?.personal?.present ? data.personal : null))
      .catch(() => {
        // The header must never be the thing that breaks a page.
      });
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  // Only on the edge from busy to idle: that is when the spend has changed.
  useEffect(() => {
    if (wasFetching.current && fetching === 0) refresh();
    wasFetching.current = fetching > 0;
  }, [fetching]);

  // There is only ever one budget to show: the visitor's own. Without a key
  // there is nothing to report, because nothing is fetched.
  const active = keyPresent ? personal : null;
  const percentageLeft = active
    ? Math.max(0, Math.min(100, (active.remaining / active.limit) * 100))
    : 100;

  const tone =
    percentageLeft > 40
      ? "text-muted-foreground"
      : percentageLeft > 15
        ? "text-amber-600 dark:text-amber-400"
        : "text-destructive";

  return (
    <>
      {/* The load itself: an indeterminate bar, because a campus walk has no
          honest percentage until the 42 API reports the collection size. */}
      {fetching > 0 && (
        <div
          aria-hidden
          className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary"
        />
      )}

      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) return;
          // Only when someone asks: this is a diagnostic, not a dashboard.
          setCalls(null);
          fetch("/api/activity")
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => setCalls(data?.calls ?? []))
            .catch(() => setCalls([]));
        }}
      >
        <DropdownMenuTrigger
          title={
            keyPresent
              ? "What your 42 key is fetching, and what is left this hour."
              : "No 42 key connected — pages have nothing to load."
          }
          className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted"
        >
        {fetching > 0 ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="tabular-nums">
              {fetching} request{fetching > 1 ? "s" : ""} to 42…
            </span>
          </>
        ) : (
          <>
            <KeyRound className={`h-3.5 w-3.5 ${keyPresent ? "text-primary" : "text-muted-foreground"}`} />
            {active ? (
              <>
                <span className={`tabular-nums ${tone}`}>
                  {active.remaining}/{active.limit}
                </span>
                <span className="hidden text-muted-foreground sm:inline">
                  your key
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Connect your 42 key</span>
            )}
          </>
        )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[26rem] p-0">
          <div className="flex items-baseline justify-between border-b px-3 py-2">
            <span className="text-xs font-medium">Recent 42 API calls</span>
            <Link
              href="/api-key"
              className="text-xs text-primary hover:underline"
            >
              {keyPresent ? "Manage my key" : "Connect a key"}
            </Link>
          </div>

          {calls === null ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Reading…</p>
          ) : calls.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Nothing fetched yet on this server.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {calls.map((call, index) => (
                <li
                  key={`${call.at}-${index}`}
                  className="flex items-baseline gap-2 px-3 py-1 text-xs"
                >
                  <span
                    className={`tabular-nums ${
                      call.status >= 400 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {call.status}
                  </span>
                  <span className="flex-1 truncate font-mono" title={call.path}>
                    {readable(call.path)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {call.durationMs}ms
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
