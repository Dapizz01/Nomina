import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackCache } from '../../src/lib/services/TrackCache';
import { createEmptyTrackMetadata } from '../../src/lib/models/track/TrackMetadata';

describe('TrackCache', () => {

    beforeEach(() => {
        trackCache.clear();
    });

    it('should store and retrieve lightweight metadata correctly', () => {
        const mockMetadata = createEmptyTrackMetadata();
        mockMetadata.title = "Test Song";
        mockMetadata.artist = "Test Artist";
        mockMetadata.fileName = "song.mp3";
        mockMetadata.pictureData = new Uint8Array([255, 0, 0]); // Simulate heavy array

        const mockLastModified = 1716942000000;

        trackCache.set("song.mp3", mockLastModified, mockMetadata);

        const cached = trackCache.get("song.mp3", mockLastModified);

        expect(cached).toBeDefined();
        if (!cached) return;

        expect(cached.title).toBe("Test Song");
        expect(cached.artist).toBe("Test Artist");

        // RAM protection: ensuring the heavy picture array is NOT cached.
        expect(cached.pictureData).toBeNull();
    });

    it('should invalidate cache if lastModified timestamp changes', () => {
        const mockMetadata = createEmptyTrackMetadata();
        mockMetadata.title = "Stale Song";

        const oldTimestamp = 10000;
        const newTimestamp = 20000; // Simulating file edit

        trackCache.set("song.mp3", oldTimestamp, mockMetadata);

        // Attempting to hit the cache with the new timestamp should return undefined
        const miss = trackCache.get("song.mp3", newTimestamp);
        expect(miss).toBeUndefined();

        // The old timestamp still exists in memory until cleared, but the app won't use it.
        const hit = trackCache.get("song.mp3", oldTimestamp);
        expect(hit).toBeDefined();
    });

    it('should clear all entries', () => {
        const mockMetadata = createEmptyTrackMetadata();
        trackCache.set("a.mp3", 100, mockMetadata);
        trackCache.set("b.mp3", 200, mockMetadata);

        expect(trackCache.get("a.mp3", 100)).toBeDefined();

        trackCache.clear();

        expect(trackCache.get("a.mp3", 100)).toBeUndefined();
        expect(trackCache.get("b.mp3", 200)).toBeUndefined();
    });
});
