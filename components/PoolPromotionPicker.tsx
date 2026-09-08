"use client";

import { useQuery } from "@tanstack/react-query";
import { Waves } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import type { PoolPromotion } from "@/lib/pool-roster";

/**
 * Which piscine to look at.
 *
 * Not a fixed list: Angouleme ran six in 2026 -- February, April, June, July,
 * August and September -- and a different six in 2025, while Paris runs May
 * and June and never September. The route asks the campus, so this offers
 * whatever it answers.
 *
 * The year is a plain choice of the last few; the months come from 42.
 */

const YEARS_OFFERED = 4;

const titleCase = (month: string) =>
  month.charAt(0).toUpperCase() + month.slice(1);

export function PoolPromotionPicker({
  campus,
  year,
  month,
  onYearChange,
  onMonthChange,
}: {
  campus: string;
  year: string;
  /** null while the campus's own current promotion is still being worked out. */
  month: string | null;
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
}) {
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["pool-promotions", campus, year],
    queryFn: () =>
      fetchJson<PoolPromotion[]>(
        `/api/pool-promotions?campus=${encodeURIComponent(campus)}&year=${year}`,
      ),
    enabled: !!campus,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_OFFERED }, (_, i) =>
    String(thisYear - i),
  );

  return (
    <div className="flex items-center gap-2">
      <Waves className="h-4 w-4 shrink-0 text-muted-foreground" />

      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger className="w-[92px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={month ?? ""}
        onValueChange={onMonthChange}
        disabled={isLoading || promotions.length === 0}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue
            placeholder={
              isLoading
                ? "Reading…"
                : promotions.length === 0
                  ? "No piscine that year"
                  : "Pick one"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {promotions.map((promotion) => (
            <SelectItem key={promotion.month} value={promotion.month}>
              {titleCase(promotion.month)}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {promotion.count}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
