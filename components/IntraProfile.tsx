"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  MapPin,
  Wallet,
} from "lucide-react";
import { avatarSrc } from "@/lib/avatar";
import { fetchUserIntraInfo } from "@/utils/fetchFunctions";
import { isKeyRequired } from "@/lib/api-client";
import { primaryCampusName } from "@/lib/forty-two/campus-scope";
import { primaryCursusUser } from "@/lib/forty-two/cursus";
import { useFortyTwoStore } from "@/providers/forty-two-store-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * A student's profile laid out the way profile.intra.42.fr lays it out:
 * coalition banner, level bar, skills, projects with their marks, logtime
 * calendar and the latest evaluations. Any login works -- the data travels on
 * the visitor's own key like everywhere else on the site.
 */

type ExtraPart = "coalition" | "logtime" | "evaluations";

/**
 * One block of the page beyond the profile itself. Each is its own request,
 * started alongside the profile rather than after it, so the banner colour,
 * the calendar and the evaluations each appear as soon as they are back.
 */
const useIntraExtra = (login: string, part: ExtraPart) =>
  useQuery({
    queryKey: ["intraExtra", part, login],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/users/${encodeURIComponent(login)}/intra-extras?part=${part}`,
        { signal },
      );
      if (!response.ok) throw new Error(`Failed to fetch ${part} (${response.status})`);
      return response.json();
    },
    enabled: !!login,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

/** The default banner colour when a student has no coalition (staff, demo). */
const NEUTRAL = "#00babc";

/** "05:23:11.123" -> hours. */
const durationHours = (duration: string): number => {
  if (typeof duration !== "string") return 0;
  const [h, m, s] = duration.split(":");
  const hours = Number(h) + Number(m) / 60 + parseFloat(s) / 3600;
  return Number.isFinite(hours) ? hours : 0;
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const markColor = (row: any) => {
  if (row.status !== "finished") return "text-amber-400";
  return row["validated?"] ? "text-emerald-400" : "text-red-400";
};

const timeAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** "2026-11" -> "November 2026". */
const monthLabel = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const formatHours = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 60 ? `${h + 1}h00` : `${h}h${String(m).padStart(2, "0")}`;
};

/** How many months the logtime card shows side by side. */
const LOGTIME_MONTHS = 4;

const shiftMonth = ({ year, month }: { year: number; month: number }, delta: number) => {
  const next = new Date(Date.UTC(year, month + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
};

const monthTotals = (logtime: Record<string, string>, year: number, month: number) => {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  let total = 0;
  let activeDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const hours = durationHours(logtime[dayKey(new Date(Date.UTC(year, month, day)))]);
    total += hours;
    if (hours > 0) activeDays++;
  }
  return { total, activeDays };
};

/** One Monday-first month, with the hours of each day written in. */
function LogtimeMonth({
  logtime,
  color,
  year,
  month,
}: {
  logtime: Record<string, string>;
  color: string;
  year: number;
  month: number;
}) {
  const today = new Date();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const { total, activeDays } = monthTotals(logtime, year, month);

  return (
    <div className="min-w-0 space-y-1">
      <div className="text-center">
        <p className="text-xs font-semibold capitalize">{monthLabel(year, month)}</p>
        <p className="text-[10px] text-muted-foreground">
          <span className="font-semibold" style={{ color }}>
            {formatHours(total)}
          </span>{" "}
          · {activeDays} day{activeDays === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((name, i) => (
          <span key={i} className="text-[8px] text-muted-foreground">
            {name}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(Date.UTC(year, month, day));
          const key = dayKey(date);
          const hours = durationHours(logtime[key]);
          return (
            <div
              key={key}
              title={`${key} · ${formatHours(hours)}`}
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[2px] border text-[8px] leading-none"
              style={{ opacity: date > today ? 0.35 : 1 }}
            >
              {hours > 0 && (
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: color, opacity: Math.min(0.85, 0.15 + hours / 12) }}
                />
              )}
              {/* Whole hours only, to fit; the exact time is in the title. */}
              {hours >= 1 && <span className="relative font-semibold">{Math.round(hours)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The last four months side by side, as intra shows them, with arrows to
 * walk back through the history one month at a time.
 */
function LogtimeCalendar({ logtime, color }: { logtime: Record<string, string>; color: string }) {
  const today = new Date();
  const current = { year: today.getUTCFullYear(), month: today.getUTCMonth() };
  // The newest month on screen; the others are the ones just before it.
  const [newest, setNewest] = useState(current);

  const months = Array.from({ length: LOGTIME_MONTHS }, (_, i) =>
    shiftMonth(newest, i - (LOGTIME_MONTHS - 1)),
  );
  const total = months.reduce((sum, m) => sum + monthTotals(logtime, m.year, m.month).total, 0);
  const atCurrent = newest.year === current.year && newest.month === current.month;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setNewest((m) => shiftMonth(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold" style={{ color }}>
            {formatHours(total)}
          </span>{" "}
          over these {LOGTIME_MONTHS} months
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setNewest((m) => shiftMonth(m, 1))}
          disabled={atCurrent}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {months.map((m) => (
          <LogtimeMonth key={`${m.year}-${m.month}`} logtime={logtime} color={color} {...m} />
        ))}
      </div>
    </div>
  );
}

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** A login that opens that student in the intra view. */
const StudentLink = ({ login }: { login: string }) => (
  <Link
    href={`/dashboard?view=intra&login=${encodeURIComponent(login)}`}
    className="font-medium underline-offset-2 hover:underline"
  >
    {login}
  </Link>
);

/**
 * Everything behind one row of the projects list: each attempt's team, who
 * was in it and its mark, and the evaluations each one went through.
 */
function ProjectDialog({ row, onClose }: { row: any | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["projectsUser", row?.id],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/projects-users/${row.id}`, { signal });
      if (!response.ok) throw new Error(`Failed to fetch project (${response.status})`);
      return response.json();
    },
    enabled: !!row,
    staleTime: 10 * 60 * 1000,
  });

  const teams = [...(data?.teams ?? [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {row && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {row.project?.name}
                <span className={`text-base font-bold ${markColor(row)}`}>
                  {row.status === "finished" ? row.final_mark ?? 0 : "…"}
                </span>
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  {row.status === "finished"
                    ? row["validated?"]
                      ? "Validated"
                      : "Failed"
                    : row.status.replace(/_/g, " ")}
                  {row.marked_at && ` · ${formatDate(row.marked_at)}`}
                </span>
                {teams.length > 1 && <span>{teams.length} attempts</span>}
                <a
                  href={`https://projects.intra.42.fr/projects/${row.project?.slug}/projects_users/${row.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto flex items-center gap-1 hover:text-foreground"
                >
                  intra <ExternalLink className="h-3 w-3" />
                </a>
              </DialogDescription>
            </DialogHeader>

            {isLoading && <Skeleton className="h-40 w-full" />}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Could not load this project from the 42 API.</AlertDescription>
              </Alert>
            )}
            {data && teams.length === 0 && (
              <p className="text-sm text-muted-foreground">No team registered on this project yet.</p>
            )}

            <div className="space-y-4">
              {teams.map((team: any) => {
                const evaluations = (data?.evaluations ?? []).filter((e: any) => e.team?.id === team.id);
                return (
                  <div key={team.id} className="space-y-3 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-semibold">{team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {team.status.replace(/_/g, " ")} · {formatDate(team.created_at)}
                        {team.closed_at && ` → ${formatDate(team.closed_at)}`}
                      </span>
                      {team.final_mark != null && (
                        <span
                          className={`ml-auto font-bold ${team["validated?"] ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {team.final_mark}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {(team.users ?? []).map((user: any) => (
                        <span key={user.id} className="rounded bg-muted px-2 py-0.5">
                          <StudentLink login={user.login} />
                          {user.leader && <span className="text-muted-foreground"> · lead</span>}
                        </span>
                      ))}
                    </div>

                    {evaluations.length > 0 && (
                      <div className="space-y-2">
                        {evaluations.map((scale: any) => (
                          <div key={scale.id} className="space-y-1 border-l-2 pl-3 text-xs">
                            <div className="flex flex-wrap items-center gap-x-2">
                              <span className="text-muted-foreground">Evaluated by</span>
                              {scale.corrector?.login ? <StudentLink login={scale.corrector.login} /> : <span>—</span>}
                              <span className="text-muted-foreground">· {formatDate(scale.begin_at)}</span>
                              {scale.flag?.name && scale.flag.name !== "Ok" && (
                                <span className={scale.flag.positive ? "text-emerald-400" : "text-red-400"}>
                                  {scale.flag.name}
                                </span>
                              )}
                              {scale.final_mark != null && (
                                <span
                                  className={`ml-auto font-bold ${scale.flag?.positive ? "text-emerald-400" : "text-red-400"}`}
                                >
                                  {scale.final_mark}
                                </span>
                              )}
                            </div>
                            {scale.comment && <p className="whitespace-pre-line text-foreground/90">{scale.comment}</p>}
                            {scale.feedback && (
                              <p className="whitespace-pre-line italic text-muted-foreground">↳ {scale.feedback}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IntraSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function IntraProfile({ login }: { login: string }) {
  const projectsById = useFortyTwoStore((state) => state.projects);
  const [chosenCursus, setChosenCursus] = useState<number | null>(null);
  const [openProject, setOpenProject] = useState<any | null>(null);

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userIntraInfo", login],
    queryFn: () => fetchUserIntraInfo(login),
    enabled: !!login,
    staleTime: 10 * 60 * 1000,
    retry: (count, err) => !String((err as Error)?.message).includes("(404)") && count < 2,
  });

  // Declared in the order they should reach 42: requests on a key are paced,
  // so the one that colours the banner goes before the two below the fold.
  const { data: coalition } = useIntraExtra(login, "coalition");
  const logtimeQuery = useIntraExtra(login, "logtime");
  const evaluationsQuery = useIntraExtra(login, "evaluations");
  const evaluations: any[] | null = Array.isArray(evaluationsQuery.data) ? evaluationsQuery.data : null;

  const cursusUser = useMemo(() => {
    if (!profile?.cursus_users?.length) return null;
    return (
      profile.cursus_users.find((c: any) => c.cursus_id === chosenCursus) ??
      primaryCursusUser(profile)
    );
  }, [profile, chosenCursus]);

  if (isLoading) return <IntraSkeleton />;

  if (error || !profile) {
    const message = isKeyRequired(error)
      ? "Connect your 42 key to look students up."
      : String((error as Error)?.message).includes("(404)")
        ? `No student called "${login}" on 42.`
        : String((error as Error)?.message).includes("429")
          ? "42 is rate limiting this key, try again in a minute."
          : "Could not load this profile from the 42 API.";
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  }

  const color = coalition?.color || NEUTRAL;
  const level = cursusUser?.level ?? 0;
  const levelPercent = Math.round((level % 1) * 100);
  const cursusProjects = (profile.projects_users ?? [])
    .filter((row: any) => !cursusUser || row.cursus_ids?.includes(cursusUser.cursus_id))
    .sort(
      (a: any, b: any) =>
        new Date(b.marked_at ?? b.updated_at).getTime() - new Date(a.marked_at ?? a.updated_at).getTime(),
    );
  const skills = [...(cursusUser?.skills ?? [])].sort((a: any, b: any) => b.level - a.level);
  const maxSkill = Math.max(1, ...skills.map((s: any) => s.level));
  // Demo mode answers [] where 42 answers an object of days.
  const logtime =
    logtimeQuery.data && !Array.isArray(logtimeQuery.data)
      ? (logtimeQuery.data as Record<string, string>)
      : null;
  const titleUser = profile.titles_users?.find((t: any) => t.selected);
  const title = profile.titles?.find((t: any) => t.id === titleUser?.title_id);
  const displayName = title ? title.name.replace("%login", profile.login) : profile.usual_full_name;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ borderColor: color }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: coalition?.cover_url ? `url(${avatarSrc(coalition.cover_url)})` : undefined,
            backgroundColor: coalition?.cover_url ? undefined : color,
          }}
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative flex flex-col gap-6 p-6 text-white md:flex-row md:items-center">
          <Avatar className="h-32 w-32 shrink-0 ring-4" style={{ ["--tw-ring-color" as any]: color }}>
            <AvatarImage className="object-cover" src={avatarSrc(profile.image?.versions?.medium ?? profile.image?.link)} alt={profile.login} />
            <AvatarFallback className="text-3xl">{profile.login.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{profile.login}</h2>
                {profile["staff?"] && (
                  <span className="rounded bg-orange-500/30 px-2 py-0.5 text-xs font-semibold text-orange-200">STAFF</span>
                )}
                {profile["alumni?"] && (
                  <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold">ALUMNI</span>
                )}
              </div>
              <p className="text-white/80">{displayName}</p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/85">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4" /> {profile.wallet} ₳
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4" /> {profile.correction_point} evaluation points
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {profile.location ? (
                  <span className="font-semibold text-emerald-300">{profile.location}</span>
                ) : (
                  "Unavailable"
                )}
                {" · "}
                {primaryCampusName(profile) ?? "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" /> {profile.email}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {profile.cursus_users?.length > 1 ? (
                <Select
                  value={String(cursusUser?.cursus_id ?? "")}
                  onValueChange={(value) => setChosenCursus(Number(value))}
                >
                  <SelectTrigger className="h-8 w-auto border-white/30 bg-black/30 text-white" aria-label="Cursus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profile.cursus_users.map((c: any) => (
                      <SelectItem key={c.cursus_id} value={String(c.cursus_id)}>
                        {c.cursus?.name ?? `Cursus ${c.cursus_id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span>{cursusUser?.cursus?.name}</span>
              )}
              {cursusUser?.grade && <span className="text-white/80">Grade · {cursusUser.grade}</span>}
              {coalition && (
                <span className="font-semibold" style={{ color }}>
                  {coalition.name}
                </span>
              )}
            </div>

            {/* Level bar */}
            <div className="relative h-8 overflow-hidden rounded-md bg-black/50">
              <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${levelPercent}%`, backgroundColor: color }} />
              <span className="relative flex h-full items-center justify-center text-sm font-semibold">
                level {Math.floor(level)} - {levelPercent}%
              </span>
            </div>
          </div>

          <a
            href={`https://profile.intra.42.fr/users/${encodeURIComponent(profile.login)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 self-start text-sm text-white/70 hover:text-white"
          >
            intra <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Projects ({cursusProjects.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-1 overflow-y-auto">
            {cursusProjects.length === 0 && <p className="text-sm text-muted-foreground">No project yet.</p>}
            {cursusProjects.map((row: any) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setOpenProject(row)}
                className="flex w-full items-center justify-between gap-3 border-b px-1 py-2 text-left transition-colors last:border-0 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.project?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.status === "finished"
                      ? timeAgo(row.marked_at ?? row.updated_at)
                      : row.status.replace(/_/g, " ")}
                    {row.occurrence > 0 && ` · retry ${row.occurrence}`}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-bold ${markColor(row)}`}>
                  {row.status === "finished" ? row.final_mark ?? 0 : "…"}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {skills.length === 0 && <p className="text-sm text-muted-foreground">No skill in this cursus.</p>}
            {skills.map((skill: any) => (
              <div key={skill.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="truncate">{skill.name}</span>
                  <span className="text-muted-foreground">{skill.level.toFixed(2)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(skill.level / maxSkill) * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Logtime */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Logtime</CardTitle>
          </CardHeader>
          <CardContent>
            {logtime ? (
              <LogtimeCalendar logtime={logtime} color={color} />
            ) : !logtimeQuery.isPending ? (
              <p className="text-sm text-muted-foreground">No logtime available.</p>
            ) : (
              <Skeleton className="h-28 w-full" />
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Achievements ({profile.achievements?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[260px] space-y-2 overflow-y-auto">
            {(profile.achievements ?? []).map((a: any) => (
              <div key={a.id} className="text-sm">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Evaluations */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Latest evaluations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {evaluationsQuery.isPending && <Skeleton className="h-24 w-full" />}
            {!evaluationsQuery.isPending && !evaluations?.length && (
              <p className="text-sm text-muted-foreground">No evaluation available.</p>
            )}
            {evaluations?.map((scale: any) => {
              const asCorrector = scale.corrector?.login === profile.login;
              const project =
                projectsById?.[scale.team?.project_id]?.name ??
                scale.team?.project_gitlab_path?.split("/").pop() ??
                "project";
              const others = asCorrector
                ? (scale.correcteds ?? []).map((u: any) => u.login).join(", ")
                : scale.corrector?.login ?? "someone";
              return (
                <div key={scale.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                  <p className="min-w-0 truncate text-sm">
                    {asCorrector ? (
                      <>
                        Evaluated <b>{others}</b> on <b>{project}</b>
                      </>
                    ) : (
                      <>
                        Evaluated by <b>{others}</b> on <b>{project}</b>
                      </>
                    )}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {scale.final_mark != null && (
                      <span className={scale.flag?.positive ? "text-emerald-400" : "text-red-400"}>
                        {scale.final_mark}
                      </span>
                    )}{" "}
                    · {scale.begin_at ? timeAgo(scale.begin_at) : ""}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <ProjectDialog row={openProject} onClose={() => setOpenProject(null)} />
    </div>
  );
}
