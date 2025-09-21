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
  const { open } = useSidebar();

  return (
    <>
      <div className={pathname === "/" ? "hidden" : "block"}>
        <AppSidebar />
      </div>
      <main className="flex flex-1 flex-col" suppressHydrationWarning>
        <div className={pathname === "/" ? "hidden" : "block"}>
          <div className="top-0 z-10 flex h-10 shrink-0 items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4"></div>
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
