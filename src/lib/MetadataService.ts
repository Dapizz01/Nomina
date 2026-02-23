import type { WorkerMessage, WorkerResponse } from './workers/metadata.worker';

/**
 * Service responsible for communicating with the background Web Worker
 * to read and write audio metadata asynchronously without blocking the main UI thread.
 */
class MetadataService {
	private worker: Worker | null = null;
	private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

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
		const request = this.pendingRequests.get(id);

		if (request) {
			if (type === 'SUCCESS') {
				request.resolve(e.data.data);
			} else {
				request.reject(new Error(e.data.error));
			}
			this.pendingRequests.delete(id);
		}
	}

	private sendRequest<T>(message: any, transferables: Transferable[] = []): Promise<T> {
		return new Promise((resolve, reject) => {
			const id = crypto.randomUUID();
			this.pendingRequests.set(id, { resolve, reject });

			const worker = this.initWorker();
			// Send message to the worker with the Transferable Object array if provided
			worker.postMessage({ ...message, id }, { transfer: transferables });
		});
	}

	/**
	 * Reads metadata without blocking the main thread.
	 * Handled completely by the background Web Worker.
	 */
	async read(file: File) {
		try {
			const data = await this.sendRequest<any>({ type: 'READ', file });

			// Reconstruct the ObjectURL on the main thread since workers cannot create DOM URLs easily
			let coverArtUrl = '';
			if (data.pictureData && data.pictureMime) {
				const blob = new Blob([data.pictureData], { type: data.pictureMime });
				coverArtUrl = URL.createObjectURL(blob);
			}

			return {
				...data,
				coverArtUrl
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
