"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { FlaskConical, X } from "lucide-react";
import { isDemoEnabled, setDemo } from "@/lib/demo-mode";

/**
 * Says, on every page, that none of this is real.
 *
 * Demo mode exists so somebody can see what the site does before handing over
 * a 42 key, and the price of that is a site full of rows that look exactly
 * like the real thing -- logins, levels, blackhole timers, a cluster with
 * people in it. Nobody should be able to read a single page of it and come
 * away thinking they have seen their campus. So this is not dismissable, it
 * sits in the same place everywhere, and it says what the data is rather than
 * just naming the mode.
 *
 * Leaving drops the session and the cookie together, which is the only way
 * out that leaves nothing behind.
 */
export function DemoBanner() {
  const [on, setOn] = useState(false);
  const pathname = usePathname();

  // Re-read on every navigation, not just on mount. This lives in the root
  // layout, which a client-side route change does not remount -- so entering
  // demo mode from the sign-in page and being sent to the dashboard used to
  // leave the badge behind, still reading the cookie as it was before.
  useEffect(() => setOn(isDemoEnabled()), [pathname]);

  if (!on) return null;

  // Below the shortcut hint rather than on top of it: both are fixed to the
  // middle of the top edge, and at top-3 this sat across it.

  const leave = async () => {
    setDemo(false);
    await signOut({ redirect: false });
    window.location.href = "/";
  };

  return (
    <div className="fixed left-1/2 top-14 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg backdrop-blur-none">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span>
        Demo data — every student, level and session here is invented
      </span>
      <button
        onClick={leave}
        title="Leave the demo and connect your own 42 key"
        className="ml-1 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
