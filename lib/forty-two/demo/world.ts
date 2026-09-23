/**
 * A 42 network that does not exist.
 *
 * Demo mode lets someone walk the whole site before they have registered a 42
 * application, so every page has to be able to answer without a key. What it
 * answers with is this: a network generated from a fixed seed, campus by
 * campus, the same on every visit and on every instance.
 *
 * Nothing real is in here. The campus names, cities and coordinates are public
 * (they are the same list the sign-in map draws from) and so is the project
 * catalogue, but every person is invented -- login, name, level, locations,
 * marks, all of it. No real student's data is copied into this repository, and
 * the logins are built from a syllable set that does not aim to look like
 * anybody's: a demo that borrowed real people's names and levels would be
 * publishing their data, which is the one thing this site promises not to do.
 *
 * Generated on demand and held in module memory, so an instance builds each
 * campus once and nothing is written anywhere.
 */
import campusCoords from "@/lib/forty-two/data/campus-coords.json";
import projectCatalogue from "@/lib/forty-two/data/projects_21.json";

/** 42cursus, the cursus the site reports on. */
const CURSUS_ID = 21;

/**
 * How many students a demo campus has.
 *
 * Paris really has forty thousand accounts. Generating that many to show a
 * leaderboard nobody will scroll past the first page of would cost seconds and
 * a lot of memory for nothing, so the real counts are compressed into this
 * range -- the order between campuses survives, the magnitude does not.
 */
const SMALLEST_ROSTER = 40;
const LARGEST_ROSTER = 240;

/** Deterministic, so the demo network is the same thing twice. */
const seeded = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296;
  };
};

const hashOf = (text: string): number => {
  let sum = 2166136261;
  for (let i = 0; i < text.length; i++) {
    sum ^= text.charCodeAt(i);
    sum = Math.imul(sum, 16777619);
  }
  return sum >>> 0;
};

const pick = <T>(roll: () => number, list: readonly T[]): T =>
  list[Math.floor(roll() * list.length) % list.length];

const between = (roll: () => number, low: number, high: number): number =>
  low + roll() * (high - low);

/* ------------------------------------------------------------------ people */

/**
 * Invented syllables rather than name lists.
 *
 * A generator fed with real first and last names would sooner or later produce
 * a real 42 login, and a demo page showing a level and a campus beside it
 * would be a made-up record about a findable person. These read as names and
 * belong to nobody.
 */
const HEADS = [
  "tal", "ver", "mos", "kel", "dra", "sil", "nor", "bea", "cor", "ely",
  "fen", "gal", "hax", "ini", "jor", "kyr", "lum", "mib", "nev", "oza",
  "pru", "qen", "rho", "sev", "tir", "ulv", "vey", "wex", "xan", "yol",
];
const TAILS = [
  "ka", "ric", "mo", "san", "det", "vin", "lek", "tor", "mia", "ral",
  "quo", "bes", "nim", "dal", "vex", "sor", "pil", "gan", "mur", "tek",
];

const inventedName = (seed: number): { login: string; display: string } => {
  const roll = seeded(seed);
  const head = pick(roll, HEADS);
  const tail = pick(roll, TAILS);
  const initial = pick(roll, HEADS).slice(0, 1);

  // 42 logins are eight characters at most, and look it.
  const login = `${initial}${head}${tail}`.slice(0, 8);
  const display = `${head[0].toUpperCase()}${head.slice(1)} ${tail[0].toUpperCase()}${tail.slice(1)}`;

  return { login, display };
};

/**
 * A face, drawn rather than borrowed: initials on a flat colour, inline.
 *
 * The alternative was linking 42's own image CDN, which would put real
 * students' photographs on a page of invented people.
 */
const inventedFace = (login: string, seed: number): string => {
  const hue = Math.floor(seeded(seed)() * 360);
  const initials = login.slice(0, 2).toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">` +
    `<rect width="128" height="128" fill="hsl(${hue} 42% 32%)"/>` +
    `<text x="64" y="64" fill="hsl(${hue} 60% 88%)" font-family="sans-serif"` +
    ` font-size="52" text-anchor="middle" dominant-baseline="central">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/* ---------------------------------------------------------------- campuses */

export interface DemoCampus {
  id: number;
  name: string;
  city: string;
  country: string;
  users: number;
  roster: number;
}

const realCampuses = (campusCoords as any).campuses as Array<{
  name: string;
  city: string;
  country: string;
  users: number;
}>;

const biggestReal = Math.max(...realCampuses.map((campus) => campus.users));
const smallestReal = Math.min(...realCampuses.map((campus) => campus.users));

export const DEMO_CAMPUSES: DemoCampus[] = realCampuses.map((campus, index) => {
  // Compressed on a square root, for the same reason the sign-in map sizes its
  // dots that way: on the raw counts Paris swamps everything.
  const along =
    (Math.sqrt(campus.users) - Math.sqrt(smallestReal)) /
    (Math.sqrt(biggestReal) - Math.sqrt(smallestReal));

  return {
    id: index + 1,
    name: campus.name,
    city: campus.city,
    country: campus.country,
    users: campus.users,
    roster: Math.round(SMALLEST_ROSTER + along * (LARGEST_ROSTER - SMALLEST_ROSTER)),
  };
});

export const demoCampusByName = (name: string): DemoCampus | undefined =>
  DEMO_CAMPUSES.find(
    (campus) => campus.name.toLowerCase() === (name ?? "").toLowerCase(),
  );

export const demoCampusById = (id: number): DemoCampus | undefined =>
  DEMO_CAMPUSES.find((campus) => campus.id === id);

/* ---------------------------------------------------------------- students */

const CATALOGUE = (projectCatalogue as any).projects as Array<{
  id: number;
  name: string;
  slug: string;
  difficulty: number;
  parent: unknown;
}>;

/** The core path, in the order a student walks it. */
const CORE_PATH = [
  "Libft", "ft_printf", "get_next_line", "Born2beroot", "minitalk", "so_long",
  "pipex", "push_swap", "FdF", "fract-ol", "philosophers", "minishell",
  "NetPractice", "cub3d", "miniRT", "CPP Module 00", "CPP Module 01",
  "CPP Module 02", "CPP Module 03", "CPP Module 04", "Inception", "webserv",
  "ft_irc", "ft_transcendence",
]
  .map((name) => CATALOGUE.find((project) => project.name === name))
  .filter((project): project is (typeof CATALOGUE)[number] => Boolean(project));

const HOSTS = ["e1r1p", "e1r2p", "e2r3p", "e2r5p", "e3r1p", "c1r4p", "c2r2p"];

export interface DemoStudent {
  id: number;
  login: string;
  display: string;
  image: string;
  campusId: number;
  level: number;
  grade: string;
  poolYear: string;
  poolMonth: string;
  wallet: number;
  correctionPoint: number;
  location: string | null;
  blackholedAt: string | null;
  beginAt: string;
  done: number;
}

const MONTHS = ["january", "february", "march", "july", "august", "september"];
const GRADES = ["Learner", "Member", "Transcender"];

const buildStudent = (campus: DemoCampus, index: number): DemoStudent => {
  const seed = hashOf(`${campus.name}:${index}`);
  const roll = seeded(seed);
  const { login, display } = inventedName(seed);

  // Levels spread the way a campus does: a long tail of beginners, a handful
  // who have finished the common core.
  const level = Math.round(Math.pow(roll(), 1.9) * 21 * 100) / 100;
  const done = Math.min(CORE_PATH.length, Math.floor((level / 21) * CORE_PATH.length));
  const inCluster = roll() < 0.22;

  return {
    // Unique across campuses without a global counter, and stable.
    id: 100000 + (hashOf(`${campus.id}:${login}:${index}`) % 800000),
    login: `${login}${index % 7 === 0 ? String(index % 10) : ""}`.slice(0, 8),
    display,
    image: inventedFace(login, seed),
    campusId: campus.id,
    level,
    grade: level >= 21 ? "Transcender" : level >= 2 ? "Member" : "Learner",
    poolYear: String(2021 + Math.floor(roll() * 5)),
    poolMonth: pick(roll, MONTHS),
    wallet: Math.floor(between(roll, 0, 900)),
    correctionPoint: Math.floor(between(roll, 0, 24)),
    location: inCluster
      ? `${pick(roll, HOSTS)}${1 + Math.floor(roll() * 24)}`
      : null,
    blackholedAt:
      level >= 21 || roll() < 0.25
        ? null
        : new Date(Date.now() + between(roll, -10, 120) * 86400000).toISOString(),
    beginAt: new Date(
      Date.UTC(2021 + Math.floor(roll() * 4), Math.floor(roll() * 12), 1),
    ).toISOString(),
    done,
  };
};

const rosters = new Map<number, DemoStudent[]>();

export const demoRoster = (campus: DemoCampus): DemoStudent[] => {
  const held = rosters.get(campus.id);
  if (held) return held;

  const built = Array.from({ length: campus.roster }, (_, index) =>
    buildStudent(campus, index),
  );
  rosters.set(campus.id, built);
  return built;
};

/** Every campus's roster at once, for the network-wide pages. */
export const demoEveryone = (): DemoStudent[] =>
  DEMO_CAMPUSES.flatMap((campus) => demoRoster(campus));

const byLogin = new Map<string, DemoStudent>();
const byId = new Map<number, DemoStudent>();

const index = () => {
  if (byLogin.size > 0) return;
  for (const student of demoEveryone()) {
    byLogin.set(student.login.toLowerCase(), student);
    byId.set(student.id, student);
  }
};

export const demoStudentByLogin = (login: string): DemoStudent | undefined => {
  index();
  return byLogin.get((login ?? "").toLowerCase());
};

export const demoStudentById = (id: number): DemoStudent | undefined => {
  index();
  return byId.get(id);
};

/**
 * Who demo mode signs in as.
 *
 * One of the generated students rather than an account of its own, so that
 * every page that looks the signed-in visitor up -- the dashboard, the RNCP
 * simulator, the peer finder -- finds a real row in this world. The most
 * advanced student in the busiest campus, because a dashboard belonging to
 * someone on level 0.8 has nothing on it to look at.
 */
export const demoViewer = (): DemoStudent => {
  const paris = demoCampusByName("Paris") ?? DEMO_CAMPUSES[0];
  return demoRoster(paris).reduce((best, student) =>
    student.level > best.level ? student : best,
  );
};

/* --------------------------------------------------------- 42 API payloads */

export const demoUserPayload = (student: DemoStudent): any => {
  const campus = demoCampusById(student.campusId)!;
  const roll = seeded(hashOf(`payload:${student.login}`));

  return {
    id: student.id,
    login: student.login,
    email: `${student.login}@student.42.fr`,
    first_name: student.display.split(" ")[0],
    last_name: student.display.split(" ")[1] ?? "",
    usual_full_name: student.display,
    usual_first_name: null,
    url: `https://api.intra.42.fr/v2/users/${student.login}`,
    phone: "hidden",
    displayname: student.display,
    kind: "student",
    image: {
      link: student.image,
      versions: {
        large: student.image,
        medium: student.image,
        small: student.image,
        micro: student.image,
      },
    },
    "staff?": false,
    correction_point: student.correctionPoint,
    pool_month: student.poolMonth,
    pool_year: student.poolYear,
    location: student.location,
    wallet: student.wallet,
    anonymize_date: null,
    data_erasure_date: null,
    created_at: student.beginAt,
    updated_at: new Date().toISOString(),
    alumnized_at: null,
    "alumni?": false,
    "active?": true,
    groups: [],
    titles: [],
    titles_users: [],
    partnerships: [],
    patroned: [],
    patroning: [],
    expertises_users: [],
    roles: [],
    languages_users: [],
    achievements: [],
    cursus_users: [demoCursusUserPayload(student, { withUser: false })],
    projects_users: demoProjectsUsers(student, roll),
    campus: [
      {
        id: campus.id,
        name: campus.name,
        time_zone: "Europe/Paris",
        language: {
          id: 1,
          name: "French",
          identifier: "fr",
          created_at: student.beginAt,
          updated_at: student.beginAt,
        },
        users_count: campus.users,
        vogsphere_id: campus.id,
        country: campus.country,
        address: "",
        zip: "",
        city: campus.city,
        website: "",
        facebook: "",
        twitter: "",
        active: true,
        public: true,
        email_extension: "42.fr",
        default_hidden_phone: false,
      },
    ],
    campus_users: [
      {
        id: student.id,
        user_id: student.id,
        campus_id: campus.id,
        is_primary: true,
        created_at: student.beginAt,
        updated_at: student.beginAt,
      },
    ],
  };
};

export const demoCursusUserPayload = (
  student: DemoStudent,
  { withUser = true }: { withUser?: boolean } = {},
): any => ({
  id: student.id,
  begin_at: student.beginAt,
  end_at: null,
  grade: student.grade,
  level: student.level,
  skills: [],
  cursus_id: CURSUS_ID,
  has_coalition: true,
  blackholed_at: student.blackholedAt,
  created_at: student.beginAt,
  updated_at: new Date().toISOString(),
  cursus: { id: CURSUS_ID, created_at: student.beginAt, name: "42cursus", slug: "42cursus", kind: "main" },
  user: withUser ? demoUserSummary(student) : undefined,
});

export const demoUserSummary = (student: DemoStudent): any => ({
  id: student.id,
  email: `${student.login}@student.42.fr`,
  login: student.login,
  first_name: student.display.split(" ")[0],
  last_name: student.display.split(" ")[1] ?? "",
  usual_full_name: student.display,
  usual_first_name: null,
  url: `https://api.intra.42.fr/v2/users/${student.login}`,
  phone: "hidden",
  displayname: student.display,
  kind: "student",
  image: {
    link: student.image,
    versions: {
      large: student.image,
      medium: student.image,
      small: student.image,
      micro: student.image,
    },
  },
  "staff?": false,
  correction_point: student.correctionPoint,
  pool_month: student.poolMonth,
  pool_year: student.poolYear,
  location: student.location,
  wallet: student.wallet,
  anonymize_date: null,
  data_erasure_date: null,
  created_at: student.beginAt,
  updated_at: new Date().toISOString(),
  alumnized_at: null,
  "alumni?": false,
  "active?": true,
});

const demoProjectsUsers = (student: DemoStudent, roll: () => number): any[] =>
  CORE_PATH.slice(0, student.done + 1).map((project, position) => {
    const finished = position < student.done;
    const mark = finished ? Math.floor(between(roll, 80, 125)) : 0;

    return {
      id: student.id * 100 + position,
      occurrence: 0,
      final_mark: finished ? mark : null,
      status: finished ? "finished" : "in_progress",
      "validated?": finished ? true : null,
      current_team_id: student.id * 100 + position,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        parent_id: null,
      },
      cursus_ids: [CURSUS_ID],
      marked_at: finished ? new Date(Date.now() - position * 86400000 * 9).toISOString() : null,
      marked: finished,
      retriable_at: null,
      created_at: student.beginAt,
      updated_at: new Date().toISOString(),
    };
  });

/** Who is sitting at a machine right now, for the cluster map. */
export const demoLocations = (campus: DemoCampus): any[] =>
  demoRoster(campus)
    .filter((student) => student.location)
    .map((student) => ({
      id: student.id,
      begin_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      end_at: null,
      primary: true,
      host: student.location,
      campus_id: campus.id,
      user: demoUserSummary(student),
    }));

export const demoCampusPayload = (campus: DemoCampus): any => ({
  id: campus.id,
  name: campus.name,
  time_zone: "Europe/Paris",
  language: { id: 1, name: "French", identifier: "fr" },
  users_count: campus.users,
  vogsphere_id: campus.id,
  country: campus.country,
  address: "",
  zip: "",
  city: campus.city,
  website: "",
  facebook: "",
  twitter: "",
  active: true,
  public: true,
  email_extension: "42.fr",
  default_hidden_phone: false,
});

/* ------------------------------------------------------- exams and events */

/**
 * The exams sitting today, and who is sitting them.
 *
 * The exam tracker reads a campus's exams to learn which projects they are sat
 * on, then everybody's mark on those projects in the last day. Both halves
 * have to line up or the page shows an empty room, so they are generated from
 * one list here rather than separately.
 */
const EXAM_PROJECTS = [1320, 1321, 1322, 1323, 1324]
  .map((id) => CATALOGUE.find((project) => project.id === id))
  .filter((project): project is (typeof CATALOGUE)[number] => Boolean(project));

const examsToday = (campus: DemoCampus) => {
  const roll = seeded(hashOf(`exams:${campus.name}`));
  // Two of the five ranks, so a campus is not sitting every exam at once.
  const first = Math.floor(roll() * (EXAM_PROJECTS.length - 1));
  return EXAM_PROJECTS.slice(first, first + 2);
};

export const demoExams = (campus: DemoCampus): any[] => {
  const projects = examsToday(campus);
  if (projects.length === 0) return [];

  const begin = new Date();
  begin.setHours(9, 0, 0, 0);

  return [
    {
      id: campus.id * 10,
      name: "Exam stud 3h",
      begin_at: begin.toISOString(),
      end_at: new Date(begin.getTime() + 3 * 3600000).toISOString(),
      location: `${campus.city} cluster`,
      max_people: 60,
      nbr_subscribers: Math.round(campus.roster * 0.12),
      campus: [demoCampusPayload(campus)],
      cursus: [{ id: CURSUS_ID, name: "42cursus" }],
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
      })),
    },
  ];
};

/** Everyone's mark on those exams, as projects_users rows. */
export const demoExamResults = (campus: DemoCampus): any[] => {
  const projects = examsToday(campus);
  if (projects.length === 0) return [];

  const sitting = demoRoster(campus).filter((_, index) => index % 7 === 0);

  return sitting.map((student, index) => {
    const roll = seeded(hashOf(`exam:${student.login}`));
    const project = projects[index % projects.length];
    // Exams are marked out of 100 and most people do not clear the bar first
    // time, which is the shape the tracker is there to show.
    const mark = Math.floor(between(roll, 0, 105));

    return {
      id: student.id * 10 + index,
      occurrence: Math.floor(roll() * 3),
      final_mark: mark,
      status: "finished",
      "validated?": mark >= 50,
      project: { id: project.id, name: project.name, slug: project.slug, parent_id: null },
      cursus_ids: [CURSUS_ID],
      marked: true,
      marked_at: new Date(Date.now() - index * 60000).toISOString(),
      created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - index * 60000).toISOString(),
      user: demoUserSummary(student),
    };
  });
};

const EVENT_KINDS = ["conference", "meet_up", "workshop", "hackathon", "association"];
const EVENT_NAMES = [
  "Intro to systems programming",
  "Pizza and peer review",
  "Open source Saturday",
  "Alumni night: life after the common core",
  "Security workshop: breaking your own code",
  "Game jam weekend",
];

export const demoEvents = (campus: DemoCampus): any[] => {
  const roll = seeded(hashOf(`events:${campus.name}`));

  return EVENT_NAMES.slice(0, 4 + Math.floor(roll() * 2)).map((name, index) => {
    const begin = new Date(Date.now() + (index + 1) * 2 * 86400000);
    begin.setHours(18, 30, 0, 0);
    const max = 30 + Math.floor(roll() * 90);

    return {
      id: campus.id * 100 + index,
      name,
      description:
        "An invented event, in an invented campus, for a demo. Nobody is running this.",
      location: `${campus.city} — room ${1 + Math.floor(roll() * 6)}`,
      kind: pick(roll, EVENT_KINDS),
      max_people: max,
      nbr_subscribers: Math.floor(max * between(roll, 0.2, 0.95)),
      begin_at: begin.toISOString(),
      end_at: new Date(begin.getTime() + 2 * 3600000).toISOString(),
      campus_ids: [campus.id],
      cursus_ids: [CURSUS_ID],
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      prohibition_of_cancellation: null,
      waitlist: null,
      themes: [],
    };
  });
};

/**
 * What a campus is working on right now, as projects_users rows.
 *
 * Find Peers asks 42 for every in-progress registration on a campus and groups
 * them by project, which is how it knows who to put you in touch with. Each
 * demo student has walked the core path as far as their level allows, so the
 * one they are on is the next one along -- that single row per student is the
 * whole page.
 */
export const demoInProgress = (campus: DemoCampus): any[] =>
  demoRoster(campus)
    .map((student, index) => {
      const project = CORE_PATH[student.done];
      if (!project) return null;

      return {
        id: student.id * 1000 + student.done,
        occurrence: 0,
        final_mark: null,
        status: "in_progress",
        "validated?": null,
        current_team_id: student.id * 1000 + student.done,
        project: { id: project.id, name: project.name, slug: project.slug, parent_id: null },
        cursus_ids: [CURSUS_ID],
        marked: false,
        marked_at: null,
        retriable_at: null,
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
        // Recent, because the page only counts registrations touched inside
        // its own window and would otherwise drop every one of them.
        updated_at: new Date(Date.now() - (index % 6) * 86400000).toISOString(),
        user: demoUserSummary(student),
      };
    })
    .filter(Boolean);
