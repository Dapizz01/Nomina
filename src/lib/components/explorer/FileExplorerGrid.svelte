<script lang="ts">
    import { fileSystem } from "../../models/FileSystem.svelte";
    import FolderItem from "./FolderItem.svelte";
    import SongItem from "./SongItem.svelte";
    import type { Song } from "../../models/Song.svelte";

    import ErrorIcon from "../icons/ErrorIcon.svelte";
    import EmptyWorkspaceIcon from "../icons/EmptyWorkspaceIcon.svelte";

    function handleFolderClick(handle: any) {
        fileSystem.enterDirectory(handle);
    }

    function handleSongClick(song: Song) {
        fileSystem.activeSong = song;
        song.loadMetadataIfNeeded();
    }
</script>

{#if fileSystem.loading}
    <div class="flex flex-col items-center justify-center p-12 opacity-50">
        <span class="loading loading-spinner loading-lg"></span>
        <span
            class="mt-4 text-sm font-medium tracking-widest text-base-content/60"
            >Reading directory...</span
        >
    </div>
{:else}
    {#if fileSystem.errorMsg}
        <div
            class="alert alert-error font-medium shadow-lg max-w-xl text-sm w-full mx-auto mb-6"
        >
            <ErrorIcon class="stroke-current shrink-0 h-5 w-5" />
            <span>{fileSystem.errorMsg}</span>
        </div>
    {/if}

    <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
    >
        {#each fileSystem.folders as folder (folder.name)}
            <FolderItem
                handle={folder}
                onclick={() => handleFolderClick(folder)}
            />
        {/each}

        {#each fileSystem.songs as song (song.name)}
            <SongItem {song} onclick={() => handleSongClick(song)} />
        {/each}

        {#if fileSystem.folders.length === 0 && fileSystem.songs.length === 0 && !fileSystem.errorMsg}
            <div
                class="col-span-full py-16 flex flex-col items-center justify-center text-center opacity-50 border border-dashed border-base-content/20 rounded-2xl"
            >
                <EmptyWorkspaceIcon class="h-16 w-16 mb-4 opacity-30" />
                <p class="font-medium text-lg">Empty Workspace</p>
                <p class="text-sm">
                    Import folders or individual audio files using the buttons
                    above to begin.
                </p>
            </div>
        {/if}
    </div>
{/if}
