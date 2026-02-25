<script lang="ts">
    import { workspaceStore } from "$lib/models/workspace/WorkspaceStore.svelte.ts";
    import { appStore } from "$lib/state/AppStore.svelte.ts";
    import BackArrowIcon from "../icons/BackArrowIcon.svelte";
    import FolderAddIcon from "../icons/FolderAddIcon.svelte";
    import MusicAddIcon from "../icons/MusicAddIcon.svelte";

    // Reconstruct the path array depending on the navigation history
    let breadcrumbs = $derived.by(() => {
        let paths: { name: string; isRoot?: boolean; isActive: boolean }[] = [];

        // 1. Always add the Virtual Root as the very first crumb
        paths.push({
            name: "Workspace",
            isRoot: true,
            isActive: false, // Will calculate active state at the end
        });

        // 2. Add history navigation points (already traversed folders)
        for (const h of workspaceStore.navigationHistory) {
            paths.push({
                name: h ? h.name || "Folder" : "Folder",
                isActive: false,
            });
        }

        // 3. The current directory
        if (workspaceStore.currentDirectoryHandle) {
            paths.push({
                name: workspaceStore.currentDirectoryHandle.name || "Root",
                isActive: false,
            });
        }

        // 4. The active currently playing/viewed song
        if (appStore.activeTrackDraft) {
            paths.push({
                name: appStore.activeTrackDraft.fileName || "File",
                isActive: false,
            });
        }

        // 5. Mark the very last element in the trail as active
        if (paths.length > 0) {
            paths[paths.length - 1].isActive = true;
        }

        return paths;
    });

    let canGoBack = $derived(
        workspaceStore.currentDirectoryHandle !== null ||
            appStore.activeTrackDraft !== null,
    );

    function handleBack() {
        if (!canGoBack) return;

        if (appStore.activeTrackDraft) {
            appStore.clearActiveTrack();
        } else {
            workspaceStore.goBack();
        }
    }
</script>

<div
    class="flex items-center justify-between gap-2 mb-6 bg-base-300/40 p-3 rounded-xl border border-white/5"
>
    <div class="flex items-center gap-2 overflow-hidden flex-1">
        <button
            class="btn btn-sm btn-ghost gap-2 shrink-0"
            disabled={!canGoBack}
            onclick={handleBack}
        >
            <BackArrowIcon class="h-4 w-4" />
            Back
        </button>

        <div
            class="breadcrumbs text-sm opacity-80 max-w-[80%] overflow-x-auto whitespace-nowrap"
        >
            <ul>
                {#each breadcrumbs as crumb}
                    {#if crumb.isActive}
                        <li class="font-bold opacity-100 text-primary">
                            {crumb.name}
                        </li>
                    {:else}
                        <li>
                            {crumb.name}
                        </li>
                    {/if}
                {/each}
            </ul>
        </div>
    </div>

    <!-- Global Add Buttons -->
    <div
        class="flex items-center gap-2 shrink-0 border-l border-white/10 pl-2 ml-2"
    >
        <button
            class="btn btn-sm btn-outline border-white/20 hover:bg-white/10"
            onclick={() => workspaceStore.openRootFolder()}
            title="Open Directory (Replaces Workspace)"
        >
            <FolderAddIcon class="h-4 w-4 mr-1" />
            Add Folder
        </button>
        <button
            class="btn btn-sm btn-outline border-white/20 hover:bg-white/10"
            onclick={() => workspaceStore.openFiles()}
            title="Import Individual Songs"
        >
            <MusicAddIcon class="h-4 w-4 mr-1" />
            Add Files
        </button>
    </div>
</div>
