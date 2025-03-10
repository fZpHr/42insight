'use client'

import { 
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "./ui/select"

interface FilterSortProps {
  onSortChange: (sort: string) => void
  onYearChange: (year: string) => void
}

export default function FilterSort({ onSortChange, onYearChange }: FilterSortProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full">
      <Select onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="level">Level</SelectItem>
          <SelectItem value="correction">Correction</SelectItem>
          <SelectItem value="correctionPoints">Correction Points</SelectItem>
          <SelectItem value="wallet">Wallet</SelectItem>
          <SelectItem value="blackhole">Blackhole Timer</SelectItem>
          <SelectItem value="activity">Activity Hours</SelectItem>
        </SelectContent>
      </Select>
      <Select onValueChange={onYearChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          <SelectItem value="2022">2022</SelectItem>
          <SelectItem value="2023">2023</SelectItem>
          <SelectItem value="2024">2024</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

