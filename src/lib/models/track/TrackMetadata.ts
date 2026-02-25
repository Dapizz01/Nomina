export interface TrackMetadata {
    fileName: string;

    // Editable ID3 Tags
    title: string;
    artist: string;
    album: string;
    genre: string;
    year: number;
    track: number;

    // Read-only Audio Properties
    coverArtUrl: string;
    pictureData: Uint8Array | null;
    pictureMime: string;

    format: string;
    duration: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
    isUpscale: boolean | null;
}

export function createEmptyTrackMetadata(): TrackMetadata {
    return {
        fileName: "",
        title: "",
        artist: "",
        album: "",
        genre: "",
        year: 0,
        track: 0,
        coverArtUrl: "",
        pictureData: null,
        pictureMime: "",
        format: "",
        duration: 0,
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        isUpscale: null,
    };
}
