"use client";

import { copy, type Language } from "@/lib/api-key-copy";

/**
 * Where to look on the intra's application page.
 *
 * Drawn rather than screenshotted: it follows the light and dark theme, stays
 * sharp at any size, translates with the rest of the page, and can never
 * accidentally ship somebody's real UID. The layout mirrors what the intra
 * actually shows -- two fields, the secret on the right, its expiry underneath
 * -- so it reads as a map of that page rather than a generic diagram.
 */
export function IntraKeyGuide({ language }: { language: Language }) {
  const t = copy[language];

  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-lg border bg-zinc-950 p-4 text-zinc-300">
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-base font-bold tracking-wide text-zinc-100">
            WEB1
          </span>
          <span className="text-[10px] text-zinc-500">{t.guideCreatedBy}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-500/80">
              <span aria-hidden>🔑</span> UID
            </div>
            <div className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5">
              <code className="text-xs text-zinc-400">u-s4t2ud-</code>
              <span className="h-3 flex-1 rounded-sm bg-zinc-700" />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-primary">
              ↑ {t.guideUid}
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-500/80">
              <span aria-hidden>🔒</span> SECRET
            </div>
            <div className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5">
              <code className="text-xs text-zinc-400">s-s4t2ud-</code>
              <span className="h-3 flex-1 rounded-sm bg-zinc-700" />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-primary">
              ↑ {t.guideSecret}
            </p>
            <p className="mt-1 text-[10px] italic text-zinc-500">
              {t.guideValidUntil}
            </p>
          </div>
        </div>
      </div>

      <figcaption className="text-xs text-muted-foreground">
        {t.guideCaption}
      </figcaption>
    </figure>
  );
}
