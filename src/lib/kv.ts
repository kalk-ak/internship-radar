import { Redis } from "@upstash/redis";

/**
 * Tiny key-value facade over the handful of Redis commands this app uses.
 * Production uses Upstash Redis (provisioned through the Vercel Marketplace);
 * local development and tests fall back to an in-memory store.
 */
export interface KV {
  get<T>(key: string): Promise<T | null>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  set(key: string, value: unknown, opts?: { ex?: number; nx?: boolean }): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<void>;
  srem(key: string, ...members: string[]): Promise<void>;
  smembers(key: string): Promise<string[]>;
  zadd(key: string, entries: { score: number; member: string }[]): Promise<void>;
  zmscore(key: string, members: string[]): Promise<(number | null)[]>;
  zcard(key: string): Promise<number>;
  zremRangeByScore(key: string, min: number, max: number): Promise<void>;
  lpush(key: string, values: unknown[], maxLength: number): Promise<void>;
  lrange<T>(key: string, start: number, stop: number): Promise<T[]>;
}

const CHUNK = 1000;

function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

class UpstashKV implements KV {
  constructor(private redis: Redis) {}

  get<T>(key: string) {
    return this.redis.get<T>(key);
  }

  async mget<T>(keys: string[]) {
    if (keys.length === 0) return [];
    const out: (T | null)[] = [];
    for (const part of chunks(keys, 200)) out.push(...(await this.redis.mget<(T | null)[]>(...part)));
    return out;
  }

  async set(key: string, value: unknown, opts: { ex?: number; nx?: boolean } = {}) {
    const res = opts.ex
      ? opts.nx
        ? await this.redis.set(key, value, { ex: opts.ex, nx: true })
        : await this.redis.set(key, value, { ex: opts.ex })
      : opts.nx
        ? await this.redis.set(key, value, { nx: true })
        : await this.redis.set(key, value);
    return res === "OK";
  }

  async del(...keys: string[]) {
    if (keys.length) await this.redis.del(...keys);
  }

  async incr(key: string, ttlSeconds?: number) {
    const n = await this.redis.incr(key);
    if (n === 1 && ttlSeconds) await this.redis.expire(key, ttlSeconds);
    return n;
  }

  async sadd(key: string, ...members: string[]) {
    if (members.length) await this.redis.sadd(key, members[0], ...members.slice(1));
  }

  async srem(key: string, ...members: string[]) {
    if (members.length) await this.redis.srem(key, ...members);
  }

  smembers(key: string) {
    return this.redis.smembers(key);
  }

  async zadd(key: string, entries: { score: number; member: string }[]) {
    for (const part of chunks(entries)) {
      const [first, ...rest] = part;
      await this.redis.zadd(key, first, ...rest);
    }
  }

  async zmscore(key: string, members: string[]) {
    const out: (number | null)[] = [];
    for (const part of chunks(members)) {
      const scores = await this.redis.zmscore(key, part);
      out.push(...(scores ?? part.map(() => null)));
    }
    return out;
  }

  zcard(key: string) {
    return this.redis.zcard(key);
  }

  async zremRangeByScore(key: string, min: number, max: number) {
    await this.redis.zremrangebyscore(key, min, max);
  }

  async lpush(key: string, values: unknown[], maxLength: number) {
    if (!values.length) return;
    await this.redis.lpush(key, ...values);
    await this.redis.ltrim(key, 0, maxLength - 1);
  }

  lrange<T>(key: string, start: number, stop: number) {
    return this.redis.lrange<T>(key, start, stop);
  }
}

/** In-memory implementation for local development and unit tests. */
export class MemoryKV implements KV {
  private data = new Map<string, { value: unknown; expiresAt?: number }>();

  private read<T>(key: string): T | undefined {
    const entry = this.data.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  private write(key: string, value: unknown, ex?: number) {
    this.data.set(key, { value, expiresAt: ex ? Date.now() + ex * 1000 : undefined });
  }

  async get<T>(key: string) {
    const v = this.read<T>(key);
    return v === undefined ? null : structuredClone(v);
  }

  async mget<T>(keys: string[]) {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  async set(key: string, value: unknown, opts: { ex?: number; nx?: boolean } = {}) {
    if (opts.nx && this.read(key) !== undefined) return false;
    this.write(key, structuredClone(value), opts.ex);
    return true;
  }

  async del(...keys: string[]) {
    for (const k of keys) this.data.delete(k);
  }

  async incr(key: string, ttlSeconds?: number) {
    const n = (this.read<number>(key) ?? 0) + 1;
    const existing = this.data.get(key);
    this.data.set(key, {
      value: n,
      expiresAt: existing?.expiresAt ?? (ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined),
    });
    return n;
  }

  async sadd(key: string, ...members: string[]) {
    const set = this.read<Set<string>>(key) ?? new Set<string>();
    members.forEach((m) => set.add(m));
    this.write(key, set);
  }

  async srem(key: string, ...members: string[]) {
    const set = this.read<Set<string>>(key);
    members.forEach((m) => set?.delete(m));
  }

  async smembers(key: string) {
    return [...(this.read<Set<string>>(key) ?? [])];
  }

  async zadd(key: string, entries: { score: number; member: string }[]) {
    const z = this.read<Map<string, number>>(key) ?? new Map<string, number>();
    entries.forEach((e) => z.set(e.member, e.score));
    this.write(key, z);
  }

  async zmscore(key: string, members: string[]) {
    const z = this.read<Map<string, number>>(key);
    return members.map((m) => z?.get(m) ?? null);
  }

  async zcard(key: string) {
    return this.read<Map<string, number>>(key)?.size ?? 0;
  }

  async zremRangeByScore(key: string, min: number, max: number) {
    const z = this.read<Map<string, number>>(key);
    z?.forEach((score, member) => {
      if (score >= min && score <= max) z.delete(member);
    });
  }

  async lpush(key: string, values: unknown[], maxLength: number) {
    const list = this.read<unknown[]>(key) ?? [];
    for (const v of values) list.unshift(structuredClone(v));
    this.write(key, list.slice(0, maxLength));
  }

  async lrange<T>(key: string, start: number, stop: number) {
    const list = this.read<T[]>(key) ?? [];
    return structuredClone(list.slice(start, stop === -1 ? undefined : stop + 1));
  }
}

const globalForKV = globalThis as unknown as { __kv?: KV };

export function redisCredentials() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function kv(): KV {
  if (globalForKV.__kv) return globalForKV.__kv;
  const creds = redisCredentials();
  if (creds) {
    globalForKV.__kv = new UpstashKV(new Redis(creds));
  } else {
    if (process.env.VERCEL) {
      console.error("No Redis credentials found - falling back to in-memory storage (data will not persist).");
    }
    globalForKV.__kv = new MemoryKV();
  }
  return globalForKV.__kv;
}

/** Test helper: swap the store. */
export function setKV(store: KV) {
  globalForKV.__kv = store;
}
