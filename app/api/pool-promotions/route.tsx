import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  campusForRequest,
  campusRequiredResponse,
} from "@/lib/forty-two/campus-scope";
import {
  listPoolPromotions,
  resolvePoolPromotion,
} from "@/lib/forty-two/live-campus";

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

  const { searchParams } = new URL(request.url);

  // The page opens on a promotion it did not choose, so it asks which one
  // rather than working it out again -- and getting it wrong every January,
  // when the current year is empty and last December's piscine is running.
  if (searchParams.get("current") === "1") {
    try {
      return NextResponse.json(await resolvePoolPromotion(campus, api));
    } catch (error: any) {
      console.error(`[pool-promotions] current failed for ${campus}:`, error.message);
      return NextResponse.json({ error: "Failed" }, { status: 502 });
    }
  }

  const year = searchParams.get("year") ?? String(new Date().getFullYear());

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
