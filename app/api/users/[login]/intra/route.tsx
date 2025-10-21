import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

// In-memory cache for user intra data
const intraCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

type ApiClient = {
  get: (path: string) => Promise<Response>;
};

let apiClient: ApiClient | null = null;

const getApiClient = async (): Promise<ApiClient> => {
  if (apiClient) {
    return apiClient;
  }

  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID!;
  const clientSecret = process.env.CLIENT_SECRET_NEXT1!;

  try {
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
      const errorBody = await tokenResponse.text();
      console.error("FATAL: Failed to get 42 API token.", {
        status: tokenResponse.status,
        body: errorBody,
      });
      throw new Error(`API Authentication failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("Access token was not found in the API response.");
    }

    apiClient = {
      get: (path: string) => {
        return fetch(`https://api.intra.42.fr/v2${path}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      },
    };

    return apiClient;
  } catch (error) {
    apiClient = null;
    console.error("ERROR in getApiClient:", error);
    throw error;
  }
};

export async function GET(
  request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const params = await context.params;
  const login = params.login;
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
      return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
      )
  }

  // Check cache first
  const cached = intraCache.get(login);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return NextResponse.json(cached.data);
  }

  try {
    const client = await getApiClient();
    const response = await client.get(`/users/${login}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from 42 API: ${response.statusText}` },
        { status: response.status },
      );
    }

    const user = await response.json();

    // Fetch all projects with pagination
    let allProjects: any[] = [];
    let page = 1;
    const perPage = 100;
    let projectsPage;

    do {
      const projectsResponse = await client.get(`/users/${user.id}/projects_users?per_page=${perPage}&page=${page}`);
      if (!projectsResponse.ok) {
        if (projectsResponse.status === 429 && cached) {
          console.warn(`[WARN] Rate limited fetching projects for ${login}. Serving stale cache.`);
          return NextResponse.json(cached.data);
        }
        console.error(`Failed to fetch projects page ${page} for user ${login}: ${projectsResponse.statusText}`);
        break;
      }
      projectsPage = await projectsResponse.json();
      allProjects = allProjects.concat(projectsPage);
      page++;
    } while (projectsPage && projectsPage.length === perPage);

    user.projects_users = allProjects;

    // Store in cache before returning
    intraCache.set(login, { data: user, timestamp: Date.now() });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error(`[FATAL ERROR] in /api/users/${login}/intra:`, error.message);
    return NextResponse.json(
      {
        error: "Failed to fetch user due to an internal server error.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
