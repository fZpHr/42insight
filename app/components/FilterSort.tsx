"use client"

import { useState } from "react"
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "./ui/select"

interface FilterSortProps {
  onSortChange: (sort: string) => void
  onYearChange: (year: string) => void
  onCampusChange: (campus: string) => void
}

export default function FilterSort({ onSortChange, onYearChange, onCampusChange }: FilterSortProps) {
  const [isNiceCampus, setIsNiceCampus] = useState(false)
  const [currentSort, setCurrentSort] = useState<string | null>(null)

  const handleCampusChange = (campus: string) => {
    const isNice = campus === "Nice"
    setIsNiceCampus(isNice)

    if (isNice && (currentSort === "correction" || currentSort === "activity")) {
      onSortChange("level")
      setCurrentSort("level")
    }

    onCampusChange(campus)
  }

  const handleSortChange = (sort: string) => {
    setCurrentSort(sort)
    onSortChange(sort)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full">
      <Select onValueChange={handleSortChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="level">Level</SelectItem>
          <SelectItem value="correction" disabled={isNiceCampus}>
            Correction {isNiceCampus && "(Non disponible pour Nice)"}
          </SelectItem>
          <SelectItem value="correctionPoints">Correction Points</SelectItem>
          <SelectItem value="wallet">Wallet</SelectItem>
          <SelectItem value="blackhole">Blackhole Timer</SelectItem>
          <SelectItem value="activity" disabled={isNiceCampus}>
            Activity Hours {isNiceCampus && "(Non disponible pour Nice)"}
          </SelectItem>
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
      <Select onValueChange={handleCampusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by Campus" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les campus</SelectItem>
          <SelectItem value="Nice">Nice</SelectItem>
          <SelectItem value="Angoulême">Angoulême</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
