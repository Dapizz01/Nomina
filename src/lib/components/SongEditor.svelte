<script lang="ts">
    import type { Song } from "../models/Song.svelte";
    import MusicIcon from "./icons/MusicIcon.svelte";

    let {
        song,
        loading,
        onsave,
    }: {
        song: Song;
        loading: boolean;
        onsave: () => void;
    } = $props();

    function formatTime(seconds: number) {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    let fileInput: HTMLInputElement;

    function triggerFileInput() {
        if (fileInput) fileInput.click();
    }

    async function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            const arrayBuffer = await file.arrayBuffer();
            song.pictureData = new Uint8Array(arrayBuffer);
            song.pictureMime = file.type;

            if (song.coverArtUrl) {
                URL.revokeObjectURL(song.coverArtUrl);
            }
            song.coverArtUrl = URL.createObjectURL(file);
        }
    }
</script>

<div
    class="card md:card-side glass-panel shadow-2xl transition-all duration-300"
>
    <figure class="p-8 md:w-[40%] flex justify-center perspective-[1000px]">
        {#if song.coverArtUrl}
            <button
                type="button"
                class="relative cursor-pointer group w-64 h-64 md:w-full md:h-auto aspect-square rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] bg-base-300 block text-left"
                onclick={triggerFileInput}
            >
                <img
                    src={song.coverArtUrl}
                    alt="Album Art"
                    class="absolute inset-0 w-full h-full object-cover rounded-2xl"
                />
                <div
                    class="absolute inset-0 bg-base-300/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                >
                    <span
                        class="text-white font-bold opacity-80 decoration-2 underline-offset-4"
                        >Change Cover</span
                    >
                </div>
            </button>
        {:else}
            <button
                type="button"
                class="rounded-2xl cursor-pointer group shadow-xl w-64 h-64 md:w-full md:h-auto aspect-square bg-base-300/50 flex flex-col items-center justify-center border border-white/5 transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 hover:bg-base-300/80"
                onclick={triggerFileInput}
            >
                <MusicIcon
                    class="w-16 h-16 opacity-30 mb-2 group-hover:opacity-10 transition-opacity duration-300"
                />
                <span
                    class="opacity-40 text-sm font-medium group-hover:opacity-100 transition-opacity duration-300 group-hover:text-primary"
                    >Click to add Cover Art</span
                >
            </button>
        {/if}
        <input
            type="file"
            bind:this={fileInput}
            accept="image/jpeg, image/png"
            class="hidden"
            onchange={handleFileChange}
        />
    </figure>

    <div class="card-body md:w-[60%] text-left">
        <h2
            class="card-title text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70"
        >
            {song.file.name}
        </h2>

        <div class="flex flex-wrap gap-2 mt-1 mb-4 opacity-70">
            <span class="badge badge-neutral badge-sm">{song.format}</span>
            <span class="badge badge-neutral badge-sm"
                >{formatTime(song.duration)}</span
            >
            <span class="badge badge-neutral badge-sm"
                >{Math.round(song.file.size / 1024 / 1024)} MB</span
            >
            {#if song.bitrate}
                {#if song.isUpscale === true}
                    <div
                        class="tooltip"
                        data-tip="Fast Fourier Transform detected no high frequency content, suggesting this file might be upscaled from a lower bitrate lossy source."
                    >
                        <span
                            class="badge badge-warning badge-sm gap-1 font-medium text-warning-content"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                            {song.bitrate} kbps
                        </span>
                    </div>
                {:else if song.isUpscale === false}
                    <div
                        class="tooltip"
                        data-tip="Fast Fourier Transform detected high frequency content matching the declared bitrate."
                    >
                        <span
                            class="badge badge-success badge-sm gap-1 font-medium text-success-content text-white"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                            {song.bitrate} kbps
                        </span>
                    </div>
                {:else}
                    <span class="badge badge-neutral badge-sm"
                        >{song.bitrate} kbps</span
                    >
                {/if}
            {/if}
            {#if song.sampleRate}
                <span class="badge badge-neutral badge-sm"
                    >{song.sampleRate} Hz</span
                >
            {/if}
            {#if song.channels}
                <span class="badge badge-neutral badge-sm"
                    >{song.channels} ch</span
                >
            {/if}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
            <label class="form-control w-full md:col-span-2">
                <div class="label pt-0 pb-1">
                    <span
                        class="label-text opacity-70 text-xs font-bold uppercase tracking-wider"
                        >Track Title</span
                    >
                </div>
                <input
                    type="text"
                    bind:value={song.title}
                    class="input input-sm input-bordered w-full bg-base-300/30 focus:border-primary/50 transition-colors"
                    placeholder="Enter title"
                />
            </label>

            <label class="form-control w-full md:col-span-2">
                <div class="label pt-0 pb-1">
                    <span
                        class="label-text opacity-70 text-xs font-bold uppercase tracking-wider"
                        >Artist</span
                    >
                </div>
                <input
                    type="text"
                    bind:value={song.artist}
                    class="input input-sm input-bordered w-full bg-base-300/30 focus:border-primary/50 transition-colors"
                    placeholder="Enter artist"
                />
            </label>

            <label class="form-control w-full">
                <div class="label pt-0 pb-1">
                    <span
                        class="label-text opacity-70 text-xs font-bold uppercase tracking-wider"
                        >Album</span
                    >
                </div>
                <input
                    type="text"
                    bind:value={song.album}
                    class="input input-sm input-bordered w-full bg-base-300/30 focus:border-primary/50 transition-colors"
                    placeholder="Enter album"
                />
            </label>

            <label class="form-control w-full">
                <div class="label pt-0 pb-1">
                    <span
                        class="label-text opacity-70 text-xs font-bold uppercase tracking-wider"
                        >Genre</span
                    >
                </div>
                <input
                    type="text"
                    bind:value={song.genre}
                    class="input input-sm input-bordered w-full bg-base-300/30 focus:border-primary/50 transition-colors"
                    placeholder="Enter genre"
                />
            </label>

            <label class="form-control w-full">
                <div class="label pt-0 pb-1">
                    <span
                        class="label-text opacity-70 text-xs font-bold uppercase tracking-wider"
                        >Year</span
                    >
                </div>
                <input
                    type="number"
                    bind:value={song.year}
                    class="input input-sm input-bordered w-full bg-base-300/30 focus:border-primary/50 transition-colors"
                    placeholder="Enter year"
                />
            </label>

            <label class="form-control w-full">
                <div class="label pt-0 pb-1">
                    <span
                        class="label-text opacity-70 text-xs font-bold uppercase tracking-wider"
                        >Track #</span
                    >
                </div>
                <input
                    type="number"
                    bind:value={song.track}
                    class="input input-sm input-bordered w-full bg-base-300/30 focus:border-primary/50 transition-colors"
                    placeholder="Enter track number"
                />
            </label>
        </div>

        <div class="card-actions justify-end mt-6 pt-4 border-t border-white/5">
            <button
                class="btn btn-primary shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-transform"
                onclick={onsave}
                disabled={song.saving || loading}
            >
                {#if song.saving}
                    <span class="loading loading-spinner loading-sm"></span> Saving...
                {:else}
                    Save Changes
                {/if}
            </button>
        </div>
    </div>
</div>
