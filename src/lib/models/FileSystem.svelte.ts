import { Song } from "./Song.svelte";

export class FileSystem {
    /** High-level array containing references to user-selected root directories. */
    rootFolders: any[] = $state([]);
    /** High-level array containing references to standalone selected audio files. */
    rootFiles: any[] = $state([]);
    /** The directory currently being viewed by the user. If null, user is at the Workspace root. */
    currentDirectoryHandle: any = $state(null);
    /** Stack of previously visited directory handles to allow backward navigation. */
    navigationHistory: any[] = $state([]);
    /** Sub-directories of the currently active directory. */
    folders: any[] = $state([]);
    /** Audio files within the currently active directory (or Workspace root). */
    songs: Song[] = $state([]);
    /** Loading flag, used primarily for blocking UI during heavy reads. */
    loading = $state(false);
    /** Holds any runtime error messages to be displayed in the UI. */
    errorMsg = $state("");
    /** Currently selected song being viewed in the inline editor. */
    activeSong: Song | null = $state(null);

    /**
     * Checks if a given file system handle already exists in a collection.
     */
    private async isDuplicateHandle(newHandle: any, existingCollection: any[]): Promise<boolean> {
        for (const existing of existingCollection) {
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

            this.navigationHistory.push(this.currentDirectoryHandle);

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
        if (this.activeSong) {
            this.activeSong = null;
            return;
        }

        if (this.navigationHistory.length === 0) return;

        try {
            this.loading = true;
            this.errorMsg = "";

            const handle = this.navigationHistory.pop() ?? null;
            this.currentDirectoryHandle = handle;
            await this.readCurrentDirectory();
        } catch (err: any) {
            console.error("Failed to go back:", err);
            this.errorMsg = err.message || "Failed to read folder contents.";
        } finally {
            this.loading = false;
        }
    }

    /**
     * Iterates over the entries of the current directory handle, sorting them into `folders` and `songs`.
     */
    async readCurrentDirectory() {
        // Cleanup old songs object URLs
        for (const song of this.songs) {
            song.destroy();
        }

        if (!this.currentDirectoryHandle) {
            // Virtual Workspace Root
            this.folders = [...this.rootFolders];

            const newSongs = [];
            for (const entry of this.rootFiles) {
                try {
                    const song = new Song(entry);
                    await song.loadMetadataIfNeeded(true);
                    newSongs.push(song);
                } catch (e) {
                    console.error("Failed to load generic metadata for root song", entry.name, e);
                }
            }

            newSongs.sort((a, b) => {
                const aName = a.title || a.name;
                const bName = b.title || b.name;
                return aName.localeCompare(bName);
            });

            this.songs = newSongs;
            return;
        }

        const newFolders = [];
        const newSongs = [];

        for await (const entry of this.currentDirectoryHandle.values()) {
            if (entry.kind === 'directory') {
                newFolders.push(entry);
            } else if (entry.kind === 'file') {
                const name = entry.name.toLowerCase();
                if (name.match(/\.(mp3|flac|ogg|m4a|wav)$/)) {
                    // Eagerly load lightweight metadata via the Web Worker
                    // but defer the heavy AudioContext FFT upscale analysis
                    try {
                        const song = new Song(entry);
                        await song.loadMetadataIfNeeded(true); // Pass flag to skip FFT
                        newSongs.push(song);
                    } catch (e) {
                        console.error("Failed to load generic metadata for song", entry.name, e);
                    }
                }
            }
        }

        // Sort folders and songs alphabetically
        newFolders.sort((a, b) => a.name.localeCompare(b.name));
        newSongs.sort((a, b) => {
            const aName = a.title || a.name;
            const bName = b.title || b.name;
            return aName.localeCompare(bName);
        });

        this.folders = newFolders;
        this.songs = newSongs;
    }
}

export const fileSystem = new FileSystem();
