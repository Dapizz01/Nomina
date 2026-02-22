import { metadataService } from "../MetadataService";

export class Song {
    fileHandle: any;
    file: File;

    // Editable Metadata
    title = $state("");
    artist = $state("");
    album = $state("");
    genre = $state("");
    year = $state(0);
    track = $state(0);

    // Read-only Audio Properties
    coverArtUrl = $state("");
    pictureData: Uint8Array | null = null;
    pictureMime = "";
    format = $state("");
    duration = $state(0);
    bitrate = $state(0);
    sampleRate = $state(0);
    channels = $state(0);
    isUpscale = $state<boolean | null>(null);

    // State flags
    saving = $state(false);

    constructor(fileHandle: any, file: File) {
        this.fileHandle = fileHandle;
        this.file = file;
    }

    static async loadFromFileHandle(fileHandle: any): Promise<Song> {
        const file = await fileHandle.getFile();
        const song = new Song(fileHandle, file);
        await song.readMetadata();
        return song;
    }

    async readMetadata() {
        try {
            const metadata = await metadataService.read(this.file);
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

            // Trigger background upscale analysis if appropriate
            if (this.bitrate >= 256 || this.format === 'flac') {
                this.analyzeForUpscale();
            }
        } catch (error) {
            console.error("[Song] Failed to read metadata", error);
            throw error;
        }
    }

    async analyzeForUpscale() {
        try {
            const audioUrl = URL.createObjectURL(this.file);
            const audioEl = new Audio(audioUrl);

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(audioEl);
            const analyser = audioCtx.createAnalyser();
            const gainNode = audioCtx.createGain();

            // Mute the audio so the user doesn't hear the scan playback
            gainNode.gain.value = 0;

            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.2; // Fast response

            source.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Start around 30% into the song
            const seekTime = Math.max(0, this.duration * 0.3);
            audioEl.currentTime = seekTime;

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            await audioEl.play();

            // Let it play for a bit to gather FFT data
            await new Promise(resolve => setTimeout(resolve, 800));

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            analyser.getFloatFrequencyData(dataArray);

            // Stop playback and cleanup immediately
            audioEl.pause();
            audioEl.src = "";
            audioCtx.close();
            URL.revokeObjectURL(audioUrl);

            const sampleRate = audioCtx.sampleRate;
            const nyquist = sampleRate / 2;

            // Compare high bands (>16.5kHz) to mid bands (2kHz - 10kHz)
            let highBandEnergy = 0;
            let highBandCount = 0;
            let midBandEnergy = 0;
            let midBandCount = 0;

            for (let i = 0; i < bufferLength; i++) {
                const freq = (i / bufferLength) * nyquist;
                const db = dataArray[i];

                // WebAudio dB is usually -100 to 0 (sometimes lower). Transform it to a linear-like positive scale.
                // We use Math.pow to emphasize louder peaks and minimize noise floor.
                const energy = Math.pow(10, db / 20);

                if (freq > 16500 && freq < 20000) {
                    highBandEnergy += energy;
                    highBandCount++;
                } else if (freq > 2000 && freq < 10000) {
                    midBandEnergy += energy;
                    midBandCount++;
                }
            }

            if (highBandCount > 0 && midBandCount > 0) {
                const avgHigh = highBandEnergy / highBandCount;
                const avgMid = midBandEnergy / midBandCount;

                if (avgMid < 0.0001) {
                    console.warn(`[Song] FFT read silence (Mid: ${avgMid}). AudioContext might be blocked or file is silent at ${seekTime}s.`);
                    this.isUpscale = null;
                    return;
                }

                // Instead of absolute db thresholds which break depending on the volume of the song,
                // we look at the raw ratio between the high band and mid band.
                // Fakes typically completely flatline above 16kHz, resulting in ratios < 0.05
                // Genuine tracks typically maintain a steady harmonic decay, resulting in ratios > 0.1
                const ratio = avgHigh / avgMid;

                if (ratio < 0.02) {
                    this.isUpscale = true; // Strong probability of upscale (sharp frequency cliff)
                } else {
                    this.isUpscale = false;
                }

                console.log(`[Song] Analyzed for upscale. Mid: ${avgMid.toExponential(2)}, High: ${avgHigh.toExponential(2)}, Ratio: ${ratio.toFixed(4)}, Result: ${this.isUpscale ? 'Upscale' : 'Genuine'}`);
            }

        } catch (error) {
            console.error("[Song] Failed to analyze for upscaling", error);
            this.isUpscale = false; // Fallback
        }
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
            const newAudioBytes = await metadataService.write(this.file, {
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
