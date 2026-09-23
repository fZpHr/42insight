"use client";

import { useState, useEffect, useRef } from "react";
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
  HelpCircle,
  Server,
} from "lucide-react";
import { IntraKeyGuide } from "@/components/IntraKeyGuide";
import {
  copy,
  detectLanguage,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "@/lib/api-key-copy";
import { getSession, signIn, useSession } from "next-auth/react";
import { isDevPreviewEnabled, setDevPreview as persistDevPreview } from "@/lib/dev-preview";
import { announceKeyChange } from "@/lib/api-client";
import { toast } from "sonner";

import { WORLD_LAND_PATH } from "@/lib/forty-two/data/world-land";
import campusCoords from "@/lib/forty-two/data/campus-coords.json";

type CampusPoint = { name: string; lat: number; lon: number };

/**
 * Every campus 42 has, with the coordinates of the city it is in.
 *
 * The 42 API gives a campus's city and country and no latitude or longitude,
 * so the file next door was geocoded once from those cities rather than being
 * fetched on every visit. A campus 42 opens tomorrow shows up in the site's
 * own lists straight away, and on this map when someone regenerates the file.
 */
const CAMPUS_COORDS: CampusPoint[] = campusCoords.campuses;

/** The campus a session names, as a point on the map, when 42 has one. */
const campusPoint = (campus?: string | null): CampusPoint | null =>
  CAMPUS_COORDS.find(
    (point) => point.name.toLowerCase() === (campus ?? "").toLowerCase(),
  ) ?? null;

/**
 * Whether the ambient background animates.
 *
 * The old background was ninety framer-motion stars plus two 700px shapes
 * under a 120px blur, animated in a loop: ninety JavaScript animations a
 * frame, and a blurred surface Chrome for Windows re-rasterises as it moves.
 * What is here now is four composited layers driven by CSS transforms, so the
 * toggle is a courtesy rather than a rescue -- and it still defers to the
 * system's own reduced-motion setting.
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
    subtitle: "Student hub for every 42 campus",
    tagline: "One key. Every campus. Nothing stored.",
    highlight1Title: "One key, signs you in and fetches your data",
    highlight1Text: "There is no separate 42 login anymore. The application you register below is both.",
    highlight2Title: "Nothing stored",
    highlight2Text: "No database, no cron, no background jobs. Every page reads the 42 API live.",
    highlight3Title: "Open source",
    highlight3Before: "Nothing hidden in how it works. Read the code on",
    highlight4Title: "Host it yourself",
    highlight4Text:
      "Nothing to provision, and no key of mine to borrow. Clone it, put any random string in JWT_SECRET (yours, not mine), then npm install and npm run dev.",
    whySummary:
      "Using your key rather than one of mine changes three things. The site runs with nothing stored anywhere. It stops depending on me, so it keeps working even if I ever stop looking after it. And the code is open source, so you can check exactly what is done with your key.",
    moreDetail: "More detail",
    formTitle: "Connect your 42 application",
    formSubtitle: "Its UID and secret, from the intra. Nothing else is asked.",
    connect: "Connect",
    connecting: "Connecting…",
    alreadyBefore: "Already registered one?",
    alreadyLink: "Find it in your existing apps",
    alreadyAfter: "and reuse its credentials. Make sure it's public.",
    browseWithoutKey: "Browse the site without a key (so, without data)",
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
    subtitle: "Espace étudiant pour toutes les écoles 42",
    tagline: "Une clé. Tous les campus. Rien de stocké.",
    highlight1Title: "Une seule clé, pour se connecter et pour récupérer vos données",
    highlight1Text: "Il n'y a plus de connexion 42 séparée. L'application que vous enregistrez ci-dessous fait les deux.",
    highlight2Title: "Rien n'est stocké",
    highlight2Text: "Pas de base de données, pas de tâche planifiée, pas de job en arrière-plan. Chaque page lit l'API 42 en direct.",
    highlight3Title: "Open source",
    highlight3Before: "Rien n'est caché dans son fonctionnement. Consultez le code sur",
    highlight4Title: "Hébergez-le vous-même",
    highlight4Text:
      "Rien à provisionner, aucune clé de ma part à emprunter. Clonez, mettez n'importe quelle chaîne dans JWT_SECRET (le vôtre, pas le mien), puis npm install et npm run dev.",
    whySummary:
      "Utiliser votre clé plutôt qu'une des miennes change trois choses. Le site tourne sans rien stocker nulle part. Il cesse de dépendre de moi, donc il continue de marcher même si j'arrête un jour de m'en occuper. Et le code est open source, vous pouvez vérifier exactement ce qui est fait de votre clé.",
    moreDetail: "Plus de détails",
    formTitle: "Connectez votre application 42",
    formSubtitle: "Son UID et son secret, depuis l'intra. Rien d'autre n'est demandé.",
    connect: "Se connecter",
    connecting: "Connexion…",
    alreadyBefore: "Déjà inscrit une application ?",
    alreadyLink: "Retrouvez-la dans vos applications",
    alreadyAfter: "et réutilisez ses identifiants. Elle doit être publique.",
    browseWithoutKey: "Accéder au site sans clé (donc sans data)",
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

const highlightIcons = [KeyRound, Database, Github, Server];

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

/**
 * The network, turning.
 *
 * A flat map inside a round window rather than a sphere: one element carrying
 * the coastlines slides past under a circular mask, and the campuses ride with
 * it because they are positioned in the same map. Nothing is recomputed per
 * frame -- it is one transform on one element, which the compositor animates
 * on its own, and the shading over the top is what sells the curve.
 *
 * On a successful sign-in the 42 API has just said which campus the visitor
 * belongs to, so the map stops turning and travels to it.
 */
const MAP_TILES = 2;
/** The map is this many times the width of the window it shows through. */
const TILE_SPAN = 3;

/**
 * How lively a campus looks on the map: dim, awake, or busy.
 *
 * Decoration, not data. Telling anyone how busy a campus really is would mean
 * reading fifty-four rosters before they have even signed in, which is the
 * whole thing this page exists to avoid. So it is a number derived from the
 * name -- stable, so a campus keeps its colour from one visit to the next,
 * and varied enough that the map does not look like a grid of identical pins.
 */
const busyness = (name: string): "dim" | "awake" | "busy" => {
  let sum = 0;
  for (const letter of name) sum = (sum * 31 + letter.charCodeAt(0)) % 997;
  return sum % 3 === 0 ? "busy" : sum % 3 === 1 ? "awake" : "dim";
};

const Globe = ({ focus }: { focus: CampusPoint | null }) => {
  const track = useRef<HTMLDivElement>(null);

  // Handing a running animation over to a transition needs the position it is
  // at right now: dropping the animation alone would snap it back to the
  // start. So the live matrix is pinned inline first, the layout is flushed,
  // and only then is the destination set for the transition to run to.
  useEffect(() => {
    const map = track.current;
    if (!map || !focus) return;

    const live = getComputedStyle(map).transform;
    map.style.animation = "none";
    map.style.transform = live;
    void map.offsetWidth;

    // Where that campus sits in the track, as a share of the track's own size,
    // and the translation that brings it to the middle of the window. In
    // percentages rather than pixels: pixels would have to be measured, and a
    // measurement taken a frame too early reads zero -- which is a zoom that
    // lands nowhere. Percentages also survive the window being resized.
    //
    // The scale applies before the translation, and the origin is the track's
    // left edge at half its height, so across it counts from the edge and
    // vertically from the middle.
    const zoom = 2.6;
    const acrossTrack = TILE_SPAN * MAP_TILES;
    const alongX = (focus.lon + 180) / 360 / MAP_TILES;
    const alongY = (90 - focus.lat) / 180;

    map.style.transition = "transform 1.8s cubic-bezier(0.22, 0.61, 0.36, 1)";
    map.style.transform =
      `translate(${(0.5 / acrossTrack - zoom * alongX) * 100}%, ${zoom * (0.5 - alongY) * 100}%)` +
      ` scale(${zoom})`;
  }, [focus]);

  return (
    <div className={`globe ${focus ? "globe-found" : ""}`}>
      {/* A planet's axis is not straight up, and a map sliding dead level
          reads as a conveyor belt. The tilt is on a wrapper so the seam
          between the two copies stays exactly vertical underneath it. */}
      <div className="globe-tilt">
      <div className="globe-track" ref={track}>
        {Array.from({ length: MAP_TILES }, (_, tile) => (
          <div className="globe-tile" key={tile}>
            <svg className="globe-land" viewBox="0 0 720 360" preserveAspectRatio="none">
              <path d={WORLD_LAND_PATH} />
            </svg>
            {CAMPUS_COORDS.map((campus) => (
              <span
                key={campus.name}
                className={`campus campus-${busyness(campus.name)} ${focus?.name === campus.name ? "campus-yours" : ""}`}
                style={{
                  left: `${((campus.lon + 180) / 360) * 100}%`,
                  top: `${((90 - campus.lat) / 180) * 100}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      </div>
      <div className="globe-shade" />
    </div>
  );
};

/**
 * The sky: two drifting star fields, and a streak across it now and then.
 *
 * What was here before -- ninety framer-motion stars and a blackhole scene --
 * looked good and said nothing about the site. The page has one job, which is
 * to show what you get for a key and then take it, so the background is now
 * backdrop rather than subject.
 *
 * Each layer is one element carrying a repeating background, moved with
 * `transform` alone: the property a browser hands to the compositor. The stars
 * are two tiny radial gradients tiled over a few hundred pixels, so a whole
 * field costs one paint rather than one element per star, and parallax is just
 * a different tile size and speed per layer.
 */
const Sky = ({ still }: { still: boolean }) => (
  <div
    aria-hidden
    className={`pointer-events-none fixed inset-0 overflow-hidden ${still ? "sky-still" : ""}`}
  >
    <div className="nebula" />
    <div className="stars stars-far" />
    <div className="stars stars-near" />
    <span className="shooting shooting-a" />
    <div className="vignette" />
  </div>
);

const skyStyles = `
  /* One breath of colour, cold and far off. Two gradients, nothing else: on a
     page this dark, more of them reads as decoration rather than distance. */
  .nebula {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(45% 38% at 16% 12%, rgba(47, 78, 184, 0.2), transparent 72%),
      radial-gradient(40% 34% at 84% 84%, rgba(76, 46, 150, 0.16), transparent 74%);
  }

  /* The round window the map turns behind. */
  .globe {
    position: absolute;
    left: 50%;
    top: 52%;
    width: clamp(420px, 58vw, 820px);
    aspect-ratio: 1;
    translate: -50% -50%;
    border-radius: 50%;
    overflow: hidden;
    opacity: 0.6;
    transition: opacity 1.2s ease;
    box-shadow: inset 0 0 60px rgba(2, 6, 23, 0.9), 0 0 60px rgba(37, 99, 235, 0.1);
  }
  .globe-found { opacity: 0.95; }

  /* The axial tilt, on its own wrapper: slightly oversized so its corners
     never come into view as it turns. */
  .globe-tilt {
    position: absolute;
    inset: -14%;
    transform: rotate(-7deg);
  }

  /* Two copies of the map side by side, so sliding one width over is
     seamless. One transform, one animation, whatever the map holds. */
  .globe-track {
    position: absolute;
    top: 50%;
    left: 0;
    display: flex;
    width: 600%;
    height: 150%;
    translate: 0 -50%;
    will-change: transform;
    animation: map-turn 150s linear infinite;
    transform-origin: 0 50%;
  }
  .globe-tile {
    position: relative;
    width: 50%;
    height: 100%;
    flex: none;
  }
  .globe-land {
    width: 100%;
    height: 100%;
    display: block;
    fill: rgba(96, 165, 250, 0.22);
    stroke: rgba(147, 197, 253, 0.55);
    stroke-width: 0.6;
    vector-effect: non-scaling-stroke;
  }
  .campus {
    position: absolute;
    width: 3px;
    height: 3px;
    margin: -1.5px 0 0 -1.5px;
    border-radius: 50%;
    background: rgba(191, 219, 254, 0.9);
    box-shadow: 0 0 5px rgba(96, 165, 250, 0.8);
  }
  /* Three tiers, so the map has some life in it rather than one flat colour.
     Decorative: see busyness() for why this is not real activity. */
  .campus-dim {
    background: rgba(148, 163, 184, 0.55);
    box-shadow: 0 0 4px rgba(100, 116, 139, 0.5);
  }
  .campus-awake {
    background: rgba(125, 211, 252, 0.85);
    box-shadow: 0 0 6px rgba(56, 189, 248, 0.7);
  }
  .campus-busy {
    width: 4px;
    height: 4px;
    margin: -2px 0 0 -2px;
    background: rgba(253, 224, 71, 0.95);
    box-shadow: 0 0 8px rgba(250, 204, 21, 0.8);
  }

  /* The one the visitor belongs to, once 42 has said which it is. */
  .campus-yours {
    width: 6px;
    height: 6px;
    margin: -3px 0 0 -3px;
    background: #eaffea;
    box-shadow: 0 0 12px 3px rgba(74, 222, 128, 0.95);
  }
  /* A green light opening out from it, once, as the map flies in. */
  .campus-yours::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    margin: -3px 0 0 -3px;
    border-radius: 50%;
    border: 1px solid rgba(74, 222, 128, 0.9);
    background: radial-gradient(circle, rgba(74, 222, 128, 0.35), transparent 70%);
    animation: found 2.4s ease-out 0.6s infinite;
  }
  @keyframes found {
    from { transform: scale(1); opacity: 0.9; }
    to { transform: scale(14); opacity: 0; }
  }

  /* The curve: light from the upper left, dark at the rim. Static. */
  .globe-shade {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      radial-gradient(circle at 32% 28%, rgba(191, 219, 254, 0.12), transparent 55%),
      radial-gradient(circle at 50% 50%, transparent 52%, rgba(2, 4, 12, 0.85) 88%);
  }

  @keyframes map-turn {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  /* No room for it beside the form on a narrow screen. */
  @media (max-width: 1023px) {
    .globe { display: none; }
  }

  /* Dark at the edges, so the middle of the page reads first. */
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(75% 65% at 50% 45%, transparent 55%, rgba(2, 3, 8, 0.75) 100%);
  }

  .stars {
    position: absolute;
    inset: -20% -20% -20% -20%;
    background-repeat: repeat;
    will-change: transform;
  }
  .stars-far {
    background-image:
      radial-gradient(1px 1px at 20% 30%, rgba(255, 255, 255, 0.55), transparent 60%),
      radial-gradient(1px 1px at 70% 80%, rgba(255, 255, 255, 0.4), transparent 60%);
    background-size: 180px 180px;
    animation: drift 240s linear infinite;
  }
  /* The near layer: fewer, brighter, and quicker, which is what sells depth. */
  .stars-near {
    background-image:
      radial-gradient(2px 2px at 60% 40%, rgba(255, 255, 255, 0.9), transparent 60%),
      radial-gradient(1.6px 1.6px at 15% 75%, rgba(199, 210, 254, 0.8), transparent 60%);
    background-size: 620px 620px;
    animation: drift 100s linear infinite;
  }

  /* A streak that crosses the sky now and then: one element, visible for a
     couple of seconds out of twenty. */
  .shooting {
    position: absolute;
    top: 0;
    left: 0;
    width: 140px;
    height: 1px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.9));
    opacity: 0;
    will-change: transform, opacity;
  }
  .shooting-a { animation: shoot 19s linear infinite 6s; }

  @keyframes drift {
    to { transform: translate3d(-180px, -120px, 0); }
  }
  @keyframes shoot {
    0% { transform: translate3d(-10vw, 12vh, 0) rotate(18deg); opacity: 0; }
    3% { opacity: 1; }
    12% { transform: translate3d(85vw, 52vh, 0) rotate(18deg); opacity: 0; }
    100% { transform: translate3d(85vw, 52vh, 0) rotate(18deg); opacity: 0; }
  }

  /* The toggle, and the system setting, stop everything rather than slow it. */
  .sky-still * { animation: none !important; }
  @media (prefers-reduced-motion: reduce) {
    .stars, .shooting { animation: none !important; }
  }
`;

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
  const { status } = useSession();
  const [paused, setPaused] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showWhyDetail, setShowWhyDetail] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [focus, setFocus] = useState<CampusPoint | null>(null);
  const connectingRef = useRef(false);
  const [devPreview, setDevPreview] = useState(false);

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

  // PROTOTYPE: ?demo=Nice plays the sign-in flight without a key, so the
  // animation can be looked at during `npm run dev`.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (!demo) return;
    const timer = setTimeout(() => setFocus(campusPoint(demo)), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Same cookie the DevPreviewToggle button sets. Read after mount: the
  // server never sees this cookie's value the way the client does, so
  // checking it during render would fight hydration.
  useEffect(() => setDevPreview(isDevPreviewEnabled()), []);

  // A visitor whose session cookie is still good has nothing to do on this
  // page. Without this, it showed the connect form on every visit even
  // though the credentials cookie was still valid for a month. Preview mode
  // gets the same shortcut, since its whole point is skipping this form.
  //
  // Not while the form is connecting, though: signIn turns the session
  // authenticated before the key is sealed, and leaving right then landed on
  // the dashboard with no key cookie -- every query answered 428 and the
  // sidebar said "no key" until a full reload. handleConnect navigates itself
  // once both steps are done.
  useEffect(() => {
    if (connectingRef.current) return;
    if (status !== "authenticated" && !devPreview) return;
    router.replace(
      resolveCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl")),
    );
  }, [status, devPreview, router]);

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

    connectingRef.current = true;
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
      const sealed = await fetch("/api/byok/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId.trim(), client_secret: clientSecret.trim() }),
      });
      if (!sealed.ok) throw new Error(`byok token ${sealed.status}`);
      announceKeyChange();

      // Now that 42 has said who this is, the globe knows where to look: it
      // stops turning and flies to the campus, the way a map does when you
      // hand it coordinates. Worth the second and a half it costs, and skipped
      // entirely for a campus this page has no point for.
      const session = await getSession();
      const point = campusPoint(session?.user?.campus);
      if (point) {
        setFocus(point);
        await new Promise((done) => setTimeout(done, 1500));
      }

      router.push(resolveCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl")));
    } catch {
      toast.error(t.errorServer, { duration: 3000, position: "bottom-right" });
    } finally {
      connectingRef.current = false;
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
    // The point of the whole design, said plainly: the site needs one secret
    // of the host's own choosing and nothing else. No database to stand up, no
    // 42 application of mine to borrow -- every visitor brings their own key.
    { icon: highlightIcons[3], title: t.highlight4Title, text: t.highlight4Text },
  ];

  // Not while this page is the one doing the signing in: the session turns
  // authenticated the moment 42 answers, and swapping the page for a spinner
  // right then takes the globe off screen before it has flown anywhere.
  if (!connecting && (status === "loading" || status === "authenticated" || devPreview)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05060a]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#05060a] text-foreground">
      <style>{skyStyles}</style>
      <Sky still={paused} />
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <Globe focus={focus} />
      </div>

      {/* Two columns on a wide screen: what this is on the left, the one thing
          to do on the right. Stacked on a phone, form first is wrong -- nobody
          pastes a secret into a page they have not read yet. */}
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-10 px-6 py-14 lg:flex-row lg:items-center lg:gap-14">
        <main className="flex w-full flex-col gap-7 lg:max-w-sm">
          <div className="inline-flex w-fit overflow-hidden rounded-md border border-white/15 bg-black/50 text-xs">
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

          <div className="space-y-3">
            {/* The fade is the point: white at the top, thinning out at the
                baseline, so the name sits in the dark rather than on it. */}
            {/* White wordmark, blue fading out of the second half: the colour is
                there without the flat block of it. */}
            <h1 className="text-5xl font-black leading-none tracking-tighter text-white sm:text-6xl">
              42{" "}
              <span className="bg-gradient-to-b from-blue-200 via-blue-300 to-blue-600/40 bg-clip-text text-transparent">
                Insight
              </span>
            </h1>

            <p className="text-lg text-white/80">{t.tagline}</p>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <ul className="space-y-3 border-l border-white/10 pl-4">
            {highlights.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <p>{t.whySummary}</p>
            <button
              type="button"
              onClick={() => setShowWhyDetail((shown) => !shown)}
              className="flex items-center gap-1 text-white/60 transition-colors hover:text-white"
            >
              {t.moreDetail}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showWhyDetail ? "rotate-180" : ""}`}
              />
            </button>
            {showWhyDetail && (
              <div className="space-y-2 border-t border-white/10 pt-2">
                <p>{tKey.why}</p>
                <p>{tKey.whyAutonomy}</p>
                <p>{tKey.whyPrivacy}</p>
                <p>{tKey.whySelfHost}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <a
              href="https://github.com/fzphr/42insight"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Star className="h-3.5 w-3.5" />
              {t.star}
            </a>
            <a
              href="https://github.com/fzphr/42insight/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Bug className="h-3.5 w-3.5" />
              {t.issues}
            </a>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t.createdBy}{" "}
              <a
                href="https://github.com/fzphr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 transition-colors hover:text-white"
              >
                Zeph
              </a>{" "}
              &{" "}
              <a
                href="https://github.com/Haletran"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 transition-colors hover:text-white"
              >
                Haletran
              </a>
            </span>
          </div>
        </main>

        <form
          onSubmit={handleConnect}
          className="w-full space-y-3 rounded-2xl border border-white/10 bg-black/60 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] lg:max-w-md"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">{t.formTitle}</h2>
            <p className="text-xs text-muted-foreground">{t.formSubtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide((shown) => !shown)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-500/20"
          >
            <HelpCircle className="h-4 w-4" />
            {t.noKey}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showGuide ? "rotate-180" : ""}`}
            />
          </button>

          {showGuide && (
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3 pr-2">
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
              className="border-white/10 bg-black/40 text-white placeholder:text-white/30"
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
                className="border-white/10 bg-black/40 pr-9 text-white placeholder:text-white/30"
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
            className="h-11 w-full bg-white text-base font-medium text-black transition-colors hover:bg-white/90"
            disabled={connecting || !clientId.trim() || !clientSecret.trim()}
          >
            <span className="flex items-center justify-center gap-2">
              {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
              {connecting ? t.connecting : t.connect}
            </span>
          </Button>

          {/* A plain button rather than <Button variant="outline">: that
              variant's dark-mode border resolves to near-black on this
              background, which read as unstyled text rather than a button. */}
          {process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={() => {
                persistDevPreview(true);
                router.replace(
                  resolveCallbackUrl(
                    new URLSearchParams(window.location.search).get("callbackUrl"),
                  ),
                );
              }}
              className="h-10 w-full rounded-md border border-white/20 bg-white/5 text-sm text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              {t.browseWithoutKey}
            </button>
          )}

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
            </a>{" "}
            {t.alreadyAfter}
          </p>
        </form>
      </div>

      <button
        type="button"
        onClick={togglePaused}
        aria-pressed={paused}
        title={paused ? t.resumeTitle : t.pauseTitle}
        className="absolute bottom-4 right-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-black/70 hover:text-white"
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
