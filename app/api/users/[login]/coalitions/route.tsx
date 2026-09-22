import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { getServerSession } from "next-auth";
import { cached } from "@/lib/memory-cache";
import { campusCoalitionIds } from "@/lib/forty-two/coalitions";

/** A student's coalition: two 42 requests, on the visitor's key. */

const CACHE_TTL = 1800;


export async function GET(
  _request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const { login } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  const campus = session.user?.campus || "";

  try {
    // Keyed by campus as well: which of a student's coalitions is the relevant
    // one depends on who is looking.
    const result = await cached(
      `coalitions:v2:${campus}:${login}`,
      CACHE_TTL,
      async () => {
        const userResponse = await api.fetch(`/users/${encodeURIComponent(login)}`);
        if (!userResponse.ok) {
          throw new Error(`42 API responded ${userResponse.status}`);
        }

        const user = await userResponse.json();

        const coalitionResponse = await api.fetch(
          `/users/${user.id}/coalitions`,
        );
        if (!coalitionResponse.ok) {
          throw new Error(`42 API responded ${coalitionResponse.status}`);
        }

        const coalitions = await coalitionResponse.json();

        // Which of a student's coalitions to show is the one from the campus
        // being looked at. A student of two campuses has one of each, and a
        // pisciner carries a piscine coalition on top.
        let campusCoalitions = new Set<number>();
        try {
          campusCoalitions = await campusCoalitionIds(campus, api);
        } catch (error: any) {
          // Falling through to the last coalition is what this did before the
          // campus was asked about at all.
          console.error(`[coalitions] campus ${campus}:`, error.message);
        }

        const selected =
          coalitions.find((coalition: any) =>
            campusCoalitions.has(coalition.id),
          ) ?? coalitions[coalitions.length - 1];

        return selected ? [selected] : [];
      },
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[coalitions] failed for ${login}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch coalition from the 42 API" },
      { status: 502 },
    );
  }
}
