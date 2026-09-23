import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserApi, exchangeForToken } from "@/lib/forty-two/user-api";
import { primaryCampusName } from "@/lib/forty-two/campus-scope";
import { primaryCursusUser } from "@/lib/forty-two/cursus";
import { getApi } from "@/lib/forty-two/api";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * The two people who wrote this site. Neither is staff at 42, so there is no
 * flag to read: this is the only place that knows.
 */
const ADMIN_LOGINS = ["bapasqui", "hbelle"];

/**
 * Signs a visitor in on the same 42 application they use for data.
 *
 * There used to be a second, site-owned 42 app just for "Connect with
 * Intra" (authorization_code), separate from the one a visitor registers
 * for data (client_credentials). Everyone needed the second key anyway to
 * see anything, so the first one bought nothing but an extra step -- and
 * one more secret of mine to keep alive.
 *
 * client_credentials proves an application works, not who is behind it. 42
 * does supply that: GET /v2/apps?filter[uid]= on the app's own token
 * returns its owner, and a follow-up GET /v2/users/:login gives the profile
 * this site already ran on. Whoever holds a registered application's
 * secret is signed in as its owner -- for a solo project that is the
 * visitor; for a shared one (Matcha, ft_transcendence, a piscine pair) it
 * is whoever they are pairing with, same as it would be if that teammate
 * pasted the secret into any other tool. That is a property of sharing an
 * application's credentials, not something this page can see or stop.
 */
async function resolveProfile(clientId: string, clientSecret: string) {
  const token = await exchangeForToken({ clientId, clientSecret });
  if (!token) {
    console.error("[auth] 42 rejected this client ID/secret pair (token exchange failed)");
    return null;
  }

  const api = new UserApi(token, clientId);

  const appsResponse = await api.fetch(
    `/apps?filter[uid]=${encodeURIComponent(clientId)}`,
  );
  if (!appsResponse.ok) {
    console.error(`[auth] GET /apps?filter[uid] answered ${appsResponse.status}`);
    return null;
  }
  const apps = await appsResponse.json();
  const login = apps?.[0]?.owner?.login;
  if (!login) {
    // 42 only ever lists public applications here -- there is no filter or
    // scope that surfaces a private one, confirmed against the live API.
    // A private application has a real owner and a real login, but this is
    // the one lookup this site has to find out who -- so it is the one
    // requirement worth naming instead of folding into a generic rejection.
    console.error("[auth] client ID belongs to a private application -- 42 never lists those, public ones only");
    throw new Error("private-application");
  }

  const userResponse = await api.fetch(`/users/${encodeURIComponent(login)}`);
  if (!userResponse.ok) {
    console.error(`[auth] GET /users/${login} answered ${userResponse.status}`);
    return null;
  }
  const profile = await userResponse.json();

  // Which cursus and campus a person is in decided by array position, which
  // is a guess about the order 42 answers in rather than a lookup. Anyone with
  // a Discovery Piscine, an event cursus or a second campus in the wrong slot
  // was signed in as belonging somewhere they had left, or never were.
  const cursusUser = primaryCursusUser(profile);
  const cursusName = cursusUser?.cursus?.name ?? "no-cursus";

  // 42 spells it "staff?", with the question mark, so `profile.staff` was
  // always undefined and no one was ever staff: they were signed in as
  // students, which is why two logins had to be named here to get an admin in.
  const isStaff = profile["staff?"] === true;

  // The same typo made "pisciner" unreachable, and the pages a pisciner is
  // kept out of -- rankings, trombinoscope, query -- have therefore been open
  // to them for as long as this has been running. Fixing the flag without
  // saying so would shut those pages on them overnight, so the role stays
  // unassigned: piscine or not, a visitor is a student here.

  return {
    id: profile.id.toString(),
    name: `${profile.first_name} ${profile.last_name}`,
    email: profile.email,
    image: profile.image?.link,
    login: profile.login,
    campus: primaryCampusName(profile) ?? "no-campus",
    cursus: cursusName,
    correction_point: profile.correction_point ?? 0,
    wallet: profile.wallet ?? 0,
    level: cursusUser?.level,
    role: ADMIN_LOGINS.includes(profile.login)
      ? "admin"
      : isStaff
        ? "staff"
        : "student",
  };
}

/**
 * The claims that go stale: what a profile says today rather than on the day
 * someone signed in.
 *
 * A session lasts a month and its contents were written once, at sign-in, so
 * the level in the sidebar was frozen from that moment: validate three
 * projects and it still showed the old number until the cookie expired.
 *
 * The 42 request is behind the cache rather than behind a timestamp in the
 * token, and that is the whole trick. The jwt callback below runs on every
 * session read, but next-auth only writes the cookie back on its own session
 * endpoint -- so a timestamp set during getServerSession in some API route is
 * thrown away, and the "have I refreshed today?" question would answer no
 * forever. The cache answers it instead, per server instance: one request a
 * day per login, however many times the callback runs.
 */
const CLAIMS_TTL = 60 * 60 * 24;

interface ProfileClaims {
  campus: string;
  cursus: string;
  level: number | undefined;
  correction_point: number;
  wallet: number;
  role: string;
}

async function freshClaims(login: string): Promise<ProfileClaims | null> {
  // On the visitor's own key, like every other request for data. Without one
  // there is nothing to read, and the session keeps what it has.
  const api = await getApi();
  if (!api) return null;

  return cachedOnce(`session-claims:v1:${login}`, CLAIMS_TTL, async () => {
    const response = await api.fetch(`/users/${encodeURIComponent(login)}`);
    if (!response.ok) {
      throw new Error(`42 API responded ${response.status}`);
    }

    const profile = await response.json();
    const cursusUser = primaryCursusUser(profile);

    return {
      campus: primaryCampusName(profile) ?? "no-campus",
      cursus: cursusUser?.cursus?.name ?? "no-cursus",
      level: cursusUser?.level,
      correction_point: profile.correction_point ?? 0,
      wallet: profile.wallet ?? 0,
      role: ADMIN_LOGINS.includes(profile.login)
        ? "admin"
        : profile["staff?"] === true
          ? "staff"
          : "student",
    };
  });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "42 API key",
      credentials: {
        clientId: { label: "Client ID", type: "text" },
        clientSecret: { label: "Client Secret", type: "password" },
      },
      async authorize(credentials) {
        const clientId = credentials?.clientId?.trim();
        const clientSecret = credentials?.clientSecret?.trim();
        if (!clientId || !clientSecret) return null;

        try {
          return await resolveProfile(clientId, clientSecret);
        } catch (error: any) {
          // Let known, actionable failures (like "private-application")
          // reach the client with their own message; fold anything else
          // into the generic rejection so nothing more specific leaks.
          if (error.message === "private-application") throw error;
          console.error("[auth] credentials sign-in failed:", error.message);
          return null;
        }
      },
    }),
  ],

  secret: process.env.JWT_SECRET,
  session: {
    strategy: "jwt",
    // Matches CREDENTIALS_MAX_AGE (lib/forty-two/user-api.ts): the session
    // and the 42 key it was built from expire on the same schedule now that
    // they are the same secret.
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  pages: {
    signIn: "/",
    signOut: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.login = (user as any).login;
        token.campus = (user as any).campus;
        token.cursus = (user as any).cursus;
        token.correction_point = (user as any).correction_point;
        token.wallet = (user as any).wallet;
        token.level = (user as any).level;
        token.role = (user as any).role;
        return token;
      }

      // Every later read: whatever has moved since, once a day. A token from
      // before logins were stored has nothing to look up.
      if (!token.login) return token;

      try {
        const claims = await freshClaims(token.login as string);
        if (claims) Object.assign(token, claims);
      } catch (error: any) {
        // A 42 blip, an expired key, a rate limit. The session is still good
        // and its numbers are still roughly right -- signing someone out over
        // a stale level would be the larger failure.
        console.error(`[auth] could not refresh ${token.login}:`, error.message);
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.login = token.login as string;
      session.user.campus = token.campus as string;
      session.user.cursus = token.cursus as string;
      session.user.correction_point = token.correction_point as number;
      session.user.wallet = token.wallet as number;
      session.user.level = token.level as number;
      session.user.role = token.role as string;
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.includes('/signout') || url === baseUrl) {
        return baseUrl;
      }

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      try {
        const urlObj = new URL(url);
        const callbackUrl = urlObj.searchParams.get('callbackUrl');
        if (callbackUrl) {
          if (callbackUrl.startsWith('/')) {
            return `${baseUrl}${callbackUrl}`;
          }
          if (new URL(callbackUrl).origin === baseUrl) {
            return callbackUrl;
          }
        }
      } catch (e) {}

      return `${baseUrl}/dashboard`;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
