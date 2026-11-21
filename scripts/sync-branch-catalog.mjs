#!/usr/bin/env node
import { discoverTimelineModules } from './timelineModules.mjs';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const OUTPUT_PATH = path.join(ROOT_DIR, 'BRANCH_CATALOG.md');
const CHECK_MODE = process.argv.includes('--check');

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function parseYears(node) {
  if (typeof node.startYear === 'number' && Number.isFinite(node.startYear)) {
    const endYear =
      typeof node.endYear === 'number' && Number.isFinite(node.endYear)
        ? Math.max(node.startYear, node.endYear)
        : node.startYear;
    return { startYear: node.startYear, endYear };
  }
  const matches = String(node.period || '').match(/\b(\d{3,4})\b/g);
  const nums = (matches || []).map(Number).filter((n) => n >= 100 && n <= 2100);
  if (nums.length === 0) return { startYear: 1700, endYear: 1700 };
  const startYear = nums[0];
  const endYear = nums.length > 1 ? Math.max(...nums) : startYear;
  return { startYear, endYear: Math.max(startYear, endYear) };
}

function escapeMd(text) {
  return String(text || '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function generateCatalogMarkdown() {
  const manifestPath = path.join(DATA_DIR, 'sync.manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = {};
    }
  }

  const macroEras = Array.isArray(manifest.macroEras) ? manifest.macroEras : [];
  const manifestLinks = Array.isArray(manifest.crossLinks) ? manifest.crossLinks : [];
  const baseMinYear = typeof manifest?.timeAxis?.minYear === 'number' ? manifest.timeAxis.minYear : 862;
  const baseMaxYear = typeof manifest?.timeAxis?.maxYear === 'number' ? manifest.timeAxis.maxYear : 2000;

  let minYear = baseMinYear;
  let maxYear = baseMaxYear;

  const moduleFiles = discoverTimelineModules(PUBLIC_DIR, manifest?.mountedFiles);
  const branches = [];
  const branchById = new Map();
  const nodes = [];
  const rulers = [];
  let explicitLinksCount = manifestLinks.length;

  for (const { relFromPublic, data: parsed, enabled } of moduleFiles) {
    if (!isPlainObject(parsed)) continue;

    const isFileDisabled = !enabled;
    const declared = [];
    if (isPlainObject(parsed.branch)) declared.push(parsed.branch);
    if (Array.isArray(parsed.branches)) declared.push(...parsed.branches.filter(isPlainObject));

    for (const br of declared) {
      if (typeof br.id !== 'string' || !br.id.trim()) continue;
      const id = br.id.trim();
      if (branchById.has(id)) continue;

      const entry = {
        id,
        gitName: br.gitName || `branch/${id.toLowerCase()}`,
        label: br.label || id,
        short: br.short || id.toLowerCase(),
        parentBranchId: typeof br.parentBranchId === 'string' && br.parentBranchId.trim() ? br.parentBranchId.trim() : null,
        isGroup: br.isGroup === true,
        isMilitary: Boolean(br.isMilitary),
        category: br.category || (id === 'MAIN_RULERS' ? 'rulers' : br.isMilitary ? 'military' : 'other'),
        color: br.color || '#94a3b8',
        defaultEnabled: !isFileDisabled && br.defaultEnabled !== false,
        defaultCollapsedOnTimeline: Boolean(br.defaultCollapsedOnTimeline),
        file: relFromPublic,
        fileEnabled: !isFileDisabled,
      };
      branchById.set(id, entry);
      branches.push(entry);
    }

    if (isFileDisabled) continue;

    if (Array.isArray(parsed.rulers)) {
      for (const r of parsed.rulers) {
        if (!isPlainObject(r) || typeof r.id !== 'string') continue;
        const startYear = typeof r.startYear === 'number' ? r.startYear : null;
        const endYear = typeof r.endYear === 'number' ? r.endYear : startYear;
        if (startYear !== null && startYear < minYear) minYear = startYear;
        if (endYear !== null && endYear > maxYear) maxYear = endYear;
        rulers.push({
          id: r.id.trim(),
          eraId: r.eraId || '—',
          center: typeof r.center === 'string' && r.center.trim() ? r.center.trim() : '—',
          ruler: r.ruler || r.shortRuler || r.id,
          reignPeriod: r.reignPeriod || `${startYear ?? '?'}–${endYear ?? '?'}`,
          startYear,
          endYear,
          file: relFromPublic,
        });
      }
    }

    if (Array.isArray(parsed.crossLinks)) {
      explicitLinksCount += parsed.crossLinks.length;
    }

    if (Array.isArray(parsed.nodes)) {
      for (const rawNode of parsed.nodes) {
        if (!isPlainObject(rawNode) || typeof rawNode.id !== 'string' || !rawNode.title) continue;
        const { startYear, endYear } = parseYears(rawNode);
        if (startYear < minYear) minYear = startYear;
        if (endYear > maxYear) maxYear = endYear;

        if (Array.isArray(rawNode.linksTo)) {
          explicitLinksCount += rawNode.linksTo.length;
        }

        const rawSyncTags = [
          ...(Array.isArray(rawNode.syncTags) ? rawNode.syncTags : []),
          ...(typeof rawNode.campaignId === 'string' ? [rawNode.campaignId] : []),
        ];
        const syncTags = Array.from(
          new Set(rawSyncTags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)),
        );
        const referenceTags = Array.from(
          new Set(
            (Array.isArray(rawNode.referenceTags) ? rawNode.referenceTags : [])
              .map((t) => String(t).trim().toLowerCase())
              .filter(Boolean),
          ),
        );

        nodes.push({
          id: rawNode.id.trim(),
          task: typeof rawNode.task === 'string' ? rawNode.task.trim() : 'UNASSIGNED',
          startYear,
          endYear,
          period: rawNode.period || (startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`),
          title: rawNode.title,
          type: rawNode.type || 'Событие',
          syncTags,
          referenceTags,
          file: relFromPublic,
        });
      }
    }
  }

  // Подсчёт событий по веткам
  const nodeCountByTask = new Map();
  for (const n of nodes) {
    nodeCountByTask.set(n.task, (nodeCountByTask.get(n.task) || 0) + 1);
  }

  // Агрегация тегов syncTags / campaignId и referenceTags
  const tagStats = new Map();
  for (const n of nodes) {
    const addTagEntry = (tag, kind) => {
      let bucket = tagStats.get(tag);
      if (!bucket) {
        bucket = {
          tag,
          kinds: new Set(),
          branches: new Set(),
          minYear: n.startYear,
          maxYear: n.endYear,
          events: [],
          eventIds: new Set(),
        };
        tagStats.set(tag, bucket);
      }
      bucket.kinds.add(kind);
      bucket.branches.add(n.task);
      if (n.startYear < bucket.minYear) bucket.minYear = n.startYear;
      if (n.endYear > bucket.maxYear) bucket.maxYear = n.endYear;
      if (!bucket.eventIds.has(n.id)) {
        bucket.eventIds.add(n.id);
        bucket.events.push(n);
      }
    };

    for (const tag of n.syncTags) addTagEntry(tag, 'sync');
    for (const tag of n.referenceTags) addTagEntry(tag, 'ref');
  }

  const sortedTags = Array.from(tagStats.values()).sort((a, b) => a.tag.localeCompare(b.tag));

  const lines = [];
  lines.push('# Динамический каталог веток и тегов (`BRANCH_CATALOG.md`)');
  lines.push('');
  lines.push('> **Автогенерируемый файл.** Не редактируйте вручную — обновляется командой `npm run sync:catalog` или автоматически через GitHub Actions при изменении JSON-модулей в `public/data/`.');
  lines.push('> Правила создания файлов, схема и системный промпт для ИИ находятся в [`BRANCH_SPEC.md`](./BRANCH_SPEC.md).');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. Сводка состояния базы');
  lines.push('');
  lines.push(`- **Модульных JSON-файлов:** ${moduleFiles.length}`);
  lines.push(`- **Объявленных веток:** ${branches.length} (групп: ${branches.filter((b) => b.isGroup).length}, листовых: ${branches.filter((b) => !b.isGroup).length})`);
  lines.push(`- **Событий (nodes):** ${nodes.length}`);
  lines.push(`- **Правлений (rulers):** ${rulers.length}`);
  lines.push(`- **Фактический диапазон оси времени:** \`${minYear}–${maxYear}\``);
  lines.push(`- **Активных тегов (\`syncTags\` / \`campaignId\` / \`referenceTags\`):** ${sortedTags.length}`);
  lines.push(`- **Явных связей (\`crossLinks\` + \`linksTo\`):** ${explicitLinksCount}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. Реестр текущих веток');
  lines.push('');
  lines.push('| `id` | `gitName` | Название (`label`) | Родитель | Тип | Цвет | Старт | Узлов | Файл |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |');

  for (const br of branches) {
    const count = br.id === 'MAIN_RULERS' ? rulers.length : (nodeCountByTask.get(br.id) || 0);
    const kind = br.isGroup ? 'Группа (`isGroup`)' : br.isMilitary ? 'Военная' : 'Тематическая';
    const startFlag = !br.fileEnabled
      ? 'выкл (файл)'
      : br.isGroup
        ? br.defaultCollapsedOnTimeline
          ? 'свёрнута'
          : 'группа'
        : br.id === 'MAIN_RULERS'
          ? 'вкл (по умолч.)'
          : 'выкл (по умолч.)';
    lines.push(
      `| \`${br.id}\` | \`${br.gitName}\` | ${escapeMd(br.label)} | ${br.parentBranchId ? `\`${br.parentBranchId}\`` : '—'} | ${kind} | \`${br.color}\` | ${startFlag} | ${count} | \`${br.file}\` |`,
    );
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## 3. Активные теги (`syncTags`, `campaignId`, `referenceTags`)');
  lines.push('');
  lines.push('- **`syncTags` / `campaignId`**: синхронная авто-связь для узлов разных веток в окне **±3 года**.');
  lines.push('- **`referenceTags`**: внеоконная отсылка (книги, фильмы, исследования) — связывается с носителем тега **через любое число лет** (50, 100+ лет).');
  lines.push('- **Канонический тег любого события из раздела 6**: `event-<node.id>` (например, `event-1914-ww1`) работает автоматически даже без правки файла исходного события.');
  lines.push('');

  if (sortedTags.length === 0) {
    lines.push('_Активных тегов пока нет._');
  } else {
    lines.push('| Тег | Режим | Диапазон лет | Ветки (`task`) | События (`id`) |');
    lines.push('| :--- | :---: | :---: | :--- | :--- |');
    for (const item of sortedTags) {
      const mode =
        item.kinds.has('sync') && item.kinds.has('ref')
          ? 'sync + ref'
          : item.kinds.has('ref')
            ? 'ref (внеоконный)'
            : 'sync (±3 г.)';
      const branchList = Array.from(item.branches).sort().map((id) => `\`${id}\``).join(', ');
      const evList = [...item.events]
        .sort((a, b) => a.startYear - b.startYear || a.id.localeCompare(b.id))
        .map((e) => `\`${e.id}\` (${e.period})`)
        .join(', ');
      lines.push(
        `| \`${item.tag}\` | ${mode} | ${item.minYear}–${item.maxYear} | ${branchList} | ${evList} |`,
      );
    }
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## 4. Макро-периоды (`ERA_1`–`ERA_11`) и наполнение');
  lines.push('');
  lines.push('| `id` | Диапазон | Название | Событий | Правителей |');
  lines.push('| :--- | :--- | :--- | :---: | :---: |');
  for (const era of macroEras) {
    const s = typeof era.startYear === 'number' ? era.startYear : 0;
    const e = typeof era.endYear === 'number' ? era.endYear : 9999;
    const evCount = nodes.filter((n) =>
      n.endYear > n.startYear ? Math.min(n.endYear, e) - Math.max(n.startYear, s) > 0 : n.startYear >= s && n.startYear <= e,
    ).length;
    const rCount = rulers.filter((r) =>
      r.startYear !== null && r.endYear !== null
        ? r.endYear > r.startYear
          ? Math.min(r.endYear, e) - Math.max(r.startYear, s) > 0
          : r.startYear >= s && r.startYear <= e
        : r.eraId === era.id,
    ).length;
    lines.push(`| \`${era.id}\` | ${escapeMd(era.period)} | ${escapeMd(era.title)} | ${evCount} | ${rCount} |`);
  }
  lines.push('');

  if (rulers.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 5. Справочник ID правителей (`rulers.json`)');
    lines.push('');
    lines.push('| `id` | Годы | Центр | Правитель | Период |');
    lines.push('| :--- | :--- | :--- | :--- | :---: |');
    for (const r of rulers) {
      lines.push(`| \`${r.id}\` | ${escapeMd(r.reignPeriod)} | ${escapeMd(r.center)} | ${escapeMd(r.ruler)} | \`${r.eraId}\` |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## 6. Каталог ID событий для точных связей `linksTo`');
  lines.push('');
  lines.push('Используйте эти `id` в поле `linksTo[].targetId`, если нужно связать события из разных веток напрямую (особенно при разрыве больше 3 лет, когда теги `syncTags` не срабатывают).');
  lines.push('');

  const groupedTasks = [];
  for (const br of branches) {
    if (!br.isGroup && br.id !== 'MAIN_RULERS') {
      groupedTasks.push({ id: br.id, label: br.label, gitName: br.gitName });
    }
  }
  for (const taskId of nodeCountByTask.keys()) {
    if (!branchById.has(taskId)) {
      groupedTasks.push({ id: taskId, label: `${taskId} (авто-ветка)`, gitName: `theme/${taskId.toLowerCase()}` });
    }
  }

  for (const group of groupedTasks) {
    const branchNodes = nodes
      .filter((n) => n.task === group.id)
      .sort((a, b) => a.startYear - b.startYear || a.endYear - b.endYear || a.id.localeCompare(b.id));

    if (branchNodes.length === 0) continue;

    lines.push(`### \`${group.id}\` — ${escapeMd(group.label)} (\`${group.gitName}\`, ${branchNodes.length})`);
    lines.push('');
    for (const n of branchNodes) {
      const parts = [];
      if (n.syncTags.length > 0) {
        parts.push(`теги: ${n.syncTags.map((t) => `\`#${t}\``).join(' ')}`);
      }
      if (n.referenceTags.length > 0) {
        parts.push(`отсылки: ${n.referenceTags.map((t) => `\`@${t}\``).join(' ')}`);
      }
      const tagSuffix = parts.length > 0 ? ` — ${parts.join(' · ')}` : '';
      lines.push(`- \`${n.id}\` (${escapeMd(n.period)}) — ${escapeMd(n.title)}${tagSuffix}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function main() {
  const nextContent = generateCatalogMarkdown();

  if (CHECK_MODE) {
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.error('[ERROR] Файл BRANCH_CATALOG.md отсутствует. Запустите: npm run sync:catalog');
      process.exit(1);
    }
    const currentContent = fs.readFileSync(OUTPUT_PATH, 'utf8');
    if (currentContent !== nextContent) {
      console.error('[ERROR] Файл BRANCH_CATALOG.md устарел относительно public/data/. Запустите: npm run sync:catalog');
      process.exit(1);
    }
    console.log('[OK] BRANCH_CATALOG.md актуален.');
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, nextContent, 'utf8');
  console.log('[OK] BRANCH_CATALOG.md успешно обновлён.');
}

main();
