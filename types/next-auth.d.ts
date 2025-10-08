import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    login?: string;
    campus?: string;
    cursus?: string;
    correction_point?: number;
    wallet?: number;
    level?: number;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      login?: string;
      campus?: string;
      cursus?: string;
      correction_point?: number;
      wallet?: number;
      level?: number;
      role?: string | null;
    };
    accessToken?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    login?: string;
    campus?: string;
    cursus?: string;
    correction_point?: number;
    wallet?: number;
    level?: number;
  }
}