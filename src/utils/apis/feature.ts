
interface FetchFeatureFlagsParams {
    featureFlagNames: string[];
    publicKey?: string;
    appId?: string;
    providerId?: string;
    sessionId?: string;
}

interface FeatureFlagResponse {
    name: string;
    value: boolean | string | number;
    type: 'boolean' | 'string' | 'number';
}

const fetchFeatureFlagsFromServer = async ({
    featureFlagNames,
    publicKey,
    appId,
    providerId,
    sessionId,
}: FetchFeatureFlagsParams): Promise<Record<string, boolean | string | number>> => {
    const queryParams = new URLSearchParams();

    if (publicKey) queryParams.append('publicKey', publicKey);
    featureFlagNames.forEach(name => queryParams.append('featureFlagNames', name));
    if (appId) queryParams.append('appId', appId);
    if (providerId) queryParams.append('providerId', providerId);
    if (sessionId) queryParams.append('sessionId', sessionId);

    try {
        const response = await fetch(
            `https://api.reclaimprotocol.org/api/feature-flags/get?${queryParams.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.ok) {
            const responseData = await response.json() as FeatureFlagResponse[];
            const featureFlags: Record<string, boolean | string | number> = {};

            for (const flag of responseData) {
                const flagName = flag.name;
                const flagValue = flag.value;

                if (flag.type === 'boolean') {
                    featureFlags[flagName] = typeof flagValue === 'boolean' ? flagValue : false;
                } else if (flag.type === 'string') {
                    featureFlags[flagName] = typeof flagValue === 'string' ? flagValue : '';
                } else if (flag.type === 'number') {
                    featureFlags[flagName] = typeof flagValue === 'number' ? flagValue : 0;
                }
            }

            return featureFlags;
        } else {
            throw new Error(`Failed to load feature flags: ${response.status}`);
        }
    } catch (e) {
        console.error('Error fetching feature flags:', e);
        return {};
    }
};

interface CachedFeatureFlags {
    data: Record<string, boolean | string | number>;
    timestamp: number;
}

const CACHE_KEY_PREFIX = 'reclaim_feature_flags';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

const getFeatureFlagsBy = async (
    params: FetchFeatureFlagsParams
): Promise<Record<string, boolean | string | number>> => {
    const cacheKey = `${CACHE_KEY_PREFIX}_${params.featureFlagNames.join('_')}_${params.appId || ''}_${params.providerId || ''}_${params.sessionId || ''}`;

    try {
        const cachedData = InternalCacheProvider.provide().getItem(cacheKey);
        if (cachedData) {
            const parsed: CachedFeatureFlags = JSON.parse(cachedData);
            const now = Date.now();

            // If cache is less than 1 hour old, return cached data
            if (now - parsed.timestamp < CACHE_DURATION) {
                console.log('Using cached feature flags');
                return parsed.data;
            }
        }
    } catch (e) {
        console.error('Error reading cached feature flags:', e);
    }

    const featureFlags = await fetchFeatureFlagsFromServer(params);

    try {
        const cacheData: CachedFeatureFlags = {
            data: featureFlags,
            timestamp: Date.now(),
        };
        InternalCacheProvider.provide().setItem(cacheKey, JSON.stringify(cacheData));
    } catch (e) {
        console.error('Error caching feature flags:', e);
    }

    return featureFlags;
};

interface InternalCache {
    getItem(key: string): string | null

    setItem(key: string, value: string): void

    removeItem(key: string): void;
}

class InMemoryCache implements InternalCache {
    storage: Record<string, string> = {}

    getItem(key: string): string | null {
        return this.storage[key];
    }

    setItem(key: string, value: string): void {
        this.storage[key] = value.toString();
    }

    removeItem(key: string): void {
        delete this.storage[key];
    }
}

class InternalCacheProvider {
    private static inMemory = new InMemoryCache();

    static provide(): InternalCache {
        if ('localStorage' in globalThis) {
            return globalThis.localStorage;
        }
        return this.inMemory;
    }

}


export class Features {
    private constructor() { }

    static isNewLinkingEnabled = async (config: {
        applicationId: string,
        providerId: string,
        sessionId?: string,
    }) => {
        try {
            const featureFlags = await fetchFeatureFlagsFromServer({
                featureFlagNames: ["newLinkingAndroid"],
                appId: config?.applicationId,
                providerId: config?.providerId,
                sessionId: config?.sessionId,
            });

            return featureFlags.newLinkingAndroid === true;
        } catch (error) {
            console.error("Error checking feature flag:", error);
            return false;
        }
    };

    static isFirstAttemptToLaunchAppClip = () => {
        const storage = InternalCacheProvider.provide();
        const d = new Date();
        const key = `isFirstAttemptToLaunchAppClip:${d.toDateString()}`;
        const value = storage.getItem(key);
        storage.setItem(key, 'true');
        return value == 'true';
    }
}