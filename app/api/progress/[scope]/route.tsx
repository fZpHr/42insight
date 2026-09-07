import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getProgress } from "@/lib/forty-two/progress";

/** Where a long fetch has got to, for the loading screen to read back. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scope: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scope } = await params;
  const progress = await getProgress(decodeURIComponent(scope));

  return NextResponse.json(progress ?? null);
}
