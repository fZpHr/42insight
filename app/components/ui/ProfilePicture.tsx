import * as React from "react"
import * as Avatar from "@radix-ui/react-avatar"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { User, LogOut } from 'lucide-react'

function reset() {
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
.replace(/^ +/, "")
.replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  localStorage.clear();
  sessionStorage.clear();
  window.location.reload();
}

export function ProfilePicture() {

  const removeTokenCookie = () => {
    document.cookie = 'token=; Max-Age=0; path=/';
    localStorage.removeItem('stayConnected');
    window.location.reload();
  };
  const login = localStorage.getItem('login');
  const ProfilePicture = localStorage.getItem('profilePicture');

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="rounded-full w-10 h-10 inline-flex items-center justify-center bg-background border border-border hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="Customise options"
        >
          <Avatar.Root className="inline-flex h-9 w-9 select-none items-center justify-center overflow-hidden rounded-full bg-muted">
            <Avatar.Image
              className="h-full w-full object-cover"
              src={ProfilePicture || undefined}
              alt={login || undefined}
            />
            <Avatar.Fallback
              className="text-primary-foreground leading-1 flex h-full w-full items-center justify-center bg-primary text-[15px] font-medium bg-gradient-to-br from-purple-500 to-pink-500"
              delayMs={600}
            >
              {login ? login[0].toUpperCase() : <User />}
            </Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[220px] bg-card rounded-md p-1 shadow-md z-20"
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item className="flex items-center px-2 py-2 text-sm outline-none cursor-default focus:bg-accent focus:text-accent-foreground text-red-500" onClick={reset}>
            <LogOut className="mr-2 h-4 w-4 " />
            <span>Log out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
