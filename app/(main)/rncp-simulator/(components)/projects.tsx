"use client"

import { memo, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFortyTwoStore } from "@/providers/forty-two-store-provider"
import type { FortyTwoProject } from "@/types/forty-two"
import { CircleCheck, CircleDashed, ChevronsUpDownIcon, CornerDownRightIcon, StarIcon } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function ProjectSideIcon({ project, depth }: { project: FortyTwoProject; depth: number }) {
  if (project.children?.length > 0) {
    return (
      <CollapsibleTrigger asChild className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="size-8 shrink-0">
          <ChevronsUpDownIcon className="size-4" />
        </Button>
      </CollapsibleTrigger>
    )
  }

  if (depth > 0) {
    return (
      <div className="flex size-8 items-center justify-center">
        <CornerDownRightIcon className="size-4 text-muted-foreground/50" />
      </div>
    )
  }

  return <span className="w-8" />
}

function ProjectIcon({ isSelected }: { isSelected: boolean }) {
  return (
    <div className="flex size-8 items-center justify-center">
      {isSelected ? (
        <CircleCheck className="size-4 text-primary" />
      ) : (
        <CircleDashed className="size-4" />
      )}
    </div>
  )
}

function ProjectExperience({ totalXP }: { totalXP: number }) {
  if (totalXP === 0) {
    return null
  }

  return (
    <div className="space-x-2">
      <Badge className="rounded-lg" variant="secondary">
        {totalXP.toLocaleString()} XP
      </Badge>
    </div>
  )
}

const Project = memo(function Project({
  projectId,
  depth = 0,
}: {
  projectId: number
  depth?: number
}) {
  const {
    projects,
    projectMarks,
    setProjectMark,
    removeProject,
    getProjectXP,
    getDynamicProjectXP,
  } = useFortyTwoStore((state) => state)
  
  const project = projects[projectId]
  if (!project) return null


  const isSelected = projectMarks.has(project.id)
  const mark = projectMarks.get(project.id)
  const isBonus = mark === 125

  const totalProjectXP = getDynamicProjectXP(project)
  const totalXP = getProjectXP(project)

  // Nouvelle logique : overlay vert si module validé (même virtuellement)
  const isModuleComplete = useFortyTwoStore((state) => state.isProjectModuleComplete(project))

  const handleToggle = () => {
    if (isSelected) {
      removeProject(project.id)
    } else {
      setProjectMark(project.id, 100)
    }
  }

  return (
    <Collapsible>
      <div
        key={project.id}
        className={cn(
          "flex min-h-[42px] cursor-pointer items-center rounded-md border-2 border-transparent text-sm transition-colors hover:bg-accent",
          isModuleComplete && "bg-primary/30",
          isBonus && "border-yellow-500",
        )}
        onClick={handleToggle}
      >
        <ProjectSideIcon project={project} depth={depth} />
        <ProjectIcon isSelected={isSelected} />

        <div className="grid w-full grid-cols-[1fr_auto] items-center gap-x-2 pr-2">
          <p className="break-words">{project.name}</p>
          <div
            className="flex flex-wrap items-center justify-end gap-2"
            onClick={isSelected ? (e) => e.stopPropagation() : undefined}
          >
            <Badge className="rounded-lg" variant="secondary">
              {(totalProjectXP || 0).toLocaleString()} XP
            </Badge>
            {isSelected && (
              <>
                <Input
                  type="number"
                  className="h-8 w-20"
                  value={mark ?? 100}
                  onChange={(e) => setProjectMark(project.id, parseInt(e.target.value, 10) || 0)}
                  min={0}
                  max={125}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setProjectMark(project.id, isBonus ? 100 : 125)}
                >
                  <StarIcon className={cn("size-4", isBonus && "text-yellow-500")} fill={isBonus ? "currentColor" : "none"} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <CollapsibleContent>
        <div className="mt-2 ml-4 space-y-2">
          {project.children?.map((child, index) => (
            <Project key={`${child.id}-${index}`} projectId={child.id} depth={depth + 1} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})

export function ProjectList({
  projects: projectsToShow,
}: {
  projects: Record<number, FortyTwoProject> | undefined
}) {
  if (!projectsToShow) {
    return <div>No projects available</div>
  }

  const projectIdsInList = useMemo(() => Object.keys(projectsToShow).map(Number), [projectsToShow])

  const filteredProjects = useMemo(
    () =>
      Object.values(projectsToShow).filter((project) => {
        if (!project.parent) {
          return true
        }
        return !projectIdsInList.includes(project.parent.id)
      }),
    [projectsToShow, projectIdsInList],
  )

  return (
    <ScrollArea className="h-[442px]">
      <div className="space-y-2">
        {filteredProjects.map((project, index) => {
          return <Project key={`${project.id}-${index}`} projectId={project.id} />
        })}
      </div>
    </ScrollArea>
  )
}
