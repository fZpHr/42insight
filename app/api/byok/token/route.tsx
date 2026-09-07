import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

/**
 * Exchanges a student's own 42 application credentials for an access token.
 *
 * The browser cannot call api.intra.42.fr itself -- there are no CORS headers on
 * it, which is the reason /api/proxy exists -- so the secret has to cross the
 * wire once. It is used for this exchange and then dropped: nothing is written
 * to a database, a cache, or a log. The browser keeps only the returned token.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let clientId: string;
  let clientSecret: string;

  try {
    const body = await request.json();
    clientId = body.client_id;
    clientSecret = body.client_secret;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "client_id and client_secret are required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch("https://api.intra.42.fr/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "42 rejected those credentials" },
        { status: 401 },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (error: any) {
    console.error("[byok] token exchange failed:", error.message);
    return NextResponse.json(
      { error: "Could not reach the 42 API" },
      { status: 502 },
    );
  }
}
