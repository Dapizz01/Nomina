import type { TrackMetadata } from '../models/track/TrackMetadata';

class TrackCache {
    /**
     * Map storing cached metadata objects.
     * The key is a composite of the file's native name and lastModified timestamp:
     * `{handle.name}_{file.lastModified}`
     * This ensures the cache automatically invalidates if the file is modified externally or internally.
     */
    private cache = new Map<string, TrackMetadata>();

    /**
     * Retrieves cached metadata if it exists and is fresh.
     */
    get(name: string, lastModified: number): TrackMetadata | undefined {
        const key = `${name}_${lastModified}`;
        console.log(`[TrackCache] Getting metadata for: ${key}`);
        return this.cache.get(key);
    }

    /**
     * Saves metadata to the cache. 
     * Heavy buffers (`pictureData`) are omitted intentionally to prevent memory bloat,
     * as this cache is primarily used for the lightweight File Explorer UI.
     */
    set(name: string, lastModified: number, metadata: TrackMetadata): void {
        const key = `${name}_${lastModified}`;

        // Strip heavy pictureData arrays if they exist to keep RAM usage low.
        // We only need the generated Blob coverArtUrl for thumbnail rendering.
        const lightweightMetadata = { ...metadata, pictureData: null };

        this.cache.set(key, lightweightMetadata);
        console.debug(`[TrackCache] Cached full metadata for: ${key}`);
    }

    /**
     * Explicitly clears the entire memory cache.
     */
    clear(): void {
        this.cache.clear();
        console.debug(`[TrackCache] Cache cleared explicitly.`);
    }
}

export const trackCache = new TrackCache();
