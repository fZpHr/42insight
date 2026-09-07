"use client";

import { KeyRound } from "lucide-react";
import { copy, type Language } from "@/lib/api-key-copy";

/**
 * What the header's counter opens onto, shown before there is anything in it.
 *
 * The page claims the site hides nothing; this is the claim made concrete. It
 * is drawn rather than screenshotted for the same reasons as the intra guide,
 * and filled with a plausible walk rather than the empty state, because an
 * empty list demonstrates nothing.
 */

const SAMPLE = [
  { status: 200, path: "cursus_users · campus 41 · page 1", ms: 412 },
  { status: 200, path: "cursus_users · campus 41 · page 2", ms: 388 },
  { status: 200, path: "projects_users · campus 41 · status in_progress", ms: 501 },
  { status: 429, path: "scale_teams · campus 41 · page 12", ms: 190 },
];

export function ActivityGuide({ language }: { language: Language }) {
  const t = copy[language];

  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-lg border bg-zinc-950 p-4">
        <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
          <KeyRound className="h-3.5 w-3.5 text-primary" />
          <span className="tabular-nums">1183/1200</span>
          <span className="text-zinc-500">your key</span>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-900">
          <div className="flex items-baseline justify-between border-b border-zinc-800 px-3 py-2">
            <span className="text-xs font-medium text-zinc-200">
              {t.activityTitle}
            </span>
            <span className="text-xs text-zinc-500">42 API</span>
          </div>

          <ul className="py-1">
            {SAMPLE.map((call) => (
              <li
                key={call.path}
                className="flex items-baseline gap-2 px-3 py-1 text-[11px]"
              >
                <span
                  className={`tabular-nums ${
                    call.status >= 400 ? "text-red-400" : "text-zinc-500"
                  }`}
                >
                  {call.status}
                </span>
                <span className="flex-1 truncate font-mono text-zinc-300">
                  {call.path}
                </span>
                <span className="tabular-nums text-zinc-500">{call.ms}ms</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <figcaption className="text-xs text-muted-foreground">
        {t.activityCaption}
      </figcaption>
    </figure>
  );
}
