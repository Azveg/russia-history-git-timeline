import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_ENTRIES_HEADING,
  HANDOFF_REL_PATH,
  MAX_HANDOFF_ENTRIES,
  MAX_HANDOFF_LINES,
  RECENT_ENTRIES_HEADING,
  evaluateHandoffFreshness,
  parseHandoffEntries,
  rotateHandoffDocuments,
  validateHandoffDocument,
} from '../../../scripts/handoff-utils.mjs';

function makeEntry(idx: number, date = `2026-11-${String(10 + idx).padStart(2, '0')}`) {
  return [
    `### ${date} · Codex · Задача #${idx}`,
    `- **Что сделано**: выполнено изменение #${idx}.`,
    '- **Проверка**: `npm run verify` пройден.',
  ].join('\n');
}

function makeHandoff(entries: string[]) {
  return [
    '# Передача контекста (`HANDOFF.md`)',
    '',
    '- **Последнее обновление**: 2026-11-21',
    '- **Последняя среда / агент**: Codex',
    '- **Статус проверок**: `npm run verify` — зелёный',
    '',
    RECENT_ENTRIES_HEADING,
    '',
    entries.join('\n\n'),
    '',
  ].join('\n');
}

describe('Multi-agent handoff governance (ADR-006)', () => {
  it('validates the real repository HANDOFF.md within 5-entry and 160-line limits', () => {
    const handoffPath = path.resolve(process.cwd(), HANDOFF_REL_PATH);
    const content = fs.readFileSync(handoffPath, 'utf8');
    const result = validateHandoffDocument(content);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.entryCount).toBeGreaterThanOrEqual(1);
    expect(result.entryCount).toBeLessThanOrEqual(MAX_HANDOFF_ENTRIES);
    expect(result.lineCount).toBeLessThanOrEqual(MAX_HANDOFF_LINES);
  });

  it('rejects > 5 entries, > 160 lines, and malformed entry headings', () => {
    const sixEntries = makeHandoff([1, 2, 3, 4, 5, 6].map((i) => makeEntry(i)));
    const tooMany = validateHandoffDocument(sixEntries);
    expect(tooMany.ok).toBe(false);
    expect(tooMany.errors.some((e) => e.includes('handoff:rotate'))).toBe(true);

    const malformed = makeHandoff(['### Неверный заголовок без даты\n- текст']);
    const badFormat = validateHandoffDocument(malformed);
    expect(badFormat.ok).toBe(false);
    expect(badFormat.errors.some((e) => e.includes('Invalid entry heading'))).toBe(true);

    const bloated = `${makeHandoff([makeEntry(1)])}${'\n- лишняя строка'.repeat(MAX_HANDOFF_LINES)}`;
    const tooLong = validateHandoffDocument(bloated);
    expect(tooLong.ok).toBe(false);
    expect(tooLong.errors.some((e) => e.includes(`${MAX_HANDOFF_LINES}-line limit`))).toBe(true);
  });

  it('rotates overflow entries into archive cleanly and stays idempotent on re-run', () => {
    const sevenEntries = makeHandoff([7, 6, 5, 4, 3, 2, 1].map((i) => makeEntry(i)));
    const initialArchive = [
      '# Архив (`HANDOFF_ARCHIVE.md`)',
      '',
      ARCHIVE_ENTRIES_HEADING,
      '',
      makeEntry(0, '2026-11-01'),
      '',
    ].join('\n');

    const firstPass = rotateHandoffDocuments(sevenEntries, initialArchive, 5);
    expect(firstPass.rotatedCount).toBe(2);

    const parsedKept = parseHandoffEntries(firstPass.nextHandoff);
    expect(parsedKept.entries.map((e) => e.title)).toEqual([
      'Задача #7',
      'Задача #6',
      'Задача #5',
      'Задача #4',
      'Задача #3',
    ]);

    const parsedArchived = parseHandoffEntries(firstPass.nextArchive, ARCHIVE_ENTRIES_HEADING);
    expect(parsedArchived.entries.map((e) => e.title)).toEqual([
      'Задача #2',
      'Задача #1',
      'Задача #0',
    ]);

    // Running rotation a second time is a no-op
    const secondPass = rotateHandoffDocuments(firstPass.nextHandoff, firstPass.nextArchive, 5);
    expect(secondPass.rotatedCount).toBe(0);
    expect(secondPass.nextHandoff).toBe(firstPass.nextHandoff);
    expect(secondPass.nextArchive).toBe(firstPass.nextArchive);
  });

  it('enforces HANDOFF.md updates on substantive git changes and respects [skip-handoff]', () => {
    // Non-substantive doc-only edits pass without touching HANDOFF.md
    const docsOnly = evaluateHandoffFreshness({
      changedFiles: ['BRANCH_SPEC.md', 'docs/agent/DESIGN_SYSTEM.md'],
      skipContextTexts: [],
    });
    expect(docsOnly.ok).toBe(true);
    expect(docsOnly.reason).toBe('no_substantive_changes');

    // Substantive code change without HANDOFF.md MUST fail
    const forgotten = evaluateHandoffFreshness({
      changedFiles: ['src/components/TopControlBar.tsx'],
      skipContextTexts: ['fix: align toolbar button'],
    });
    expect(forgotten.ok).toBe(false);
    expect(forgotten.reason).toBe('missing_handoff_update');

    // Substantive data change WITH HANDOFF.md passes
    const updated = evaluateHandoffFreshness({
      changedFiles: ['public/data/science.json', HANDOFF_REL_PATH],
      skipContextTexts: ['feat(data): add physics entries'],
    });
    expect(updated.ok).toBe(true);
    expect(updated.reason).toBe('handoff_updated');

    // Trivial typo fix with explicit [skip-handoff] passes as skipped
    const skipped = evaluateHandoffFreshness({
      changedFiles: ['src/App.tsx'],
      skipContextTexts: ['chore: fix typo in comment [skip-handoff]'],
    });
    expect(skipped.ok).toBe(true);
    expect(skipped.skipped).toBe(true);
    expect(skipped.reason).toBe('explicit_skip_tag');
  });
});
