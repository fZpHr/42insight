"use client";

import { useEffect, useState } from "react";
import { readable, type ApiCall } from "@/lib/forty-two/activity";
import { copy, type Language } from "@/lib/api-key-copy";

/**
 * The real version of what ActivityGuide only mocks up.
 *
 * Shown once a key is connected, so a visitor watching a slow page (a campus
 * walk can run several seconds) sees why, instead of a spinner and a guess.
 * Polled only while this page is mounted, on the same cadence as the header's
 * panel -- "what is it doing right now" stops mattering once nobody is
 * looking.
 */

const POLL_MS = 2000;

export function LiveActivityLog({ language }: { language: Language }) {
  const t = copy[language];
  const [calls, setCalls] = useState<ApiCall[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const read = () =>
      fetch("/api/activity")
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!cancelled) setCalls(data?.calls ?? []);
        })
        .catch(() => {
          if (!cancelled) setCalls([]);
        });

    read();
    const timer = setInterval(read, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-lg border bg-zinc-950 p-4">
        <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>{t.activityLive}</span>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-900">
          <div className="flex items-baseline justify-between border-b border-zinc-800 px-3 py-2">
            <span className="text-xs font-medium text-zinc-200">
              {t.activityTitle}
            </span>
            <span className="text-xs text-zinc-500">42 API</span>
          </div>

          {calls === null ? (
            <p className="px-3 py-4 text-xs text-zinc-500">
              {t.activityReading}
            </p>
          ) : calls.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-500">
              {t.activityEmpty}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {calls.map((call, index) => (
                <li
                  key={`${call.at}-${index}`}
                  className="flex items-baseline gap-2 px-3 py-1 text-[11px]"
                >
                  <span
                    className={`tabular-nums ${
                      call.status >= 400 ? "text-red-400" : "text-zinc-500"
                    }`}
                  >
                    {call.status}
                  </span>
                  <span
                    className="flex-1 truncate font-mono text-zinc-300"
                    title={call.path}
                  >
                    {readable(call.path)}
                  </span>
                  <span className="tabular-nums text-zinc-500">
                    {call.durationMs}ms
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <figcaption className="text-xs text-muted-foreground">
        {t.activityCaptionLive}
      </figcaption>
    </figure>
  );
}
