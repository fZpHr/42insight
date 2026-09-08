"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchJson } from "@/lib/api-client";
import { ALL_PROMOTIONS, type PoolPromotion } from "@/lib/pool-roster";

/**
 * Which piscine to look at.
 *
 * Not a fixed list, and not a short one. Angouleme ran six promotions in 2026
 * -- February, April, June, July, August and September -- and a different six
 * in 2025, while Paris runs May and June and never September. Four years of
 * that is fifty-odd entries, which is why the years are submenus: one line
 * each until opened, and a year's months are only fetched when somebody asks
 * for them, since asking costs thirteen requests.
 *
 * Discovery Piscines are labelled rather than hidden. They are a different
 * cursus over seven days instead of twenty-five, so their levels are not on
 * the same scale as a C Piscine's, but they are still worth looking at.
 */

const YEARS_OFFERED = 6;

const titleCase = (month: string) =>
  month.charAt(0).toUpperCase() + month.slice(1);

const usePromotions = (campus: string, year: string, enabled: boolean) =>
  useQuery({
    queryKey: ["pool-promotions", campus, year],
    queryFn: () =>
      fetchJson<PoolPromotion[]>(
        `/api/pool-promotions?campus=${encodeURIComponent(campus)}&year=${year}`,
      ),
    enabled: enabled && !!campus,
    staleTime: 24 * 60 * 60 * 1000,
  });

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
  const thisYear = String(new Date().getFullYear());
  const years = Array.from({ length: YEARS_OFFERED }, (_, i) =>
    String(Number(thisYear) - i),
  );

  // The current year loads without being asked, because the page opens on its
  // current promotion and needs to know which that is.
  const { data: currentYear = [], isLoading } = usePromotions(
    campus,
    thisYear,
    year !== ALL_PROMOTIONS,
  );

  useEffect(() => {
    if (month !== null || currentYear.length === 0) return;

    const current = currentYear.find((promotion) => promotion.isCurrent);
    if (current) onChange({ year: current.year, month: current.month });
  }, [month, currentYear, onChange]);

  const label = () => {
    if (year === ALL_PROMOTIONS) return "Every piscine";
    if (month === ALL_PROMOTIONS) return `All of ${year}`;
    if (month === null) return isLoading ? "Reading…" : "Pick a piscine";
    return `${titleCase(month)} ${year}`;
  };

  return (
    <DropdownMenu>
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

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() =>
            onChange({ year: ALL_PROMOTIONS, month: ALL_PROMOTIONS })
          }
        >
          Every piscine
          <span className="ml-auto text-xs text-muted-foreground">
            {YEARS_OFFERED} years
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {years.map((option) => (
          <YearSubmenu
            key={option}
            campus={campus}
            year={option}
            onChange={onChange}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One year, whose promotions are fetched the first time it is opened. */
function YearSubmenu({
  campus,
  year,
  onChange,
}: {
  campus: string;
  year: string;
  onChange: (choice: { year: string; month: string | null }) => void;
}) {
  // Sticky: once opened, keep it loaded, so going back into it is instant.
  const [opened, setOpened] = useState(false);
  const { data: promotions = [], isLoading } = usePromotions(
    campus,
    year,
    opened,
  );

  return (
    <DropdownMenuSub onOpenChange={(open) => open && setOpened(true)}>
      <DropdownMenuSubTrigger>{year}</DropdownMenuSubTrigger>

      <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => onChange({ year, month: ALL_PROMOTIONS })}
        >
          All of {year}
        </DropdownMenuItem>

        {promotions.length > 0 && <DropdownMenuSeparator />}

        {promotions.map((promotion) => (
          <DropdownMenuItem
            key={promotion.month}
            onClick={() => onChange({ year, month: promotion.month })}
          >
            {titleCase(promotion.month)}
            <span className="ml-auto pl-3 text-xs text-muted-foreground">
              {promotion.count}
              {!promotion.isCPiscine && " · Discovery"}
            </span>
          </DropdownMenuItem>
        ))}

        {isLoading && (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            Asking the campus…
          </p>
        )}

        {!isLoading && promotions.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            Nobody from a {year} piscine is still at this campus.
          </p>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
