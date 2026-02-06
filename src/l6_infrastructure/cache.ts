/**
 * Infrastructure - Cache Service
 * 缓存服务接口与 Mock 实现
 */

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
}

export class RedisCacheService implements ICacheService {
  private static instance: RedisCacheService;
  private storage: Map<string, { value: any; expiry: number }> = new Map();

  private constructor() {
    console.log('[Infra] RedisCacheService initialized (Mock Mode)');
  }

  public static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.storage.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.storage.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.storage.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async flush(): Promise<void> {
    this.storage.clear();
  }
}

export const cache = RedisCacheService.getInstance();
