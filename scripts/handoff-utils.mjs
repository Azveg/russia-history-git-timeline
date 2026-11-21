/**
 * Pure parsing, validation, rotation, and git-diff freshness helpers
 * for the bounded multi-agent handoff ledger (ADR-006).
 */

export const MAX_HANDOFF_ENTRIES = 5;
export const MAX_HANDOFF_LINES = 160;
export const HANDOFF_REL_PATH = 'docs/agent/HANDOFF.md';
export const HANDOFF_ARCHIVE_REL_PATH = 'docs/agent/HANDOFF_ARCHIVE.md';
export const RECENT_ENTRIES_HEADING = '## Последние решённые задачи';
export const ARCHIVE_ENTRIES_HEADING = '## Архив выполненных задач';

/**
 * Canonical entry heading format:
 *   ### 2026-11-21 · AI Studio (Gemini) · Краткое название задачи
 */
export const ENTRY_HEADER_RE = /^###\s+(\d{4}-\d{2}-\d{2})\s+·\s+([^·\n]+?)\s+·\s+(.+?)\s*$/;

const REQUIRED_SNAPSHOT_MARKERS = [
  'Последнее обновление',
  'Последняя среда / агент',
  'Статус проверок',
];

const SUBSTANTIVE_EXACT_PATHS = new Set([
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'metadata.json',
]);

const SUBSTANTIVE_PREFIXES = [
  'src/',
  'public/data/',
  'scripts/',
  '.github/workflows/',
];

export function isSubstantiveProjectPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (SUBSTANTIVE_EXACT_PATHS.has(normalized)) return true;
  return SUBSTANTIVE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function findSectionRange(lines, headingText) {
  const startIdx = lines.findIndex((line) => line.trim() === headingText);
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return { startIdx, endIdx };
}

/**
 * Parses `### ...` blocks inside `## Последние решённые задачи`.
 */
export function parseHandoffEntries(markdown, sectionHeading = RECENT_ENTRIES_HEADING) {
  const lines = markdown.split(/\r?\n/);
  const range = findSectionRange(lines, sectionHeading);
  if (!range) {
    return {
      foundSection: false,
      prefixLines: lines,
      introLines: [],
      entries: [],
      malformedHeaders: [],
      suffixLines: [],
    };
  }

  const sectionLines = lines.slice(range.startIdx + 1, range.endIdx);
  const introLines = [];
  const entries = [];
  const malformedHeaders = [];

  let current = null;
  for (const line of sectionLines) {
    if (/^###\s+/.test(line)) {
      if (current) {
        entries.push({
          ...current,
          body: current.lines.join('\n').trimEnd(),
        });
      }
      const match = line.match(ENTRY_HEADER_RE);
      if (!match) {
        malformedHeaders.push(line.trim());
      }
      current = {
        header: line.trim(),
        date: match ? match[1] : null,
        agent: match ? match[2].trim() : null,
        title: match ? match[3].trim() : null,
        validHeader: Boolean(match),
        lines: [line],
      };
    } else if (current) {
      current.lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  if (current) {
    entries.push({
      ...current,
      body: current.lines.join('\n').trimEnd(),
    });
  }

  return {
    foundSection: true,
    prefixLines: lines.slice(0, range.startIdx + 1),
    introLines,
    entries,
    malformedHeaders,
    suffixLines: lines.slice(range.endIdx),
  };
}

/**
 * Validates structure, entry format, rolling 5-entry cap, and 160-line budget.
 */
export function validateHandoffDocument(
  markdown,
  { maxEntries = MAX_HANDOFF_ENTRIES, maxLines = MAX_HANDOFF_LINES } = {},
) {
  const errors = [];
  const lines = markdown.split(/\r?\n/);

  if (lines.length > maxLines) {
    errors.push(
      `${HANDOFF_REL_PATH} exceeds the ${maxLines}-line limit (${lines.length} lines). Keep entries concise and run \`npm run handoff:rotate\` (ADR-006).`,
    );
  }

  for (const marker of REQUIRED_SNAPSHOT_MARKERS) {
    if (!markdown.includes(marker)) {
      errors.push(`${HANDOFF_REL_PATH} is missing required snapshot field "${marker}" (ADR-006).`);
    }
  }

  const parsed = parseHandoffEntries(markdown, RECENT_ENTRIES_HEADING);
  if (!parsed.foundSection) {
    errors.push(
      `${HANDOFF_REL_PATH} must contain section "${RECENT_ENTRIES_HEADING}" (ADR-006).`,
    );
    return { ok: false, errors, entryCount: 0, lineCount: lines.length };
  }

  if (parsed.entries.length === 0) {
    errors.push(
      `${HANDOFF_REL_PATH} must contain at least 1 task entry under "${RECENT_ENTRIES_HEADING}" (ADR-006).`,
    );
  }

  if (parsed.entries.length > maxEntries) {
    errors.push(
      `${HANDOFF_REL_PATH} contains ${parsed.entries.length} entries (limit: ${maxEntries}). Run \`npm run handoff:rotate\` to move older entries into ${HANDOFF_ARCHIVE_REL_PATH} (ADR-006).`,
    );
  }

  for (const badHeader of parsed.malformedHeaders) {
    errors.push(
      `Invalid entry heading in ${HANDOFF_REL_PATH}: "${badHeader}". Expected format: "### YYYY-MM-DD · <Среда> · <Название задачи>" (ADR-006).`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    entryCount: parsed.entries.length,
    lineCount: lines.length,
  };
}

/**
 * Keeps the newest `maxEntries` entries in HANDOFF.md and prepends overflow
 * entries to HANDOFF_ARCHIVE.md without duplicating existing archive headers.
 */
export function rotateHandoffDocuments(
  handoffMarkdown,
  archiveMarkdown,
  maxEntries = MAX_HANDOFF_ENTRIES,
) {
  const parsedHandoff = parseHandoffEntries(handoffMarkdown, RECENT_ENTRIES_HEADING);
  if (!parsedHandoff.foundSection || parsedHandoff.entries.length <= maxEntries) {
    return {
      rotatedCount: 0,
      nextHandoff: handoffMarkdown,
      nextArchive: archiveMarkdown,
    };
  }

  const keptEntries = parsedHandoff.entries.slice(0, maxEntries);
  const overflowEntries = parsedHandoff.entries.slice(maxEntries);

  const rebuildSection = (parsed, entries) => {
    const cleanIntro = parsed.introLines
      .join('\n')
      .replace(/^\n+|\n+$/g, '');
    const entriesBlock = entries.map((e) => e.body.trim()).join('\n\n');
    const parts = [parsed.prefixLines.join('\n').trimEnd()];
    if (cleanIntro) parts.push(cleanIntro);
    if (entriesBlock) parts.push(entriesBlock);
    if (parsed.suffixLines.length > 0) {
      parts.push(parsed.suffixLines.join('\n').replace(/^\n+/, '').trimEnd());
    }
    return `${parts.join('\n\n')}\n`;
  };

  const nextHandoff = rebuildSection(parsedHandoff, keptEntries);

  const baseArchive =
    archiveMarkdown && archiveMarkdown.trim().length > 0
      ? archiveMarkdown
      : [
          '# Архив журнала состояния (`HANDOFF_ARCHIVE.md`)',
          '',
          '> Автоматический архив завершённых задач. Агентам **не нужно** читать этот файл при обычном старте сессии — актуальный контекст всегда находится в `docs/agent/HANDOFF.md`.',
          '',
          ARCHIVE_ENTRIES_HEADING,
          '',
        ].join('\n');

  const parsedArchive = parseHandoffEntries(baseArchive, ARCHIVE_ENTRIES_HEADING);
  if (!parsedArchive.foundSection) {
    const appended = [
      baseArchive.trimEnd(),
      '',
      ARCHIVE_ENTRIES_HEADING,
      '',
      ...overflowEntries.map((e) => e.body.trim()),
      '',
    ].join('\n');
    return {
      rotatedCount: overflowEntries.length,
      nextHandoff,
      nextArchive: appended,
    };
  }

  const existingHeaders = new Set(parsedArchive.entries.map((e) => e.header));
  const uniqueOverflow = overflowEntries.filter((e) => !existingHeaders.has(e.header));
  const mergedArchiveEntries = [...uniqueOverflow, ...parsedArchive.entries];
  const nextArchive = rebuildSection(parsedArchive, mergedArchiveEntries);

  return {
    rotatedCount: overflowEntries.length,
    nextHandoff,
    nextArchive,
  };
}

/**
 * Evaluates whether a set of changed files properly updated HANDOFF.md
 * or explicitly opted out with `[skip-handoff]` for trivial typo fixes.
 * @param {{ changedFiles?: string[]; skipContextTexts?: string[] }} [options]
 */
export function evaluateHandoffFreshness({ changedFiles = [], skipContextTexts = [] } = {}) {
  const normalizedFiles = changedFiles
    .map((f) => f.trim().replace(/\\/g, '/').replace(/^\.\//, ''))
    .filter(Boolean);

  const substantiveFiles = normalizedFiles.filter(isSubstantiveProjectPath);
  if (substantiveFiles.length === 0) {
    return {
      ok: true,
      skipped: false,
      reason: 'no_substantive_changes',
      substantiveFiles: [],
    };
  }

  if (normalizedFiles.includes(HANDOFF_REL_PATH)) {
    return {
      ok: true,
      skipped: false,
      reason: 'handoff_updated',
      substantiveFiles,
    };
  }

  const hasSkipTag = skipContextTexts.some(
    (text) => typeof text === 'string' && /\[skip-handoff\]/i.test(text),
  );
  if (hasSkipTag) {
    return {
      ok: true,
      skipped: true,
      reason: 'explicit_skip_tag',
      substantiveFiles,
    };
  }

  return {
    ok: false,
    skipped: false,
    reason: 'missing_handoff_update',
    substantiveFiles,
  };
}
