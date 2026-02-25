<script lang="ts">
  import { workspaceStore } from "./lib/models/workspace/WorkspaceStore.svelte";
  import { appStore } from "./lib/state/AppStore.svelte";
  import FileExplorerGrid from "./lib/components/explorer/FileExplorerGrid.svelte";
  import BreadcrumbNav from "./lib/components/explorer/BreadcrumbNav.svelte";
  import SongEditor from "./lib/components/editor/SongEditor.svelte";
</script>

<main
  class="p-8 max-w-7xl mx-auto space-y-6 flex flex-col items-center min-h-screen"
>
  <div class="text-center space-y-2 mb-4">
    <h1
      class="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-blue-400 to-purple-500 bg-clip-text text-transparent"
    >
      Nomina
    </h1>
    <p class="text-base-content/60 text-sm">
      Fast & minimal local audio metadata editor via the File System Access API.
    </p>
  </div>

  <div class="w-full animate-fade-in">
    <BreadcrumbNav />
    {#if appStore.activeTrackDraft}
      <SongEditor
        draft={appStore.activeTrackDraft}
        node={appStore.activeTrackNode}
      />
    {:else}
      <FileExplorerGrid />
    {/if}
  </div>
</main>

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
