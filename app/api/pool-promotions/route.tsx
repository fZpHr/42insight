import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  campusForRequest,
  campusRequiredResponse,
} from "@/lib/forty-two/campus-scope";
import { listPoolPromotions } from "@/lib/forty-two/live-campus";

/**
 * Which piscines a campus ran in a year, so the page can offer them rather
 * than assume them. See listPoolPromotions for why this cannot be guessed.
 */

// Twelve paced requests on a cold cache, so past the default timeout.
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  const campus = campusForRequest(request, session);
  if (!campus) return campusRequiredResponse();

  const year =
    new URL(request.url).searchParams.get("year") ??
    String(new Date().getFullYear());

  if (!/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: "year must be four digits" }, { status: 400 });
  }

  try {
    return NextResponse.json(await listPoolPromotions(campus, year, api));
  } catch (error: any) {
    console.error(`[pool-promotions] failed for ${campus} ${year}:`, error.message);
    return NextResponse.json(
      { error: "Failed to read the campus's piscines" },
      { status: 502 },
    );
  }
}
