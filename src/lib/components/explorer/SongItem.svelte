<script lang="ts">
    import type { Song } from "../../models/Song.svelte";
    import MusicIcon from "../icons/MusicIcon.svelte";

    let { song, onclick } = $props<{
        song: Song;
        onclick: () => void;
    }>();

    // Prefer ID3 title if available, fallback to filename
    let displayName = $derived(song.title || song.name);
    let displayArtist = $derived(song.artist || "Unknown Artist");
</script>

<button
    class="w-full flex items-center gap-3 p-3 rounded-xl bg-base-300/40 hover:bg-base-200 hover:scale-[1.02] transition-all duration-300 border border-white/5 hover:border-primary/30 shadow-sm cursor-pointer text-left group"
    {onclick}
>
    <!-- Thumbnail / Icon -->
    <div
        class="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-base-300 flex items-center justify-center"
    >
        {#if song.coverArtUrl}
            <img
                src={song.coverArtUrl}
                alt=""
                class="w-full h-full object-cover"
            />
        {:else}
            <MusicIcon
                class="w-6 h-6 text-base-content/50 group-hover:text-primary transition-colors"
            />
        {/if}
    </div>

    <!-- Info -->
    <div class="flex flex-col min-w-0 overflow-hidden">
        <span class="font-bold text-sm truncate">{displayName}</span>
        <span class="text-xs opacity-60 truncate">{displayArtist}</span>
    </div>
</button>
