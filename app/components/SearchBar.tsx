'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from "./ui/input"

interface SearchBarProps {
  onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search students..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-8"
      />
    </form>
  )
}

