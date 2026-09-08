import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  campusForRequest,
  campusRequiredResponse,
} from "@/lib/forty-two/campus-scope";
import {
  resolvePoolPromotion,
  getPoolUsers,
} from "@/lib/forty-two/live-campus";

// A miss on the first campus tried costs a second full pool walk, past
// Vercel's default function timeout on a cold cache.
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ login: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  // Walked the static two-campus seed. With the live directory that would
  // be 54 rosters in one request, so it answers for one campus: the one
  // asked for, or the caller's own.
  const campus = campusForRequest(request, session);
  if (!campus) return campusRequiredResponse();

  try {
    const { login } = await params;
    const promotion = await resolvePoolPromotion(campus, api);
    const poolUsers = promotion
      ? await getPoolUsers(
          campus,
          promotion.month,
          promotion.year,
          api,
          promotion.cursusId ?? undefined,
        )
      : [];
    const poolUser = poolUsers.find((candidate) => candidate.name === login);

    return poolUser
      ? NextResponse.json(poolUser)
      : NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {

    console.error("[pool] failed to fetch user:", error.message);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 502 });
  }
}
