import type { WorkerMessage, WorkerResponse } from './workers/metadata.worker';
import * as mm from 'music-metadata';

// Store pending promises mapped by their unique message ID
const pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

class MetadataService {
	private worker: Worker | null = null;

	private initWorker() {
		if (!this.worker) {
			// Create the worker using Vite's ?worker import suffix
			this.worker = new Worker(new URL('./workers/metadata.worker.ts', import.meta.url), {
				type: 'module'
			});

			this.worker.onmessage = this.handleMessage.bind(this);
			this.worker.onerror = (err) => {
				console.error('[MetadataService] Worker system error:', err);
			};
		}
		return this.worker;
	}

	private handleMessage(e: MessageEvent<WorkerResponse>) {
		const { id, type } = e.data;
		const request = pendingRequests.get(id);

		if (request) {
			if (type === 'SUCCESS') {
				request.resolve(e.data.data);
			} else {
				request.reject(new Error(e.data.error));
			}
			pendingRequests.delete(id);
		}
	}

	private sendRequest<T>(message: any, transferables: Transferable[] = []): Promise<T> {
		return new Promise((resolve, reject) => {
			const id = crypto.randomUUID();
			pendingRequests.set(id, { resolve, reject });

			const worker = this.initWorker();
			// Send message to the worker with the Transferable Object array if provided
			worker.postMessage({ ...message, id }, { transfer: transferables });
		});
	}

	/**
	 * Reads metadata without blocking the main thread.
	 * Uses music-metadata natively to stream the file headers without memory overhead.
	 */
	async read(file: File) {
		try {
			const metadata = await mm.parseBlob(file);
			const { common, format } = metadata;

			let coverArtUrl = '';
			let pictureData: Uint8Array | null = null;
			let pictureMime = '';

			if (common.picture && common.picture.length > 0) {
				const picture = common.picture[0];
				pictureData = new Uint8Array(picture.data);
				pictureMime = picture.format;
				const blob = new Blob([pictureData as any], { type: pictureMime });
				coverArtUrl = URL.createObjectURL(blob);
			}

			return {
				title: common.title || '',
				artist: common.artist || '',
				album: common.album || '',
				genre: common.genre?.[0] || '',
				year: common.year || 0,
				track: common.track?.no || 0,
				coverArtUrl,
				pictureData,
				pictureMime,
				format: format.container || file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
				duration: format.duration || 0,
				bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : 0,
				sampleRate: format.sampleRate || 0,
				channels: format.numberOfChannels || 0
			};
		} catch (error) {
			console.error('[MetadataService] Error parsing metadata:', error);
			throw error;
		}
	}

	/**
	 * Modifies tags and returns the updated raw file bytes via a Zero-Copy Transferable Buffer.
	 */
	async write(file: File, tags: Partial<{ title: string; artist: string; album: string; genre: string; year: number; track: number; pictureData: Uint8Array | null; pictureMime: string }>): Promise<ArrayBuffer> {
		return this.sendRequest<ArrayBuffer>({ type: 'WRITE', file, tags });
	}
}

// Export a singleton instance
export const metadataService = new MetadataService();
