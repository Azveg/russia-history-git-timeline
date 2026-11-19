#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const STRICT_MODE = process.argv.includes('--strict');
const CHECK_STYLE = process.argv.includes('--check-style');

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
const VALID_CALENDAR_STYLES = new Set(['julian', 'gregorian', 'both']);
const VALID_SOURCE_TYPES = new Set(['primary', 'document', 'historiography', 'reference']);
const HTTPS_URL_REGEX = /^https:\/\/\S+$/i;
const DATE_REGEX = /^\d{3,4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const SAFE_BADGE_CLASS_REGEX = /^[a-zA-Z0-9_\-\s/:.%]+$/;
const TAG_FORMAT_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseRawDateParts(rawDate) {
  if (typeof rawDate !== 'string') return null;
  const m = rawDate.trim().match(/^(\d{3,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : undefined;
  const day = m[3] ? Number(m[3]) : undefined;
  const precision = day !== undefined ? 'day' : month !== undefined ? 'month' : 'year';
  return { year, month, day, precision };
}

function gregorianToJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mAdj + 2) / 5) +
    365 * yAdj +
    Math.floor(yAdj / 4) -
    Math.floor(yAdj / 100) +
    Math.floor(yAdj / 400) -
    32045
  );
}

function julianToJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;
  return d + Math.floor((153 * mAdj + 2) / 5) + 365 * yAdj + Math.floor(yAdj / 4) - 32083;
}

function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function isBeforeGregorianIntro(rawDate, style) {
  const p = parseRawDateParts(rawDate);
  if (!p) return false;
  if (p.year < 1582) return true;
  if (p.year > 1582) return false;
  const m = p.month ?? 1;
  if (m < 10) return true;
  if (m > 10) return false;
  if (p.day === undefined) return false;
  return p.day < (style === 'julian' ? 5 : 15);
}

function isModernGregorianEra(rawDate, style) {
  const p = parseRawDateParts(rawDate);
  if (!p) return false;
  if (p.year > 1918) return true;
  if (p.year < 1918) return false;
  const m = p.month ?? 1;
  if (m > 2) return true;
  if (m < 2) return false;
  if (p.day !== undefined) {
    return style === 'julian' ? p.day > 1 : p.day >= 14;
  }
  return style === 'gregorian' || style === undefined;
}

function isDateInDualCalendarWindow(rawDate, style) {
  const p = parseRawDateParts(rawDate);
  if (!p || p.precision === 'year') return false;
  return !isBeforeGregorianIntro(rawDate, style) && !isModernGregorianEra(rawDate, style);
}

function isTransitionYearPreciseDate(rawDate) {
  const p = parseRawDateParts(rawDate);
  if (!p || p.precision === 'year') return false;
  return p.year === 1582 || p.year === 1918;
}

function resolveUnifiedDateInfo(rawDate, style) {
  const p = parseRawDateParts(rawDate);
  if (!p) return null;
  if (p.precision !== 'day' || p.month === undefined || p.day === undefined) {
    return { unifiedYear: p.year, jdn: null, inDualWindow: isDateInDualCalendarWindow(rawDate, style) };
  }
  const inDualWindow = isDateInDualCalendarWindow(rawDate, style);
  if (isBeforeGregorianIntro(rawDate, style)) {
    return { unifiedYear: p.year, jdn: julianToJdn(p.year, p.month, p.day), inDualWindow: false };
  }
  if (isModernGregorianEra(rawDate, style)) {
    return { unifiedYear: p.year, jdn: gregorianToJdn(p.year, p.month, p.day), inDualWindow: false };
  }
  if (style === 'julian') {
    const jdn = julianToJdn(p.year, p.month, p.day);
    const g = jdnToGregorian(jdn);
    return {
      unifiedYear: g.year,
      unifiedIso: `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`,
      jdn,
      inDualWindow: true,
    };
  }
  const jdn = gregorianToJdn(p.year, p.month, p.day);
  return {
    unifiedYear: p.year,
    unifiedIso: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`,
    jdn,
    inDualWindow: true,
  };
}

function validateRecordCalendarConsistency(relFromPublic, entityLabel, record, startYear, endYear) {
  const style = record.calendarStyle;
  const dateFields = [
    ['startDate', record.startDate, startYear],
    ['endDate', record.endDate, endYear],
  ];

  if (style !== undefined) {
    if (typeof style !== 'string' || !VALID_CALENDAR_STYLES.has(style)) {
      addError(relFromPublic, `${entityLabel}: недопустимый calendarStyle ("${style}"). Ожидается julian, gregorian или both.`);
      return;
    }

    for (const [df, raw] of dateFields) {
      if (typeof raw !== 'string' || !DATE_REGEX.test(raw.trim())) continue;
      if (style === 'both') {
        if (isBeforeGregorianIntro(raw, style)) {
          addError(
            relFromPublic,
            `${entityLabel}: calendarStyle="both" недопустим для ${df}="${raw}" (до введения григорианского календаря 15 октября 1582 г.). Используйте "julian".`,
          );
        } else if (isModernGregorianEra(raw, style)) {
          addError(
            relFromPublic,
            `${entityLabel}: calendarStyle="both" недопустим для ${df}="${raw}" (после реформы 14 февраля 1918 г.). Используйте "gregorian".`,
          );
        }
      } else if (style === 'julian' && isModernGregorianEra(raw, style)) {
        addError(
          relFromPublic,
          `${entityLabel}: calendarStyle="julian" недопустим для ${df}="${raw}" (после реформы 14 февраля 1918 г.). Используйте "gregorian".`,
        );
      } else if (style === 'gregorian' && isBeforeGregorianIntro(raw, style)) {
        addError(
          relFromPublic,
          `${entityLabel}: calendarStyle="gregorian" недопустим для ${df}="${raw}" (до 15 октября 1582 г.). Используйте "julian".`,
        );
      }
    }
  } else if (
    isDateInDualCalendarWindow(record.startDate) ||
    isDateInDualCalendarWindow(record.endDate) ||
    isTransitionYearPreciseDate(record.startDate) ||
    isTransitionYearPreciseDate(record.endDate)
  ) {
    addWarning(
      relFromPublic,
      `${entityLabel}: точная дата в окне 1582–1918 гг. (включая переходные годы 1582 и 1918) не размечена полем calendarStyle.`,
    );
  }

  for (const [df, raw, expectedYear] of dateFields) {
    if (typeof raw !== 'string' || !DATE_REGEX.test(raw.trim()) || typeof expectedYear !== 'number') continue;
    const info = resolveUnifiedDateInfo(raw, style);
    if (info && info.unifiedYear !== expectedYear) {
      const yearField = df === 'startDate' ? 'startYear' : 'endYear';
      addWarning(
        relFromPublic,
        `${entityLabel}: расхождение года между ${yearField}=${expectedYear} и единым григорианским годом ${df}="${raw}" (${info.unifiedYear}, calendarStyle="${style ?? 'auto'}").`,
      );
    }
  }
}

function validateRecordSources(relFromPublic, entityLabel, record) {
  if (record.sources === undefined) return;
  if (!Array.isArray(record.sources)) {
    addError(relFromPublic, `${entityLabel}: поле "sources" должно быть массивом объектов.`);
    return;
  }
  const seenCitations = new Set();
  record.sources.forEach((src, sIdx) => {
    if (!isPlainObject(src)) {
      addError(relFromPublic, `${entityLabel}: sources[${sIdx}] должен быть объектом.`);
      return;
    }
    if (typeof src.type !== 'string' || !VALID_SOURCE_TYPES.has(src.type.trim())) {
      addError(
        relFromPublic,
        `${entityLabel}: sources[${sIdx}] имеет недопустимый type ("${src.type}"). Ожидается primary, document, historiography или reference.`,
      );
    }
    if (typeof src.citation !== 'string' || src.citation.trim().length < 6) {
      addError(
        relFromPublic,
        `${entityLabel}: sources[${sIdx}] должен содержать непустую библиографическую строку "citation".`,
      );
    } else {
      const norm = src.citation.trim().toLowerCase();
      if (seenCitations.has(norm)) {
        addWarning(relFromPublic, `${entityLabel}: дублирующийся источник в sources[${sIdx}].`);
      } else {
        seenCitations.add(norm);
      }
    }
    if (src.note !== undefined && (typeof src.note !== 'string' || !src.note.trim())) {
      addError(relFromPublic, `${entityLabel}: sources[${sIdx}].note должно быть непустой строкой.`);
    }
    if (src.url !== undefined && (typeof src.url !== 'string' || !HTTPS_URL_REGEX.test(src.url.trim()))) {
      addError(
        relFromPublic,
        `${entityLabel}: sources[${sIdx}].url ("${src.url}") должен быть корректным https:// URL.`,
      );
    }
  });
}

const errors = [];
const warnings = [];
const styleNotes = [];

const STYLE_CLICHE_STEMS = [
  'триумф', 'грандиозн', 'легендарн', 'гениальн', 'величайш', 'блестящ',
  'сокрушительн', 'героическ', 'эпохальн', 'титаническ', 'феноменальн',
  'молниеносн', 'чудовищн', 'безупречн', 'беспрецедентн', 'жесточайш',
  'оглушительн', 'невиданн', 'потрясающ', 'невероятн', 'непревзойд',
  'блистательн', 'бессмертн', 'немеркнущ', 'величественн', 'мощнейш',
  'уникальн', 'кровав', 'катастрофическ', 'трагическ', 'агони', 'надлом',
  'сговор', 'позорн', 'унизительн', 'беспощадн', 'вероломн', 'шедевр',
  'подлинн', 'великолепн', 'редчайш', 'мгновенн', 'громово', 'громовы',
];
const STYLE_CLICHE_REGEX = new RegExp(`(?<![а-яё])(${STYLE_CLICHE_STEMS.join('|')})[а-яё]*`, 'gi');
const STYLE_WHITELIST_REGEX =
  /триумфальн[а-яё]*\s+(арк|ворот|колонн|площад)|кровав[а-яё]*\s+воскресень|сулейман[а-яё\sI()кануни]*великолепн|бессмерт(ие|ии|ию|ия)/i;

function addError(file, msg) {
  errors.push(`[ERROR] ${file}: ${msg}`);
}

function addWarning(file, msg) {
  warnings.push(`[WARN]  ${file}: ${msg}`);
}

function auditStyleText(file, entityLabel, fieldName, rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) return;
  const cleaned = rawText.replace(/«[^»]*»/g, '«…»');
  for (const m of cleaned.matchAll(STYLE_CLICHE_REGEX)) {
    const idx = m.index ?? 0;
    const ctx = cleaned.slice(Math.max(0, idx - 25), Math.min(cleaned.length, idx + m[0].length + 30));
    if (STYLE_WHITELIST_REGEX.test(ctx)) continue;
    styleNotes.push(`[STYLE] ${file} | ${entityLabel} (${fieldName}): «${m[0]}» — …${ctx.trim()}…`);
  }
}

function auditRecordAcademicStyle(file, entityLabel, record, isRuler = false) {
  if (isRuler) {
    auditStyleText(file, entityLabel, 'reignTitle', record.reignTitle);
    auditStyleText(file, entityLabel, 'reignThesis', record.reignThesis);
    return;
  }
  for (const fld of ['title', 'subtitle', 'details', 'outcome']) {
    auditStyleText(file, entityLabel, fld, record[fld]);
  }
  if (Array.isArray(record.prerequisites)) {
    record.prerequisites.forEach((p, idx) => auditStyleText(file, entityLabel, `prerequisites[${idx}]`, p));
  }
  if (Array.isArray(record.subEvents)) {
    record.subEvents.forEach((se, idx) => {
      auditStyleText(file, entityLabel, `subEvents[${idx}].title`, se?.title);
      auditStyleText(file, entityLabel, `subEvents[${idx}].text`, se?.text ?? se?.description);
    });
  }
  if (Array.isArray(record.linksTo)) {
    record.linksTo.forEach((lnk, idx) => auditStyleText(file, entityLabel, `linksTo[${idx}].label`, lnk?.label));
  }
  if (isPlainObject(record.literaryProfile)) {
    for (const [k, v] of Object.entries(record.literaryProfile)) {
      if (typeof v === 'string') {
        auditStyleText(file, entityLabel, `literaryProfile.${k}`, v);
      }
    }
  }
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
        addError(relFromPublic, `Ветка "${id}": недопустимый цвет "${br.color}" — требуется строгий 6-значный HEX-формат (#RRGGBB).`);
      }

      if (
        br.badgeClass !== undefined &&
        (typeof br.badgeClass !== 'string' || !br.badgeClass.trim() || !SAFE_BADGE_CLASS_REGEX.test(br.badgeClass.trim()))
      ) {
        addError(relFromPublic, `Ветка "${id}": поле "badgeClass" содержит недопустимые символы.`);
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

        validateRecordCalendarConsistency(relFromPublic, `Правитель "${rId}"`, r, r.startYear, r.endYear);
        validateRecordSources(relFromPublic, `Правитель "${rId}"`, r);
        auditRecordAcademicStyle(relFromPublic, `Правитель "${rId}"`, r, true);

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

        validateRecordCalendarConsistency(relFromPublic, `Узел "${nId}"`, node, startYear, endYear);
        validateRecordSources(relFromPublic, `Узел "${nId}"`, node);
        auditRecordAcademicStyle(relFromPublic, `Узел "${nId}"`, node, false);

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

  // Проверка полноты manifest.mountedFiles относительно фактических JSON-модулей в public/data/
  if (manifest && Array.isArray(manifest.mountedFiles)) {
    const diskModuleRelPaths = new Set(moduleFiles.map((item) => item.relFromPublic));
    const mountedPaths = new Set();
    manifest.mountedFiles.forEach((entry, idx) => {
      if (!isPlainObject(entry) || typeof entry.path !== 'string' || !entry.path.trim()) {
        addError('data/sync.manifest.json', `manifest.mountedFiles[${idx}]: отсутствует корректное поле "path".`);
        return;
      }
      const norm = entry.path.trim().replace(/^(?:\.\/|\/)+/, '');
      if (mountedPaths.has(norm)) {
        addError('data/sync.manifest.json', `manifest.mountedFiles[${idx}]: дублирующийся путь "${norm}".`);
      }
      mountedPaths.add(norm);
      if (!diskModuleRelPaths.has(norm)) {
        addError('data/sync.manifest.json', `manifest.mountedFiles[${idx}]: файл "${norm}" не найден в public/data/.`);
      }
    });
    for (const diskPath of diskModuleRelPaths) {
      if (!mountedPaths.has(diskPath)) {
        addError(
          'data/sync.manifest.json',
          `Модуль "${diskPath}" присутствует в public/data/, но отсутствует в manifest.mountedFiles (выпадает из SEO-снэпшота, llms.txt и fallback-загрузчика).`,
        );
      }
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
        auditStyleText('data/sync.manifest.json', `crossLink "${lnk.id || idx}"`, 'label', lnk.label);
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
    if (!fromExists || !toExists) {
      continue;
    }

    // Проверка согласованности кодирования календарных дат между связанными узлами для одной астрономической даты (JDN)
    const fromNodeObj = allNodesById.get(lnk.from)?.node;
    const toNodeObj = allNodesById.get(lnk.to)?.node;
    if (fromNodeObj && toNodeObj) {
      const fromStyle = fromNodeObj.calendarStyle;
      const toStyle = toNodeObj.calendarStyle;
      const fromIsJulianRaw = fromStyle === 'julian';
      const toIsJulianRaw = toStyle === 'julian';
      if (fromStyle && toStyle && fromIsJulianRaw !== toIsJulianRaw) {
        const fromDates = Array.from(
          new Set([fromNodeObj.startDate, fromNodeObj.endDate].filter((d) => typeof d === 'string')),
        );
        const toDates = Array.from(
          new Set([toNodeObj.startDate, toNodeObj.endDate].filter((d) => typeof d === 'string')),
        );
        for (const fd of fromDates) {
          const fInfo = resolveUnifiedDateInfo(fd, fromStyle);
          if (!fInfo?.inDualWindow || fInfo.jdn === null) continue;
          for (const td of toDates) {
            const tInfo = resolveUnifiedDateInfo(td, toStyle);
            if (!tInfo?.inDualWindow || tInfo.jdn === null) continue;
            if (fInfo.jdn === tInfo.jdn) {
              addWarning(
                lnk.file,
                `Несогласованное кодирование календарного стиля (${lnk.source}): связанные узлы "${lnk.from}" (${fd}, calendarStyle="${fromStyle}") и "${lnk.to}" (${td}, calendarStyle="${toStyle}") описывают одну дату (${fInfo.unifiedIso} н. ст.) в разных системах кодирования.`,
              );
            }
          }
        }
      }
    }

    if (!CAUSAL_TYPES.has(lnk.type)) {
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
  console.log(`Ошибок: ${errors.length} | Предупреждений: ${warnings.length} | Стилистических замечаний (мягкий аудит): ${styleNotes.length}`);

  if (CHECK_STYLE && styleNotes.length > 0) {
    console.log('\nСтилистический аудит (--check-style, мягкий режим):');
    styleNotes.forEach((s) => console.log(`  ${s}`));
  }

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
