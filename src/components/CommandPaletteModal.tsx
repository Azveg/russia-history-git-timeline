import {
  ArrowRight,
  BookOpen,
  Compass,
  Crown,
  Flame,
  Search,
  Swords,
  User,
  X,
} from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  searchCommandIndex,
  type CommandSearchCategory,
  type CommandSearchIndex,
  type CommandSearchItem,
} from '../engine/timelineEngine';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface CommandPaletteModalProps {
  index: CommandSearchIndex;
  onClose: () => void;
  onSelectItem: (item: CommandSearchItem) => void;
}

const FILTER_TABS: Array<{ id: CommandSearchCategory | 'all'; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'eras', label: 'Эпохи' },
  { id: 'rulers', label: 'Правители' },
  { id: 'events', label: 'События' },
  { id: 'people', label: 'Деятели' },
  { id: 'campaigns', label: 'Кампании' },
];

function renderCategoryIcon(category: CommandSearchCategory) {
  switch (category) {
    case 'eras':
      return <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'rulers':
      return <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    case 'campaigns':
      return <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    case 'people':
      return <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    case 'events':
      return <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
}

export const CommandPaletteModal = memo(function CommandPaletteModal({
  index,
  onClose,
  onSelectItem,
}: CommandPaletteModalProps) {
  const modalRef = useModalFocusTrap<HTMLDivElement>(onClose);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CommandSearchCategory | 'all'>('all');
  const [activeFlatIndex, setActiveFlatIndex] = useState(0);

  const groups = useMemo(
    () =>
      searchCommandIndex(index, query, {
        limitPerGroup: categoryFilter === 'all' ? 6 : 18,
        categoryFilter,
      }),
    [index, query, categoryFilter],
  );

  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveFlatIndex(0);
  }, [query, categoryFilter]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveFlatIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveFlatIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      const target = flatItems[activeFlatIndex];
      if (target) {
        e.preventDefault();
        onSelectItem(target);
        onClose();
      }
    }
  }

  let runningFlatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm px-3 pt-14 sm:pt-20 pb-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Быстрый поиск по атласу"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-2xl bg-[#0b1325] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-modal"
      >
        {/* Поле ввода */}
        <div className="px-4 py-3 border-b border-slate-800/90 bg-[#050811]/90 flex items-center gap-3">
          <Search className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти эпоху, правителя, событие, деятеля, год или кампанию…"
            aria-label="Поиск по всему историческому атласу"
            className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Очистить запрос"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно быстрого поиска"
            className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Фильтр категорий */}
        <div
          className="px-4 py-2 border-b border-slate-800/75 bg-slate-950/60 flex items-center gap-1 overflow-x-auto"
          role="group"
          aria-label="Категории быстрого поиска"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Результаты */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800/75">
          {groups.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-2">
              <Swords className="w-5 h-5 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-300">
                По запросу «{query}» совпадений не найдено.
              </p>
              <p className="text-xs text-slate-500">
                Попробуйте год (например, 1812 или 1917), фамилию деятеля, название эпохи или договора.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.category} className="py-2">
                <div className="px-4 py-1.5 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
                    {renderCategoryIcon(group.category)}
                    <span>{group.label}</span>
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {group.items.length < group.totalMatches
                      ? `${group.items.length} из ${group.totalMatches}`
                      : `${group.totalMatches}`}
                  </span>
                </div>

                <div className="divide-y divide-slate-800/45">
                  {group.items.map((item) => {
                    const currentIdx = runningFlatIdx;
                    runningFlatIdx += 1;
                    const isSelected = currentIdx === activeFlatIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveFlatIndex(currentIdx)}
                        onClick={() => {
                          onSelectItem(item);
                          onClose();
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/12 text-white'
                            : 'hover:bg-slate-900/75 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span
                              className={`text-sm font-semibold leading-snug ${
                                isSelected ? 'text-amber-200' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-[11px] font-mono text-amber-300/85 tabular-nums shrink-0">
                              {item.meta}
                            </span>
                          </div>
                          {item.subtitle && (
                            <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 mt-1 shrink-0 transition-colors ${
                            isSelected ? 'text-amber-300' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Подсказка горячих клавиш */}
        <div className="px-4 py-2 border-t border-slate-800/90 bg-[#050811]/85 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>↑↓ выбор</span>
            <span>·</span>
            <span>Enter открыть</span>
            <span>·</span>
            <span>Esc закрыть</span>
          </div>
          <span>Ctrl+K / ⌘K · быстрый переход</span>
        </div>
      </div>
    </div>
  );
});
