import type { TrackMetadata } from './TrackMetadata';

export class TrackDraft {
    // Editable Metadata (UI bound)
    fileName = $state("");
    title = $state("");
    artist = $state("");
    album = $state("");
    genre = $state("");
    year = $state(0);
    track = $state(0);
    coverArtUrl = $state("");

    // Read-only Audio Properties exposed to UI
    pictureData: Uint8Array | null = null;
    pictureMime = "";
    format = "";
    duration = 0;
    bitrate = 0;
    sampleRate = 0;
    channels = 0;
    isUpscale = $state<boolean | null>(null);

    // Pristine snapshot for diffing
    #snapshot: TrackMetadata;

    // State flags
    saving = $state(false);
    isMetadataLoaded = $state(false);

    constructor(metadata: TrackMetadata) {
        this.#snapshot = metadata;
        this.resetToSnapshot();
        this.isMetadataLoaded = true;
    }

    /**
     * Resets all editable fields to match the pristine snapshot.
     */
    resetToSnapshot() {
        this.fileName = this.#snapshot.fileName;
        this.title = this.#snapshot.title;
        this.artist = this.#snapshot.artist;
        this.album = this.#snapshot.album;
        this.genre = this.#snapshot.genre;
        this.year = this.#snapshot.year;
        this.track = this.#snapshot.track;
        this.coverArtUrl = this.#snapshot.coverArtUrl;

        this.pictureData = this.#snapshot.pictureData;
        this.pictureMime = this.#snapshot.pictureMime;
        this.format = this.#snapshot.format;
        this.duration = this.#snapshot.duration;
        this.bitrate = this.#snapshot.bitrate;
        this.sampleRate = this.#snapshot.sampleRate;
        this.channels = this.#snapshot.channels;
        this.isUpscale = this.#snapshot.isUpscale;
    }

    /**
     * Updates the pristine snapshot with new data (e.g. after a successful save)
     * and resets the draft to match.
     */
    updateSnapshot(newMetadata: TrackMetadata) {
        this.#snapshot = newMetadata;
        this.resetToSnapshot();
    }

    /**
     * Returns a key-value map of only the fields that have been modified from their initial parsed state.
     */
    getChanges() {
        const changes: Record<string, { old: any; new: any }> = {};
        const keys = ["title", "artist", "album", "genre", "year", "track"] as const;
        for (const key of keys) {
            // @ts-ignore
            if (this[key] !== this.#snapshot[key]) {
                // @ts-ignore
                changes[key] = { old: this.#snapshot[key], new: this[key] };
            }
        }
        return changes;
    }

    /**
     * Retrieves the URL of the pristine cover art layout before edits. 
     * Used to prevent the UI from accidentally garbage collecting the diff clone's image source.
     */
    getSnapshotCoverArtUrl() {
        return this.#snapshot.coverArtUrl;
    }

    /**
     * Creates a Dummy clone of the Draft that simply holds the pristine snapshot's data. 
     * This is used exactly like createSnapshotClone() in the old implementation for binding to Diff modals.
     */
    createSnapshotClone(): TrackDraft {
        return new TrackDraft(this.#snapshot);
    }

    /**
     * Merges current draft changes into a single Metadata object for saving.
     */
    toMetadata(): TrackMetadata {
        return {
            fileName: this.fileName,
            title: this.title,
            artist: this.artist,
            album: this.album,
            genre: this.genre,
            year: this.year,
            track: this.track,
            coverArtUrl: this.coverArtUrl,
            pictureData: this.pictureData,
            pictureMime: this.pictureMime,
            format: this.format,
            duration: this.duration,
            bitrate: this.bitrate,
            sampleRate: this.sampleRate,
            channels: this.channels,
            isUpscale: this.isUpscale,
        };
    }
}
