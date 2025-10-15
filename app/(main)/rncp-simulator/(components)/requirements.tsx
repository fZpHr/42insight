'use client'

import { useMemo, useSyncExternalStore, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useFortyTwoStore } from '@/providers/forty-two-store-provider'
import { getPreciseLevel } from '@/lib/forty-two/forty-two-experience'
import type { FortyTwoProject, FortyTwoTitle, FortyTwoTitleOption } from '@/types/forty-two'
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"


interface TitleRequirementProps {
  name: string;
  value: number | string | undefined;
  max: number | string | undefined;
  unit?: string;
}

function TitleRequirement({ name, value, max, unit }: TitleRequirementProps) {
  function formatValue(value: number | string | undefined) {
    if (value == null) return '0';
    // Format only for level
    if (name.toLowerCase().includes('level')) {
      // Format only the current level (value) with exactly 2 decimals, max as integer
      if (arguments[1] === value) { // value
        if (typeof value === 'number') {
          return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
        }
        if (typeof value === 'string') {
          const num = parseFloat(value.replace(/\s/g, '').replace(',', '.'));
          if (isNaN(num)) return value;
          // Force 2 décimales, même si le nombre est 21.7 => 21.70
          return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
        }
        return '0.00';
      }
      if (arguments[2] === max) { // max
        if (typeof max === 'number') {
          return max.toLocaleString(undefined, { maximumFractionDigits: 0 });
        }
        if (typeof max === 'string') {
          const num = parseFloat(max.replace(/\s/g, '').replace(',', '.'));
          return isNaN(num) ? max : num.toLocaleString(undefined, { maximumFractionDigits: 0 });
        }
        return '0';
      }
    }
    if (typeof value === 'string') return value;
    return value.toLocaleString();
  }

  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '').replace(',', '.')) : value;
  const numMax = typeof max === 'string' ? parseFloat(max.replace(/\s/g, '').replace(',', '.')) : max;
  const isComplete = numValue != null && numMax != null && numValue >= numMax;
  const percent = numMax != null && numMax > 0 && numValue != null ? (numValue * 100) / numMax : 0;

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
  );
}




interface TitleRequirementsProps {
  title: FortyTwoTitle
  className?: string
}

export function TitleRequirements({ title, className }: TitleRequirementsProps) {

  const [showManualTab, setShowManualTab] = useState(false);
  // Force re-render on projectMarks change
  const validatedGroupProjectsCount = useFortyTwoStore((state) => {
    const groupProjects = Object.values(state.projects).filter((p) => p && p.is_solo === false);
    return groupProjects.filter((p) => state.projectMarks.get(p.id) && state.projectMarks.get(p.id)! > 0).length;
  });
  const {
    professionalExperiences,
    toggleProfessionalExperience,
    events,
    setEvents,
    getLevel,
    projects,
    projectMarks
  } = useFortyTwoStore(state => ({
    professionalExperiences: state.professionalExperiences,
    toggleProfessionalExperience: state.toggleProfessionalExperience,
    events: state.events,
    setEvents: state.setEvents,
    getLevel: state.getLevel,
    projects: state.projects,
    projectMarks: state.projectMarks,
  }))


  // XP de base pour chaque expérience pro
  const professionalExperienceXp: Record<string, number> = {
    stage_1: 42000,
    stage_2: 63000,
    alternance_1_an: 90000,
    alternance_2_ans: 180000,
  }
  // Note personnalisable pour chaque expérience pro (par défaut 100)
  const [experienceMarks, setExperienceMarks] = useState<Record<string, number>>({
    stage_1: 100,
    stage_2: 100,
    alternance_1_an: 100,
    alternance_2_ans: 100,
  })

  // XP total des projets cochés (hors expériences pro)
  const baseXP = useMemo(() => {
    let totalXP = 0
    for (const [projectId, mark] of projectMarks) {
      const project = projects[projectId]
      if (project) {
        totalXP += (project.experience || project.difficulty || 0) * (mark / 100)
      }
    }
    return totalXP
  }, [projectMarks, projects])

  // XP total des expériences pro cochées (avec note)
  const professionalExperiencesXp = useMemo(() => {
    let xp = 0
    for (const id of professionalExperiences) {
      const base = professionalExperienceXp[id] ?? 0
      const mark = experienceMarks[id] ?? 100
      xp += base * (mark / 100)
    }
    return xp
  }, [professionalExperiences, experienceMarks])

  const currentXP = baseXP + professionalExperiencesXp
  const levels = useFortyTwoStore(state => state.levels)
  // On arrondit à 2 décimales pour éviter les imprécisions (ex: 21.703 => 21.70)
  const currentLevelPrecise = Math.floor(getPreciseLevel(currentXP, levels) * 100) / 100
  const currentLevel = getLevel(currentXP)

  // Pour synchroniser avec le store si besoin, tu peux persister dans localStorage
  const handleMarkChange = (id: string, mark: number) => {
    setExperienceMarks((prev) => ({ ...prev, [id]: Math.max(0, Math.min(mark, 125)) }))
  }
  const professionalExperienceOptions = [
    { id: "stage_1", label: "Stage 1" },
    { id: "stage_2", label: "Stage 2" },
    { id: "alternance_1_an", label: "Alternance 1 an" },
    { id: "alternance_2_ans", label: "Alternance 2 ans" },
  ]

  // Calcule le nombre d'expériences pro cochées
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

  // Ajout manuel de projets : onAddProject doit ajouter l'XP au store (à adapter si besoin)
  const addManualProjectXp = (xp: number) => {
    // Ici, tu peux créer une action dans le store pour ajouter de l'XP manuelle si tu veux la persister
    // Pour l'instant, on ne fait rien car tous les projets sélectionnés (manuellement ou non) sont déjà pris en compte dans getSelectedXP
  };

  return (
    <>
      <Card className={cn(className, requirementsComplete && "border-primary")}> 
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
          <TitleRequirement name={"Level required"} value={currentLevelPrecise} max={title.level.toLocaleString()} />
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
              {professionalExperienceOptions.map((exp) => {
                const isActive = professionalExperiences.has(exp.id)
                const mark = experienceMarks[exp.id] ?? 100
                const baseXp = professionalExperienceXp[exp.id] ?? 0
                const totalXp = Math.round(baseXp * (mark / 100))
                return (
                  <div
                    key={exp.id}
                    className={cn(
                      "flex items-center space-x-2 rounded-md p-2 cursor-pointer border-2 border-primary/40 bg-secondary transition-colors hover:bg-accent relative group",
                      isActive && "bg-primary/30 border-primary"
                    )}
                    onClick={() => toggleProfessionalExperience(exp.id)}
                  >
                    <label htmlFor={exp.id} className="cursor-pointer">
                      {exp.label}
                    </label>
                    {/* Affiche toujours l'XP */}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {isActive ? `${totalXp.toLocaleString()} XP` : `${baseXp.toLocaleString()} XP`}
                    </span>
                    {/* Input de note si activé */}
                    {isActive && (
                      <input
                        type="number"
                        min={0}
                        max={125}
                        step={1}
                        value={mark}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleMarkChange(exp.id, Number(e.target.value))}
                        className="ml-2 w-14 px-1 py-0.5 rounded border border-primary/40 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        title="Note (%) du stage/alternance"
                      />
                    )}
                  </div>
                )
              })}
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
      <div className="flex justify-center my-4">
        <div className="relative group">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 transition border border-primary/20 shadow-sm focus:outline-none"
            onClick={() => setShowManualTab((v) => !v)}
            aria-label={showManualTab ? 'Masquer l’ajout manuel de projets hors RNCP' : 'Ajouter un projet hors RNCP manuellement'}
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
              className={`w-5 h-5 text-primary transition-transform duration-200 ${showManualTab ? 'rotate-180' : ''}`}
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
            {showManualTab ? 'Masquer l’ajout manuel de projet hors RNCP' : 'Ajouter un projet hors RNCP manuellement'}
          </div>
        </div>
      </div>
      {showManualTab && (
        <Card className="my-4">
          <CardHeader>
            <CardTitle>Ajout manuel de projets</CardTitle>
          </CardHeader>
          <CardContent>
            <ManualProjectForm onAddProject={addManualProjectXp} />
          </CardContent>
        </Card>
      )}
    </>
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
      completedProjects += 1;
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

// Formulaire d'ajout manuel de projet (influence uniquement la jauge de level)
function ManualProjectForm({ onAddProject }: { onAddProject: (xp: number) => void }) {
  const [selected, setSelected] = useState<string>("");
  const [added, setAdded] = useState<{ name: string; xp: number }[]>([]);
  const [error, setError] = useState<string>("");


  // Utilise la vraie liste de projets pour l'ajout manuel
  // @ts-ignore
  const { setProjectMark, projects } = useFortyTwoStore();
  const options = Object.values(projects).filter((p: any) => (p.experience || p.xp) && p.name && typeof (p.experience ?? p.xp) === "number");

  const handleAdd = () => {
    const project = options.find((p: any) => p.name === selected) as FortyTwoProject | undefined;
    if (!project) {
      setError("Sélectionne un projet valide.");
      return;
    }
    if (added.some(a => a.name === project.name)) {
      setError("Projet déjà ajouté.");
      return;
    }
    const xp = typeof project.experience === 'number' ? project.experience : (project as any).xp;
    setAdded(list => [...list, { name: project.name, xp }]);
    // Marque le projet comme validé à 100 pour qu'il donne de l'XP à la jauge
    setProjectMark(project.id, 100, true);
    onAddProject(xp);
    setSelected("");
    setError("");
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 text-sm font-medium">Projet hors RNCP</label>
        <select
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-primary bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">Sélectionner un projet…</option>
          {options.map((p: any) => (
            <option key={p.name} value={p.name}>{p.name} (+{p.xp} XP)</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm shadow hover:bg-primary/80 transition"
        onClick={handleAdd}
        disabled={!selected}
      >
        Ajouter à la jauge de level
      </button>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
      {added.length > 0 && (
        <div className="mt-4">
          <div className="font-semibold text-sm mb-2">Projets ajoutés :</div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {added.map(a => (
              <li key={a.name}>{a.name} (+{a.xp} XP)</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}