<script lang="ts">
    let {
        label,
        value = $bindable(),
        placeholder = "",
        type = "text",
        spanClass = "md:col-span-2",
        disabled = false,
        diffStatus = null,
    } = $props<{
        label: string;
        value: string | number;
        placeholder?: string;
        type?: "text" | "number";
        spanClass?: string;
        disabled?: boolean;
        diffStatus?: "warning" | "success" | null;
    }>();
</script>

<label class="form-control w-full {spanClass}">
    <div class="label pt-0 pb-1">
        <span
            class="label-text opacity-70 text-xs font-bold uppercase tracking-wider"
            class:text-warning={diffStatus === "warning"}
            class:text-success={diffStatus === "success"}
        >
            {label}
        </span>
    </div>
    <input
        {type}
        bind:value
        readonly={disabled}
        class="input input-sm input-bordered w-full bg-base-300/30 focus:border-primary/50 transition-colors"
        class:opacity-70={disabled}
        class:input-warning={diffStatus === "warning"}
        class:input-success={diffStatus === "success"}
        {placeholder}
    />
</label>
