import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildPersonDossierIndex,
  collectBranchesFromDataFile,
  extractRulersFromStore,
  getEnrichedEvents,
  isBranchFile,
  isPlainRecord,
  isRulersFile,
} from '../src/engine/timelineEngine';
import type {
  CampaignPackBranchSummary,
  CampaignPackRegistryEntry,
  ModulesIndexFile,
  SyncManifest,
  TimelineDataFile,
} from '../src/types/timeline';
import { discoverTimelineModules } from './timelineModules.mjs';

interface CampaignPackAccumulator {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  parentEventId?: string;
  yearFrom: number;
  yearTo: number;
  groupBranchId?: string;
  filePaths: Set<string>;
  branchIds: Set<string>;
  branchesById: Map<string, CampaignPackBranchSummary>;
  eventCount: number;
}

export function buildTimelineModuleIndex(publicDir: string): ModulesIndexFile {
  const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'data/sync.manifest.json'), 'utf8')) as SyncManifest;
  const declaredFiles = new Map((manifest.mountedFiles ?? []).map((meta) => [
    meta.path.trim().replace(/^(?:\.\/|\/)+/, ''), meta,
  ]));
  const modules = discoverTimelineModules(publicDir, manifest.mountedFiles);
  const fileHashes: Record<string, string> = {};
  const files: Record<string, TimelineDataFile> = {};
  const onDemandFiles: string[] = [];
  const cardModules = new Map<string, string>();
  const packAccumulators = new Map<string, CampaignPackAccumulator>();

  const mountedFiles = modules.flatMap(({ relFromPublic, enabled, raw, data, parseError }) => {
    if (!enabled) return [];
    if (parseError || !data) throw new Error(`[Modules Index] ${relFromPublic}: ${parseError || 'пустой модуль'}`);

    const moduleData = data as TimelineDataFile;
    files[relFromPublic] = moduleData;
    fileHashes[relFromPublic] = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);

    const declared = declaredFiles.get(relFromPublic);
    const branches = collectBranchesFromDataFile(moduleData, relFromPublic);
    const isCampaignPackFile =
      isBranchFile(moduleData) &&
      (moduleData.loadPolicy === 'on_demand' ||
        moduleData.detailScope === 'campaign' ||
        isPlainRecord(moduleData.campaignPack) ||
        relFromPublic.startsWith('data/campaigns/'));

    if (isCampaignPackFile) {
      onDemandFiles.push(relFromPublic);
    }

    if (isBranchFile(moduleData)) {
      const nodeCountByTask = new Map<string, number>();
      for (const node of moduleData.nodes) {
        if (node?.id) cardModules.set(node.id, relFromPublic);
        const taskId = typeof node?.task === 'string' && node.task.trim()
          ? node.task.trim()
          : branches.find((b) => !b.isGroup)?.id;
        if (taskId) {
          nodeCountByTask.set(taskId, (nodeCountByTask.get(taskId) ?? 0) + 1);
        }
      }

      if (isCampaignPackFile && isPlainRecord(moduleData.campaignPack)) {
        const rawPack = moduleData.campaignPack;
        const packId = typeof rawPack.id === 'string' ? rawPack.id.trim() : '';
        const packTitle = typeof rawPack.title === 'string' ? rawPack.title.trim() : '';
        const yearFrom = typeof rawPack.yearFrom === 'number' && Number.isFinite(rawPack.yearFrom) ? rawPack.yearFrom : null;
        const yearTo = typeof rawPack.yearTo === 'number' && Number.isFinite(rawPack.yearTo) ? rawPack.yearTo : null;

        if (packId && packTitle && yearFrom !== null && yearTo !== null) {
          let acc = packAccumulators.get(packId);
          if (!acc) {
            acc = {
              id: packId,
              title: packTitle,
              shortTitle: typeof rawPack.shortTitle === 'string' && rawPack.shortTitle.trim() ? rawPack.shortTitle.trim() : undefined,
              description: typeof rawPack.description === 'string' ? rawPack.description.trim() : '',
              parentEventId: typeof rawPack.parentEventId === 'string' && rawPack.parentEventId.trim() ? rawPack.parentEventId.trim() : undefined,
              yearFrom,
              yearTo: Math.max(yearFrom, yearTo),
              groupBranchId: typeof rawPack.groupBranchId === 'string' && rawPack.groupBranchId.trim() ? rawPack.groupBranchId.trim() : undefined,
              filePaths: new Set<string>(),
              branchIds: new Set<string>(),
              branchesById: new Map<string, CampaignPackBranchSummary>(),
              eventCount: 0,
            };
            packAccumulators.set(packId, acc);
          } else {
            acc.yearFrom = Math.min(acc.yearFrom, yearFrom);
            acc.yearTo = Math.max(acc.yearTo, yearTo);
            if (!acc.parentEventId && typeof rawPack.parentEventId === 'string' && rawPack.parentEventId.trim()) {
              acc.parentEventId = rawPack.parentEventId.trim();
            }
            if (!acc.groupBranchId && typeof rawPack.groupBranchId === 'string' && rawPack.groupBranchId.trim()) {
              acc.groupBranchId = rawPack.groupBranchId.trim();
            }
          }

          acc.filePaths.add(relFromPublic);
          acc.eventCount += moduleData.nodes.length;

          for (const branch of branches) {
            if (branch.isGroup) {
              if (!acc.groupBranchId) acc.groupBranchId = branch.id;
              continue;
            }
            acc.branchIds.add(branch.id);
            const existingSummary = acc.branchesById.get(branch.id);
            const deltaCount = nodeCountByTask.get(branch.id) ?? 0;
            if (existingSummary) {
              existingSummary.eventCount += deltaCount;
            } else {
              acc.branchesById.set(branch.id, {
                id: branch.id,
                label: branch.label,
                short: branch.short,
                color: branch.color,
                description: branch.description,
                eventCount: deltaCount,
              });
            }
          }
        }
      }
    }

    return [{
      fileId: declared?.fileId ?? moduleData.fileId ?? relFromPublic,
      path: relFromPublic,
      role: declared?.role ?? (isRulersFile(moduleData) ? 'rulers_branch' : isCampaignPackFile ? 'campaign_pack' : 'thematic_branch'),
      branchIds: declared?.branchIds ?? branches.map((branch) => branch.id),
      title: declared?.title ?? branches[0]?.label ?? relFromPublic,
      enabled,
      ...(isCampaignPackFile ? { loadPolicy: 'on_demand' as const, detailScope: 'campaign' as const } : {}),
    }];
  });

  // Person index in modules.index.json only maps core modules so person deep-links stay fast
  const coreMountedFiles = mountedFiles.filter((m) => m.loadPolicy !== 'on_demand');
  const effectiveManifest = { ...manifest, mountedFiles: coreMountedFiles };
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

  const campaignPacks: CampaignPackRegistryEntry[] = Array.from(packAccumulators.values())
    .sort((a, b) => a.yearFrom - b.yearFrom || a.id.localeCompare(b.id))
    .map((acc) => ({
      id: acc.id,
      title: acc.title,
      ...(acc.shortTitle ? { shortTitle: acc.shortTitle } : {}),
      description: acc.description,
      ...(acc.parentEventId ? { parentEventId: acc.parentEventId } : {}),
      yearFrom: acc.yearFrom,
      yearTo: acc.yearTo,
      ...(acc.groupBranchId ? { groupBranchId: acc.groupBranchId } : {}),
      filePaths: Array.from(acc.filePaths).sort(),
      branchIds: Array.from(acc.branchIds),
      eventCount: acc.eventCount,
      branches: Array.from(acc.branchesById.values()),
    }));

  const onDemandSet = new Set(onDemandFiles);
  return {
    schemaVersion: manifest.schemaVersion,
    files: Object.keys(files).filter((filePath) => !onDemandSet.has(filePath)),
    ...(onDemandFiles.length > 0 ? { onDemandFiles: onDemandFiles.sort() } : {}),
    ...(campaignPacks.length > 0 ? { campaignPacks } : {}),
    disabledFiles: modules.filter((module) => !module.enabled).map((module) => module.relFromPublic),
    fileHashes,
    cardModules: Object.fromEntries(cardModules),
    personModules: Object.fromEntries(personModules),
  };
}
