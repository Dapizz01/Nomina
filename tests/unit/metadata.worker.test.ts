import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { Buffer } from 'buffer';

const mockPostMessage = vi.fn();
(global as any).self = {
    postMessage: mockPostMessage,
};

// Mock ID3Writer
const mockSetFrame = vi.fn();
const mockAddTag = vi.fn();
vi.mock('browser-id3-writer', () => ({
    ID3Writer: class MockID3Writer {
        setFrame = mockSetFrame;
        addTag = mockAddTag;
        arrayBuffer = new ArrayBuffer(10); // Mock final buffer
        constructor() { }
    }
}));

// Mock Metaflac
const mockSetTag = vi.fn();
const mockImportPictureFromBuffer = vi.fn();
const mockSave = vi.fn(() => Buffer.from('mock-flac-data'));
vi.mock('metaflac-js', () => ({
    default: class MockMetaflac {
        tags = ['TITLE=OldTitle', 'ARTIST=OldArtist'];
        pictures = [];
        picturesSpecs = [];
        setTag = mockSetTag;
        importPictureFromBuffer = mockImportPictureFromBuffer;
        save = mockSave;
        constructor() { }
    }
}));

describe('metadata.worker', () => {

    beforeAll(async () => {
        // Import the worker module dynamically so that we can mock `self` first.
        await import('../../src/lib/workers/metadata.worker');
    });

    beforeEach(() => {
        mockPostMessage.mockClear();
        mockSetFrame.mockClear();
        mockAddTag.mockClear();
        mockSetTag.mockClear();
        mockImportPictureFromBuffer.mockClear();
        mockSave.mockClear();
    });

    it('should process MP3 files, set correct tags, and transfer memory ownership', async () => {
        const mp3File = new File(['dummy mp3 data'], 'song.mp3', { type: 'audio/mp3' });
        const mockHandle = {
            getFile: vi.fn(() => Promise.resolve(mp3File)),
            createWritable: vi.fn(() => Promise.resolve({
                write: vi.fn(),
                close: vi.fn()
            }))
        };

        await (self as any).onmessage({
            data: {
                type: 'WRITE',
                fileHandle: mockHandle,
                tags: { title: 'New Title', artist: 'New Artist', track: 5 },
                id: 'mp3-uuid'
            }
        });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const [message, transferOpts] = mockPostMessage.mock.calls[0];

        // Ensure ID3 tags were mapped and set correctly
        expect(mockSetFrame).toHaveBeenCalledWith('TIT2', 'New Title');
        expect(mockSetFrame).toHaveBeenCalledWith('TPE1', ['New Artist']);
        expect(mockSetFrame).toHaveBeenCalledWith('TRCK', '5');
        expect(mockAddTag).toHaveBeenCalledTimes(1);

        // Verify successful postMessage response
        expect(message.type).toBe('SUCCESS');
        expect(message.id).toBe('mp3-uuid');
        expect(message.data).toBeNull(); // No massive ArrayBuffer sent back!

        // VERIFY DISK WRITE OCCURRED IN THE WORKER
        expect(mockHandle.createWritable).toHaveBeenCalledTimes(1);
    });

    it('should process FLAC files, set correct tags, and transfer memory ownership', async () => {
        const flacFile = new File(['dummy flac data'], 'song.flac', { type: 'audio/flac' });
        const pictureArray = new Uint8Array([255, 0, 0]);
        const mockHandle = {
            getFile: vi.fn(() => Promise.resolve(flacFile)),
            createWritable: vi.fn(() => Promise.resolve({
                write: vi.fn(),
                close: vi.fn()
            }))
        };

        await (self as any).onmessage({
            data: {
                type: 'WRITE',
                fileHandle: mockHandle,
                tags: { title: 'New FLAC Title', album: 'Awesome Album', pictureData: pictureArray },
                id: 'flac-uuid'
            }
        });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const [message] = mockPostMessage.mock.calls[0];

        // Ensure Metaflac tags were mapped and set correctly
        expect(mockSetTag).toHaveBeenCalledWith('TITLE=New FLAC Title');
        expect(mockSetTag).toHaveBeenCalledWith('ALBUM=Awesome Album');
        expect(mockImportPictureFromBuffer).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledTimes(1);

        expect(message.type).toBe('SUCCESS');
        expect(message.id).toBe('flac-uuid');
        // No buffer sent back
        expect(message.data).toBeNull();

        // VERIFY DISK WRITE OCCURRED IN THE WORKER
        expect(mockHandle.createWritable).toHaveBeenCalledTimes(1);
    });

    it('should handle unsupported formats gracefully', async () => {
        const wavFile = new File(['dummy wav data'], 'song.wav', { type: 'audio/wav' });

        await (self as any).onmessage({
            data: {
                type: 'WRITE',
                fileHandle: { getFile: () => Promise.resolve(wavFile) },
                tags: { title: 'Wav Title' },
                id: 'wav-uuid'
            }
        });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const [message] = mockPostMessage.mock.calls[0];

        expect(message.type).toBe('ERROR');
        expect(message.error).toContain('Unsupported format');
        expect(message.id).toBe('wav-uuid');
    });

    it('should catch errors thrown during processing', async () => {
        // Mock save to throw
        mockSave.mockImplementationOnce(() => { throw new Error('Simulated write failure'); });

        const flacFile = new File(['dummy flac data'], 'song.flac');

        await (self as any).onmessage({
            data: {
                type: 'WRITE',
                fileHandle: { getFile: () => Promise.resolve(flacFile) },
                tags: { title: 'Broken' },
                id: 'fail-uuid'
            }
        });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const [message] = mockPostMessage.mock.calls[0];

        expect(message.type).toBe('ERROR');
        expect(message.error).toBe('Simulated write failure');
    });
});
