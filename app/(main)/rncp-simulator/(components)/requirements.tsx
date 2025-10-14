'use client'

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useFortyTwoStore } from '@/providers/forty-two-store-provider'
import type { FortyTwoProject, FortyTwoTitle, FortyTwoTitleOption } from '@/types/forty-two'
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface TitleRequirementProps {
  name: string
  value: number | undefined
  max: number | undefined
  unit?: string
}

function TitleRequirement({ name, value, max, unit }: TitleRequirementProps) {
  function formatValue(value: number | undefined) {
    if (value == null || typeof value !== 'number' || isNaN(value)) return '0'
    if (value > 1000) {
      return `${(value / 1000).toFixed(1).toLocaleString()}K`
    }
    return value.toLocaleString()
  }

  const isComplete = value != null && max != null && value >= max
  const percent = max != null && max > 0 && value != null ? (value * 100) / max : 0

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'grid grid-cols-[1fr_auto] items-center gap-x-2 px-1 text-sm',
          isComplete && 'text-primary',
        )}
      >
        <p className="text-left break-words" title={name}>
          {name}
        </p>
        <p className="text-right font-medium">
          {formatValue(value)} / {formatValue(max)} {unit}
        </p>
      </div>
      <Progress
        max={100} // Max is now always 100 for percentage
        value={percent > 100 ? 100 : percent}
        aria-label={`${value || 0} out of ${max || 100} for the ${name.toLowerCase()}`}
      />
    </div>
  )
}

export interface TitleRequirementsProps {
  title: FortyTwoTitle
  className?: string
}

export function TitleRequirements({ title, className }: TitleRequirementsProps) {
  const { 
    professionalExperiences, 
    toggleProfessionalExperience, 
    events, 
    setEvents, 
    getSelectedXP, 
    getLevel 
  } = useFortyTwoStore((state) => state)

  const currentXP = getSelectedXP()
  const currentLevel = getLevel(currentXP)

  const professionalExperiencesCount = useMemo(() => {
    let count = professionalExperiences.size
    if (professionalExperiences.has("alternance_2_ans")) {
      count += 1
    }
    return count
  }, [professionalExperiences])

  const isComplete =
    currentLevel >= title.level &&
    events >= title.number_of_events &&
    professionalExperiencesCount >= title.number_of_experiences

  const professionalExperienceOptions = [
    { id: "stage_1", label: "Stage 1" },
    { id: "stage_2", label: "Stage 2" },
    { id: "alternance_1_an", label: "Alternance 1 an" },
    { id: "alternance_2_ans", label: "Alternance 2 ans" },
  ]



  return (
    <Card className={cn(className, isComplete && "border-primary")}> 
      <CardHeader className="pb-4">
        <CardTitle tag="h3" className="text-xl">
          Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
        <TitleRequirement name={"Level required"} value={currentLevel} max={title.level} />
  {/* Jauge Projets de groupe supprimée */}
        <TitleRequirement name={"Number of events"} value={events} max={title.number_of_events} />
        <TitleRequirement
          name={"Professional experiences"}
          value={professionalExperiencesCount}
          max={title.number_of_experiences}
        />
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium mb-2">Professional Experiences</h4>
            <div className="grid grid-cols-2 gap-2">
              {professionalExperienceOptions.map((exp) => (
                <div 
                  key={exp.id} 
                  className={cn(
                    "flex items-center space-x-2 rounded-md p-2 cursor-pointer transition-colors hover:bg-accent",
                    professionalExperiences.has(exp.id) && "bg-primary/30"
                  )}
                  onClick={() => toggleProfessionalExperience(exp.id)}
                >
                  <label htmlFor={exp.id} className="cursor-pointer">
                    {exp.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Events</h4>
            <Input 
              type="number"
              placeholder="Number of events"
              value={events}
              min={0}
              max={15}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10)
                if (!isNaN(value) && value >= 0 && value <= 15) {
                  setEvents(value)
                }
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TitleOptionRequirements({ option }: { option: FortyTwoTitleOption }) {
  const { isProjectModuleComplete, getExperienceForOption } = useFortyTwoStore((state) => state)

  let projects = 0
  const projectList = Array.isArray(option.projects)
    ? option.projects.map((id) => useFortyTwoStore.getState().projects[id]).filter(Boolean)
    : Object.values(option.projects)

  for (const project of projectList) {
    if (isProjectModuleComplete(project)) {
      projects += 1
    }
  }

  const experience = getExperienceForOption(option)

  return (
    <div className="space-y-4">
      <TitleRequirement name={'Projects'} value={projects} max={option.number_of_projects} />

      {option.experience > 0 && (
        <TitleRequirement name={'Experience'} value={experience} max={option.experience} unit={'XP'} />
      )}
    </div>
  )
}