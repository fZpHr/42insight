"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useFortyTwoStore } from "@/providers/forty-two-store-provider"
import { getPreciseLevel } from "@/lib/forty-two/forty-two-experience"
import type { FortyTwoProject, FortyTwoTitle, FortyTwoTitleOption } from "@/types/forty-two"
import { cn } from "@/lib/utils"
import { Users } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TitleRequirementProps {
  name: string
  value: number | string | undefined
  max: number | string | undefined
  unit?: string
}

function TitleRequirement({ name, value, max, unit }: TitleRequirementProps) {
  function formatValue(value: number | string | undefined) {
    if (value == null) return "0"
    // Format only for level
    if (name.toLowerCase().includes("level")) {
      // Format only the current level (value) with exactly 2 decimals, max as integer
      if (arguments[1] === value) {
        // value
        if (typeof value === "number") {
          return value.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true,
          })
        }
        if (typeof value === "string") {
          const num = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."))
          if (isNaN(num)) return value
          // Force 2 décimales, même si le nombre est 21.7 => 21.70
          return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })
        }
        return "0.00"
      }
      if (arguments[2] === max) {
        // max
        if (typeof max === "number") {
          return max.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
        }
        if (typeof max === "string") {
          const num = Number.parseFloat(max.replace(/\s/g, "").replace(",", "."))
          return isNaN(num) ? max : num.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
        }
        return "0"
      }
    }
    if (typeof value === "string") return value
    return value.toLocaleString("fr-FR")
  }

  const numValue = typeof value === "string" ? Number.parseFloat(value.replace(/\s/g, "").replace(",", ".")) : value
  const numMax = typeof max === "string" ? Number.parseFloat(max.replace(/\s/g, "").replace(",", ".")) : max
  const isComplete = numValue != null && numMax != null && numValue >= numMax
  const percent = numMax != null && numMax > 0 && numValue != null ? (numValue * 100) / numMax : 0

  return (
    <div className="space-y-1">
      <div className={cn("grid grid-cols-[1fr_auto] items-center gap-x-2 px-1 text-sm", isComplete && "text-primary")}>
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
  autoExtraProjects?: { name: string; xp: number; id: number; mark: number }[]
  manualProjects?: { name: string; xp: number; id: number; mark: number; coa?: boolean }[]
  onDeleteOldProject?: (id: number) => void
  onManualProjectsChange?: (
    manualProjects: { name: string; xp: number; id: number; mark: number; coa?: boolean }[],
  ) => void
}

export function TitleRequirements({
  title,
  className,
  autoExtraProjects = [],
  manualProjects = [],
  onDeleteOldProject,
  onManualProjectsChange,
}: TitleRequirementsProps) {
  const [showManualTab, setShowManualTab] = useState(false)
  // Force re-render on projectMarks change
  const {
    professionalExperiences,
    toggleProfessionalExperience,
    events,
    setEvents,
    getLevel,
    projects,
    projectMarks,
    setProjectMark,
    removeProject,
    toggleCoalitionBonus,
  } = useFortyTwoStore((state) => ({
    professionalExperiences: state.professionalExperiences,
    toggleProfessionalExperience: state.toggleProfessionalExperience,
    events: state.events,
    setEvents: state.setEvents,
    getLevel: state.getLevel,
    projects: state.projects,
    projectMarks: state.projectMarks,
    setProjectMark: state.setProjectMark,
    removeProject: state.removeProject,
    toggleCoalitionBonus: state.toggleCoalitionBonus,
  }))

  // Separate hook to ensure we can call toggleCoalitionBonus without typing issues
  const toggleCoalition = useFortyTwoStore((state) => state.toggleCoalitionBonus)

  const validatedGroupProjectsCount = (() => {
    const groupProjects = Object.values(projects).filter((p) => p && p.is_solo === false)
    return groupProjects.filter((p) => projectMarks.get(p.id) && projectMarks.get(p.id)! > 0).length
  })()

  const currentXP = useFortyTwoStore((state) => state.getSelectedXP())
  const currentLevel = getLevel(currentXP)
  // Utilise getPreciseLevel pour un affichage décimal précis
  const currentLevelPrecise = getPreciseLevel(
    currentXP,
    useFortyTwoStore((state) => state.levels),
  ).toFixed(2)

  const professionalExperienceMarks = useFortyTwoStore((state) => state.professionalExperienceMarks)
  const setProfessionalExperienceMark = useFortyTwoStore((state) => state.setProfessionalExperienceMark)
  const professionalExperienceXp: { [id: string]: number } = {
    stage_1: 42000,
    stage_2: 63000,
    startup_experience: 42000,
    alternance_1_an: 90000,
    alternance_2_ans: 180000,
  }

  const professionalExperienceOptions = [
    { id: "stage_1", label: "Stage 1" },
    { id: "stage_2", label: "Stage 2" },
    { id: "startup_experience", label: "Startup Experience" },
    { id: "alternance_1_an", label: "Alternance 1 an" },
    { id: "alternance_2_ans", label: "Alternance 2 ans" },
  ]

  const handleMarkChange = (id: string, mark: number) => {
    setProfessionalExperienceMark(id, Math.max(0, Math.min(mark, 125)))
  }

  let autoToggledExperiences: string[] = []
  if (typeof window !== "undefined") {
    try {
      autoToggledExperiences = JSON.parse(localStorage.getItem("autoToggledExperiences") || "[]")
    } catch {}
  }

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

  const addManualProjectXp = (xp: number) => {
    // Ici, tu peux créer une action dans le store pour ajouter de l'XP manuelle si tu veux la persister
    // Pour l'instant, on ne fait rien car tous les projets sélectionnés (manuellement ou non) sont déjà pris en compte dans getSelectedXP
  }

  return (
    <>
      <Card className={cn(
        className,
        "border-2",
        requirementsComplete ? "border-primary" : "border-muted"
      )}>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Requirements</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
          <TitleRequirement
            name={"Level required"}
            value={currentLevelPrecise}
            max={title.level.toLocaleString("fr-FR")}
          />
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
          {/* Résumé expériences pro */}
          <div className="md:col-span-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Validated professional experiences :</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-semibold",
                  professionalExperiencesCount >= title.number_of_experiences
                    ? "bg-green-200 text-green-900"
                    : "bg-yellow-200 text-yellow-900",
                )}
              >
                {professionalExperiencesCount} / {title.number_of_experiences}
              </span>
            </div>
            {/* Affiche toutes les options, compactes, avec badge si actif/auto, bouton toggle sinon */}
            <div className="flex flex-wrap gap-2 mt-1">
              {professionalExperienceOptions.map((exp) => {
                const isActive = professionalExperiences.has(exp.id)
                const mark = professionalExperienceMarks.get(exp.id) ?? 100
                const baseXp = professionalExperienceXp[exp.id] ?? 0
                const totalXp = Math.round(baseXp * (mark / 100))
                const isAuto = autoToggledExperiences.includes(exp.id)
                return (
                  <div
                    key={exp.id}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded border text-xs",
                      isActive
                        ? "bg-primary/20 border-primary"
                        : "bg-[var(--card)] hover:bg-[var(--muted)] cursor-pointer",
                      isAuto && "opacity-70 cursor-not-allowed border-dashed",
                    )}
                    title={
                      (isAuto
                        ? "Détecté automatiquement depuis vos projets. Désactivation manuelle impossible. "
                        : "") + `${exp.label} : ${totalXp.toLocaleString("fr-FR")} XP`
                    }
                    onClick={() => {
                      if (!isAuto) toggleProfessionalExperience(exp.id)
                    }}
                  >
                    <span>{exp.label}</span>
                    <span className="ml-1 text-muted-foreground">{totalXp.toLocaleString("fr-FR")} XP</span>
                    {isAuto && <span className="ml-1 text-primary font-semibold">auto</span>}
                    {isActive && (
                      <input
                        type="number"
                        min={0}
                        max={125}
                        step={1}
                        value={mark}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleMarkChange(exp.id, Number(e.target.value))}
                        className="ml-2 w-14 px-1 py-0.5 rounded border border-primary/40 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        title="Note (%) du stage/alternance"
                        disabled={isAuto}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-center my-4">
        <div className="relative group">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 transition border border-primary/20 shadow-sm focus:outline-none"
            onClick={() => setShowManualTab((v) => !v)}
            aria-label={
              showManualTab ? "Hide manual non-RNCP project addition" : "Add the non-RNCP project manually"
            }
            type="button"
          >
            <svg
              className="w-4 h-4 text-primary mr-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <svg
              className={`w-5 h-5 text-primary transition-transform duration-200 ${showManualTab ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded bg-primary text-primary-foreground text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10 shadow-lg">
            {showManualTab ? "Hide manual non-RNCP project addition" : "Add the non-RNCP project manually"}
          </div>
        </div>
      </div>
      {showManualTab && (
        <Card className="my-4">
          <CardHeader>
            <CardTitle>Manual Project Addition</CardTitle>
          </CardHeader>
          <CardContent>
            <ManualProjectForm
              onAddProject={addManualProjectXp}
              autoExtraProjects={autoExtraProjects}
              onDeleteOldProject={onDeleteOldProject}
              manualProjects={manualProjects ?? []} // always use prop
              onManualProjectsChange={onManualProjectsChange}
              setProjectMark={setProjectMark}
              removeProject={removeProject}
              projects={projects}
            />
          </CardContent>
        </Card>
      )}
    </>
  )
}

export function TitleOptionRequirements({ option }: { option: FortyTwoTitleOption }) {
  const {
    isProjectModuleComplete,
    getExperienceForOption,
    projects: allProjects,
  } = useFortyTwoStore((state) => ({
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
      <TitleRequirement name={"Projects"} value={completedProjects} max={option.number_of_projects} />

      {option.experience > 0 && (
        <TitleRequirement name={"Experience"} value={experience} max={option.experience} unit={"XP"} />
      )}
    </div>
  )
}

type ManualProject = { name: string; xp: number; id: number; mark: number; coa?: boolean }
type ManualProjectFormProps = {
  onAddProject: (xp: number) => void
  autoExtraProjects?: ManualProject[]
  manualProjects?: ManualProject[]
  onDeleteOldProject?: (id: number) => void
  setProjectMark: (id: number, mark: number, coa?: boolean) => void
  removeProject: (id: number) => void
  projects: Record<string, any>
  onManualProjectsChange?: (manualProjects: ManualProject[]) => void
}
function ManualProjectForm({
  onAddProject,
  autoExtraProjects = [],
  manualProjects = [],
  onDeleteOldProject,
  setProjectMark,
  removeProject,
  projects,
  onManualProjectsChange,
}: ManualProjectFormProps) {
  const [selected, setSelected] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [showOld, setShowOld] = useState(false)
  const toggleCoalition = useFortyTwoStore((state) => state.toggleCoalitionBonus)

  const piscineRegex = /Piscine|piscine|C Piscine/
  const [oldProjects, setOldProjects] = useState(() =>
    [...autoExtraProjects].filter((p) => !piscineRegex.test(p.name)).sort((a, b) => b.id - a.id),
  )
  const [oldProjectInputValues, setOldProjectInputValues] = useState<{ [id: number]: number }>({})
  useEffect(() => {
    setOldProjects([...autoExtraProjects].filter((p) => !piscineRegex.test(p.name)).sort((a, b) => b.id - a.id))
  }, [autoExtraProjects])

  const handleOldMarkChange = (id: number, mark: number) => {
    setOldProjectInputValues((prev) => ({ ...prev, [id]: mark }))
    let safeMark = Number(mark)
    if (isNaN(safeMark)) safeMark = 0
    safeMark = Math.max(0, Math.min(safeMark, 125))
    setProjectMark(id, safeMark)
  }
  const handleOldMarkBlur = (id: number) => {
    setOldProjectInputValues((prev) => {
      const val = prev[id]
      if (val === undefined) return prev
      let safeMark = Number(val)
      if (isNaN(safeMark)) safeMark = 0
      safeMark = Math.max(0, Math.min(safeMark, 125))
      return { ...prev, [id]: safeMark }
    })
  }
  const handleOldRemove = (id: number) => {
    setProjectMark(id, 0)
    setOldProjects((list) => {
      const updated = list.filter((p) => p.id !== id)
      return updated
    })
    if (typeof onDeleteOldProject === "function") {
      onDeleteOldProject(id)
    }
  }

  const options = Object.values(projects).filter(
    (p: any) => (p.experience || p.xp) && p.name && typeof (p.experience ?? p.xp) === "number",
  )

  const handleAdd = () => {
    const project = options.find((p: any) => p.name === selected) as FortyTwoProject | undefined
    if (!project) {
      setError("Select a valid project.")
      return
    }
    if (manualProjects.some((a) => a.id === project.id)) {
      setError("Project already added.")
      return
    }
    const xp = typeof project.experience === "number" ? project.experience : (project as any).xp
    const newProject = { name: project.name, xp, id: project.id, mark: 100 }
    if (onManualProjectsChange) {
      onManualProjectsChange([...manualProjects, newProject])
    }
    setProjectMark(project.id, 100)
    onAddProject(xp)
    setSelected("")
    setError("")
  }
  // (Plus de synchronisation auto avec onManualProjectsChange, tout est contrôlé par le parent)

  const handleRemove = (id: number) => {
    if (onManualProjectsChange) {
      onManualProjectsChange(manualProjects.filter((a) => a.id !== id))
    }
    removeProject(id)
  }

  const handleMarkChange = (id: number, mark: number, coa?: boolean) => {
    let safeMark = Number(mark)
    if (isNaN(safeMark)) safeMark = 0
    safeMark = Math.max(0, Math.min(safeMark, 125))
    if (onManualProjectsChange) {
      onManualProjectsChange(manualProjects.map((a) => (a.id === id ? { ...a, mark: safeMark } : a)))
    }
    setProjectMark(id, safeMark, coa)
  }

  const handleToggleCoa = (id: number) => {
    if (onManualProjectsChange) {
      const project = manualProjects.find((p) => p.id === id)
      if (project) {
        const newCoa = !project.coa
        onManualProjectsChange(manualProjects.map((p) => (p.id === id ? { ...p, coa: newCoa } : p)))
        toggleCoalition(id)
      }
    }
  }
  useEffect(() => {
    function handleManualProjectsReset() {
      if (onManualProjectsChange) onManualProjectsChange([])
    }
    window.addEventListener("manualProjectsReset", handleManualProjectsReset)
    return () => window.removeEventListener("manualProjectsReset", handleManualProjectsReset)
  }, [onManualProjectsChange])

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
          onClick={() => setShowOld((v) => !v)}
          aria-expanded={showOld}
        >
          <svg
            className={`w-4 h-4 transition-transform ${showOld ? "" : "-rotate-90"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span>View old non-RNCP projects ({oldProjects.length})</span>
        </button>
        {showOld && (
          <ul className="mt-2 pl-4 text-xs text-muted-foreground/70 space-y-1">
            {oldProjects.length === 0 && <li>No projects</li>}
            {oldProjects.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span>
                  {p.name} (+
                  {Math.round(
                    (typeof p.xp === "number" ? p.xp : 0) *
                      ((oldProjectInputValues[p.id] !== undefined ? oldProjectInputValues[p.id] : p.mark) / 100),
                  ).toLocaleString("fr-FR")}{" "}
                  XP)
                </span>
                <input
                  type="number"
                  min={0}
                  max={125}
                  step={1}
                  value={oldProjectInputValues[p.id] !== undefined ? oldProjectInputValues[p.id] : p.mark}
                  onChange={(e) => handleOldMarkChange(p.id, Number(e.target.value))}
                  onBlur={() => handleOldMarkBlur(p.id)}
                  className="w-14 border rounded px-1 py-0.5 text-xs"
                />
                <span>pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium">Projet hors RNCP</label>
        <select
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-primary bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select a project…</option>
          {options.map((p: any) => (
            <option key={p.name} value={p.name}>
              {p.name} (+{p.difficulty} XP)
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm shadow hover:bg-primary/80 transition"
        onClick={handleAdd}
        disabled={!selected}
      >
        Add the project
      </button>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
      <div className="mt-4">
        <div className="font-semibold text-sm mb-2">Added projects:</div>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {manualProjects.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <span>
                {a.name} (+{Math.round(a.xp * (a.mark / 100) * (a.coa ? 1.042 : 1)).toLocaleString("fr-FR")} XP)
              </span>
              <input
                type="number"
                min={0}
                max={125}
                step={1}
                value={a.mark}
                onChange={(e) => handleMarkChange(a.id, Number(e.target.value), a.coa)}
                className="ml-2 w-14 px-1 py-0.5 rounded border border-primary/40 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                title="Note (%) du projet"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "p-1 rounded-full transition-colors",
                        a.coa ? "bg-primary/20 text-primary" : "hover:bg-muted",
                      )}
                      onClick={() => handleToggleCoa(a.id)}
                      title="Appliquer le bonus de coalition (+4.2% XP)"
                    >
                      <Users className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>coa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <button
                type="button"
                className="ml-2 text-red-500 hover:text-red-700 text-xs font-bold"
                onClick={() => handleRemove(a.id)}
                title="Supprimer ce projet"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
