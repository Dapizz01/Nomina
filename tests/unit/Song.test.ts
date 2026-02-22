import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Song } from '../../src/lib/models/Song.svelte';
import { metadataService } from '../../src/lib/MetadataService';

// Mock MetadataService
vi.mock('../../src/lib/MetadataService', () => ({
    metadataService: {
        read: vi.fn(),
        write: vi.fn()
    }
}));

// Mock Audio & AudioContext for Upscale analysis
class MockAudioNode {
    connect = vi.fn();
    disconnect = vi.fn();
    gain = { value: 1 };
}

let mockFrequencyDataFill: (arr: Float32Array) => void;

class MockAnalyser extends MockAudioNode {
    fftSize = 2048;
    smoothingTimeConstant = 0.8;
    frequencyBinCount = 1024;
    getFloatFrequencyData = vi.fn((arr) => {
        if (mockFrequencyDataFill) {
            mockFrequencyDataFill(arr);
        } else {
            arr.fill(-100);
        }
    });
}

(global as any).window = Object.assign((global as any).window || {}, {
    AudioContext: class MockAudioContext {
        state = 'suspended';
        sampleRate = 44100;
        createMediaElementSource = vi.fn(() => new MockAudioNode());
        createAnalyser = vi.fn(() => new MockAnalyser());
        createGain = vi.fn(() => new MockAudioNode());
        resume = vi.fn(() => Promise.resolve());
        close = vi.fn(() => Promise.resolve());
        destination = new MockAudioNode();
    }
});

(global as any).Audio = class MockAudio {
    src = '';
    currentTime = 0;
    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
};

describe('Song.svelte.ts', () => {
    let mockFileHandle: any;
    let mockFile: File;

    beforeEach(() => {
        vi.clearAllMocks();
        global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = vi.fn();

        mockFile = new File(['mock content'], 'song.mp3', { type: 'audio/mp3' });
        mockFileHandle = {
            getFile: vi.fn(() => Promise.resolve(mockFile)),
            queryPermission: vi.fn(),
            requestPermission: vi.fn(),
            createWritable: vi.fn()
        };
        mockFrequencyDataFill = (arr) => arr.fill(-100);
    });

    it('should load safely from a file handle', async () => {
        vi.mocked(metadataService.read).mockResolvedValueOnce({
            title: 'Mock Title',
            artist: 'Mock Artist',
            album: 'Mock Album',
            genre: 'Jazz',
            year: 2024,
            track: 3,
            coverArtUrl: 'blob:mock-art',
            pictureData: null,
            pictureMime: '',
            format: 'mp3',
            duration: 200,
            bitrate: 128,
            sampleRate: 44100,
            channels: 2
        });

        const song = await Song.loadFromFileHandle(mockFileHandle);

        expect(mockFileHandle.getFile).toHaveBeenCalledTimes(1);
        expect(metadataService.read).toHaveBeenCalledWith(mockFile);

        expect(song.title).toBe('Mock Title');
        expect(song.artist).toBe('Mock Artist');
        expect(song.genre).toBe('Jazz');
        expect(song.bitrate).toBe(128);
    });

    it('should correctly verify read/write permissions', async () => {
        const song = new Song(mockFileHandle, mockFile);

        // Scenario 1: Already granted
        mockFileHandle.queryPermission.mockResolvedValueOnce('granted');
        expect(await song.verifyPermission()).toBe(true);

        // Scenario 2: Prompt required and user grants
        mockFileHandle.queryPermission.mockResolvedValueOnce('prompt');
        mockFileHandle.requestPermission.mockResolvedValueOnce('granted');
        expect(await song.verifyPermission()).toBe(true);
        expect(mockFileHandle.requestPermission).toHaveBeenCalledTimes(1);

        // Scenario 3: Prompt required and user denies
        mockFileHandle.queryPermission.mockResolvedValueOnce('prompt');
        mockFileHandle.requestPermission.mockResolvedValueOnce('denied');
        expect(await song.verifyPermission()).toBe(false);
    });

    it('should save metadata and stream it properly to file system', async () => {
        const song = new Song(mockFileHandle, mockFile);
        song.title = 'Saved Title';

        const mockWritable = {
            write: vi.fn(() => Promise.resolve()),
            close: vi.fn(() => Promise.resolve())
        };

        mockFileHandle.queryPermission.mockResolvedValueOnce('granted');
        mockFileHandle.createWritable.mockResolvedValueOnce(mockWritable);

        const mockArrayBuffer = new ArrayBuffer(5);
        vi.mocked(metadataService.write).mockResolvedValueOnce(mockArrayBuffer);

        await song.save();

        expect(metadataService.write).toHaveBeenCalledWith(mockFile, expect.objectContaining({
            title: 'Saved Title'
        }));
        expect(mockWritable.write).toHaveBeenCalledWith(mockArrayBuffer);
        expect(mockWritable.close).toHaveBeenCalledTimes(1);

        // Ensure the internal cached File object is refreshed to reflect OS changes
        expect(mockFileHandle.getFile).toHaveBeenCalledTimes(1);
    });

    it('should fail to save if permissions are denied', async () => {
        const song = new Song(mockFileHandle, mockFile);
        mockFileHandle.queryPermission.mockResolvedValueOnce('denied');
        mockFileHandle.requestPermission.mockResolvedValueOnce('denied');

        await expect(song.save()).rejects.toThrow('Write permission was denied by the user.');
        expect(metadataService.write).not.toHaveBeenCalled();
    });

    it('should destroy Object URLs', () => {
        const song = new Song(mockFileHandle, mockFile);
        song.coverArtUrl = 'blob:something';
        song.destroy();

        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:something');
        expect(song.coverArtUrl).toBe('');
    });

    it('should analyze for upscales correctly - genuine file', async () => {
        const song = new Song(mockFileHandle, mockFile);
        song.duration = 100;

        mockFrequencyDataFill = (arr) => {
            arr.fill(-100);
            // Fill mid bands (index 93-464, roughly 2-10kHz) with strong signals
            // Fill high bands (index 767-928, roughly 16.5-20kHz) with normal harmonic decay
            for (let i = 93; i < 464; i++) arr[i] = -20;
            for (let i = 767; i < 928; i++) arr[i] = -30;
        };

        await song.analyzeForUpscale();

        // High/Mid ratio should definitely be > 0.02
        expect(song.isUpscale).toBe(false);
    });

    it('should analyze for upscales correctly - fake upscale file', async () => {
        const song = new Song(mockFileHandle, mockFile);
        song.duration = 100;

        mockFrequencyDataFill = (arr) => {
            arr.fill(-100);
            // Fill mid bands normally
            for (let i = 93; i < 464; i++) arr[i] = -10;
            // Silent upper bands (sharp frequency cliff)
            for (let i = 767; i < 928; i++) arr[i] = -120;
        };

        await song.analyzeForUpscale();

        // Complete silence above 16.5kHz should trigger upscale flag
        expect(song.isUpscale).toBe(true);
    });
});
