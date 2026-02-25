import type { WorkspaceNode } from './WorkspaceNode';
import { metadataService } from "$lib/MetadataService";

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
            // Default argument is 'THUMBNAIL', extracting a fast 512px downscaled buffer
            const data = await metadataService.read(file);

            this.title = data.title;
            this.artist = data.artist;
            this.thumbnailUrl = data.coverArtUrl;

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
