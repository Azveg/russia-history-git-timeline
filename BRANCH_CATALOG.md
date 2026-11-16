# Динамический каталог веток и тегов (`BRANCH_CATALOG.md`)

> **Автогенерируемый файл.** Не редактируйте вручную — обновляется командой `npm run sync:catalog` или автоматически через GitHub Actions при изменении JSON-модулей в `public/data/`.
> Правила создания файлов, схема и системный промпт для ИИ находятся в [`BRANCH_SPEC.md`](./BRANCH_SPEC.md).

---

## 1. Сводка состояния базы

- **Модульных JSON-файлов:** 7
- **Объявленных веток:** 11 (групп: 2, листовых: 9)
- **Событий (nodes):** 234
- **Правлений (rulers):** 70
- **Фактический диапазон оси времени:** `862–2008`
- **Активных тегов (`syncTags` / `campaignId` / `referenceTags`):** 87
- **Явных связей (`crossLinks` + `linksTo`):** 65

---

## 2. Реестр текущих веток

| `id` | `gitName` | Название (`label`) | Родитель | Тип | Цвет | Старт | Узлов | Файл |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `DIPLOMACY_TREATIES` | `diplomacy/treaties` | Дипломатия и договоры | — | Тематическая | `#2dd4bf` | выкл (по умолч.) | 6 | `data/diplomacy.json` |
| `REFORMS_ECO` | `feat/reforms-eco` | Экономика и реформы | — | Тематическая | `#10b981` | выкл (по умолч.) | 15 | `data/economics.json` |
| `MAIN_RULERS` | `rulers/reigns` | Правители (ветвления) | — | Тематическая | `#f59e0b` | вкл (по умолч.) | 70 | `data/rulers.json` |
| `WAR_ALL` | `war/all` | Военные кампании (общая ветка) | — | Группа (`isGroup`) | `#f43f5e` | группа | 0 | `data/wars.json` |
| `SEAS` | `war/seas` | Войны: Выход к морям | `WAR_ALL` | Военная | `#38bdf8` | выкл (по умолч.) | 20 | `data/wars.json` |
| `PERIPHERY` | `war/periphery` | Войны: Имперская периферия | `WAR_ALL` | Военная | `#fb923c` | выкл (по умолч.) | 32 | `data/wars.json` |
| `INTERNAL_BUFFER` | `war/buffer-internal` | Войны: Восстания и буферные зоны | `WAR_ALL` | Военная | `#f43f5e` | выкл (по умолч.) | 44 | `data/wars.json` |
| `WORLD_CONTEXT` | `world/events` | События в других странах | — | Тематическая | `#a855f7` | выкл (по умолч.) | 14 | `data/world.json` |
| `LITERATURE_ALL` | `lit/all` | Литература: писатели и произведения (общая) | — | Группа (`isGroup`) | `#d946ef` | свёрнута | 0 | `data/writers_bio.json` |
| `WRITERS_BIO` | `culture/writers` | Русские писатели-классики | `LITERATURE_ALL` | Тематическая | `#e879f9` | выкл (по умолч.) | 32 | `data/writers_bio.json` |
| `WRITERS_WORKS` | `culture/books` | Ключевые произведения литературы | `LITERATURE_ALL` | Тематическая | `#c084fc` | выкл (по умолч.) | 71 | `data/writers_works.json` |

---

## 3. Активные теги (`syncTags`, `campaignId`, `referenceTags`)

- **`syncTags` / `campaignId`**: синхронная авто-связь для узлов разных веток в окне **±3 года**.
- **`referenceTags`**: внеоконная отсылка (книги, фильмы, исследования) — связывается с носителем тега **через любое число лет** (50, 100+ лет).
- **Канонический тег любого события из раздела 6**: `event-<node.id>` (например, `event-1914-ww1`) работает автоматически даже без правки файла исходного события.

| Тег | Режим | Диапазон лет | Ветки (`task`) | События (`id`) |
| :--- | :---: | :---: | :--- | :--- |
| `era-1` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826) |
| `era-10` | ref (внеоконный) | 1917–1991 | `WRITERS_WORKS` | `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1917-tsvetaeva-lebediny-stan` (1917–1921), `1918-blok-dvenadtsat` (1918 (январь)), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1923-bulgakov-belaya-gvardiya` (1923–1925), `1924-tsvetaeva-poema-gory-kontsa` (1924–1926), `1925-bulgakov-sobachye-serdtse` (1925), `1925-sholokhov-tikhiy-don` (1925–1940), `1925-yesenin-anna-snegina` (1925), `1927-mayakovsky-khorosho` (1927), `1928-bulgakov-master-i-margarita` (1928–1940 (опубл. 1966)), `1932-sholokhov-podnyataya-tselina` (1932–1959), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1935-nabokov-dar` (1935–1938), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1956-sholokhov-sudba-cheloveka` (1956), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)), `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `era-2` | ref (внеоконный) | 1816–1908 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826), `1908-blok-na-pole-kulikovom` (1908) |
| `era-3` | ref (внеоконный) | 1816–1837 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826), `1825-pushkin-boris-godunov` (1825), `1837-lermontov-borodino-kalashnikov` (1837) |
| `era-4` | ref (внеоконный) | 1816–1842 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826), `1825-pushkin-boris-godunov` (1825), `1835-gogol-taras-bulba` (1835–1842) |
| `era-5` | ref (внеоконный) | 1833–1833 | `WRITERS_WORKS` | `1833-pushkin-medny-vsadnik` (1833) |
| `era-6` | ref (внеоконный) | 1869–1870 | `WRITERS_WORKS` | `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870) |
| `era-7` | ref (внеоконный) | 1782–1921 | `WRITERS_WORKS` | `1782-derzhavin-felitsa` (1782), `1782-fonvizin-nedorosl` (1782), `1791-derzhavin-vodopad` (1791–1794), `1812-krylov-basni-1812` (1811–1812), `1812-zhukovsky-svetlana-pevets` (1812), `1822-griboedov-gore-ot-uma` (1822–1824), `1823-pushkin-evgeny-onegin` (1823–1831), `1842-gogol-mertvye-dushi` (1835–1842), `1836-gogol-revizor` (1836), `1836-pushkin-kapitanskaya-dochka` (1836), `1837-lermontov-borodino-kalashnikov` (1837), `1840-lermontov-geroy-nashego-vremeni` (1838–1840), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1863-tolstoy-voyna-i-mir` (1863–1869), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1871-nekrasov-russkie-zhenshchiny` (1871–1872), `1881-leskov-levsha` (1881), `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)), `1921-yesenin-pugachev` (1921) |
| `era-8` | ref (внеоконный) | 1847–1938 | `WRITERS_WORKS` | `1847-turgenev-zapiski-okhotnika` (1847–1852), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1858-goncharov-fregat-pallada` (1855–1858), `1859-goncharov-oblomov` (1859), `1859-ostrovsky-groza` (1859), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1862-turgenev-ottsy-i-deti` (1862), `1863-nekrasov-komu-na-rusi` (1863–1877), `1866-dostoevsky-prestuplenie-i-nakazanie` (1866), `1866-tyutchev-umom-rossiyu-ne-ponyat` (1866), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1871-dostoevsky-besy` (1871–1872), `1873-leskov-ocharovanny-strannik` (1873), `1873-tolstoy-anna-karenina` (1873–1877), `1875-shchedrin-gospoda-golovlevy` (1875–1880), `1878-ostrovsky-bespridannitsa` (1878), `1879-dostoevsky-bratya-karamazovy` (1879–1880), `1883-fet-vechernie-ogni` (1883–1891), `1892-chekhov-palata-6-sakhalin` (1892–1895), `1935-nabokov-dar` (1935–1938) |
| `era-9` | ref (внеоконный) | 1896–1991 | `WRITERS_WORKS` | `1896-chekhov-chayka-tri-sestry` (1896–1901), `1902-gorky-na-dne` (1902), `1903-chekhov-vishnevy-sad` (1903–1904), `1906-gorky-mat` (1906–1907), `1908-blok-na-pole-kulikovom` (1908), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1925-sholokhov-tikhiy-don` (1925–1940), `1925-yesenin-anna-snegina` (1925), `1926-nabokov-mashenka` (1926), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `event-1700-northern-war` | ref (внеоконный) | 1833–1833 | `WRITERS_WORKS` | `1833-pushkin-medny-vsadnik` (1833) |
| `event-1721-nystad-treaty` | ref (внеоконный) | 1833–1833 | `WRITERS_WORKS` | `1833-pushkin-medny-vsadnik` (1833) |
| `event-1773-pugachev` | ref (внеоконный) | 1836–1921 | `WRITERS_WORKS` | `1836-pushkin-kapitanskaya-dochka` (1836), `1921-yesenin-pugachev` (1921) |
| `event-1787-rus-turk` | ref (внеоконный) | 1791–1794 | `WRITERS_WORKS` | `1791-derzhavin-vodopad` (1791–1794) |
| `event-1801-caucasian-war` | ref (внеоконный) | 1838–1904 | `WRITERS_WORKS` | `1840-lermontov-geroy-nashego-vremeni` (1838–1840), `1873-leskov-ocharovanny-strannik` (1873), `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)) |
| `event-1805-coalitions-3-4` | ref (внеоконный) | 1863–1869 | `WRITERS_WORKS` | `1863-tolstoy-voyna-i-mir` (1863–1869) |
| `event-1807-tilsit-treaty` | ref (внеоконный) | 1863–1869 | `WRITERS_WORKS` | `1863-tolstoy-voyna-i-mir` (1863–1869) |
| `event-1812-patriotic-war` | ref (внеоконный) | 1811–1869 | `WRITERS_WORKS` | `1812-krylov-basni-1812` (1811–1812), `1812-zhukovsky-svetlana-pevets` (1812), `1837-lermontov-borodino-kalashnikov` (1837), `1863-tolstoy-voyna-i-mir` (1863–1869) |
| `event-1825-decembrists` | ref (внеоконный) | 1822–1872 | `WRITERS_WORKS` | `1822-griboedov-gore-ot-uma` (1822–1824), `1863-tolstoy-voyna-i-mir` (1863–1869), `1871-nekrasov-russkie-zhenshchiny` (1871–1872) |
| `event-1853-crimean-war` | ref (внеоконный) | 1855–1881 | `WRITERS_WORKS` | `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1858-goncharov-fregat-pallada` (1855–1858), `1881-leskov-levsha` (1881) |
| `event-1861-reform-emancipation` | ref (внеоконный) | 1847–1877 | `WRITERS_WORKS` | `1847-turgenev-zapiski-okhotnika` (1847–1852), `1859-goncharov-oblomov` (1859), `1862-turgenev-ottsy-i-deti` (1862), `1863-nekrasov-komu-na-rusi` (1863–1877) |
| `event-1877-rus-turk` | ref (внеоконный) | 1873–1877 | `WRITERS_WORKS` | `1873-tolstoy-anna-karenina` (1873–1877) |
| `event-1905-first-revolution` | ref (внеоконный) | 1906–1955 | `WRITERS_WORKS` | `1906-gorky-mat` (1906–1907), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)) |
| `event-1906-reform-stolypin` | ref (внеоконный) | 1971–1991 | `WRITERS_WORKS` | `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `event-1914-ww1` | ref (внеоконный) | 1914–1991 | `WRITERS_WORKS` | `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1925-sholokhov-tikhiy-don` (1925–1940), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `event-1917-civil-war` | ref (внеоконный) | 1917–1991 | `WRITERS_WORKS` | `1917-tsvetaeva-lebediny-stan` (1917–1921), `1918-blok-dvenadtsat` (1918 (январь)), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1923-bulgakov-belaya-gvardiya` (1923–1925), `1925-sholokhov-tikhiy-don` (1925–1940), `1925-yesenin-anna-snegina` (1925), `1926-nabokov-mashenka` (1926), `1927-mayakovsky-khorosho` (1927), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `event-1918-reform-war-communism` | ref (внеоконный) | 1918–1925 | `WRITERS_WORKS` | `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1925-bulgakov-sobachye-serdtse` (1925) |
| `event-1920-peasant-uprisings` | ref (внеоконный) | 1921–1940 | `WRITERS_WORKS` | `1921-yesenin-pugachev` (1921), `1925-sholokhov-tikhiy-don` (1925–1940) |
| `event-1928-reform-five-year` | ref (внеоконный) | 1932–1973 | `WRITERS_WORKS` | `1932-sholokhov-podnyataya-tselina` (1932–1959), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)) |
| `event-1941-ww2` | ref (внеоконный) | 1940–1973 | `WRITERS_WORKS` | `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1956-sholokhov-sudba-cheloveka` (1956), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)) |
| `napoleonic` | sync + ref | 1807–1869 | `DIPLOMACY_TREATIES`, `INTERNAL_BUFFER`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1807-tilsit-treaty` (1807 (июнь)), `1812-krylov-basni-1812` (1811–1812), `1812-patriotic-war` (1812), `1812-zhukovsky-svetlana-pevets` (1812), `1813-foreign-campaigns` (1813–1814 (и 1815)), `1815-world-vienna` (1814–1815), `1837-lermontov-borodino-kalashnikov` (1837), `1863-tolstoy-voyna-i-mir` (1863–1869) |
| `northern-war` | sync + ref | 1700–1833 | `DIPLOMACY_TREATIES`, `SEAS`, `WRITERS_WORKS` | `1700-northern-war` (1700–1721), `1721-nystad-treaty` (1721 (август)), `1833-pushkin-medny-vsadnik` (1833) |
| `person-akhmatova-anna` | sync (±3 г.) | 1889–1966 | `WRITERS_BIO`, `WRITERS_WORKS` | `1889-akhmatova-anna` (1889–1966), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1940-akhmatova-poema-bez-geroya` (1940–1962) |
| `person-blok-alexander` | sync (±3 г.) | 1880–1921 | `WRITERS_BIO`, `WRITERS_WORKS` | `1880-blok-alexander` (1880–1921), `1908-blok-na-pole-kulikovom` (1908), `1918-blok-dvenadtsat` (1918 (январь)) |
| `person-bulgakov-mikhail` | sync (±3 г.) | 1891–1940 | `WRITERS_BIO`, `WRITERS_WORKS` | `1891-bulgakov-mikhail` (1891–1940), `1923-bulgakov-belaya-gvardiya` (1923–1925), `1925-bulgakov-sobachye-serdtse` (1925), `1928-bulgakov-master-i-margarita` (1928–1940 (опубл. 1966)) |
| `person-bunin-ivan` | sync (±3 г.) | 1870–1953 | `WRITERS_BIO`, `WRITERS_WORKS` | `1870-bunin-ivan` (1870–1953), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)) |
| `person-chekhov-anton` | sync (±3 г.) | 1860–1904 | `WRITERS_BIO`, `WRITERS_WORKS` | `1860-chekhov-anton` (1860–1904), `1892-chekhov-palata-6-sakhalin` (1892–1895), `1896-chekhov-chayka-tri-sestry` (1896–1901), `1903-chekhov-vishnevy-sad` (1903–1904) |
| `person-derzhavin-gavrila` | sync (±3 г.) | 1743–1816 | `WRITERS_BIO`, `WRITERS_WORKS` | `1743-derzhavin-gavrila` (1743–1816), `1782-derzhavin-felitsa` (1782), `1791-derzhavin-vodopad` (1791–1794) |
| `person-dostoevsky-fyodor` | sync (±3 г.) | 1821–1881 | `WRITERS_BIO`, `WRITERS_WORKS` | `1821-dostoevsky-fyodor` (1821–1881), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1866-dostoevsky-prestuplenie-i-nakazanie` (1866), `1871-dostoevsky-besy` (1871–1872), `1879-dostoevsky-bratya-karamazovy` (1879–1880) |
| `person-fet-afanasy` | sync (±3 г.) | 1820–1892 | `WRITERS_BIO`, `WRITERS_WORKS` | `1820-fet-afanasy` (1820–1892), `1850-fet-shepot-robkoe-dykhanie` (1850), `1883-fet-vechernie-ogni` (1883–1891) |
| `person-fonvizin-denis` | sync (±3 г.) | 1745–1792 | `WRITERS_BIO`, `WRITERS_WORKS` | `1745-fonvizin-denis` (1745–1792), `1782-fonvizin-nedorosl` (1782) |
| `person-gogol-nikolay` | sync (±3 г.) | 1809–1852 | `WRITERS_BIO`, `WRITERS_WORKS` | `1809-gogol-nikolay` (1809–1852), `1835-gogol-taras-bulba` (1835–1842), `1842-gogol-mertvye-dushi` (1835–1842), `1836-gogol-revizor` (1836) |
| `person-goncharov-ivan` | sync (±3 г.) | 1812–1891 | `WRITERS_BIO`, `WRITERS_WORKS` | `1812-goncharov-ivan` (1812–1891), `1858-goncharov-fregat-pallada` (1855–1858), `1859-goncharov-oblomov` (1859) |
| `person-gorky-maxim` | sync (±3 г.) | 1868–1936 | `WRITERS_BIO`, `WRITERS_WORKS` | `1868-gorky-maxim` (1868–1936), `1902-gorky-na-dne` (1902), `1906-gorky-mat` (1906–1907) |
| `person-griboedov-aleksandr` | sync (±3 г.) | 1795–1829 | `WRITERS_BIO`, `WRITERS_WORKS` | `1795-griboedov-aleksandr` (1795–1829), `1822-griboedov-gore-ot-uma` (1822–1824) |
| `person-karamzin-nikolay` | sync (±3 г.) | 1766–1826 | `WRITERS_BIO`, `WRITERS_WORKS` | `1766-karamzin-nikolay` (1766–1826), `1792-karamzin-bednaya-liza` (1792), `1816-karamzin-history-state` (1816–1826) |
| `person-krylov-ivan` | sync (±3 г.) | 1769–1844 | `WRITERS_BIO`, `WRITERS_WORKS` | `1769-krylov-ivan` (1769–1844), `1812-krylov-basni-1812` (1811–1812) |
| `person-lermontov-mikhail` | sync (±3 г.) | 1814–1841 | `WRITERS_BIO`, `WRITERS_WORKS` | `1814-lermontov-mikhail` (1814–1841), `1837-lermontov-borodino-kalashnikov` (1837), `1840-lermontov-geroy-nashego-vremeni` (1838–1840) |
| `person-leskov-nikolay` | sync (±3 г.) | 1831–1895 | `WRITERS_BIO`, `WRITERS_WORKS` | `1831-leskov-nikolay` (1831–1895), `1873-leskov-ocharovanny-strannik` (1873), `1881-leskov-levsha` (1881) |
| `person-mayakovsky-vladimir` | sync (±3 г.) | 1893–1930 | `WRITERS_BIO`, `WRITERS_WORKS` | `1893-mayakovsky-vladimir` (1893–1930), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1927-mayakovsky-khorosho` (1927) |
| `person-nabokov-vladimir` | sync (±3 г.) | 1899–1977 | `WRITERS_BIO`, `WRITERS_WORKS` | `1899-nabokov-vladimir` (1899–1977), `1926-nabokov-mashenka` (1926), `1935-nabokov-dar` (1935–1938) |
| `person-nekrasov-nikolay` | sync (±3 г.) | 1821–1878 | `WRITERS_BIO`, `WRITERS_WORKS` | `1821-nekrasov-nikolay` (1821–1878), `1863-nekrasov-komu-na-rusi` (1863–1877), `1871-nekrasov-russkie-zhenshchiny` (1871–1872) |
| `person-ostrovsky-aleksandr` | sync (±3 г.) | 1823–1886 | `WRITERS_BIO`, `WRITERS_WORKS` | `1823-ostrovsky-aleksandr` (1823–1886), `1859-ostrovsky-groza` (1859), `1878-ostrovsky-bespridannitsa` (1878) |
| `person-pasternak-boris` | sync (±3 г.) | 1890–1960 | `WRITERS_BIO`, `WRITERS_WORKS` | `1890-pasternak-boris` (1890–1960), `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)) |
| `person-pushkin-alexander` | sync + ref | 1799–1938 | `WRITERS_BIO`, `WRITERS_WORKS` | `1799-pushkin-alexander` (1799–1837), `1823-pushkin-evgeny-onegin` (1823–1831), `1825-pushkin-boris-godunov` (1825), `1833-pushkin-medny-vsadnik` (1833), `1836-pushkin-kapitanskaya-dochka` (1836), `1935-nabokov-dar` (1935–1938) |
| `person-saltykov-shchedrin-mikhail` | sync (±3 г.) | 1826–1889 | `WRITERS_BIO`, `WRITERS_WORKS` | `1826-saltykov-shchedrin-mikhail` (1826–1889), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1875-shchedrin-gospoda-golovlevy` (1875–1880) |
| `person-sholokhov-mikhail` | sync (±3 г.) | 1905–1984 | `WRITERS_BIO`, `WRITERS_WORKS` | `1905-sholokhov-mikhail` (1905–1984), `1925-sholokhov-tikhiy-don` (1925–1940), `1932-sholokhov-podnyataya-tselina` (1932–1959), `1956-sholokhov-sudba-cheloveka` (1956) |
| `person-solzhenitsyn-alexander` | sync (±3 г.) | 1918–2008 | `WRITERS_BIO`, `WRITERS_WORKS` | `1918-solzhenitsyn-alexander` (1918–2008), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)), `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `person-tolstoy-leo` | sync (±3 г.) | 1828–1910 | `WRITERS_BIO`, `WRITERS_WORKS` | `1828-tolstoy-leo` (1828–1910), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1863-tolstoy-voyna-i-mir` (1863–1869), `1873-tolstoy-anna-karenina` (1873–1877), `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)) |
| `person-tsvetaeva-marina` | sync (±3 г.) | 1892–1941 | `WRITERS_BIO`, `WRITERS_WORKS` | `1892-tsvetaeva-marina` (1892–1941), `1917-tsvetaeva-lebediny-stan` (1917–1921), `1924-tsvetaeva-poema-gory-kontsa` (1924–1926) |
| `person-turgenev-ivan` | sync (±3 г.) | 1818–1883 | `WRITERS_BIO`, `WRITERS_WORKS` | `1818-turgenev-ivan` (1818–1883), `1847-turgenev-zapiski-okhotnika` (1847–1852), `1862-turgenev-ottsy-i-deti` (1862) |
| `person-tyutchev-fyodor` | sync (±3 г.) | 1803–1873 | `WRITERS_BIO`, `WRITERS_WORKS` | `1803-tyutchev-fyodor` (1803–1873), `1830-tyutchev-silentium` (1830), `1866-tyutchev-umom-rossiyu-ne-ponyat` (1866) |
| `person-yesenin-sergey` | sync (±3 г.) | 1895–1925 | `WRITERS_BIO`, `WRITERS_WORKS` | `1895-yesenin-sergey` (1895–1925), `1921-yesenin-pugachev` (1921), `1925-yesenin-anna-snegina` (1925) |
| `person-zhukovsky-vasily` | sync (±3 г.) | 1783–1852 | `WRITERS_BIO`, `WRITERS_WORKS` | `1783-zhukovsky-vasily` (1783–1852), `1812-zhukovsky-svetlana-pevets` (1812) |
| `ruler-alexander-1` | ref (внеоконный) | 1811–1881 | `WRITERS_WORKS` | `1812-krylov-basni-1812` (1811–1812), `1812-zhukovsky-svetlana-pevets` (1812), `1822-griboedov-gore-ot-uma` (1822–1824), `1823-pushkin-evgeny-onegin` (1823–1831), `1837-lermontov-borodino-kalashnikov` (1837), `1863-tolstoy-voyna-i-mir` (1863–1869), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1881-leskov-levsha` (1881) |
| `ruler-alexander-2` | ref (внеоконный) | 1847–1880 | `WRITERS_WORKS` | `1847-turgenev-zapiski-okhotnika` (1847–1852), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1858-goncharov-fregat-pallada` (1855–1858), `1859-goncharov-oblomov` (1859), `1859-ostrovsky-groza` (1859), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1862-turgenev-ottsy-i-deti` (1862), `1863-nekrasov-komu-na-rusi` (1863–1877), `1866-dostoevsky-prestuplenie-i-nakazanie` (1866), `1866-tyutchev-umom-rossiyu-ne-ponyat` (1866), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1871-dostoevsky-besy` (1871–1872), `1873-leskov-ocharovanny-strannik` (1873), `1873-tolstoy-anna-karenina` (1873–1877), `1875-shchedrin-gospoda-golovlevy` (1875–1880), `1878-ostrovsky-bespridannitsa` (1878), `1879-dostoevsky-bratya-karamazovy` (1879–1880) |
| `ruler-alexander-3` | ref (внеоконный) | 1883–1895 | `WRITERS_WORKS` | `1883-fet-vechernie-ogni` (1883–1891), `1892-chekhov-palata-6-sakhalin` (1892–1895) |
| `ruler-boris-godunov` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826), `1825-pushkin-boris-godunov` (1825) |
| `ruler-catherine-2` | ref (внеоконный) | 1782–1921 | `WRITERS_WORKS` | `1782-derzhavin-felitsa` (1782), `1782-fonvizin-nedorosl` (1782), `1791-derzhavin-vodopad` (1791–1794), `1836-pushkin-kapitanskaya-dochka` (1836), `1921-yesenin-pugachev` (1921) |
| `ruler-dmitry-donskoy` | ref (внеоконный) | 1816–1908 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826), `1908-blok-na-pole-kulikovom` (1908) |
| `ruler-false-dmitry-1` | ref (внеоконный) | 1825–1825 | `WRITERS_WORKS` | `1825-pushkin-boris-godunov` (1825) |
| `ruler-ivan-3` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826) |
| `ruler-ivan-4` | ref (внеоконный) | 1816–1837 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826), `1837-lermontov-borodino-kalashnikov` (1837) |
| `ruler-khrushchev` | ref (внеоконный) | 1956–1962 | `WRITERS_WORKS` | `1956-sholokhov-sudba-cheloveka` (1956), `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)) |
| `ruler-lenin` | ref (внеоконный) | 1917–1973 | `WRITERS_WORKS` | `1917-tsvetaeva-lebediny-stan` (1917–1921), `1918-blok-dvenadtsat` (1918 (январь)), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1923-bulgakov-belaya-gvardiya` (1923–1925), `1925-sholokhov-tikhiy-don` (1925–1940), `1925-yesenin-anna-snegina` (1925), `1927-mayakovsky-khorosho` (1927), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)) |
| `ruler-nicholas-1` | ref (внеоконный) | 1823–1904 | `WRITERS_WORKS` | `1823-pushkin-evgeny-onegin` (1823–1831), `1842-gogol-mertvye-dushi` (1835–1842), `1836-gogol-revizor` (1836), `1840-lermontov-geroy-nashego-vremeni` (1838–1840), `1847-turgenev-zapiski-okhotnika` (1847–1852), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1858-goncharov-fregat-pallada` (1855–1858), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1871-nekrasov-russkie-zhenshchiny` (1871–1872), `1881-leskov-levsha` (1881), `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)) |
| `ruler-nicholas-2` | ref (внеоконный) | 1896–1991 | `WRITERS_WORKS` | `1896-chekhov-chayka-tri-sestry` (1896–1901), `1902-gorky-na-dne` (1902), `1903-chekhov-vishnevy-sad` (1903–1904), `1906-gorky-mat` (1906–1907), `1908-blok-na-pole-kulikovom` (1908), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1925-sholokhov-tikhiy-don` (1925–1940), `1926-nabokov-mashenka` (1926), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `ruler-paul-1` | ref (внеоконный) | 1869–1870 | `WRITERS_WORKS` | `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870) |
| `ruler-peter-1` | ref (внеоконный) | 1833–1833 | `WRITERS_WORKS` | `1833-pushkin-medny-vsadnik` (1833) |
| `ruler-provisional-govt` | ref (внеоконный) | 1917–1991 | `WRITERS_WORKS` | `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1925-yesenin-anna-snegina` (1925), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `ruler-ryurik` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826) |
| `ruler-stalin` | ref (внеоконный) | 1924–1973 | `WRITERS_WORKS` | `1924-tsvetaeva-poema-gory-kontsa` (1924–1926), `1925-bulgakov-sobachye-serdtse` (1925), `1927-mayakovsky-khorosho` (1927), `1928-bulgakov-master-i-margarita` (1928–1940 (опубл. 1966)), `1932-sholokhov-podnyataya-tselina` (1932–1959), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1956-sholokhov-sudba-cheloveka` (1956), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)), `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)) |
| `ruler-vladimir-1` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826) |
| `ruler-yaroslav-wise` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826) |
| `topic-silver-age` | sync (±3 г.) | 1870–1966 | `WRITERS_BIO`, `WRITERS_WORKS` | `1870-bunin-ivan` (1870–1953), `1880-blok-alexander` (1880–1921), `1889-akhmatova-anna` (1889–1966), `1890-pasternak-boris` (1890–1960), `1892-tsvetaeva-marina` (1892–1941), `1893-mayakovsky-vladimir` (1893–1930), `1895-yesenin-sergey` (1895–1925), `1908-blok-na-pole-kulikovom` (1908), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1917-tsvetaeva-lebediny-stan` (1917–1921), `1918-blok-dvenadtsat` (1918 (январь)), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1921-yesenin-pugachev` (1921), `1924-tsvetaeva-poema-gory-kontsa` (1924–1926), `1925-yesenin-anna-snegina` (1925), `1927-mayakovsky-khorosho` (1927), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)) |
| `ww1` | sync + ref | 1914–1991 | `SEAS`, `WRITERS_WORKS` | `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1914-ww1` (1914–1918), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1925-sholokhov-tikhiy-don` (1925–1940), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `ww2` | sync + ref | 1918–1962 | `DIPLOMACY_TREATIES`, `INTERNAL_BUFFER`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1918-brest-molotov` (1918 / 1939), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1941-ww2` (1941–1945), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1945-world-yalta-nato` (1945–1949), `1956-sholokhov-sudba-cheloveka` (1956) |

---

## 4. Макро-периоды (`ERA_1`–`ERA_11`) и наполнение

| `id` | Диапазон | Название | Событий | Правителей |
| :--- | :--- | :--- | :---: | :---: |
| `ERA_1` | до 1223 | Период I: Генезис и Древняя Русь | 0 | 25 |
| `ERA_2` | 1223–1462 | Период II: Эпоха монгольского владычества | 0 | 18 |
| `ERA_3` | 1462–1605 | Период III: Между Азией и Европой | 0 | 6 |
| `ERA_4` | 1605–1682 | Период IV: Век Смуты и первых Романовых | 0 | 7 |
| `ERA_5` | 1682–1725 | Период V: Азиатская европеизация | 14 | 1 |
| `ERA_6` | 1725–1762 | Период VI: Эпоха цариц | 10 | 4 |
| `ERA_7` | 1762–1855 | Период VII: Первая сверхдержава | 80 | 4 |
| `ERA_8` | 1855–1894 | Период VIII: Эпоха Великих реформ | 49 | 2 |
| `ERA_9` | 1894–1917 | Период IX: Агония и крах империи | 33 | 2 |
| `ERA_10` | 1917–1992 | Период X: СССР | 85 | 7 |
| `ERA_11` | 1992–2000 | Период XI: Новая история | 10 | 1 |

---

## 5. Справочник ID правителей (`rulers.json`)

| `id` | Годы | Центр | Правитель | Период |
| :--- | :--- | :--- | :--- | :---: |
| `ruler-ryurik` | 862–879 | Ладога / Новгород | Рюрик | `ERA_1` |
| `ruler-oleg` | 879–912 | Древняя Русь | Олег Вещий | `ERA_1` |
| `ruler-igor` | 912–945 | Древняя Русь | Игорь Рюрикович | `ERA_1` |
| `ruler-olga` | 945–960 | Древняя Русь | Княгиня Ольга (регентство) | `ERA_1` |
| `ruler-svyatoslav` | 960–972 | Древняя Русь | Святослав Игоревич | `ERA_1` |
| `ruler-yaropolk-1` | 972–978 | Древняя Русь | Ярополк Святославич | `ERA_1` |
| `ruler-vladimir-1` | 978–1015 | Древняя Русь | Владимир I Святой | `ERA_1` |
| `ruler-svyatopolk-1` | 1015–1019 | Древняя Русь | Святополк I Окаянный | `ERA_1` |
| `ruler-yaroslav-wise` | 1019–1054 | Древняя Русь | Ярослав Мудрый | `ERA_1` |
| `ruler-mstislav-chernigov` | 1024–1036 | Чернигов / Тмутаракань | Мстислав Владимирович Храбрый (соправитель по Днепру) | `ERA_1` |
| `ruler-yaroslavichi` | 1054–1093 | Древняя Русь | Триумвират Ярославичей (Изяслав, Святослав, Всеволод) | `ERA_1` |
| `ruler-svyatopolk-2` | 1093–1113 | Древняя Русь | Святополк II Изяславич | `ERA_1` |
| `ruler-vladimir-monomakh` | 1113–1125 | Древняя Русь | Владимир II Мономах | `ERA_1` |
| `ruler-mstislav-great` | 1125–1132 | Древняя Русь | Мстислав I Великий | `ERA_1` |
| `ruler-yuri-dolgoruky` | 1125–1157 | Владимир / Суздаль | Юрий Долгорукий (Северо-Восточная Русь) | `ERA_1` |
| `ruler-kiev-fragmentation-1` | 1132–1159 | Киев | Ярополк II, Всеволод Ольгович и Изяслав Мстиславич (борьба за Киев) | `ERA_1` |
| `ruler-novgorod-republic-1` | 1136–1236 | Новгород | Новгородская боярская республика (становление веча и посадничества) | `ERA_1` |
| `ruler-yaroslav-osmomysl` | 1153–1199 | Галич-Волынь | Ярослав Осмомысл и Волынские князья | `ERA_1` |
| `ruler-andrey-bogolyubsky` | 1157–1174 | Владимир | Андрей Боголюбский | `ERA_1` |
| `ruler-kiev-rostislav-svyatoslav` | 1159–1210 | Киев | Ростислав Мстиславич, Святослав Всеволодович и Рюрик Ростиславич | `ERA_1` |
| `ruler-vsevolod-big-nest` | 1176–1212 | Владимир | Всеволод III Большое Гнездо | `ERA_1` |
| `ruler-roman-mstislavich` | 1199–1205 | Галич-Волынь | Роман Мстиславич Галицкий | `ERA_1` |
| `ruler-daniil-galitsky` | 1205–1264 | Галич-Волынь | Даниил Романович Галицкий | `ERA_2` |
| `ruler-kiev-last-princes` | 1212–1240 | Киев | Мстислав Романович, Владимир Рюрикович и Михаил Черниговский | `ERA_2` |
| `ruler-yuri-vsevolodovich` | 1212–1238 | Владимир | Юрий II Всеволодович | `ERA_1` |
| `ruler-novgorod-republic-2` | 1236–1380 | Новгород | Новгородская республика в эпоху Орды и Запада (Совет господ и князья) | `ERA_2` |
| `ruler-yaroslav-2-vladimir` | 1238–1246 | Владимир | Ярослав II Всеволодович | `ERA_2` |
| `ruler-kiev-post-invasion` | 1240–1362 | Киев | Киевское княжество под властью Орды и переход к Литве (до 1362 г.) | `ERA_2` |
| `ruler-alexander-nevsky` | 1252–1263 | Владимир / Новгород | Александр Ярославич Невский | `ERA_2` |
| `ruler-vladimir-yaroslavichi` | 1263–1304 | Владимир / Тверь | Ярослав, Василий Костромской, Дмитрий и Андрей (борьба за великий стол) | `ERA_2` |
| `ruler-galich-volhynia-late` | 1264–1349 | Галич-Волынь | Лев Данилович, Юрий Львович и преемники до раздела Галиции и Волыни | `ERA_2` |
| `ruler-daniil-yuri-moscow` | 1276–1325 | Москва | Даниил Александрович и Юрий Данилович Московские | `ERA_2` |
| `ruler-mikhail-alexander-tver` | 1304–1328 | Владимир / Тверь | Михаил Ярославич Тверской, Дмитрий Грозные Очи и Александр Михайлович | `ERA_2` |
| `ruler-ivan-kalita` | 1325–1340 | Москва | Иван I Данилович Калита | `ERA_2` |
| `ruler-simeon-ivan2` | 1340–1359 | Москва | Симеон Гордый и Иван II Красный | `ERA_2` |
| `ruler-dmitry-donskoy` | 1359–1389 | Москва | Дмитрий Иванович Донской | `ERA_2` |
| `ruler-novgorod-republic-3` | 1380–1478 | Новгород | Поздняя Новгородская республика (балансирование между Москвой и Литвой) | `ERA_2` |
| `ruler-vasily-1` | 1389–1425 | Москва | Василий I Дмитриевич | `ERA_2` |
| `ruler-vasily-2` | 1425–1462 | Москва | Василий II Тёмный | `ERA_2` |
| `ruler-ivan-3` | 1462–1505 | Русское государство | Иван III Великий | `ERA_3` |
| `ruler-vasily-3` | 1505–1533 | Русское государство | Василий III | `ERA_3` |
| `ruler-ivan-4` | 1533–1584 | Русское царство | Иван IV Грозный (и регентство Елены Глинской 1533–1538) | `ERA_3` |
| `ruler-fyodor-1` | 1584–1598 | Русское царство | Фёдор I Иоаннович | `ERA_3` |
| `ruler-boris-godunov` | 1598–1605 | Русское царство | Борис Фёдорович Годунов | `ERA_3` |
| `ruler-false-dmitry-1` | 1605–1606 | Москва (Смута) | Лжедмитрий I (и Фёдор II Годунов в 1605) | `ERA_4` |
| `ruler-vasily-shuysky` | 1606–1610 | Москва (Смута) | Василий IV Шуйский | `ERA_4` |
| `ruler-tushino-camp` | 1607–1610 | Тушино (Смута) | Лжедмитрий II («Тушинский вор») | `ERA_4` |
| `ruler-semiboyarshchina` | 1610–1613 | Междуцарствие (Смута) | Семибоярщина и Земские ополчения (Минин и Пожарский) | `ERA_4` |
| `ruler-mikhail-romanov` | 1613–1645 | Русское царство | Михаил Фёдорович Романов | `ERA_4` |
| `ruler-alexei-mikhailovich` | 1645–1676 | Русское царство | Алексей Михайлович | `ERA_4` |
| `ruler-fyodor-3` | 1676–1682 | Русское царство | Фёдор III Алексеевич | `ERA_4` |
| `ruler-peter-1` | 1682–1725 | Русское царство / Империя | Петр I (до 1696 г. соправитель с Иваном V при регентстве Софьи 1682–1689) | `ERA_5` |
| `ruler-catherine1-peter2` | 1725–1730 | Российская империя | Екатерина I и Петр II | `ERA_6` |
| `ruler-anna` | 1730–1741 | Российская империя | Анна Иоанновна (и Иван VI) | `ERA_6` |
| `ruler-elizabeth` | 1741–1761 | Российская империя | Елизавета Петровна | `ERA_6` |
| `ruler-peter-3` | 1761–1762 | Российская империя | Петр III | `ERA_6` |
| `ruler-catherine-2` | 1762–1796 | Российская империя | Екатерина II | `ERA_7` |
| `ruler-paul-1` | 1796–1801 | Российская империя | Павел I | `ERA_7` |
| `ruler-alexander-1` | 1801–1825 | Российская империя | Александр I | `ERA_7` |
| `ruler-nicholas-1` | 1825–1855 | Российская империя | Николай I | `ERA_7` |
| `ruler-alexander-2` | 1855–1881 | Российская империя | Александр II | `ERA_8` |
| `ruler-alexander-3` | 1881–1894 | Российская империя | Александр III | `ERA_8` |
| `ruler-nicholas-2` | 1894–1917 | Российская империя | Николай II | `ERA_9` |
| `ruler-provisional-govt` | 1917 (март–октябрь) | Российская республика | Временное правительство (Г. Львов, А. Керенский) | `ERA_9` |
| `ruler-lenin` | 1917–1924 | РСФСР / СССР | Владимир Ленин (Совнарком / РКП(б)) | `ERA_10` |
| `ruler-stalin` | 1924–1953 | СССР | Иосиф Сталин | `ERA_10` |
| `ruler-khrushchev` | 1953–1964 | СССР | Никита Хрущев | `ERA_10` |
| `ruler-brezhnev` | 1964–1985 | СССР | Леонид Брежнев (и Ю. Андропов, К. Черненко) | `ERA_10` |
| `ruler-gorbachev` | 1985–1991 | СССР | Михаил Горбачев | `ERA_10` |
| `ruler-yeltsin` | 1991–1999 | Российская Федерация | Борис Ельцин | `ERA_11` |

---

## 6. Каталог ID событий для точных связей `linksTo`

Используйте эти `id` в поле `linksTo[].targetId`, если нужно связать события из разных веток напрямую (особенно при разрыве больше 3 лет, когда теги `syncTags` не срабатывают).

### `DIPLOMACY_TREATIES` — Дипломатия и договоры (`diplomacy/treaties`, 6)

- `1721-nystad-treaty` (1721 (август)) — Ништадтский мирный договор и провозглашение Империи — теги: `#northern-war`
- `1774-kuchuk-kainarji` (1774 / 1783) — Кючук-Кайнарджийский мир и Георгиевский трактат
- `1807-tilsit-treaty` (1807 (июнь)) — Тильзитский мир и союз Александра I с Наполеоном — теги: `#napoleonic`
- `1856-paris-berlin` (1856 / 1878) — Парижский трактат (1856) и Берлинский конгресс (1878)
- `1918-brest-molotov` (1918 / 1939) — Брестский мир (1918) и пакт Молотова — Риббентропа (1939) — теги: `#ww2`
- `1991-belovezha-budapest` (1991 / 1994 / 1997) — Беловежские соглашения (1991), создание ОДКБ и Будапештский меморандум (1994)

### `REFORMS_ECO` — Экономика и реформы (`feat/reforms-eco`, 15)

- `1699-reform-army` (1699–1705) — Военная реформа Петра I и введение рекрутской повинности
- `1718-reform-poll-tax` (1718–1724) — Введение подушной подати, Коллегий и Табели о рангах
- `1754-reform-customs` (1754–1762) — Отмена внутренних таможен и Манифест о вольности дворянства
- `1769-reform-assignats` (1769–1785) — Введение бумажных ассигнаций и Губернская реформа Екатерины II
- `1802-reform-ministries` (1802–1811) — Учреждение Министерств и реформы М. М. Сперанского
- `1839-reform-kankrin` (1839–1843) — Денежная реформа Е. Ф. Канкрина и начало строительства железных дорог
- `1861-reform-emancipation` (1861–1874) — Великие реформы Александра II и военная реформа Д. А. Милютина
- `1891-reform-transsib` (1891–1903) — Строительство Транссиба, КВЖД и золотой рубль С. Ю. Витте
- `1906-reform-stolypin` (1905–1911) — Манифест 17 октября, учреждение Госдумы и аграрная реформа П. А. Столыпина
- `1918-reform-war-communism` (1918–1921) — Политика «Военного коммунизма» и переход к НЭПу (1921)
- `1928-reform-five-year` (1928–1937) — Форсированная индустриализация, коллективизация и создание ВПК СССР
- `1949-reform-nuclear` (1949 (август)) — Советский атомный проект: испытание РДС-1
- `1959-reform-rvsn` (1957–1961) — Создание РВСН, космический прорыв и сокращение обычных вооруженных сил
- `1973-reform-oil-boom` (1970-е — 1986) — Освоение нефти Западной Сибири, военный паритет и перегрузка ВПК
- `1992-reform-market-crisis` (1992–1998) — Рыночные реформы, раздел советского военного наследия и дефолт 1998 г.

### `SEAS` — Войны: Выход к морям (`war/seas`, 20)

- `1686-rus-turk` (1686–1700) — Русско-турецкая война (Крымские и Азовские походы)
- `1700-northern-war` (1700–1721) — Великая Северная война — теги: `#northern-war`
- `1710-pruth` (1710–1713) — Русско-турецкая война (и Прутский поход 1711 г.)
- `1722-persian` (1722–1723) — Персидский (Каспийский) поход Петра I
- `1735-rus-turk` (1735–1739) — Русско-турецкая война
- `1741-rus-swed` (1741–1743) — Русско-шведская война
- `1768-rus-turk` (1768–1774) — Русско-турецкая война
- `1783-crimea-annex` (1783) — Ликвидация и аннексия Крымского ханства
- `1787-rus-turk` (1787–1791) — Русско-турецкая война
- `1788-rus-swed` (1788–1790) — Русско-шведская война
- `1807-anglo-rus` (1807–1812) — Англо-русская война
- `1827-navarino` (1827) — Наваринское сражение
- `1828-rus-turk` (1828–1829) — Русско-турецкая война
- `1833-bosphorus` (1833) — Босфорская экспедиция
- `1853-crimean-war` (1853–1856) — Крымская (Восточная) война
- `1877-rus-turk` (1877–1878) — Русско-турецкая война
- `1904-rus-japanese` (1904–1905) — Русско-японская война
- `1914-ww1` (1914–1918) — Первая мировая война — теги: `#ww1`
- `1939-winter-war` (1939–1940) — Советско-финляндская («Зимняя») война
- `1967-arab-israeli` (1967–1973) — Арабо-израильские войны (включая операцию «Кавказ» 1970 г.)

### `PERIPHERY` — Войны: Имперская периферия (`war/periphery`, 32)

- `1717-khiva` (1717) — Хивинский поход Бековича-Черкасского
- `1735-bashkir-2` (1735–1740) — Подавление Башкирских восстаний
- `1746-chukchi` (1746–1770-е) — Русско-чукотские войны
- `1794-kosciuszko` (1794) — Подавление восстания Тадеуша Костюшко
- `1796-zubov-persia` (1796) — Персидский поход Зубова
- `1801-caucasian-war` (1801–1864) — Кавказская война
- `1802-tlingit` (1802–1805) — Русско-тлинкитская война
- `1804-rus-persian` (1804–1813) — Русско-персидская война
- `1806-rus-turk` (1806–1812) — Русско-турецкая война
- `1808-finnish-war` (1808–1809) — Русско-шведская (Финляндская) война
- `1826-rus-persian` (1826–1828) — Русско-персидская война
- `1830-polish-november` (1830–1831) — Подавление Польского (Ноябрьского) восстания
- `1837-kenesary` (1837–1847) — Подавление восстания Кенесары Касымова
- `1839-khiva-winter` (1839–1840) — Зимний Хивинский поход генерала Перовского
- `1853-central-asia` (1853–1895) — Среднеазиатские походы (завоевание Туркестана)
- `1863-polish-january` (1863–1864) — Подавление Польского (Январского) восстания
- `1899-boxer-rebellion` (1899–1901) — Подавление Ихэтуаньского («Боксерского») восстания в Китае
- `1916-central-asia-revolt` (1916) — Подавление Среднеазиатского восстания
- `1917-civil-war` (1917–1922) — Гражданская война и завоевание национальных окраин
- `1918-baltic-finnish` (1918–1920) — Войны с государствами Балтии и Финляндией
- `1918-basmachi` (1918–1934 (основные бои до 1926 г.)) — Борьба с басмачеством в Средней Азии
- `1921-second-finnish` (1921–1922) — Вторая советско-финская война (Карельское восстание)
- `1938-khasan` (1938 (июль–август)) — Бои у озера Хасан
- `1939-polish-campaign` (1939 (сентябрь)) — Польский поход Красной армии
- `1940-baltics-bessarabia` (1940 (июнь–август)) — Присоединение стран Балтии и Бессарабии
- `1944-deportations` (1944) — Войсковые операции по депортации народов (операция «Чечевица»)
- `1944-upa-forest-brothers` (1944–1950-е) — Подавление антисоветского подполья в Западной Украине и Прибалтике
- `1969-damansky` (1969 (март и август)) — Пограничные конфликты с Китаем (Даманский и Жаланашколь)
- `1988-ussr-collapse` (1988–1991) — Войсковые операции на фоне распада СССР
- `1991-transnistria` (1991–1992) — Приднестровский конфликт (Молдова)
- `1991-abkhazia-ossetia` (1991–1993) — Вооруженные конфликты в Южной Осетии и Абхазии
- `1994-first-chechen` (1994–1996) — Первая чеченская война

### `INTERNAL_BUFFER` — Войны: Восстания и буферные зоны (`war/buffer-internal`, 44)

- `1698-streltsy` (1698) — Подавление Стрелецкого бунта
- `1704-bashkir` (1704–1711) — Подавление Башкирского восстания
- `1705-astrakhan` (1705–1706) — Подавление Астраханского восстания
- `1707-bulavin` (1707–1708) — Подавление Булавинского восстания
- `1733-polish-succession` (1733–1735) — Война за польское наследство
- `1756-seven-years` (1756–1763) — Семилетняя война
- `1768-bar-confed` (1768–1772) — Война с Барской конфедерацией
- `1771-plague-riot` (1771) — Подавление Чумного бунта в Москве
- `1773-pugachev` (1773–1775) — Крестьянская война под предводительством Емельяна Пугачева
- `1792-rus-polish` (1792) — Русско-польская война
- `1798-second-coalition` (1798–1800) — Война Второй антифранцузской коалиции
- `1805-coalitions-3-4` (1805–1807) — Войны Третьей и Четвертой антифранцузских коалиций
- `1812-patriotic-war` (1812) — Отечественная война — теги: `#napoleonic`
- `1813-foreign-campaigns` (1813–1814 (и 1815)) — Заграничные походы русской армии — теги: `#napoleonic`
- `1825-decembrists` (1825 (декабрь)) — Подавление восстания декабристов
- `1849-hungary` (1849) — Венгерский поход
- `1905-first-revolution` (1905–1907) — Подавление Первой русской революции
- `1909-persian-intervention` (1909–1911) — Персидская интервенция
- `1919-soviet-polish` (1919–1921) — Советско-польская война
- `1920-peasant-uprisings` (1920–1924) — Подавление антибольшевистских крестьянских и военных восстаний
- `1921-mongolia` (1921) — Монгольская операция
- `1920s-north-caucasus` (1920-е — 1930-е) — Войсковые операции на Северном Кавказе
- `1929-afghan-raid` (1929 (апрель–май)) — Афганский поход Красной армии
- `1929-kvzhd` (1929 (октябрь–ноябрь)) — Конфликт на КВЖД
- `1934-xinjiang` (1934 и 1937) — Синьцзянские интервенции
- `1936-spain` (1936–1939) — Гражданская война в Испании (операция «X»)
- `1937-china-z` (1937–1941) — Военная помощь Китаю (операция «Z»)
- `1939-khalkhin-gol` (1939 (май–сентябрь)) — Бои на реке Халхин-Гол
- `1941-iran-consent` (1941 (август–сентябрь)) — Иранская операция (операция «Согласие»)
- `1941-ww2` (1941–1945) — Великая Отечественная война (и Советско-японская война 1945 г.) — теги: `#ww2`
- `1950-korean-war` (1950–1953) — Корейская война
- `1953-gdr-uprising` (1953 (июнь)) — Подавление восстания в ГДР
- `1956-hungary-whirlwind` (1956 (октябрь–ноябрь)) — Венгерское восстание (операция «Вихрь»)
- `1962-cuban-crisis` (1962 (октябрь)) — Карибский кризис (операция «Анадырь»)
- `1962-novocherkassk` (1962 (июнь)) — Новочеркасский расстрел
- `1965-vietnam` (1965–1974) — Война во Вьетнаме
- `1968-prague-danube` (1968 (август)) — Ввод войск в Чехословакию (операция «Дунай»)
- `1975-angola` (1975–1991) — Гражданская война в Анголе (и Мозамбике)
- `1977-ogaden` (1977–1978) — Эфиопо-сомалийская (Огаденская) война
- `1979-afghan-war` (1979–1989) — Афганская война
- `1992-prigorodny` (1992 (октябрь–ноябрь)) — Осетино-ингушский конфликт в Пригородном районе
- `1992-tajikistan` (1992–1997) — Гражданская война в Таджикистане
- `1993-white-house` (1993 (октябрь)) — Силовой разгон Верховного Совета РФ (расстрел Белого дома)
- `1999-pristina` (1999 (июнь)) — Марш-бросок на Приштину (Косово)

### `WORLD_CONTEXT` — События в других странах (`world/events`, 14)

- `1688-world-glorious` (1688–1689) — «Славная революция» в Англии и война Аугсбургской лиги
- `1701-world-spanish-succ` (1701–1714) — Война за испанское наследство в Европе
- `1740-world-austrian` (1740–1748) — Возвышение Пруссии Фридриха II и Война за австрийское наследство
- `1776-world-usa-france` (1776 / 1789) — Война за независимость США и Великая французская революция
- `1815-world-vienna` (1814–1815) — Венский конгресс и рождение «Европейского концерта» держав — теги: `#napoleonic`
- `1848-world-spring` (1848–1849) — «Весна народов»: волна революций в Европе
- `1871-world-germany` (1870–1871) — Франко-прусская война и образование Германской империи
- `1907-world-entente` (1907) — Англо-русская конвенция и окончательное оформление Антанты
- `1919-world-versailles` (1918–1919) — Распад четырех империй и Версальско-Вашингтонская система
- `1933-world-axis` (1931–1939) — Захват Японией Маньчжурии (1931), приход нацистов к власти в Германии (1933) и кризис Версаля
- `1945-world-yalta-nato` (1945–1949) — Ялтинско-Потсдамская система, создание ООН и образование НАТО (1949) — теги: `#ww2`
- `1955-world-warsaw-pact` (1955–1960) — Создание Организации Варшавского договора (ОВД) и крушение колониальной системы в Африке
- `1975-world-helsinki` (1975 / 1989) — Хельсинкский акт (1975) и бархатные революции в Восточной Европе (1989)
- `1999-world-nato-expansion` (1999 (март)) — Первая волна расширения НАТО на восток и операция Альянса против Югославии

### `WRITERS_BIO` — Русские писатели-классики (`culture/writers`, 32)

- `1743-derzhavin-gavrila` (1743–1816) — Гаврила Романович Державин — теги: `#person-derzhavin-gavrila`
- `1745-fonvizin-denis` (1745–1792) — Денис Иванович Фонвизин — теги: `#person-fonvizin-denis`
- `1766-karamzin-nikolay` (1766–1826) — Николай Михайлович Карамзин — теги: `#person-karamzin-nikolay`
- `1769-krylov-ivan` (1769–1844) — Иван Андреевич Крылов — теги: `#person-krylov-ivan`
- `1783-zhukovsky-vasily` (1783–1852) — Василий Андреевич Жуковский — теги: `#person-zhukovsky-vasily`
- `1795-griboedov-aleksandr` (1795–1829) — Александр Сергеевич Грибоедов — теги: `#person-griboedov-aleksandr`
- `1799-pushkin-alexander` (1799–1837) — Александр Сергеевич Пушкин — теги: `#person-pushkin-alexander`
- `1803-tyutchev-fyodor` (1803–1873) — Фёдор Иванович Тютчев — теги: `#person-tyutchev-fyodor`
- `1809-gogol-nikolay` (1809–1852) — Николай Васильевич Гоголь — теги: `#person-gogol-nikolay`
- `1812-goncharov-ivan` (1812–1891) — Иван Александрович Гончаров — теги: `#person-goncharov-ivan`
- `1814-lermontov-mikhail` (1814–1841) — Михаил Юрьевич Лермонтов — теги: `#person-lermontov-mikhail`
- `1818-turgenev-ivan` (1818–1883) — Иван Сергеевич Тургенев — теги: `#person-turgenev-ivan`
- `1820-fet-afanasy` (1820–1892) — Афанасий Афанасьевич Фет — теги: `#person-fet-afanasy`
- `1821-nekrasov-nikolay` (1821–1878) — Николай Алексеевич Некрасов — теги: `#person-nekrasov-nikolay`
- `1821-dostoevsky-fyodor` (1821–1881) — Фёдор Михайлович Достоевский — теги: `#person-dostoevsky-fyodor`
- `1823-ostrovsky-aleksandr` (1823–1886) — Александр Николаевич Островский — теги: `#person-ostrovsky-aleksandr`
- `1826-saltykov-shchedrin-mikhail` (1826–1889) — Михаил Евграфович Салтыков-Щедрин — теги: `#person-saltykov-shchedrin-mikhail`
- `1828-tolstoy-leo` (1828–1910) — Лев Николаевич Толстой — теги: `#person-tolstoy-leo`
- `1831-leskov-nikolay` (1831–1895) — Николай Семёнович Лесков — теги: `#person-leskov-nikolay`
- `1860-chekhov-anton` (1860–1904) — Антон Павлович Чехов — теги: `#person-chekhov-anton`
- `1868-gorky-maxim` (1868–1936) — Максим Горький (Алексей Максимович Пешков) — теги: `#person-gorky-maxim`
- `1870-bunin-ivan` (1870–1953) — Иван Алексеевич Бунин — теги: `#person-bunin-ivan` `#topic-silver-age`
- `1880-blok-alexander` (1880–1921) — Александр Александрович Блок — теги: `#person-blok-alexander` `#topic-silver-age`
- `1889-akhmatova-anna` (1889–1966) — Анна Андреевна Ахматова — теги: `#person-akhmatova-anna` `#topic-silver-age`
- `1890-pasternak-boris` (1890–1960) — Борис Леонидович Пастернак — теги: `#person-pasternak-boris` `#topic-silver-age`
- `1891-bulgakov-mikhail` (1891–1940) — Михаил Афанасьевич Булгаков — теги: `#person-bulgakov-mikhail`
- `1892-tsvetaeva-marina` (1892–1941) — Марина Ивановна Цветаева — теги: `#person-tsvetaeva-marina` `#topic-silver-age`
- `1893-mayakovsky-vladimir` (1893–1930) — Владимир Владимирович Маяковский — теги: `#person-mayakovsky-vladimir` `#topic-silver-age`
- `1895-yesenin-sergey` (1895–1925) — Сергей Александрович Есенин — теги: `#person-yesenin-sergey` `#topic-silver-age`
- `1899-nabokov-vladimir` (1899–1977) — Владимир Владимирович Набоков — теги: `#person-nabokov-vladimir`
- `1905-sholokhov-mikhail` (1905–1984) — Михаил Александрович Шолохов — теги: `#person-sholokhov-mikhail`
- `1918-solzhenitsyn-alexander` (1918–2008) — Александр Исаевич Солженицын — теги: `#person-solzhenitsyn-alexander`

### `WRITERS_WORKS` — Ключевые произведения литературы (`culture/books`, 71)

- `1782-derzhavin-felitsa` (1782) — Г. Р. Державин — ода «Фелица» — теги: `#person-derzhavin-gavrila` · отсылки: `@ruler-catherine-2` `@era-7`
- `1782-fonvizin-nedorosl` (1782) — Д. И. Фонвизин — «Недоросль» — теги: `#person-fonvizin-denis` · отсылки: `@ruler-catherine-2` `@era-7`
- `1791-derzhavin-vodopad` (1791–1794) — Г. Р. Державин — «Водопад» и ода «На взятие Измаила» — теги: `#person-derzhavin-gavrila` · отсылки: `@event-1787-rus-turk` `@ruler-catherine-2` `@era-7`
- `1792-karamzin-bednaya-liza` (1792) — Н. М. Карамзин — «Бедная Лиза» — теги: `#person-karamzin-nikolay`
- `1812-krylov-basni-1812` (1811–1812) — И. А. Крылов — басни «Квартет» и «Волк на псарне» — теги: `#person-krylov-ivan` `#napoleonic` · отсылки: `@event-1812-patriotic-war` `@ruler-alexander-1` `@era-7`
- `1812-zhukovsky-svetlana-pevets` (1812) — В. А. Жуковский — баллада «Светлана» и «Певец во стане русских воинов» — теги: `#person-zhukovsky-vasily` `#napoleonic` · отсылки: `@event-1812-patriotic-war` `@ruler-alexander-1` `@era-7`
- `1816-karamzin-history-state` (1816–1826) — Н. М. Карамзин — «История государства Российского» (12 томов) — теги: `#person-karamzin-nikolay` · отсылки: `@era-1` `@era-2` `@era-3` `@era-4` `@ruler-ryurik` `@ruler-vladimir-1` `@ruler-yaroslav-wise` `@ruler-dmitry-donskoy` `@ruler-ivan-3` `@ruler-ivan-4` `@ruler-boris-godunov`
- `1822-griboedov-gore-ot-uma` (1822–1824) — А. С. Грибоедов — «Горе от ума» — теги: `#person-griboedov-aleksandr` · отсылки: `@event-1825-decembrists` `@ruler-alexander-1` `@era-7`
- `1823-pushkin-evgeny-onegin` (1823–1831) — А. С. Пушкин — «Евгений Онегин» — теги: `#person-pushkin-alexander` · отсылки: `@ruler-alexander-1` `@ruler-nicholas-1` `@era-7`
- `1825-pushkin-boris-godunov` (1825) — А. С. Пушкин — трагедия «Борис Годунов» — теги: `#person-pushkin-alexander` · отсылки: `@ruler-boris-godunov` `@ruler-false-dmitry-1` `@era-3` `@era-4`
- `1830-tyutchev-silentium` (1830) — Ф. И. Тютчев — «Silentium!» («Молчи, скрывайся и таи...») — теги: `#person-tyutchev-fyodor`
- `1833-pushkin-medny-vsadnik` (1833) — А. С. Пушкин — поэма «Медный всадник» — теги: `#person-pushkin-alexander` · отсылки: `@event-1700-northern-war` `@event-1721-nystad-treaty` `@northern-war` `@ruler-peter-1` `@era-5`
- `1835-gogol-taras-bulba` (1835–1842) — Н. В. Гоголь — «Тарас Бульба» — теги: `#person-gogol-nikolay` · отсылки: `@era-4`
- `1842-gogol-mertvye-dushi` (1835–1842) — Н. В. Гоголь — поэма «Мёртвые души» — теги: `#person-gogol-nikolay` · отсылки: `@ruler-nicholas-1` `@era-7`
- `1836-gogol-revizor` (1836) — Н. В. Гоголь — комедия «Ревизор» — теги: `#person-gogol-nikolay` · отсылки: `@ruler-nicholas-1` `@era-7`
- `1836-pushkin-kapitanskaya-dochka` (1836) — А. С. Пушкин — «Капитанская дочка» — теги: `#person-pushkin-alexander` · отсылки: `@event-1773-pugachev` `@ruler-catherine-2` `@era-7`
- `1837-lermontov-borodino-kalashnikov` (1837) — М. Ю. Лермонтов — «Бородино» и «Песня про купца Калашникова» — теги: `#person-lermontov-mikhail` · отсылки: `@event-1812-patriotic-war` `@napoleonic` `@ruler-ivan-4` `@ruler-alexander-1` `@era-3` `@era-7`
- `1840-lermontov-geroy-nashego-vremeni` (1838–1840) — М. Ю. Лермонтов — «Герой нашего времени» — теги: `#person-lermontov-mikhail` · отсылки: `@event-1801-caucasian-war` `@ruler-nicholas-1` `@era-7`
- `1847-turgenev-zapiski-okhotnika` (1847–1852) — И. С. Тургенев — «Записки охотника» — теги: `#person-turgenev-ivan` · отсылки: `@event-1861-reform-emancipation` `@ruler-nicholas-1` `@ruler-alexander-2` `@era-8`
- `1850-fet-shepot-robkoe-dykhanie` (1850) — А. А. Фет — «Шёпот, робкое дыханье...» — теги: `#person-fet-afanasy`
- `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856) — Л. Н. Толстой — «Севастопольские рассказы» — теги: `#person-tolstoy-leo` · отсылки: `@event-1853-crimean-war` `@ruler-nicholas-1` `@ruler-alexander-2` `@era-7` `@era-8`
- `1858-goncharov-fregat-pallada` (1855–1858) — И. А. Гончаров — «Фрегат „Паллада“» — теги: `#person-goncharov-ivan` · отсылки: `@event-1853-crimean-war` `@ruler-nicholas-1` `@ruler-alexander-2` `@era-8`
- `1859-goncharov-oblomov` (1859) — И. А. Гончаров — роман «Обломов» — теги: `#person-goncharov-ivan` · отсылки: `@event-1861-reform-emancipation` `@ruler-alexander-2` `@era-8`
- `1859-ostrovsky-groza` (1859) — А. Н. Островский — драма «Гроза» — теги: `#person-ostrovsky-aleksandr` · отсылки: `@ruler-alexander-2` `@era-8`
- `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862) — Ф. М. Достоевский — «Записки из Мёртвого дома» — теги: `#person-dostoevsky-fyodor` · отсылки: `@ruler-nicholas-1` `@ruler-alexander-2` `@era-7` `@era-8`
- `1862-turgenev-ottsy-i-deti` (1862) — И. С. Тургенев — роман «Отцы и дети» — теги: `#person-turgenev-ivan` · отсылки: `@event-1861-reform-emancipation` `@ruler-alexander-2` `@era-8`
- `1863-tolstoy-voyna-i-mir` (1863–1869) — Л. Н. Толстой — роман-эпопея «Война и мир» — теги: `#person-tolstoy-leo` · отсылки: `@event-1805-coalitions-3-4` `@event-1807-tilsit-treaty` `@event-1812-patriotic-war` `@event-1825-decembrists` `@napoleonic` `@ruler-alexander-1` `@era-7`
- `1863-nekrasov-komu-na-rusi` (1863–1877) — Н. А. Некрасов — поэма «Кому на Руси жить хорошо» — теги: `#person-nekrasov-nikolay` · отсылки: `@event-1861-reform-emancipation` `@ruler-alexander-2` `@era-8`
- `1866-dostoevsky-prestuplenie-i-nakazanie` (1866) — Ф. М. Достоевский — «Преступление и наказание» — теги: `#person-dostoevsky-fyodor` · отсылки: `@ruler-alexander-2` `@era-8`
- `1866-tyutchev-umom-rossiyu-ne-ponyat` (1866) — Ф. И. Тютчев — «Умом Россию не понять...» — теги: `#person-tyutchev-fyodor` · отсылки: `@ruler-alexander-2` `@era-8`
- `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870) — М. Е. Салтыков-Щедрин — «История одного города» — теги: `#person-saltykov-shchedrin-mikhail` · отсылки: `@era-6` `@era-7` `@era-8` `@ruler-paul-1` `@ruler-alexander-1` `@ruler-alexander-2`
- `1871-dostoevsky-besy` (1871–1872) — Ф. М. Достоевский — роман «Бесы» — теги: `#person-dostoevsky-fyodor` · отсылки: `@ruler-alexander-2` `@era-8`
- `1871-nekrasov-russkie-zhenshchiny` (1871–1872) — Н. А. Некрасов — поэма «Русские женщины» — теги: `#person-nekrasov-nikolay` · отсылки: `@event-1825-decembrists` `@ruler-nicholas-1` `@era-7`
- `1873-leskov-ocharovanny-strannik` (1873) — Н. С. Лесков — «Очарованный странник» — теги: `#person-leskov-nikolay` · отсылки: `@event-1801-caucasian-war` `@ruler-alexander-2` `@era-8`
- `1873-tolstoy-anna-karenina` (1873–1877) — Л. Н. Толстой — роман «Анна Каренина» — теги: `#person-tolstoy-leo` · отсылки: `@event-1877-rus-turk` `@ruler-alexander-2` `@era-8`
- `1875-shchedrin-gospoda-golovlevy` (1875–1880) — М. Е. Салтыков-Щедрин — «Господа Головлёвы» — теги: `#person-saltykov-shchedrin-mikhail` · отсылки: `@ruler-alexander-2` `@era-8`
- `1878-ostrovsky-bespridannitsa` (1878) — А. Н. Островский — драма «Бесприданница» — теги: `#person-ostrovsky-aleksandr` · отсылки: `@ruler-alexander-2` `@era-8`
- `1879-dostoevsky-bratya-karamazovy` (1879–1880) — Ф. М. Достоевский — «Братья Карамазовы» — теги: `#person-dostoevsky-fyodor` · отсылки: `@ruler-alexander-2` `@era-8`
- `1881-leskov-levsha` (1881) — Н. С. Лесков — «Левша» (Сказ о тульском косом Левше и о стальной блохе) — теги: `#person-leskov-nikolay` · отсылки: `@event-1853-crimean-war` `@ruler-alexander-1` `@ruler-nicholas-1` `@era-7`
- `1883-fet-vechernie-ogni` (1883–1891) — А. А. Фет — поэтические сборники «Вечерние огни» (выпуски 1–4) — теги: `#person-fet-afanasy` · отсылки: `@ruler-alexander-3` `@era-8`
- `1892-chekhov-palata-6-sakhalin` (1892–1895) — А. П. Чехов — «Палата № 6» и книга очерков «Остров Сахалин» — теги: `#person-chekhov-anton` · отсылки: `@ruler-alexander-3` `@era-8`
- `1896-chekhov-chayka-tri-sestry` (1896–1901) — А. П. Чехов — пьесы «Чайка», «Дядя Ваня» и «Три сестры» — теги: `#person-chekhov-anton` · отсылки: `@ruler-nicholas-2` `@era-9`
- `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)) — Л. Н. Толстой — повесть «Хаджи-Мурат» — теги: `#person-tolstoy-leo` · отсылки: `@event-1801-caucasian-war` `@ruler-nicholas-1` `@era-7`
- `1902-gorky-na-dne` (1902) — М. Горький — пьеса «На дне» — теги: `#person-gorky-maxim` · отсылки: `@ruler-nicholas-2` `@era-9`
- `1903-chekhov-vishnevy-sad` (1903–1904) — А. П. Чехов — пьеса «Вишнёвый сад» — теги: `#person-chekhov-anton` · отсылки: `@ruler-nicholas-2` `@era-9`
- `1906-gorky-mat` (1906–1907) — М. Горький — роман «Мать» — теги: `#person-gorky-maxim` · отсылки: `@event-1905-first-revolution` `@ruler-nicholas-2` `@era-9`
- `1908-blok-na-pole-kulikovom` (1908) — А. А. Блок — цикл «На поле Куликовом» — теги: `#person-blok-alexander` `#topic-silver-age` · отсылки: `@ruler-dmitry-donskoy` `@era-2` `@ruler-nicholas-2` `@era-9`
- `1914-mayakovsky-oblako-v-shtanakh` (1914–1915) — В. В. Маяковский — поэма «Облако в штанах» — теги: `#person-mayakovsky-vladimir` `#topic-silver-age` `#ww1` · отсылки: `@event-1914-ww1` `@ruler-nicholas-2` `@era-9`
- `1915-bunin-gospodin-iz-san-frantsisko` (1915) — И. А. Бунин — «Господин из Сан-Франциско» — теги: `#person-bunin-ivan` `#topic-silver-age` `#ww1` · отсылки: `@event-1914-ww1` `@ruler-nicholas-2` `@era-9`
- `1917-tsvetaeva-lebediny-stan` (1917–1921) — М. И. Цветаева — стихотворный цикл «Лебединый стан» — теги: `#person-tsvetaeva-marina` `#topic-silver-age` · отсылки: `@event-1917-civil-war` `@ruler-lenin` `@era-10`
- `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)) — Б. Л. Пастернак — книга стихов «Сестра моя — жизнь» — теги: `#person-pasternak-boris` `#topic-silver-age` · отсылки: `@ruler-provisional-govt` `@era-9` `@era-10`
- `1918-blok-dvenadtsat` (1918 (январь)) — А. А. Блок — поэма «Двенадцать» — теги: `#person-blok-alexander` `#topic-silver-age` · отсылки: `@event-1917-civil-war` `@ruler-lenin` `@era-10`
- `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)) — И. А. Бунин — «Окаянные дни» — теги: `#person-bunin-ivan` `#topic-silver-age` · отсылки: `@event-1917-civil-war` `@event-1918-reform-war-communism` `@ruler-lenin` `@era-10`
- `1921-yesenin-pugachev` (1921) — С. А. Есенин — драматическая поэма «Пугачёв» — теги: `#person-yesenin-sergey` `#topic-silver-age` · отсылки: `@event-1773-pugachev` `@event-1920-peasant-uprisings` `@ruler-catherine-2` `@era-7`
- `1923-bulgakov-belaya-gvardiya` (1923–1925) — М. А. Булгаков — роман «Белая гвардия» (и пьеса «Дни Турбиных») — теги: `#person-bulgakov-mikhail` · отсылки: `@event-1917-civil-war` `@ruler-lenin` `@era-10`
- `1924-tsvetaeva-poema-gory-kontsa` (1924–1926) — М. И. Цветаева — «Поэма Горы», «Поэма Конца» и «Крысолов» — теги: `#person-tsvetaeva-marina` `#topic-silver-age` · отсылки: `@ruler-stalin` `@era-10`
- `1925-bulgakov-sobachye-serdtse` (1925) — М. А. Булгаков — повесть «Собачье сердце» — теги: `#person-bulgakov-mikhail` · отсылки: `@event-1918-reform-war-communism` `@ruler-stalin` `@era-10`
- `1925-yesenin-anna-snegina` (1925) — С. А. Есенин — поэма «Анна Снегина» — теги: `#person-yesenin-sergey` `#topic-silver-age` · отсылки: `@event-1917-civil-war` `@ruler-provisional-govt` `@ruler-lenin` `@era-9` `@era-10`
- `1925-sholokhov-tikhiy-don` (1925–1940) — М. А. Шолохов — роман-эпопея «Тихий Дон» (4 книги) — теги: `#person-sholokhov-mikhail` · отсылки: `@event-1914-ww1` `@event-1917-civil-war` `@event-1920-peasant-uprisings` `@ww1` `@ruler-nicholas-2` `@ruler-lenin` `@era-9` `@era-10`
- `1926-nabokov-mashenka` (1926) — В. В. Набоков (Сирин) — роман «Машенька» — теги: `#person-nabokov-vladimir` · отсылки: `@event-1917-civil-war` `@ruler-nicholas-2` `@era-9`
- `1927-mayakovsky-khorosho` (1927) — В. В. Маяковский — октябрьская поэма «Хорошо!» — теги: `#person-mayakovsky-vladimir` `#topic-silver-age` · отсылки: `@event-1917-civil-war` `@ruler-lenin` `@ruler-stalin` `@era-10`
- `1928-bulgakov-master-i-margarita` (1928–1940 (опубл. 1966)) — М. А. Булгаков — роман «Мастер и Маргарита» — теги: `#person-bulgakov-mikhail` · отсылки: `@ruler-stalin` `@era-10`
- `1932-sholokhov-podnyataya-tselina` (1932–1959) — М. А. Шолохов — роман «Поднятая целина» — теги: `#person-sholokhov-mikhail` · отсылки: `@event-1928-reform-five-year` `@ruler-stalin` `@era-10`
- `1935-nabokov-dar` (1935–1938) — В. В. Набоков — роман «Дар» — теги: `#person-nabokov-vladimir` · отсылки: `@person-pushkin-alexander` `@era-8` `@era-10`
- `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)) — А. А. Ахматова — поэма «Реквием» — теги: `#person-akhmatova-anna` `#topic-silver-age` · отсылки: `@event-1928-reform-five-year` `@ruler-stalin` `@era-10`
- `1940-akhmatova-poema-bez-geroya` (1940–1962) — А. А. Ахматова — «Поэма без героя» — теги: `#person-akhmatova-anna` `#topic-silver-age` `#ww2` · отсылки: `@event-1914-ww1` `@event-1941-ww2` `@ruler-nicholas-2` `@ruler-stalin` `@era-9` `@era-10`
- `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)) — Б. Л. Пастернак — роман «Доктор Живаго» — теги: `#person-pasternak-boris` `#topic-silver-age` · отсылки: `@event-1905-first-revolution` `@event-1914-ww1` `@event-1917-civil-war` `@event-1941-ww2` `@ww1` `@ww2` `@ruler-nicholas-2` `@ruler-lenin` `@ruler-stalin` `@era-9` `@era-10`
- `1956-sholokhov-sudba-cheloveka` (1956) — М. А. Шолохов — рассказ «Судьба человека» — теги: `#person-sholokhov-mikhail` · отсылки: `@event-1941-ww2` `@ww2` `@ruler-stalin` `@ruler-khrushchev` `@era-10`
- `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)) — А. И. Солженицын — «Архипелаг ГУЛАГ» (опыт художественного исследования) — теги: `#person-solzhenitsyn-alexander` · отсылки: `@event-1917-civil-war` `@event-1928-reform-five-year` `@event-1941-ww2` `@ruler-lenin` `@ruler-stalin` `@era-10`
- `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)) — А. И. Солженицын — «Один день Ивана Денисовича» — теги: `#person-solzhenitsyn-alexander` · отсылки: `@ruler-stalin` `@ruler-khrushchev` `@era-10`
- `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) — А. И. Солженицын — эпопея «Красное Колесо» («Август Четырнадцатого» и др.) — теги: `#person-solzhenitsyn-alexander` · отсылки: `@event-1906-reform-stolypin` `@event-1914-ww1` `@event-1917-civil-war` `@ww1` `@ruler-nicholas-2` `@ruler-provisional-govt` `@era-9` `@era-10`
