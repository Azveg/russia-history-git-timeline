import { discoverTimelineModules } from './timelineModules.mjs';
import fs from 'fs';
import path from 'path';

export interface SnapshotMountedFile {
  fileId: string;
  path: string;
  role: string;
  branchIds: string[];
  title: string;
  enabled: boolean;
  nodesCount: number;
  rulersCount: number;
}

export interface SnapshotBranch {
  id: string;
  gitName: string;
  label: string;
  short: string;
  description: string;
  sourceFile: string;
  category?: string;
  isGroup?: boolean;
  isMilitary?: boolean;
  nodesCount: number;
}

export interface SnapshotMacroEra {
  id: string;
  roman?: string;
  period: string;
  startYear: number;
  endYear: number;
  shortTitle?: string;
  title: string;
  thesis: string;
}

export interface SnapshotRuler {
  id: string;
  eraId: string;
  center?: string;
  ruler: string;
  shortRuler: string;
  reignPeriod: string;
  startYear: number;
  endYear: number;
  reignTitle: string;
  reignThesis: string;
}

export interface SnapshotEvent {
  id: string;
  startYear: number;
  endYear: number;
  period: string;
  title: string;
  subtitle: string;
  task: string;
  branchLabel: string;
  region: string;
  type: string;
  outcome?: string;
  score: number;
}

export interface SnapshotCrossLink {
  id: string;
  from: string;
  to: string;
  type: string;
  label: string;
}

export interface RepositorySnapshot {
  projectTitle: string;
  schemaVersion: string;
  minYear: number;
  maxYear: number;
  macroEras: SnapshotMacroEra[];
  mountedFiles: SnapshotMountedFile[];
  branches: SnapshotBranch[];
  rulers: SnapshotRuler[];
  events: SnapshotEvent[];
  featuredEvents: SnapshotEvent[];
  crossLinks: SnapshotCrossLink[];
  totalInlineLinks: number;
  totalLinks: number;
}

interface RawNode {
  id?: string;
  startYear?: number;
  endYear?: number;
  period?: string;
  title?: string;
  subtitle?: string;
  details?: string;
  task?: string;
  region?: string;
  type?: string;
  outcome?: string;
  subEvents?: unknown[];
  linksTo?: Array<{targetId?: string; type?: string; label?: string}>;
  syncTags?: string[];
  referenceTags?: string[];
}

interface RawBranch {
  id?: string;
  gitName?: string;
  label?: string;
  short?: string;
  description?: string;
  sourceFile?: string;
  category?: string;
  isGroup?: boolean;
  isMilitary?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSiteUrl(siteUrl?: string): string {
  if (!siteUrl) return '';
  return siteUrl.trim().replace(/\/+$/, '');
}

function resolvePublicHref(relativePath: string, siteUrl?: string): string {
  const cleanRel = relativePath.replace(/^\.\//, '').replace(/^\/+/, '');
  const base = normalizeSiteUrl(siteUrl);
  return base ? `${base}/${cleanRel}` : `./${cleanRel}`;
}

function parseEraStartYear(era: {startYear?: number; period?: string}): number {
  if (typeof era.startYear === 'number') return era.startYear;
  const match = era.period?.match(/\d{3,4}/);
  return match ? Number(match[0]) : 862;
}

function parseEraEndYear(era: {endYear?: number; period?: string}, fallbackMax: number): number {
  if (typeof era.endYear === 'number') return era.endYear;
  const matches = era.period?.match(/\d{3,4}/g);
  if (matches && matches.length > 0) {
    return Number(matches[matches.length - 1]);
  }
  return fallbackMax;
}

function safeReadJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function collectRepositorySnapshot(rootDir: string): RepositorySnapshot {
  const publicDir = path.resolve(rootDir, 'public');
  const manifestPath = path.join(publicDir, 'data', 'sync.manifest.json');
  const manifest = safeReadJson<{
    project?: string;
    schemaVersion?: string;
    timeAxis?: {minYear?: number; maxYear?: number};
    mountedFiles?: Array<{
      fileId?: string;
      path?: string;
      role?: string;
      branchIds?: string[];
      title?: string;
      enabled?: boolean;
    }>;
    macroEras?: Array<{
      id: string;
      roman?: string;
      period: string;
      startYear?: number;
      endYear?: number;
      shortTitle?: string;
      title: string;
      thesis: string;
    }>;
    crossLinks?: SnapshotCrossLink[];
  }>(manifestPath);

  const minYear = manifest?.timeAxis?.minYear ?? 862;
  const maxYear = manifest?.timeAxis?.maxYear ?? 2000;
  const projectTitle =
    manifest?.project ?? 'История России и мира: модульный Git-таймлайн (862–2000)';
  const schemaVersion = manifest?.schemaVersion ?? '2.0.0';

  const macroEras: SnapshotMacroEra[] = (manifest?.macroEras ?? []).map((era) => ({
    id: era.id,
    roman: era.roman,
    period: era.period,
    startYear: parseEraStartYear(era),
    endYear: parseEraEndYear(era, maxYear),
    shortTitle: era.shortTitle,
    title: era.title,
    thesis: era.thesis,
  }));

  const branchCountMap = new Map<string, number>();
  const rawBranches: SnapshotBranch[] = [];
  const rulers: SnapshotRuler[] = [];
  const mountedFiles: SnapshotMountedFile[] = [];
  const rawEvents: Array<{
    node: RawNode;
    sourceFile: string;
  }> = [];

  const manifestByPath = new Map((manifest?.mountedFiles ?? []).map((entry) => [
    entry.path?.trim().replace(/^(?:\.\/|\/)+/, ''), entry,
  ]));
  for (const { relFromPublic: relPath, enabled, data: moduleData, parseError } of discoverTimelineModules(publicDir, manifest?.mountedFiles)) {
    if (parseError) throw new Error(`[SEO Snapshot] ${relPath}: ${parseError}`);
    if (!enabled) continue;
    const entry = manifestByPath.get(relPath);
    const data = moduleData as {
      fileId?: string;
      branch?: RawBranch;
      branches?: RawBranch[];
      rulers?: SnapshotRuler[];
      nodes?: RawNode[];
    } | null;

    if (!data) continue;

    const fileBranches: RawBranch[] = [
      ...(data.branch ? [data.branch] : []),
      ...(Array.isArray(data.branches) ? data.branches : []),
    ];

    for (const branch of fileBranches) {
      if (!branch.id) continue;
      rawBranches.push({
        id: branch.id,
        gitName: branch.gitName ?? branch.id.toLowerCase(),
        label: branch.label ?? branch.id,
        short: branch.short ?? branch.id,
        description: branch.description ?? '',
        sourceFile: branch.sourceFile ?? relPath,
        category: branch.category,
        isGroup: branch.isGroup,
        isMilitary: branch.isMilitary,
        nodesCount: 0,
      });
    }

    const fileRulers = Array.isArray(data.rulers) ? data.rulers : [];
    for (const ruler of fileRulers) {
      if (!ruler.id || !ruler.ruler) continue;
      rulers.push(ruler);
    }

    const fileNodes = Array.isArray(data.nodes) ? data.nodes : [];
    for (const node of fileNodes) {
      if (!node.id || !node.title) continue;
      const taskId = node.task ?? '';
      if (taskId) {
        branchCountMap.set(taskId, (branchCountMap.get(taskId) ?? 0) + 1);
      }
      rawEvents.push({node, sourceFile: relPath});
    }

    mountedFiles.push({
      fileId: entry?.fileId ?? data.fileId ?? relPath,
      path: relPath,
      role: entry?.role ?? (Array.isArray(data.rulers) ? 'rulers_branch' : 'thematic_branch'),
      branchIds: entry?.branchIds ?? fileBranches.map((b) => b.id!).filter(Boolean),
      title: entry?.title ?? fileBranches[0]?.label ?? relPath,
      enabled: true,
      nodesCount: fileNodes.length,
      rulersCount: fileRulers.length,
    });
  }

  const visibleIds = new Set([...rawEvents.map(({ node }) => node.id), ...rulers.map(({ id }) => id)]);
  const crossLinks = (manifest?.crossLinks ?? []).filter((link) =>
    link?.id && link.label && visibleIds.has(link.from) && visibleIds.has(link.to),
  );
  const linkDegreeMap = new Map<string, number>();
  const countLink = (from: string, to: string) => {
    linkDegreeMap.set(from, (linkDegreeMap.get(from) ?? 0) + 1);
    linkDegreeMap.set(to, (linkDegreeMap.get(to) ?? 0) + 1);
  };
  for (const link of crossLinks) countLink(link.from, link.to);
  let totalInlineLinks = 0;
  for (const { node } of rawEvents) {
    if (!node.id || !Array.isArray(node.linksTo)) continue;
    for (const link of node.linksTo) {
      if (!link?.targetId || !visibleIds.has(link.targetId)) continue;
      countLink(node.id, link.targetId);
      totalInlineLinks += 1;
    }
  }

  const branchLabelById = new Map<string, string>();
  const branches: SnapshotBranch[] = rawBranches.map((branch) => {
    const count = branch.id === 'MAIN_RULERS' ? rulers.length : (branchCountMap.get(branch.id) ?? 0);
    branchLabelById.set(branch.id, branch.label);
    return {
      ...branch,
      nodesCount: count,
    };
  });

  // Update group branch totals if child branches exist
  const totalBranchCounts = new Map<string, number>();
  for (const b of branches) {
    totalBranchCounts.set(b.id, b.nodesCount);
  }

  const events: SnapshotEvent[] = rawEvents.map(({node}) => {
    const startYear = typeof node.startYear === 'number' ? node.startYear : minYear;
    const endYear = typeof node.endYear === 'number' ? node.endYear : startYear;
    const degree = linkDegreeMap.get(node.id!) ?? 0;
    const subEventsBonus = Array.isArray(node.subEvents) ? Math.min(node.subEvents.length, 4) : 0;
    const outcomeBonus = node.outcome ? 2 : 0;
    const tagBonus = (node.syncTags?.length ?? 0) + (node.referenceTags?.length ?? 0);
    const taskId = node.task ?? 'OTHER';

    return {
      id: node.id!,
      startYear,
      endYear,
      period: node.period ?? `${startYear}`,
      title: node.title!,
      subtitle: node.subtitle ?? '',
      task: taskId,
      branchLabel: branchLabelById.get(taskId) ?? taskId,
      region: node.region ?? 'Россия',
      type: node.type ?? 'Историческое событие',
      outcome: node.outcome,
      score: degree * 5 + subEventsBonus + outcomeBonus + Math.min(tagBonus, 3),
    };
  });

  // Select diverse top-scored historical milestones across eras and branches
  const pickedIds = new Set<string>();
  const featuredCandidates: SnapshotEvent[] = [];

  // Ensure each non-group active branch contributes at least top milestones
  const byBranch = new Map<string, SnapshotEvent[]>();
  for (const ev of events) {
    const arr = byBranch.get(ev.task) ?? [];
    arr.push(ev);
    byBranch.set(ev.task, arr);
  }
  for (const [, list] of byBranch) {
    list.sort((a, b) => b.score - a.score || a.startYear - b.startYear);
    for (const ev of list.slice(0, 3)) {
      if (!pickedIds.has(ev.id)) {
        pickedIds.add(ev.id);
        featuredCandidates.push(ev);
      }
    }
  }

  const sortedGlobal = [...events].sort((a, b) => b.score - a.score || a.startYear - b.startYear);
  for (const ev of sortedGlobal) {
    if (featuredCandidates.length >= 45) break;
    if (!pickedIds.has(ev.id)) {
      pickedIds.add(ev.id);
      featuredCandidates.push(ev);
    }
  }

  featuredCandidates.sort((a, b) => a.startYear - b.startYear || a.endYear - b.endYear);
  rulers.sort((a, b) => a.startYear - b.startYear || a.endYear - b.endYear);

  return {
    projectTitle,
    schemaVersion,
    minYear,
    maxYear,
    macroEras,
    mountedFiles,
    branches,
    rulers,
    events,
    featuredEvents: featuredCandidates,
    crossLinks,
    totalInlineLinks,
    totalLinks: crossLinks.length + totalInlineLinks,
  };
}

export function buildSchemaOrgJsonLd(snapshot: RepositorySnapshot, siteUrl?: string): string {
  const imageUrl = resolvePublicHref('og-image.png', siteUrl);
  const manifestUrl = resolvePublicHref('data/sync.manifest.json', siteUrl);
  const llmsUrl = resolvePublicHref('llms.txt', siteUrl);
  const normalizedBase = normalizeSiteUrl(siteUrl);

  const datasetDescription =
    `Структурированный исторический датасет (${snapshot.minYear}–${snapshot.maxYear}): ` +
    `${snapshot.macroEras.length} макро-периодов, ${snapshot.branches.length} тематических ветвей, ` +
    `${snapshot.rulers.length} правлений и ${snapshot.events.length} ключевых событий с ${snapshot.totalLinks} перекрестными связями.`;

  const graphPayload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Исторический атлас-хронограф',
        alternateName: snapshot.projectTitle,
        description:
          'Интерактивный мультиветочный Git-граф для синхронного изучения правлений, войн, реформ, дипломатии, мировой истории, науки и литературы.',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript for interactive timeline canvas',
        inLanguage: 'ru',
        image: imageUrl,
        ...(normalizedBase ? {url: `${normalizedBase}/`} : {}),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          `Хронология ${snapshot.minYear}–${snapshot.maxYear} с ${snapshot.macroEras.length} макро-периодами`,
          `${snapshot.branches.length} параллельных тематических ветвей истории`,
          `${snapshot.rulers.length} правителей и эпох правления`,
          `${snapshot.events.length} исторических узлов и ${snapshot.totalLinks} причинно-следственных связей`,
          'Сравнение двух исторических периодов или правлений и фокус связей',
        ],
      },
      {
        '@type': 'Dataset',
        name: snapshot.projectTitle,
        description: datasetDescription,
        inLanguage: 'ru',
        version: snapshot.schemaVersion,
        temporalCoverage: `${String(snapshot.minYear).padStart(4, '0')}/${String(snapshot.maxYear).padStart(4, '0')}`,
        spatialCoverage: {
          '@type': 'Place',
          name: 'Россия и всемирно-исторический контекст',
        },
        keywords: [
          'история России',
          'хронология 862-2000',
          'исторический таймлайн',
          'правители Руси и России',
          'причинно-следственные связи',
          'интерактивный граф истории',
        ],
        distribution: [
          {
            '@type': 'DataDownload',
            name: 'Манифест синхронизации ветвей (JSON)',
            encodingFormat: 'application/json',
            contentUrl: manifestUrl,
          },
          {
            '@type': 'DataDownload',
            name: 'Карта репозитория и ветвей для ИИ-агентов (llms.txt)',
            encodingFormat: 'text/plain',
            contentUrl: llmsUrl,
          },
        ],
      },
    ],
  };

  return JSON.stringify(graphPayload, null, 2).replace(/<\//g, '<\\/');
}

export function buildRootHtmlSnapshot(snapshot: RepositorySnapshot): string {
  const erasHtml = snapshot.macroEras
    .map(
      (era) =>
        `<li class="seo-snapshot-card">` +
        `<strong class="seo-snapshot-accent">${escapeHtml(era.title)}</strong> ` +
        `<span class="seo-snapshot-muted">(${escapeHtml(era.period)})</span>` +
        `<p class="seo-snapshot-text">${escapeHtml(era.thesis)}</p>` +
        `</li>`,
    )
    .join('\n          ');

  const branchesHtml = snapshot.branches
    .map(
      (branch) =>
        `<li class="seo-snapshot-item">` +
        `<strong>${escapeHtml(branch.label)}</strong> ` +
        `<code class="seo-snapshot-code">${escapeHtml(branch.gitName)}</code> ` +
        `<span class="seo-snapshot-muted">(${branch.nodesCount})</span> — ` +
        `<span class="seo-snapshot-text-inline">${escapeHtml(branch.description)}</span> ` +
        `[<a class="seo-snapshot-link" href="./${escapeHtml(branch.sourceFile)}">${escapeHtml(branch.sourceFile)}</a>]` +
        `</li>`,
    )
    .join('\n          ');

  const rulersHtml = snapshot.rulers
    .map(
      (ruler) =>
        `<li class="seo-snapshot-item">` +
        `<time class="seo-snapshot-time">${escapeHtml(ruler.reignPeriod)}</time> — ` +
        `<strong>${escapeHtml(ruler.ruler)}</strong>` +
        `${ruler.center ? ` <span class="seo-snapshot-muted">[${escapeHtml(ruler.center)}]</span>` : ''}: ` +
        `<span class="seo-snapshot-text-inline">${escapeHtml(ruler.reignTitle)}</span>` +
        `</li>`,
    )
    .join('\n          ');

  const eventsHtml = snapshot.featuredEvents
    .map(
      (ev) =>
        `<article class="seo-snapshot-card">` +
        `<div class="seo-snapshot-meta">` +
        `<time class="seo-snapshot-link">${escapeHtml(ev.period)}</time> · ` +
        `<span>${escapeHtml(ev.branchLabel)}</span> · ` +
        `<span>${escapeHtml(ev.region)}</span>` +
        `</div>` +
        `<h3 class="seo-snapshot-item-title">${escapeHtml(ev.title)}</h3>` +
        `${ev.subtitle ? `<p class="seo-snapshot-text">${escapeHtml(ev.subtitle)}</p>` : ''}` +
        `${ev.outcome ? `<p class="seo-snapshot-outcome">Итог: ${escapeHtml(ev.outcome)}</p>` : ''}` +
        `</article>`,
    )
    .join('\n          ');

  return [
    `<div data-seo-snapshot="true" class="seo-noscript-snapshot">`,
    `  <header class="seo-snapshot-header">`,
    `    <p class="seo-snapshot-kicker">Хронология ${snapshot.minYear}–${snapshot.maxYear} · Интерактивный Git-таймлайн</p>`,
    `    <h1 class="seo-snapshot-h1">${escapeHtml(snapshot.projectTitle)}</h1>`,
    `    <p class="seo-snapshot-text">Мультиветочный граф для синхронного изучения правлений, войн, экономических реформ, дипломатических договоров, мировой истории, науки, архитектуры, медицины и русской литературы.</p>`,
    `    <p class="seo-snapshot-muted">Охват базы: ${snapshot.macroEras.length} макро-периодов · ${snapshot.branches.length} ветвей · ${snapshot.rulers.length} правлений · ${snapshot.events.length} событий · ${snapshot.totalLinks} связей.</p>`,
    `    <nav aria-label="Машиночитаемые источники" class="seo-snapshot-nav">`,
    `      <a class="seo-snapshot-link" href="./data/sync.manifest.json">Манифест данных (sync.manifest.json)</a>`,
    `      <a class="seo-snapshot-link" href="./llms.txt">Карта ветвей для ИИ-агентов (llms.txt)</a>`,
    `      <a class="seo-snapshot-link" href="./data/modules.index.json">Индекс JSON-модулей (modules.index.json)</a>`,
    `    </nav>`,
    `  </header>`,
    `  <main>`,
    `    <section class="seo-snapshot-section">`,
    `      <h2 class="seo-snapshot-h2">Макро-периоды истории (${snapshot.macroEras.length})</h2>`,
    `      <ol class="seo-snapshot-list-plain">`,
    `        ${erasHtml}`,
    `      </ol>`,
    `    </section>`,
    `    <section class="seo-snapshot-section">`,
    `      <h2 class="seo-snapshot-h2">Тематические ветви и JSON-модули (${snapshot.branches.length})</h2>`,
    `      <ul class="seo-snapshot-list">`,
    `        ${branchesHtml}`,
    `      </ul>`,
    `    </section>`,
    `    <section class="seo-snapshot-section">`,
    `      <h2 class="seo-snapshot-h2">Хронология правлений (${snapshot.rulers.length})</h2>`,
    `      <ol class="seo-snapshot-list">`,
    `        ${rulersHtml}`,
    `      </ol>`,
    `    </section>`,
    `    <section class="seo-snapshot-section">`,
    `      <h2 class="seo-snapshot-h2">Ключевые исторические события и узлы (${snapshot.featuredEvents.length} из ${snapshot.events.length})</h2>`,
    `      ${eventsHtml}`,
    `    </section>`,
    `  </main>`,
    `</div>`,
  ].join('\n');
}

export function buildLlmsTxt(snapshot: RepositorySnapshot, siteUrl?: string): string {
  const lines: string[] = [];

  lines.push(`# ${snapshot.projectTitle}`);
  lines.push('');
  lines.push(
    `> Интерактивный мультиветочный Git-таймлайн истории России и мира (${snapshot.minYear}–${snapshot.maxYear}) с модульной JSON-архитектурой, ${snapshot.macroEras.length} макро-периодами, ${snapshot.branches.length} ветвями, ${snapshot.rulers.length} правлениями, ${snapshot.events.length} событиями и ${snapshot.totalLinks} причинно-следственными связями.`,
  );
  lines.push('');
  lines.push('## Repository & Data Architecture');
  lines.push('');
  lines.push(`- Schema Version: ${snapshot.schemaVersion}`);
  lines.push(`- Temporal Axis: ${snapshot.minYear}–${snapshot.maxYear} (adaptive year/month/day resolution)`);
  lines.push(`- Primary Manifest: ${resolvePublicHref('data/sync.manifest.json', siteUrl)}`);
  lines.push(`- Modules Index: ${resolvePublicHref('data/modules.index.json', siteUrl)}`);
  lines.push(`- OpenGraph Image: ${resolvePublicHref('og-image.png', siteUrl)}`);
  lines.push('- Structure:');
  lines.push('  - `sync.manifest.json`: `macroEras[]`, `mountedFiles[]`, `crossLinks[]` (`from`, `to`, `type`, `label`)');
  lines.push('  - `rulers.json`: `branch` + `rulers[]` (`id`, `eraId`, `center`, `ruler`, `reignPeriod`, `startYear`, `endYear`, `reignTitle`, `reignThesis`)');
  lines.push('  - Thematic files: `branch` / `branches[]` + `nodes[]` (`id`, `startYear`, `endYear`, `period`, `title`, `subtitle`, `details`, `task`, `region`, `type`, `outcome`, `subEvents[]`, `linksTo[]`, `syncTags[]`)');
  lines.push('');
  lines.push('## Mounted JSON Modules');
  lines.push('');
  for (const file of snapshot.mountedFiles) {
    const countPart =
      file.rulersCount > 0 ? `${file.rulersCount} rulers` : `${file.nodesCount} nodes`;
    lines.push(
      `- [${file.title}](${resolvePublicHref(file.path, siteUrl)}) (\`${file.fileId}\`, role: \`${file.role}\`, ${countPart}, branches: ${file.branchIds.join(', ')})`,
    );
  }
  lines.push('');
  lines.push(`## Branches (${snapshot.branches.length})`);
  lines.push('');
  for (const branch of snapshot.branches) {
    lines.push(
      `- **${branch.label}** (\`${branch.id}\` / \`${branch.gitName}\`, ${branch.nodesCount} items, file: \`${branch.sourceFile}\`): ${branch.description}`,
    );
  }
  lines.push('');
  lines.push(`## Macro-Periods (${snapshot.macroEras.length})`);
  lines.push('');
  for (const era of snapshot.macroEras) {
    lines.push(`- **${era.title}** (${era.period}): ${era.thesis}`);
  }
  lines.push('');
  lines.push(`## Sample Cross-Branch Links (${snapshot.crossLinks.length} manifest + ${snapshot.totalInlineLinks} inline)`);
  lines.push('');
  for (const link of snapshot.crossLinks) {
    lines.push(`- \`${link.from}\` --[${link.type}]--> \`${link.to}\`: ${link.label}`);
  }
  lines.push('');
  lines.push(`## Highlighted Timeline Nodes (${snapshot.featuredEvents.length} of ${snapshot.events.length})`);
  lines.push('');
  for (const ev of snapshot.featuredEvents) {
    lines.push(`- **${ev.period}** · ${ev.title} [${ev.task}]: ${ev.subtitle || ev.outcome || ev.type}`);
  }
  lines.push('');

  return lines.join('\n');
}
