import { WorkspaceFolder } from './WorkspaceFolder';
import { WorkspaceTrack } from './WorkspaceTrack';
import type { WorkspaceNode } from './WorkspaceNode';

/**
 * Handles traversing local directories, requesting permissions, keeping track of history.
 */
export class WorkspaceStore {
    // Top-level workspace items
    rootFolders: FileSystemDirectoryHandle[] = $state([]);
    rootFiles: FileSystemFileHandle[] = $state([]);

    // Current navigation state
    currentDirectoryHandle: FileSystemDirectoryHandle | null = $state(null);
    navigationHistory: FileSystemDirectoryHandle[] = $state([]);

    // Derived active items for the UI Grid
    nodes: WorkspaceNode[] = $state([]);

    /** Loading flag, used primarily for blocking UI during heavy reads. */
    loading = $state(false);
    /** Holds any runtime error messages to be displayed in the UI. */
    errorMsg = $state("");

    /**
     * Checks if a given file system handle already exists in a collection.
     */
    private async isDuplicateHandle(newHandle: any, existingCollection: any[]): Promise<boolean> {
        for (const existing of existingCollection) {
            // @ts-ignore
            if (existing.isSameEntry && await existing.isSameEntry(newHandle)) {
                return true;
            } else if (existing.name === newHandle.name) {
                return true;
            }
        }
        return false;
    }

    /**
     * Prompts the user to select a directory and adds it to the workspace.
     */
    async openRootFolder() {
        try {
            this.loading = true;
            this.errorMsg = "";
            const handle = await (window as any).showDirectoryPicker({
                mode: 'readwrite'
            });

            // Deduplicate folder adding
            const isDuplicate = await this.isDuplicateHandle(handle, this.rootFolders);

            if (!isDuplicate) {
                this.rootFolders = [...this.rootFolders, handle];
            }

            this.navigationHistory = [];

            // Start at the virtual root level instead of entering the folder immediately
            this.currentDirectoryHandle = null;
            await this.readCurrentDirectory();
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("Directory selection error:", err);
                this.errorMsg = err.message || "Failed to open folder.";
            }
        } finally {
            this.loading = false;
        }
    }

    /**
     * Prompts the user to select standalone audio files and adds them to the workspace.
     */
    async openFiles() {
        try {
            this.loading = true;
            this.errorMsg = "";
            const handles = await (window as any).showOpenFilePicker({
                multiple: true,
                types: [
                    {
                        description: 'Audio Files',
                        accept: {
                            'audio/*': ['.mp3', '.flac', '.ogg', '.m4a', '.wav']
                        }
                    }
                ]
            });

            // Deduplicate file adding
            const newValidHandles = [];
            for (const handle of handles) {
                const isDuplicate = await this.isDuplicateHandle(handle, this.rootFiles);
                if (!isDuplicate) {
                    newValidHandles.push(handle);
                }
            }

            this.rootFiles = [...this.rootFiles, ...newValidHandles];

            // If already at virtual root, re-trigger render
            if (!this.currentDirectoryHandle) {
                await this.readCurrentDirectory();
            } else {
                // Return to root to immediately show them
                this.navigationHistory = [];
                this.currentDirectoryHandle = null;
                await this.readCurrentDirectory();
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("File selection error:", err);
                this.errorMsg = err.message || "Failed to open files.";
            }
        } finally {
            this.loading = false;
        }
    }

    /**
     * Drills down into a specific folder handle, pushing the current one to history.
     */
    async enterDirectory(handle: any) {
        try {
            this.loading = true;
            this.errorMsg = "";

            if (this.currentDirectoryHandle) {
                this.navigationHistory.push(this.currentDirectoryHandle);
            }

            this.currentDirectoryHandle = handle;
            await this.readCurrentDirectory();
        } catch (err: any) {
            console.error("Failed to enter directory:", err);
            this.errorMsg = err.message || "Failed to read folder contents.";

            // If it fails, maybe pop back if we just entered
            if (this.navigationHistory.length > 0) {
                this.currentDirectoryHandle = this.navigationHistory.pop() ?? null;
            }
        } finally {
            this.loading = false;
        }
    }

    /**
     * Pops the last directory from the history stack and navigates back to it.
     */
    async goBack() {
        if (this.navigationHistory.length === 0) {
            // Reached Virtual Root
            if (this.currentDirectoryHandle !== null) {
                this.currentDirectoryHandle = null;
                await this.readCurrentDirectory();
            }
            return;
        }

        try {
            this.loading = true;
            this.errorMsg = "";
            this.currentDirectoryHandle = this.navigationHistory.pop() ?? null;
            await this.readCurrentDirectory();
        } catch (err: any) {
            console.error("Failed to go back:", err);
            this.errorMsg = err.message || "Failed to read previous folder.";
        } finally {
            this.loading = false;
        }
    }

    /**
     * Instantly navigates back to the virtual root workspace, dropping all history.
     */
    async goHome() {
        if (!this.currentDirectoryHandle) return; // Already home

        try {
            this.loading = true;
            this.errorMsg = "";
            this.navigationHistory = [];
            this.currentDirectoryHandle = null;
            await this.readCurrentDirectory();
        } catch (err: any) {
            console.error("Failed to go home:", err);
            this.errorMsg = err.message || "Failed to load workspace.";
        } finally {
            this.loading = false;
        }
    }

    /**
     * Reads handles of the currently targeted directory, or the virtual root workspace handles.
     */
    async readCurrentDirectory() {
        if (!this.currentDirectoryHandle) {
            // Virtual Workspace Root
            const rootNodes: WorkspaceNode[] = [];

            for (const entry of this.rootFolders) {
                rootNodes.push(new WorkspaceFolder(entry));
            }

            for (const entry of this.rootFiles) {
                const node = new WorkspaceTrack(entry);
                await node.loadBasicMetadata();
                rootNodes.push(node);
            }

            rootNodes.sort((a, b) => {
                if (a instanceof WorkspaceFolder && b instanceof WorkspaceTrack) return -1;
                if (a instanceof WorkspaceTrack && b instanceof WorkspaceFolder) return 1;
                const aName = (a instanceof WorkspaceTrack && a.title) ? a.title : a.name;
                const bName = (b instanceof WorkspaceTrack && b.title) ? b.title : b.name;
                return aName.localeCompare(bName);
            });

            this.nodes = rootNodes;
            return;
        }

        // Active folder navigation
        const dirNode = new WorkspaceFolder(this.currentDirectoryHandle);
        const children = await dirNode.getChildren();

        // Trigger loading thumbnail metadata automatically for files in view
        const fileNodes = children.filter(child => child instanceof WorkspaceTrack) as WorkspaceTrack[];
        await Promise.allSettled(fileNodes.map(node => node.loadBasicMetadata()));

        this.nodes = children;
    }
}

export const workspaceStore = new WorkspaceStore();
