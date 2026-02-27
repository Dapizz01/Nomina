<script lang="ts">
    import type { TrackDraft } from "../../models/track/TrackDraft.svelte";
    import SongEditor from "./SongEditor.svelte";

    let {
        originalDraft,
        modifiedDraft,
        isOpen,
        onConfirm,
        onCancel,
    }: {
        originalDraft: TrackDraft;
        modifiedDraft: TrackDraft;
        isOpen: boolean;
        onConfirm: () => void;
        onCancel: () => void;
    } = $props();
</script>

<dialog
    class="modal modal-bottom sm:modal-middle bg-base-300/80 backdrop-blur-md"
    class:modal-open={isOpen}
>
    <div
        class="modal-box w-11/12 max-w-7xl bg-base-200 shadow-2xl overflow-y-auto"
    >
        <h3 class="font-bold text-lg mb-6 text-center">
            Review Changes Before Saving
        </h3>

        <div class="flex flex-col xl:flex-row items-stretch overflow-hidden">
            <!-- Left Side: Original -->
            <div class="flex-1 flex flex-col opacity-75">
                <div
                    class="text-center font-semibold text-sm tracking-widest uppercase text-base-content/50 mb-2"
                >
                    Original State
                </div>
                <div class="pointer-events-none filter grayscale-[30%]">
                    <SongEditor
                        draft={originalDraft}
                        readonly={true}
                        diffMap={modifiedDraft.getChanges()}
                        diffRole="original"
                    />
                </div>
            </div>

            <!-- Divider -->
            <div
                class="divider xl:divider-horizontal text-base-content/40 text-sm tracking-widest uppercase my-8 xl:mx-4"
            >
                vs
            </div>

            <!-- Right Side: Modified -->
            <div class="flex-1 flex flex-col relative">
                <div
                    class="text-center font-bold text-sm tracking-widest uppercase text-primary mb-2"
                >
                    New State
                </div>
                <div
                    class="pointer-events-none ring-2 ring-primary/20 rounded-2xl shadow-[0_0_30px_-5px_var(--fallback-p,oklch(var(--p)/0.2))]"
                >
                    <SongEditor
                        draft={modifiedDraft}
                        readonly={true}
                        diffMap={modifiedDraft.getChanges()}
                        diffRole="modified"
                    />
                </div>
            </div>
        </div>

        <div
            class="modal-action mt-8 pt-6 border-t border-base-content/10 flex justify-end gap-3"
        >
            <button
                class="btn btn-ghost px-6"
                onclick={onCancel}
                disabled={modifiedDraft.saving}>Cancel</button
            >
            <button
                class="btn btn-primary px-8 shadow-lg shadow-blue-500/20"
                onclick={onConfirm}
                disabled={modifiedDraft.saving}
            >
                {#if modifiedDraft.saving}
                    <span class="loading loading-spinner loading-sm"></span> Writing
                    to Disk...
                {:else}
                    Confirm Save
                {/if}
            </button>
        </div>
    </div>

    <!-- Backdrop -->
    {#if !modifiedDraft.saving}
        <form method="dialog" class="modal-backdrop">
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button onclick={onCancel} type="button"></button>
        </form>
    {/if}
</dialog>
