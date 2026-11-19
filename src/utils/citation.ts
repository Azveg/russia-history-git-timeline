import type { PersonDossier, SourceEntry, SourceEntryType } from '../types/timeline';

export type CitationFormat = 'gost' | 'bibtex';
export type DeepLinkKind = 'card' | 'ruler' | 'person';

export interface CitationTarget {
  kind: DeepLinkKind;
  id: string;
  title: string;
  period?: string;
  sectionLabel: string;
}

export interface AggregatedSourceEntry extends SourceEntry {
  originLabel?: string;
  originCardId?: string;
}

const ATLAS_PUBLICATION_TITLE = 'Исторический атлас-хронограф России (862–2000)';

const CYRILLIC_TRANSLIT: Record<string, string> = {
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
  х: 'kh',
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

export const SOURCE_TYPE_LABELS: Record<SourceEntryType, string> = {
  primary: 'Первоисточник',
  document: 'Документ и акт',
  historiography: 'Историография',
  reference: 'Справочное издание',
};

export function isPrimaryGroupSource(type: SourceEntryType): boolean {
  return type === 'primary' || type === 'document';
}

export function buildCanonicalDeepLink(kind: DeepLinkKind, id: string): string {
  const paramName = kind === 'card' ? 'card' : kind === 'ruler' ? 'ruler' : 'person';
  const configuredSiteUrl =
    typeof import.meta !== 'undefined' && typeof import.meta.env?.VITE_SITE_URL === 'string'
      ? import.meta.env.VITE_SITE_URL.trim().replace(/\/+$/, '')
      : '';
  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}${window.location.pathname}`
      : configuredSiteUrl
        ? `${configuredSiteUrl}/`
        : '/';
  const params = new URLSearchParams();
  params.set(paramName, id);
  return `${baseUrl}?${params.toString()}`;
}

export function formatAccessDateRu(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatAccessDateIso(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function escapeBibTeX(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([{}#$%&_])/g, '\\$1')
    .replace(/–/g, '--')
    .replace(/—/g, '---');
}

function buildBibTeXKey(kind: DeepLinkKind, rawId: string): string {
  const lowered = rawId.trim().toLowerCase();
  let ascii = '';
  for (const ch of lowered) {
    if (CYRILLIC_TRANSLIT[ch] !== undefined) {
      ascii += CYRILLIC_TRANSLIT[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      ascii += ch;
    } else {
      ascii += '_';
    }
  }
  const normalized = ascii.replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'entry';
  const prefix = kind === 'card' ? 'atlas' : `atlas_${kind}`;
  return normalized.startsWith(`${kind}_`) ? `atlas_${normalized}` : `${prefix}_${normalized}`;
}

/**
 * Формирует библиографическую ссылку по стандарту ГОСТ Р 7.0.5–2008 для электронного ресурса.
 */
export function formatGostCitation(target: CitationTarget, now: Date = new Date()): string {
  const cleanTitle = target.title.trim().replace(/\.+$/, '');
  const cleanPeriod = target.period?.trim();
  const titleWithPeriod =
    cleanPeriod && !cleanTitle.includes(cleanPeriod)
      ? `${cleanTitle} (${cleanPeriod})`
      : cleanTitle;
  const url = buildCanonicalDeepLink(target.kind, target.id);
  const accessDate = formatAccessDateRu(now);

  return `${titleWithPeriod} [Электронный ресурс] // ${ATLAS_PUBLICATION_TITLE} : ${target.sectionLabel}. — URL: ${url} (дата обращения: ${accessDate}).`;
}

/**
 * Формирует запись BibTeX (@misc) с транслитерированным ключом и каноническим Deep Link.
 */
export function formatBibTeXCitation(target: CitationTarget, now: Date = new Date()): string {
  const cleanTitle = target.title.trim().replace(/\.+$/, '');
  const cleanPeriod = target.period?.trim();
  const fullTitle =
    cleanPeriod && !cleanTitle.includes(cleanPeriod)
      ? `${cleanTitle} (${cleanPeriod})`
      : cleanTitle;
  const key = buildBibTeXKey(target.kind, target.id);
  const url = buildCanonicalDeepLink(target.kind, target.id);
  const isoDate = formatAccessDateIso(now);

  return [
    `@misc{${key},`,
    `  title        = {{${escapeBibTeX(fullTitle)}}},`,
    `  howpublished = {${escapeBibTeX(`${ATLAS_PUBLICATION_TITLE}, ${target.sectionLabel}`)}},`,
    `  year         = {${now.getFullYear()}},`,
    `  url          = {${url}},`,
    `  note         = {Дата обращения: ${isoDate}}`,
    `}`,
  ].join('\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback ниже для ограниченных iframe-контекстов
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Агрегирует источники для досье исторической персоны без дублирования данных:
 * сначала источники биографической карточки, затем уникальные источники из связанных событий.
 */
export function aggregatePersonSources(dossier: PersonDossier): AggregatedSourceEntry[] {
  const result: AggregatedSourceEntry[] = [];
  const seen = new Set<string>();

  const pushUnique = (
    src: SourceEntry,
    originLabel?: string,
    originCardId?: string,
  ) => {
    const norm = src.citation.trim().toLowerCase();
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    result.push({
      ...src,
      ...(originLabel ? { originLabel } : {}),
      ...(originCardId ? { originCardId } : {}),
    });
  };

  if (dossier.bioCard?.sources?.length) {
    for (const src of dossier.bioCard.sources) {
      pushUnique(src, 'Биографическая карточка', dossier.bioCard.id);
    }
  }

  for (const ev of dossier.events) {
    if (dossier.bioCard && ev.id === dossier.bioCard.id) continue;
    if (!ev.sources?.length) continue;
    for (const src of ev.sources) {
      pushUnique(src, `${ev.period} · ${ev.title}`, ev.id);
    }
  }

  for (const r of dossier.rulers) {
    if (!r.sources?.length) continue;
    const isSameRuler =
      r.ruler.toLowerCase().includes(dossier.displayName.toLowerCase()) ||
      dossier.displayName.toLowerCase().includes(r.shortRuler.toLowerCase());
    if (!isSameRuler) continue;
    for (const src of r.sources) {
      pushUnique(src, `Правление: ${r.shortRuler} (${r.reignPeriod})`);
    }
  }

  return result;
}
