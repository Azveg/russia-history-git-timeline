# Техническое задание (ТЗ), архитектура раздельного хранения данных и руководство по развертыванию на GitHub Pages
## Проект: Мультиветочный Git-Таймлайн истории России (1686–2026) — Версия 2.0 (Modular Edition)

---

## 1. Архитектура раздельного хранения таймлайнов и отделения дизайна от данных

В версии 2.0 проект спроектирован по принципу **разделения представления и данных (Separation of Concerns)** и предназначен для публикации на **GitHub Pages** с независимым версионированием каждой исторической ветки в Git.

### 1.1. Структура репозитория для GitHub Pages
```text
russian-history-git-timeline/
├── index.html                     # Чистый каркас, UI-дизайн и движок (TimelineSyncEngine + SVG Renderer)
├── .nojekyll                      # Пустой файл для отключения Jekyll при раздаче JSON на GitHub Pages
├── dashboard_technical_spec.md    # Полное техническое задание, схема JSON и документация
└── data/                          # Директория независимо версионируемых файлов таймлайнов
    ├── sync.manifest.json         # ФАЙЛ СИНХРОНИЗАЦИИ: реестр веток, шкала времени и межветочные связи (crossLinks)
    ├── rulers.json                # Стволовая ветка правителей (main/rulers, 19 правлений, 1686–2026)
    ├── wars.json                  # Военные конфликты и силовые операции (war/seas, war/periphery, war/buffer-internal)
    ├── economics.json             # Экономика, финансы и государственно-военные реформы (feat/reforms-eco)
    ├── world.json                 # События в других странах и мировой геополитический контекст (world/events)
    └── diplomacy.json             # Подключаемый модуль: дипломатия, мирные договоры и союзы (diplomacy/treaties)
```

### 1.2. Как работает отделение дизайна от данных
1. **Единый каркас и движок (`index.html`)**:
   * Отвечает исключительно за визуализацию, адаптивную верстку (Tailwind CSS), фильтрацию временного окна, рендеринг непрерывного векторного SVG-графа и диаграммы Ганта.
   * При запуске на GitHub Pages модуль `tryLoadExternalGitHubPagesData()` выполняет асинхронный `fetch('./data/sync.manifest.json')`, считывает список активных файлов из массива `mountedFiles` и параллельно через `Promise.allSettled` загружает все подключенные `.json` файлы веток.
   * Для того чтобы приложение также мгновенно работало в песочнице предпросмотра (`Preview`) и при открытии локального файла без веб-сервера, внутри предусмотрена виртуальная файловая система **`VirtualGitFS`**, содержащая точные копии всех модульных JSON-файлов.
2. **Независимое версионирование в Git**:
   * Каждый тематический таймлайн (`rulers.json`, `wars.json`, `economics.json`, `world.json`, `diplomacy.json` и любые будущие файлы) редактируется и коммитится в Git отдельно.
   * Разработчикам или историкам не нужно трогать код `index.html`, чтобы добавить новые события в ветку экономики или подключить новую ветку «Наука и технологии».

---

## 2. Формат файлов и механизм синхронизации таймлайнов

Синхронизация разных файлов таймлайнов работает на **двух уровнях**:
1. **Автоматическая хронологическая синхронизация (Temporal Intersection)** — по числовым полям `startYear` и `endYear`.
2. **Явная причинно-следственная синхронизация (Causal Cross-Branch Linking)** — через секцию `crossLinks` в файле `data/sync.manifest.json`.

### 2.1. Спецификация файла синхронизации (`data/sync.manifest.json`)
Файл синхронизации является входной точкой данных и решает 3 задачи:
* Задает единую систему координат (`timeAxis: { minYear: 1686, maxYear: 2026 }`) и границы макроэпох (`macroEras`), от которых на графе расходятся ветки нового этапа.
* Хранит реестр подключенных файлов (`mountedFiles`), определяя, какие файлы включены по умолчанию (`"enabled": true`).
* Определяет массив **`crossLinks`** — направленные причинно-следственные связи между ID событий из разных файлов.

```json
{
  "$schema": "https://git-timeline.schema.org/v2/sync-manifest.json",
  "project": "Russian Military & Geopolitical Git-Timeline (1686–2026)",
  "schemaVersion": "2.0.0",
  "timeAxis": {
    "minYear": 1686,
    "maxYear": 2026,
    "resolution": "year",
    "overlapRule": "inclusive_interval"
  },
  "mountedFiles": [
    {
      "fileId": "rulers",
      "path": "data/rulers.json",
      "role": "trunk",
      "branchIds": ["MAIN_RULERS"],
      "title": "Шкала правителей России (1686–2026)",
      "enabled": true
    },
    {
      "fileId": "wars",
      "path": "data/wars.json",
      "role": "military_branches",
      "branchIds": ["SEAS", "PERIPHERY", "INTERNAL_BUFFER"],
      "title": "Военные конфликты, походы и силовые операции (80+)",
      "enabled": true
    },
    {
      "fileId": "economics",
      "path": "data/economics.json",
      "role": "thematic_branch",
      "branchIds": ["REFORMS_ECO"],
      "title": "Экономика, финансы и военные реформы",
      "enabled": true
    }
  ],
  "crossLinks": [
    {
      "id": "link-crimea-great-reforms",
      "from": "1853-crimean-war",
      "to": "1861-reform-emancipation",
      "type": "triggers",
      "label": "Поражение в Крымской войне вскрыло технологическое отставание и запустило Великие реформы Александра II и реформу Милютина"
    }
  ]
}
```

### 2.2. Спецификация файла стволовой шкалы правителей (`data/rulers.json`)
Отвечает за главную ветку `main/rulers`. Движок автоматически сопоставляет интервал `[startYear, endYear]` каждого правителя со всеми событиями из остальных файлов и определяет, сколько правителей сменилось в ходе каждой войны.

```json
{
  "$schema": "https://git-timeline.schema.org/v2/rulers-trunk.json",
  "fileId": "rulers",
  "path": "data/rulers.json",
  "version": "2.0.0",
  "branch": {
    "id": "MAIN_RULERS",
    "gitName": "main/rulers",
    "label": "Правители (Ствол)",
    "short": "main",
    "color": "#f59e0b"
  },
  "rulers": [
    {
      "id": "ruler-alexander-2",
      "eraId": "ERA_2",
      "ruler": "Александр II",
      "shortRuler": "Александр II",
      "reignPeriod": "1855–1881",
      "startYear": 1855,
      "endYear": 1881,
      "reignTitle": "Александр II: завершение Крымской и Кавказской войн, Великие реформы, покорение Туркестана",
      "reignThesis": "Парижский мир (1856), пленение Шамиля (1864), военная реформа Милютина и война 1877–1878 гг."
    }
  ]
}
```

### 2.3. Спецификация любого подключаемого файла ветки (`data/wars.json`, `data/economics.json`, `data/world.json`, `data/diplomacy.json`)
Таких файлов может быть сколько угодно. Достаточно описать метаданные ветки (`branch`) и массив событий (`nodes`):

```json
{
  "$schema": "https://git-timeline.schema.org/v2/branch.json",
  "fileId": "economics",
  "path": "data/economics.json",
  "version": "2.0.0",
  "branch": {
    "id": "REFORMS_ECO",
    "gitName": "feat/reforms-eco",
    "label": "Экономика и реформы",
    "short": "reforms/eco",
    "sourceFile": "data/economics.json",
    "description": "Военные, государственные и экономические реформы, модернизация и кризисы",
    "color": "#10b981",
    "badgeClass": "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    "isMilitary": false
  },
  "nodes": [
    {
      "id": "1861-reform-emancipation",
      "startYear": 1861,
      "endYear": 1874,
      "period": "1861–1874",
      "title": "Великие реформы Александра II и военная реформа Д. А. Милютина",
      "subtitle": "Отмена крепостного права (1861), продажа Аляски (1867) и введение всесословной воинской повинности (1874)",
      "details": "Поражение в Крымской войне запустило системную модернизацию...",
      "task": "REFORMS_ECO",
      "region": "Российская империя",
      "type": "Великие реформы"
    }
  ]
}
```

---

## 3. Как работать с модульной студией файлов и развернуть проект на GitHub Pages

### 3.1. Работа со студией файлов внутри дашборда (`📂 Файлы Git / JSON`)
В верхней закрепленной панели (и в шапке дашборда) расположена кнопка **`📂 Файлы Git / JSON`**:
1. **Вкладка «1. Раздельные файлы таймлайнов и sync.manifest.json»**:
   * Показывает все отдельные файлы (`data/sync.manifest.json`, `data/rulers.json`, `data/wars.json`, `data/economics.json`, `data/world.json`, `data/diplomacy.json`).
   * Позволяет в один клик **включать/отключать целый файл ветки** (`● Подключен` / `○ Отключен`), просматривать и редактировать его исходный JSON-код с живой перерисовкой графа, а также скачивать любой `.json` файл отдельно.
2. **Вкладка «2. + Динамически подключить внешнюю ветку (.json)»**:
   * Позволяет загрузить новый `.json` файл ветки с компьютера, подключить файл по прямой ссылке (например, из `raw.githubusercontent.com`) или протестировать подключение демонстрационного модуля **`data/diplomacy.json`**.
3. **Вкладка «3. 🚀 Экспорт набора файлов для GitHub Pages»**:
   * Позволяет скачать все раздельные JSON-файлы в один клик или скопировать готовый Node.js скрипт, который автоматически создаст папку `data/` и все файлы проекта для `git push`.

### 3.2. Пошаговая инструкция публикации на GitHub Pages
1. Создайте новый репозиторий на GitHub (например, `russia-history-git-timeline`).
2. Откройте в дашборде окно **`📂 Файлы Git / JSON` → вкладка «3. Экспорт набора файлов для GitHub Pages»**:
   * Либо скопируйте **Node.js генератор репозитория** и выполните `node setup.js` в папке вашего репозитория (он автоматически создаст папку `data/` со всеми JSON-файлами и `.nojekyll`).
   * Либо нажмите **«⬇ Скачать все JSON-файлы»** и поместите их в папку `data/` рядом с `index.html`.
3. Выполните коммит и отправку в GitHub:
   ```bash
   git add .
   git commit -m "feat: initial modular Git-timeline architecture for GitHub Pages"
   git push origin main
   ```
4. В настройках репозитория на GitHub перейдите в **Settings → Pages**, в разделе **Build and deployment** выберите `Deploy from a branch` → ветка `main` / папка `/ (root)` и нажмите **Save**.
5. Теперь каждый файл ветки (`data/rulers.json`, `data/wars.json`, `data/economics.json`, `data/world.json`, `data/diplomacy.json`) можно дорабатывать независимыми коммитами и Pull Request'ами, а для добавления новой исторической линии достаточно положить новый `.json` файл в папку `data/` и зарегистрировать его путь в `data/sync.manifest.json`.