import fs from 'fs';
import path from 'path';

const TEMPLATES_DIR_NAME = 'templates';
const UNTITLED_TEMPLATE_FILE_NAME = 'untitled_file.json';

const DEFAULT_UNTITLED_TEMPLATE = {
  headerfile: ['iostream'],
  body: ['using namespace std;', '', 'int main()', '{', '\t<CURSOR>', '\treturn 0;', '}'],
};

function normalizeTemplateLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry !== 'string') return [];
    const parts = entry.replace(/\r\n?/g, '\n').split('\n');
    if (parts.length > 1 && parts[parts.length - 1] === '') {
      parts.pop();
    }
    return parts;
  });
}

function normalizeUntitledTemplate(raw: unknown): typeof DEFAULT_UNTITLED_TEMPLATE {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_UNTITLED_TEMPLATE;
  }

  const template = raw as Record<string, unknown>;
  const headerfile = normalizeTemplateLines(template.headerfile);
  const body = normalizeTemplateLines(template.body);

  if (headerfile.length === 0 && body.length === 0) {
    return DEFAULT_UNTITLED_TEMPLATE;
  }

  return {
    headerfile,
    body,
  };
}

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
const templatesDir = path.join(projectRoot, TEMPLATES_DIR_NAME);
const untitledTemplateFile = path.join(templatesDir, UNTITLED_TEMPLATE_FILE_NAME);

function ensureUntitledTemplate(): void {
  fs.mkdirSync(templatesDir, { recursive: true });

  if (!fs.existsSync(untitledTemplateFile)) {
    fs.writeFileSync(untitledTemplateFile, JSON.stringify(DEFAULT_UNTITLED_TEMPLATE, null, 2) + '\n', 'utf-8');
  }
}

export function getUntitledTemplatePath(): string {
  ensureUntitledTemplate();
  return untitledTemplateFile;
}

export function readUntitledTemplate(): Record<string, unknown> {
  ensureUntitledTemplate();

  try {
    const raw = fs.readFileSync(untitledTemplateFile, 'utf-8');
    return normalizeUntitledTemplate(JSON.parse(raw));
  } catch {
    fs.writeFileSync(untitledTemplateFile, JSON.stringify(DEFAULT_UNTITLED_TEMPLATE, null, 2) + '\n', 'utf-8');
    return DEFAULT_UNTITLED_TEMPLATE;
  }
}
