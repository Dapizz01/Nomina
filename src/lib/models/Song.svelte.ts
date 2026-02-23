import { metadataService } from "../MetadataService";
import { AudioAnalyzer } from "./AudioAnalyzer";

export class Song {
    /** The directory or file handle object from the File System Access API. */
    fileHandle: any = null;
    /** The actual File blob read from disk. */
    file: File | null = $state(null);
    /** Derived reactive property for the song's original filename. */
    name: string = $derived(this.file ? this.file.name : (this.fileHandle?.name || ""));

    // Editable Metadata
    title = $state("");
    artist = $state("");
    album = $state("");
    genre = $state("");
    year = $state(0);
    track = $state(0);

    // Read-only Audio Properties
    /** Blob URL pointing to the loaded cover art image */
    coverArtUrl = $state("");
    /** Raw bytes of the image file */
    pictureData: Uint8Array | null = null;
    /** MIME type of the pictureData (e.g. image/jpeg) */
    pictureMime = "";
    /** The audio format codec (e.g. FLAC, MP3) */
    format = $state("");
    /** Length of the audio track in seconds */
    duration = $state(0);
    /** Average bitrate of the file */
    bitrate = $state(0);
    /** Audio sample rate in Hz */
    sampleRate = $state(0);
    /** Number of audio channels */
    channels = $state(0);
    /** Whether the FFT analysis detected a fake upscale */
    isUpscale = $state<boolean | null>(null);

    // State flags
    /** Flag indicating a save operation is in progress */
    saving = $state(false);
    /** Flag indicating basic metadata has been read */
    isMetadataLoaded = $state(false);
    /** Flag indicating an async metadata read is currently active */
    isLoadingMetadata = $state(false);

    constructor(fileHandle: any, file?: File) {
        this.fileHandle = fileHandle;
        if (file) {
            this.file = file;
        }
    }

    static async loadFromFileHandle(fileHandle: any): Promise<Song> {
        const file = await fileHandle.getFile();
        const song = new Song(fileHandle, file);
        await song.readMetadata();
        return song;
    }

    async loadMetadataIfNeeded(skipAnalysis = false) {
        if (this.isMetadataLoaded || this.isLoadingMetadata) return;
        this.isLoadingMetadata = true;
        try {
            if (!this.file) {
                this.file = await this.fileHandle.getFile();
            }
            await this.readMetadata(skipAnalysis);
            this.isMetadataLoaded = true;
        } catch (error) {
            console.error("[Song] Failed to load metadata on demand", error);
        } finally {
            this.isLoadingMetadata = false;
        }
    }

    async readMetadata(skipAnalysis = false) {
        try {
            const metadata = await metadataService.read(this.file!);
            this.title = metadata.title;
            this.artist = metadata.artist;
            this.album = metadata.album;
            this.genre = metadata.genre;
            this.year = metadata.year;
            this.track = metadata.track;
            this.coverArtUrl = metadata.coverArtUrl;
            this.pictureData = metadata.pictureData;
            this.pictureMime = metadata.pictureMime;
            this.format = metadata.format;
            this.duration = metadata.duration;
            this.bitrate = metadata.bitrate;
            this.sampleRate = metadata.sampleRate;
            this.channels = metadata.channels;

            // Trigger background upscale analysis if appropriate and not skipped
            if (!skipAnalysis && (this.bitrate >= 256 || this.format === 'flac')) {
                this.analyzeForUpscale();
            }
        } catch (error) {
            console.error("[Song] Failed to read metadata", error);
            throw error;
        }
    }

    async analyzeForUpscale() {
        if (!this.file) return;
        this.isUpscale = await AudioAnalyzer.checkIsUpscale(this.file, this.duration);
    }

    async verifyPermission() {
        const opts = { mode: "readwrite" };
        if ((await this.fileHandle.queryPermission(opts)) === "granted") {
            return true;
        }
        if ((await this.fileHandle.requestPermission(opts)) === "granted") {
            return true;
        }
        return false;
    }

    destroy() {
        if (this.coverArtUrl) {
            URL.revokeObjectURL(this.coverArtUrl);
            this.coverArtUrl = "";
        }
    }

    async save() {
        try {
            this.saving = true;

            // The browser requires "User Activation" (a button click) to request permissions.
            const hasPermission = await this.verifyPermission();
            if (!hasPermission) {
                throw new Error("Write permission was denied by the user.");
            }

            // 1. Delegate heavy audio shifting and tag writing to the Web Worker
            const newAudioBytes = await metadataService.write(this.file!, {
                title: this.title,
                artist: this.artist,
                album: this.album,
                genre: this.genre,
                year: this.year,
                track: this.track,
                pictureData: this.pictureData,
                pictureMime: this.pictureMime,
            });

            // 2. Obtain direct write-access from the browser to the OS File Handle
            const writable = await this.fileHandle.createWritable();

            // 3. Stream the new audio bytes over the old file, completely in-place.
            await writable.write(newAudioBytes);
            await writable.close();

            console.log(`[Song] Successfully saved metadata directly to disk.`);

            // 4. Update the cached File since the disk contents physically changed
            this.file = await this.fileHandle.getFile();
        } finally {
            this.saving = false;
        }
    }
}
