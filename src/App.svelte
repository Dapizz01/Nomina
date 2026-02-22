<script lang="ts">
  import { Song } from "./lib/models/Song.svelte";
  import SongEditor from "./lib/components/SongEditor.svelte";
  import AlertIcon from "./lib/components/icons/AlertIcon.svelte";

  let currentSong: Song | null = $state(null);

  let loading = $state(false);
  let errorMsg = $state("");

  async function askForFile() {
    try {
      loading = true;
      errorMsg = "";

      // 1. Get File System handle via Chromium API
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: "Audio Files",
            accept: { "audio/*": [".mp3", ".flac", ".ogg", ".m4a", ".wav"] },
          },
        ],
      });

      // 1.5. Clean up old Object URLs to prevent memory leak
      if (currentSong) {
        currentSong.destroy();
      }

      // 2. Delegate Metadata parsing to the Song Model!
      currentSong = await Song.loadFromFileHandle(handle);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("File selection error:", err);
        errorMsg = err.message || "Failed to load file.";
      }
    } finally {
      loading = false;
    }
  }

  async function saveChanges() {
    if (!currentSong) return;

    try {
      errorMsg = "";
      await currentSong.save();
    } catch (err: any) {
      console.error("Save error:", err);
      errorMsg = err.message || "Failed to save file changes.";
    }
  }
</script>

<main class="p-8 max-w-5xl mx-auto space-y-8 flex flex-col items-center">
  <div class="text-center space-y-4 max-w-2xl">
    <h1
      class="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-blue-400 to-purple-500 bg-clip-text text-transparent"
    >
      Nomina
    </h1>
    <p class="text-base-content/60 text-sm">
      File parsing is isolated in a Web Worker wrapper so the UI never freezes.
      Savings happen universally via the FileSystemSyncAccessHandle directly to
      disk.
    </p>

    <button
      class="btn btn-primary shadow-lg shadow-blue-500/20 px-8"
      onclick={askForFile}
      disabled={loading || currentSong?.saving}
    >
      {loading ? "Loading..." : "Load Audio File"}
    </button>
  </div>

  {#if errorMsg}
    <div
      class="alert alert-error font-medium shadow-lg max-w-xl text-sm w-full"
    >
      <AlertIcon class="stroke-current shrink-0 h-5 w-5" />
      {errorMsg}
    </div>
  {/if}

  {#if currentSong}
    <div class="w-full">
      <SongEditor song={currentSong} {loading} onsave={saveChanges} />
    </div>
  {/if}
</main>
