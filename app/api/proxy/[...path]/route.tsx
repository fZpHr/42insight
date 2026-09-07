import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUserApi, keyRequiredResponse } from "@/lib/forty-two/user-api";

/**
 * Passes a read through to the 42 API on the visitor's own key.
 *
 * It used to forward the caller's OAuth session token, but that token is issued
 * by this site's application and 42 meters per application -- so proxying on it
 * drew from the same budget that signing in needs. Data now travels on keys
 * students register themselves.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getUserApi();
  if (!api) return keyRequiredResponse();

  try {
    const { path } = await params;
    const apiPath = path.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const target = `/${apiPath}${searchParams ? `?${searchParams}` : ""}`;

    const proxyResponse = await api.fetch(target);

    if (!proxyResponse.ok) {
      return NextResponse.json(
        { error: `42 API error: ${proxyResponse.status}` },
        { status: proxyResponse.status },
      );
    }

    return NextResponse.json(await proxyResponse.json());
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from 42 API" },
      { status: 500 },
    );
  }
}
