const store = new Map<string, { value: string; expiresAt: number }>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt > 0 && entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, 60_000);

export const cache = {
  get(key: string): string | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  set(key: string, value: string, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
    store.set(key, { value, expiresAt });
  },

  del(key: string): void {
    store.delete(key);
  },

  incr(key: string, ttlSeconds?: number): number {
    const current = this.get(key);
    const newVal = current ? parseInt(current, 10) + 1 : 1;
    const existingEntry = store.get(key);
    const expiresAt = existingEntry?.expiresAt ||
      (ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0);
    store.set(key, { value: String(newVal), expiresAt });
    return newVal;
  },

  clear(): void {
    store.clear();
  },
};
