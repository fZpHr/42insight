"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FortyTwoTitle } from "@/types/forty-two"

interface MainSelectorProps {
  titles: FortyTwoTitle[]
  activeTitle: FortyTwoTitle
  setActiveTitle: (title: FortyTwoTitle) => void
}

function MainSelector({ titles, activeTitle, setActiveTitle }: MainSelectorProps) {
  return (
    <div className="hidden w-full grid-cols-4 space-x-4 lg:grid">
      {titles.map((title) => (
        <Button
          key={title.title}
          value={title.title}
          variant={activeTitle.title === title.title ? "default" : "secondary"}
          className="relative flex h-[88px] items-center justify-center truncate"
          data-state={activeTitle.title === title.title ? "active" : "inactive"}
          onClick={() => setActiveTitle(title)}
          aria-label={title.title}
        >
          <h2 className="mt-1 line-clamp-2 max-h-[40px] w-full text-balance">{title.title}</h2>
          {/* The badge sits in the tab's own top-left corner, so it leaves the
              rounding to the tab. It used to round that corner itself on top
              of a 1px transparent border, and neither lined up with the corner
              underneath: zoomed in, the tab's green showed through as a
              hairline around the badge. Square corner, no border, clipped once
              by the tab's own overflow. */}
          <Badge
            variant={activeTitle.title === title.title ? "secondary" : "default"}
            className="absolute top-0 left-0 rounded-none rounded-br-md border-0"
          >
            {title.type === "rncp-6" ? "RNCP 6" : "RNCP 7"}
          </Badge>
        </Button>
      ))}
    </div>
  )
}

interface MobileSelectorProps {
  titles: FortyTwoTitle[]
  setActiveTitle: (title: FortyTwoTitle) => void
}

function MobileSelector({ titles, setActiveTitle }: MobileSelectorProps) {
  return (
    <div className="lg:hidden">
      <Select defaultValue={"0"} onValueChange={(index) => setActiveTitle(titles[Number.parseInt(index)])}>
        <SelectTrigger aria-label="Select a title">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>RNCP 6</SelectLabel>
            {titles.map((title, index) => {
              if (title.type !== "rncp-6") {
                return null
              }

              return (
                <SelectItem key={title.title} value={index.toString()}>
                  <h2>{title.title}</h2>
                </SelectItem>
              )
            })}
          </SelectGroup>

          <SelectGroup>
            <SelectLabel>RNCP 7</SelectLabel>
            {titles.map((title, index) => {
              if (title.type !== "rncp-7") {
                return null
              }

              return (
                <SelectItem key={title.title} value={index.toString()}>
                  {title.title}
                </SelectItem>
              )
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export interface TitleSelectorProps {
  titles: FortyTwoTitle[]
  activeTitle: FortyTwoTitle
  setActiveTitle: (title: FortyTwoTitle) => void
}

export function TitleSelector({ titles, activeTitle, setActiveTitle }: TitleSelectorProps) {
  return (
    <>
      <MainSelector titles={titles} activeTitle={activeTitle} setActiveTitle={setActiveTitle} />
      <MobileSelector titles={titles} setActiveTitle={setActiveTitle} />
    </>
  )
}
