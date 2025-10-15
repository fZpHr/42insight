'use client'

import { useMemo, useSyncExternalStore } from "react"
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




interface TitleRequirementsProps {
  title: FortyTwoTitle
  className?: string
}

export function TitleRequirements({ title, className }: TitleRequirementsProps) {

  // Force re-render on projectMarks change
    // Select validated group projects count directly from Zustand for reactivity
    const validatedGroupProjectsCount = useFortyTwoStore((state) => {
      const groupProjects = Object.values(state.projects).filter((p) => p && p.is_solo === false);
      return groupProjects.filter((p) => state.projectMarks.get(p.id) && state.projectMarks.get(p.id)! > 0).length;
    });
    const {
      professionalExperiences,
      toggleProfessionalExperience,
      events,
      setEvents,
      getSelectedXP,
      getLevel,
      projects
    } = useFortyTwoStore(state => ({
      professionalExperiences: state.professionalExperiences,
      toggleProfessionalExperience: state.toggleProfessionalExperience,
      events: state.events,
      setEvents: state.setEvents,
      getSelectedXP: state.getSelectedXP,
      getLevel: state.getLevel,
      projects: state.projects,
    }))

  const currentXP = getSelectedXP()
  const currentLevel = getLevel(currentXP)

  const professionalExperiencesCount = useMemo(() => {
    let count = professionalExperiences.size
    if (professionalExperiences.has("alternance_2_ans")) {
      count += 1
    }
    return count
  }, [professionalExperiences])

  const requirementsComplete =
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
  <Card className={cn(className, requirementsComplete && "border-primary")}> 
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">
          Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
        <TitleRequirement name={"Level required"} value={currentLevel} max={title.level} />
        <TitleRequirement name={"Group projects"} value={validatedGroupProjectsCount} max={2} />
        <div className="relative">
          <TitleRequirement name={"Number of events"} value={events} max={title.number_of_events} />
          {events < title.number_of_events && (
            <button
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded px-2 py-1 text-xs shadow hover:bg-primary/80 transition"
              onClick={() => setEvents(title.number_of_events)}
            >
              Max event
            </button>
          )}
        </div>
        <div className="md:col-span-3 flex flex-row items-center gap-4">
          <div className="flex flex-row gap-2">
            {professionalExperienceOptions.map((exp) => (
              <div
                key={exp.id}
                className={cn(
                  "flex items-center space-x-2 rounded-md p-2 cursor-pointer border-2 border-primary/40 bg-secondary transition-colors hover:bg-accent",
                  professionalExperiences.has(exp.id) && "bg-primary/30 border-primary"
                )}
                onClick={() => toggleProfessionalExperience(exp.id)}
              >
                <label htmlFor={exp.id} className="cursor-pointer">
                  {exp.label}
                </label>
              </div>
            ))}
          </div>
          <div className="flex-1">
            <TitleRequirement
              name={"Professional experiences"}
              value={professionalExperiencesCount}
              max={title.number_of_experiences}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TitleOptionRequirements({ option }: { option: FortyTwoTitleOption }) {
  const { isProjectModuleComplete, getExperienceForOption, projects: allProjects } = useFortyTwoStore(state => ({
    isProjectModuleComplete: state.isProjectModuleComplete,
    getExperienceForOption: state.getExperienceForOption,
    projects: state.projects,
  }))

  let completedProjects = 0
  const projectList = Array.isArray(option.projects)
    ? (option.projects as number[]).map((id) => allProjects[id]).filter(Boolean)
    : Object.values(option.projects)

  for (const project of projectList) {
    if (isProjectModuleComplete(project)) {
      completedProjects += 1
    }
  }

  const experience = getExperienceForOption(option)

  return (
    <div className="space-y-4">
      <TitleRequirement name={'Projects'} value={completedProjects} max={option.number_of_projects} />

      {option.experience > 0 && (
        <TitleRequirement name={'Experience'} value={experience} max={option.experience} unit={'XP'} />
      )}
    </div>
  )
}