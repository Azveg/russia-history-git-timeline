import type { BranchDefinition, BranchPresetId } from '../../types/timeline';
import { computeBranchPresetMap } from './subLaneLayout';

type BranchMask = Record<string, boolean>;
export interface BranchSelection {
  preset: BranchPresetId;
  overrides: BranchMask;
}

const PRESETS: ReadonlySet<string> = new Set<BranchPresetId>([
  'overview', 'all', 'none', 'rulers_wars', 'culture_science', 'eco_world', 'rulers_only',
]);

export function parseBranchSelection(value: string | null): BranchSelection {
  const [first, ...rest] = (value ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  if (!first) return { preset: 'overview', overrides: {} };

  const preset = first.toLowerCase();
  if (!PRESETS.has(preset)) {
    return { preset: 'none', overrides: Object.fromEntries([first, ...rest].map((id) => [id, true])) };
  }
  return {
    preset: preset as BranchPresetId,
    overrides: Object.fromEntries(rest.filter((item) => /^[+-][\w-]+$/.test(item))
      .map((item) => [item.slice(1), item[0] === '+'])),
  };
}

export function serializeBranchSelection({ preset, overrides }: BranchSelection): string | null {
  const entries = Object.entries(overrides);
  if (preset === 'none') return entries.filter(([, enabled]) => enabled).map(([id]) => id).join(',') || 'none';
  if (preset === 'overview' && entries.length === 0) return null;
  return [preset, ...entries.map(([id, enabled]) => (enabled ? '+' : '-') + id)].join(',');
}

export function resolveBranchSelection(branches: BranchDefinition[], selection: BranchSelection): BranchMask {
  return { ...computeBranchPresetMap(branches, selection.preset), ...selection.overrides };
}

export function updateBranchSelection(
  branches: BranchDefinition[],
  selection: BranchSelection,
  update: (mask: BranchMask) => BranchMask,
): BranchSelection {
  const before = resolveBranchSelection(branches, selection);
  const after = update(before);
  const defaults = computeBranchPresetMap(branches, selection.preset);
  const overrides = { ...selection.overrides };
  for (const [id, value] of Object.entries(after)) {
    if (before[id] === value) continue;
    if (defaults[id] === value) delete overrides[id];
    else overrides[id] = value;
  }
  return { ...selection, overrides };
}
