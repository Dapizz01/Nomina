<script lang="ts">
    import type { Song } from "../../models/Song.svelte";
    import WarningIcon from "../icons/WarningIcon.svelte";
    import CheckIcon from "../icons/CheckIcon.svelte";

    let { song }: { song: Song } = $props();

    function formatTime(seconds: number) {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
</script>

<div class="flex flex-wrap gap-2 mt-1 mb-2 opacity-70">
    <span class="badge badge-neutral badge-sm">{song.format}</span>
    <span class="badge badge-neutral badge-sm">{formatTime(song.duration)}</span
    >
    {#if song.file}
        <span class="badge badge-neutral badge-sm"
            >{Math.round(song.file.size / 1024 / 1024)} MB</span
        >
    {/if}
    {#if song.bitrate}
        {#if song.isUpscale === true}
            <div
                class="tooltip tooltip-bottom"
                data-tip="This file might be upscaled from a lower bitrate lossy source."
            >
                <span
                    class="badge badge-warning badge-sm gap-1 font-medium text-warning-content"
                >
                    <WarningIcon class="h-3 w-3" />
                    {song.bitrate} kbps
                </span>
            </div>
        {:else if song.isUpscale === false}
            <div
                class="tooltip tooltip-bottom"
                data-tip="The declared bitrate is consistent with the audio content."
            >
                <span
                    class="badge badge-success badge-sm gap-1 font-medium text-success-content text-white"
                >
                    <CheckIcon class="h-3 w-3" />
                    {song.bitrate} kbps
                </span>
            </div>
        {:else}
            <span class="badge badge-neutral badge-sm">{song.bitrate} kbps</span
            >
        {/if}
    {/if}
    {#if song.sampleRate}
        <span class="badge badge-neutral badge-sm">{song.sampleRate} Hz</span>
    {/if}
    {#if song.channels}
        <span class="badge badge-neutral badge-sm">{song.channels} ch</span>
    {/if}
</div>
