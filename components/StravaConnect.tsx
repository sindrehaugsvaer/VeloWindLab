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
  athlete_firstname?: string | null;
  athlete_lastname?: string | null;
}

export interface StravaRoute {
  id: string;
  name: string;
  distance: number;
  elevation_gain?: number;
  polyline?: string;
}

interface StravaConnectProps {
  onRoutesLoaded?: (routes: StravaRoute[], hasMore: boolean) => void;
  onMoreRoutesLoaded?: (routes: StravaRoute[], hasMore: boolean) => void;
  onLoadMoreReady?: (loadMore: () => Promise<void>) => void;
  onRefreshReady?: (refresh: () => Promise<void>) => void;
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

export default function StravaConnect({
  onRoutesLoaded,
  onMoreRoutesLoaded,
  onLoadMoreReady,
  onRefreshReady,
}: StravaConnectProps) {
  const { loading } = useGPX();
  const [tokens, setTokens] = useState<StravaTokens | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokensRef = useRef<StravaTokens | null>(null);
  const currentPageRef = useRef(1);
  const athleteIdRef = useRef<number | null>(null);
  const ROUTES_PER_PAGE = 30;

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
  const athleteName = useMemo(() => {
    const first = tokens?.athlete_firstname?.trim();
    const last = tokens?.athlete_lastname?.trim();
    const name = [first, last].filter(Boolean).join(" ");
    return name || "Strava athlete";
  }, [tokens?.athlete_firstname, tokens?.athlete_lastname]);

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

  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  const disconnect = useCallback(async () => {
    setDisconnectLoading(true);
    setError(null);

    try {
      const current = tokensRef.current;
      if (current?.access_token) {
        // Call Strava's deauthorize endpoint
        await fetch("https://www.strava.com/oauth/deauthorize", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `access_token=${current.access_token}`,
        });
      }
    } catch {
      // Ignore errors - we still want to clear local tokens
    }

    updateTokens(null);
    setWasDisconnected(true);
    setDisconnectLoading(false);
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
      athlete_firstname: current.athlete_firstname ?? null,
      athlete_lastname: current.athlete_lastname ?? null,
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
        athlete_firstname: data.firstname ?? current?.athlete_firstname ?? null,
        athlete_lastname: data.lastname ?? current?.athlete_lastname ?? null,
      } as StravaTokens;

      updateTokens(updated);
      athleteIdRef.current = data.id;
      return data.id;
    },
    [updateTokens],
  );

  const mapRouteData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (routes: any[]): StravaRoute[] =>
      routes.map((r) => ({
        id: String(r.id_str || r.id),
        name: r.name,
        distance: r.distance,
        elevation_gain: r.elevation_gain,
        polyline: r.map?.summary_polyline || undefined,
      })),
    [],
  );

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    setError(null);

    try {
      const accessToken = await getValidAccessToken();
      const athleteId = await ensureAthleteId(accessToken);
      athleteIdRef.current = athleteId;
      currentPageRef.current = 1;

      const response = await fetch(
        `https://www.strava.com/api/v3/athletes/${athleteId}/routes?page=1&per_page=${ROUTES_PER_PAGE}`,
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

      const routes = mapRouteData(data);
      const hasMore = data.length === ROUTES_PER_PAGE;
      onRoutesLoaded?.(routes, hasMore);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load Strava routes.";
      setError(message);
    } finally {
      setRoutesLoading(false);
    }
  }, [
    ensureAthleteId,
    getValidAccessToken,
    mapRouteData,
    onRoutesLoaded,
    ROUTES_PER_PAGE,
  ]);

  const loadMoreRoutes = useCallback(async () => {
    if (!athleteIdRef.current) return;

    try {
      const accessToken = await getValidAccessToken();
      const nextPage = currentPageRef.current + 1;

      const response = await fetch(
        `https://www.strava.com/api/v3/athletes/${athleteIdRef.current}/routes?page=${nextPage}&per_page=${ROUTES_PER_PAGE}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.message || "Failed to fetch more routes.");
      }

      currentPageRef.current = nextPage;
      const routes = mapRouteData(data);
      const hasMore = data.length === ROUTES_PER_PAGE;
      onMoreRoutesLoaded?.(routes, hasMore);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load more routes.";
      setError(message);
    }
  }, [getValidAccessToken, mapRouteData, onMoreRoutesLoaded, ROUTES_PER_PAGE]);

  const refreshRoutes = useCallback(async () => {
    currentPageRef.current = 1;
    await loadRoutes();
  }, [loadRoutes]);

  // Register callbacks for parent component
  useEffect(() => {
    onLoadMoreReady?.(loadMoreRoutes);
  }, [loadMoreRoutes, onLoadMoreReady]);

  useEffect(() => {
    onRefreshReady?.(refreshRoutes);
  }, [refreshRoutes, onRefreshReady]);

  const handleAuthorize = useCallback(() => {
    setAuthLoading(true);
    setError(null);
    setWasDisconnected(false);
    window.location.href = authorizeUrl;
  }, [authorizeUrl]);

  // Auto-clear the disconnected message after 5 seconds
  useEffect(() => {
    if (wasDisconnected) {
      const timer = setTimeout(() => {
        setWasDisconnected(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [wasDisconnected]);

  // Spinner component for loading states
  const Spinner = ({ size = "default" }: { size?: "default" | "large" }) => (
    <svg
      className={`animate-spin ${size === "large" ? "h-8 w-8 sm:h-10 sm:w-10" : "h-4 w-4 sm:h-5 sm:w-5"}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <div className="w-full">
      <div className="relative min-h-[90px] sm:min-h-[120px] lg:min-h-[200px] rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-2 py-2 sm:px-3 sm:py-4 md:py-5 lg:px-4 lg:py-6 flex flex-col items-center justify-center overflow-hidden">
        {/* Corner ribbon
        TODO: Remove when Strava approves increased athletes allowed to connect */}
        <div className="absolute rotate-45 right-[-45px] lg:right-[-35px] top-[10px] lg:top-[15px] w-[130px] py-[6px] lg:py-[8px] bg-gradient-to-r from-[#e04000] via-[#FC4C02] to-[#e04000] text-center shadow-md flex items-center justify-center">
          <span className="text-[6px] lg:text-[8px] font-bold uppercase tracking-wide text-white drop-shadow-sm">
            Coming soon!
          </span>
        </div>
        {authLoading ? (
          /* STATE: While connecting - full box spinner, no border */
          <div className="flex items-center justify-center">
            <Spinner size="large" />
          </div>
        ) : isAuthenticated ? (
          /* STATE 2: While connected */
          <div className="flex flex-col items-center gap-2 sm:gap-3 w-full">
            {/* Powered by Strava logo */}
            <div className="flex items-center justify-center gap-3 w-full">
              <div className="text-right">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-zinc-400">
                  User:
                </p>
                <p className="text-[11px] sm:text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {athleteName}
                </p>
              </div>
              <Image
                src="/api_logo_pwrdBy_strava_stack_white.svg"
                alt="Powered by Strava"
                width={120}
                height={40}
                className="h-6 sm:h-8 w-auto invert dark:invert-0"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <button
                onClick={loadRoutes}
                disabled={routesLoading || loading || disconnectLoading}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {routesLoading ? (
                  <>
                    <Spinner />
                    <span>Loading...</span>
                  </>
                ) : (
                  "Load Strava routes"
                )}
              </button>
              <button
                onClick={disconnect}
                disabled={routesLoading || disconnectLoading}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {disconnectLoading ? (
                  <>
                    <Spinner />
                    <span>Disconnecting...</span>
                  </>
                ) : (
                  "Disconnect"
                )}
              </button>
            </div>

            {/* Status text */}
            <p className="text-center text-[10px] sm:text-sm text-zinc-500 dark:text-zinc-400">
              Connected to Strava. Click “Disconnect” to remove VeloWindLab from
              your Strava account.
            </p>
          </div>
        ) : (
          /* STATE 1 & 3: Before connected / After disconnected */
          <div className="flex flex-col items-center gap-1.5 sm:gap-3 text-center">
            <button
              onClick={handleAuthorize}
              disabled={authLoading}
              aria-label="Connect with Strava"
              className="rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-lg active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none border border-zinc-200 dark:border-transparent flex items-center justify-center"
            >
              <Image
                src="/btn_strava_connect_with_white.svg"
                alt="Connect with Strava"
                width={210}
                height={48}
                className="h-8 sm:h-11 w-auto rounded-lg"
                priority
              />
            </button>
            {wasDisconnected ? (
              <p className="text-[10px] sm:text-sm text-zinc-500 dark:text-zinc-400 border border-dashed border-[#FC4C02] rounded-lg px-3 py-1.5">
                Disconnected from Strava. You can reconnect anytime.
              </p>
            ) : (
              <p className="text-[10px] sm:text-sm text-zinc-500 dark:text-zinc-400">
                Connect with Strava to import your saved routes directly.
              </p>
            )}
          </div>
        )}

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
    async (
      route: StravaRoute,
    ): Promise<{ success: boolean; error?: string }> => {
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
        const normalizedName = route.name
          .normalize("NFC")
          .replace(/[\\/:*?"<>|]+/g, "-")
          .replace(/[\u0000-\u001F\u007F]+/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/[. ]+$/g, "")
          .replace(/^\.+/, "");
        const fileName = `${normalizedName || "strava-route"}.gpx`;
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
