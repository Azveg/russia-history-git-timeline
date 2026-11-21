#!/usr/bin/env node
/**
 * Automated guard for multi-agent repository invariants (ADR-002, ADR-004, ADR-005, ADR-006).
 * Ensures Codex, Gemini CLI, AI Studio, and other agents stay aligned on shared rules
 * and never forget to update the bounded project handoff ledger.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  HANDOFF_ARCHIVE_REL_PATH,
  HANDOFF_REL_PATH,
  evaluateHandoffFreshness,
  validateHandoffDocument,
} from './handoff-utils.mjs';

const root = process.cwd();
const errors = [];

function readText(relPath) {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) {
    errors.push(`Missing required file: ${relPath}`);
    return null;
  }
  return fs.readFileSync(full, 'utf8');
}

function runGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

// 1. Required multi-agent governance files
const requiredDocs = [
  'AGENTS.md',
  'GEMINI.md',
  'docs/agent/DESIGN_SYSTEM.md',
  'docs/agent/ARCHITECTURE.md',
  'docs/agent/DECISIONS.md',
  HANDOFF_REL_PATH,
  HANDOFF_ARCHIVE_REL_PATH,
];

const docsContent = new Map();
for (const docPath of requiredDocs) {
  const text = readText(docPath);
  if (text !== null) {
    if (text.trim().length < 80) {
      errors.push(`Governance file looks empty or stubbed: ${docPath}`);
    }
    docsContent.set(docPath, text);
  }
}

// 2. GEMINI.md must stay a thin adapter referencing AGENTS.md (no duplicated rulebooks)
const geminiMd = docsContent.get('GEMINI.md');
if (geminiMd) {
  if (!geminiMd.includes('AGENTS.md')) {
    errors.push('GEMINI.md must reference AGENTS.md as the single source of truth (ADR-005).');
  }
  const lineCount = geminiMd.split(/\r?\n/).length;
  if (lineCount > 60) {
    errors.push(
      `GEMINI.md has ${lineCount} lines (limit: 60). Keep GEMINI.md a thin adapter and put shared rules in AGENTS.md / docs/agent/ (ADR-005).`,
    );
  }
}

// 3. Standardized dossier modals must not introduce inline style= attributes (ADR-002)
const zeroInlineStyleModals = [
  'src/components/EraSummaryModal.tsx',
  'src/components/WindowSummaryModal.tsx',
  'src/components/CardDetailModal.tsx',
  'src/components/ComparePeriodsModal.tsx',
  'src/components/PersonDossierModal.tsx',
];

for (const modalPath of zeroInlineStyleModals) {
  const content = readText(modalPath);
  if (content && /\bstyle\s*=\s*\{/.test(content)) {
    errors.push(
      `Inline style={...} detected in ${modalPath}. Use Tailwind CSS classes only (ADR-002).`,
    );
  }
}

// 4. Popovers in src/components/ must not use hardcoded top-[54px] (ADR-004)
const componentsDir = path.join(root, 'src/components');
function walkTsxFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsxFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

if (fs.existsSync(componentsDir)) {
  for (const file of walkTsxFiles(componentsDir)) {
    const rel = path.relative(root, file);
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('top-[54px]')) {
      errors.push(
        `Hardcoded top-[54px] found in ${rel}. Use top-[calc(var(--top-bar-height,49px)+6px)] for dynamic toolbar height sync (ADR-004).`,
      );
    }
  }
}

// 5. TopControlBar invariants: no status text badge on «Вид», responsive 2-row -> 1-row layout (ADR-004)
const topBar = readText('src/components/TopControlBar.tsx');
if (topBar) {
  if (!topBar.includes('xl:flex-row')) {
    errors.push(
      'TopControlBar.tsx must preserve responsive 2-row (< xl) to 1-row (xl:flex-row) layout so Analysis button never clips on tablets (ADR-004).',
    );
  }
  if (/<span>\s*Вид\s*<\/span>[\s\S]{0,220}\{viewModeSummary/.test(topBar)) {
    errors.push(
      'TopControlBar.tsx must not render text status badge ({viewModeSummary}) inside the «Вид» button (ADR-004).',
    );
  }
}

// 6. Handoff ledger structure, 5-entry rolling cap, and 160-line budget (ADR-006)
const handoffMd = docsContent.get(HANDOFF_REL_PATH);
if (handoffMd) {
  const validation = validateHandoffDocument(handoffMd);
  if (!validation.ok) {
    errors.push(...validation.errors);
  }
}

// 7. Git-diff freshness check: ensure substantive edits also update HANDOFF.md unless [skip-handoff] (ADR-006)
let gitCheckNote = '';
const isGitRepo = runGit(['rev-parse', '--is-inside-work-tree']) === 'true';

if (!isGitRepo) {
  gitCheckNote = ' (git diff check skipped: no .git directory in current environment)';
} else {
  const changedSet = new Set();
  const skipTexts = [
    process.env.PR_TITLE ?? '',
    process.env.PR_BODY ?? '',
    process.env.SKIP_HANDOFF === '1' ? '[skip-handoff]' : '',
  ];

  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    // Pull Request CI mode: inspect full diff between base branch and PR HEAD
    const prDiff =
      runGit(['diff', '--name-only', `origin/${baseRef}...HEAD`]) ??
      runGit(['diff', '--name-only', `${baseRef}...HEAD`]) ??
      runGit(['diff', '--name-only', 'HEAD~1...HEAD']) ??
      '';
    prDiff
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((f) => changedSet.add(f));

    const prCommitMessages =
      runGit(['log', '--format=%B', `origin/${baseRef}..HEAD`]) ??
      runGit(['log', '-1', '--format=%B']) ??
      '';
    skipTexts.push(prCommitMessages);
  } else {
    // Local mode (Codex / Gemini CLI): check staged, unstaged, and untracked changes first
    const workingDiff = runGit(['diff', '--name-only', 'HEAD']) ?? '';
    const stagedDiff = runGit(['diff', '--cached', '--name-only']) ?? '';
    const untracked = runGit(['ls-files', '--others', '--exclude-standard']) ?? '';

    for (const chunk of [workingDiff, stagedDiff, untracked]) {
      chunk
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((f) => changedSet.add(f));
    }

    // If working tree is clean on a feature branch ahead of main/master, check branch diff
    if (changedSet.size === 0) {
      const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
      if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
        const branchDiff =
          runGit(['diff', '--name-only', 'origin/main...HEAD']) ??
          runGit(['diff', '--name-only', 'main...HEAD']) ??
          runGit(['diff', '--name-only', 'origin/master...HEAD']) ??
          runGit(['diff', '--name-only', 'master...HEAD']) ??
          '';
        branchDiff
          .split(/\r?\n/)
          .filter(Boolean)
          .forEach((f) => changedSet.add(f));
      }
    }

    const latestCommitMsg = runGit(['log', '-1', '--format=%B']) ?? '';
    skipTexts.push(latestCommitMsg);
  }

  const freshness = evaluateHandoffFreshness({
    changedFiles: Array.from(changedSet),
    skipContextTexts: skipTexts,
  });

  if (!freshness.ok) {
    const sample = freshness.substantiveFiles.slice(0, 5).join(', ');
    const more =
      freshness.substantiveFiles.length > 5
        ? ` (+${freshness.substantiveFiles.length - 5} more)`
        : '';
    errors.push(
      `Substantive changes detected (${sample}${more}), but ${HANDOFF_REL_PATH} was not updated. Add a concise task entry in ${HANDOFF_REL_PATH} (and run \`npm run handoff:rotate\` if > 5 entries), or include [skip-handoff] for trivial typo fixes only (ADR-006).`,
    );
  } else if (freshness.skipped) {
    gitCheckNote = ' (handoff update bypassed via explicit [skip-handoff] tag)';
  }
}

if (errors.length > 0) {
  console.error('Agent invariant check FAILED:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`✓ All multi-agent governance and UI invariants passed${gitCheckNote}.`);
