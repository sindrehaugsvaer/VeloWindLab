const STORAGE_KEY = "velowindlab_strava_tokens";

function htmlEscape(value: string) {
  return value.replace(/</g, "\\u003c");
}

function renderHtml(payload: string, redirectTo: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connecting to Strava</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #f4f4f5; color: #18181b; }
      .card { max-width: 520px; margin: 12vh auto; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(24,24,27,0.12); }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { margin: 0 0 8px; font-size: 14px; color: #52525b; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Finalizing Strava login...</h1>
      <p>You can close this tab if it does not redirect automatically.</p>
    </div>
    <script>
      try {
        localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(payload)});
      } catch (err) {
        console.error('Failed to store Strava tokens', err);
      }
      window.location.replace(${JSON.stringify(redirectTo)});
    </script>
  </body>
</html>`;
}

function renderError(message: string, redirectTo: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Strava Error</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #fef2f2; color: #7f1d1d; }
      .card { max-width: 520px; margin: 12vh auto; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(24,24,27,0.12); }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { margin: 0 0 16px; font-size: 14px; color: #7f1d1d; }
      a { color: #b91c1c; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Strava login failed</h1>
      <p>${htmlEscape(message)}</p>
      <a href="${htmlEscape(redirectTo)}">Return to VeloWindLab</a>
    </div>
  </body>
</html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.origin + "/";
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error || !code) {
    const message = error ? `Strava returned an error: ${error}` : "Missing authorization code.";
    return new Response(renderError(message, redirectTo), {
      status: 400,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  const clientId = process.env.STRAVA_CLIENT_ID ?? "199203";
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientSecret) {
    return new Response(renderError("Missing STRAVA_CLIENT_SECRET on the server.", redirectTo), {
      status: 500,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenData = await tokenResponse.json().catch(() => null);

  if (!tokenResponse.ok || !tokenData?.access_token) {
    const message = tokenData?.message || "Failed to exchange authorization code.";
    return new Response(renderError(message, redirectTo), {
      status: 502,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  const payload = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: tokenData.expires_at,
    athlete_id: tokenData.athlete?.id ?? null,
  };

  const payloadString = htmlEscape(JSON.stringify(payload));

  return new Response(renderHtml(payloadString, redirectTo), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export const dynamic = "force-dynamic";
