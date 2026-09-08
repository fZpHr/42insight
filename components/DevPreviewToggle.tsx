"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { isDevPreviewEnabled, setDevPreview } from "@/lib/dev-preview";

/**
 * Lets a page be opened without signing in, for looking at layout during
 * `npm run dev`. Middleware reads this same cookie and skips the
 * sign-in/key redirects while it is set -- it never touches production,
 * since the middleware check is also gated on NODE_ENV.
 *
 * No key means no session, so every page's queries stay `enabled: false`
 * and nothing is actually fetched. This is a way to see empty states, not a
 * way to see data without a key.
 */
export function DevPreviewToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => setOn(isDevPreviewEnabled()), []);

  if (process.env.NODE_ENV === "production") return null;

  const toggle = () => {
    setDevPreview(!on);
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg transition-colors ${
        on
          ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
          : "border-white/10 bg-black/60 text-white/60 hover:text-white/90"
      }`}
      title="Dev only: skip sign-in to look at page layout. No key, no requests."
    >
      {on ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      Preview mode: {on ? "ON" : "OFF"}
    </button>
  );
}
