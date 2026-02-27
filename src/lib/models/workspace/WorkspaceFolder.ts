import type { WorkspaceNode } from './WorkspaceNode';
import { WorkspaceTrack } from './WorkspaceTrack';

export class WorkspaceFolder implements WorkspaceNode {
    name: string;
    handle: FileSystemDirectoryHandle;
    isLoaded: boolean = false;
    children: WorkspaceNode[] = [];

    constructor(handle: FileSystemDirectoryHandle) {
        this.name = handle.name;
        this.handle = handle;
    }

    async getChildren(): Promise<WorkspaceNode[]> {
        if (this.isLoaded) return this.children;

        try {
            const newChildren: WorkspaceNode[] = [];
            // @ts-ignore
            for await (const [name, handle] of this.handle.entries()) {
                if (handle.kind === 'directory') {
                    newChildren.push(new WorkspaceFolder(handle as FileSystemDirectoryHandle));
                } else if (handle.kind === 'file') {
                    const ext = name.split('.').pop()?.toLowerCase();
                    if (['mp3', 'flac', 'ogg', 'wav', 'm4a'].includes(ext || '')) {
                        newChildren.push(new WorkspaceTrack(handle as FileSystemFileHandle));
                    }
                }
            }

            // Sort: Directories first, then alphabetically
            newChildren.sort((a, b) => {
                if (a instanceof WorkspaceFolder && b instanceof WorkspaceTrack) return -1;
                if (a instanceof WorkspaceTrack && b instanceof WorkspaceFolder) return 1;
                return a.name.localeCompare(b.name);
            });

            this.children = newChildren;
            this.isLoaded = true;
            return this.children;
        } catch (error) {
            console.error(`[WorkspaceFolder] Failed to load children for ${this.name}`, error);
            throw error;
        }
    }
}
