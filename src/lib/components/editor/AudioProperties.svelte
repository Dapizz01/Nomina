<script lang="ts">
    import type { TrackDraft } from "../../models/track/TrackDraft.svelte";
    import WarningIcon from "../icons/WarningIcon.svelte";
    import CheckIcon from "../icons/CheckIcon.svelte";

    let { draft }: { draft: TrackDraft } = $props();

    function formatTime(seconds: number) {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
</script>

<div class="flex flex-wrap gap-2 mt-1 mb-2 opacity-70">
    <span class="badge badge-neutral badge-sm">{draft.format}</span>
    <span class="badge badge-neutral badge-sm"
        >{formatTime(draft.duration)}</span
    >

    {#if draft.bitrate}
        {#if draft.isUpscale === true}
            <div
                class="tooltip tooltip-bottom"
                data-tip="This file might be upscaled from a lower bitrate lossy source."
            >
                <span
                    class="badge badge-warning badge-sm gap-1 font-medium text-warning-content"
                >
                    <WarningIcon class="h-3 w-3" />
                    {draft.bitrate} kbps
                </span>
            </div>
        {:else if draft.isUpscale === false}
            <div
                class="tooltip tooltip-bottom"
                data-tip="The declared bitrate is consistent with the audio content."
            >
                <span
                    class="badge badge-success badge-sm gap-1 font-medium text-success-content text-white"
                >
                    <CheckIcon class="h-3 w-3" />
                    {draft.bitrate} kbps
                </span>
            </div>
        {:else if (draft.bitrate >= 256 || draft.format.toLowerCase() === "flac") && draft.isUpscale === null}
            <div
                class="tooltip tooltip-bottom"
                data-tip="Analyzing audio spectrum..."
            >
                <span class="badge badge-neutral badge-sm gap-1">
                    <span
                        class="loading loading-spinner loading-xs opacity-50 w-3 h-3"
                    ></span>
                    {draft.bitrate} kbps
                </span>
            </div>
        {:else}
            <span class="badge badge-neutral badge-sm"
                >{draft.bitrate} kbps</span
            >
        {/if}
    {/if}
    {#if draft.sampleRate}
        <span class="badge badge-neutral badge-sm">{draft.sampleRate} Hz</span>
    {/if}
    {#if draft.channels}
        <span class="badge badge-neutral badge-sm">{draft.channels} ch</span>
    {/if}
</div>
