import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metadataService } from '../../src/lib/services/MetadataService';
// We no longer mock music-metadata natively because it's in a worker

describe('MetadataService', () => {
    let mockWorker: any;

    beforeEach(() => {
        global.URL.createObjectURL = vi.fn(() => 'mock-url');

        // Reset singleton
        (metadataService as any).worker = null;

        let uuidCounter = 0;
        Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            value: {
                randomUUID: () => `uuid-${uuidCounter++}`
            }
        });

        mockWorker = {
            postMessage: vi.fn(),
            onmessage: null,
            onerror: null
        };
        const WorkerMock = vi.fn(function () { return mockWorker; });
        global.Worker = WorkerMock as any;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });
    it('should read metadata correctly', async () => {
        const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });

        const readPromise = metadataService.read(file);

        // Simulate worker sending back the parsed metadata object
        const mockWorkerData = {
            title: 'Test Title',
            artist: 'Test Artist',
            album: 'Test Album',
            genre: 'Test Genre',
            year: 2023,
            track: 1,
            pictureData: new Uint8Array([1, 2, 3]),
            pictureMime: 'image/jpeg',
            format: 'MPEG',
            duration: 120,
            bitrate: 320,
            sampleRate: 44100,
            channels: 2
        };

        mockWorker.onmessage?.({
            data: { id: 'uuid-0', type: 'SUCCESS', data: mockWorkerData }
        });

        const result = await readPromise;

        expect(result.title).toBe('Test Title');
        expect(result.artist).toBe('Test Artist');
        expect(result.album).toBe('Test Album');
        expect(result.genre).toBe('Test Genre');
        expect(result.year).toBe(2023);
        expect(result.track).toBe(1);
        expect(result.coverArtUrl).toBe('mock-url');
        expect(result.format).toBe('MPEG');
        expect(result.duration).toBe(120);
        expect(result.bitrate).toBe(320);
        expect(result.sampleRate).toBe(44100);
        expect(result.channels).toBe(2);
    });

    it('should resolve write requests successfully', async () => {
        const mockHandle = {
            getFile: vi.fn(),
            createWritable: vi.fn()
        } as unknown as FileSystemFileHandle;

        const writePromise = metadataService.write(mockHandle, { title: 'New Title' });

        // Resolve manually by triggering worker's onmessage
        mockWorker.onmessage?.({
            data: { id: 'uuid-0', type: 'SUCCESS', data: null }
        });

        const result = await writePromise;
        expect(result).toBeNull();
    });

    it('should reject write requests on error', async () => {
        const mockHandle = {} as FileSystemFileHandle;
        const writePromise = metadataService.write(mockHandle, { title: 'New Title' });

        mockWorker.onmessage?.({
            data: { id: 'uuid-0', type: 'ERROR', error: 'Worker failed' }
        });

        await expect(writePromise).rejects.toThrow('Worker failed');
    });

    it('should initialize a single worker instance', async () => {
        const mockHandle = {} as FileSystemFileHandle;

        const p1 = metadataService.write(mockHandle, {});
        const p2 = metadataService.write(mockHandle, {});

        // Single Worker instance created
        expect(global.Worker).toHaveBeenCalledTimes(1);

        mockWorker.onmessage?.({ data: { id: 'uuid-0', type: 'SUCCESS', data: null } });
        mockWorker.onmessage?.({ data: { id: 'uuid-1', type: 'SUCCESS', data: null } });
        await p1;
        await p2;
    });
});
