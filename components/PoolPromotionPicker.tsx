"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchJson } from "@/lib/api-client";
import { ALL_PROMOTIONS, type PoolPromotion } from "@/lib/pool-roster";

/**
 * Which piscine to look at.
 *
 * Not a fixed list, and not a short one. Angouleme ran six promotions in 2026
 * -- February, April, June, July, August and September -- and a different six
 * in 2025, while Paris runs May and June and never September. Six years of
 * that is far too many lines for one menu, so it opens on the years and a year
 * is opened in place.
 *
 * Opened by clicking, not by hovering. This was a submenu per year, and Radix
 * opens those on hover: running the mouse down the list fired six years at
 * thirteen requests each, seventy-eight requests nobody asked for, off the
 * visitor's own hourly budget. Nothing here is fetched until it is chosen.
 *
 * Discovery Piscines are labelled rather than hidden. They are a different
 * cursus over seven days instead of twenty-five, so their levels are not on
 * the same scale as a C Piscine's, but they are still worth looking at.
 */

const YEARS_OFFERED = 6;

const titleCase = (month: string) =>
  month.charAt(0).toUpperCase() + month.slice(1);

export function PoolPromotionPicker({
  campus,
  year,
  month,
  onChange,
}: {
  campus: string;
  year: string;
  /** null until the campus's current promotion has been named. */
  month: string | null;
  onChange: (choice: { year: string; month: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  /** The year being looked into, or null while the years themselves show. */
  const [openYear, setOpenYear] = useState<string | null>(null);

  const years = Array.from({ length: YEARS_OFFERED }, (_, i) =>
    String(new Date().getFullYear() - i),
  );

  // Which promotion to open on is the route's answer, not a rule repeated
  // here: every January the current year is empty while December's piscine is
  // still running, and the two would disagree.
  const { data: current, isLoading: findingCurrent } = useQuery({
    queryKey: ["pool-promotion-current", campus],
    queryFn: () =>
      fetchJson<PoolPromotion | null>(
        `/api/pool-promotions?campus=${encodeURIComponent(campus)}&current=1`,
      ),
    enabled: !!campus && month === null && year !== ALL_PROMOTIONS,
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (month !== null || !current) return;
    onChange({ year: current.year, month: current.month });
  }, [month, current, onChange]);

  const { data: promotions = [], isFetching } = useQuery({
    queryKey: ["pool-promotions", campus, openYear],
    queryFn: () =>
      fetchJson<PoolPromotion[]>(
        `/api/pool-promotions?campus=${encodeURIComponent(campus)}&year=${openYear}`,
      ),
    enabled: !!campus && openYear !== null,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const choose = (choice: { year: string; month: string | null }) => {
    onChange(choice);
    setOpen(false);
  };

  const label = () => {
    if (year === ALL_PROMOTIONS) return "Every piscine";
    if (month === ALL_PROMOTIONS) return `All of ${year}`;
    if (month === null) return findingCurrent ? "Finding it…" : "Pick a piscine";
    return `${titleCase(month)} ${year}`;
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setOpenYear(null);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between gap-2 font-normal sm:w-[185px]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Waves className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label()}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="max-h-96 w-60 overflow-y-auto">
        {openYear === null ? (
          <>
            <DropdownMenuItem
              onClick={() =>
                choose({ year: ALL_PROMOTIONS, month: ALL_PROMOTIONS })
              }
            >
              Every piscine
              <span className="ml-auto text-xs text-muted-foreground">
                {YEARS_OFFERED} years
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {years.map((option) => (
              <DropdownMenuItem
                key={option}
                // Kept open: choosing a year opens it here rather than picking
                // it, and only then is anything fetched.
                onSelect={(event) => {
                  event.preventDefault();
                  setOpenYear(option);
                }}
              >
                {option}
                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setOpenYear(null);
              }}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              {openYear}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => choose({ year: openYear, month: ALL_PROMOTIONS })}
            >
              All of {openYear}
            </DropdownMenuItem>

            {isFetching ? (
              <>
                <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Asking 42 about {openYear}…
                </div>
                {/* Twelve months to ask about, one request each, so there is a
                    real wait the first time a year is opened. */}
                {[0, 1, 2].map((row) => (
                  <div key={row} className="px-2 py-1.5">
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </>
            ) : promotions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Nobody from a {openYear} piscine is still at this campus.
              </p>
            ) : (
              promotions.map((promotion) => (
                <DropdownMenuItem
                  key={promotion.month}
                  onClick={() =>
                    choose({ year: openYear, month: promotion.month })
                  }
                >
                  {titleCase(promotion.month)}
                  <span className="ml-auto pl-3 text-xs text-muted-foreground">
                    {promotion.count}
                    {!promotion.isCPiscine && " · Discovery"}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
