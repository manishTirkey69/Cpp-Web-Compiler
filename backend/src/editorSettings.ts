import fs from 'fs';
import path from 'path';

const SETTINGS_DIR_NAME = 'editor-settings';
const DEFAULT_SETTINGS_FILE_NAME = 'monaco-editor-settings.json';
const USER_SETTINGS_FILE_NAME = 'user-monaco-editor-settings.json';

const DEFAULT_SETTINGS = {
  theme: 'vs-dark',
  automaticLayout: true,
  detectIndentation: false,
  insertSpaces: true,
  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
  fontSize: 14,
  lineHeight: 22,
  tabSize: 2,
  lineNumbers: 'on',
  wordWrap: 'off',
  minimap: { enabled: true },
  folding: true,
  glyphMargin: false,
  stickyScroll: { enabled: false },
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'off',
  autoClosingBrackets: 'languageDefined',
  autoClosingQuotes: 'languageDefined',
  autoIndent: 'advanced',
  cursorBlinking: 'blink',
  cursorStyle: 'line',
  cursorSmoothCaretAnimation: 'off',
  renderWhitespace: 'selection',
  renderControlCharacters: false,
  fontLigatures: false,
  bracketPairColorization: { enabled: true },
  guides: {
    indentation: true,
    bracketPairs: true,
  },
  lineNumbersMinChars: 3,
  roundedSelection: true,
  selectionHighlight: true,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  mouseWheelZoom: true,
  formatOnPaste: false,
  formatOnType: false,
  linkedEditing: false,
  readOnly: false,
  padding: { top: 14, bottom: 14 },
  scrollbar: { alwaysConsumeMouseWheel: false },
  unicodeHighlight: { ambiguousCharacters: false },
};

function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function resolveProjectRoot(): string {
  const cwd = process.cwd();
  const cwdLooksLikeRepoRoot =
    isDirectory(path.join(cwd, 'frontend')) &&
    isDirectory(path.join(cwd, 'backend'));

  if (cwdLooksLikeRepoRoot) return cwd;

  const parent = path.resolve(cwd, '..');
  const parentLooksLikeRepoRoot =
    isDirectory(path.join(parent, 'frontend')) &&
    isDirectory(path.join(parent, 'backend'));

  if (parentLooksLikeRepoRoot) return parent;

  return cwd;
}

const projectRoot = resolveProjectRoot();
const settingsDir = path.join(projectRoot, SETTINGS_DIR_NAME);
const defaultSettingsFile = path.join(settingsDir, DEFAULT_SETTINGS_FILE_NAME);
const userSettingsFile = path.join(settingsDir, USER_SETTINGS_FILE_NAME);

function ensureSettingsFile(): void {
  fs.mkdirSync(settingsDir, { recursive: true });

  if (!fs.existsSync(defaultSettingsFile)) {
    fs.writeFileSync(defaultSettingsFile, JSON.stringify(DEFAULT_SETTINGS, null, 2) + '\n', 'utf-8');
  }
}

function readJsonObject(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Settings file must contain a JSON object.');
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mergeObjects(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = next[key];
    const canDeepMerge =
      current &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value);

    next[key] = canDeepMerge
      ? mergeObjects(
          current as Record<string, unknown>,
          value as Record<string, unknown>
        )
      : value;
  }

  return next;
}

export function getDefaultEditorSettingsPath(): string {
  ensureSettingsFile();
  return defaultSettingsFile;
}

export function getUserEditorSettingsPath(): string {
  ensureSettingsFile();
  return userSettingsFile;
}

export function readDefaultEditorSettings(): Record<string, unknown> {
  ensureSettingsFile();

  const parsed = readJsonObject(defaultSettingsFile);
  if (parsed) return parsed;

  fs.writeFileSync(defaultSettingsFile, JSON.stringify(DEFAULT_SETTINGS, null, 2) + '\n', 'utf-8');
  return DEFAULT_SETTINGS;
}

export function readUserEditorSettings(): Record<string, unknown> {
  ensureSettingsFile();
  return readJsonObject(userSettingsFile) ?? {};
}

export function readEditorSettings(): Record<string, unknown> {
  const defaults = readDefaultEditorSettings();
  const user = readUserEditorSettings();
  return mergeObjects(defaults, user);
}

export function writeUserEditorSettings(nextSettings: unknown): Record<string, unknown> {
  if (!nextSettings || typeof nextSettings !== 'object' || Array.isArray(nextSettings)) {
    throw new Error('Editor settings payload must be a JSON object.');
  }

  ensureSettingsFile();

  const normalized = nextSettings as Record<string, unknown>;
  fs.writeFileSync(userSettingsFile, JSON.stringify(normalized, null, 2) + '\n', 'utf-8');

  return normalized;
}

export function getDefaultEditorSettings(): Record<string, unknown> {
  return DEFAULT_SETTINGS;
}
