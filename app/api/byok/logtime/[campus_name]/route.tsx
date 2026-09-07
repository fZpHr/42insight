import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { computeLogtime } from "@/lib/forty-two/logtime";
import {
  CAMPUS_IDS,
  getCampusStudents,
  logtimeIndexKey,
  logtimeMetaKey,
  redis,
} from "@/lib/forty-two/live-campus";
import {
  getUserApi,
  keyRequiredResponse,
  MissingUserKeyError,
} from "@/lib/forty-two/user-api";

/**
 * Builds the campus logtime index with the visitor's own API key.
 *
 * This is tier 2, and the reason tier 2 exists: one request per student against
 * /locations_stats, so a campus costs as many requests as it has students --
 * more than the site keys have in an hour, for a single rebuild. It is paid for
 * by the key of whoever triggers the build, and the result lands in a shared
 * index that every visitor then reads for free.
 *
 * The work is chunked because a whole campus takes minutes at the 42 rate limit
 * of two requests per second, far past any serverless timeout. The browser calls
 * this repeatedly with the offset it gets back, which also gives it a progress
 * bar and makes an interrupted build resumable.
 */

const DEFAULT_CHUNK = 40;
const MAX_CHUNK = 60;
const INDEX_TTL = 86_400;

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

    const students = await getCampusStudents(campus_name);
    const chunk = students.slice(offset, offset + limit);

    const computed: Record<string, unknown> = {};
    let failed = 0;

    for (const student of chunk) {
      try {
        const response = await api.fetch(
          `/users/${student.id}/locations_stats`,
        );

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

        computed[String(student.id)] = computeLogtime(await response.json());
      } catch {
        failed++;
      }
    }

    if (Object.keys(computed).length > 0) {
      const key = logtimeIndexKey(campus_name);
      await redis.hset(key, computed);
      await redis.expire(key, INDEX_TTL);
    }

    const processed = offset + chunk.length;
    const done = processed >= students.length;

    if (done) {
      await redis.set(
        logtimeMetaKey(campus_name),
        {
          updatedAt: new Date().toISOString(),
          builtBy: session.user.name ?? "unknown",
          covered: await redis.hlen(logtimeIndexKey(campus_name)),
        },
        { ex: INDEX_TTL },
      );
    }

    return NextResponse.json({
      processed,
      total: students.length,
      failed,
      nextOffset: done ? null : processed,
      done,
    });
  } catch (error: any) {
    if (error instanceof MissingUserKeyError) return keyRequiredResponse();

    console.error(
      `[byok] logtime build failed for ${campus_name}:`,
      error.message,
    );
    return NextResponse.json(
      { error: "Failed to build the logtime index" },
      { status: 502 },
    );
  }
}
