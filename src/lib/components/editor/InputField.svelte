<script lang="ts">
    let {
        label,
        value = $bindable(),
        placeholder = "",
        type = "text",
        spanClass = "md:col-span-2",
    } = $props<{
        label: string;
        value: string | number;
        placeholder?: string;
        type?: "text" | "number";
        spanClass?: string;
    }>();
</script>

<label class="form-control w-full {spanClass}">
    <div class="label pt-0 pb-1">
        <span
            class="label-text opacity-70 text-xs font-bold uppercase tracking-wider"
        >
            {label}
        </span>
    </div>
    <input
        {type}
        bind:value
        class="input input-sm input-bordered w-full bg-base-300/30 focus:border-primary/50 transition-colors"
        {placeholder}
    />
</label>
