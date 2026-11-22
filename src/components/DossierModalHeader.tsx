import { ArrowLeft, Check, FileDown, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ModalHistoryItem } from '../types/timeline';

interface DossierModalHeaderProps {
  /** Контекстная строка (ветка, тип досье, период) — безопасно обрезается при нехватке ширины */
  context: ReactNode;
  /** Предыдущее окно из стека навигации (кнопка «← Назад») */
  lastHistoryItem?: ModalHistoryItem | null;
  onNavigateBack?: () => void;
  /** Визуальный тон кнопки «Назад» */
  backButtonTone?: 'amber' | 'slate';
  /** Закреплённая панель действий (вторая строка шапки) */
  actions?: ReactNode;
  /** Компактная кнопка выгрузки содержимого окна в Markdown (.md) рядом с кнопкой закрытия */
  onExportMarkdown?: () => void;
  exportMarkdownTitle?: string;
  exportMarkdownAriaLabel?: string;
  /** Обработчик закрытия и подпись для вспомогательных технологий */
  onClose: () => void;
  closeAriaLabel: string;
}

/**
 * Единая двухстрочная шапка для всех модальных окон досье:
 * - Строка 1: кнопка возврата «← Назад», контекстная подпись с безопасным truncate,
 *   опциональный значок выгрузки в Markdown (.md) и закреплённая справа кнопка закрытия «×».
 * - Строка 2: выделенная панель действий (навигация по таймлайну, сравнение, цепочки и др.),
 *   независимая от длины заголовка ветки и ширины экрана.
 */
export function DossierModalHeader({
  context,
  lastHistoryItem,
  onNavigateBack,
  backButtonTone = 'amber',
  actions,
  onExportMarkdown,
  exportMarkdownTitle = 'Скачать в Markdown (.md)',
  exportMarkdownAriaLabel = 'Скачать содержимое окна в формате Markdown',
  onClose,
  closeAriaLabel,
}: DossierModalHeaderProps) {
  const [exportedRecently, setExportedRecently] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleExportClick = () => {
    if (!onExportMarkdown) return;
    onExportMarkdown();
    setExportedRecently(true);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setExportedRecently(false);
      resetTimerRef.current = null;
    }, 1800);
  };

  const backToneClass =
    backButtonTone === 'slate'
      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
      : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-200';

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 shrink-0">
      {/* Строка 1: навигация «Назад», контекст окна, выгрузка .md и кнопка закрытия */}
      <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          {lastHistoryItem && onNavigateBack && (
            <button
              type="button"
              onClick={onNavigateBack}
              className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-mono font-semibold transition-colors duration-150 cursor-pointer shrink-0 max-w-[44%] sm:max-w-[240px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${backToneClass}`}
              title={`Вернуться назад: ${lastHistoryItem.label}`}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Назад: {lastHistoryItem.label}</span>
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {context}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onExportMarkdown && (
            <button
              type="button"
              onClick={handleExportClick}
              aria-label={exportMarkdownAriaLabel}
              title={exportedRecently ? 'Файл Markdown (.md) скачан' : exportMarkdownTitle}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${
                exportedRecently
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-amber-300'
              }`}
            >
              {exportedRecently ? (
                <Check className="w-4 h-4" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label={closeAriaLabel}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Строка 2: закреплённая панель действий с аккуратным переносом и сохранением подписей */}
      {actions && (
        <div
          role="toolbar"
          aria-label="Действия с окном досье"
          className="px-4 sm:px-5 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap items-center gap-2"
        >
          {actions}
        </div>
      )}
    </header>
  );
}
