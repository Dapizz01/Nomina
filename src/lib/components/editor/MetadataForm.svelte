<script lang="ts">
    import type { Song } from "../../models/Song.svelte";
    import InputField from "./InputField.svelte";

    let { song }: { song: Song } = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
    <InputField
        label="Track Title"
        bind:value={song.title}
        placeholder="Enter title"
        spanClass="md:col-span-2"
    />

    <InputField
        label="Artist"
        bind:value={song.artist}
        placeholder="Enter artist"
        spanClass="md:col-span-2"
    />

    <InputField
        label="Album"
        bind:value={song.album}
        placeholder="Enter album"
        spanClass=""
    />

    <InputField
        label="Genre"
        bind:value={song.genre}
        placeholder="Enter genre"
        spanClass=""
    />

    <InputField
        label="Year"
        type="number"
        bind:value={song.year}
        placeholder="Enter year"
        spanClass=""
    />

    <InputField
        label="Track #"
        type="number"
        bind:value={song.track}
        placeholder="Enter track number"
        spanClass=""
    />
</div>
