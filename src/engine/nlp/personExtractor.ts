import type { EnrichedEvent, PersonDossier, RulerPeriod } from '../../types/timeline';
import { isBiographyNode } from '../calendar/jdnCalendar';

function splitOutsideParens(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '(') depth += 1;
    else if (ch === ')' && depth > 0) depth -= 1;

    if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }

  const tail = current.trim();
  if (tail) parts.push(tail);
  return parts;
}

export function parseKeyFiguresList(raw: unknown): string[] | undefined {
  const list: string[] = [];
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (typeof item === 'string' && item.trim().length > 0) {
        list.push(...splitOutsideParens(item));
      }
    });
  } else if (typeof raw === 'string' && raw.trim().length > 0) {
    list.push(...splitOutsideParens(raw));
  }
  return list.length > 0 ? list : undefined;
}

const PERSON_TITLE_PREFIXES = new Set([
  'князь',
  'великий',
  'великая',
  'княгиня',
  'царь',
  'царица',
  'царевич',
  'царевна',
  'император',
  'императрица',
  'король',
  'королева',
  'герцог',
  'принц',
  'граф',
  'графиня',
  'барон',
  'баронесса',
  'боярин',
  'боярыня',
  'дьяк',
  'старец',
  'протопоп',
  'митрополит',
  'патриарх',
  'архиепископ',
  'епископ',
  'кардинал',
  'папа',
  'султан',
  'хан',
  'шах',
  'гетман',
  'атаман',
  'дож',
  'генерал',
  'генерал-фельдмаршал',
  'фельдмаршал',
  'адмирал',
  'вице-адмирал',
  'маршал',
  'канцлер',
  'академик',
  'профессор',
  'доктор',
  'брат',
  'братья',
]);

const NOBILIARY_PARTICLES = new Set(['фон', 'де', 'ла', 'ван', 'дер', 'да']);

const HONORIFIC_SURNAME_NORMALIZATIONS: Record<string, string> = {
  'потемкин-таврический': 'потемкин',
  'румянцев-задунайский': 'румянцев',
  'суворов-рымникский': 'суворов',
  'кутузов-смоленский': 'кутузов',
  'орлов-чесменский': 'орлов',
  'дибич-забалканский': 'дибич',
  'паскевич-эриванский': 'паскевич',
  'скобелев-белый': 'скобелев',
};

const PERSON_ALIAS_OVERRIDES: Record<string, { key: string; preferredDisplay?: string }> = {
  'в. и. ленин': { key: 'person:ленин|в.и.', preferredDisplay: 'В. И. Ленин' },
  'в. и. ульянов': { key: 'person:ленин|в.и.', preferredDisplay: 'В. И. Ленин' },
  'владимир ульянов': { key: 'person:ленин|в.и.', preferredDisplay: 'В. И. Ленин' },
  ленин: { key: 'person:ленин|в.и.', preferredDisplay: 'В. И. Ленин' },
  'и. в. сталин': { key: 'person:сталин|и.в.', preferredDisplay: 'И. В. Сталин' },
  'и. в. джугашвили': { key: 'person:сталин|и.в.', preferredDisplay: 'И. В. Сталин' },
  сталин: { key: 'person:сталин|и.в.', preferredDisplay: 'И. В. Сталин' },
  'м. горький': { key: 'person:горький|м.', preferredDisplay: 'Максим Горький' },
  'максим горький': { key: 'person:горький|м.', preferredDisplay: 'Максим Горький' },
  'а. м. пешков': { key: 'person:горький|м.', preferredDisplay: 'Максим Горький' },
  'м. е. салтыков-щедрин': {
    key: 'person:салтыков-щедрин|м.е.',
    preferredDisplay: 'М. Е. Салтыков-Щедрин',
  },
  'салтыков-щедрин': {
    key: 'person:салтыков-щедрин|м.е.',
    preferredDisplay: 'М. Е. Салтыков-Щедрин',
  },
  щедрин: { key: 'person:салтыков-щедрин|м.е.', preferredDisplay: 'М. Е. Салтыков-Щедрин' },
  'иван грозный': { key: 'monarch:иван iv', preferredDisplay: 'Иван IV Грозный' },
  'иван iv грозный': { key: 'monarch:иван iv', preferredDisplay: 'Иван IV Грозный' },
  'иван iv': { key: 'monarch:иван iv', preferredDisplay: 'Иван IV Грозный' },
  'петр великий': { key: 'monarch:петр i', preferredDisplay: 'Пётр I' },
  'петр i великий': { key: 'monarch:петр i', preferredDisplay: 'Пётр I' },
  'екатерина великая': { key: 'monarch:екатерина ii', preferredDisplay: 'Екатерина II' },
  'владимир всеволодович мономах': {
    key: 'medieval:владимир мономах',
    preferredDisplay: 'Владимир Мономах',
  },
  'владимир мономах': { key: 'medieval:владимир мономах', preferredDisplay: 'Владимир Мономах' },
  'ярослав мудрый': { key: 'medieval:ярослав мудрый', preferredDisplay: 'Ярослав Мудрый' },
  'олег вещий': { key: 'medieval:олег вещий', preferredDisplay: 'Олег Вещий' },
  'игорь рюрикович': { key: 'medieval:игорь рюрикович', preferredDisplay: 'Игорь Рюрикович' },
  'иван калита': { key: 'medieval:иван калита', preferredDisplay: 'Иван Калита' },
  'дмитрий донской': { key: 'medieval:дмитрий донской', preferredDisplay: 'Дмитрий Донской' },
  'александр невский': {
    key: 'medieval:александр невский',
    preferredDisplay: 'Александр Невский',
  },
  'алексей михайлович': {
    key: 'monarch:алексей михайлович',
    preferredDisplay: 'Алексей Михайлович',
  },
  'михаил федорович': { key: 'monarch:михаил федорович', preferredDisplay: 'Михаил Фёдорович' },
  'федор алексеевич': { key: 'monarch:федор алексеевич', preferredDisplay: 'Фёдор Алексеевич' },
  'борис годунов': { key: 'monarch:борис годунов', preferredDisplay: 'Борис Годунов' },
  'иван iii васильевич': { key: 'monarch:иван iii', preferredDisplay: 'Иван III' },
  'иван iii': { key: 'monarch:иван iii', preferredDisplay: 'Иван III' },
  'василий iii': { key: 'monarch:василий iii', preferredDisplay: 'Василий III' },
  'софья алексеевна': { key: 'monarch:софья алексеевна', preferredDisplay: 'Софья Алексеевна' },
  'елизавета петровна': {
    key: 'monarch:елизавета петровна',
    preferredDisplay: 'Елизавета Петровна',
  },
  'анна иоанновна': { key: 'monarch:анна иоанновна', preferredDisplay: 'Анна Иоанновна' },
  'елена васильевна глинская': {
    key: 'monarch:елена глинская',
    preferredDisplay: 'Елена Глинская',
  },
  'елена глинская': { key: 'monarch:елена глинская', preferredDisplay: 'Елена Глинская' },
  'аввакум петров': { key: 'person:аввакум петров', preferredDisplay: 'Протопоп Аввакум' },
  аввакум: { key: 'person:аввакум петров', preferredDisplay: 'Протопоп Аввакум' },
  'нестор летописец': { key: 'person:нестор летописец', preferredDisplay: 'Нестор Летописец' },
  нестор: { key: 'person:нестор летописец', preferredDisplay: 'Нестор Летописец' },
};

export function cleanPersonDisplay(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim() || raw.trim();
}

function normalizeTextForKey(raw: string): string {
  return raw
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[«»"']/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'Е')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface PreliminaryPersonParsed {
  preliminaryKey: string;
  surname: string;
  initials: string[];
  isMonarchOrAlias: boolean;
  preferredDisplay?: string;
}

export function extractPreliminaryPersonKey(raw: string): PreliminaryPersonParsed | null {
  const cleaned = normalizeTextForKey(raw);
  if (!cleaned) return null;

  const rawTokens = cleaned.split(' ').filter(Boolean);
  while (rawTokens.length > 1 && PERSON_TITLE_PREFIXES.has(rawTokens[0])) {
    rawTokens.shift();
  }
  const strippedPhrase = rawTokens.join(' ').replace(/\s*\.\s*/g, '. ').replace(/\s+/g, ' ').trim();
  const compactInitialPhrase = strippedPhrase
    .replace(/([а-яa-z])\.([а-яa-z])\./gi, '$1. $2.')
    .replace(/\s+/g, ' ')
    .trim();

  const aliasHit =
    PERSON_ALIAS_OVERRIDES[compactInitialPhrase] || PERSON_ALIAS_OVERRIDES[strippedPhrase];
  if (aliasHit) {
    return {
      preliminaryKey: aliasHit.key,
      surname: aliasHit.key,
      initials: [],
      isMonarchOrAlias: true,
      preferredDisplay: aliasHit.preferredDisplay,
    };
  }

  const romanIdx = rawTokens.findIndex((t) => /^[ivxlcdm]+$/i.test(t));
  if (romanIdx > 0) {
    const monarchBase = rawTokens.slice(0, romanIdx + 1).join(' ');
    return {
      preliminaryKey: `monarch:${monarchBase}`,
      surname: monarchBase,
      initials: [],
      isMonarchOrAlias: true,
    };
  }

  if (rawTokens.includes('и') || rawTokens.includes('общины')) {
    return {
      preliminaryKey: `group:${strippedPhrase}`,
      surname: strippedPhrase,
      initials: [],
      isMonarchOrAlias: true,
    };
  }

  const expandedTokens: string[] = [];
  rawTokens.forEach((tok) => {
    if (/^([а-яa-z]\.){2,}$/i.test(tok)) {
      const letters = tok.split('.').filter(Boolean);
      letters.forEach((l) => expandedTokens.push(`${l}.`));
    } else if (!NOBILIARY_PARTICLES.has(tok)) {
      expandedTokens.push(tok);
    }
  });

  if (expandedTokens.length === 0) return null;

  const isInitialToken = (t: string) => /^[а-яa-z]\.$/i.test(t) || /^[а-яa-z]$/i.test(t);

  if (
    expandedTokens.length >= 2 &&
    !isInitialToken(expandedTokens[0]) &&
    expandedTokens.slice(1).every(isInitialToken)
  ) {
    const rawSurname = expandedTokens[0].replace(/\.$/, '');
    const surname = HONORIFIC_SURNAME_NORMALIZATIONS[rawSurname] || rawSurname;
    const initials = expandedTokens.slice(1).map((t) => t.replace(/\.$/, '')[0]);
    return {
      preliminaryKey: `person:${surname}|${initials.join('.')}`,
      surname,
      initials,
      isMonarchOrAlias: false,
    };
  }

  const lastRaw = expandedTokens[expandedTokens.length - 1].replace(/\.$/, '');
  const surname = HONORIFIC_SURNAME_NORMALIZATIONS[lastRaw] || lastRaw;

  if (expandedTokens.length === 1) {
    return {
      preliminaryKey: `surname:${surname}`,
      surname,
      initials: [],
      isMonarchOrAlias: false,
    };
  }

  const headTokens = expandedTokens.slice(0, -1);
  const initials = headTokens
    .map((t) => t.replace(/\.$/, '')[0])
    .filter((ch): ch is string => Boolean(ch));

  return {
    preliminaryKey: `person:${surname}|${initials.join('.')}`,
    surname,
    initials,
    isMonarchOrAlias: false,
  };
}

function pickBestPersonDisplayName(variants: string[], preferred?: string): string {
  if (preferred) return preferred;
  const cleaned = variants.map(cleanPersonDisplay).filter(Boolean);
  if (cleaned.length === 0) return variants[0] || '';
  return cleaned.sort((a, b) => {
    const aHasHonorific = /-(таврический|задунайский|рымникский|смоленский|чесменский)/i.test(a);
    const bHasHonorific = /-(таврический|задунайский|рымникский|смоленский|чесменский)/i.test(b);
    if (aHasHonorific !== bHasHonorific) return aHasHonorific ? 1 : -1;
    const aHasInitials = /[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]?\.?/.test(a);
    const bHasInitials = /[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]?\.?/.test(b);
    if (aHasInitials !== bHasInitials) return aHasInitials ? -1 : 1;
    return a.length - b.length;
  })[0];
}

export function doesRawMatchPersonKey(raw: string, canonicalKey: string): boolean {
  const parsed = extractPreliminaryPersonKey(raw);
  if (!parsed) return false;
  if (parsed.preliminaryKey === canonicalKey) return true;
  if (!canonicalKey.startsWith('person:') || parsed.isMonarchOrAlias) return false;
  const [, targetBody] = canonicalKey.split(':');
  const [targetSurname, targetInitStr = ''] = targetBody.split('|');
  if (parsed.surname !== targetSurname) return false;
  if (parsed.initials.length === 0) return true;
  const parsedInitStr = parsed.initials.join('.');
  return targetInitStr.startsWith(parsedInitStr) || parsedInitStr.startsWith(targetInitStr);
}

interface DossierLookupIndex {
  exactVariantToKey: Map<string, string>;
  bySurname: Map<string, Array<{ key: string; targetInitStr: string }>>;
}

const dossierLookupIndexCache = new WeakMap<Map<string, PersonDossier>, DossierLookupIndex>();

function getOrBuildDossierLookupIndex(
  dossiers: Map<string, PersonDossier>,
): DossierLookupIndex {
  const cached = dossierLookupIndexCache.get(dossiers);
  if (cached) return cached;

  const exactVariantToKey = new Map<string, string>();
  const bySurname = new Map<string, Array<{ key: string; targetInitStr: string }>>();

  for (const [key, dossier] of dossiers.entries()) {
    for (let i = 0; i < dossier.variants.length; i++) {
      const variant = dossier.variants[i];
      if (!exactVariantToKey.has(variant)) {
        exactVariantToKey.set(variant, key);
      }
    }
    if (key.startsWith('person:')) {
      const targetBody = key.slice('person:'.length);
      const sepIdx = targetBody.indexOf('|');
      const targetSurname = sepIdx >= 0 ? targetBody.slice(0, sepIdx) : targetBody;
      const targetInitStr = sepIdx >= 0 ? targetBody.slice(sepIdx + 1) : '';
      let bucket = bySurname.get(targetSurname);
      if (!bucket) {
        bucket = [];
        bySurname.set(targetSurname, bucket);
      }
      bucket.push({ key, targetInitStr });
    }
  }

  const index: DossierLookupIndex = { exactVariantToKey, bySurname };
  dossierLookupIndexCache.set(dossiers, index);
  return index;
}

export function buildPersonDossierIndex(
  enrichedEvents: EnrichedEvent[],
  rulers: RulerPeriod[],
): {
  dossiers: Map<string, PersonDossier>;
  rawToKey: Map<string, string>;
} {
  const initialsBySurname = new Map<string, Set<string>>();
  const twoInitialsBySurnameFirst = new Map<string, Set<string>>();
  const parsedByRaw = new Map<string, PreliminaryPersonParsed | null>();

  const getParsed = (raw: string): PreliminaryPersonParsed | null => {
    if (parsedByRaw.has(raw)) {
      return parsedByRaw.get(raw) ?? null;
    }
    const parsed = extractPreliminaryPersonKey(raw);
    parsedByRaw.set(raw, parsed);
    return parsed;
  };

  enrichedEvents.forEach((ev) => {
    const figures = ev.keyFigures;
    if (!figures || figures.length === 0) return;
    for (let i = 0; i < figures.length; i++) {
      const parsed = getParsed(figures[i]);
      if (!parsed || parsed.isMonarchOrAlias || parsed.initials.length === 0) continue;
      const initKey = parsed.initials.join('.');
      let initSet = initialsBySurname.get(parsed.surname);
      if (!initSet) {
        initSet = new Set<string>();
        initialsBySurname.set(parsed.surname, initSet);
      }
      initSet.add(initKey);

      if (parsed.initials.length >= 2) {
        const prefixKey = `${parsed.surname}|${parsed.initials[0]}`;
        let twoSet = twoInitialsBySurnameFirst.get(prefixKey);
        if (!twoSet) {
          twoSet = new Set<string>();
          twoInitialsBySurnameFirst.set(prefixKey, twoSet);
        }
        twoSet.add(initKey);
      }
    }
  });

  const rawToKey = new Map<string, string>();
  const resolvedByRaw = new Map<string, { key: string; preferred?: string } | null>();

  const resolveCanonical = (raw: string): { key: string; preferred?: string } | null => {
    if (resolvedByRaw.has(raw)) {
      return resolvedByRaw.get(raw) ?? null;
    }
    const parsed = getParsed(raw);
    if (!parsed) {
      resolvedByRaw.set(raw, null);
      return null;
    }
    let result: { key: string; preferred?: string };
    if (parsed.isMonarchOrAlias) {
      result = { key: parsed.preliminaryKey, preferred: parsed.preferredDisplay };
    } else if (parsed.initials.length === 0) {
      const allForSurname = initialsBySurname.get(parsed.surname);
      if (allForSurname && allForSurname.size === 1) {
        const onlyInit = allForSurname.values().next().value as string;
        result = { key: `person:${parsed.surname}|${onlyInit}` };
      } else {
        result = { key: `surname:${parsed.surname}` };
      }
    } else if (parsed.initials.length === 1) {
      const prefixKey = `${parsed.surname}|${parsed.initials[0]}`;
      const twoInitMatches = twoInitialsBySurnameFirst.get(prefixKey);
      if (twoInitMatches && twoInitMatches.size === 1) {
        const onlyTwoInit = twoInitMatches.values().next().value as string;
        result = { key: `person:${parsed.surname}|${onlyTwoInit}` };
      } else {
        result = { key: `person:${parsed.surname}|${parsed.initials.join('.')}` };
      }
    } else {
      result = { key: `person:${parsed.surname}|${parsed.initials.join('.')}` };
    }
    resolvedByRaw.set(raw, result);
    return result;
  };

  interface Accumulator {
    variants: Set<string>;
    preferred?: string;
    eventsMap: Map<string, EnrichedEvent>;
    bioCard: EnrichedEvent | null;
  }

  const acc = new Map<string, Accumulator>();

  enrichedEvents.forEach((ev) => {
    const figures = ev.keyFigures;
    if (!figures || figures.length === 0) return;
    const isBio = isBiographyNode(ev);
    for (let idx = 0; idx < figures.length; idx++) {
      const raw = figures[idx];
      const res = resolveCanonical(raw);
      if (!res) continue;
      rawToKey.set(raw, res.key);

      let entry = acc.get(res.key);
      if (!entry) {
        entry = {
          variants: new Set<string>(),
          preferred: res.preferred,
          eventsMap: new Map<string, EnrichedEvent>(),
          bioCard: null,
        };
        acc.set(res.key, entry);
      }
      entry.variants.add(raw);
      entry.eventsMap.set(ev.id, ev);

      if (isBio && idx === 0 && !entry.bioCard) {
        entry.bioCard = ev;
      }
    }
  });

  const rulerById = new Map(rulers.map((r) => [r.id, r]));
  const dossiers = new Map<string, PersonDossier>();

  acc.forEach((entry, key) => {
    const events = Array.from(entry.eventsMap.values()).sort((a, b) => {
      if (a.startYear !== b.startYear) return a.startYear - b.startYear;
      return a.endYear - b.endYear;
    });
    const eventIds = new Set(events.map((e) => e.id));
    const variants = Array.from(entry.variants);
    const displayName = pickBestPersonDisplayName(variants, entry.preferred);

    const touchedRulerIds = new Set<string>();
    const branchCounts: Record<string, number> = {};
    let minYear = Infinity;
    let maxYear = -Infinity;

    events.forEach((ev) => {
      minYear = Math.min(minYear, ev.startYear);
      maxYear = Math.max(maxYear, ev.endYear);
      branchCounts[ev.task] = (branchCounts[ev.task] || 0) + 1;
      ev.overlappingRulers.forEach((r) => touchedRulerIds.add(r.id));
    });

    const personRulers = Array.from(touchedRulerIds)
      .map((id) => rulerById.get(id))
      .filter((r): r is RulerPeriod => Boolean(r))
      .sort((a, b) => a.startYear - b.startYear);

    dossiers.set(key, {
      key,
      displayName,
      variants,
      events,
      eventIds,
      bioCard: entry.bioCard,
      rulers: personRulers,
      yearRange: {
        min: Number.isFinite(minYear) ? minYear : 862,
        max: Number.isFinite(maxYear) ? maxYear : 2000,
      },
      branchCounts,
    });
  });

  return { dossiers, rawToKey };
}

export function resolvePersonKey(
  rawName: string,
  dossiers: Map<string, PersonDossier>,
  rawToKey?: Map<string, string>,
): string | null {
  if (dossiers.has(rawName)) return rawName;
  if (rawToKey && rawToKey.has(rawName)) {
    return rawToKey.get(rawName) ?? null;
  }

  const lookupIndex = getOrBuildDossierLookupIndex(dossiers);
  const exactVariantHit = lookupIndex.exactVariantToKey.get(rawName);
  if (exactVariantHit !== undefined) {
    return exactVariantHit;
  }

  const prelim = extractPreliminaryPersonKey(rawName);
  if (!prelim) return null;
  if (dossiers.has(prelim.preliminaryKey)) {
    return prelim.preliminaryKey;
  }

  if (prelim.isMonarchOrAlias) {
    return null;
  }

  const candidates = lookupIndex.bySurname.get(prelim.surname);
  if (!candidates || candidates.length === 0) return null;

  if (prelim.initials.length === 0) {
    return candidates[0].key;
  }

  const parsedInitStr = prelim.initials.join('.');
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (
      candidate.targetInitStr.startsWith(parsedInitStr) ||
      parsedInitStr.startsWith(candidate.targetInitStr)
    ) {
      return candidate.key;
    }
  }
  return null;
}

export function searchPersonDossiers(
  query: string,
  dossiers: Map<string, PersonDossier>,
  limit = 6,
): PersonDossier[] {
  const q = query.trim().toLowerCase().replace(/ё/g, 'е');
  if (q.length < 2) return [];

  const matches: Array<{ dossier: PersonDossier; score: number }> = [];
  dossiers.forEach((dossier) => {
    const dispNorm = dossier.displayName.toLowerCase().replace(/ё/g, 'е');
    const variantsNorm = dossier.variants.map((v) => v.toLowerCase().replace(/ё/g, 'е'));

    let score = 0;
    if (dispNorm.startsWith(q)) score += 30;
    else if (dispNorm.includes(q)) score += 20;
    else if (variantsNorm.some((v) => v.includes(q))) score += 15;
    else if (dossier.key.includes(q)) score += 10;

    if (score > 0) {
      score += Math.min(dossier.events.length, 15);
      if (dossier.bioCard) score += 4;
      matches.push({ dossier, score });
    }
  });

  return matches
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.dossier.events.length - a.dossier.events.length;
    })
    .slice(0, limit)
    .map((m) => m.dossier);
}
