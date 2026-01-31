"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useGPX } from "@/context/GPXContext";

const STORAGE_KEY = "velowindlab_strava_tokens";
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id?: number | null;
}

export interface StravaRoute {
  id: number;
  name: string;
  distance: number;
  elevation_gain?: number;
}

interface StravaConnectProps {
  onRoutesLoaded?: (routes: StravaRoute[]) => void;
}

function loadTokens(): StravaTokens | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as StravaTokens;
    if (
      !parsed?.access_token ||
      !parsed?.refresh_token ||
      !parsed?.expires_at
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveTokens(tokens: StravaTokens | null) {
  if (typeof window === "undefined") return;
  if (!tokens) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export default function StravaConnect({ onRoutesLoaded }: StravaConnectProps) {
  const { loading } = useGPX();
  const [tokens, setTokens] = useState<StravaTokens | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokensRef = useRef<StravaTokens | null>(null);

  useEffect(() => {
    const stored = loadTokens();
    if (stored) {
      setTokens(stored);
      tokensRef.current = stored;
    }
  }, []);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  const isAuthenticated = Boolean(
    tokens?.access_token && tokens?.refresh_token,
  );

  const authorizeUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const redirectUri = `${window.location.origin}/api/strava/callback`;
    const url = new URL("https://www.strava.com/oauth/authorize");
    url.searchParams.set("client_id", "199203");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("approval_prompt", "auto");
    url.searchParams.set("scope", "read,read_all");
    return url.toString();
  }, []);

  const updateTokens = useCallback((next: StravaTokens | null) => {
    setTokens(next);
    tokensRef.current = next;
    saveTokens(next);
  }, []);

  const disconnect = useCallback(() => {
    updateTokens(null);
    setError(null);
  }, [updateTokens]);

  const getValidAccessToken = useCallback(async (): Promise<string> => {
    const current = tokensRef.current;
    if (!current) {
      throw new Error("Not authenticated with Strava.");
    }

    const now = Math.floor(Date.now() / 1000);
    if (current.expires_at > now + TOKEN_REFRESH_BUFFER_SECONDS) {
      return current.access_token;
    }

    const response = await fetch("/api/strava/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: current.refresh_token,
      }),
    });

    const data = (await response.json()) as Partial<StravaTokens> & {
      message?: string;
    };

    if (!response.ok || !data.access_token || !data.expires_at) {
      throw new Error(data.message || "Failed to refresh Strava token.");
    }

    const refreshed: StravaTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? current.refresh_token,
      expires_at: data.expires_at,
      athlete_id: current.athlete_id ?? null,
    };

    updateTokens(refreshed);
    return refreshed.access_token;
  }, [updateTokens]);

  const ensureAthleteId = useCallback(
    async (accessToken: string): Promise<number> => {
      const current = tokensRef.current;
      if (current?.athlete_id) {
        return current.athlete_id;
      }

      const response = await fetch("https://www.strava.com/api/v3/athlete", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data?.id) {
        throw new Error(
          data?.message || "Failed to fetch Strava athlete profile.",
        );
      }

      const updated: StravaTokens = {
        ...current,
        access_token: accessToken,
        athlete_id: data.id,
      } as StravaTokens;

      updateTokens(updated);
      return data.id;
    },
    [updateTokens],
  );

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    setError(null);

    try {
      const accessToken = await getValidAccessToken();
      const athleteId = await ensureAthleteId(accessToken);
      const response = await fetch(
        `https://www.strava.com/api/v3/athletes/${athleteId}/routes`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.message || "Failed to fetch Strava routes.");
      }

      onRoutesLoaded?.(data as StravaRoute[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load Strava routes.";
      setError(message);
    } finally {
      setRoutesLoading(false);
    }
  }, [ensureAthleteId, getValidAccessToken, onRoutesLoaded]);

  const handleAuthorize = useCallback(() => {
    setAuthLoading(true);
    setError(null);
    window.location.href = authorizeUrl;
  }, [authorizeUrl]);

  return (
    <div className="w-full">
      <div className="min-h-[90px] sm:min-h-[120px] lg:min-h-[200px] rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-2 sm:p-3 flex items-center justify-center">
        <div className="flex flex-col items-center gap-1.5 sm:gap-3 text-center">
          {!isAuthenticated ? (
            <button
              onClick={handleAuthorize}
              disabled={authLoading}
              aria-label="Connect with Strava"
              className="rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Image
                src="/btn_strava_connect_with_white_x2.png"
                alt="Connect with Strava"
                width={210}
                height={48}
                className="h-8 sm:h-11 w-auto"
                priority
              />
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <button
                onClick={loadRoutes}
                disabled={routesLoading || loading}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {routesLoading ? "Loading..." : "Load Strava routes"}
              </button>
              <button
                onClick={disconnect}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-500"
              >
                Disconnect
              </button>
            </div>
          )}
          <p className="text-[10px] sm:text-sm text-zinc-500 dark:text-zinc-400">
            Connect with Strava to import your saved routes directly.
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs sm:text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to use Strava import functionality from other components
export function useStravaImport() {
  const { processGPX, loading } = useGPX();
  const tokensRef = useRef<StravaTokens | null>(null);

  useEffect(() => {
    const stored = loadTokens();
    if (stored) {
      tokensRef.current = stored;
    }
  }, []);

  const getValidAccessToken = useCallback(async (): Promise<string> => {
    const current = tokensRef.current;
    if (!current) {
      throw new Error("Not authenticated with Strava.");
    }

    const now = Math.floor(Date.now() / 1000);
    if (current.expires_at > now + TOKEN_REFRESH_BUFFER_SECONDS) {
      return current.access_token;
    }

    const response = await fetch("/api/strava/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: current.refresh_token,
      }),
    });

    const data = (await response.json()) as Partial<StravaTokens> & {
      message?: string;
    };

    if (!response.ok || !data.access_token || !data.expires_at) {
      throw new Error(data.message || "Failed to refresh Strava token.");
    }

    const refreshed: StravaTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? current.refresh_token,
      expires_at: data.expires_at,
      athlete_id: current.athlete_id ?? null,
    };

    tokensRef.current = refreshed;
    saveTokens(refreshed);
    return refreshed.access_token;
  }, []);

  const importRoute = useCallback(
    async (route: StravaRoute): Promise<{ success: boolean; error?: string }> => {
      try {
        const accessToken = await getValidAccessToken();
        const response = await fetch(
          `https://www.strava.com/api/v3/routes/${route.id}/export_gpx`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(
            data?.message || "Failed to download GPX from Strava.",
          );
        }

        const blob = await response.blob();
        const fileName = `${route.name.replace(/[^a-z0-9-_]+/gi, "-")}.gpx`;
        const file = new File([blob], fileName, {
          type: "application/gpx+xml",
        });
        const result = await processGPX(file);

        if (!result.success) {
          throw new Error(result.error || "Failed to import Strava route.");
        }

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to import Strava route.";
        return { success: false, error: message };
      }
    },
    [getValidAccessToken, processGPX],
  );

  return { importRoute, loading };
}
