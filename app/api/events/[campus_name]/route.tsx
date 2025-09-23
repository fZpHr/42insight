import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type ApiClient = {
  get: (path: string) => Promise<Response>;
};

let apiClient: ApiClient | null = null;

const getApiClient = async (): Promise<ApiClient> => {
  if (apiClient) {
    return apiClient;
  }

  console.log("INFO: Creating new 42 API client...");
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

    console.log("INFO: 42 API client created and authenticated successfully.");

    // On crée notre client personnalisé avec le token obtenu
    apiClient = {
      get: (path: string) => {
        return fetch(`https://api.intra.42.fr/v2${path}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      },
    };

    return apiClient;
  } catch (error) {
    // Si une erreur survient, on s'assure que le client n'est pas mis en cache dans un état invalide
    apiClient = null;
    console.error("ERROR in getApiClient:", error);
    throw error; // Propage l'erreur
  }
};

export async function GET(
  request: Request,
  { params }: { params: { campus_name: string } },
) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("token");

  if (!accessToken) {
    return NextResponse.json(
      { error: "Access token is required" },
      { status: 401 },
    );
  }

  try {
    const decoded = jwt.verify(
      accessToken.value,
      process.env.JWT_SECRET!,
    ) as any;
    if (!decoded) {
      throw new Error("Not authorized");
    }

    const campusMapping: { [key: string]: number } = {
      Angoulême: 31,
      Nice: 41,
    };

    const campusId = campusMapping[params.campus_name];
    if (!campusId) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    const client = await getApiClient();
    const response = await client.get(`/campus/${campusId}/events `);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from 42 API: ${response.statusText}` },
        { status: response.status },
      );
    }

    const events = await response.json();
    return NextResponse.json(events);
  } catch (error: any) {
    console.error(
      `[FATAL ERROR] in /api/campus/${params.campus_name}/intra:`,
      error.message,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch events due to an internal server error.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
