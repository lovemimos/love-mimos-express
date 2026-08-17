import "server-only";

type CacheEntry<T> = { value: T; expiresAt: number };

/**
 * Minimal in-memory TTL cache, scoped to this server process.
 *
 * This is intentionally simple (no LRU, no size limit) because the
 * catalog is small. It is NOT shared across serverless instances or
 * processes — each cold start begins with an empty cache. That's an
 * accepted limitation for Sprint 4 (see docs/API_TINY.md §6); a
 * multi-instance deploy would need a shared cache (Redis, etc.) for this
 * to actually reduce Tiny API calls consistently.
 */
class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

export const tinyCache = new TtlCache();
