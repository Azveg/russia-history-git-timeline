#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const STRICT_MODE = process.argv.includes('--strict');

const VALID_CATEGORIES = new Set(['rulers', 'military', 'economy', 'world', 'other']);
const VALID_LINK_TYPES = new Set([
  'triggers',
  'sync_context',
  'enables',
  'references',
  'about_event',
  'inspired_by',
  'causes',
  'consequence',
]);
const DATE_REGEX = /^\d{3,4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/;
const TAG_FORMAT_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors = [];
const warnings = [];

function addError(file, msg) {
  errors.push(`[ERROR] ${file}: ${msg}`);
}

function addWarning(file, msg) {
  warnings.push(`[WARN]  ${file}: ${msg}`);
}

function scanJsonFiles(dir, basePublicDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanJsonFiles(fullPath, basePublicDir));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const relFromPublic = path.relative(basePublicDir, fullPath).replace(/\\/g, '/');
      if (relFromPublic === 'data/sync.manifest.json' || relFromPublic === 'data/modules.index.json') {
        continue;
      }
      results.push({ fullPath, relFromPublic });
    }
  }
  return results.sort((a, b) => a.relFromPublic.localeCompare(b.relFromPublic));
}

function isPlainObject(v) {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function parseYearsFromPeriod(periodStr) {
  const matches = String(periodStr || '').match(/\b(\d{3,4})\b/g);
  const nums = (matches || []).map(Number).filter((n) => n >= 100 && n <= 2100);
  if (nums.length === 0) return null;
  const startYear = nums[0];
  const endYear = nums.length > 1 ? Math.max(...nums) : startYear;
  return { startYear, endYear: Math.max(startYear, endYear) };
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`[FATAL] Директория данных не найдена: ${DATA_DIR}`);
    process.exit(1);
  }

  const manifestPath = path.join(DATA_DIR, 'sync.manifest.json');
  let manifest = null;
  const knownEraIds = new Set();

  if (!fs.existsSync(manifestPath)) {
    addError('data/sync.manifest.json', 'Файл манифеста отсутствует.');
  } else {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!isPlainObject(manifest)) {
        addError('data/sync.manifest.json', 'Корень файла должен быть JSON-объектом.');
      } else {
        if (Array.isArray(manifest.macroEras)) {
          manifest.macroEras.forEach((era, idx) => {
            if (!isPlainObject(era) || typeof era.id !== 'string' || !era.id.trim()) {
              addError('data/sync.manifest.json', `macroEras[${idx}] не содержит валидного id.`);
            } else {
              knownEraIds.add(era.id.trim());
            }
          });
        }
      }
    } catch (err) {
      addError('data/sync.manifest.json', `Ошибка синтаксиса JSON: ${err.message}`);
    }
  }

  const moduleFiles = scanJsonFiles(DATA_DIR, PUBLIC_DIR);
  const allBranchesById = new Map();
  const allNodesById = new Map();
  const allRulersById = new Map();
  const collectedLinks = [];
  const collectedNodes = [];
  const syncTagsSet = new Set();

  for (const { fullPath, relFromPublic } of moduleFiles) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      addError(relFromPublic, `Ошибка синтаксиса JSON: ${err.message}`);
      continue;
    }

    if (!isPlainObject(parsed)) {
      addError(relFromPublic, 'Корень файла должен быть JSON-объектом.');
      continue;
    }

    if (typeof parsed.fileId !== 'string' || !parsed.fileId.trim()) {
      addError(relFromPublic, 'Отсутствует обязательное строковое поле "fileId".');
    }

    if (typeof parsed.path === 'string' && parsed.path.trim() !== relFromPublic) {
      addWarning(
        relFromPublic,
        `Поле "path" ("${parsed.path}") отличается от фактического пути ("${relFromPublic}").`,
      );
    }

    const declaredBranches = [];
    if (parsed.branch !== undefined) {
      if (!isPlainObject(parsed.branch)) {
        addError(relFromPublic, 'Поле "branch" должно быть объектом.');
      } else {
        declaredBranches.push(parsed.branch);
      }
    }
    if (parsed.branches !== undefined) {
      if (!Array.isArray(parsed.branches)) {
        addError(relFromPublic, 'Поле "branches" должно быть массивом.');
      } else {
        declaredBranches.push(...parsed.branches);
      }
    }

    if (declaredBranches.length === 0) {
      addWarning(relFromPublic, 'Не объявлено ни одной ветки ("branch" или "branches"). События попадут в авто-ветку.');
    }

    declaredBranches.forEach((br, idx) => {
      const ctx = `branch[${idx}]`;
      if (!isPlainObject(br)) {
        addError(relFromPublic, `${ctx} должен быть объектом.`);
        return;
      }

      const id = typeof br.id === 'string' ? br.id.trim() : '';
      if (!id) {
        addError(relFromPublic, `${ctx}: отсутствует обязательное поле "id".`);
        return;
      }

      if (allBranchesById.has(id)) {
        addError(
          relFromPublic,
          `${ctx}: дублирующийся id ветки "${id}" (уже объявлен в ${allBranchesById.get(id).file}).`,
        );
      } else {
        allBranchesById.set(id, { ...br, id, file: relFromPublic });
      }

      for (const reqField of ['gitName', 'label', 'short', 'color']) {
        if (typeof br[reqField] !== 'string' || !br[reqField].trim()) {
          addError(relFromPublic, `Ветка "${id}": отсутствует обязательное поле "${reqField}".`);
        }
      }

      if (typeof br.color === 'string' && br.color.trim() && !HEX_COLOR_REGEX.test(br.color.trim())) {
        addWarning(relFromPublic, `Ветка "${id}": цвет "${br.color}" лучше задавать в HEX-формате (#RRGGBB).`);
      }

      if (br.category !== undefined && !VALID_CATEGORIES.has(br.category)) {
        addError(
          relFromPublic,
          `Ветка "${id}": недопустимая категория "${br.category}". Допустимы: ${Array.from(VALID_CATEGORIES).join(', ')}.`,
        );
      }

      if (br.parentBranchId !== undefined) {
        if (typeof br.parentBranchId !== 'string' || !br.parentBranchId.trim()) {
          addError(relFromPublic, `Ветка "${id}": "parentBranchId" должен быть непустой строкой.`);
        } else if (br.parentBranchId.trim() === id) {
          addError(relFromPublic, `Ветка "${id}": не может ссылаться сама на себя через parentBranchId.`);
        }
      }
    });

    const isRulers = Array.isArray(parsed.rulers);
    const isBranchNodes = Array.isArray(parsed.nodes);

    if (!isRulers && !isBranchNodes) {
      addError(relFromPublic, 'Файл должен содержать массив "nodes" (для тематических веток) или "rulers" (для правителей).');
      continue;
    }

    if (isRulers) {
      parsed.rulers.forEach((r, idx) => {
        if (!isPlainObject(r)) {
          addError(relFromPublic, `rulers[${idx}] должен быть объектом.`);
          return;
        }
        const rId = typeof r.id === 'string' ? r.id.trim() : '';
        if (!rId) {
          addError(relFromPublic, `rulers[${idx}]: отсутствует "id".`);
          return;
        }
        if (allRulersById.has(rId)) {
          addError(relFromPublic, `rulers[${idx}]: дублирующийся id "${rId}".`);
        } else {
          allRulersById.set(rId, relFromPublic);
        }

        if (typeof r.startYear !== 'number' || typeof r.endYear !== 'number') {
          addError(relFromPublic, `Правитель "${rId}": startYear и endYear должны быть числами.`);
        } else if (r.endYear < r.startYear) {
          addError(relFromPublic, `Правитель "${rId}": endYear (${r.endYear}) меньше startYear (${r.startYear}).`);
        }

        if (knownEraIds.size > 0 && r.eraId && !knownEraIds.has(r.eraId)) {
          addWarning(relFromPublic, `Правитель "${rId}": eraId "${r.eraId}" не найден в sync.manifest.json.`);
        }

        for (const df of ['startDate', 'endDate']) {
          if (r[df] !== undefined && (typeof r[df] !== 'string' || !DATE_REGEX.test(r[df].trim()))) {
            addError(relFromPublic, `Правитель "${rId}": неверный формат ${df} ("${r[df]}"). Ожидается YYYY, YYYY-MM или YYYY-MM-DD.`);
          }
        }

        if (r.center !== undefined && (typeof r.center !== 'string' || !r.center.trim())) {
          addError(relFromPublic, `Правитель "${rId}": поле "center" должно быть непустой строкой.`);
        }
      });
    }

    if (isBranchNodes) {
      parsed.nodes.forEach((node, idx) => {
        if (!isPlainObject(node)) {
          addError(relFromPublic, `nodes[${idx}] должен быть объектом.`);
          return;
        }

        const nId = typeof node.id === 'string' ? node.id.trim() : '';
        if (!nId) {
          addError(relFromPublic, `nodes[${idx}]: отсутствует обязательное поле "id".`);
          return;
        }

        const parsedPeriod = parseYearsFromPeriod(node.period);
        const startYear = typeof node.startYear === 'number' ? node.startYear : parsedPeriod?.startYear;
        const endYear = typeof node.endYear === 'number' ? node.endYear : (parsedPeriod?.endYear ?? startYear);

        if (allNodesById.has(nId)) {
          addError(
            relFromPublic,
            `nodes[${idx}]: дублирующийся id узла "${nId}" (уже существует в ${allNodesById.get(nId).file}).`,
          );
        } else {
          allNodesById.set(nId, { file: relFromPublic, node, startYear, endYear });
        }

        for (const reqStr of ['title', 'subtitle', 'details', 'task', 'period', 'region', 'type']) {
          if (typeof node[reqStr] !== 'string' || !node[reqStr].trim()) {
            const level = reqStr === 'region' || reqStr === 'type' ? addWarning : addError;
            level(relFromPublic, `Узел "${nId}": пустое или отсутствующее поле "${reqStr}".`);
          }
        }

        if (typeof startYear !== 'number' || !Number.isFinite(startYear)) {
          addError(relFromPublic, `Узел "${nId}": невозможно определить startYear (укажите число "startYear" или год в "period").`);
        } else if (typeof endYear === 'number' && endYear < startYear) {
          addError(relFromPublic, `Узел "${nId}": endYear (${endYear}) меньше startYear (${startYear}).`);
        }

        for (const df of ['startDate', 'endDate']) {
          if (node[df] !== undefined) {
            if (typeof node[df] !== 'string' || !DATE_REGEX.test(node[df].trim())) {
              addError(relFromPublic, `Узел "${nId}": неверный формат ${df} ("${node[df]}"). Используйте YYYY, YYYY-MM или YYYY-MM-DD.`);
            }
          }
        }

        if (node.prerequisites !== undefined) {
          const isValidString = typeof node.prerequisites === 'string' && node.prerequisites.trim().length > 0;
          const isValidArray =
            Array.isArray(node.prerequisites) &&
            node.prerequisites.every((item) => typeof item === 'string' && item.trim().length > 0);
          if (!isValidString && !isValidArray) {
            addError(
              relFromPublic,
              `Узел "${nId}": поле "prerequisites" должно быть непустой строкой или массивом непустых строк.`,
            );
          }
        }

        if (node.subEvents !== undefined) {
          if (!Array.isArray(node.subEvents)) {
            addError(relFromPublic, `Узел "${nId}": поле "subEvents" должно быть массивом.`);
          } else {
            node.subEvents.forEach((se, sIdx) => {
              const hasBodyText = typeof se?.text === 'string' || typeof se?.description === 'string';
              if (!isPlainObject(se) || typeof se.title !== 'string' || !hasBodyText) {
                addError(
                  relFromPublic,
                  `Узел "${nId}": subEvents[${sIdx}] должен содержать строковые "title" и "text" (или "description").`,
                );
              }
            });
          }
        }

        for (const tagField of ['syncTags', 'referenceTags']) {
          if (node[tagField] !== undefined) {
            if (!Array.isArray(node[tagField])) {
              addError(relFromPublic, `Узел "${nId}": поле "${tagField}" должно быть массивом строк.`);
            } else {
              node[tagField].forEach((tag) => {
                if (typeof tag !== 'string' || !tag.trim()) {
                  addError(relFromPublic, `Узел "${nId}": тег в ${tagField} должен быть непустой строкой.`);
                } else {
                  const trimmed = tag.trim();
                  if (!TAG_FORMAT_REGEX.test(trimmed)) {
                    addWarning(
                      relFromPublic,
                      `Узел "${nId}": тег "${trimmed}" в ${tagField} не соответствует строгому kebab-case (латиница [a-z0-9-]).`,
                    );
                  }
                  syncTagsSet.add(trimmed.toLowerCase());
                }
              });
            }
          }
        }

        if (typeof node.campaignId === 'string' && node.campaignId.trim()) {
          const cid = node.campaignId.trim();
          if (!TAG_FORMAT_REGEX.test(cid)) {
            addWarning(
              relFromPublic,
              `Узел "${nId}": campaignId "${cid}" не соответствует строгому kebab-case (латиница [a-z0-9-]).`,
            );
          }
          syncTagsSet.add(cid.toLowerCase());
        }

        if (node.linksTo !== undefined) {
          if (!Array.isArray(node.linksTo)) {
            addError(relFromPublic, `Узел "${nId}": поле "linksTo" должно быть массивом.`);
          } else {
            node.linksTo.forEach((lnk, lIdx) => {
              if (!isPlainObject(lnk) || typeof lnk.targetId !== 'string' || !lnk.targetId.trim()) {
                addError(relFromPublic, `Узел "${nId}": linksTo[${lIdx}] должен содержать "targetId".`);
              } else {
                const linkType = typeof lnk.type === 'string' && lnk.type.trim() ? lnk.type.trim() : 'sync_context';
                if (lnk.type !== undefined && !VALID_LINK_TYPES.has(linkType)) {
                  addWarning(relFromPublic, `Узел "${nId}": нестандартный тип связи "${lnk.type}".`);
                }
                collectedLinks.push({
                  file: relFromPublic,
                  from: nId,
                  to: lnk.targetId.trim(),
                  type: linkType,
                  source: `linksTo[${lIdx}]`,
                });
              }
            });
          }
        }

        collectedNodes.push({ file: relFromPublic, id: nId, task: node.task });
      });

      if (parsed.crossLinks !== undefined) {
        if (!Array.isArray(parsed.crossLinks)) {
          addError(relFromPublic, 'Поле "crossLinks" должно быть массивом.');
        } else {
          parsed.crossLinks.forEach((lnk, lIdx) => {
            if (!isPlainObject(lnk) || typeof lnk.from !== 'string' || typeof lnk.to !== 'string') {
              addError(relFromPublic, `crossLinks[${lIdx}] должен содержать "from", "to" и "label".`);
            } else {
              const linkType = typeof lnk.type === 'string' && lnk.type.trim() ? lnk.type.trim() : 'sync_context';
              if (lnk.type !== undefined && !VALID_LINK_TYPES.has(linkType)) {
                addWarning(relFromPublic, `crossLinks[${lIdx}]: нестандартный тип связи "${lnk.type}".`);
              }
              collectedLinks.push({
                file: relFromPublic,
                from: lnk.from.trim(),
                to: lnk.to.trim(),
                type: linkType,
                source: `crossLinks[${lIdx}]`,
              });
            }
          });
        }
      }
    }
  }

  // Проверка иерархии веток (циклы — ошибка, отсутствующий внешний родитель — предупреждение)
  for (const [id, br] of allBranchesById.entries()) {
    if (br.parentBranchId) {
      const parentId = br.parentBranchId.trim();
      if (!allBranchesById.has(parentId)) {
        addWarning(br.file, `Ветка "${id}": родительская ветка "${parentId}" сейчас не найдена среди файлов в public/data/.`);
      } else {
        const visited = new Set([id]);
        let cur = allBranchesById.get(parentId);
        while (cur && cur.parentBranchId) {
          const nextParentId = cur.parentBranchId.trim();
          if (visited.has(nextParentId)) {
            addError(br.file, `Обнаружен цикл иерархии parentBranchId с участием ветки "${id}".`);
            break;
          }
          visited.add(nextParentId);
          cur = allBranchesById.get(nextParentId);
        }
      }
    }
  }

  // Проверка соответствия node.task объявленным веткам
  for (const item of collectedNodes) {
    if (!item.task) continue;
    const br = allBranchesById.get(item.task);
    if (!br) {
      addWarning(item.file, `Узел "${item.id}" ссылается на ветку "${item.task}", не объявленную в "branch"/"branches" (будет создана авто-ветка).`);
    } else if (br.isGroup) {
      addError(item.file, `Узел "${item.id}" привязан к группе "${item.task}" (isGroup: true). Привязывайте узлы к дочерним/листовым веткам.`);
    }
  }

  // Проверка ссылок (manifest.crossLinks + локальные linksTo/crossLinks)
  if (manifest && Array.isArray(manifest.crossLinks)) {
    manifest.crossLinks.forEach((lnk, idx) => {
      if (isPlainObject(lnk) && typeof lnk.from === 'string' && typeof lnk.to === 'string') {
        const linkType = typeof lnk.type === 'string' && lnk.type.trim() ? lnk.type.trim() : 'sync_context';
        if (lnk.type !== undefined && !VALID_LINK_TYPES.has(linkType)) {
          addWarning('data/sync.manifest.json', `manifest.crossLinks[${idx}]: нестандартный тип связи "${lnk.type}".`);
        }
        collectedLinks.push({
          file: 'data/sync.manifest.json',
          from: lnk.from.trim(),
          to: lnk.to.trim(),
          type: linkType,
          source: `manifest.crossLinks[${idx}]`,
        });
      }
    });
  }

  const CAUSAL_TYPES = new Set(['triggers', 'enables', 'causes', 'consequence']);
  const causalVectorPairs = new Map();

  for (const lnk of collectedLinks) {
    if (lnk.from === lnk.to) {
      addError(lnk.file, `Связь ${lnk.source}: узел "${lnk.from}" ссылается сам на себя.`);
      continue;
    }
    const fromExists = allNodesById.has(lnk.from);
    const toExists = allNodesById.has(lnk.to);
    if (!fromExists) {
      addWarning(lnk.file, `Висячая связь (${lnk.source}): исходный узел "${lnk.from}" не найден (пропускается на сайте).`);
    }
    if (!toExists) {
      addWarning(lnk.file, `Висячая связь (${lnk.source}): целевой узел "${lnk.to}" не найден (пропускается на сайте).`);
    }
    if (!fromExists || !toExists || !CAUSAL_TYPES.has(lnk.type)) {
      continue;
    }

    const causeId = lnk.type === 'consequence' ? lnk.to : lnk.from;
    const effectId = lnk.type === 'consequence' ? lnk.from : lnk.to;
    const causeEntry = allNodesById.get(causeId);
    const effectEntry = allNodesById.get(effectId);

    if (
      typeof causeEntry?.startYear === 'number' &&
      typeof causeEntry?.endYear === 'number' &&
      typeof effectEntry?.startYear === 'number' &&
      typeof effectEntry?.endYear === 'number'
    ) {
      if (effectEntry.endYear < causeEntry.startYear) {
        addError(
          lnk.file,
          `Хронологическая инверсия (${lnk.source}): причина "${causeId}" (${causeEntry.startYear}–${causeEntry.endYear}) полностью позже следствия "${effectId}" (${effectEntry.startYear}–${effectEntry.endYear}) [type=${lnk.type}].`,
        );
      } else if (effectEntry.startYear < causeEntry.startYear) {
        addWarning(
          lnk.file,
          `Перекрытие с ранним стартом следствия (${lnk.source}): причина "${causeId}" (${causeEntry.startYear}–${causeEntry.endYear}) начинается позже старта следствия "${effectId}" (${effectEntry.startYear}–${effectEntry.endYear}) [type=${lnk.type}]. Используйте sync_context или уточните вектор.`,
        );
      }
    }

    const pairKey = causeId < effectId ? `${causeId}|${effectId}` : `${effectId}|${causeId}`;
    const existingCausal = causalVectorPairs.get(pairKey);
    const curDesc = `${lnk.file} ${lnk.source} (${causeId} -> ${effectId}, ${lnk.type})`;
    if (existingCausal && existingCausal.causeId !== causeId) {
      addWarning(
        lnk.file,
        `Противоречивые встречные причинные связи между "${causeId}" и "${effectId}": ${existingCausal.desc} против ${curDesc}.`,
      );
    } else if (!existingCausal) {
      causalVectorPairs.set(pairKey, { causeId, effectId, desc: curDesc });
    }
  }

  console.log('=== Проверка модульных JSON-веток таймлайна ===');
  console.log(`Файлов проверено: ${moduleFiles.length}`);
  console.log(`Веток объявлено:  ${allBranchesById.size}`);
  console.log(`Событий (nodes):  ${allNodesById.size}`);
  console.log(`Правителей:       ${allRulersById.size}`);
  console.log(`Активных тегов:   ${syncTagsSet.size > 0 ? Array.from(syncTagsSet).sort().join(', ') : 'нет'}`);
  console.log(`Ошибок: ${errors.length} | Предупреждений: ${warnings.length}`);

  if (warnings.length > 0) {
    console.log('\nПредупреждения (не блокируют сайт благодаря изоляции):');
    warnings.forEach((w) => console.log(`  ${w}`));
  }

  if (errors.length > 0) {
    console.error('\nКритические ошибки схемы:');
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }

  if (STRICT_MODE && warnings.length > 0) {
    console.error('\nРежим --strict: присутствуют предупреждения.');
    process.exit(1);
  }

  console.log('\n[OK] Проверка успешно пройдена.');
}

main();
