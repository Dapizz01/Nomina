<script lang="ts">
    import type { TrackDraft } from "../../models/track/TrackDraft.svelte";
    import InputField from "./InputField.svelte";

    let {
        draft,
        readonly = false,
        diffMap = null,
        diffRole = null,
    }: {
        draft: TrackDraft;
        readonly?: boolean;
        diffMap?: Record<string, any> | null;
        diffRole?: "original" | "modified" | null;
    } = $props();

    function getDiffStatus(field: keyof TrackDraft) {
        if (!diffMap || !diffRole) return null;
        if (diffMap[field as string]) {
            return diffRole === "original" ? "warning" : "success";
        }
        return null;
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
    <InputField
        label="Track Title"
        bind:value={draft.title}
        placeholder="Enter title"
        spanClass="md:col-span-2"
        disabled={readonly}
        diffStatus={getDiffStatus("title")}
    />

    <InputField
        label="Artist"
        bind:value={draft.artist}
        placeholder="Enter artist"
        spanClass="md:col-span-2"
        disabled={readonly}
        diffStatus={getDiffStatus("artist")}
    />

    <InputField
        label="Album"
        bind:value={draft.album}
        placeholder="Enter album"
        spanClass=""
        disabled={readonly}
        diffStatus={getDiffStatus("album")}
    />

    <InputField
        label="Genre"
        bind:value={draft.genre}
        placeholder="Enter genre"
        spanClass=""
        disabled={readonly}
        diffStatus={getDiffStatus("genre")}
    />

    <InputField
        label="Year"
        type="number"
        bind:value={draft.year}
        placeholder="Enter year"
        spanClass=""
        disabled={readonly}
        diffStatus={getDiffStatus("year")}
    />

    <InputField
        label="Track #"
        type="number"
        bind:value={draft.track}
        placeholder="Enter track number"
        spanClass=""
        disabled={readonly}
        diffStatus={getDiffStatus("track")}
    />
</div>
