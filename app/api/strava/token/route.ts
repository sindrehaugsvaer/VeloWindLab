function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  const clientId = process.env.STRAVA_CLIENT_ID ?? "199203";
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientSecret) {
    return jsonResponse({ message: "Missing STRAVA_CLIENT_SECRET on the server." }, 500);
  }

  let payload: { grant_type?: string; refresh_token?: string; code?: string } | null = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  if (!payload?.grant_type) {
    return jsonResponse({ message: "Missing grant_type." }, 400);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: payload.grant_type,
  });

  if (payload.refresh_token) {
    body.set("refresh_token", payload.refresh_token);
  }

  if (payload.code) {
    body.set("code", payload.code);
  }

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenData = await tokenResponse.json().catch(() => null);

  return jsonResponse(tokenData ?? { message: "Unexpected response from Strava." }, tokenResponse.status);
}

export const dynamic = "force-dynamic";
