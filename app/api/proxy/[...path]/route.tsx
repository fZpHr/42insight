import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";

/**
 * The API console: an arbitrary read against the 42 API, chosen by the visitor.
 *
 * It used to forward the caller's OAuth session token. That token is issued by
 * this site's application and 42 meters per application, so it drew from the
 * same budget as signing in, with none of the accounting. It now travels on the
 * visitor's own key, like every other read here -- and a console whose cost
 * nobody can predict is the last place a shared key belongs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
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
