import type { EditorSettings, MonacoEditorOptions } from '@/types'

export const defaultEditorSettings: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  lineHeight: 22,
  tabSize: 2,
  lineNumbers: 'on',
  wordWrap: 'off',
  minimapEnabled: true,
  folding: true,
  glyphMargin: false,
  stickyScrollEnabled: false,
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
  bracketPairColorization: true,
  guidesIndentation: true,
  guidesBracketPairs: true,
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
  rawOptions: JSON.stringify({
    automaticLayout: true,
    padding: { top: 14, bottom: 14 },
    scrollbar: { alwaysConsumeMouseWheel: false },
    unicodeHighlight: { ambiguousCharacters: false },
  }, null, 2),
}

export function parseRawMonacoOptions(rawOptions: string): {
  options: MonacoEditorOptions
  error: string | null
} {
  const trimmed = rawOptions.trim()
  if (!trimmed) return { options: {}, error: null }

  try {
    const parsed = JSON.parse(trimmed) as MonacoEditorOptions
    return { options: parsed, error: null }
  } catch (error) {
    return {
      options: {},
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}

export function buildMonacoOptions(settings: EditorSettings): {
  options: MonacoEditorOptions
  rawOptionsError: string | null
} {
  const { options: rawOptions, error } = parseRawMonacoOptions(settings.rawOptions)

  return {
    options: {
      automaticLayout: true,
      detectIndentation: false,
      insertSpaces: true,
      fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      tabSize: settings.tabSize,
      lineNumbers: settings.lineNumbers,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimapEnabled },
      folding: settings.folding,
      glyphMargin: settings.glyphMargin,
      stickyScroll: { enabled: settings.stickyScrollEnabled },
      quickSuggestions: settings.quickSuggestions,
      suggestOnTriggerCharacters: settings.suggestOnTriggerCharacters,
      acceptSuggestionOnEnter: settings.acceptSuggestionOnEnter,
      tabCompletion: settings.tabCompletion,
      autoClosingBrackets: settings.autoClosingBrackets,
      autoClosingQuotes: settings.autoClosingQuotes,
      autoIndent: settings.autoIndent,
      cursorBlinking: settings.cursorBlinking,
      cursorStyle: settings.cursorStyle,
      cursorSmoothCaretAnimation: settings.cursorSmoothCaretAnimation,
      renderWhitespace: settings.renderWhitespace,
      renderControlCharacters: settings.renderControlCharacters,
      fontLigatures: settings.fontLigatures,
      bracketPairColorization: { enabled: settings.bracketPairColorization },
      guides: {
        indentation: settings.guidesIndentation,
        bracketPairs: settings.guidesBracketPairs,
      },
      lineNumbersMinChars: settings.lineNumbersMinChars,
      roundedSelection: settings.roundedSelection,
      selectionHighlight: settings.selectionHighlight,
      scrollBeyondLastLine: settings.scrollBeyondLastLine,
      smoothScrolling: settings.smoothScrolling,
      mouseWheelZoom: settings.mouseWheelZoom,
      formatOnPaste: settings.formatOnPaste,
      formatOnType: settings.formatOnType,
      linkedEditing: settings.linkedEditing,
      readOnly: settings.readOnly,
      ...rawOptions,
    },
    rawOptionsError: error,
  }
}

function cloneOptions(options: MonacoEditorOptions): Record<string, unknown> {
  return JSON.parse(JSON.stringify(options)) as Record<string, unknown>
}

function mergeNested<T extends object>(base: T, extra: unknown): T {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return base
  return { ...base, ...extra as Partial<T> }
}

function booleanFromMaybe(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function stringifyRawOptions(options: Record<string, unknown>): string {
  return Object.keys(options).length === 0 ? '{}' : JSON.stringify(options, null, 2)
}

export function fromMonacoOptions(options: MonacoEditorOptions): EditorSettings {
  const merged = {
    ...buildMonacoOptions(defaultEditorSettings).options,
    ...options,
    minimap: mergeNested({ enabled: defaultEditorSettings.minimapEnabled }, options.minimap),
    stickyScroll: mergeNested({ enabled: defaultEditorSettings.stickyScrollEnabled }, options.stickyScroll),
    bracketPairColorization: mergeNested({ enabled: defaultEditorSettings.bracketPairColorization }, options.bracketPairColorization),
    guides: mergeNested({
      indentation: defaultEditorSettings.guidesIndentation,
      bracketPairs: defaultEditorSettings.guidesBracketPairs,
    }, options.guides),
  } as MonacoEditorOptions

  const rawOptions = cloneOptions(options)
  delete rawOptions.theme
  delete rawOptions.fontSize
  delete rawOptions.lineHeight
  delete rawOptions.tabSize
  delete rawOptions.lineNumbers
  delete rawOptions.wordWrap
  delete rawOptions.folding
  delete rawOptions.glyphMargin
  delete rawOptions.quickSuggestions
  delete rawOptions.suggestOnTriggerCharacters
  delete rawOptions.acceptSuggestionOnEnter
  delete rawOptions.tabCompletion
  delete rawOptions.autoClosingBrackets
  delete rawOptions.autoClosingQuotes
  delete rawOptions.autoIndent
  delete rawOptions.cursorBlinking
  delete rawOptions.cursorStyle
  delete rawOptions.cursorSmoothCaretAnimation
  delete rawOptions.renderWhitespace
  delete rawOptions.renderControlCharacters
  delete rawOptions.fontLigatures
  delete rawOptions.lineNumbersMinChars
  delete rawOptions.roundedSelection
  delete rawOptions.selectionHighlight
  delete rawOptions.scrollBeyondLastLine
  delete rawOptions.smoothScrolling
  delete rawOptions.mouseWheelZoom
  delete rawOptions.formatOnPaste
  delete rawOptions.formatOnType
  delete rawOptions.linkedEditing
  delete rawOptions.readOnly

  if (rawOptions.minimap && typeof rawOptions.minimap === 'object' && !Array.isArray(rawOptions.minimap)) {
    const nextMinimap = { ...(rawOptions.minimap as Record<string, unknown>) }
    delete nextMinimap.enabled
    if (Object.keys(nextMinimap).length === 0) delete rawOptions.minimap
    else rawOptions.minimap = nextMinimap
  }

  if (rawOptions.stickyScroll && typeof rawOptions.stickyScroll === 'object' && !Array.isArray(rawOptions.stickyScroll)) {
    const nextStickyScroll = { ...(rawOptions.stickyScroll as Record<string, unknown>) }
    delete nextStickyScroll.enabled
    if (Object.keys(nextStickyScroll).length === 0) delete rawOptions.stickyScroll
    else rawOptions.stickyScroll = nextStickyScroll
  }

  if (rawOptions.bracketPairColorization && typeof rawOptions.bracketPairColorization === 'object' && !Array.isArray(rawOptions.bracketPairColorization)) {
    const nextBracketPairColorization = { ...(rawOptions.bracketPairColorization as Record<string, unknown>) }
    delete nextBracketPairColorization.enabled
    if (Object.keys(nextBracketPairColorization).length === 0) delete rawOptions.bracketPairColorization
    else rawOptions.bracketPairColorization = nextBracketPairColorization
  }

  if (rawOptions.guides && typeof rawOptions.guides === 'object' && !Array.isArray(rawOptions.guides)) {
    const nextGuides = { ...(rawOptions.guides as Record<string, unknown>) }
    delete nextGuides.indentation
    delete nextGuides.bracketPairs
    if (Object.keys(nextGuides).length === 0) delete rawOptions.guides
    else rawOptions.guides = nextGuides
  }

  return {
    theme: (merged.theme as EditorSettings['theme']) ?? defaultEditorSettings.theme,
    fontSize: merged.fontSize ?? defaultEditorSettings.fontSize,
    lineHeight: merged.lineHeight ?? defaultEditorSettings.lineHeight,
    tabSize: merged.tabSize ?? defaultEditorSettings.tabSize,
    lineNumbers: (merged.lineNumbers as EditorSettings['lineNumbers']) ?? defaultEditorSettings.lineNumbers,
    wordWrap: (merged.wordWrap as EditorSettings['wordWrap']) ?? defaultEditorSettings.wordWrap,
    minimapEnabled: booleanFromMaybe(merged.minimap?.enabled, defaultEditorSettings.minimapEnabled),
    folding: booleanFromMaybe(merged.folding, defaultEditorSettings.folding),
    glyphMargin: booleanFromMaybe(merged.glyphMargin, defaultEditorSettings.glyphMargin),
    stickyScrollEnabled: booleanFromMaybe(merged.stickyScroll?.enabled, defaultEditorSettings.stickyScrollEnabled),
    quickSuggestions: booleanFromMaybe(merged.quickSuggestions, defaultEditorSettings.quickSuggestions),
    suggestOnTriggerCharacters: booleanFromMaybe(merged.suggestOnTriggerCharacters, defaultEditorSettings.suggestOnTriggerCharacters),
    acceptSuggestionOnEnter: (merged.acceptSuggestionOnEnter as EditorSettings['acceptSuggestionOnEnter']) ?? defaultEditorSettings.acceptSuggestionOnEnter,
    tabCompletion: (merged.tabCompletion as EditorSettings['tabCompletion']) ?? defaultEditorSettings.tabCompletion,
    autoClosingBrackets: (merged.autoClosingBrackets as EditorSettings['autoClosingBrackets']) ?? defaultEditorSettings.autoClosingBrackets,
    autoClosingQuotes: (merged.autoClosingQuotes as EditorSettings['autoClosingQuotes']) ?? defaultEditorSettings.autoClosingQuotes,
    autoIndent: (merged.autoIndent as EditorSettings['autoIndent']) ?? defaultEditorSettings.autoIndent,
    cursorBlinking: (merged.cursorBlinking as EditorSettings['cursorBlinking']) ?? defaultEditorSettings.cursorBlinking,
    cursorStyle: (merged.cursorStyle as EditorSettings['cursorStyle']) ?? defaultEditorSettings.cursorStyle,
    cursorSmoothCaretAnimation: (merged.cursorSmoothCaretAnimation as EditorSettings['cursorSmoothCaretAnimation']) ?? defaultEditorSettings.cursorSmoothCaretAnimation,
    renderWhitespace: (merged.renderWhitespace as EditorSettings['renderWhitespace']) ?? defaultEditorSettings.renderWhitespace,
    renderControlCharacters: booleanFromMaybe(merged.renderControlCharacters, defaultEditorSettings.renderControlCharacters),
    fontLigatures: booleanFromMaybe(merged.fontLigatures, defaultEditorSettings.fontLigatures),
    bracketPairColorization: booleanFromMaybe(merged.bracketPairColorization?.enabled, defaultEditorSettings.bracketPairColorization),
    guidesIndentation: booleanFromMaybe(merged.guides?.indentation, defaultEditorSettings.guidesIndentation),
    guidesBracketPairs: booleanFromMaybe(merged.guides?.bracketPairs, defaultEditorSettings.guidesBracketPairs),
    lineNumbersMinChars: merged.lineNumbersMinChars ?? defaultEditorSettings.lineNumbersMinChars,
    roundedSelection: booleanFromMaybe(merged.roundedSelection, defaultEditorSettings.roundedSelection),
    selectionHighlight: booleanFromMaybe(merged.selectionHighlight, defaultEditorSettings.selectionHighlight),
    scrollBeyondLastLine: booleanFromMaybe(merged.scrollBeyondLastLine, defaultEditorSettings.scrollBeyondLastLine),
    smoothScrolling: booleanFromMaybe(merged.smoothScrolling, defaultEditorSettings.smoothScrolling),
    mouseWheelZoom: booleanFromMaybe(merged.mouseWheelZoom, defaultEditorSettings.mouseWheelZoom),
    formatOnPaste: booleanFromMaybe(merged.formatOnPaste, defaultEditorSettings.formatOnPaste),
    formatOnType: booleanFromMaybe(merged.formatOnType, defaultEditorSettings.formatOnType),
    linkedEditing: booleanFromMaybe(merged.linkedEditing, defaultEditorSettings.linkedEditing),
    readOnly: booleanFromMaybe(merged.readOnly, defaultEditorSettings.readOnly),
    rawOptions: stringifyRawOptions(rawOptions),
  }
}
