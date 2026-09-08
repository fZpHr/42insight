import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserApi, keyRequiredResponse } from "@/lib/forty-two/user-api";
import { getCampusStudents } from "@/lib/forty-two/live-campus";
import { getCorrectionRatio } from "@/lib/forty-two/corrections";

/**
 * One chunk of a campus's correction ratios, on the visitor's own key.
 *
 * The browser calls this back with the offset it returns, because a campus is
 * two requests per student and minutes of walking, far past any serverless
 * timeout. That also makes an interrupted build resumable and gives it a real
 * progress bar.
 *
 * Chunks are smaller than the logtime builder's for the same wall-clock feel:
 * each student here costs two requests rather than one.
 */

const DEFAULT_CHUNK = 20;
const MAX_CHUNK = 30;

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campus_name: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campus_name } = await params;

  let offset: number;
  let limit: number;

  try {
    const body = await request.json();
    offset = Math.max(0, Number(body.offset) || 0);
    limit = Math.min(MAX_CHUNK, Number(body.limit) || DEFAULT_CHUNK);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const api = await getUserApi();
    if (!api) return keyRequiredResponse();

    const students = await getCampusStudents(campus_name, api);
    const chunk = students.slice(offset, offset + limit);

    const entries: Record<string, unknown> = {};
    let failed = 0;

    for (const student of chunk) {
      try {
        entries[String(student.id)] = await getCorrectionRatio(student.id, api);
      } catch (error: any) {
        // A key that has run out mid-build should say so rather than be
        // counted as several hundred students with no corrections.
        if (String(error.message).includes("429")) {
          return NextResponse.json(
            {
              error:
                "Your hourly 42 budget ran out. The work so far is kept: come back and continue when it refills.",
            },
            { status: 429 },
          );
        }
        failed++;
      }
    }

    const processed = offset + chunk.length;
    const done = processed >= students.length;

    return NextResponse.json({
      entries,
      processed,
      total: students.length,
      failed,
      nextOffset: done ? null : processed,
      done,
    });
  } catch (error: any) {
    console.error(`[corrections] chunk failed for ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to read corrections from the 42 API" },
      { status: 502 },
    );
  }
}
