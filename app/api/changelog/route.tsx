import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cached } from "@/lib/memory-cache";

/**
 * Recent commits, read straight from the repository's own public history.
 *
 * This used to read a Redis key that the refresh-42 runner filled. Nothing
 * fills it any more, so the panel had gone permanently blank. GitHub's public
 * API needs no token and no setup, and the answer is the same for everyone, so
 * one memory-cached call serves the whole site.
 */

const CACHE_TTL = 900;
const REPO = process.env.GITHUB_REPO ?? "fZpHr/42insight";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const commits = await cached(`changelog:${REPO}`, CACHE_TTL, async () => {
      const response = await fetch(
        `https://api.github.com/repos/${REPO}/commits?per_page=10`,
        { headers: { Accept: "application/vnd.github+json" } },
      );

      if (!response.ok) {
        throw new Error(`GitHub responded ${response.status}`);
      }

      const data = await response.json();
      const recent = Date.now() - 3 * 86_400_000;

      return (Array.isArray(data) ? data : []).map((commit: any) => {
        const date = commit.commit?.author?.date ?? null;

        return {
          message: commit.commit?.message ?? "",
          author:
            commit.commit?.author?.name ?? commit.author?.login ?? "unknown",
          avatar: commit.author?.avatar_url ?? "",
          date,
          new: date ? new Date(date).getTime() > recent : false,
          url: commit.html_url ?? null,
        };
      });
    });

    return NextResponse.json(commits);
  } catch (error: any) {
    console.error("[changelog] failed:", error.message);
    // The panel is decoration; an empty list renders, an error does not.
    return NextResponse.json([]);
  }
}
