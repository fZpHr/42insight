import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  campusForRequest,
  campusRequiredResponse,
} from "@/lib/forty-two/campus-scope";
import {
  YEARS_BACK,
  getPoolUsers,
  getPoolUsersAcross,
  listPoolPromotions,
  resolvePoolPromotion,
} from "@/lib/forty-two/live-campus";

// Walks every campus's pool roster in turn on a cold cache -- past Vercel's
// default function timeout.
export const maxDuration = 60;

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);
    const askedMonth = searchParams.get("month");
    const askedYear = searchParams.get("year");

    // "all" gathers promotions rather than naming one: every piscine of a
    // year, or of the last few years, on one scale.
    if (askedMonth === "all" || askedYear === "all") {
      const thisYear = new Date().getFullYear();
      const years =
        askedYear === "all" || !askedYear
          ? Array.from({ length: YEARS_BACK }, (_, i) => String(thisYear - i))
          : [askedYear];

      const promotions = (
        await Promise.all(
          years.map((year) => listPoolPromotions(campus, year, api)),
        )
      ).flat();

      return NextResponse.json(
        await getPoolUsersAcross(campus, promotions, api),
      );
    }

    const promotion = await resolvePoolPromotion(campus, api, {
      month: askedMonth,
      year: askedYear,
    });

    // A campus with no piscine on record for the year has an empty ranking,
    // which is an answer rather than a failure.
    if (!promotion) return NextResponse.json([]);

    return NextResponse.json(
      await getPoolUsers(
        campus,
        promotion.month,
        promotion.year,
        api,
        promotion.cursusId ?? undefined,
      ),
    );
  } catch (error: any) {

    console.error("[pool] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch pool users" },
      { status: 502 },
    );
  }
}
