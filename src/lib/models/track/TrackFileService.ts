import type { WorkspaceTrack } from '../workspace/WorkspaceTrack';
import { metadataService } from "$lib/MetadataService";
import type { TrackMetadata } from './TrackMetadata';
import type { TrackDraft } from './TrackDraft.svelte';
import { AudioAnalyzer } from "../AudioAnalyzer";

export class TrackFileService {
    /**
     * Fully reads all metadata from a WorkspaceTrack and returns a pristine TrackMetadata object.
     */
    static async readFullMetadata(trackNode: WorkspaceTrack): Promise<TrackMetadata> {
        const file = await trackNode.handle.getFile();
        const metadata = await metadataService.read(file, 'FULL');

        return {
            fileName: file.name,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            genre: metadata.genre,
            year: metadata.year,
            track: metadata.track,
            coverArtUrl: metadata.coverArtUrl,
            pictureData: metadata.pictureData,
            pictureMime: metadata.pictureMime,
            format: metadata.format,
            duration: metadata.duration,
            bitrate: metadata.bitrate,
            sampleRate: metadata.sampleRate,
            channels: metadata.channels,
            isUpscale: null // Will be resolved by analyzeForUpscale separately
        };
    }

    /**
     * Checks if the Native File System Handle has write permission.
     */
    static async checkPermissions(handle: FileSystemFileHandle): Promise<boolean> {
        const opts = { mode: "readwrite" as FileSystemPermissionMode };
        if ((await handle.queryPermission(opts)) === "granted") {
            return true;
        }
        if ((await handle.requestPermission(opts)) === "granted") {
            return true;
        }
        return false;
    }

    /**
     * Saves the draft metadata back to the disk file represented by WorkspaceTrack.
     */
    static async saveTrack(trackNode: WorkspaceTrack, draft: TrackDraft): Promise<TrackMetadata> {
        draft.saving = true;
        try {
            const hasPermission = await this.checkPermissions(trackNode.handle);
            if (!hasPermission) {
                throw new Error("Write permission was denied by the user.");
            }

            const file = await trackNode.handle.getFile();

            // 1. Delegate heavy audio shifting and tag writing to the Web Worker
            const newAudioBytes = await metadataService.write(file, {
                title: draft.title,
                artist: draft.artist,
                album: draft.album,
                genre: draft.genre,
                year: draft.year,
                track: draft.track,
                pictureData: draft.pictureData,
                pictureMime: draft.pictureMime,
            });

            // 2. Obtain direct write-access from the browser to the OS File Handle
            const writable = await trackNode.handle.createWritable();

            // 3. Stream the new audio bytes over the old file, completely in-place.
            await writable.write(newAudioBytes);
            await writable.close();

            console.log(`[TrackFileService] Successfully saved metadata directly to disk.`);

            // Return the updated metadata
            return draft.toMetadata();
        } finally {
            draft.saving = false;
        }
    }

    /**
     * Spawns an AudioAnalyzer worker task for FFT generation on the given track.
     */
    static async analyzeForUpscale(trackNode: WorkspaceTrack, draft: TrackDraft) {
        const file = await trackNode.handle.getFile();
        const result = await AudioAnalyzer.checkIsUpscale(file, draft.duration);
        draft.isUpscale = result;

        // We update the pristine snapshot inside TrackDraft with the dynamically resolved value
        // to prevent it from resetting to null if another field is changed/saved.
        const updatedMetadata = draft.toMetadata();
        updatedMetadata.isUpscale = result;
        draft.updateSnapshot(updatedMetadata);
    }
}
