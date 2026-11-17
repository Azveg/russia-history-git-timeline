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

  const crossLinks: SnapshotCrossLink[] = (manifest?.crossLinks ?? []).filter(
    (link): link is SnapshotCrossLink =>
      Boolean(link && link.id && link.from && link.to && link.label),
  );

  const linkDegreeMap = new Map<string, number>();
  for (const link of crossLinks) {
    linkDegreeMap.set(link.from, (linkDegreeMap.get(link.from) ?? 0) + 1);
    linkDegreeMap.set(link.to, (linkDegreeMap.get(link.to) ?? 0) + 1);
  }

  const branchCountMap = new Map<string, number>();
  const rawBranches: SnapshotBranch[] = [];
  const rulers: SnapshotRuler[] = [];
  const mountedFiles: SnapshotMountedFile[] = [];
  const rawEvents: Array<{
    node: RawNode;
    sourceFile: string;
  }> = [];

  let totalInlineLinks = 0;

  const mountedEntries = manifest?.mountedFiles ?? [];
  const seenFiles = new Set<string>();

  for (const entry of mountedEntries) {
    if (!entry.path || entry.enabled === false) continue;
    const relPath = entry.path.replace(/^\/+/, '');
    if (seenFiles.has(relPath)) continue;
    seenFiles.add(relPath);

    const fullFilePath = path.resolve(publicDir, relPath);
    const data = safeReadJson<{
      branch?: RawBranch;
      branches?: RawBranch[];
      rulers?: SnapshotRuler[];
      nodes?: RawNode[];
    }>(fullFilePath);

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
      if (Array.isArray(node.linksTo)) {
        totalInlineLinks += node.linksTo.length;
        linkDegreeMap.set(node.id, (linkDegreeMap.get(node.id) ?? 0) + node.linksTo.length);
        for (const inlineLink of node.linksTo) {
          if (inlineLink?.targetId) {
            linkDegreeMap.set(
              inlineLink.targetId,
              (linkDegreeMap.get(inlineLink.targetId) ?? 0) + 1,
            );
          }
        }
      }
      rawEvents.push({node, sourceFile: relPath});
    }

    mountedFiles.push({
      fileId: entry.fileId ?? relPath,
      path: relPath,
      role: entry.role ?? 'thematic_branch',
      branchIds: entry.branchIds ?? fileBranches.map((b) => b.id!).filter(Boolean),
      title: entry.title ?? relPath,
      enabled: true,
      nodesCount: fileNodes.length,
      rulersCount: fileRulers.length,
    });
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
        name: `Git-Таймлайн истории (${snapshot.minYear}–${snapshot.maxYear})`,
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
        `<li style="margin:0 0 10px 0;padding:10px 12px;border:1px solid #1e293b;border-radius:8px;background:#0b1120;">` +
        `<strong style="color:#fcd34d;">${escapeHtml(era.title)}</strong> ` +
        `<span style="color:#94a3b8;">(${escapeHtml(era.period)})</span>` +
        `<p style="margin:4px 0 0 0;color:#cbd5e1;font-size:14px;">${escapeHtml(era.thesis)}</p>` +
        `</li>`,
    )
    .join('\n          ');

  const branchesHtml = snapshot.branches
    .map(
      (branch) =>
        `<li style="margin:0 0 8px 0;">` +
        `<strong style="color:#e2e8f0;">${escapeHtml(branch.label)}</strong> ` +
        `<code style="color:#93c5fd;font-size:12px;">${escapeHtml(branch.gitName)}</code> ` +
        `<span style="color:#94a3b8;">(${branch.nodesCount})</span> — ` +
        `<span style="color:#cbd5e1;">${escapeHtml(branch.description)}</span> ` +
        `[<a href="./${escapeHtml(branch.sourceFile)}" style="color:#38bdf8;">${escapeHtml(branch.sourceFile)}</a>]` +
        `</li>`,
    )
    .join('\n          ');

  const rulersHtml = snapshot.rulers
    .map(
      (ruler) =>
        `<li style="margin:0 0 6px 0;">` +
        `<time style="color:#fbbf24;font-family:monospace;">${escapeHtml(ruler.reignPeriod)}</time> — ` +
        `<strong style="color:#f8fafc;">${escapeHtml(ruler.ruler)}</strong>` +
        `${ruler.center ? ` <span style="color:#94a3b8;">[${escapeHtml(ruler.center)}]</span>` : ''}: ` +
        `<span style="color:#cbd5e1;">${escapeHtml(ruler.reignTitle)}</span>` +
        `</li>`,
    )
    .join('\n          ');

  const eventsHtml = snapshot.featuredEvents
    .map(
      (ev) =>
        `<article style="margin:0 0 10px 0;padding:10px 12px;border:1px solid #1e293b;border-radius:8px;background:#0b1120;">` +
        `<div style="font-size:12px;color:#94a3b8;">` +
        `<time style="color:#38bdf8;font-family:monospace;">${escapeHtml(ev.period)}</time> · ` +
        `<span>${escapeHtml(ev.branchLabel)}</span> · ` +
        `<span>${escapeHtml(ev.region)}</span>` +
        `</div>` +
        `<h3 style="margin:4px 0;font-size:16px;color:#f8fafc;">${escapeHtml(ev.title)}</h3>` +
        `${ev.subtitle ? `<p style="margin:0 0 4px 0;color:#cbd5e1;font-size:14px;">${escapeHtml(ev.subtitle)}</p>` : ''}` +
        `${ev.outcome ? `<p style="margin:0;color:#94a3b8;font-size:13px;">Итог: ${escapeHtml(ev.outcome)}</p>` : ''}` +
        `</article>`,
    )
    .join('\n          ');

  return [
    `<div data-seo-snapshot="true" style="max-width:1040px;margin:0 auto;padding:32px 20px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;line-height:1.55;color:#f1f5f9;background:#050811;">`,
    `  <header style="border-bottom:1px solid #1e293b;padding-bottom:16px;margin-bottom:24px;">`,
    `    <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#fbbf24;">Хронология ${snapshot.minYear}–${snapshot.maxYear} · Интерактивный Git-таймлайн</p>`,
    `    <h1 style="margin:0 0 10px 0;font-size:28px;color:#ffffff;">${escapeHtml(snapshot.projectTitle)}</h1>`,
    `    <p style="margin:0 0 12px 0;color:#cbd5e1;">Мультиветочный граф для синхронного изучения правлений, войн, экономических реформ, дипломатических договоров, мировой истории, науки и русской литературы.</p>`,
    `    <p style="margin:0 0 12px 0;font-size:14px;color:#94a3b8;">Охват базы: ${snapshot.macroEras.length} макро-периодов · ${snapshot.branches.length} ветвей · ${snapshot.rulers.length} правлений · ${snapshot.events.length} событий · ${snapshot.totalLinks} связей.</p>`,
    `    <nav aria-label="Машиночитаемые источники" style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;">`,
    `      <a href="./data/sync.manifest.json" style="color:#38bdf8;">Манифест данных (sync.manifest.json)</a>`,
    `      <a href="./llms.txt" style="color:#38bdf8;">Карта ветвей для ИИ-агентов (llms.txt)</a>`,
    `      <a href="./data/modules.index.json" style="color:#38bdf8;">Индекс JSON-модулей (modules.index.json)</a>`,
    `    </nav>`,
    `  </header>`,
    `  <main>`,
    `    <section style="margin-bottom:28px;">`,
    `      <h2 style="font-size:20px;color:#fcd34d;margin:0 0 12px 0;">Макро-периоды истории (${snapshot.macroEras.length})</h2>`,
    `      <ol style="list-style:none;padding:0;margin:0;">`,
    `        ${erasHtml}`,
    `      </ol>`,
    `    </section>`,
    `    <section style="margin-bottom:28px;">`,
    `      <h2 style="font-size:20px;color:#fcd34d;margin:0 0 12px 0;">Тематические ветви и JSON-модули (${snapshot.branches.length})</h2>`,
    `      <ul style="padding-left:18px;margin:0;">`,
    `        ${branchesHtml}`,
    `      </ul>`,
    `    </section>`,
    `    <section style="margin-bottom:28px;">`,
    `      <h2 style="font-size:20px;color:#fcd34d;margin:0 0 12px 0;">Хронология правлений (${snapshot.rulers.length})</h2>`,
    `      <ol style="padding-left:20px;margin:0;">`,
    `        ${rulersHtml}`,
    `      </ol>`,
    `    </section>`,
    `    <section style="margin-bottom:24px;">`,
    `      <h2 style="font-size:20px;color:#fcd34d;margin:0 0 12px 0;">Ключевые исторические события и узлы (${snapshot.featuredEvents.length} из ${snapshot.events.length})</h2>`,
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
