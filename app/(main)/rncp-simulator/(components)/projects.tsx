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
function Project({
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
  } = useFortyTwoStore(state => ({
    projects: state.projects,
    projectMarks: state.projectMarks,
    setProjectMark: state.setProjectMark,
    removeProject: state.removeProject,
    getProjectXP: state.getProjectXP,
    getDynamicProjectXP: state.getDynamicProjectXP,
  }))
  
  const project = projects[projectId]
  if (!project) return null


  const isSelected = projectMarks.has(project.id)
  const mark = projectMarks.get(project.id)
  const isBonus = mark === 125
  const autoFetchedProjectMarks = useFortyTwoStore(state => state.autoFetchedProjectMarks)
  const isAuto = isSelected && autoFetchedProjectMarks.has(project.id)
  const isManual = isSelected && !autoFetchedProjectMarks.has(project.id)

  const totalProjectXP = getDynamicProjectXP(project)
  const totalXP = getProjectXP(project)

  // Nouvelle logique : overlay vert si module validé (même virtuellement)
  const isModuleComplete = useFortyTwoStore(
    (state) => {
      const project = state.projects[projectId];
      const complete = state.isProjectModuleComplete(project);
      return complete;
    }
  );

  // Log uniquement lors d'un changement d'état du contour
  // (projectId, isModuleComplete, projectMarks.size, mark, isSelected)
  // Pour aider au debug, on log aussi lors du click
  // et lors du render du composant Project
  //
  // // Log lors du render
  // console.debug('[debug-contour:render]', { projectId, isModuleComplete, mark, isSelected });

  // // Log lors du click
  // const handleToggle = () => {
  //   console.debug('[debug-contour:click]', { projectId, isSelected });
  //   if (isSelected) {
  //     removeProject(project.id)
  //   } else {
  //     setProjectMark(project.id, 100)
  //   }
  // }
  const handleToggle = () => {
    if (isSelected) {
      removeProject(project.id)
    } else {
      setProjectMark(project.id, 100)
    }
  }

  // (handleToggle avec debug déjà défini ci-dessus)

  return (
    <Collapsible>
      {/*
      // DEBUG: Affichage visuel de l'état
      <div style={{ fontSize: 10, color: '#888' }}>
        [debug] id: {project.id} | isSelected: {String(isSelected)} | mark: {String(mark)} | isBonus: {String(isBonus)}
      </div>
      */}
      <div
        key={project.id}
        className={cn(
          "flex min-h-[42px] cursor-pointer items-center rounded-md border-2 text-sm transition-colors hover:bg-accent",
          // Fond vert si auto, bleu si manuel (toujours appliqué si sélectionné)
          isAuto && "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-100",
          isManual && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
          // Bordure : jaune si bonus, sinon vert/bleu selon auto/manual
          isBonus ? "border-yellow-500" : isAuto ? "border-green-500 dark:border-green-400" : isManual ? "border-blue-500 dark:border-blue-400" : undefined,
        )}
        onClick={handleToggle}
      >
        <ProjectSideIcon project={project} depth={depth} />
        <ProjectIcon isSelected={isSelected} />

        <div className="grid w-full grid-cols-[1fr_auto] items-center gap-x-2 pr-2">
          <div className="flex flex-col w-full items-center justify-center">
            <span className="break-words w-full text-center font-medium">{project.name}</span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge className="rounded-lg" variant="outline">
                {project.children && project.children.length > 0
                  ? totalXP.toLocaleString()
                  : (project.experience ?? 0).toLocaleString()
                } XP
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-7 p-0 border-none bg-transparent hover:bg-transparent focus:ring-0 focus:outline-none",
                  isBonus ? "text-yellow-500" : "text-gray-400 dark:text-zinc-600"
                )}
                tabIndex={-1}
                onClick={e => {
                  e.stopPropagation();
                  setProjectMark(project.id, isBonus ? 100 : 125);
                }}
                aria-label={isBonus ? "Retirer le bonus" : "Mettre le bonus"}
              >
                <StarIcon className={cn("size-4")}
                  fill={isBonus ? "currentColor" : "none"}
                />
              </Button>
            </div>
          </div>
          <div
            className="flex flex-wrap items-center justify-end gap-2"
            onClick={isSelected ? (e) => e.stopPropagation() : undefined}
          >
            <Badge className="rounded-lg bg-purple-100 border-purple-300 text-purple-800 border-2 dark:bg-purple-900 dark:border-purple-400 dark:text-purple-100" variant="secondary">
              {(totalProjectXP || 0).toLocaleString()} XP
            </Badge>
            {isSelected && (
              <Input
                type="number"
                className="h-8 w-20"
                value={mark ?? 100}
                onChange={(e) => setProjectMark(project.id, parseInt(e.target.value, 10) || 0)}
                min={0}
                max={125}
              />
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
}
  
export function ProjectList({
  projects: projectsToShow,
}: {
  projects: Record<number, FortyTwoProject> | undefined
}) {
  if (!projectsToShow) {
    return <div>No projects available</div>
  }


  const projectMarks = useFortyTwoStore(state => state.projectMarks);

  const projectIdsInList = useMemo(() => Object.keys(projectsToShow).map(Number), [projectsToShow])

  const filteredProjects = useMemo(
    () =>
      Object.values(projectsToShow).filter((project) => {
        if (!project.parent) {
          return true
        }
        return !projectIdsInList.includes(project.parent.id)
      }),
    [projectsToShow, projectIdsInList, projectMarks],
  )

  return (
    <div className="space-y-2">
      {filteredProjects.map((project, index) => (
        <Project key={`${project.id}-${index}`} projectId={project.id} />
      ))}
    </div>
  );
}
