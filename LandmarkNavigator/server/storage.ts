import { Cache, InsertCache } from "@shared/schema";

export interface IStorage {
  getCachedData(key: string): Promise<any | null>;
  cacheData(key: string, value: any, expiryTime: number): Promise<void>;
  clearExpiredCache(): Promise<void>;
}

export class MemStorage implements IStorage {
  private cache: Map<string, Cache>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60 * 1000) {
    this.cache = new Map();

    // Setup periodic cache cleanup
    this.cleanupInterval = setInterval(() => {
      this.clearExpiredCache().catch((err) => {
        console.error("Error during cache cleanup:", err);
      });
    }, cleanupIntervalMs);
  }

  async getCachedData(key: string): Promise<any | null> {
    const cacheEntry = this.cache.get(key);

    if (!cacheEntry) {
      console.log(`Cache miss for key: ${key}`);
      return null;
    }

    // Check if cache is expired
    if (Number(cacheEntry.expires) < Date.now()) {
      console.log(`Cache expired for key: ${key}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache hit for key: ${key}`);
    return cacheEntry.value;
  }

  async cacheData(key: string, value: any, expiryTime: number): Promise<void> {
    if (expiryTime <= Date.now()) {
      throw new Error("Expiry time must be a future timestamp.");
    }

    const cacheEntry: InsertCache = {
      key,
      value,
      expires: expiryTime.toString(), // Convert to string to match schema
    };

    this.cache.set(key, {
      id: this.cache.size + 1,
      ...cacheEntry,
    });

    console.log(`Cached data for key: ${key} with expiry: ${expiryTime}`);
  }

  async clearExpiredCache(): Promise<void> {
    const now = Date.now();
    let expiredCount = 0;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (Number(entry.expires) < now) {
        this.cache.delete(key);
        expiredCount++;
        console.log(`Cleared expired cache for key: ${key}`);
      }
    });

    if (expiredCount > 0) {
      console.log(`Cleared ${expiredCount} expired cache entries.`);
    }
  }

  stopCleanup(): void {
    clearInterval(this.cleanupInterval);
    console.log("Stopped periodic cache cleanup.");
  }
}

export const storage = new MemStorage();