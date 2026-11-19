import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export function getRedis(): Redis {
  if (globalForRedis.redis) return globalForRedis.redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL não configurada. Veja .env.example / LEAGUE-PERSUA.md.",
    );
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
  });

  globalForRedis.redis = client;
  return client;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds);
}
