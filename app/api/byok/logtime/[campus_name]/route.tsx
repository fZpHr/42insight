import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { computeLogtime } from "@/lib/forty-two/logtime";
import { CAMPUS_IDS, getCampusStudents } from "@/lib/forty-two/live-campus";
import {
  getUserApi,
  keyRequiredResponse,
  MissingUserKeyError,
} from "@/lib/forty-two/user-api";

/**
 * Computes logtime for a slice of the campus, with the visitor's own 42 key.
 *
 * Logtime costs one request per student. The site's keys are metered at 1200
 * requests an hour, and a campus has more students than that, so no page load
 * can produce it and the server has nowhere to keep it if it did -- the whole
 * site runs on the 42 credentials, with the cache in memory and nothing behind
 * it.
 *
 * So it is done the only way that needs no storage at all: a student who wants
 * the logtime sorts registers their own application on the intra, this route
 * spends *their* quota, and the answer goes back to their browser to be kept
 * there. Nothing is written here.
 *
 * The browser calls this repeatedly with the offset it gets back, because a
 * whole campus takes minutes at two requests a second, far past any serverless
 * timeout. That also makes an interrupted build resumable and gives it a real
 * progress bar.
 */

const DEFAULT_CHUNK = 40;
const MAX_CHUNK = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campus_name: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campus_name } = await params;
  if (!CAMPUS_IDS[campus_name]) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

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
        const response = await api.fetch(`/users/${student.id}/locations_stats`);

        if (response.status === 401) {
          return NextResponse.json(
            { error: "The 42 API rejected this key" },
            { status: 401 },
          );
        }

        if (!response.ok) {
          failed++;
          continue;
        }

        entries[String(student.id)] = computeLogtime(await response.json());
      } catch {
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
    if (error instanceof MissingUserKeyError) return keyRequiredResponse();

    console.error(
      `[byok] logtime chunk failed for ${campus_name}:`,
      error.message,
    );
    return NextResponse.json(
      { error: "Failed to compute logtime" },
      { status: 502 },
    );
  }
}
