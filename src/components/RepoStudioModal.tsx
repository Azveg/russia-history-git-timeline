import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, Copy, Download, FileJson, FolderGit2, RefreshCw, Upload, X } from 'lucide-react';
import {
  buildRepoSyncScript,
  downloadJsonFile,
  isBranchFile,
  isRulersFile,
} from '../engine/timelineEngine';
import type { BranchFile, SyncManifest, TimelineDataFile } from '../types/timeline';

interface RepoStudioModalProps {
  isOpen: boolean;
  manifest: SyncManifest;
  filesMap: Record<string, TimelineDataFile>;
  onClose: () => void;
  onToggleFileEnabled: (fileId: string) => void;
  onUpdateFileContent: (filePath: string, parsedData: SyncManifest | TimelineDataFile) => void;
  onMountExternalBranch: (branchJson: BranchFile, virtualPath: string) => void;
  onReloadFromServer: () => Promise<void>;
  onNotify: (msg: string) => void;
}

type StudioTab = 'files' | 'connect' | 'ghpages';

export function RepoStudioModal({
  isOpen,
  manifest,
  filesMap,
  onClose,
  onToggleFileEnabled,
  onUpdateFileContent,
  onMountExternalBranch,
  onReloadFromServer,
  onNotify,
}: RepoStudioModalProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('files');
  const [inspectingPath, setInspectingPath] = useState<string>('data/sync.manifest.json');
  const [editorText, setEditorText] = useState<string>('');
  const [remoteUrl, setRemoteUrl] = useState<string>('');
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (inspectingPath === 'data/sync.manifest.json') {
      setEditorText(JSON.stringify(manifest, null, 2));
    } else if (filesMap[inspectingPath]) {
      setEditorText(JSON.stringify(filesMap[inspectingPath], null, 2));
    }
  }, [isOpen, inspectingPath, manifest, filesMap]);

  if (!isOpen) return null;

  function handleApplyJson() {
    try {
      const parsed = JSON.parse(editorText) as SyncManifest | TimelineDataFile;
      onUpdateFileContent(inspectingPath, parsed);
      onNotify(`Изменения в ${inspectingPath} применены и синхронизированы.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Некорректный JSON';
      onNotify(`Ошибка синтаксиса JSON: ${message}`);
    }
  }

  function handleDownloadFile(path: string) {
    const data = path === 'data/sync.manifest.json' ? manifest : filesMap[path];
    if (!data) return;
    const filename = path.split('/').pop() || 'branch.json';
    downloadJsonFile(filename, data);
    onNotify(`Скачан файл ${filename}`);
  }

  function handleDownloadAll() {
    downloadJsonFile('sync.manifest.json', manifest);
    const entries = Object.entries(filesMap);
    entries.forEach(([filePath, data], index) => {
      setTimeout(() => {
        const filename = filePath.split('/').pop() || 'branch.json';
        downloadJsonFile(filename, data);
      }, (index + 1) * 220);
    });
    onNotify(`Запущено скачивание ${entries.length + 1} файлов для папки public/data/`);
  }

  async function handleCopyScript() {
    const script = buildRepoSyncScript(manifest, filesMap);
    try {
      await navigator.clipboard.writeText(script);
      onNotify('Node.js скрипт обновления public/data/ скопирован в буфер обмена.');
    } catch {
      onNotify('Не удалось скопировать в буфер — воспользуйтесь скачиванием JSON-файлов.');
    }
  }

  function handleUploadBranchFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '')) as BranchFile;
        if ((!parsed.branch && !parsed.branches) || !Array.isArray(parsed.nodes)) {
          onNotify('Неверный формат файла ветки: требуются поля "branch" и массив "nodes".');
          return;
        }
        onMountExternalBranch(parsed, `data/${file.name}`);
        setInspectingPath(`data/${file.name}`);
        setActiveTab('files');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка чтения';
        onNotify(`Ошибка чтения JSON-файла: ${message}`);
      }
    };
    reader.readAsText(file);
  }

  async function handleFetchRemoteBranch(e: FormEvent) {
    e.preventDefault();
    const url = remoteUrl.trim();
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = (await res.json()) as BranchFile;
      if ((!parsed.branch && !parsed.branches) || !Array.isArray(parsed.nodes)) {
        onNotify('Неверный формат удаленного JSON: требуются поля "branch" и массив "nodes".');
        return;
      }
      const fileName = url.split('/').pop() || 'remote-branch.json';
      onMountExternalBranch(parsed, `data/${fileName}`);
      setInspectingPath(`data/${fileName}`);
      setActiveTab('files');
      setRemoteUrl('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка сети';
      onNotify(`Не удалось загрузить ветку по URL: ${message}`);
    }
  }

  async function handleResetFromServer() {
    setIsReloading(true);
    try {
      await onReloadFromServer();
      onNotify('Файлы ветвей перезагружены из репозитория.');
    } finally {
      setIsReloading(false);
    }
  }

  const diploMeta = manifest.mountedFiles.find((f) => f.fileId === 'diplomacy');
  const isDiploEnabled = diploMeta ? diploMeta.enabled : false;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl my-6 max-h-[92vh] flex flex-col animate-modal"
      >
        <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-800/90 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
              <FolderGit2 className="w-4 h-4" />
              <span>Модульные файлы ветвей и публикация на GitHub Pages</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-white mt-1">
              Студия файлов Git / JSON и синхронизации ветвей
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isReloading}
              onClick={handleResetFromServer}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Перезагрузить исходные JSON-файлы из public/data/"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
              <span>Сбросить к файлам</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть студию"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 pt-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`px-3.5 py-2 rounded-t-xl font-mono text-xs font-bold border-t border-x transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'files'
                ? 'bg-slate-900 text-amber-300 border-slate-700'
                : 'bg-slate-950 text-slate-400 border-transparent hover:text-white'
            }`}
          >
            1. Файлы ветвей и sync.manifest.json
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`px-3.5 py-2 rounded-t-xl font-mono text-xs font-bold border-t border-x transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'connect'
                ? 'bg-slate-900 text-amber-300 border-slate-700'
                : 'bg-slate-950 text-slate-400 border-transparent hover:text-white'
            }`}
          >
            2. + Подключить внешнюю ветку (.json)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ghpages')}
            className={`px-3.5 py-2 rounded-t-xl font-mono text-xs font-bold border-t border-x transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ghpages'
                ? 'bg-slate-900 text-amber-300 border-slate-700'
                : 'bg-slate-950 text-slate-400 border-transparent hover:text-white'
            }`}
          >
            3. Экспорт и GitHub Pages
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 space-y-2.5">
                <div className="text-xs font-mono font-bold text-amber-400 mb-1">
                  Отдельные файлы репозитория (public/data/):
                </div>

                <div
                  onClick={() => setInspectingPath('data/sync.manifest.json')}
                  className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    inspectingPath === 'data/sync.manifest.json'
                      ? 'bg-emerald-950/30 border-emerald-500/60'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-300 inline-flex items-center gap-1.5">
                      <FileJson className="w-3.5 h-3.5" />
                      data/sync.manifest.json
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile('data/sync.manifest.json');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      .json
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-white mt-1">
                    Файл синхронизации и межветочных связей
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                    Файлов: {manifest.mountedFiles.length} · Связей crossLinks: {manifest.crossLinks.length}
                  </div>
                </div>

                {manifest.mountedFiles.map((f) => {
                  const fData = filesMap[f.path];
                  const nodesCount = isBranchFile(fData)
                    ? fData.nodes.length
                    : isRulersFile(fData)
                      ? fData.rulers.length
                      : 0;
                  const isSelected = inspectingPath === f.path;
                  return (
                    <div
                      key={f.fileId}
                      onClick={() => setInspectingPath(f.path)}
                      className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-amber-300 inline-flex items-center gap-1.5">
                          <FileJson className="w-3.5 h-3.5" />
                          {f.path}
                        </span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onToggleFileEnabled(f.fileId)}
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border cursor-pointer ${
                              f.enabled
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}
                          >
                            {f.enabled ? 'Подключен' : 'Отключен'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(f.path)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            .json
                          </button>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-white mt-1">{f.title}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                        Записей: {nodesCount} · Ветки: {f.branchIds.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="lg:col-span-7 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-amber-300">
                    Редактор: {inspectingPath}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(inspectingPath)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Скачать этот файл
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyJson}
                      className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      Применить и синхронизировать
                    </button>
                  </div>
                </div>
                <textarea
                  rows={18}
                  spellCheck={false}
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  className="w-full flex-1 p-4 bg-[#04070f] text-emerald-300 font-mono text-xs leading-relaxed focus:outline-none resize-y"
                />
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="text-xs font-mono font-bold text-amber-400">
                  Подключить отдельный файл ветви (.json)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Загрузите свой файл с новой исторической линией (например,{' '}
                  <code className="text-amber-300 font-mono">science.json</code> или{' '}
                  <code className="text-amber-300 font-mono">culture.json</code>). Движок автоматически
                  синхронизирует интервалы <code className="text-emerald-300 font-mono">startYear / endYear</code> со
                  шкалой правителей и отобразит пересечения на графе.
                </p>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-white">
                    Вариант А. Загрузить локальный .json файл с диска:
                  </label>
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadBranchFile}
                      className="block w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                <form onSubmit={handleFetchRemoteBranch} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-white">
                    Вариант Б. Подключить по URL (GitHub Raw / GitHub Pages):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      placeholder="https://raw.githubusercontent.com/user/repo/main/public/data/science.json"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Подключить
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="text-xs font-mono font-bold text-teal-400">
                  Встроенный опциональный модуль дипломатии
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  В репозитории подготовлен отдельный модуль{' '}
                  <code className="text-teal-300 font-mono">data/diplomacy.json</code> («Дипломатия и
                  договоры»). Подключите его одним нажатием, чтобы увидеть дополнительную бирюзовую
                  рельсу на графе:
                </p>

                <button
                  type="button"
                  onClick={() => onToggleFileEnabled('diplomacy')}
                  className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold border transition-colors flex items-center justify-between cursor-pointer ${
                    isDiploEnabled
                      ? 'bg-teal-500/20 border-teal-500/50 text-teal-200'
                      : 'bg-slate-900 hover:bg-slate-800 border-teal-500/40 text-teal-300'
                  }`}
                >
                  <span>
                    {isDiploEnabled
                      ? 'Модуль data/diplomacy.json подключен'
                      : '+ Подключить модуль data/diplomacy.json (6 договоров)'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px]">
                    {isDiploEnabled ? 'Отключить' : 'Включить'}
                  </span>
                </button>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] font-mono font-bold text-slate-300 mb-1.5">
                    Минимальная схема файла ветки (JSON):
                  </div>
                  <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto leading-snug">{`{
  "fileId": "science",
  "path": "data/science.json",
  "branch": {
    "id": "SCIENCE_TECH",
    "gitName": "feat/science",
    "label": "Наука и технологии",
    "short": "science",
    "color": "#38bdf8",
    "badgeClass": "bg-sky-500/15 text-sky-300 border-sky-500/40",
    "isMilitary": false
  },
  "nodes": [
    {
      "id": "1724-academy",
      "startYear": 1724,
      "endYear": 1725,
      "period": "1724–1725",
      "title": "Основание Академии наук в Петербурге",
      "subtitle": "Краткий тезис события",
      "details": "Подробное описание события",
      "task": "SCIENCE_TECH",
      "region": "Санкт-Петербург",
      "type": "Наука"
    }
  ]
}`}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ghpages' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Экспорт измененных ветвей и публикация на GitHub Pages
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Сборка настроена с относительными путями и автоматическим рабочим процессом GitHub Actions
                    при пуше в ветку <code className="text-amber-300 font-mono">main</code>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Скачать все JSON-файлы
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-mono font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Скопировать Node.js скрипт
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="font-mono font-bold text-amber-400">
                    Как обновлять ветви в репозитории:
                  </div>
                  <p>
                    1. Отредактируйте нужную ветвь прямо здесь во вкладке «Файлы ветвей» или добавьте события через
                    «+ Коммит / Ветка».
                  </p>
                  <p>
                    2. Нажмите «Скачать этот файл» или «Скачать все JSON-файлы» и замените соответствующие файлы
                    в папке <code className="text-emerald-300 font-mono">public/data/</code> вашего репозитория.
                  </p>
                  <p>
                    3. Сделайте <code className="text-amber-300 font-mono">git commit</code> и{' '}
                    <code className="text-amber-300 font-mono">git push origin main</code> — GitHub Actions
                    автоматически пересоберет сайт и обновит GitHub Pages.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="font-mono font-bold text-sky-400">
                    Однократная настройка GitHub Pages в репозитории:
                  </div>
                  <p>
                    1. Откройте настройки репозитория на GitHub: <strong>Settings → Pages</strong>.
                  </p>
                  <p>
                    2. В разделе <strong>Build and deployment → Source</strong> выберите{' '}
                    <strong>GitHub Actions</strong>.
                  </p>
                  <p>
                    3. После первого пуша в ветку <code className="text-amber-300 font-mono">main</code> рабочий
                    процесс соберет проект с относительными путями и опубликует сайт.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
