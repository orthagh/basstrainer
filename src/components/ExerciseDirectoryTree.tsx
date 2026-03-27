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
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onToggleFolder: (id: string) => void;
}

function TreeNode({ node, depth, selectedNodeId, onSelectNode, onToggleFolder }: TreeNodeProps) {
  const isSelected = selectedNodeId === node.id;
  const isFolder = node.type === 'folder';

  return (
    <div>
      {/* Row */}
      <div className="relative flex items-center">
        {/* Horizontal dotted connector (all nodes except root level) */}
        {depth > 0 && (
          <span
            className="absolute left-0 top-1/2 -translate-y-px border-t border-dotted border-border"
            style={{ width: 10 }}
          />
        )}

        <button
          onClick={() => {
            onSelectNode(node.id);
            if (isFolder) onToggleFolder(node.id);
          }}
          style={{ paddingLeft: depth > 0 ? 14 : 4 }}
          className={`w-full h-8 rounded-md text-left text-sm flex items-center gap-1.5 transition-colors pr-2 ${
            isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
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

      {/* Children — vertical dotted line on the left */}
      {isFolder && node.expanded && node.children.length > 0 && (
        <div
          className="border-l border-dotted border-border"
          style={{ marginLeft: depth === 0 ? 8 : 8 + 14 }}
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
