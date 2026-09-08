"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Star,
  Bug,
  KeyRound,
  Database,
  Github,
  Pause,
  Play,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { TransparentBadge } from "@/components/TransparentBadge";
import { IntraKeyGuide } from "@/components/IntraKeyGuide";
import {
  copy,
  detectLanguage,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "@/lib/api-key-copy";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { motion } from "framer-motion";

/**
 * Whether the ambient background animates.
 *
 * Cheap to run, but a fan spinning up on a laptop for a page someone is just
 * reading is a bad trade -- so it can be paused, and the choice is
 * remembered rather than asked again on every visit.
 */
const PAUSE_STORAGE_KEY = "42insight:background-paused";

/**
 * Page-specific copy, in both languages. The longer explanatory paragraphs
 * (why/whyAutonomy/whyPrivacy) and the plain field labels live in
 * lib/api-key-copy.ts instead, and are reused here rather than duplicated,
 * since this page and /api-key say the exact same thing about those.
 */
const homeCopy = {
  en: {
    subtitle: "Student hub for Angoulême & Nice",
    highlight1Title: "One key, signs you in and fetches your data",
    highlight1Text: "There is no separate 42 login anymore. The application you register below is both.",
    highlight2Title: "Nothing stored",
    highlight2Text: "No database, no cron, no background jobs. Every page reads the 42 API live.",
    highlight3Title: "Open source",
    highlight3Before: "Nothing hidden in how it works. Read the code on",
    whySummary:
      "Your key does three things at once. It keeps the site running with nothing stored anywhere, keeps it working even if I ever stop maintaining it, and keeps everything open source so you can check exactly what happens to it.",
    moreDetail: "More detail",
    connect: "Connect",
    connecting: "Connecting…",
    alreadyBefore: "Already registered one?",
    alreadyLink: "Find it in your existing apps",
    alreadyAfter: "and reuse its credentials.",
    noKey: "Don't have a key, or not sure what this is?",
    stepOpenBefore: "Open",
    stepOpenAfter: "on the intra.",
    stepCopy: "Copy its UID and secret above.",
    star: "Star",
    issues: "Issues",
    createdBy: "Created by",
    pauseAnimation: "Pause animation",
    animationOff: "Animation off",
    pauseTitle: "Pause the background animation",
    resumeTitle: "Resume the background animation",
    errorGeneric: "42 didn't accept that client ID and secret",
    errorPrivate: "That application is private on the intra. Make it public (your app → Public) and try again.",
    errorServer: "Could not reach the server",
  },
  fr: {
    subtitle: "Espace étudiant pour Angoulême & Nice",
    highlight1Title: "Une seule clé, pour se connecter et pour récupérer vos données",
    highlight1Text: "Il n'y a plus de connexion 42 séparée. L'application que vous enregistrez ci-dessous fait les deux.",
    highlight2Title: "Rien n'est stocké",
    highlight2Text: "Pas de base de données, pas de tâche planifiée, pas de job en arrière-plan. Chaque page lit l'API 42 en direct.",
    highlight3Title: "Open source",
    highlight3Before: "Rien n'est caché dans son fonctionnement. Consultez le code sur",
    whySummary:
      "Votre clé fait trois choses à la fois. Elle fait tourner le site sans rien stocker nulle part, elle continue de fonctionner même si j'arrête un jour de le maintenir, et tout reste open source pour que vous puissiez vérifier exactement ce qu'il en advient.",
    moreDetail: "Plus de détails",
    connect: "Se connecter",
    connecting: "Connexion…",
    alreadyBefore: "Déjà inscrit une application ?",
    alreadyLink: "Retrouvez-la dans vos applications",
    alreadyAfter: "et réutilisez ses identifiants.",
    noKey: "Pas encore de clé, ou pas sûr de ce que c'est ?",
    stepOpenBefore: "Ouvrez",
    stepOpenAfter: "sur l'intra.",
    stepCopy: "Copiez son UID et son secret ci-dessus.",
    star: "Star",
    issues: "Issues",
    createdBy: "Créé par",
    pauseAnimation: "Mettre en pause",
    animationOff: "Animation coupée",
    pauseTitle: "Mettre en pause l'animation de fond",
    resumeTitle: "Reprendre l'animation de fond",
    errorGeneric: "42 n'a pas accepté ce client ID et ce secret",
    errorPrivate: "Cette application est privée sur l'intra. Passez-la en publique (votre appli → Public) puis réessayez.",
    errorServer: "Impossible de contacter le serveur",
  },
};

const highlightIcons = [KeyRound, Database, Github];

const tutorialSteps: Record<Language, React.ReactNode[]> = {
  en: [
    <>Give it any <strong>name</strong>.</>,
    <>Pick any <strong>application type</strong>.</>,
    <>
      Check <strong>Public</strong>. Signing in works by looking up who owns the
      application, and 42 only lists public ones.
    </>,
    <>
      Set any valid <strong>redirect URI</strong> (for example,{" "}
      <code className="rounded bg-black/40 px-1 py-0.5">http://localhost</code>).
    </>,
  ],
  fr: [
    <>Donnez-lui n&apos;importe quel <strong>nom</strong>.</>,
    <>Choisissez n&apos;importe quel <strong>type d&apos;application</strong>.</>,
    <>
      Cochez <strong>Public</strong> : la connexion fonctionne en retrouvant qui
      possède l&apos;application, et 42 ne liste que les applications publiques.
    </>,
    <>
      Renseignez une <strong>redirect URI</strong> valide (exemple :{" "}
      <code className="rounded bg-black/40 px-1 py-0.5">http://localhost</code>).
    </>,
  ],
};

const StarFieldImpl = ({ paused }: { paused: boolean }) => {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 2,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white shadow-[0_0_2px_rgba(255,255,255,0.8)]"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
          animate={
            paused
              ? undefined
              : { opacity: [star.opacity, 1, star.opacity], scale: [1, 1.2, 1] }
          }
          transition={{ duration: star.duration, repeat: Infinity, delay: star.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

// Client-only: the positions are random on every render, so a server-rendered
// copy can never match what the client generates on hydration.
const StarField = dynamic(() => Promise.resolve(StarFieldImpl), { ssr: false });

/**
 * middleware.ts sends a visitor here with ?callbackUrl=<the page they wanted>
 * when they hit a protected route signed out -- an absolute URL, not a path,
 * so this can't just check for a leading "/" (that still accepts the
 * protocol-relative "//evil.example", which resolves to a different origin).
 * Resolving against the current origin and comparing origins catches every
 * shape at once; a mismatch or a malformed value both fall back to /dashboard
 * rather than ever handing router.push() something that could navigate away
 * from this site right after a visitor signs in.
 */
const resolveCallbackUrl = (raw: string | null): string => {
  if (!raw) return "/dashboard";
  try {
    const resolved = new URL(raw, window.location.origin);
    if (resolved.origin === window.location.origin) {
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    }
  } catch {
    // Malformed URL; fall through to the safe default.
  }
  return "/dashboard";
};

export default function Home() {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showWhyDetail, setShowWhyDetail] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const t = homeCopy[language];
  const tKey = copy[language];

  useEffect(() => {
    try {
      setPaused(window.localStorage.getItem(PAUSE_STORAGE_KEY) === "true");
    } catch {
      // Private browsing, or storage refused. The animation simply runs.
    }
  }, []);

  // Read after mount: navigator and localStorage do not exist on the server,
  // and guessing wrong would flash the wrong language for a moment.
  useEffect(() => setLanguage(detectLanguage()), []);

  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Not remembering it is a smaller failure than not honouring it.
    }
  };

  const togglePaused = () => {
    setPaused((wasPaused) => {
      const next = !wasPaused;
      try {
        window.localStorage.setItem(PAUSE_STORAGE_KEY, String(next));
      } catch {
        // Not remembering it is a smaller failure than not honouring it.
      }
      return next;
    });
  };

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) return;

    setConnecting(true);
    try {
      // Identity: who this application belongs to, per 42.
      const result = await signIn("credentials", {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirect: false,
      });

      if (!result || result.error) {
        // 42 never lists a private application's owner, so this is the one
        // failure worth naming instead of folding into the generic message.
        const message =
          result?.error === "private-application" ? t.errorPrivate : t.errorGeneric;
        toast.error(message, { duration: 5000, position: "bottom-right" });
        return;
      }

      // Data: the same credentials, sealed for every page that reads the
      // 42 API. Two calls, because signing in and connecting a key are
      // still two different systems underneath -- just one form now.
      await fetch("/api/byok/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId.trim(), client_secret: clientSecret.trim() }),
      });

      router.push(resolveCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl")));
    } catch {
      toast.error(t.errorServer, { duration: 3000, position: "bottom-right" });
    } finally {
      setConnecting(false);
    }
  };

  const highlights = [
    { icon: highlightIcons[0], title: t.highlight1Title, text: t.highlight1Text },
    { icon: highlightIcons[1], title: t.highlight2Title, text: t.highlight2Text },
    {
      icon: highlightIcons[2],
      title: t.highlight3Title,
      text: (
        <>
          {t.highlight3Before}{" "}
          <a
            href="https://github.com/fzphr/42insight"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 hover:underline"
          >
            GitHub
          </a>
          .
        </>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-[#050505] to-black pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] rounded-full blur-[120px] opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(60, 50, 255, 0.4), transparent 70%)",
            top: "20%",
            left: "50%",
            x: "-50%",
          }}
          animate={paused ? undefined : { scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[50vw] h-[50vw] max-w-[550px] max-h-[550px] rounded-full blur-[110px] opacity-15"
          style={{ background: "radial-gradient(circle, rgba(180, 50, 255, 0.4), transparent 70%)", bottom: "5%", right: "10%" }}
          animate={paused ? undefined : { x: [0, 60, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <StarField paused={paused} />

      <div className="absolute top-4 right-4 z-50 inline-flex overflow-hidden rounded-md border border-white/15 bg-black/40 text-xs backdrop-blur-sm">
        {(["fr", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => chooseLanguage(code)}
            aria-pressed={language === code}
            className={`px-2 py-1 transition-colors ${
              language === code
                ? "bg-white text-black"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-16 p-8 py-16">
        <main className="flex w-full max-w-2xl flex-col items-center gap-10">
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]">
              42 Insight
            </h1>
            <div className="flex items-center justify-center gap-2">
              <TransparentBadge text="🌐 One for All" bgColor="bg-blue-500/10" textColor="text-blue-300" />
              <span className="text-sm text-muted-foreground">{t.subtitle}</span>
            </div>
          </motion.div>

          <motion.div
            className="w-full space-y-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          >
            {highlights.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <item.icon className="h-4 w-4 shrink-0 mt-0.5 text-blue-300" />
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.form
            onSubmit={handleConnect}
            className="w-full space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          >
            <div className="space-y-2 border-b border-white/10 pb-3 text-sm text-muted-foreground">
              <p>{t.whySummary}</p>
              <button
                type="button"
                onClick={() => setShowWhyDetail((shown) => !shown)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
              >
                {t.moreDetail}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showWhyDetail ? "rotate-180" : ""}`} />
              </button>
              {showWhyDetail && (
                <div className="space-y-2 border-t border-white/10 pt-2">
                  <p>{tKey.why}</p>
                  <p>{tKey.whyAutonomy}</p>
                  <p>{tKey.whyPrivacy}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="client-id" className="text-xs font-medium text-white/70">
                {tKey.clientId}
              </label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                autoComplete="off"
                placeholder="u-s4t2ud-…"
                className="border-white/10 bg-black/30 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="client-secret" className="text-xs font-medium text-white/70">
                {tKey.clientSecret}
              </label>
              <div className="relative">
                <Input
                  id="client-secret"
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  autoComplete="off"
                  placeholder="s-s4t2ud-…"
                  className="border-white/10 bg-black/30 pr-9 text-white placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((shown) => !shown)}
                  aria-label={showSecret ? tKey.hideSecret : tKey.showSecret}
                  className="absolute inset-y-0 right-0 flex items-center px-2 text-white/40 transition-colors hover:text-white"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-base font-medium bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300"
              disabled={connecting || !clientId.trim() || !clientSecret.trim()}
            >
              <span className="flex items-center justify-center gap-2">
                {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                {connecting ? t.connecting : t.connect}
              </span>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {t.alreadyBefore}{" "}
              <a
                href="https://profile.intra.42.fr/oauth/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-300 hover:underline"
              >
                {t.alreadyLink}
                <ExternalLink className="h-3 w-3" />
              </a>
              {" "}{t.alreadyAfter}
            </p>

            <button
              type="button"
              onClick={() => setShowGuide((shown) => !shown)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-white/10 pt-3 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              {t.noKey}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showGuide ? "rotate-180" : ""}`} />
            </button>

            {showGuide && (
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>
                    {t.stepOpenBefore}{" "}
                    <a
                      href="https://profile.intra.42.fr/oauth/applications/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-300 hover:underline"
                    >
                      Settings → API → Register a new app
                      <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    {t.stepOpenAfter}
                  </li>
                  {tutorialSteps[language].map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                  <li>{t.stepCopy}</li>
                </ol>
                <IntraKeyGuide language={language} />
              </div>
            )}
          </motion.form>

          <div className="flex w-full flex-wrap justify-center gap-2">
            {[
              { icon: Star, text: t.star, href: "https://github.com/fzphr/42insight" },
              { icon: Bug, text: t.issues, href: "https://github.com/fzphr/42insight/issues" },
            ].map((item) => (
              <a
                key={item.text}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 min-w-[80px] items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-2 py-2.5 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.text}
              </a>
            ))}
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-6">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            {t.createdBy}{" "}
            <a href="https://github.com/fzphr" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
              Zeph
            </a>{" "}
            &{" "}
            <a href="https://github.com/Haletran" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
              Haletran
            </a>
          </p>
        </footer>
      </div>

      <button
        type="button"
        onClick={togglePaused}
        aria-pressed={paused}
        title={paused ? t.resumeTitle : t.pauseTitle}
        className="absolute bottom-4 right-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
      >
        {paused ? (
          <>
            <Play className="h-3.5 w-3.5" />
            {t.animationOff}
          </>
        ) : (
          <>
            <Pause className="h-3.5 w-3.5" />
            {t.pauseAnimation}
          </>
        )}
      </button>
    </div>
  );
}
