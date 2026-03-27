export interface DirectoryExerciseFile {
  id: string;
  type: 'file';
  name: string;
  /** Served URL to the GP/binary file, loaded directly by AlphaTab */
  filePath: string;
  sourceFormat: string;
  sourcePath: string;
}

export interface DirectoryFolder {
  id: string;
  type: 'folder';
  name: string;
  expanded: boolean;
  createdAt: string;
  children: DirectoryNode[];
}

export type DirectoryNode = DirectoryFolder | DirectoryExerciseFile;

export interface DirectoryTreeState {
  root: DirectoryFolder;
  selectedNodeId: string | null;
}
