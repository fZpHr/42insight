"use client";
import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/navbar";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { TanstackProvider } from "@/lib/tanstack-provider";
import { CommandMenu } from "@/components/CommandMenu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

function SidebarContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppSidebar />
      <main className="flex flex-1 flex-col w-full" suppressHydrationWarning>
        <div className="flex items-center overflow-hidden justify-between gap-3 px-2 py-1 pt-3">
          <div className="sticky top-2 left-2 z-30">
            <SidebarTrigger className="h-8 w-8 rounded-md transition-colors" />
          </div>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
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
  return (
    <SidebarProvider defaultOpen={false}>
      <TanstackProvider>
        <SidebarContent>{children}</SidebarContent>
      </TanstackProvider>
    </SidebarProvider>
  );
}
