import type { WorkspaceNode } from './WorkspaceNode';
import { metadataService } from "$lib/services/MetadataService";
import { trackCache } from "$lib/services/TrackCache";

export class WorkspaceTrack implements WorkspaceNode {
    name: string;
    handle: FileSystemFileHandle;
    isLoaded: boolean = false;
    isLoading: boolean = false;

    // Lazy-loaded UI properties
    title: string = "";
    artist: string = "";
    thumbnailUrl: string = "";

    constructor(handle: FileSystemFileHandle) {
        this.name = handle.name;
        this.handle = handle;
    }

    async getChildren(): Promise<WorkspaceNode[]> {
        return [];
    }

    /**
     * Reads lightweight thumbnail metadata to display on the explorer grid.
     */
    async loadBasicMetadata() {
        if (this.isLoaded || this.isLoading) return;
        this.isLoading = true;

        try {
            const file = await this.handle.getFile();

            // Check in-memory cache to prevent redundant disk I/O and CPU worker bloat
            const cachedMetadata = trackCache.get(this.name, file.lastModified);
            if (cachedMetadata) {
                this.title = cachedMetadata.title;
                this.artist = cachedMetadata.artist;
                this.thumbnailUrl = cachedMetadata.coverArtUrl;
                this.isLoaded = true;
                return;
            }

            // Default argument is 'THUMBNAIL', extracting a fast 512px downscaled buffer
            const data = await metadataService.read(file);

            // Populate UI state
            this.title = data.title;
            this.artist = data.artist;
            this.thumbnailUrl = data.coverArtUrl;

            // Save full snapshot to memory cache for instantaneous future loads
            trackCache.set(this.name, file.lastModified, {
                fileName: file.name,
                title: data.title,
                artist: data.artist,
                album: data.album,
                genre: data.genre,
                year: data.year,
                track: data.track,
                coverArtUrl: data.coverArtUrl,
                pictureData: data.pictureData,
                pictureMime: data.pictureMime,
                format: data.format,
                duration: data.duration,
                bitrate: data.bitrate,
                sampleRate: data.sampleRate,
                channels: data.channels,
                isUpscale: null
            });

            this.isLoaded = true;
        } catch (error) {
            console.error(`[WorkspaceTrack] Failed to load thumbnail metadata for ${this.name}`, error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Checks equality with another handle. Used for deduplication in Workspace root.
     */
    async isSameEntry(otherHandle: FileSystemHandle): Promise<boolean> {
        // @ts-ignore
        if (this.handle.isSameEntry) {
            // @ts-ignore
            return await this.handle.isSameEntry(otherHandle);
        }
        return this.name === otherHandle.name;
    }
}
