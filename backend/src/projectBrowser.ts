import fs from 'fs';
import os from 'os';
import path from 'path';

type ProjectNode =
  | {
      kind: 'file';
      id: string;
      name: string;
      content: string;
      savedHandle: null;
      serverPath: string;
    }
  | {
      kind: 'folder';
      id: string;
      name: string;
      collapsed: boolean;
      savedHandle: null;
      serverPath: string;
      children: ProjectNode[];
    };

let nodeCounter = 0;

function nextNodeId(): string {
  nodeCounter += 1;
  return `server_node_${nodeCounter}`;
}

const projectBrowserRoot = path.resolve(process.env.PROJECT_BROWSER_ROOT ?? os.homedir());

function isWithinRoot(targetPath: string): boolean {
  const rootWithSep = `${projectBrowserRoot}${path.sep}`;
  return targetPath === projectBrowserRoot || targetPath.startsWith(rootWithSep);
}

export function resolveBrowsePath(inputPath?: string): string {
  const targetPath = path.resolve(inputPath?.trim() || projectBrowserRoot);

  if (!isWithinRoot(targetPath)) {
    throw new Error('Requested path is outside the allowed project browser root.');
  }

  return targetPath;
}

function readDirectoryEntries(directoryPath: string): fs.Dirent[] {
  return fs.readdirSync(directoryPath, { withFileTypes: true });
}

function sortEntries(entries: fs.Dirent[]): fs.Dirent[] {
  return [...entries].sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) {
      return left.isDirectory() ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

export function listProjectDirectories(currentPath?: string) {
  const directoryPath = resolveBrowsePath(currentPath);
  const stat = fs.statSync(directoryPath);

  if (!stat.isDirectory()) {
    throw new Error('Requested path is not a directory.');
  }

  const directories = sortEntries(readDirectoryEntries(directoryPath))
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(directoryPath, entry.name),
    }));

  const parentPath =
    directoryPath === projectBrowserRoot ? null : path.dirname(directoryPath);

  return {
    rootPath: projectBrowserRoot,
    currentPath: directoryPath,
    parentPath: parentPath && isWithinRoot(parentPath) ? parentPath : null,
    directories,
  };
}

function readProjectFile(filePath: string): ProjectNode {
  return {
    kind: 'file',
    id: nextNodeId(),
    name: path.basename(filePath),
    content: fs.readFileSync(filePath, 'utf-8'),
    savedHandle: null,
    serverPath: filePath,
  };
}

function readProjectFolder(folderPath: string): ProjectNode {
  const children = sortEntries(readDirectoryEntries(folderPath)).map((entry) => {
    const entryPath = path.join(folderPath, entry.name);
    return entry.isDirectory() ? readProjectFolder(entryPath) : readProjectFile(entryPath);
  });

  return {
    kind: 'folder',
    id: nextNodeId(),
    name: path.basename(folderPath),
    collapsed: true,
    savedHandle: null,
    serverPath: folderPath,
    children,
  };
}

export function readProjectTree(projectPath: string) {
  const resolvedPath = resolveBrowsePath(projectPath);
  const stat = fs.statSync(resolvedPath);

  if (!stat.isDirectory()) {
    throw new Error('Requested project path is not a directory.');
  }

  const projectRoot = readProjectFolder(resolvedPath);

  return {
    projectName: projectRoot.name,
    projectPath: resolvedPath,
    tree: [projectRoot],
  };
}

export function writeProjectFile(filePath: string, content: string): void {
  const resolvedPath = resolveBrowsePath(filePath);
  const stat = fs.statSync(resolvedPath);

  if (!stat.isFile()) {
    throw new Error('Requested project file path is not a file.');
  }

  fs.writeFileSync(resolvedPath, content, 'utf-8');
}
