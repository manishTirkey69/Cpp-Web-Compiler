import fs from 'fs';
import os from 'os';
import path from 'path';
import { WebSocket } from 'ws';

type ProjectNode =
  | {
      kind: 'file';
      id: string;
      name: string;
      content: string;
      isLoaded: boolean;
      savedHandle: null;
      serverPath: string;
    }
  | {
      kind: 'folder';
      id: string;
      name: string;
      collapsed: boolean;
      isLoaded: boolean;
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
  const normalizedRoot = path.resolve(projectBrowserRoot);
  const normalizedTarget = path.resolve(targetPath);
  const rootWithSep = `${normalizedRoot}${path.sep}`;
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(rootWithSep);
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

function buildDirectoryEntry(entryPath: string, entry: fs.Dirent): ProjectNode {
  if (entry.isDirectory()) {
    return {
      kind: 'folder',
      id: nextNodeId(),
      name: entry.name,
      collapsed: true,
      isLoaded: false,
      savedHandle: null,
      serverPath: entryPath,
      children: [],
    };
  }

  return {
    kind: 'file',
    id: nextNodeId(),
    name: entry.name,
    content: '',
    isLoaded: false,
    savedHandle: null,
    serverPath: entryPath,
  };
}

function readDirectoryChildren(directoryPath: string): ProjectNode[] {
  return sortEntries(readDirectoryEntries(directoryPath)).map((entry) =>
    buildDirectoryEntry(path.join(directoryPath, entry.name), entry),
  );
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

export function readProjectTree(projectPath: string) {
  const resolvedPath = resolveBrowsePath(projectPath);
  const stat = fs.statSync(resolvedPath);

  if (!stat.isDirectory()) {
    throw new Error('Requested project path is not a directory.');
  }

  const projectRoot: ProjectNode = {
    kind: 'folder',
    id: nextNodeId(),
    name: path.basename(resolvedPath),
    collapsed: false,
    isLoaded: true,
    savedHandle: null,
    serverPath: resolvedPath,
    children: readDirectoryChildren(resolvedPath),
  };

  return {
    projectName: projectRoot.name,
    projectPath: resolvedPath,
    tree: [projectRoot],
  };
}

export function readProjectDirectory(directoryPath: string) {
  const resolvedPath = resolveBrowsePath(directoryPath);
  const stat = fs.statSync(resolvedPath);

  if (!stat.isDirectory()) {
    throw new Error('Requested directory path is not a directory.');
  }

  return {
    path: resolvedPath,
    children: readDirectoryChildren(resolvedPath),
  };
}

export function readProjectFile(filePath: string) {
  const resolvedPath = resolveBrowsePath(filePath);
  const stat = fs.statSync(resolvedPath);

  if (!stat.isFile()) {
    throw new Error('Requested project file path is not a file.');
  }

  return {
    path: resolvedPath,
    content: fs.readFileSync(resolvedPath, 'utf-8'),
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

function walkDirectories(rootPath: string): string[] {
  const result = [rootPath];
  for (const entry of readDirectoryEntries(rootPath)) {
    if (!entry.isDirectory()) continue;
    result.push(...walkDirectories(path.join(rootPath, entry.name)));
  }
  return result;
}

export function watchProjectRoots(ws: WebSocket, roots: string[]) {
  const resolvedRoots = roots
    .map((root) => resolveBrowsePath(root))
    .filter((root, index, all) => all.indexOf(root) === index);

  const watchers = new Map<string, fs.FSWatcher>();
  let notifyTimer: NodeJS.Timeout | null = null;

  const sendRefresh = () => {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: 'refresh', roots: resolvedRoots }));
  };

  const scheduleRefresh = () => {
    if (notifyTimer) clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => {
      notifyTimer = null;
      try {
        for (const watcher of watchers.values()) watcher.close();
      } catch {
        // ignore
      }
      watchers.clear();
      startWatching();
      sendRefresh();
    }, 150);
  };

  const startWatching = () => {
    for (const root of resolvedRoots) {
      const stats = fs.statSync(root);
      if (!stats.isDirectory()) continue;

      for (const directoryPath of walkDirectories(root)) {
        if (watchers.has(directoryPath)) continue;
        try {
          const watcher = fs.watch(directoryPath, { persistent: false }, () => {
            scheduleRefresh();
          });
          watchers.set(directoryPath, watcher);
        } catch {
          // ignore directories that cannot be watched
        }
      }
    }
  };

  startWatching();

  return () => {
    if (notifyTimer) clearTimeout(notifyTimer);
    for (const watcher of watchers.values()) {
      try {
        watcher.close();
      } catch {
        // ignore
      }
    }
    watchers.clear();
  };
}
