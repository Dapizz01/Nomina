<script lang="ts">
    import FolderIcon from "../icons/FolderIcon.svelte";

    let { handle, onclick } = $props<{
        handle: any;
        onclick: () => void;
    }>();
</script>

<button
    class="w-full flex items-center gap-3 p-3 rounded-xl bg-base-300/40 hover:bg-base-200 hover:scale-[1.02] transition-all duration-300 border border-white/5 hover:border-primary/30 shadow-sm cursor-pointer text-left group"
    {onclick}
>
    <div
        class="p-2 rounded-lg bg-base-300 group-hover:bg-primary/20 transition-colors"
    >
        <FolderIcon
            class="w-6 h-6 text-base-content/70 group-hover:text-primary"
        />
    </div>
    <span class="font-medium text-sm truncate">{handle.name}</span>
</button>
