<script lang="ts">
    import { fileSystem } from "../../models/FileSystem.svelte";
    import BackArrowIcon from "../icons/BackArrowIcon.svelte";
    import FolderAddIcon from "../icons/FolderAddIcon.svelte";
    import MusicAddIcon from "../icons/MusicAddIcon.svelte";

    // Reconstruct the path array depending on the navigation history
    let breadcrumbs = $derived.by(() => {
        const historyCopy = [...fileSystem.navigationHistory];

        let paths = [];
        for (let i = 0; i < historyCopy.length; i++) {
            const h = historyCopy[i];
            paths.push({
                name: h ? h.name || "Root" : "Workspace",
                idx: i,
            });
        }

        // The current one at the end
        if (fileSystem.currentDirectoryHandle) {
            paths.push({
                name: fileSystem.currentDirectoryHandle.name || "Root",
                idx: -1, // Current
            });
        } else {
            paths.push({
                name: "Workspace",
                idx: -1,
            });
        }
        if (fileSystem.activeSong) {
            paths.push({
                name: fileSystem.activeSong.name || "File",
                idx: -2, // Active song identifier
            });
        }

        return paths;
    });
</script>

<div
    class="flex items-center justify-between gap-2 mb-6 bg-base-300/40 p-3 rounded-xl border border-white/5"
>
    <div class="flex items-center gap-2 overflow-hidden flex-1">
        {#if fileSystem.navigationHistory.length > 0 || fileSystem.activeSong}
            <button
                class="btn btn-sm btn-ghost gap-2 shrink-0"
                onclick={() => fileSystem.goBack()}
            >
                <BackArrowIcon class="h-4 w-4" />
                Back
            </button>
        {/if}

        <div
            class="breadcrumbs text-sm opacity-80 max-w-[80%] overflow-x-auto whitespace-nowrap"
        >
            <ul>
                {#each breadcrumbs as crumb}
                    {#if crumb.idx === -1 && !fileSystem.activeSong}
                        <li class="font-bold opacity-100 text-primary">
                            {crumb.name}
                        </li>
                    {:else if crumb.idx === -2}
                        <li class="font-bold opacity-100 text-primary">
                            {crumb.name}
                        </li>
                    {:else}
                        <li>{crumb.name}</li>
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
            onclick={() => fileSystem.openRootFolder()}
            title="Open Directory (Replaces Workspace)"
        >
            <FolderAddIcon class="h-4 w-4 mr-1" />
            Add Folder
        </button>
        <button
            class="btn btn-sm btn-outline border-white/20 hover:bg-white/10"
            onclick={() => fileSystem.openFiles()}
            title="Import Individual Songs"
        >
            <MusicAddIcon class="h-4 w-4 mr-1" />
            Add Files
        </button>
    </div>
</div>
