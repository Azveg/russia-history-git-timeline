#!/usr/bin/env node
/**
 * Automatically rotates overflow entries (> 5) from docs/agent/HANDOFF.md
 * into docs/agent/HANDOFF_ARCHIVE.md (ADR-006).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  HANDOFF_ARCHIVE_REL_PATH,
  HANDOFF_REL_PATH,
  MAX_HANDOFF_ENTRIES,
  rotateHandoffDocuments,
} from './handoff-utils.mjs';

const root = process.cwd();
const handoffPath = path.join(root, HANDOFF_REL_PATH);
const archivePath = path.join(root, HANDOFF_ARCHIVE_REL_PATH);

if (!fs.existsSync(handoffPath)) {
  console.error(`Missing ${HANDOFF_REL_PATH}`);
  process.exit(1);
}

const currentHandoff = fs.readFileSync(handoffPath, 'utf8');
const currentArchive = fs.existsSync(archivePath)
  ? fs.readFileSync(archivePath, 'utf8')
  : '';

const { rotatedCount, nextHandoff, nextArchive } = rotateHandoffDocuments(
  currentHandoff,
  currentArchive,
  MAX_HANDOFF_ENTRIES,
);

if (rotatedCount === 0) {
  console.log(
    `✓ ${HANDOFF_REL_PATH} already within the ${MAX_HANDOFF_ENTRIES}-entry limit. No rotation needed.`,
  );
  process.exit(0);
}

fs.writeFileSync(handoffPath, nextHandoff, 'utf8');
fs.writeFileSync(archivePath, nextArchive, 'utf8');
console.log(
  `✓ Rotated ${rotatedCount} older ${rotatedCount === 1 ? 'entry' : 'entries'} from ${HANDOFF_REL_PATH} to ${HANDOFF_ARCHIVE_REL_PATH} (kept latest ${MAX_HANDOFF_ENTRIES}).`,
);
