"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Eye, X } from "lucide-react";
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
 *
 * It only appears once preview mode is on, as the way back out. Getting in is
 * the landing page's business, where somebody who does not want to register an
 * application is already looking.
 */
export function DevPreviewToggle() {
  const [on, setOn] = useState(false);
  const pathname = usePathname();

  // Re-read on every navigation, not just on mount. This lives in the root
  // layout, which a client-side route change does not remount -- so entering
  // preview from the landing page and being sent to the dashboard used to
  // leave the badge behind, still reading the cookie as it was before the
  // click.
  useEffect(() => setOn(isDevPreviewEnabled()), [pathname]);

  if (process.env.NODE_ENV === "production" || !on) return null;

  const leave = () => {
    setDevPreview(false);
    window.location.reload();
  };

  return (
    <button
      onClick={leave}
      className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg transition-colors hover:bg-amber-500/30"
      title="No key, so no requests and no data. Click to leave preview mode."
    >
      <Eye className="h-3.5 w-3.5" />
      Preview mode
      <X className="h-3.5 w-3.5 opacity-70" />
    </button>
  );
}
