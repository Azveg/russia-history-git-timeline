import type {
  BranchDefinition,
  CampaignPackRegistryEntry,
  EnrichedEvent,
  PersonDossier,
  ResolvedMacroEra,
  RulerPeriod,
} from '../../types/timeline';

export type CommandSearchCategory = 'eras' | 'rulers' | 'events' | 'people' | 'campaigns';

export interface CommandSearchItem {
  id: string;
  category: CommandSearchCategory;
  title: string;
  subtitle: string;
  meta: string;
  targetId: string;
  yearSort: number;
  searchTitleNorm: string;
  searchFullNorm: string;
  yearsText: string;
}

export interface CommandSearchIndex {
  items: CommandSearchItem[];
  byCategory: Record<CommandSearchCategory, CommandSearchItem[]>;
}

export interface CommandSearchGroup {
  category: CommandSearchCategory;
  label: string;
  items: CommandSearchItem[];
  totalMatches: number;
}

export const COMMAND_SEARCH_CATEGORY_LABELS: Record<CommandSearchCategory, string> = {
  eras: 'Эпохи',
  rulers: 'Правители',
  events: 'События и вехи',
  people: 'Исторические деятели',
  campaigns: 'Военные кампании',
};

const CATEGORY_ORDER: CommandSearchCategory[] = [
  'eras',
  'rulers',
  'campaigns',
  'events',
  'people',
];

function normalizeText(value: string | undefined | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCommandSearchIndex(params: {
  eras: ResolvedMacroEra[];
  rulers: RulerPeriod[];
  events: EnrichedEvent[];
  personDossiers: Map<string, PersonDossier>;
  campaignPacks: CampaignPackRegistryEntry[];
  branches: BranchDefinition[];
}): CommandSearchIndex {
  const { eras, rulers, events, personDossiers, campaignPacks, branches } = params;
  const branchLabelById = new Map(branches.map((b) => [b.id, b.label]));

  const byCategory: Record<CommandSearchCategory, CommandSearchItem[]> = {
    eras: [],
    rulers: [],
    events: [],
    people: [],
    campaigns: [],
  };

  for (const era of eras) {
    const title = era.title;
    const yearsText = `${era.startYear} ${era.endYear} ${era.period}`;
    const item: CommandSearchItem = {
      id: `era:${era.id}`,
      category: 'eras',
      title,
      subtitle: era.thesis || era.displayShortTitle,
      meta: era.period,
      targetId: era.id,
      yearSort: era.startYear,
      searchTitleNorm: normalizeText(`${title} ${era.displayShortTitle}`),
      searchFullNorm: normalizeText(`${title} ${era.displayShortTitle} ${era.thesis} ${yearsText}`),
      yearsText,
    };
    byCategory.eras.push(item);
  }

  for (const ruler of rulers) {
    const yearsText = `${ruler.startYear} ${ruler.endYear} ${ruler.reignPeriod}`;
    const item: CommandSearchItem = {
      id: `ruler:${ruler.id}`,
      category: 'rulers',
      title: ruler.ruler,
      subtitle: ruler.reignThesis || ruler.center || 'Правление',
      meta: ruler.reignPeriod,
      targetId: ruler.id,
      yearSort: ruler.startYear,
      searchTitleNorm: normalizeText(`${ruler.ruler} ${ruler.shortRuler}`),
      searchFullNorm: normalizeText(
        `${ruler.ruler} ${ruler.shortRuler} ${ruler.reignThesis} ${ruler.center ?? ''} ${yearsText}`,
      ),
      yearsText,
    };
    byCategory.rulers.push(item);
  }

  for (const pack of campaignPacks) {
    const periodText = `${pack.yearFrom}–${pack.yearTo}`;
    const yearsText = `${pack.yearFrom} ${pack.yearTo} ${periodText}`;
    const item: CommandSearchItem = {
      id: `campaign:${pack.id}`,
      category: 'campaigns',
      title: pack.title,
      subtitle: pack.description,
      meta: `${periodText} · ${pack.branchIds.length} веток`,
      targetId: pack.id,
      yearSort: pack.yearFrom,
      searchTitleNorm: normalizeText(`${pack.title} ${pack.shortTitle ?? ''}`),
      searchFullNorm: normalizeText(
        `${pack.title} ${pack.shortTitle ?? ''} ${pack.description} ${yearsText} кампания фронт`,
      ),
      yearsText,
    };
    byCategory.campaigns.push(item);
  }

  for (const ev of events) {
    const branchLabel = branchLabelById.get(ev.task) ?? ev.task;
    const yearsText = `${ev.startYear} ${ev.endYear} ${ev.period}`;
    const figuresText = (ev.keyFigures ?? []).join(' ');
    const item: CommandSearchItem = {
      id: `event:${ev.id}`,
      category: 'events',
      title: ev.title,
      subtitle: ev.subtitle || branchLabel,
      meta: `${ev.period} · ${branchLabel}`,
      targetId: ev.id,
      yearSort: ev.startYear,
      searchTitleNorm: normalizeText(ev.title),
      searchFullNorm: normalizeText(
        `${ev.title} ${ev.subtitle} ${branchLabel} ${ev.region} ${ev.ruler} ${figuresText} ${yearsText}`,
      ),
      yearsText,
    };
    byCategory.events.push(item);
  }

  personDossiers.forEach((dossier) => {
    const minY = dossier.yearRange?.min;
    const maxY = dossier.yearRange?.max;
    const spanText = minY && maxY ? `${minY}–${maxY}` : '';
    const yearsText = `${minY ?? ''} ${maxY ?? ''} ${spanText}`;
    const roleHint =
      dossier.bioCard?.subtitle ||
      (dossier.rulers.length > 0 ? `Эпоха: ${dossier.rulers.slice(0, 2).map((r) => r.shortRuler).join(', ')}` : 'Исторический деятель');
    const variantsText = (dossier.variants ?? []).join(' ');
    const item: CommandSearchItem = {
      id: `person:${dossier.key}`,
      category: 'people',
      title: dossier.displayName,
      subtitle: roleHint,
      meta: `${spanText ? `${spanText} · ` : ''}${dossier.events.length} соб.`,
      targetId: dossier.key,
      yearSort: minY || 0,
      searchTitleNorm: normalizeText(`${dossier.displayName} ${dossier.key} ${variantsText}`),
      searchFullNorm: normalizeText(
        `${dossier.displayName} ${variantsText} ${roleHint} ${yearsText}`,
      ),
      yearsText,
    };
    byCategory.people.push(item);
  });

  const items: CommandSearchItem[] = [
    ...byCategory.eras,
    ...byCategory.rulers,
    ...byCategory.campaigns,
    ...byCategory.events,
    ...byCategory.people,
  ];

  return { items, byCategory };
}

function scoreCommandItem(item: CommandSearchItem, tokens: string[], normQuery: string): number {
  let score = 0;

  // All tokens must match somewhere in searchFullNorm
  for (let i = 0; i < tokens.length; i += 1) {
    if (!item.searchFullNorm.includes(tokens[i])) {
      return 0;
    }
  }

  if (item.searchTitleNorm === normQuery) {
    score += 120;
  } else if (item.searchTitleNorm.startsWith(normQuery)) {
    score += 90;
  } else if (item.searchTitleNorm.includes(normQuery)) {
    score += 65;
  }

  // Exact 3-4 digit year match boost
  if (/^\d{3,4}$/.test(normQuery) && item.yearsText.includes(normQuery)) {
    score += 55;
  }

  // Token-level title matches
  let titleHits = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    if (item.searchTitleNorm.includes(tokens[i])) {
      titleHits += 1;
    }
  }
  score += titleHits * 20;

  return Math.max(1, score);
}

export function searchCommandIndex(
  index: CommandSearchIndex,
  rawQuery: string,
  options?: {
    limitPerGroup?: number;
    categoryFilter?: CommandSearchCategory | 'all';
  },
): CommandSearchGroup[] {
  const limitPerGroup = options?.limitPerGroup ?? 6;
  const categoryFilter = options?.categoryFilter ?? 'all';
  const normQuery = normalizeText(rawQuery);
  const categories =
    categoryFilter === 'all' ? CATEGORY_ORDER : [categoryFilter];

  if (!normQuery) {
    // Default overview when palette opens empty: eras, campaigns, key rulers
    const groups: CommandSearchGroup[] = [];
    for (const cat of categories) {
      const pool = index.byCategory[cat];
      if (!pool || pool.length === 0) continue;
      if (categoryFilter === 'all' && (cat === 'events' || cat === 'people')) {
        continue;
      }
      groups.push({
        category: cat,
        label: COMMAND_SEARCH_CATEGORY_LABELS[cat],
        items: pool.slice(0, limitPerGroup),
        totalMatches: pool.length,
      });
    }
    return groups;
  }

  const tokens = normQuery.split(' ').filter(Boolean);
  const groups: CommandSearchGroup[] = [];

  for (const cat of categories) {
    const pool = index.byCategory[cat];
    if (!pool || pool.length === 0) continue;

    const scored: Array<{ item: CommandSearchItem; score: number }> = [];
    for (let i = 0; i < pool.length; i += 1) {
      const item = pool[i];
      const s = scoreCommandItem(item, tokens, normQuery);
      if (s > 0) {
        scored.push({ item, score: s });
      }
    }

    if (scored.length === 0) continue;

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.yearSort - b.item.yearSort;
    });

    groups.push({
      category: cat,
      label: COMMAND_SEARCH_CATEGORY_LABELS[cat],
      items: scored.slice(0, limitPerGroup).map((x) => x.item),
      totalMatches: scored.length,
    });
  }

  return groups;
}
