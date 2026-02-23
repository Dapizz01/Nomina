<script lang="ts">
    import type { Song } from "../../models/Song.svelte";
    import MusicIcon from "../icons/MusicIcon.svelte";

    let { song }: { song: Song } = $props();

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

<figure class="p-6 md:w-[40%] flex justify-center perspective-[1000px] border-b md:border-b-0 md:border-r border-white/5">
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
            <div class="absolute inset-0 bg-base-300/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span class="text-white font-bold opacity-80 decoration-2 underline-offset-4">Change Cover</span>
            </div>
        </button>
    {:else}
        <button
            type="button"
            class="rounded-2xl cursor-pointer group shadow-xl w-64 h-64 md:w-full md:h-auto aspect-square bg-base-300/50 flex flex-col items-center justify-center border border-white/5 transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 hover:bg-base-300/80"
            onclick={triggerFileInput}
        >
            <MusicIcon class="w-16 h-16 opacity-30 mb-2 group-hover:opacity-10 transition-opacity duration-300" />
            <span class="opacity-40 text-sm font-medium group-hover:opacity-100 transition-opacity duration-300 group-hover:text-primary">Click to add Cover Art</span>
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
