import type { TrackDraft } from "$lib/models/track/TrackDraft.svelte";
import type { WorkspaceTrack } from "$lib/models/workspace/WorkspaceTrack";

class AppStore {
    activeTrackNode: WorkspaceTrack | null = $state(null);
    activeTrackDraft: TrackDraft | null = $state(null);

    clearActiveTrack() {
        this.activeTrackNode = null;
        this.activeTrackDraft = null;
    }
}

export const appStore = new AppStore();
