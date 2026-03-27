import { useCallback, useMemo, useState } from 'react';
import type { DirectoryExerciseFile, DirectoryFolder, DirectoryNode } from './types';

// Vite discovers all GP files at build time and serves them as static assets.
// Keys are root-relative paths like '/repository-exercises/Jules/file.gp'.
// Values are the served URLs (hashed in production builds).
const GP_FILES = import.meta.glob<string>(
  '/repository-exercises/**/*.{gp,gpx,gp3,gp4,gp5}',
  { eager: true, query: '?url', import: 'default' },
);

const LAST_OPENED_KEY = 'groovetrainer:lastOpenedDirectoryExerciseId';

// ── Tree builder ──────────────────────────────────────────────────────────────

function buildTree(files: Record<string, string>): DirectoryFolder {
  const root: DirectoryFolder = {
    id: 'repo-root',
    type: 'folder',
    name: 'Repository',
    expanded: true,
    createdAt: '',
    children: [],
  };

  const sortedPaths = Object.keys(files).sort();

  for (const absPath of sortedPaths) {
    const url = files[absPath];
    const rel = absPath.replace(/^\/repository-exercises\//, '');
    const parts = rel.split('/');
    const fileName = parts[parts.length - 1];
    const ext = fileName.split('.').pop() ?? '';

    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const folderPath = parts.slice(0, i + 1).join('/');
      let folder = current.children.find(
        (c): c is DirectoryFolder => c.type === 'folder' && c.name === part,
      );
      if (!folder) {
        folder = {
          id: `repo-folder:${folderPath}`,
          type: 'folder',
          name: part,
          expanded: false,
          createdAt: '',
          children: [],
        };
        current.children.push(folder);
      }
      current = folder;
    }

    const fileNode: DirectoryExerciseFile = {
      id: `repo-file:${rel}`,
      type: 'file',
      name: fileName,
      filePath: url,
      sourceFormat: ext,
      sourcePath: rel,
    };
    current.children.push(fileNode);
  }

  return root;
}

const REPOSITORY_DATA = buildTree(GP_FILES);

// ── Helpers ───────────────────────────────────────────────────────────────────

function walk(node: DirectoryNode, fn: (node: DirectoryNode) => void): void {
  fn(node);
  if (node.type === 'folder') {
    for (const child of node.children) walk(child, fn);
  }
}

function findNode(root: DirectoryFolder, id: string | null): DirectoryNode | null {
  if (!id) return null;
  let found: DirectoryNode | null = null;
  walk(root, (node) => { if (node.id === id) found = node; });
  return found;
}

function findFirstFile(root: DirectoryFolder): DirectoryExerciseFile | null {
  let found: DirectoryExerciseFile | null = null;
  walk(root, (node) => { if (!found && node.type === 'file') found = node; });
  return found;
}

function findFileById(root: DirectoryFolder, fileId: string | null): DirectoryExerciseFile | null {
  if (!fileId) return null;
  let result: DirectoryExerciseFile | null = null;
  walk(root, (node) => { if (node.type === 'file' && node.id === fileId) result = node; });
  return result;
}

function findParentFolderId(root: DirectoryFolder, childId: string): string | null {
  let parentId: string | null = null;
  const scan = (node: DirectoryNode): void => {
    if (node.type !== 'folder') return;
    for (const child of node.children) {
      if (child.id === childId) { parentId = node.id; return; }
      scan(child);
    }
  };
  scan(root);
  return parentId;
}

function updateNode(
  node: DirectoryNode,
  targetId: string,
  updater: (node: DirectoryNode) => DirectoryNode,
): DirectoryNode {
  if (node.id === targetId) return updater(node);
  if (node.type !== 'folder') return node;
  return { ...node, children: node.children.map((c) => updateNode(c, targetId, updater)) };
}

/** Collect IDs of all folders that are ancestors of `targetId`. */
function findAncestorFolderIds(root: DirectoryFolder, targetId: string): Set<string> {
  const ancestors = new Set<string>();
  const search = (node: DirectoryNode, path: string[]): boolean => {
    if (node.id === targetId) return true;
    if (node.type !== 'folder') return false;
    for (const child of node.children) {
      if (search(child, [...path, node.id])) {
        path.forEach((id) => ancestors.add(id));
        ancestors.add(node.id);
        return true;
      }
    }
    return false;
  };
  search(root, []);
  return ancestors;
}

/** Return a new tree with all folders in `ids` expanded. */
function expandFolders(node: DirectoryNode, ids: Set<string>): DirectoryNode {
  if (node.type !== 'folder') return node;
  return {
    ...node,
    expanded: ids.has(node.id) ? true : node.expanded,
    children: node.children.map((c) => expandFolders(c, ids)),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useExerciseDirectory() {
  const [root, setRoot] = useState<DirectoryFolder>(() => {
    const tree = structuredClone(REPOSITORY_DATA);
    const lastOpened = localStorage.getItem(LAST_OPENED_KEY);
    const target = findFileById(tree, lastOpened) ?? findFirstFile(tree);
    if (target) {
      const ancestors = findAncestorFolderIds(tree, target.id);
      return expandFolders(tree, ancestors) as DirectoryFolder;
    }
    return tree;
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(() => {
    const lastOpened = localStorage.getItem(LAST_OPENED_KEY);
    const byLast = findFileById(REPOSITORY_DATA, lastOpened);
    if (byLast) return byLast.id;
    return findFirstFile(REPOSITORY_DATA)?.id ?? null;
  });

  const selectedNode = useMemo(() => findNode(root, selectedNodeId), [root, selectedNodeId]);

  const selectedFolderId = useMemo(() => {
    if (!selectedNode) return root.id;
    if (selectedNode.type === 'folder') return selectedNode.id;
    return findParentFolderId(root, selectedNode.id) ?? root.id;
  }, [root, selectedNode]);

  const selectedFile = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'file') return null;
    return selectedNode;
  }, [selectedNode]);

  const toggleFolder = useCallback((folderId: string) => {
    setRoot((prev) => updateNode(prev, folderId, (node) => {
      if (node.type !== 'folder') return node;
      return { ...node, expanded: !node.expanded };
    }) as DirectoryFolder);
  }, []);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    const file = findFileById(root, nodeId);
    if (file) localStorage.setItem(LAST_OPENED_KEY, file.id);
  }, [root]);

  return { root, selectedNodeId, selectedFolderId, selectedFile, toggleFolder, selectNode };
}
