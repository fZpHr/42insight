"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RainbowButton } from "@/components/magicui/rainbow-button";
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
  WavesLadder,
  Calendar,
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
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/components/ui/sidebar";

const navigationData = {
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
          title: "Rankings",
          url: "/rankings",
          icon: Trophy,
          description: "Student performance rankings",
        },
        {
          title: "Trombinoscope",
          url: "/trombinoscope",
          icon: Users,
          description: "Student photo gallery",
        },
        {
          title: "Exam Tracker",
          url: "/exam-tracker",
          icon: FileText,
          badge: "Live",
          description: "Real-time exam grade tracking",
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
      title: "Current Piscine",
      items: [
        {
          title: "Piscine Ranking",
          url: "/piscine/rankings",
          icon: Waves,
          badge: "Active",
          description: "Piscine progress and rankings",
        },
        {
          title: "Piscine Trombi",
          url: "/piscine/trombinoscope",
          icon: WavesLadder,
          description: "Piscine student gallery",
        },
      ],
    },
    {
      title: "Resources",
      items: [
        {
          title: "Useful Links",
          url: "/links",
          icon: LinkIcon,
          description: "Quick access to important resources",
        },
        {
          title: "Query",
          url: "/query",
          icon: Database,
          description: "Query 42 API",
        },
      ],
    },
  ],
};

const restrictednavigationData = {
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
          icon: WavesLadder,
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user, isPoolUser } = useAuth();
  const { open } = useSidebar();

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

  const signOut = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
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
                      src={user?.photoUrl || "/default-avatar.png"}
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
                <DropdownMenuItem onClick={signOut}>
                  <span className="text-destructive">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}

        {!isPoolUser &&
          navigationData.navMain.map((group) => (
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
                      {item.badge &&
                        ((item.badge === "Live" && isToday() && (
                          <SidebarMenuBadge>
                            <Badge
                              variant={getBadgeVariant(item.badge)}
                              className="text-xs"
                            >
                              {item.badge}
                            </Badge>
                          </SidebarMenuBadge>
                        )) ||
                          (item.badge === "Active" && (
                            <SidebarMenuBadge>
                              <Badge
                                variant={getBadgeVariant(item.badge)}
                                className="text-xs"
                              >
                                {item.badge}
                              </Badge>
                            </SidebarMenuBadge>
                          )))}
                      {item.items && (
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
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
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

        {isPoolUser &&
          restrictednavigationData.navMain.map((group) => (
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
                      {item.badge && (
                        <SidebarMenuBadge>
                          <Badge
                            variant={getBadgeVariant(item.badge)}
                            className="text-xs"
                          >
                            {item.badge}
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
          <SidebarMenuItem>
            <div className="flex items-center justify-center space-x-2 py-2">
              {open && (
                <RainbowButton asChild>
                  <Link href="/contribute" rel="noopener noreferrer">
                    Contribute
                  </Link>
                </RainbowButton>
              )}
              {!open && (
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                  <Link href="/contribute" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                    <span className="sr-only">GitHub</span>
                  </Link>
                </Button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
