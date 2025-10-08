"use client";
import React from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/navbar";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { TanstackProvider } from "@/lib/tanstack-provider";

function SidebarContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  
  return (
    <>
      <AppSidebar />
      <main className="flex flex-1 flex-col w-full" suppressHydrationWarning>
        <div className="flex items-center overflow-hidden justify-between gap-3 px-2 py-1 pt-3">
          {!open && (
            <SidebarTrigger className="h-8 w-8 rounded-md transition-colors" />
          )}
        </div>
        <div className="flex-1">
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