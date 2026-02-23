<script lang="ts">
    import type { Song } from "../../models/Song.svelte";
    import CoverArtEditor from "./CoverArtEditor.svelte";
    import MetadataForm from "./MetadataForm.svelte";
    import AudioProperties from "./AudioProperties.svelte";

    let {
        song,
    }: {
        song: Song;
    } = $props();

    $effect(() => {
        if (song && song.isUpscale === null && !song.isLoadingMetadata) {
            // Trigger the deferred analysis now that the file is loaded
            if (song.bitrate >= 256 || song.format === "flac") {
                song.analyzeForUpscale();
            }
        }
    });

    async function handleSave() {
        if (!song) return;
        try {
            await song.save();
        } catch (err) {
            console.error("Failed to save:", err);
            // Alert in a simplistic way string fallback for now
            alert("Failed to save the song metadata.");
        }
    }
</script>

<div
    class="w-full bg-base-100 shadow-2xl rounded-2xl overflow-hidden glass-panel border border-white/10 mt-6"
>
    {#if song}
        {#if song.isLoadingMetadata}
            <div
                class="flex flex-col items-center justify-center p-16 opacity-50"
            >
                <span class="loading loading-spinner loading-lg"></span>
                <span
                    class="mt-4 text-sm font-medium tracking-widest text-base-content/60"
                    >READING FILE...</span
                >
            </div>
        {:else}
            <div class="flex flex-col md:flex-row">
                <CoverArtEditor {song} />

                <div
                    class="p-6 md:w-[60%] flex flex-col justify-between text-left"
                >
                    <div>
                        <h2
                            class="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70 mb-1 truncate"
                            title={song.name}
                        >
                            {song.name}
                        </h2>

                        <AudioProperties {song} />

                        <MetadataForm {song} />
                    </div>

                    <div
                        class="mt-6 pt-4 border-t border-white/5 flex justify-end gap-2"
                    >
                        <button
                            class="btn btn-primary shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-transform"
                            onclick={handleSave}
                            disabled={song.saving}
                        >
                            {#if song.saving}
                                <span class="loading loading-spinner loading-sm"
                                ></span> Saving...
                            {:else}
                                Save Changes
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>
