import { useState, type FormEvent } from 'react';
import { GitCommitHorizontal, X } from 'lucide-react';
import type { BranchDefinition } from '../types/timeline';

export interface NewCommitPayload {
  branchId: string;
  customBranchName?: string;
  customBranchColor?: string;
  period: string;
  title: string;
  subtitle: string;
  region: string;
  type: string;
  details: string;
}

interface AddCommitModalProps {
  isOpen: boolean;
  branches: BranchDefinition[];
  onClose: () => void;
  onSubmit: (payload: NewCommitPayload) => void;
}

const CUSTOM_COLORS = [
  { value: '#2dd4bf', label: 'Бирюзовый (Teal)' },
  { value: '#e879f9', label: 'Фуксия (Pink)' },
  { value: '#a3e635', label: 'Лаймовый (Lime)' },
  { value: '#60a5fa', label: 'Синий (Blue)' },
  { value: '#facc15', label: 'Желтый (Yellow)' },
];

export function AddCommitModal({ isOpen, branches, onClose, onSubmit }: AddCommitModalProps) {
  const selectableBranches = branches.filter((b) => b.id !== 'MAIN_RULERS');
  const [branchId, setBranchId] = useState<string>(selectableBranches[0]?.id || '__NEW_BRANCH__');
  const [customBranchName, setCustomBranchName] = useState('');
  const [customBranchColor, setCustomBranchColor] = useState('#2dd4bf');
  const [period, setPeriod] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [region, setRegion] = useState('Российская империя / СССР / РФ');
  const [type, setType] = useState('Историческое событие');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const effectiveBranchId =
    branchId === '__NEW_BRANCH__' || selectableBranches.some((b) => b.id === branchId)
      ? branchId
      : selectableBranches[0]?.id || '__NEW_BRANCH__';

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      branchId: effectiveBranchId,
      customBranchName: effectiveBranchId === '__NEW_BRANCH__' ? customBranchName.trim() : undefined,
      customBranchColor: effectiveBranchId === '__NEW_BRANCH__' ? customBranchColor : undefined,
      period: period.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      region: region.trim(),
      type: type.trim(),
      details: details.trim(),
    });
    setPeriod('');
    setTitle('');
    setSubtitle('');
    setDetails('');
    setCustomBranchName('');
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl my-8 animate-modal"
      >
        <div className="p-5 sm:p-6 bg-gradient-to-b from-slate-800/80 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
              <GitCommitHorizontal className="w-3.5 h-3.5" />
              Новый коммит или ветка
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              Добавить событие в граф и JSON-модуль
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">1. Целевая ветка:</label>
              <select
                value={effectiveBranchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
              >
                {selectableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} ({b.gitName})
                  </option>
                ))}
                <option value="__NEW_BRANCH__">+ Создать новую параллельную ветку...</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">2. Годы / Дата:</label>
              <input
                type="text"
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Напр.: 1703 или 1861–1864"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {effectiveBranchId === '__NEW_BRANCH__' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
              <div className="text-xs font-mono font-bold text-amber-400">
                Параметры новой параллельной ветки (будет создан отдельный JSON-файл):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">Название новой ветки:</label>
                  <input
                    type="text"
                    required
                    value={customBranchName}
                    onChange={(e) => setCustomBranchName(e.target.value)}
                    placeholder="Напр.: Наука и технологии"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Цвет линии:</label>
                  <select
                    value={customBranchColor}
                    onChange={(e) => setCustomBranchColor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    {CUSTOM_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">3. Название события:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Напр.: Основание Санкт-Петербурга / Отмена крепостного права"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">4. Краткий тезис:</label>
            <input
              type="text"
              required
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Краткая суть события в одну строку..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Регион / Сфера:</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Категория события:</label>
              <input
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              5. Подробное описание (открывается в git show):
            </label>
            <textarea
              rows={3}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Полное описание исторического события, причин и последствий..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Сохранить коммит в граф
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
