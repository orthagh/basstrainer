import fs from 'node:fs/promises';
import path from 'node:path';
import { exporter, importer, Settings } from '@coderline/alphatab';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'repository-exercises');
const outputEntryPath = path.join(repoRoot, 'src', 'data', 'repositoryExercises.generated.ts');
const outputDir = path.join(repoRoot, 'src', 'data', 'repositoryExercises.generated');

const supportedExtensions = new Set(['.gp', '.gpx', '.gp3', '.gp4', '.gp5', '.musicxml', '.xml']);

function detectSourceFormat(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.gp3')) return 'gp3';
  if (lower.endsWith('.gp4')) return 'gp4';
  if (lower.endsWith('.gp5')) return 'gp5';
  if (lower.endsWith('.gpx')) return 'gpx';
  if (lower.endsWith('.gp')) return 'gp';
  if (lower.endsWith('.musicxml')) return 'musicxml';
  if (lower.endsWith('.xml')) return 'xml';
  return 'unknown';
}

function toId(relativePath, prefix) {
  return `${prefix}:${relativePath.replaceAll('\\\\', '/').replace(/[^a-zA-Z0-9/_\-.]/g, '_')}`;
}

function sanitizeModuleSegment(value) {
  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '_');
  return /^[0-9]/.test(sanitized) ? `_${sanitized}` : sanitized;
}

function toImportPath(fromFilePath, toFilePath) {
  const relativePath = path.relative(path.dirname(fromFilePath), toFilePath).replaceAll('\\', '/');
  const withoutExtension = relativePath.replace(/\.ts$/, '');
  return withoutExtension.startsWith('.') ? withoutExtension : `./${withoutExtension}`;
}

async function readDirectoryRecursive(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name, 'en');
  });

  return entries;
}

async function buildFolderNode(currentPath, relativePath = '') {
  const entries = await readDirectoryRecursive(currentPath);
  const children = [];

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);
    const childRelative = relativePath ? path.posix.join(relativePath, entry.name) : entry.name;

    if (entry.isDirectory()) {
      const childFolder = await buildFolderNode(entryPath, childRelative);
      children.push(childFolder);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!supportedExtensions.has(ext)) {
      continue;
    }

    const fileBuffer = await fs.readFile(entryPath);
    const settings = new Settings();
    const score = importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(fileBuffer), settings);
    const alphaTexExporter = new exporter.AlphaTexExporter();
    const tex = alphaTexExporter.exportToString(score, settings);

    children.push({
      id: toId(childRelative, 'repo-file'),
      type: 'file',
      name: entry.name,
      tex,
      sourceFormat: detectSourceFormat(entry.name),
      sourcePath: childRelative,
      createdAt: new Date().toISOString(),
    });
  }

  const folderName = relativePath ? path.basename(currentPath) : 'Repository Exercises';
  return {
    id: toId(relativePath || 'root', 'repo-folder'),
    type: 'folder',
    name: folderName,
    expanded: true,
    createdAt: new Date().toISOString(),
    children,
  };
}

function formatFileModule(node, filePath) {
  const typesPath = toImportPath(
    filePath,
    path.join(repoRoot, 'src', 'features', 'exerciseDirectory', 'types.ts'),
  );

  const serialized = JSON.stringify(node, null, 2);
  return `import type { DirectoryExerciseFile } from '${typesPath}';\n\n` +
    `const directoryNode: DirectoryExerciseFile = ${serialized};\n\n` +
    `export default directoryNode;\n`;
}

function formatFolderModule(node, filePath, childImports) {
  const typesPath = toImportPath(
    filePath,
    path.join(repoRoot, 'src', 'features', 'exerciseDirectory', 'types.ts'),
  );
  const importBlock = childImports.length === 0
    ? ''
    : childImports.map(({ localName, importPath }) => `import ${localName} from '${importPath}';`).join('\n') + '\n\n';
  const childrenBlock = childImports.length === 0
    ? '[]'
    : `[\n${childImports.map(({ localName }) => `    ${localName},`).join('\n')}\n  ]`;

  return `import type { DirectoryFolder } from '${typesPath}';\n` +
    importBlock +
    `const directoryNode: DirectoryFolder = {\n` +
    `  id: ${JSON.stringify(node.id)},\n` +
    `  type: 'folder',\n` +
    `  name: ${JSON.stringify(node.name)},\n` +
    `  expanded: ${JSON.stringify(node.expanded)},\n` +
    `  createdAt: ${JSON.stringify(node.createdAt)},\n` +
    `  children: ${childrenBlock},\n` +
    `};\n\n` +
    `export default directoryNode;\n`;
}

async function writeFolderModules(node, moduleDirPath) {
  await fs.mkdir(moduleDirPath, { recursive: true });

  const childImports = [];

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    const localName = `child_${index}`;

    if (child.type === 'folder') {
      const childDirPath = path.join(moduleDirPath, child.name);
      await writeFolderModules(child, childDirPath);
      childImports.push({
        localName,
        importPath: toImportPath(path.join(moduleDirPath, 'index.ts'), path.join(childDirPath, 'index.ts')),
      });
      continue;
    }

    const moduleBaseName = sanitizeModuleSegment(child.name);
    const childFilePath = path.join(moduleDirPath, `${moduleBaseName}.ts`);
    await fs.writeFile(childFilePath, formatFileModule(child, childFilePath), 'utf8');
    childImports.push({
      localName,
      importPath: toImportPath(path.join(moduleDirPath, 'index.ts'), childFilePath),
    });
  }

  const folderIndexPath = path.join(moduleDirPath, 'index.ts');
  await fs.writeFile(folderIndexPath, formatFolderModule(node, folderIndexPath, childImports), 'utf8');
}

async function writeEntryPoint() {
  const importPath = toImportPath(outputEntryPath, path.join(outputDir, 'index.ts'));
  const content = `export { default as repositoryDirectoryData } from '${importPath}';\n`;
  await fs.writeFile(outputEntryPath, content, 'utf8');
}

async function run() {
  try {
    await fs.access(sourceRoot);
  } catch {
    throw new Error(`Missing source folder: ${sourceRoot}`);
  }

  const tree = await buildFolderNode(sourceRoot);
  await fs.rm(outputDir, { recursive: true, force: true });
  await writeFolderModules(tree, outputDir);
  await writeEntryPoint();

  let fileCount = 0;
  const countFiles = (node) => {
    if (node.type === 'file') {
      fileCount += 1;
      return;
    }
    for (const child of node.children) {
      countFiles(child);
    }
  };
  countFiles(tree);

  console.log(`Converted ${fileCount} exercise file(s).`);
  console.log(`Generated: ${path.relative(repoRoot, outputEntryPath)}`);
  console.log(`Generated: ${path.relative(repoRoot, outputDir)}`);
}

run().catch((error) => {
  console.error('[exercises:convert] Failed:', error.message);
  process.exitCode = 1;
});
