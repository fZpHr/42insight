"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { usePathname } from "next/navigation"
import "./globals.css";
import { AppSidebar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner"
import { TanstackProvider } from "@/lib/tanstack-provider";
import { useSidebar } from "@/components/ui/sidebar"
import useAuthCheck from "@/hooks/useAuthCheck";
import { Analytics } from '@vercel/analytics/next';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  ActionImpl,
  KBarResults,
} from "kbar";
import { useRouter } from "next/navigation";
import { BarChart3, GraduationCap, Home, Info, LinkIcon, Search, UsersRound, Waves, WavesLadder } from "lucide-react";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function Results() {
    const { results } = useMatches();
    return (
        <KBarResults
            items={results}
            onRender={({ item, active }) =>
                typeof item === "string" ? (
                    <div className="px-2 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item}
                    </div>
                ) : (
                    <div
                        className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors text-sm ${active ? "bg-accent" : "bg-background/40 hover:bg-accent"
                            }`}
                    >
                        {item.icon ? (
                            <span className="shrink-0 text-muted-foreground">{item.icon}</span>
                        ) : null}

                        <span className="leading-none">{item.name}</span>
                    </div>
                )
            }
        />
    );
}


function LayoutContent({ children }: { children: React.ReactNode }) {
  useAuthCheck()
  const pathname = usePathname()
  const { open } = useSidebar()
  const router = useRouter();


  const actions = [
    {
        id: "home",
        name: "Dashboard",
        shortcut: ["h"],
        section: "Navigation",
        icon: <Home className="h-4 w-4" />,
        perform: () => router.push("/dashboard"),
    },
    {
        id: "rankings",
        name: "Rankings",
        shortcut: ["r"],
        section: "Navigation",
        icon: <BarChart3 className="h-4 w-4" />,
        perform: () => router.push("/rankings"),
    },
    {
        id: "trombinoscope",
        name: "Trombinoscope",
        shortcut: ["t"],
        section: "Navigation",
        icon: <UsersRound className="h-4 w-4" />,
        perform: () => router.push("/trombinoscope"),
    },
    {
        id: "pool-ranking",
        name: "Pool Ranking",
        shortcut: ["p"],
        section: "Pool",
        icon: <Waves className="h-4 w-4" />,
        perform: () => router.push("/piscine/rankings"),
    },
    {
        id: "pool-trombi",
        name: "Pool Trombinoscope",
        shortcut: ["y"],
        section: "Pool",
        icon: <WavesLadder className="h-4 w-4" />,
        perform: () => router.push("/pool-trombi"),            
    },
    {
        id: "exams",
        name: "Exam-tracker",
        shortcut: ["e"],
        section: "Navigation",
        icon: <GraduationCap className="h-4 w-4" />,
        perform: () => router.push("/piscine/trombinoscope"),
    },
    {
        id: "links",
        name: "Links",
        shortcut: ["l"],
        keywords: "links ressources",
        section: "Tools",
        icon: <LinkIcon className="h-4 w-4" />,
        perform: () => router.push("/links"),
    },
    {
        id: "query",
        name: "Query",
        shortcut: ["q"],
        section: "Tools",
        icon: <Search className="h-4 w-4" />,
        perform: () => router.push("/query"),
    },
    {
        id: "about",
        name: "About",
        shortcut: ["a"],
        section: "Others",
        icon: <Info className="h-4 w-4" />,
        perform: () => router.push("/about"),
    },
];

  return (
    <>
      <div className={pathname === "/" ? "hidden" : "block"}></div>
      <main className="flex flex-1 flex-col" suppressHydrationWarning>
          <div className="top-0 z-10 flex h-14 shrink-0 items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
        </div>
        <KBarProvider actions={actions}>
          <KBarPortal>
            <KBarPositioner className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm">
              <KBarAnimator className="w-full max-w-md rounded-md border bg-popover p-4 shadow-xl">
                <KBarSearch
                  autoFocus
                  className="w-full rounded border bg-background px-3 py-2 text-sm outline-none"
                  placeholder="Tape une commande (ex: Accueil)…"
                />
                <Results />
                <div className="mt-3 text-[10px] text-muted-foreground">
                  Raccourcis: Cmd/Ctrl + K · Naviguer: ↑↓ · Entrée: valider · Esc: fermer
                </div>
              </KBarAnimator>
            </KBarPositioner>
          </KBarPortal>
          <div className="flex-1 p-4">
            {children}
            <Analytics />
          </div>
        </KBarProvider>
          <Toaster />
      </main>
    </>
  )
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
              <SidebarProvider>
                <LayoutContent>{children}</LayoutContent>
              </SidebarProvider>
            </TanstackProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
