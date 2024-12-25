import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

export class Cache {
    private static instance: Cache;
    private memoryCache: Map<string, CacheItem<any>>;
    private readonly CACHE_DURATION = 5 * 60 * 1000;

    private constructor() {
        this.memoryCache = new Map();
    }

    public static getInstance(): Cache {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }
        return Cache.instance;
    }

    private generateKey(namespace: string, key: string): string {
        return `${namespace}:${key}`;
    }

    async get<T>(namespace: string, key: string): Promise<T | null> {
        const fullKey = this.generateKey(namespace, key);

        const memoryItem = this.memoryCache.get(fullKey);
        if (memoryItem && Date.now() - memoryItem.timestamp < this.CACHE_DURATION) {
            return memoryItem.data as T;
        }

        try {
            const stored = await AsyncStorage.getItem(fullKey);
            if (stored) {
                const item: CacheItem<T> = JSON.parse(stored);
                if (Date.now() - item.timestamp < this.CACHE_DURATION) {
                    this.memoryCache.set(fullKey, item);
                    return item.data;
                }
            }
        } catch (err) {
            console.error('Cache read error: ', err);
        }
        return null;
    }

    async set<T>(namespace: string, key: string, data: T): Promise<void> {
        const fullKey = this.generateKey(namespace, key);
        const item: CacheItem<T> = {
            data,
            timestamp: Date.now()
        };

        this.memoryCache.set(fullKey, item);

        try {
            await AsyncStorage.setItem(fullKey, JSON.stringify(item));
        } catch (err) {
            console.error('Cache write error: ', err);
        }
    }

    async invalidate(namespace: string, key?: string): Promise<void> {
        if (key) {
            const fullKey = this.generateKey(namespace, key);
            this.memoryCache.delete(fullKey);
            await AsyncStorage.removeItem(fullKey);
        } else {
            const keysToRemove: string[] = [];
            this.memoryCache.forEach((_, k) => {
                if (k.startsWith(`${namespace}:`)) {
                    keysToRemove.push(k);
                }
            });
            keysToRemove.forEach(k => this.memoryCache.delete(k));

            const allKeys = await AsyncStorage.getAllKeys();
            const namespaceKeys = allKeys.filter(k => k.startsWith(`${namespace}:`));
            await AsyncStorage.multiRemove(namespaceKeys);
        }
    }
}

export const CACHE_KEYS = {
    PROFILE: 'profile',
    POST: 'post',
    RUN: 'run',
    FEED: 'feed',
    USER_STATS: 'user_stats'
} as const;

export type CacheNamespace = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

export function getProfileCacheKey(userId: string): string {
    return `${CACHE_KEYS.PROFILE}:${userId}`;
}

export function getPostCacheKey(postId: string): string {
    return `${CACHE_KEYS.POST}:${postId}`;
}

export function getRunCacheKey(runId: string): string {
    return `${CACHE_KEYS.RUN}:${runId}`;
}

export function getFeedCacheKey(userId: string, page?: number): string {
    return `${CACHE_KEYS.FEED}:${userId}${page ? `:${page}` : ''}`;
}

export function getUserStatsCacheKey(userId: string): string {
    return `${CACHE_KEYS.USER_STATS}:${userId}`;
}

export const cache = Cache.getInstance();