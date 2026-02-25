<script lang="ts">
    import type { TrackDraft } from "../../models/track/TrackDraft.svelte";
    import type { WorkspaceTrack } from "../../models/workspace/WorkspaceTrack";
    import { TrackFileService } from "../../models/track/TrackFileService";
    import CoverArtEditor from "./CoverArtEditor.svelte";
    import MetadataForm from "./MetadataForm.svelte";
    import AudioProperties from "./AudioProperties.svelte";

    import MetadataDiffModal from "./MetadataDiffModal.svelte";

    let {
        draft,
        node = null,
        readonly = false,
        diffMap = null,
        diffRole = null,
    }: {
        draft: TrackDraft;
        node?: WorkspaceTrack | null;
        readonly?: boolean;
        diffMap?: Record<string, any> | null;
        diffRole?: "original" | "modified" | null;
    } = $props();

    let showDiffModal = $state(false);
    let originalDraft: TrackDraft | null = $state(null);

    $effect(() => {
        if (
            draft &&
            node &&
            draft.isUpscale === null &&
            draft.isMetadataLoaded
        ) {
            // Trigger the deferred analysis now that the file is loaded
            if (draft.bitrate >= 256 || draft.format === "flac") {
                TrackFileService.analyzeForUpscale(node, draft);
            }
        }
    });

    async function handleSaveClick() {
        if (!draft || readonly) return;
        try {
            originalDraft = draft.createSnapshotClone();
            showDiffModal = true;
        } catch (err) {
            console.error("Failed to prepare diff clone:", err);
            alert("Failed to prepare diff.");
        }
    }

    async function performActualSave() {
        if (!node || !draft || readonly) return;
        try {
            await TrackFileService.saveTrack(node, draft);
            showDiffModal = false;
        } catch (err) {
            console.error("Failed to save:", err);
            alert("Failed to save the song metadata.");
        }
    }
</script>

<div
    class="w-full bg-base-100 shadow-2xl rounded-2xl overflow-hidden glass-panel border border-white/10 mt-6"
>
    {#if draft}
        <div class="flex flex-col lg:flex-row">
            <CoverArtEditor {draft} {readonly} />

            <div class="p-6 lg:w-[60%] flex flex-col justify-between text-left">
                <div>
                    <h2
                        class="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70 mb-1 truncate"
                        title={draft.fileName}
                    >
                        {draft.fileName}
                    </h2>

                    <AudioProperties {draft} />

                    <MetadataForm {draft} {readonly} {diffMap} {diffRole} />
                </div>

                {#if !readonly}
                    <div
                        class="mt-6 pt-4 border-t border-white/5 flex justify-end gap-2"
                    >
                        <button
                            class="btn btn-primary shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-transform"
                            onclick={handleSaveClick}
                            disabled={draft.saving}
                        >
                            {#if draft.saving}
                                <span class="loading loading-spinner loading-sm"
                                ></span> Preparing...
                            {:else}
                                Save Changes
                            {/if}
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

{#if showDiffModal && originalDraft}
    <MetadataDiffModal
        {originalDraft}
        modifiedDraft={draft}
        isOpen={showDiffModal}
        onConfirm={performActualSave}
        onCancel={() => (showDiffModal = false)}
    />
{/if}
