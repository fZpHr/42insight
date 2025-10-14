
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Copie de la logique d'authentification de l'API 42
let apiClient: { get: (path: string) => Promise<Response> } | null = null;
const getApiClient = async () => {
  if (apiClient) return apiClient;
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID!;
  const clientSecret = process.env.CLIENT_SECRET_NEXT1!;
  const tokenResponse = await fetch("https://api.intra.42.fr/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error("Failed to get 42 API token");
  }
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  apiClient = {
    get: (path: string) =>
      fetch(`https://api.intra.42.fr/v2${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
  };
  return apiClient;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const params = await context.params;
  const login = params.login;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getApiClient();
    // Récupérer l'utilisateur pour obtenir son id
    const userRes = await client.get(`/users/${login}`);
    if (!userRes.ok) {
      console.error("[DEBUG] User not found for login:", login);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = await userRes.json();
    let allEvents: any[] = [];
    let page = 1;
    const perPage = 100;
    let eventsPage;
    do {
      const eventsRes = await client.get(`/users/${user.id}/events?per_page=${perPage}&page=${page}`);
      if (!eventsRes.ok) {
        console.error(`[DEBUG] Failed to fetch events page ${page} for user ${login}:`, eventsRes.statusText);
        break;
      }
      eventsPage = await eventsRes.json();
      //console.log(`[DEBUG] Events page ${page} for user ${login}:`, eventsPage);
      allEvents = allEvents.concat(eventsPage);
      page++;
    } while (eventsPage && eventsPage.length === perPage);

    //console.log(`[DEBUG] All events for user ${login}:`, allEvents);
    return NextResponse.json({ events: allEvents });
  } catch (error: any) {
    console.error("[ERROR] /api/users/[login]/events:", error.message);
    return NextResponse.json({ error: "Failed to fetch events", details: error.message }, { status: 500 });
  }
}
