import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { getServerSession } from "next-auth";
import { cached } from "@/lib/memory-cache";

/** A student's coalition: two 42 requests, on the site keys. */

const CACHE_TTL = 1800;

const COALITIONS_BY_CAMPUS: { [campus: string]: string[] } = {
  Nice: ["Corrino", "Atreides", "Harkonnen"],
  Angouleme: ["Analyst", "Architect", "Seeker"],
};

const DEFAULT_COALITIONS = ["Alliance", "Assembly", "Federation", "Order"];

export async function GET(
  _request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const { login } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { api } = await getApi();

  const campus = session.user?.campus || "";

  try {
    // Keyed by campus as well: which of a student's coalitions is the relevant
    // one depends on who is looking.
    const result = await cached(
      `coalitions:v1:${campus}:${login}`,
      CACHE_TTL,
      async () => {
        const userResponse = await api.fetch(`/users/${login}`);
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
        const names = COALITIONS_BY_CAMPUS[campus] ?? DEFAULT_COALITIONS;

        const selected =
          coalitions.find((coalition: any) => names.includes(coalition.name)) ??
          coalitions[coalitions.length - 1];

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
