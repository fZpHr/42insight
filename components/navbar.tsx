"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  LinkIcon,
  FileText,
  Trophy,
  Home,
  Waves,
  Github,
  MoreHorizontal,
  Database,
  Calendar,
  Activity,
  UserRoundSearch,
  Map,
  LayoutGrid,
  BookUser,
  Workflow,
  GamepadIcon,
  Award,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react"
import { CampusSwitcher } from "@/components/CampusSwitcher";
import { useCampus } from "@/contexts/CampusContext";


const campusRestrictedRoutes = [
  "/rankings",
  "/exam-tracker",
  "/trombinoscope",
  "/cluster-map",
  "/peers",
  "/events",
];

const supportedCampuses = ["Angouleme", "Nice"];


const hasAccessToRoute = (url: string, campus?: string | null, role?: string | null) => {

  const poolRestrictedRoutes = ["/query", "/rankings", "/trombinoscope"];
  if (role === "pisciner" && poolRestrictedRoutes.some(route => url.startsWith(route))) {
    return false;
  }



  if (campusRestrictedRoutes.some(route => url.startsWith(route))) {
    return campus ? supportedCampuses.includes(campus) : false;
  }

  return true;
};

const navigationData = {
  navMain: [
    {
      title: null, 
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutGrid,
          description: "Main dashboard overview",
        },
      ],
    },
    {
      title: "Academic & Cursus",
      items: [
        {
          title: "Rankings",
          url: "/rankings",
          icon: Trophy,
          description: "Student performance rankings",
        },
        {
          title: "RNCP Simulator",
          url: "/rncp-simulator",
          icon: Award,
          description: "Simulate your RNCP progress",
        },
        {
          title: "Exam Tracker",
          url: "/exam-tracker",
          icon: FileText,
          badge: "Live",
          description: ({ campus }: { campus?: string }) => {
              return `Real-time exam grade tracking`;
            }
          },
      ],
    },
    {
      title: "Network & Life",
      items: [
        {
          title: "Cluster Map",
          url: "/cluster-map",
          icon: Map,
          description: "Visual representation of cluster status",
        },
        {
          title: "Find Peers",
          url: "/peers",
          icon: UserRoundSearch,
          description: "Locate and connect with fellow students",
        },
        {
          title: "Trombinoscope",
          url: "/trombinoscope",
          icon: Users,
          description: "Student photo gallery",
        },
        {
          title: "Events",
          url: "/events",
          icon: Calendar,
          description: "Upcoming events and schedules",
        },
      ],
    },
    {
      title: "Toolbox",
      items: [
        {
          title: "Query",
          url: "/query",
          icon: Database,
          description: "Query 42 API",
        },
        {
          title: "Useful Links",
          url: "/links",
          icon: LinkIcon,
          description: "Quick access to important resources",
        },
      ],
    },
  ],
};

const piscinenavigationData = {
  navMain: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: Home,
          description: "Main dashboard overview",
        },
        {
          title: "Piscine Trombi",
          url: "/piscine/trombinoscope",
          icon: Waves,
          description: "Piscine student gallery",
        },
        {
          title: "Useful Links",
          url: "/links",
          icon: LinkIcon,
          description: "Quick access to important resources",
        },
      ],
    },
  ],
};

const bottomLinks = [
  {
    title: "Monitor",
    url: "https://monitor.bapasqui.duckdns.org/status/42insight",
    icon: Activity,
    description: "Monitor all related services",
  },
  {
    title: "Contribute",
    url: "/contribute",
    icon: Github,
    description: "Contribute to the project",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { data: session, status } = useSession();
  const user = session?.user;
  const { open } = useSidebar();
  const { selectedCampus } = useCampus();
  

  const effectiveCampus = selectedCampus || user?.campus;

  const getBadgeVariant = (badge: string) => {
    switch (badge.toLowerCase()) {
      case "new":
        return "default";
      case "live":
      case "active":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const isToday = (): boolean => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5;
  };

  const signOutfunc = async () => {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    });
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
        <SidebarMenu>
          <SidebarMenuItem>
            {open && (
              <div className="flex items-center overflow-hidden justify-between gap-3 px-2 py-1">
                <span className="font-bold text-lg truncate">42Insight</span>
              </div>
            )}
            {!open && (
              <div className="flex items-center justify-center gap-2 overflow-hidden">
                <span className="font-bold text-lg truncate">42</span>
              </div>
            )}

          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {user?.role != "pisciner" &&
          navigationData.navMain.map((group, groupIndex) => {

            const accessibleItems = group.items.filter((item) => 
              hasAccessToRoute(item.url, effectiveCampus, user?.role)
            );
            const restrictedItems = group.items.filter((item) => 
              !hasAccessToRoute(item.url, effectiveCampus, user?.role)
            );
            

            return (
              <SidebarGroup key={group.title || 'dashboard'}>
                {group.title && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Items accessibles en premier */}
                    {accessibleItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                          tooltip={typeof item.description === 'function' ? item.description({ campus: user?.campus }) : item.description}
                          className={
                            ["stage", "alternance", "apprentissage", "emploi"].some(keyword => item.title.toLowerCase().includes(keyword))
                              ? "relative z-10 border-2 border-primary/80 shadow-lg"
                              : undefined
                          }
                        >
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        {(item as any).badge &&
                          (((item as any).badge === "Live" && isToday() && (
                            <SidebarMenuBadge>
                              <Badge
                                variant={getBadgeVariant((item as any).badge)}
                                className="text-xs"
                              >
                                {(item as any).badge}
                              </Badge>
                            </SidebarMenuBadge>
                          )) ||
                            ((item as any).badge === "Active" && (
                              <SidebarMenuBadge>
                                <Badge
                                  variant={getBadgeVariant((item as any).badge)}
                                  className="text-xs"
                                >
                                  {(item as any).badge}
                                </Badge>
                              </SidebarMenuBadge>
                            )))}
                        {(item as any).items && (
                          <SidebarMenuSub>
                            {(item as any).items.map((subItem: any) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subItem.url}
                                >
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    ))}
                    
                    {/* Items restreints en dessous */}
                    {restrictedItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild={false}
                          isActive={false}
                          tooltip="Only available for Nice and Angoulême"
                          className="opacity-50 cursor-not-allowed relative group overflow-hidden"
                        >
                          <>
                            <item.icon className="shrink-0" />
                            <span className="truncate">{item.title}</span>
                            {/* Overlay textuel au hover - seulement quand sidebar ouverte */}
                            {open && (
                              <div className="absolute inset-0 bg-background/95 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md pointer-events-none">
                                <span className="text-[10px] text-muted-foreground px-2 text-center whitespace-nowrap font-medium">
                                  Nice/Angoulême only
                                </span>
                              </div>
                            )}
                          </>
                        </SidebarMenuButton>
                        {/* Pas de badge pour les items restreints */}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
                
                {/* Campus Switcher - visible uniquement pour staff/admin, affiché après Dashboard */}
                {groupIndex === 0 && open && (
                  <div className="px-2 pb-2">
                    <CampusSwitcher />
                  </div>
                )}
              </SidebarGroup>
            );
          })}

        {user?.role == "pisciner" &&
          piscinenavigationData.navMain.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.description}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {(item as any).badge && (
                        <SidebarMenuBadge>
                          <Badge
                            variant={getBadgeVariant((item as any).badge)}
                            className="text-xs"
                          >
                            {(item as any).badge}
                          </Badge>
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />

        {/* Social Links */}
        <SidebarMenu>
          {bottomLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.url}
                tooltip={item.description}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarMenuItem key="Dark Mode">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                asChild
                isActive={false}
                tooltip="Toggle theme"
              >
                <Button variant="outline" size="icon">
                  <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between">
              {/* {open && (
                                <SidebarTrigger className="h-8 w-8 rounded-md transition-colors" />
                            )} */}
              <SidebarMenuButton size="lg" asChild className="flex-1">
                <div>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-800 to-black text-sidebar-primary-foreground">
                    <img
                      src={user?.image || "/placeholder-user.jpg"}
                      alt="User Avatar"
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      Level {user?.level} • {user?.campus}
                    </span>
                  </div>
                </div>
              </SidebarMenuButton>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                {/* <DropdownMenuItem asChild>
                                    <Link href="/dashboard/profile">
                                        <User className="mr-2 h-4 w-4" />
                                        View Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings">
                                        <Settings className="mr-2 h-4 w-4" />
                                        Settings
                                    </Link>
                                </DropdownMenuItem> */}
                <DropdownMenuItem onClick={signOutfunc}>
                  <span className="text-destructive">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
