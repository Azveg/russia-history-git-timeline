import type {
  CustomWindowSummaryData,
  MacroEraSummaryData,
  RulerPeriodSummaryData,
} from '../engine/analytics/periodAnalytics';
import { ERA_SPHERE_META, ERA_SPHERE_ORDER } from '../engine/analytics/periodAnalytics';
import {
  formatCalendarDetailBadge,
  isBiographyNode,
  isLiteraryWorkNode,
  isScienceDiscoveryNode,
} from '../engine/calendar/jdnCalendar';
import type {
  BranchDefinition,
  EnrichedEvent,
  EraFigureGroupId,
  PeriodComparisonReport,
  PersonDossier,
  ResolvedMacroEra,
  SourceEntry,
} from '../types/timeline';
import {
  SOURCE_TYPE_LABELS,
  aggregatePersonSources,
  buildCanonicalDeepLink,
  formatBibTeXCitation,
  formatGostCitation,
  type CitationTarget,
} from './citation';

export interface MarkdownExportPayload {
  filename: string;
  content: string;
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  war: 'Военная кампания',
  treaty: 'Дипломатический договор',
  reform: 'Государственная реформа',
  economy: 'Экономика и финансы',
  crisis: 'Политический / социальный кризис',
  culture: 'Культура и мысль',
  biography: 'Биография (лицо эпохи)',
  book: 'Литературное произведение',
  science: 'Научное открытие / институт',
  world: 'Мировой контекст',
};

const FIGURE_GROUP_LABELS: Record<EraFigureGroupId, string> = {
  rulers: 'Правители',
  politics_military: 'Политика и армия',
  writers: 'Писатели и культура',
  scientists: 'Учёные и инженеры',
};

const FIGURE_GROUP_ORDER: EraFigureGroupId[] = [
  'rulers',
  'politics_military',
  'writers',
  'scientists',
];

const RELATION_TYPE_LABELS: Record<string, string> = {
  ally: 'Соратник / союзник',
  opponent: 'Противник / оппонент',
  diplomacy: 'Дипломатия',
  family: 'Семья и династия',
  military: 'Военачальник',
};

function transliterateSlug(input: string): string {
  let out = '';
  const lower = input.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i];
    if (CYRILLIC_TO_LATIN[ch] !== undefined) {
      out += CYRILLIC_TO_LATIN[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else {
      out += '-';
    }
  }
  return out
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

export function sanitizeMarkdownFilename(rawName: string): string {
  const withoutExt = rawName.trim().replace(/\.md$/i, '');
  const slug = transliterateSlug(withoutExt);
  return `${slug || 'historical-atlas-export'}.md`;
}

export function downloadMarkdownFile(filename: string, content: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return false;
  }
  try {
    const safeName = sanitizeMarkdownFilename(filename);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = safeName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
    return true;
  } catch {
    return false;
  }
}

function escapeTableCell(value: string | number | null | undefined): string {
  return String(value ?? '—')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function appendSourcesAndCitation(
  lines: string[],
  sources: SourceEntry[] | undefined,
  citationTarget?: CitationTarget,
  now: Date = new Date(),
): void {
  const hasSources = Boolean(sources && sources.length > 0);
  if (!hasSources && !citationTarget) return;

  lines.push('## Источники и библиография');
  lines.push('');

  if (hasSources && sources) {
    sources.forEach((src) => {
      const typeLabel = SOURCE_TYPE_LABELS[src.type] ?? src.type;
      const notePart = src.note ? ` — ${src.note}` : '';
      const urlPart = src.url ? ` ([ссылка](${src.url}))` : '';
      lines.push(`- **${typeLabel}:** ${src.citation}${notePart}${urlPart}`);
    });
    lines.push('');
  }

  if (citationTarget) {
    const gost = formatGostCitation(citationTarget, now);
    const bibtex = formatBibTeXCitation(citationTarget, now);
    const deepLink = buildCanonicalDeepLink(citationTarget.kind, citationTarget.id);
    lines.push(`**Ссылка (ГОСТ Р 7.0.100–2018):** ${gost}`);
    lines.push('');
    lines.push(`**Постоянный адрес:** ${deepLink}`);
    lines.push('');
    lines.push('```bibtex');
    lines.push(bibtex);
    lines.push('```');
    lines.push('');
  }
}

function formatBranchLabelMap(branches: BranchDefinition[]): Map<string, string> {
  return new Map(branches.map((b) => [b.id, b.label]));
}

export interface CardMarkdownOptions {
  card: EnrichedEvent;
  branch?: BranchDefinition | null;
  parentBranch?: BranchDefinition | null;
  era?: ResolvedMacroEra | null;
  branches: BranchDefinition[];
  allEventsById?: Map<string, EnrichedEvent>;
  now?: Date;
}

export function formatCardToMarkdown({
  card,
  branch,
  parentBranch,
  era,
  branches,
  allEventsById,
  now = new Date(),
}: CardMarkdownOptions): MarkdownExportPayload {
  const branchLabels = formatBranchLabelMap(branches);
  const resolvedBranchLabel = branch?.label ?? branchLabels.get(card.task) ?? card.task;
  const fullBranchLabel = parentBranch
    ? `${parentBranch.short} · ${resolvedBranchLabel}`
    : resolvedBranchLabel;

  const isBio = isBiographyNode(card);
  const isWork = isLiteraryWorkNode(card);
  const isDiscovery = isScienceDiscoveryNode(card);

  const lines: string[] = [];
  lines.push(`# ${card.title}`);
  lines.push('');

  if (card.subtitle) {
    lines.push(`> ${card.subtitle}`);
    lines.push('');
  }

  lines.push('## Паспорт');
  lines.push('');
  lines.push(`- **${isBio ? 'Годы жизни' : 'Период'}:** ${card.period}`);
  if (isBio && card.activeFrom && card.activeTo) {
    lines.push(`- **Годы активности:** ${card.activeFrom}–${card.activeTo} гг.`);
  }
  if (card.startPrecision.precision !== 'year' || card.endPrecision.precision !== 'year') {
    const startBadge = formatCalendarDetailBadge(card.startPrecision);
    const endBadge =
      card.endPrecision.precision !== 'year'
        ? formatCalendarDetailBadge(card.endPrecision)
        : null;
    const dateRangeStr =
      endBadge && endBadge.primaryText !== startBadge.primaryText
        ? `${startBadge.primaryText} — ${endBadge.primaryText}`
        : startBadge.primaryText;
    const styleParts = [
      startBadge.styleLabel,
      startBadge.counterpartText,
      startBadge.offsetNote,
    ].filter(Boolean);
    lines.push(
      `- **Уточнённая датировка:** ${dateRangeStr}${styleParts.length > 0 ? ` (${styleParts.join(' · ')})` : ''}`,
    );
  }
  lines.push(`- **Ветка:** ${fullBranchLabel}`);
  if (card.eventType) {
    lines.push(`- **Категория:** ${EVENT_TYPE_LABELS[card.eventType] ?? card.eventType}`);
  } else if (isDiscovery) {
    lines.push('- **Категория:** Научное открытие / институт');
  } else if (isWork) {
    lines.push('- **Категория:** Литературное произведение');
  } else if (isBio) {
    lines.push('- **Категория:** Биография (лицо эпохи)');
  }
  if (era) {
    lines.push(`- **Макро-период:** ${era.title} (${era.period})`);
  } else if (card.eraTitle) {
    lines.push(`- **Макро-период:** ${card.eraTitle}`);
  }
  if (card.overlappingRulers.length > 0) {
    const rulersStr = card.overlappingRulers
      .map((r) => `${r.ruler} (${r.reignPeriod})`)
      .join('; ');
    lines.push(`- **Правление:** ${rulersStr}`);
  } else if (card.ruler) {
    lines.push(`- **Правление:** ${card.ruler}${card.reignPeriod ? ` (${card.reignPeriod})` : ''}`);
  }
  if (card.region) {
    lines.push(`- **Регион / пространство:** ${card.region}`);
  }
  if (card.duration > 0) {
    lines.push(`- **Длительность:** ${card.duration} л.`);
  }
  lines.push('');

  if (card.prerequisitesList.length > 0) {
    lines.push('## Предпосылки');
    lines.push('');
    card.prerequisitesList.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  if (card.details) {
    lines.push('## Суть и исторический контекст');
    lines.push('');
    lines.push(card.details);
    lines.push('');
  }

  if (card.operationProfile) {
    const op = card.operationProfile;
    lines.push('## Операционный паспорт');
    lines.push('');
    if (op.theater) lines.push(`- **Театр действий:** ${op.theater}`);
    if (op.strategicObjective) lines.push(`- **Стратегическая цель:** ${op.strategicObjective}`);
    if (op.resultSummary) lines.push(`- **Оперативный итог:** ${op.resultSummary}`);
    if (op.belligerents.length > 0) {
      lines.push('');
      lines.push('### Стороны и командование');
      lines.push('');
      op.belligerents.forEach((b) => {
        const parts: string[] = [`**${b.side}**`];
        if (b.commanders.length > 0) parts.push(`командующие: ${b.commanders.join(', ')}`);
        if (b.forces) parts.push(`силы: ${b.forces}`);
        if (b.casualties) parts.push(`потери: ${b.casualties}`);
        lines.push(`- ${parts.join(' · ')}`);
      });
    }
    if (op.turningPoints && op.turningPoints.length > 0) {
      lines.push('');
      lines.push('### Переломные рубежи');
      lines.push('');
      op.turningPoints.forEach((tp) => lines.push(`- ${tp}`));
    }
    if (op.historiographyNote) {
      lines.push('');
      lines.push(`*Историографическая заметка:* ${op.historiographyNote}`);
    }
    lines.push('');
  }

  if (card.literaryProfile) {
    const lp = card.literaryProfile;
    lines.push('## Литературный профиль');
    lines.push('');
    if (lp.genre) lines.push(`- **Жанр:** ${lp.genre}`);
    if (lp.movement) lines.push(`- **Направление:** ${lp.movement}`);
    if (lp.themes) lines.push(`- **Ключевые темы:** ${lp.themes}`);
    if (lp.publicationFate) lines.push(`- **Судьба публикации:** ${lp.publicationFate}`);
    if (lp.culturalImpact) lines.push(`- **Культурное влияние:** ${lp.culturalImpact}`);
    if (lp.majorWorks && lp.majorWorks.length > 0) {
      lines.push(`- **Основные произведения:** ${lp.majorWorks.join('; ')}`);
    }
    lines.push('');
  }

  if (card.subEvents && card.subEvents.length > 0) {
    lines.push('## Ключевые этапы и вехи');
    lines.push('');
    card.subEvents.forEach((se) => {
      const datePrefix = se.dateLabel || (se.year !== undefined ? String(se.year) : '');
      const heading = datePrefix ? `**${datePrefix} — ${se.title}:**` : `**${se.title}:**`;
      const body = se.text || se.description || '';
      lines.push(`- ${heading}${body ? ` ${body}` : ''}`);
    });
    lines.push('');
  }

  if (card.outcomesByScope?.russia || card.outcomesByScope?.world || card.outcome) {
    lines.push('## Итоги и последствия');
    lines.push('');
    if (card.outcomesByScope?.russia) {
      lines.push('### Для России');
      lines.push('');
      lines.push(card.outcomesByScope.russia);
      lines.push('');
    }
    if (card.outcomesByScope?.world) {
      lines.push('### Для мира');
      lines.push('');
      lines.push(card.outcomesByScope.world);
      lines.push('');
    }
    if (
      card.outcome &&
      card.outcome !== card.outcomesByScope?.russia &&
      card.outcome !== card.outcomesByScope?.world
    ) {
      if (card.outcomesByScope?.russia || card.outcomesByScope?.world) {
        lines.push('### Общий итог');
        lines.push('');
      }
      lines.push(card.outcome);
      lines.push('');
    }
  }

  if (card.keyFigures && card.keyFigures.length > 0) {
    lines.push('## Ключевые деятели');
    lines.push('');
    lines.push(card.keyFigures.join(', '));
    lines.push('');
  }

  const totalLinks = card.explicitLinks.length + card.retrospectiveLinks.length;
  if (totalLinks > 0) {
    lines.push(`## Связи (${totalLinks})`);
    lines.push('');
    card.explicitLinks.forEach((link) => {
      const target = link.targetEvent ?? allEventsById?.get(link.otherId);
      const arrow = link.direction === 'incoming' ? '←' : '→';
      const targetTitle = target ? `${target.title} (${target.period})` : link.otherId;
      const targetBranch = target ? ` · ${branchLabels.get(target.task) ?? target.task}` : '';
      lines.push(`- ${arrow} **${targetTitle}**${targetBranch} — ${link.label}`);
    });
    card.retrospectiveLinks.forEach((rLink) => {
      const target = allEventsById?.get(rLink.otherId);
      const arrow = rLink.direction === 'depicts' ? '←' : '→';
      const targetTitle = target ? `${target.title} (${target.period})` : rLink.otherId;
      lines.push(`- ${arrow} **${targetTitle}** (отражение, дистанция ${rLink.yearGap} л.) — ${rLink.label}`);
    });
    lines.push('');
  }

  if (card.concurrentEvents.length > 0) {
    lines.push(`## Синхронные события (${card.concurrentEvents.length})`);
    lines.push('');
    card.concurrentEvents.forEach((ev) => {
      const bLabel = branchLabels.get(ev.task) ?? ev.task;
      lines.push(`- **${ev.period}** — ${ev.title} (${bLabel})`);
    });
    lines.push('');
  }

  appendSourcesAndCitation(
    lines,
    card.sources,
    {
      kind: 'card',
      id: card.id,
      title: card.title,
      period: card.period,
      sectionLabel: `раздел «${fullBranchLabel}»`,
    },
    now,
  );

  return {
    filename: sanitizeMarkdownFilename(`${card.id}-${card.title}`),
    content: `${lines.join('\n').trim()}\n`,
  };
}

export function formatRulerDossierToMarkdown(
  summary: RulerPeriodSummaryData,
  branches: BranchDefinition[],
  now: Date = new Date(),
): MarkdownExportPayload {
  const { ruler } = summary;
  const branchLabels = formatBranchLabelMap(branches);
  const lines: string[] = [];

  lines.push(`# ${ruler.ruler} (${ruler.reignPeriod})`);
  lines.push('');
  if (ruler.reignTitle && ruler.reignTitle !== ruler.ruler) {
    lines.push(`> ${ruler.reignTitle}`);
    lines.push('');
  }

  lines.push('## Паспорт правления');
  lines.push('');
  lines.push(`- **Годы правления:** ${ruler.reignPeriod}`);
  if (ruler.lifeYears) lines.push(`- **Годы жизни:** ${ruler.lifeYears}`);
  if (ruler.dynastyOrTitle) lines.push(`- **Династия / титул:** ${ruler.dynastyOrTitle}`);
  if (ruler.center) lines.push(`- **Политический центр:** ${ruler.center}`);
  lines.push(
    `- **Событий в период правления:** ${summary.reignEvents.length} (начато в правление: ${summary.startedInReign.length}, унаследовано: ${summary.inheritedEvents.length}, перешло дальше: ${summary.carryOverEvents.length})`,
  );
  lines.push('');

  if (ruler.reignThesis) {
    lines.push('## Главная характеристика правления');
    lines.push('');
    lines.push(ruler.reignThesis);
    lines.push('');
  }

  if (ruler.biography) {
    lines.push('## Биографическая справка');
    lines.push('');
    lines.push(ruler.biography);
    lines.push('');
  }

  if (summary.resolvedKeyActions.length > 0) {
    lines.push('## Ключевые деяния и вехи');
    lines.push('');
    summary.resolvedKeyActions.forEach((act) => {
      lines.push(`- **${act.year} — ${act.title}:** ${act.summary}`);
    });
    lines.push('');
  }

  if (ruler.legacy) {
    lines.push('## Историческое наследие');
    lines.push('');
    lines.push(ruler.legacy);
    lines.push('');
  }

  if (summary.resolvedInnerCircle.length > 0) {
    lines.push(`## Ближайшее окружение и современники (${summary.resolvedInnerCircle.length})`);
    lines.push('');
    summary.resolvedInnerCircle.forEach((m) => {
      const rel = RELATION_TYPE_LABELS[m.relationType] ?? m.relationType;
      lines.push(`- **${m.name}** (${rel}) — ${m.role}`);
    });
    lines.push('');
  }

  if (summary.resolvedFamily.length > 0) {
    lines.push('## Династические и родственные связи');
    lines.push('');
    summary.resolvedFamily.forEach((rel) => {
      const notePart = rel.note ? ` — ${rel.note}` : '';
      lines.push(`- **${rel.relation}:** ${rel.name}${notePart}`);
    });
    lines.push('');
  }

  if (summary.reignEvents.length > 0) {
    lines.push(`## События правления (${summary.reignEvents.length})`);
    lines.push('');
    summary.reignEvents.forEach((ev) => {
      const bLabel = branchLabels.get(ev.task) ?? ev.task;
      lines.push(`- **${ev.period}** — **${ev.title}** (${bLabel})${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
    });
    lines.push('');
  }

  if (
    summary.discoveriesInPeriod.length > 0 ||
    summary.worksWrittenInPeriod.length > 0 ||
    summary.worksAboutPeriod.length > 0
  ) {
    lines.push('## Культура, наука и отражение в искусстве');
    lines.push('');
    if (summary.discoveriesInPeriod.length > 0) {
      lines.push('### Научные открытия и институты');
      lines.push('');
      summary.discoveriesInPeriod.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title}${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
      });
      lines.push('');
    }
    if (summary.worksWrittenInPeriod.length > 0) {
      lines.push('### Произведения эпохи');
      lines.push('');
      summary.worksWrittenInPeriod.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title}${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
      });
      lines.push('');
    }
    if (summary.worksAboutPeriod.length > 0) {
      lines.push('### Произведения, посвящённые этому правлению');
      lines.push('');
      summary.worksAboutPeriod.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title}${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
      });
      lines.push('');
    }
  }

  if (summary.crossBranchLinks.length > 0) {
    lines.push(`## Межветочные связи (${summary.crossBranchLinks.length})`);
    lines.push('');
    summary.crossBranchLinks.slice(0, 40).forEach((lnk) => {
      const arrow = lnk.isDirectional ? '→' : '↔';
      lines.push(
        `- **${lnk.fromEvent.title}** (${lnk.branchALabel}) ${arrow} **${lnk.toEvent.title}** (${lnk.branchBLabel}) — ${lnk.description}`,
      );
    });
    if (summary.crossBranchLinks.length > 40) {
      lines.push(`- *…и ещё ${summary.crossBranchLinks.length - 40} связей.*`);
    }
    lines.push('');
  }

  appendSourcesAndCitation(
    lines,
    ruler.sources,
    {
      kind: 'ruler',
      id: ruler.id,
      title: ruler.reignTitle,
      period: ruler.reignPeriod,
      sectionLabel: 'досье правителя',
    },
    now,
  );

  return {
    filename: sanitizeMarkdownFilename(`ruler-${ruler.id}-${ruler.shortRuler}`),
    content: `${lines.join('\n').trim()}\n`,
  };
}

function appendSpheresAndFiguresMarkdown(
  lines: string[],
  options: {
    sphereSummaries: MacroEraSummaryData['sphereSummaries'];
    figuresByGroup: Record<EraFigureGroupId, MacroEraSummaryData['eraFigures']>;
    carryOverInEvents: EnrichedEvent[];
    carryOverOutEvents: EnrichedEvent[];
    discoveriesInPeriod: EnrichedEvent[];
    literaryWorksInPeriod: EnrichedEvent[];
    cultureEventsInPeriod: EnrichedEvent[];
    worksAboutPeriod: EnrichedEvent[];
    branchLabels: Map<string, string>;
  },
): void {
  const {
    sphereSummaries,
    figuresByGroup,
    carryOverInEvents,
    carryOverOutEvents,
    discoveriesInPeriod,
    literaryWorksInPeriod,
    cultureEventsInPeriod,
    worksAboutPeriod,
    branchLabels,
  } = options;

  if (carryOverInEvents.length > 0 || carryOverOutEvents.length > 0) {
    lines.push('## Переходящие процессы');
    lines.push('');
    if (carryOverInEvents.length > 0) {
      lines.push(`### Унаследовано из предшествующего времени (${carryOverInEvents.length})`);
      lines.push('');
      carryOverInEvents.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title} (${branchLabels.get(ev.task) ?? ev.task})`);
      });
      lines.push('');
    }
    if (carryOverOutEvents.length > 0) {
      lines.push(`### Продолжилось за границей периода (${carryOverOutEvents.length})`);
      lines.push('');
      carryOverOutEvents.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title} (${branchLabels.get(ev.task) ?? ev.task})`);
      });
      lines.push('');
    }
  }

  const totalFigures = FIGURE_GROUP_ORDER.reduce(
    (acc, g) => acc + (figuresByGroup[g]?.length ?? 0),
    0,
  );
  if (totalFigures > 0) {
    lines.push(`## Ключевые лица (${totalFigures})`);
    lines.push('');
    FIGURE_GROUP_ORDER.forEach((groupId) => {
      const list = figuresByGroup[groupId] ?? [];
      if (list.length === 0) return;
      lines.push(`### ${FIGURE_GROUP_LABELS[groupId]} (${list.length})`);
      lines.push('');
      list.forEach((fig) => {
        const desc = fig.description ? ` — ${fig.description}` : '';
        lines.push(`- **${fig.name}** (${fig.period}) · ${fig.roleLabel}${desc}`);
      });
      lines.push('');
    });
  }

  if (sphereSummaries.some((s) => s.events.length > 0)) {
    lines.push('## События по сферам');
    lines.push('');
    sphereSummaries.forEach((sphere) => {
      if (sphere.events.length === 0) return;
      lines.push(`### ${sphere.label} (${sphere.events.length})`);
      lines.push('');
      sphere.events.forEach((ev) => {
        const bLabel = branchLabels.get(ev.task) ?? ev.task;
        lines.push(`- **${ev.period}** — **${ev.title}** (${bLabel})${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
      });
      lines.push('');
    });
  }

  if (
    discoveriesInPeriod.length > 0 ||
    literaryWorksInPeriod.length > 0 ||
    cultureEventsInPeriod.length > 0 ||
    worksAboutPeriod.length > 0
  ) {
    lines.push('## Культура и наука');
    lines.push('');
    if (discoveriesInPeriod.length > 0) {
      lines.push(`### Наука и открытия (${discoveriesInPeriod.length})`);
      lines.push('');
      discoveriesInPeriod.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title}${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
      });
      lines.push('');
    }
    if (literaryWorksInPeriod.length > 0) {
      lines.push(`### Литература (${literaryWorksInPeriod.length})`);
      lines.push('');
      literaryWorksInPeriod.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title}${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
      });
      lines.push('');
    }
    if (cultureEventsInPeriod.length > 0) {
      lines.push(`### Культурные и общественные процессы (${cultureEventsInPeriod.length})`);
      lines.push('');
      cultureEventsInPeriod.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title}${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
      });
      lines.push('');
    }
    if (worksAboutPeriod.length > 0) {
      lines.push(`### Образ периода в искусстве (${worksAboutPeriod.length})`);
      lines.push('');
      worksAboutPeriod.forEach((ev) => {
        lines.push(`- **${ev.period}** — ${ev.title}${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
      });
      lines.push('');
    }
  }
}

export function formatEraDossierToMarkdown(
  summary: MacroEraSummaryData,
  branches: BranchDefinition[],
  options?: { includeCampaignDetails?: boolean; now?: Date },
): MarkdownExportPayload {
  const { era } = summary;
  const branchLabels = formatBranchLabelMap(branches);
  const lines: string[] = [];

  lines.push(`# ${era.title} (${era.period})`);
  lines.push('');
  if (era.thesis) {
    lines.push(`> ${era.thesis}`);
    lines.push('');
  }

  lines.push('## Сводка макро-периода');
  lines.push('');
  lines.push(`- **Хронологические границы:** ${era.period} (${summary.totalDurationYears} л.)`);
  lines.push(`- **Правителей в эпохе:** ${summary.eraRulers.length}`);
  lines.push(`- **Исторических событий:** ${summary.eraSphereEvents.length}`);
  lines.push(`- **Узловых связей:** ${summary.totalSyncLinks}`);
  if (summary.peakInterval) {
    lines.push(
      `- **Пик плотности событий:** ${summary.peakInterval.label} (${summary.peakInterval.count} одновременных)`,
    );
  }
  if (summary.centers.length > 0) {
    lines.push(`- **Политические центры:** ${summary.centers.join(', ')}`);
  }
  if (options?.includeCampaignDetails) {
    lines.push('- **Режим среза:** с учётом детальных операций загруженных кампаний');
  }
  lines.push('');

  appendSpheresAndFiguresMarkdown(lines, {
    sphereSummaries: summary.sphereSummaries,
    figuresByGroup: summary.eraFiguresByGroup,
    carryOverInEvents: summary.carryOverInEvents,
    carryOverOutEvents: summary.carryOverOutEvents,
    discoveriesInPeriod: summary.discoveriesInPeriod,
    literaryWorksInPeriod: summary.literaryWorksInPeriod,
    cultureEventsInPeriod: summary.cultureEventsInPeriod,
    worksAboutPeriod: summary.worksAboutPeriod,
    branchLabels,
  });

  appendSourcesAndCitation(
    lines,
    undefined,
    {
      kind: 'era',
      id: era.id,
      title: era.title,
      period: era.period,
      sectionLabel: 'Досье макро-периода',
    },
    options?.now,
  );

  return {
    filename: sanitizeMarkdownFilename(`era-${era.id}-${era.displayShortTitle}`),
    content: `${lines.join('\n').trim()}\n`,
  };
}

export function formatWindowDossierToMarkdown(
  summary: CustomWindowSummaryData,
  branches: BranchDefinition[],
  options?: { includeCampaignDetails?: boolean; now?: Date },
): MarkdownExportPayload {
  const branchLabels = formatBranchLabelMap(branches);
  const title = `Сводный срез периода ${summary.yearFrom}–${summary.yearTo} гг.`;
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');

  lines.push('## Сводка временного окна');
  lines.push('');
  lines.push(`- **Интервал:** ${summary.yearFrom}–${summary.yearTo} гг. (${summary.totalDurationYears} л.)`);
  lines.push(`- **Исторических событий:** ${summary.windowSphereEvents.length} (начато в окне: ${summary.startedInWindow.length})`);
  lines.push(`- **Правителей:** ${summary.overlappingRulers.length}`);
  lines.push(`- **Уникальных связей:** ${summary.totalUniqueLinks}`);
  if (summary.peakInterval) {
    lines.push(
      `- **Пик плотности:** ${summary.peakInterval.label} (${summary.peakInterval.count} одновременных)`,
    );
  }
  if (summary.overlappingEras.length > 0) {
    lines.push(
      `- **Затронутые макро-периоды:** ${summary.overlappingEras
        .map((e) => `${e.displayShortTitle} (${e.period})`)
        .join('; ')}`,
    );
  }
  if (summary.centers.length > 0) {
    lines.push(`- **Политические центры:** ${summary.centers.join(', ')}`);
  }
  if (options?.includeCampaignDetails) {
    lines.push('- **Режим среза:** с учётом детальных операций загруженных кампаний');
  }
  lines.push('');

  appendSpheresAndFiguresMarkdown(lines, {
    sphereSummaries: summary.sphereSummaries,
    figuresByGroup: summary.windowFiguresByGroup,
    carryOverInEvents: summary.carryOverInEvents,
    carryOverOutEvents: summary.carryOverOutEvents,
    discoveriesInPeriod: summary.discoveriesInPeriod,
    literaryWorksInPeriod: summary.literaryWorksInPeriod,
    cultureEventsInPeriod: summary.cultureEventsInPeriod,
    worksAboutPeriod: summary.worksAboutPeriod,
    branchLabels,
  });

  if (summary.crossBranchLinks.length > 0) {
    lines.push(`## Межветочные связи окна (${summary.crossBranchLinks.length})`);
    lines.push('');
    summary.crossBranchLinks.slice(0, 40).forEach((lnk) => {
      const arrow = lnk.isDirectional ? '→' : '↔';
      lines.push(
        `- **${lnk.fromEvent.title}** (${lnk.branchALabel}) ${arrow} **${lnk.toEvent.title}** (${lnk.branchBLabel}) — ${lnk.description}`,
      );
    });
    if (summary.crossBranchLinks.length > 40) {
      lines.push(`- *…и ещё ${summary.crossBranchLinks.length - 40} связей.*`);
    }
    lines.push('');
  }

  appendSourcesAndCitation(
    lines,
    undefined,
    {
      kind: 'window',
      id: `${summary.yearFrom}-${summary.yearTo}`,
      title,
      period: `${summary.yearFrom}–${summary.yearTo}`,
      sectionLabel: 'Досье произвольного окна',
    },
    options?.now,
  );

  return {
    filename: sanitizeMarkdownFilename(`window-${summary.yearFrom}-${summary.yearTo}`),
    content: `${lines.join('\n').trim()}\n`,
  };
}

export function formatPersonDossierToMarkdown(
  dossier: PersonDossier,
  branches: BranchDefinition[],
  now: Date = new Date(),
): MarkdownExportPayload {
  const branchLabels = formatBranchLabelMap(branches);
  const yearSpanLabel =
    dossier.yearRange.min === dossier.yearRange.max
      ? `${dossier.yearRange.min}`
      : `${dossier.yearRange.min}–${dossier.yearRange.max}`;
  const lines: string[] = [];

  lines.push(`# ${dossier.displayName}`);
  lines.push('');

  if (dossier.bioCard?.subtitle) {
    lines.push(`> ${dossier.bioCard.subtitle}`);
    lines.push('');
  }

  lines.push('## Паспорт деятеля');
  lines.push('');
  lines.push(`- **Годы упоминаний в атласе:** ${yearSpanLabel} гг.`);
  lines.push(`- **Связанных событий:** ${dossier.events.length}`);
  if (dossier.rulers.length > 0) {
    lines.push(
      `- **Правления:** ${dossier.rulers.map((r) => `${r.shortRuler} (${r.reignPeriod})`).join(', ')}`,
    );
  }
  lines.push('');

  if (dossier.bioCard?.details) {
    lines.push('## Биографическая справка');
    lines.push('');
    lines.push(dossier.bioCard.details);
    lines.push('');
  }

  if (dossier.events.length > 0) {
    lines.push(`## Хронология участия и упоминаний (${dossier.events.length})`);
    lines.push('');
    const sorted = [...dossier.events].sort(
      (a, b) => a.startYear - b.startYear || a.endYear - b.endYear,
    );
    sorted.forEach((ev) => {
      const bLabel = branchLabels.get(ev.task) ?? ev.task;
      lines.push(`- **${ev.period}** — **${ev.title}** (${bLabel})${ev.subtitle ? `: ${ev.subtitle}` : ''}`);
    });
    lines.push('');
  }

  const aggregatedSources = aggregatePersonSources(dossier);
  appendSourcesAndCitation(
    lines,
    aggregatedSources,
    {
      kind: 'person',
      id: dossier.key,
      title: dossier.displayName,
      period: yearSpanLabel,
      sectionLabel: 'досье исторического деятеля',
    },
    now,
  );

  return {
    filename: sanitizeMarkdownFilename(`person-${dossier.displayName}`),
    content: `${lines.join('\n').trim()}\n`,
  };
}

export function formatComparisonReportToMarkdown(
  report: PeriodComparisonReport,
): MarkdownExportPayload {
  const { left, right, sharedBranchPairs, sharedSyncTags, sharedParticipants } = report;
  const lines: string[] = [];

  lines.push(`# Сравнение периодов: ${left.title} vs ${right.title}`);
  lines.push('');
  lines.push(`- **Сторона A:** ${left.title} (${left.kindLabel}, ${left.yearFrom}–${left.yearTo} гг.)`);
  lines.push(`- **Сторона B:** ${right.title} (${right.kindLabel}, ${right.yearFrom}–${right.yearTo} гг.)`);
  lines.push('');

  lines.push('## Сводные показатели');
  lines.push('');
  lines.push(`| Показатель | ${escapeTableCell(left.title)} | ${escapeTableCell(right.title)} |`);
  lines.push('| :--- | ---: | ---: |');
  lines.push(`| Длительность (лет) | ${left.durationYears} | ${right.durationYears} |`);
  lines.push(`| Исторических событий | ${left.historicalEventsCount} | ${right.historicalEventsCount} |`);
  lines.push(
    `| Начато / унаследовано | ${left.startedInPeriodCount} / ${left.carryOverInCount} | ${right.startedInPeriodCount} / ${right.carryOverInCount} |`,
  );
  lines.push(`| Перешло за границу периода | ${left.carryOverOutCount} | ${right.carryOverOutCount} |`);
  lines.push(`| Уникальных связей всего | ${left.totalUniqueLinks} | ${right.totalUniqueLinks} |`);
  lines.push(`| Причинно-следственных связей | ${left.causalLinksCount} | ${right.causalLinksCount} |`);
  lines.push(
    `| Синхронных / ретроспективных | ${left.syncLinksCount} / ${left.retrospectiveLinksCount} | ${right.syncLinksCount} / ${right.retrospectiveLinksCount} |`,
  );
  lines.push(
    `| Пиковый узел плотности | ${escapeTableCell(left.peakInterval ? `${left.peakInterval.label} (${left.peakInterval.count})` : '—')} | ${escapeTableCell(right.peakInterval ? `${right.peakInterval.label} (${right.peakInterval.count})` : '—')} |`,
  );
  lines.push('');

  lines.push('## Сравнение по 5 сферам событий');
  lines.push('');
  lines.push(`| Сфера | ${escapeTableCell(left.title)} | ${escapeTableCell(right.title)} |`);
  lines.push('| :--- | ---: | ---: |');
  ERA_SPHERE_ORDER.forEach((sphereId) => {
    const label = ERA_SPHERE_META[sphereId]?.label ?? sphereId;
    lines.push(`| ${escapeTableCell(label)} | ${left.sphereCounts[sphereId] ?? 0} | ${right.sphereCounts[sphereId] ?? 0} |`);
  });
  lines.push('');

  if (sharedBranchPairs.length > 0) {
    lines.push(`## Общие межветочные контуры (${sharedBranchPairs.length})`);
    lines.push('');
    sharedBranchPairs.forEach((pair) => {
      lines.push(
        `- **${pair.branchALabel} ↔ ${pair.branchBLabel}:** ${pair.countLeft} (A) / ${pair.countRight} (B)`,
      );
    });
    lines.push('');
  }

  if (sharedSyncTags.length > 0) {
    lines.push(`## Сквозные сюжеты (${sharedSyncTags.length})`);
    lines.push('');
    sharedSyncTags.forEach((tag) => {
      lines.push(`- **${tag.label}:** ${tag.countLeft} (A) / ${tag.countRight} (B)`);
    });
    lines.push('');
  }

  if (sharedParticipants.length > 0) {
    lines.push(`## Общие исторические деятели (${sharedParticipants.length})`);
    lines.push('');
    sharedParticipants.forEach((p) => {
      lines.push(`- **${p.displayName}:** ${p.countLeft} (A) / ${p.countRight} (B)`);
    });
    lines.push('');
  }

  return {
    filename: sanitizeMarkdownFilename(`compare-${left.yearFrom}-${left.yearTo}-vs-${right.yearFrom}-${right.yearTo}`),
    content: `${lines.join('\n').trim()}\n`,
  };
}
