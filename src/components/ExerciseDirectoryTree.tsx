import { FileMusic, Folder, FolderOpen } from 'lucide-react';
import type { DirectoryFolder, DirectoryNode } from '../features/exerciseDirectory/types';

interface ExerciseDirectoryTreeProps {
  root: DirectoryFolder;
  selectedNodeId: string | null;
  selectedFolderId: string;
  onSelectNode: (id: string) => void;
  onToggleFolder: (id: string) => void;
}

export default function ExerciseDirectoryTree({
  root,
  selectedNodeId,
  onSelectNode,
  onToggleFolder,
}: ExerciseDirectoryTreeProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-2 scrollbar-autohide">
        {root.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={0}
            isLast={true}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onToggleFolder={onToggleFolder}
          />
        ))}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: DirectoryNode;
  depth: number;
  isLast: boolean;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onToggleFolder: (id: string) => void;
}

function TreeNode({ node, depth, isLast, selectedNodeId, onSelectNode, onToggleFolder }: TreeNodeProps) {
  const isSelected = selectedNodeId === node.id;
  const isFolder = node.type === 'folder';

  return (
    <div>
      {/* Row */}
      <div className="relative flex items-center">
        {depth > 0 && (
          <>
            {/* For last child: half-height stub connecting to horizontal bar.
                For non-last children: the parent wrapper's border-l provides the full line. */}
            {isLast && (
              <span
                className="absolute left-0 top-0 border-l border-dotted border-white/20"
                style={{ height: '50%' }}
              />
            )}
            {/* Horizontal connector */}
            <span
              className="absolute left-0 top-1/2 -translate-y-px border-t border-dotted border-white/20"
              style={{ width: 12 }}
            />
          </>
        )}

        <button
          onClick={() => {
            onSelectNode(node.id);
            if (isFolder) onToggleFolder(node.id);
          }}
          style={{ paddingLeft: depth > 0 ? 12 : 4 }}
          className={`w-full h-8 rounded-md text-left text-sm flex items-center gap-1.5 transition-colors pr-2 ${
            isSelected ? 'text-primary' : 'text-zinc-300 hover:bg-white/10 hover:text-zinc-100'
          }`}
          title={node.name}
        >
          {isFolder
            ? (node.expanded ? <FolderOpen size={14} className="shrink-0" /> : <Folder size={14} className="shrink-0" />)
            : <FileMusic size={13} className="shrink-0" />
          }
          <span className="truncate font-medium">{node.name}</span>
        </button>
      </div>

      {/* Children — border-l is on each child wrapper, not the container,
          so the line stops at the last sibling and never bleeds into its subtree. */}
      {isFolder && node.expanded && node.children.length > 0 && (
        <div style={{ marginLeft: depth === 0 ? 12 : 20 }}>
          {node.children.map((child, index) => {
            const childIsLast = index === node.children.length - 1;
            return (
              <div
                key={child.id}
                className={childIsLast ? '' : 'border-l border-dotted border-white/20'}
              >
                <TreeNode
                  node={child}
                  depth={depth + 1}
                  isLast={childIsLast}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                  onToggleFolder={onToggleFolder}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
