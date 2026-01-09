import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import FortyTwoProvider from "next-auth/providers/42-school";

export const authOptions: NextAuthOptions = {
  providers: [
    FortyTwoProvider({
      clientId: process.env.CLIENT_ID1!,
      clientSecret: process.env.CLIENT_SECRET1!,
      httpOptions: {
        timeout: 10000,
      },
      profile(profile) {
        const cursusName = profile.cursus_users?.[1]?.cursus?.name ?? profile.cursus_users?.[0]?.cursus?.name ?? "no-cursus";
        const isPisciner = cursusName === "C Piscine" && profile.staff === false;

        return {
          id: profile.id.toString(),
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          image: profile.image?.link,
          login: profile.login,
          campus: profile.campus?.[1]?.name ?? profile.campus?.[0]?.name ?? "no-campus",
          cursus: cursusName,
          correction_point: profile.correction_point ?? 0,
          wallet: profile.wallet ?? 0,
          level: profile.cursus_users?.[1]?.level ?? profile.cursus_users?.[0]?.level,
          role: profile.login === "bapasqui" || profile.login === "hbelle" ? "admin" : profile.staff ? "staff" : isPisciner ? "pisciner" : "student",
        };
      },
    }),
  ],

  secret: process.env.JWT_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, 
    updateAge: 0,
  },
  pages: {
    signIn: "/",
    signOut: "/",
  },
  callbacks: {
    async jwt({ token, user, account }) {

      if (account && user) {
        token.id = user.id;
        token.login = (user as any).login;
        token.campus = (user as any).campus;
        token.cursus = (user as any).cursus;
        token.correction_point = (user as any).correction_point;
        token.wallet = (user as any).wallet;
        token.level = (user as any).level;
        token.role = (user as any).role;
        token.accessToken = account.access_token;
        token.accessTokenExpires = (account.expires_at as number) * 1000;
        token.refreshToken = account.refresh_token;
        return token;
      }


      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }


      console.log("Access token expired, trying to refresh...");
      try {
        const response = await fetch("https://api.intra.42.fr/oauth/token", {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID1!,
                client_secret: process.env.CLIENT_SECRET1!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
            }),
            method: "POST",
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }


        token.accessToken = refreshedTokens.access_token;
        token.accessTokenExpires = Date.now() + refreshedTokens.expires_in * 1000;
        token.refreshToken = refreshedTokens.refresh_token ?? token.refreshToken; 

        return token;
      } catch (error) {
        console.error("Error refreshing access token", error);

        token.error = "RefreshAccessTokenError";
        return token;
      }
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
