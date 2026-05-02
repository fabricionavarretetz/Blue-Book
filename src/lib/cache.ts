import "server-only";

/**
 * Cache in-memory simple con TTL.
 *
 * Uso: para resultados de Spotify search/tracks que cambian poco y son
 * caros (rate limits, latencia). Para MVP es suficiente: una entrada por
 * proceso Node, viene gratis. En serverless (Vercel) cada instancia tiene
 * su propio cache — esto es OK porque las entradas son inmutables y
 * compartibles. Cuando la app crezca, migrar a Upstash Redis.
 *
 * Patrón estándar:
 * ```ts
 * const cache = new TtlCache<string, MyData>(60_000);
 * const data = await cache.getOrSet("key", () => fetchExpensive());
 * ```
 */
export class TtlCache<K, V> {
  private store = new Map<K, { value: V; expiresAt: number }>();

  constructor(private defaultTtlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  /**
   * Devuelve el valor cacheado, o lo computa con `factory` y lo cachea.
   * `factory` es async; los errores NO se cachean.
   */
  async getOrSet(key: K, factory: () => Promise<V>, ttlMs?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  /** Elimina entradas expiradas. Útil llamar periódicamente si el cache crece. */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(key);
    }
  }
}
