'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'
import type { FortyTwoTitle, FortyTwoTitleOption } from '@/types/forty-two'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { TitleOptionRequirements } from './requirements'
import { ProjectList } from './projects'
import { useFortyTwoStore } from '@/providers/forty-two-store-provider'
import { memo, useEffect, useMemo } from 'react'

const TitleOption = memo(function TitleOption({ option, isComplete }: { option: FortyTwoTitleOption; isComplete: boolean }) {
  return (
    <Card
      className={cn("border-2", isComplete ? "border-green-500" : "border-muted")}
    >
      <CardHeader className="pb-4">
          <CardTitle className="truncate text-xl">
          {option.title}
        </CardTitle>
        <TitleOptionRequirements option={option} />
      </CardHeader>
      <CardContent className="p-4 md:p-6 md:pt-0">
        <ProjectList projects={option.projects as Record<number, any>} />
      </CardContent>
    </Card>
  )
})

const TitleOptionItem = memo(function TitleOptionItem({
    option,
    isOptionComplete,
    projects
}: {
    option: FortyTwoTitleOption,
    isOptionComplete: boolean,
    projects: Record<number, any>
}) {
    const projectsToShow = useMemo(() => (Array.isArray(option.projects)
        ? option.projects
        : Object.keys(option.projects).map(Number)
    ).reduce(
        (acc: Record<number, any>, id: number) => {
            const proj = projects[Number(id)] || projects[id]
            if (proj) acc[Number(id)] = proj
            return acc
        },
        {} as Record<number, any>,
    ), [option.projects, projects]);

    return (
        <CarouselItem className="md:basis-1/2 xl:basis-1/3">
            <TitleOption option={{ ...option, projects: projectsToShow }} isComplete={isOptionComplete} />
        </CarouselItem>
    )
})


interface TitleOptionsProps {
  title: FortyTwoTitle;
  className?: string;
  onCompletionChange?: (status: any) => void;
}

export function TitleOptions({ title, className, onCompletionChange }: TitleOptionsProps) {

  const { projects, isProjectModuleComplete, getExperienceForOption, projectMarks } = useFortyTwoStore(state => ({
    projects: state.projects,
    isProjectModuleComplete: state.isProjectModuleComplete,
    getExperienceForOption: state.getExperienceForOption,
    projectMarks: state.projectMarks,
  }))
  const options: FortyTwoTitleOption[] = useMemo(
    () => [
      ...title.options,
      {
        title: 'Suite',
        experience: 0,
        number_of_projects: (title as any).number_of_suite || 0,
        projects: (title as any).suite?.projects || [],
      } as FortyTwoTitleOption,
    ],
    [title],
  )

  const completionStatuses = useMemo(() => {
    return options.reduce(
      (acc, option) => {
        let completedProjects = 0
        const projectList = Array.isArray(option.projects)
          ? option.projects.map((id) => projects[id]).filter(Boolean)
          : Object.values(option.projects)

        for (const project of projectList) {
          if (isProjectModuleComplete(project)) {
            completedProjects += 1
          }
        }
        const currentExperience = getExperienceForOption(option)

        const isProjectsComplete = completedProjects >= option.number_of_projects
        const isExperienceComplete = currentExperience >= option.experience
        const isOptionComplete = isProjectsComplete && (option.experience > 0 ? isExperienceComplete : true)

        acc[option.title] = isOptionComplete
        return acc
      },
      {} as Record<string, boolean>,
    )
  }, [options, projects, isProjectModuleComplete, getExperienceForOption, projectMarks])

  useEffect(() => {
    onCompletionChange?.(completionStatuses)
  }, [completionStatuses, onCompletionChange])

  if (options.length <= 4) {

    let gridCols = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
    if (options.length === 3) gridCols = 'grid-cols-1 md:grid-cols-3 xl:grid-cols-3'
    if (options.length === 2) gridCols = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2'
    return (
      <div className="bg-muted/10 rounded-xl py-4 w-full">
        <div className={`grid ${gridCols} gap-4`}>
          {options.map((option, index) => {
            const isOptionComplete = completionStatuses[option.title]
            return (
              <div key={index}>
                <TitleOption option={{ ...option, projects: (() => {
                  const projectsToShow = Array.isArray(option.projects)
                    ? option.projects
                    : Object.keys(option.projects).map(Number)
                  return projectsToShow.reduce((acc: Record<number, any>, id: number) => {
                    const proj = projects[Number(id)] || projects[id]
                    if (proj) acc[Number(id)] = proj
                    return acc
                  }, {} as Record<number, any>)
                })() }} isComplete={isOptionComplete} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted/10 rounded-xl py-4 w-full">
      <Carousel
        opts={{
          align: 'start',
        }}
        className={cn('w-full px-0', className)}
        plugins={[WheelGesturesPlugin()]}
      >
        <CarouselContent className="w-full">
          {options.map((option, index) => {
              const isOptionComplete = completionStatuses[option.title]
              return (
                <TitleOptionItem 
                  key={index}
                  option={option}
                  isOptionComplete={isOptionComplete}
                  projects={projects}
                />
              )
          })}
        </CarouselContent>
        <CarouselPrevious className="-left-2 md:-left-3" />
        <CarouselNext className="-right-2 md:-right-3" />
      </Carousel>
    </div>
  )
}
