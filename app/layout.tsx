"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { usePathname } from "next/navigation";
import "./globals.css";
import { AppSidebar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { TanstackProvider } from "@/lib/tanstack-provider";
import { useSidebar } from "@/components/ui/sidebar";
import useAuthCheck from "@/hooks/useAuthCheck";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  useAuthCheck();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { open } = useSidebar();

  return (
    <>
      <div className={isLanding ? "hidden" : "block"}>
        <AppSidebar />
      </div>
      <main className="flex flex-1 flex-col" suppressHydrationWarning>
        <div className={isLanding ? "hidden" : "block"}>
          <div className="flex items-center overflow-hidden justify-between gap-3 px-2 py-1 pt-3">
            {!open && (
              <SidebarTrigger className="h-8 w-8 rounded-md transition-colors" />
            )}
          </div>
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TanstackProvider>
              <SidebarProvider defaultOpen={false}>
                <LayoutContent>{children}</LayoutContent>
              </SidebarProvider>
            </TanstackProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
