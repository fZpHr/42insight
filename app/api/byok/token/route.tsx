import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  CREDENTIALS_COOKIE,
  CREDENTIALS_MAX_AGE,
  KEY_PRESENT_COOKIE,
  LEGACY_TOKEN_COOKIE,
  exchangeForToken,
  sealCredentials,
} from "@/lib/forty-two/user-api";

/**
 * Connects a student's own 42 application to their session.
 *
 * The credentials are checked against 42 once, then sealed into an encrypted
 * httpOnly cookie that lasts a month. Storing the credentials rather than the
 * access token is what makes the key stick: a token lapses after about two
 * hours, which is why the key used to have to be pasted in again every session.
 *
 * The browser cannot talk to api.intra.42.fr itself -- it sends no CORS
 * headers, which is why /api/proxy exists -- so the secret crosses the wire
 * once. It is never written to a database, a cache or a log; there is no
 * database here to write it to.
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
    clientId = String(body.client_id ?? "").trim();
    clientSecret = String(body.client_secret ?? "").trim();
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
    // Proves the credentials work before committing them to a cookie, and
    // warms the token cache so the next page load does not pay for it.
    const token = await exchangeForToken({ clientId, clientSecret });

    if (!token) {
      return NextResponse.json(
        { error: "42 rejected those credentials" },
        { status: 401 },
      );
    }

    const sealed = await sealCredentials({ clientId, clientSecret });
    const result = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === "production";

    result.cookies.set(CREDENTIALS_COOKIE, sealed, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: CREDENTIALS_MAX_AGE,
    });

    result.cookies.set(KEY_PRESENT_COOKIE, "1", {
      httpOnly: false,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: CREDENTIALS_MAX_AGE,
    });

    // Left over from when the token itself was the cookie.
    result.cookies.delete(LEGACY_TOKEN_COOKIE);

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
  result.cookies.delete(CREDENTIALS_COOKIE);
  result.cookies.delete(KEY_PRESENT_COOKIE);
  result.cookies.delete(LEGACY_TOKEN_COOKIE);
  return result;
}
