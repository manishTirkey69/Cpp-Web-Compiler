import fs from 'fs';
import path from 'path';

const RECENT_FILES_DIR_NAME = 'recent_files';
const RECENT_PROJECTS_FILE_NAME = 'recent_opened_projects.json';

const DEFAULT_RECENT_PROJECTS = [
  {
    path: 'C://coding//cpp//Cpp-Web-Compiler',
    projectName: 'Cpp-Web-Compiler',
    openedAt: '2026-05-08T09:15:00.000Z',
  },
  {
    path: 'C://coding//python//web_dev',
    projectName: 'web_dev',
    openedAt: '2026-05-07T12:30:00.000Z',
  },
  {
    path: 'C://coding//javascript//dashboard_ui',
    projectName: 'dashboard_ui',
    openedAt: '2026-05-06T16:45:00.000Z',
  },
  {
    path: 'C://coding//rust//api_gateway',
    projectName: 'api_gateway',
    openedAt: '2026-05-05T08:20:00.000Z',
  },
  {
    path: 'C://coding//java//spring_store',
    projectName: 'spring_store',
    openedAt: '2026-05-01T14:10:00.000Z',
  },
  {
    path: 'C://coding//go//devops_cli',
    projectName: 'devops_cli',
    openedAt: '2026-04-24T10:05:00.000Z',
  },
  {
    path: 'C://coding//react//portfolio_site',
    projectName: 'portfolio_site',
    openedAt: '2026-04-10T18:00:00.000Z',
  },
  {
    path: 'C://coding//python//ml_lab',
    projectName: 'ml_lab',
    openedAt: '2026-03-08T11:40:00.000Z',
  },
] as const;

function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function resolveProjectRoot(): string {
  const cwd = process.cwd();
  if (isDirectory(path.join(cwd, 'frontend')) && isDirectory(path.join(cwd, 'backend'))) {
    return cwd;
  }

  const parent = path.resolve(cwd, '..');
  if (isDirectory(path.join(parent, 'frontend')) && isDirectory(path.join(parent, 'backend'))) {
    return parent;
  }

  return cwd;
}

const projectRoot = resolveProjectRoot();
const recentFilesDir = path.join(projectRoot, RECENT_FILES_DIR_NAME);
const recentProjectsFile = path.join(recentFilesDir, RECENT_PROJECTS_FILE_NAME);

function ensureRecentProjectsFile(): void {
  fs.mkdirSync(recentFilesDir, { recursive: true });

  if (!fs.existsSync(recentProjectsFile)) {
    fs.writeFileSync(recentProjectsFile, JSON.stringify(DEFAULT_RECENT_PROJECTS, null, 2) + '\n', 'utf-8');
  }
}

export function getRecentProjectsPath(): string {
  ensureRecentProjectsFile();
  return recentProjectsFile;
}

export function readRecentProjects(): Array<Record<string, unknown>> {
  ensureRecentProjectsFile();

  try {
    const raw = fs.readFileSync(recentProjectsFile, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('Recent projects file must contain a JSON array.');
    }

    return parsed as Array<Record<string, unknown>>;
  } catch {
    fs.writeFileSync(recentProjectsFile, JSON.stringify(DEFAULT_RECENT_PROJECTS, null, 2) + '\n', 'utf-8');
    return [...DEFAULT_RECENT_PROJECTS];
  }
}
