export interface WorkspaceNode {
    name: string;
    handle: FileSystemHandle;
    isLoaded: boolean;
    getChildren(): Promise<WorkspaceNode[]>;
}
