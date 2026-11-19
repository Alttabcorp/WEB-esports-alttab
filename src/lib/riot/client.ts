import {
  type PlatformRegion,
  type RoutingRegion,
  platformHost,
  routingHost,
  toRoutingRegion,
} from "./regions";
import type {
  AccountDto,
  CurrentGameInfo,
  LeagueEntryDto,
  LeagueListDto,
  MatchDto,
  RankedDivision,
  RankedTier,
  SummonerDto,
} from "./types";

export class RiotApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public path?: string,
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

type RateWindow = { limit: number; seconds: number; count: number };

/** App ID 364635 documented limits. */
const APP_LIMITS = {
  perSecond: 20,
  perTwoMinutes: 100,
  twoMinuteMs: 120_000,
} as const;

class RiotClient {
  private queue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;
  /** Soft spacing under 20 req/s. */
  private readonly minIntervalMs = 55;
  private appWindows: RateWindow[] = [];
  /** Local sliding window for the 100/2min hard cap. */
  private recentRequestAts: number[] = [];

  constructor(private readonly apiKey: string) {}

  private async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private pruneLocalWindow(now: number): void {
    const cutoff = now - APP_LIMITS.twoMinuteMs;
    this.recentRequestAts = this.recentRequestAts.filter((t) => t > cutoff);
  }

  private async respectLocalTwoMinuteCap(): Promise<void> {
    const now = Date.now();
    this.pruneLocalWindow(now);

    if (this.recentRequestAts.length < APP_LIMITS.perTwoMinutes - 1) {
      return;
    }

    const oldest = this.recentRequestAts[0]!;
    const wait = oldest + APP_LIMITS.twoMinuteMs - now + 50;
    if (wait > 0) {
      await sleep(wait);
      this.pruneLocalWindow(Date.now());
    }
  }

  private async throttle(): Promise<void> {
    await this.respectLocalTwoMinuteCap();

    const now = Date.now();
    const wait = Math.max(0, this.minIntervalMs - (now - this.lastRequestAt));
    if (wait > 0) {
      await sleep(wait);
    }
    this.lastRequestAt = Date.now();
    this.recentRequestAts.push(this.lastRequestAt);
  }

  private parseRateHeaders(headers: Headers): void {
    const limit = headers.get("x-app-rate-limit");
    const count = headers.get("x-app-rate-limit-count");
    if (!limit || !count) return;

    const limits = limit.split(",").map((part) => {
      const [l, s] = part.split(":").map(Number);
      return { limit: l, seconds: s };
    });
    const counts = count.split(",").map((part) => {
      const [c, s] = part.split(":").map(Number);
      return { count: c, seconds: s };
    });

    this.appWindows = limits.map((l) => {
      const match = counts.find((c) => c.seconds === l.seconds);
      return { limit: l.limit, seconds: l.seconds, count: match?.count ?? 0 };
    });
  }

  private async respectNearLimit(): Promise<void> {
    for (const window of this.appWindows) {
      // Leave headroom of 2 requests before pausing for the full window.
      if (window.count >= window.limit - 2) {
        await sleep(window.seconds * 1000);
      }
    }
  }

  async fetchJson<T>(
    host: string,
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    return this.enqueue(async () => {
      const maxAttempts = 4;
      let attempt = 0;

      while (attempt < maxAttempts) {
        attempt += 1;
        await this.respectNearLimit();
        await this.throttle();

        const response = await fetch(`${host}${path}`, {
          ...init,
          headers: {
            "X-Riot-Token": this.apiKey,
            Accept: "application/json",
            ...(init?.headers ?? {}),
          },
          cache: "no-store",
        });

        this.parseRateHeaders(response.headers);

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "2");
          await sleep(Math.max(1, retryAfter) * 1000);
          continue;
        }

        if (response.status >= 500 && attempt < maxAttempts) {
          await sleep(250 * attempt);
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new RiotApiError(
            body || `Riot API error ${response.status}`,
            response.status,
            path,
          );
        }

        return (await response.json()) as T;
      }

      throw new RiotApiError("Riot API rate limit exceeded", 429, path);
    });
  }

  getAccountByRiotId(
    routing: RoutingRegion,
    gameName: string,
    tagLine: string,
  ): Promise<AccountDto> {
    const encodedName = encodeURIComponent(gameName);
    const encodedTag = encodeURIComponent(tagLine);
    return this.fetchJson(
      routingHost(routing),
      `/riot/account/v1/accounts/by-riot-id/${encodedName}/${encodedTag}`,
    );
  }

  getSummonerByPuuid(
    platform: PlatformRegion,
    puuid: string,
  ): Promise<SummonerDto> {
    return this.fetchJson(
      platformHost(platform),
      `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  getLeagueEntriesByPuuid(
    platform: PlatformRegion,
    puuid: string,
  ): Promise<LeagueEntryDto[]> {
    return this.fetchJson(
      platformHost(platform),
      `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  getMatchIdsByPuuid(
    routing: RoutingRegion,
    puuid: string,
    options: { start?: number; count?: number; queue?: number } = {},
  ): Promise<string[]> {
    const params = new URLSearchParams();
    params.set("start", String(options.start ?? 0));
    params.set("count", String(options.count ?? 50));
    if (typeof options.queue === "number") {
      params.set("queue", String(options.queue));
    }
    return this.fetchJson(
      routingHost(routing),
      `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params}`,
    );
  }

  getMatch(routing: RoutingRegion, matchId: string): Promise<MatchDto> {
    return this.fetchJson(
      routingHost(routing),
      `/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
    );
  }

  /** Partida ao vivo; lança RiotApiError 404 se não estiver em game. */
  getActiveGameByPuuid(
    platform: PlatformRegion,
    puuid: string,
  ): Promise<CurrentGameInfo> {
    return this.fetchJson(
      platformHost(platform),
      `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`,
    );
  }

  getChallengerLeague(
    platform: PlatformRegion,
    queue = "RANKED_SOLO_5x5",
  ): Promise<LeagueListDto> {
    return this.fetchJson(
      platformHost(platform),
      `/lol/league/v4/challengerleagues/by-queue/${queue}`,
    );
  }

  getGrandmasterLeague(
    platform: PlatformRegion,
    queue = "RANKED_SOLO_5x5",
  ): Promise<LeagueListDto> {
    return this.fetchJson(
      platformHost(platform),
      `/lol/league/v4/grandmasterleagues/by-queue/${queue}`,
    );
  }

  getMasterLeague(
    platform: PlatformRegion,
    queue = "RANKED_SOLO_5x5",
  ): Promise<LeagueListDto> {
    return this.fetchJson(
      platformHost(platform),
      `/lol/league/v4/masterleagues/by-queue/${queue}`,
    );
  }

  getLeagueEntries(
    platform: PlatformRegion,
    tier: RankedTier,
    division: RankedDivision,
    page = 1,
    queue = "RANKED_SOLO_5x5",
  ): Promise<LeagueEntryDto[]> {
    return this.fetchJson(
      platformHost(platform),
      `/lol/league/v4/entries/${queue}/${tier}/${division}?page=${page}`,
    );
  }

  getSummonerById(
    platform: PlatformRegion,
    summonerId: string,
  ): Promise<SummonerDto> {
    return this.fetchJson(
      platformHost(platform),
      `/lol/summoner/v4/summoners/${encodeURIComponent(summonerId)}`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let singleton: RiotClient | null = null;

export function getRiotClient(): RiotClient {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw new RiotApiError(
      "RIOT_API_KEY não configurada. Crie .env.local a partir de .env.example.",
      500,
    );
  }
  if (!singleton) {
    singleton = new RiotClient(apiKey);
  }
  return singleton;
}

export function resolveRouting(platform: PlatformRegion): RoutingRegion {
  return toRoutingRegion(platform);
}
