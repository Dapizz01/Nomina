import { Buffer } from 'buffer';

// Polyfill Buffer for metaflac-js in the Web Worker environment
if (typeof (globalThis as any).Buffer === 'undefined') {
    (globalThis as any).Buffer = Buffer;
}

// @ts-ignore
import Metaflac from 'metaflac-js';
// @ts-ignore
import { ID3Writer } from 'browser-id3-writer';

export type WorkerMessage =
    | { type: 'WRITE'; file: File; tags: Record<string, any>; id: string };

export type WorkerResponse =
    | { type: 'SUCCESS'; data: ArrayBuffer; id: string }
    | { type: 'ERROR'; error: string; id: string };

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, file, id } = e.data;

    try {
        if (type === 'WRITE') {
            const { tags } = e.data;
            const fileBuffer = await file.arrayBuffer();
            const format = file.name.split('.').pop()?.toLowerCase();

            let finalBuffer: ArrayBuffer;

            if (format === 'flac') {
                const nodeBuffer = Buffer.from(fileBuffer);
                const flac = new Metaflac(nodeBuffer);

                // metaflac-js uses strict case-sensitive filtering in removeTag()
                // meaning 'Title' won't be deleted if we flac.removeTag('TITLE').
                // This creates duplicate tags which music-metadata later reads instead of the new ones.
                // We manually filter tags case-insensitively before applying new ones.
                const newTags = {
                    TITLE: tags.title,
                    ARTIST: tags.artist,
                    ALBUM: tags.album,
                    GENRE: tags.genre,
                    DATE: tags.year,
                    TRACKNUMBER: tags.track,
                };

                flac.tags = flac.tags.filter((item: string) => {
                    const key = item.split('=')[0].toUpperCase();
                    if (newTags[key as keyof typeof newTags] !== undefined) {
                        return false;
                    }
                    return true;
                });

                if (tags.title) flac.setTag(`TITLE=${tags.title}`);
                if (tags.artist) flac.setTag(`ARTIST=${tags.artist}`);
                if (tags.album) flac.setTag(`ALBUM=${tags.album}`);
                if (tags.genre) flac.setTag(`GENRE=${tags.genre}`);
                if (tags.year) flac.setTag(`DATE=${tags.year}`);
                if (tags.track) flac.setTag(`TRACKNUMBER=${tags.track}`);

                // Update the FLAC picture block
                if (tags.pictureData) {
                    flac.pictures = [];
                    flac.picturesSpecs = [];
                    flac.importPictureFromBuffer(Buffer.from(tags.pictureData));
                }

                const savedBuffer = flac.save() as Buffer;
                // Convert Node Buffer safely back to a transferable ArrayBuffer
                finalBuffer = savedBuffer.buffer.slice(
                    savedBuffer.byteOffset,
                    savedBuffer.byteOffset + savedBuffer.byteLength
                );
            } else if (format === 'mp3') {
                const writer = new ID3Writer(fileBuffer);
                if (tags.title !== undefined) writer.setFrame('TIT2', tags.title);
                if (tags.artist !== undefined) writer.setFrame('TPE1', [tags.artist]);
                if (tags.album !== undefined) writer.setFrame('TALB', tags.album);
                if (tags.genre !== undefined) writer.setFrame('TCON', [tags.genre]);
                if (tags.year !== undefined) writer.setFrame('TYER', Number(tags.year));
                if (tags.track !== undefined) writer.setFrame('TRCK', String(tags.track));
                if (tags.pictureData) {
                    writer.setFrame('APIC', {
                        type: 3,
                        data: (tags.pictureData as Uint8Array).buffer,
                        description: 'Cover',
                        useUnicodeEncoding: false
                    });
                }

                writer.addTag();
                // @ts-ignore
                finalBuffer = writer.arrayBuffer;
            } else {
                throw new Error(`Unsupported format for editing: ${format}`);
            }

            self.postMessage(
                { type: 'SUCCESS', data: finalBuffer, id },
                { transfer: [finalBuffer] }
            );
        }
    } catch (error: any) {
        console.error('[MetadataWorker] Error:', error);
        self.postMessage({ type: 'ERROR', error: error.message || String(error), id });
    }
};
