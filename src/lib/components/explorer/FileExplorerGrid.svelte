<script lang="ts">
    import { workspaceStore } from "../../models/workspace/WorkspaceStore.svelte";
    import { appStore } from "../../state/AppStore.svelte";
    import { TrackFileService } from "../../models/track/TrackFileService";
    import { TrackDraft } from "../../models/track/TrackDraft.svelte";
    import type { WorkspaceTrack } from "../../models/workspace/WorkspaceTrack";
    import FolderItem from "./FolderItem.svelte";
    import SongItem from "./SongItem.svelte";

    import ErrorIcon from "../icons/ErrorIcon.svelte";
    import EmptyWorkspaceIcon from "../icons/EmptyWorkspaceIcon.svelte";

    function handleFolderClick(handle: any) {
        workspaceStore.enterDirectory(handle);
    }

    async function handleSongClick(node: WorkspaceTrack) {
        try {
            workspaceStore.loading = true; // Temporary global loader for visual feedback
            const heavySongData = await TrackFileService.readFullMetadata(node);
            appStore.activeTrackNode = node;
            appStore.activeTrackDraft = new TrackDraft(heavySongData);
        } catch (error) {
            console.error("Failed to lazy load the full song data", error);
            workspaceStore.errorMsg = "Failed to open track details.";
        } finally {
            workspaceStore.loading = false;
        }
    }
</script>

{#if workspaceStore.loading}
    <div class="flex flex-col items-center justify-center p-12 opacity-50">
        <span class="loading loading-spinner loading-lg"></span>
        <span
            class="mt-4 text-sm font-medium tracking-widest text-base-content/60"
            >Reading directory...</span
        >
    </div>
{:else}
    {#if workspaceStore.errorMsg}
        <div
            class="alert alert-error font-medium shadow-lg max-w-xl text-sm w-full mx-auto mb-6"
        >
            <ErrorIcon class="stroke-current shrink-0 h-5 w-5" />
            <span>{workspaceStore.errorMsg}</span>
        </div>
    {/if}

    <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
    >
        {#each workspaceStore.nodes as node (node.name)}
            {#if node.constructor.name === "WorkspaceFolder"}
                <FolderItem
                    handle={node}
                    onclick={() => handleFolderClick(node.handle)}
                />
            {:else if node.constructor.name === "WorkspaceTrack"}
                <SongItem
                    {node}
                    onclick={() => handleSongClick(node as WorkspaceTrack)}
                />
            {/if}
        {/each}

        {#if workspaceStore.nodes.length === 0 && !workspaceStore.errorMsg}
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
