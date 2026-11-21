import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildPersonDossierIndex,
  collectBranchesFromDataFile,
  extractRulersFromStore,
  getEnrichedEvents,
  isBranchFile,
  isRulersFile,
} from '../src/engine/timelineEngine';
import type { ModulesIndexFile, SyncManifest, TimelineDataFile } from '../src/types/timeline';
import { discoverTimelineModules } from './timelineModules.mjs';

export function buildTimelineModuleIndex(publicDir: string): ModulesIndexFile {
  const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'data/sync.manifest.json'), 'utf8')) as SyncManifest;
  const declaredFiles = new Map((manifest.mountedFiles ?? []).map((meta) => [
    meta.path.trim().replace(/^(?:\.\/|\/)+/, ''), meta,
  ]));
  const modules = discoverTimelineModules(publicDir, manifest.mountedFiles);
  const fileHashes: Record<string, string> = {};
  const files: Record<string, TimelineDataFile> = {};
  const cardModules = new Map<string, string>();

  const mountedFiles = modules.flatMap(({ relFromPublic, enabled, raw, data, parseError }) => {
    if (!enabled) return [];
    if (parseError || !data) throw new Error(`[Modules Index] ${relFromPublic}: ${parseError || 'пустой модуль'}`);

    const moduleData = data as TimelineDataFile;
    files[relFromPublic] = moduleData;
    fileHashes[relFromPublic] = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
    if (isBranchFile(moduleData)) {
      for (const node of moduleData.nodes) {
        if (node?.id) cardModules.set(node.id, relFromPublic);
      }
    }
    const declared = declaredFiles.get(relFromPublic);
    const branches = collectBranchesFromDataFile(moduleData, relFromPublic);
    return [{
      fileId: declared?.fileId ?? moduleData.fileId ?? relFromPublic,
      path: relFromPublic,
      role: declared?.role ?? (isRulersFile(moduleData) ? 'rulers_branch' : 'thematic_branch'),
      branchIds: declared?.branchIds ?? branches.map((branch) => branch.id),
      title: declared?.title ?? branches[0]?.label ?? relFromPublic,
      enabled,
    }];
  });

  const effectiveManifest = { ...manifest, mountedFiles };
  const rulers = extractRulersFromStore(effectiveManifest, files);
  const events = getEnrichedEvents(effectiveManifest, files, rulers);
  const { dossiers } = buildPersonDossierIndex(events, rulers);
  const personModules = Array.from(dossiers, ([key, dossier]): [string, string[]] => {
    const paths = new Set(dossier.events.flatMap((event) => {
      const module = cardModules.get(event.id);
      return module ? [module] : [];
    }));
    return [key, [...paths]];
  });

  return {
    schemaVersion: manifest.schemaVersion,
    files: Object.keys(files),
    disabledFiles: modules.filter((module) => !module.enabled).map((module) => module.relFromPublic),
    fileHashes,
    cardModules: Object.fromEntries(cardModules),
    personModules: Object.fromEntries(personModules),
  };
}
