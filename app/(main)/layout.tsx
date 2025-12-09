"use client";
import React, { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/navbar";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { TanstackProvider } from "@/lib/tanstack-provider";
import { CommandMenu } from "@/components/CommandMenu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useSession } from "next-auth/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function SidebarContent({ children }: { children: React.ReactNode }) {
  const [showShortcutTip, setShowShortcutTip] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("hide_shortcut_tip") !== "true";
  });

  const handleDismissTip = () => {
    setShowShortcutTip(false);
    localStorage.setItem("hide_shortcut_tip", "true");
  };

  return (
    <>
      <AppSidebar />
      <main className="flex flex-1 flex-col w-full" suppressHydrationWarning>
        {showShortcutTip && (
          <div className="sticky top-0 left-0 right-0 z-40 bg-blue-500/10 backdrop-blur-sm border-b border-blue-500/20">
            <div className="flex items-center justify-between gap-3 px-4 py-2">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-blue-500 text-lg"></span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Tip</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-200">
                  Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 rounded">⌘ K</kbd> or <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 rounded">Ctrl K</kbd> to open quick shortcuts menu
                </p>
              </div>
              <button
                onClick={handleDismissTip}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center overflow-hidden justify-between gap-3 px-2 py-1 pt-3">
          <div className="sticky top-2 left-2 z-30">
            <SidebarTrigger className="h-8 w-8 rounded-md transition-colors" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <KbdGroup className="cursor-help">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open quick shortcuts menu</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex-1">
          <CommandMenu />
          {children}
          <Analytics />
        </div>
        <Toaster />
      </main>
    </>
  );
}

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.login) {
      const storageKey = `sidebar_state_${session.user.login}`;
      const savedState = localStorage.getItem(storageKey);
      
      if (savedState !== null) {
        setSidebarOpen(savedState === "true");
      } else {
        setSidebarOpen(true);
      }
      setIsInitialized(true);
    } else if (status === "unauthenticated") {
      setSidebarOpen(null);
      setIsInitialized(false);
    }
  }, [status, session?.user?.login]);

  const handleOpenChange = (open: boolean) => {
    if (session?.user?.login) {
      const storageKey = `sidebar_state_${session.user.login}`;
      localStorage.setItem(storageKey, String(open));
      setSidebarOpen(open);
    }
  };

  if (!isInitialized || sidebarOpen === null) {
    return (
      <TanstackProvider>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </TanstackProvider>
    );
  }

  return (
    <SidebarProvider 
      open={sidebarOpen} 
      onOpenChange={handleOpenChange}
    >
      <TanstackProvider>
        <SidebarContent>{children}</SidebarContent>
      </TanstackProvider>
    </SidebarProvider>
  );
}
