import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { KEY_PRESENT_COOKIE, TOKEN_COOKIE } from "@/lib/forty-two/user-api";

/**
 * Exchanges a student's own 42 application credentials for an access token.
 *
 * The browser cannot call api.intra.42.fr itself -- there are no CORS headers on
 * it, which is the reason /api/proxy exists -- so the secret has to cross the
 * wire once. It is used for this exchange and then dropped: nothing is written
 * to a database, a cache, or a log.
 *
 * The token comes back as an httpOnly cookie so every later request carries it
 * without any call site passing it around, and page scripts cannot read it. A
 * second, readable cookie exists only so the interface knows a key is set.
 */

const FALLBACK_TTL = 7200;

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
    const maxAge = Number(data.expires_in) || FALLBACK_TTL;

    const result = NextResponse.json({ ok: true, expires_in: maxAge });

    result.cookies.set(TOKEN_COOKIE, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge,
    });

    result.cookies.set(KEY_PRESENT_COOKIE, "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge,
    });

    return result;
  } catch (error: any) {
    console.error("[byok] token exchange failed:", error.message);
    return NextResponse.json(
      { error: "Could not reach the 42 API" },
      { status: 502 },
    );
  }
}

/** Forgets the visitor's key. */
export async function DELETE() {
  const result = NextResponse.json({ ok: true });
  result.cookies.delete(TOKEN_COOKIE);
  result.cookies.delete(KEY_PRESENT_COOKIE);
  return result;
}
