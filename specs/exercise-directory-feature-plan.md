# Exercise Directory + GP Import Feature Plan

Date: 2026-03-27

## Goals

1. Add a new first menu entry for an Exercise Directory view.
2. Support a folder tree so imported exercises can be organized.
3. Allow importing `.gp*` files from the local machine and converting them to AlphaTex for playback.
4. Selecting a file launches a player view with AlphaTab and transport controls similar to Groove Trainer.
5. Persist the last opened directory exercise in browser storage.
6. Improve loop UX in both player contexts by letting the user choose loop start/end placement.

## Scope

### In scope

- New app view: `directory` shown first in header navigation.
- New Exercise Directory page with:
  - Folder tree (expand/collapse).
  - Folder creation under selected folder.
  - File import into selected folder.
  - File selection and playback.
- Browser-only persistence via `localStorage`:
  - Directory tree and imported files.
  - Last opened directory exercise id.
- GP/GPX/MusicXML import and conversion to AlphaTex using AlphaTab importer/exporter APIs.
- Reuse existing AlphaTab player UI and transport where possible.
- Loop range controls in AlphaTab player:
  - Choose start bar and end bar.
  - Apply or clear playback range.
  - Keep keyboard `L` as loop on/off.

### Out of scope (for this iteration)

- Drag and drop reorder/move in tree.
- File System Access API persistent handle permissions.
- Server/cloud sync.
- Full file/folder rename and delete history.
- Native `.gp` writing/export.

## User Flow

1. User clicks new `Directory` menu item (first in nav).
2. User creates folders (e.g. `Professor > Semester 2 > Grooves`).
3. User selects a folder and imports one or more `.gp` files.
4. App converts files to AlphaTex and stores resulting items in localStorage.
5. User clicks a file in tree; player opens with score and transport controls.
6. App remembers this selection and restores it on next visit.
7. User sets loop start/end bars and toggles loop playback.

## Data Model

Store in `localStorage` under `groovetrainer:exerciseDirectory:v1`.

```ts
type DirectoryNode = DirectoryFolder | DirectoryExercise;

interface DirectoryFolder {
  id: string;
  type: 'folder';
  name: string;
  expanded: boolean;
  children: DirectoryNode[];
  createdAt: string;
}

interface DirectoryExercise {
  id: string;
  type: 'file';
  name: string;
  tex: string;
  sourceFormat: 'gp' | 'gpx' | 'gp3' | 'gp4' | 'gp5' | 'xml' | 'musicxml' | 'unknown';
  createdAt: string;
}
```

Additional key:

- `groovetrainer:lastOpenedDirectoryExerciseId`

## Conversion Strategy

Use AlphaTab runtime APIs:

1. Read uploaded file bytes (`Uint8Array`).
2. Parse score via `ScoreLoader.loadScoreFromBytes`.
3. Convert score to AlphaTex via `AlphaTexExporter.exportToString`.
4. Persist AlphaTex in directory file node.

Fallback behavior:

- If conversion fails, show non-blocking error and skip that file.

## Loop System Improvements

Enhance `AlphaTabView` loop controls:

1. Compute bar boundaries from loaded score.
2. Expose UI controls to choose loop start/end bar.
3. Apply loop by setting `api.playbackRange = { startTick, endTick }`.
4. Keep `api.isLooping` toggle (existing `L` shortcut).
5. Add clear action to remove custom range.

This applies automatically to both:

- Existing trainer exercises.
- New directory-launched exercises.

## Implementation Steps

### Step 1: Foundation + navigation

- Add `directory` app view and make it the first menu item.
- Add a new `ExerciseDirectoryPage` shell component.
- Add persistence hook/service for directory tree state.

### Step 2: Import + tree UI

- Add folder creation and tree rendering.
- Add file import action and conversion service.
- Persist converted files in tree.

### Step 3: Player integration + last-opened restore

- Render selected directory file in existing AlphaTab player.
- Restore last opened directory file when available.

### Step 4: Loop range controls

- Add loop range UI (start/end bar) to `AlphaTabView`.
- Wire playback range application/clearing.
- Ensure behavior works from trainer and directory views.

### Step 5: Tests and validation

- Unit tests for directory storage helpers.
- Unit tests for conversion service input/output contracts (mock parser/exporter).
- Basic component tests for tree interactions and restore behavior.

## Risks and Mitigations

1. Large GP files may exceed localStorage limits.
   - Mitigation: keep only AlphaTex output, skip raw binaries.
2. Some GP constructs may not map perfectly to AlphaTex.
   - Mitigation: display conversion warning with file name and continue.
3. Loop range invalid selections.
   - Mitigation: enforce `start <= end`, auto-clamp.

## Acceptance Criteria

1. A new `Directory` menu is visible first in app navigation.
2. Users can create folders and import GP files into selected folders.
3. Imported files appear in tree and can be opened.
4. Opening a file displays AlphaTab with play/pause/stop/tempo/loop controls.
5. Last opened directory file is restored after reload.
6. Loop start/end can be user-defined and applied in both trainer and directory player contexts.
