import {
  BookMarked,
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Quote,
  ScrollText,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { SourceEntry } from '../types/timeline';
import {
  SOURCE_TYPE_LABELS,
  buildCanonicalDeepLink,
  copyTextToClipboard,
  downloadBibTeXFile,
  formatBibTeXCitation,
  formatGostCitation,
  isPrimaryGroupSource,
  type AggregatedSourceEntry,
  type CitationFormat,
  type CitationTarget,
} from '../utils/citation';

interface CiteTriggerButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function CiteTriggerButton({ isOpen, onToggle }: CiteTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className={`h-8 px-2.5 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${
        isOpen
          ? 'bg-amber-500/20 border-amber-400/70 text-amber-100 font-semibold'
          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-200'
      }`}
      title="Сформировать библиографическую ссылку по ГОСТ Р 7.0.100–2018 / BibTeX и скопировать канонический Deep Link"
    >
      <Quote className="w-3.5 h-3.5 shrink-0" />
      <span>Цитировать</span>
    </button>
  );
}

interface AcademicCitationPanelProps {
  target: CitationTarget;
  secondaryCardDeepLinkId?: string | null;
  onClose: () => void;
}

export function AcademicCitationPanel({
  target,
  secondaryCardDeepLinkId,
  onClose,
}: AcademicCitationPanelProps) {
  const [format, setFormat] = useState<CitationFormat>('gost');
  const [copiedMode, setCopiedMode] = useState<'citation' | 'link' | 'bioLink' | null>(null);

  useEffect(() => {
    setFormat('gost');
    setCopiedMode(null);
  }, [target.kind, target.id]);

  const canonicalUrl = useMemo(
    () => buildCanonicalDeepLink(target.kind, target.id),
    [target.kind, target.id],
  );

  const secondaryCardUrl = useMemo(
    () => (secondaryCardDeepLinkId ? buildCanonicalDeepLink('card', secondaryCardDeepLinkId) : null),
    [secondaryCardDeepLinkId],
  );

  const formattedCitation = useMemo(() => {
    return format === 'gost' ? formatGostCitation(target) : formatBibTeXCitation(target);
  }, [format, target]);

  const handleCopy = async (text: string, mode: 'citation' | 'link' | 'bioLink') => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedMode(mode);
      window.setTimeout(() => {
        setCopiedMode((prev) => (prev === mode ? null : prev));
      }, 2200);
    }
  };

  const paramDisplay = `?${target.kind}=${target.id}`;

  return (
    <section
      aria-label="Академическое цитирование"
      className="rounded-xl bg-slate-900/90 border border-amber-500/35 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Quote className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-100">
            Библиографическая ссылка
          </span>
          <span aria-hidden="true" className="text-slate-600 hidden sm:inline">
            ·
          </span>
          <span className="text-xs font-mono text-slate-400 truncate hidden sm:inline tabular-nums">
            {paramDisplay}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="tablist"
            aria-label="Формат цитирования"
            className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={format === 'gost'}
              onClick={() => setFormat('gost')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                format === 'gost'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              ГОСТ Р 7.0.100–2018
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={format === 'bibtex'}
              onClick={() => setFormat('bibtex')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                format === 'bibtex'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              BibTeX
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Свернуть панель цитирования"
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Предпросмотр сформированной ссылки */}
      {format === 'gost' ? (
        <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-3.5 py-3 text-xs sm:text-sm text-slate-200 leading-relaxed select-all break-words max-w-none">
          {formattedCitation}
        </div>
      ) : (
        <pre className="rounded-lg bg-slate-950/90 border border-slate-800 px-3.5 py-3 text-xs font-mono text-sky-100 leading-relaxed overflow-x-auto select-all tabular-nums">
          {formattedCitation}
        </pre>
      )}

      {/* Действия копирования и канонический Deep Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopy(formattedCitation, 'citation')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {copiedMode === 'citation' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>
              {copiedMode === 'citation'
                ? 'Цитата скопирована'
                : format === 'gost'
                  ? 'Копировать ГОСТ'
                  : 'Копировать BibTeX'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopy(canonicalUrl, 'link')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-mono transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            title={canonicalUrl}
          >
            {copiedMode === 'link' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Link2 className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>
              {copiedMode === 'link' ? 'Ссылка скопирована' : `Deep Link (${paramDisplay})`}
            </span>
          </button>

          {secondaryCardUrl && secondaryCardDeepLinkId && (
            <button
              type="button"
              onClick={() => void handleCopy(secondaryCardUrl, 'bioLink')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors duration-150 cursor-pointer whitespace-nowrap"
              title={`Каноническая ссылка на биографическую карточку: ${secondaryCardUrl}`}
            >
              {copiedMode === 'bioLink' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Link2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {copiedMode === 'bioLink' ? 'Скопировано' : `?card=${secondaryCardDeepLinkId}`}
              </span>
            </button>
          )}
        </div>

        <span
          role="status"
          aria-live="polite"
          className="text-[11px] font-mono text-emerald-300 min-h-[1rem]"
        >
          {copiedMode === 'citation'
            ? 'Готово к вставке в список литературы'
            : copiedMode === 'link' || copiedMode === 'bioLink'
              ? 'Канонический URL скопирован в буфер'
              : ''}
        </span>
      </div>
    </section>
  );
}

interface SourcesApparatusSectionProps {
  sources: Array<SourceEntry | AggregatedSourceEntry>;
  onSelectOriginCard?: (cardId: string) => void;
  contextHint?: string;
  citationTarget?: CitationTarget;
}

export function SourcesApparatusSection({
  sources,
  onSelectOriginCard,
  contextHint,
  citationTarget,
}: SourcesApparatusSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedCitationMode, setCopiedCitationMode] = useState<'gost' | 'bibtex' | 'bibfile' | null>(null);

  const handleCitationAction = async (mode: 'gost' | 'bibtex' | 'bibfile') => {
    if (!citationTarget) return;
    let ok = false;
    if (mode === 'gost') {
      ok = await copyTextToClipboard(formatGostCitation(citationTarget));
    } else if (mode === 'bibtex') {
      ok = await copyTextToClipboard(formatBibTeXCitation(citationTarget));
    } else {
      ok = downloadBibTeXFile(citationTarget);
    }
    if (ok) {
      setCopiedCitationMode(mode);
      window.setTimeout(() => {
        setCopiedCitationMode((prev) => (prev === mode ? null : prev));
      }, 2200);
    }
  };

  const primaryList = useMemo(
    () => sources.filter((s) => isPrimaryGroupSource(s.type)),
    [sources],
  );
  const historiographyList = useMemo(
    () => sources.filter((s) => !isPrimaryGroupSource(s.type)),
    [sources],
  );

  if (sources.length === 0) return null;

  const isLong = sources.length > 8;
  const visiblePrimary = expanded || !isLong ? primaryList : primaryList.slice(0, 5);
  const remainingSlots = expanded || !isLong ? historiographyList.length : Math.max(0, 8 - visiblePrimary.length);
  const visibleHistoriography = historiographyList.slice(0, remainingSlots);

  const renderGroup = (
    heading: string,
    items: Array<SourceEntry | AggregatedSourceEntry>,
    startIndex: number,
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2.5">
        <h5 className="text-xs font-mono font-semibold text-slate-400 tracking-wide">
          {heading}
        </h5>
        <ol className="divide-y divide-slate-800/75 border-t border-slate-800/75">
          {items.map((item, idx) => {
            const agg = item as AggregatedSourceEntry;
            const num = String(startIndex + idx + 1).padStart(2, '0');
            return (
              <li key={`${item.type}-${idx}-${item.citation.slice(0, 24)}`} className="py-3 first:pt-2.5 last:pb-0">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-amber-400/90 tabular-nums shrink-0 mt-0.5 select-none">
                    {num}.
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-400">
                      <span className={isPrimaryGroupSource(item.type) ? 'text-amber-300/90' : 'text-sky-300/90'}>
                        {SOURCE_TYPE_LABELS[item.type]}
                      </span>
                      {agg.originLabel && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          {agg.originCardId && onSelectOriginCard ? (
                            <button
                              type="button"
                              onClick={() => onSelectOriginCard(agg.originCardId!)}
                              className="text-slate-300 hover:text-sky-300 underline decoration-slate-600 underline-offset-2 transition-colors cursor-pointer text-left"
                            >
                              {agg.originLabel}
                            </button>
                          ) : (
                            <span className="text-slate-400">{agg.originLabel}</span>
                          )}
                        </>
                      )}
                      {item.url && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 underline decoration-sky-500/40 underline-offset-2 transition-colors"
                          >
                            <span>Электронная версия</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-100 leading-relaxed max-w-prose">
                      {item.citation}
                    </p>

                    {item.note && (
                      <p className="text-xs text-slate-400 leading-relaxed max-w-prose">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  return (
    <section
      aria-label="Источниковедческий аппарат и историография"
      className="pt-4 border-t border-slate-800/90 space-y-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-amber-400 shrink-0" />
          <h4 className="font-serif text-base sm:text-lg font-bold text-white tracking-tight">
            Источниковедческий аппарат и историография
          </h4>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
          {primaryList.length > 0 && <span>Первоисточники: {primaryList.length}</span>}
          {primaryList.length > 0 && historiographyList.length > 0 && (
            <span aria-hidden="true">·</span>
          )}
          {historiographyList.length > 0 && (
            <span>Историография: {historiographyList.length}</span>
          )}
        </div>
      </div>

      {contextHint && (
        <p className="text-xs text-slate-400 leading-relaxed max-w-prose">{contextHint}</p>
      )}

      <div className="space-y-5">
        {renderGroup('Первоисточники, летописи и документы эпохи', visiblePrimary, 0)}
        {renderGroup(
          'Историография и академические исследования',
          visibleHistoriography,
          visiblePrimary.length,
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>
            {expanded
              ? 'Свернуть список источников'
              : `Показать все источники (${sources.length})`}
          </span>
        </button>
      )}

      {citationTarget && (
        <div className="pt-3 border-t border-slate-800/75 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <span className="text-slate-400">Библиографическая ссылка:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCitationAction('gost')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/90 text-amber-200 hover:text-amber-100 transition-colors cursor-pointer"
              title="Скопировать ссылку по стандарту ГОСТ Р 7.0.100–2018"
            >
              {copiedCitationMode === 'gost' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {copiedCitationMode === 'gost' ? 'ГОСТ скопирован' : 'ГОСТ Р 7.0.100–2018'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleCitationAction('bibtex')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/90 text-sky-200 hover:text-sky-100 transition-colors cursor-pointer"
              title="Скопировать запись BibTeX в буфер обмена"
            >
              {copiedCitationMode === 'bibtex' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{copiedCitationMode === 'bibtex' ? 'BibTeX скопирован' : 'BibTeX'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCitationAction('bibfile')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/90 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Скачать библиографическую запись в формате BibTeX (.bib)"
            >
              {copiedCitationMode === 'bibfile' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{copiedCitationMode === 'bibfile' ? 'Файл .bib скачан' : 'Скачать .bib'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
