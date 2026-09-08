"use client"

import { useState } from "react"
import { useCampus } from "@/contexts/CampusContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MapPin, Check, Home } from "lucide-react"

/**
 * Pick a campus.
 *
 * It used to be a staff-only "bypass location" control, hidden from everyone
 * else, from when the site read a database seeded for two campuses. Any
 * student can now look at any of the 54 schools, so it is a plain picker: it
 * marks where they study and lets them go elsewhere.
 *
 * The list is long enough to need filtering, and the account counts are there
 * to tell a large campus from a small one at a glance. They are 42's own
 * figures for accounts, not students, which the header says plainly -- Paris
 * reports 43225 of them and has 8402 people in the cursus.
 */
export function CampusSwitcher() {
  const { selectedCampus, setSelectedCampus, campuses, userCampus } = useCampus()
  const [filter, setFilter] = useState("")

  const shown = campuses
    .filter((campus) =>
      campus.name.toLowerCase().includes(filter.trim().toLowerCase()),
    )
    .sort((a, b) => {
      // The visitor's own campus first: it is where they came to look.
      if (a.name === userCampus) return -1
      if (b.name === userCampus) return 1
      return a.name.localeCompare(b.name)
    })

  return (
    <DropdownMenu onOpenChange={(open) => !open && setFilter("")}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-2 px-3 hover:bg-accent relative z-0"
        >
          <div className="flex items-center gap-2 text-left">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium leading-none">Campus</span>
              <span className="text-xs text-muted-foreground mt-0.5 truncate">
                {selectedCampus || userCampus || "—"}
              </span>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
          {campuses.length > 0
            ? `${campuses.length} campuses · figures are total accounts`
            : "Loading the campus list…"}
        </DropdownMenuLabel>

        {campuses.length > 8 && (
          <div className="px-2 pb-2">
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              // The menu runs its own typeahead over the items, which would
              // swallow every letter typed here and jump the selection about.
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Filter…"
              className="h-7 text-xs"
              autoFocus
            />
          </div>
        )}

        <DropdownMenuSeparator />

        <div className="max-h-72 overflow-y-auto">
          {shown.map((campus) => (
            <DropdownMenuItem
              key={campus.id}
              onClick={() => setSelectedCampus(campus.name)}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {campus.name === userCampus && (
                  <Home className="h-3 w-3 shrink-0 text-primary" />
                )}
                <span className="truncate">{campus.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {campus.usersCount != null && (
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {campus.usersCount}
                  </span>
                )}
                {campus.name === selectedCampus && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </span>
            </DropdownMenuItem>
          ))}

          {campuses.length > 0 && shown.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No campus matches that.
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
