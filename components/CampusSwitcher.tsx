"use client"

import { useCampus } from "@/contexts/CampusContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MapPin, Check, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function CampusSwitcher() {
  const { 
    selectedCampus, 
    setSelectedCampus, 
    availableCampuses, 
    canChangeCampus,
    userCampus 
  } = useCampus()

  if (!canChangeCampus) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between h-auto py-2 px-3 hover:bg-accent relative z-0"
        >
          <div className="flex items-center gap-2 text-left">
            <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium leading-none">Staff - Bypass Location</span>
              <span className="text-xs text-muted-foreground mt-0.5 truncate">{selectedCampus}</span>
            </div>
          </div>
          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-xs font-normal text-muted-foreground">
            View data from any campus
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableCampuses.map((campus) => (
          <DropdownMenuItem
            key={campus}
            onClick={() => setSelectedCampus(campus)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{campus}</span>
                {campus === userCampus && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    You
                  </Badge>
                )}
              </div>
              {selectedCampus === campus && (
                <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
