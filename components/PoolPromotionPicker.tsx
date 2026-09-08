"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { ALL_PROMOTIONS, type PoolPromotion } from "@/lib/pool-roster";

/**
 * Which piscine to look at.
 *
 * Not a fixed list. Angouleme ran six promotions in 2026 -- February, April,
 * June, July, August and September -- and a different six in 2025, while Paris
 * runs May and June and never September. Three of Angouleme's are Discovery
 * Piscines, a different cursus over seven days rather than twenty-five, so
 * they are labelled as such: their levels are not on the same scale.
 *
 * One control rather than two. The year used to be its own dropdown, which put
 * a second year selector in a toolbar that already had one filtering students
 * by year, and the two meant different things.
 */

const YEARS_OFFERED = 4;

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
  const years = Array.from({ length: YEARS_OFFERED }, (_, i) =>
    String(new Date().getFullYear() - i),
  );

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["pool-promotions", campus, year],
    queryFn: () =>
      fetchJson<PoolPromotion[]>(
        `/api/pool-promotions?campus=${encodeURIComponent(campus)}&year=${year}`,
      ),
    enabled: !!campus && year !== ALL_PROMOTIONS,
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Open on the promotion the roster route would have picked anyway, rather
  // than on an empty "pick one" the reader has to resolve themselves.
  useEffect(() => {
    if (month !== null || promotions.length === 0) return;

    const current = promotions.find((promotion) => promotion.isCurrent);
    if (current) onChange({ year, month: current.month });
  }, [month, promotions, year, onChange]);

  // "2026/september", so one dropdown carries both.
  const value =
    year === ALL_PROMOTIONS
      ? ALL_PROMOTIONS
      : month === ALL_PROMOTIONS || month === null
        ? `${year}/${ALL_PROMOTIONS}`
        : `${year}/${month}`;

  const label = () => {
    if (year === ALL_PROMOTIONS) return "Every piscine";
    if (month === null) return isLoading ? "Reading…" : `All of ${year}`;
    if (month === ALL_PROMOTIONS) return `All of ${year}`;
    return `${titleCase(month)} ${year}`;
  };

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next === ALL_PROMOTIONS) {
          onChange({ year: ALL_PROMOTIONS, month: ALL_PROMOTIONS });
          return;
        }
        const [nextYear, nextMonth] = next.split("/");
        onChange({ year: nextYear, month: nextMonth });
      }}
    >
      <SelectTrigger className="w-full sm:w-[190px]">
        <SelectValue>{label()}</SelectValue>
      </SelectTrigger>

      <SelectContent className="max-h-80">
        <SelectItem value={ALL_PROMOTIONS}>Every piscine</SelectItem>
        <SelectSeparator />

        {years.map((option) => (
          <SelectItem key={option} value={`${option}/${ALL_PROMOTIONS}`}>
            All of {option}
          </SelectItem>
        ))}

        {promotions.length > 0 && <SelectSeparator />}

        {promotions.map((promotion) => (
          <SelectItem
            key={`${promotion.year}/${promotion.month}`}
            value={`${promotion.year}/${promotion.month}`}
          >
            {titleCase(promotion.month)} {promotion.year}
            <span className="ml-2 text-xs text-muted-foreground">
              {promotion.count}
              {!promotion.isCPiscine && " · Discovery"}
            </span>
          </SelectItem>
        ))}

        {!isLoading && year !== ALL_PROMOTIONS && promotions.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No piscine on record for {year}.
          </p>
        )}
      </SelectContent>
    </Select>
  );
}
