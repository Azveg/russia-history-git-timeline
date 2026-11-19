# Динамический каталог веток и тегов (`BRANCH_CATALOG.md`)

> **Автогенерируемый файл.** Не редактируйте вручную — обновляется командой `npm run sync:catalog` или автоматически через GitHub Actions при изменении JSON-модулей в `public/data/`.
> Правила создания файлов, схема и системный промпт для ИИ находятся в [`BRANCH_SPEC.md`](./BRANCH_SPEC.md).

---

## 1. Сводка состояния базы

- **Модульных JSON-файлов:** 14
- **Объявленных веток:** 22 (групп: 4, листовых: 18)
- **Событий (nodes):** 472
- **Правлений (rulers):** 70
- **Фактический диапазон оси времени:** `862–2008`
- **Активных тегов (`syncTags` / `campaignId` / `referenceTags`):** 374
- **Явных связей (`crossLinks` + `linksTo`):** 570

---

## 2. Реестр текущих веток

| `id` | `gitName` | Название (`label`) | Родитель | Тип | Цвет | Старт | Узлов | Файл |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `ARTS_CULTURE` | `feat/arts-culture` | Искусство, архитектура, музыка и кино | — | Тематическая | `#f472b6` | выкл (по умолч.) | 18 | `data/arts_culture.json` |
| `DIPLOMACY_TREATIES` | `diplomacy/treaties` | Дипломатия, союзы и мирные договоры | — | Тематическая | `#06b6d4` | выкл (по умолч.) | 22 | `data/diplomacy.json` |
| `MEDICINE_ALL` | `med/all` | Медицина: врачи, клиники и открытия (общая) | — | Группа (`isGroup`) | `#0d9488` | свёрнута | 0 | `data/doctors_bio.json` |
| `DOCTORS_BIO` | `med/doctors` | Выдающиеся врачи и учёные-медики | `MEDICINE_ALL` | Тематическая | `#2dd4bf` | выкл (по умолч.) | 30 | `data/doctors_bio.json` |
| `REFORMS_ECO` | `economy/reforms` | Экономика, право и госреформы | — | Тематическая | `#10b981` | выкл (по умолч.) | 29 | `data/economics.json` |
| `MEDICINE_HEALTH` | `med/milestones` | Медицина: институты, клиники и открытия | `MEDICINE_ALL` | Тематическая | `#14b8a6` | выкл (по умолч.) | 39 | `data/medicine_health.json` |
| `MAIN_RULERS` | `rulers/reigns` | Правители (ветвления) | — | Тематическая | `#f59e0b` | вкл (по умолч.) | 70 | `data/rulers.json` |
| `SCIENCE_DISCOVERIES` | `science/discoveries` | Научные открытия, академии и технопрорывы | `SCIENCE_ALL` | Тематическая | `#38bdf8` | выкл (по умолч.) | 20 | `data/science_discoveries.json` |
| `SCIENCE_ALL` | `sci/all` | Наука: учёные и открытия (общая) | — | Группа (`isGroup`) | `#06b6d4` | свёрнута | 0 | `data/scientists_bio.json` |
| `SCIENTISTS_BIO` | `science/scientists` | Выдающиеся учёные и конструкторы | `SCIENCE_ALL` | Тематическая | `#22d3ee` | выкл (по умолч.) | 17 | `data/scientists_bio.json` |
| `STATESMEN_BIO` | `feat/statesmen-bio` | Государственные деятели, дипломаты и реформаторы | — | Тематическая | `#84cc16` | выкл (по умолч.) | 12 | `data/statesmen_bio.json` |
| `THOUGHT_RELIGION` | `feat/thought-religion` | Религия, просвещение и общественная мысль | — | Тематическая | `#818cf8` | выкл (по умолч.) | 15 | `data/thought_religion.json` |
| `WAR_ALL` | `war/all` | Военные кампании (общая ветка) | — | Группа (`isGroup`) | `#f43f5e` | свёрнута | 0 | `data/wars.json` |
| `WAR_CONTINENTAL` | `war/continental` | Войны: Большие и мировые войны | `WAR_ALL` | Военная | `#ef4444` | выкл (по умолч.) | 21 | `data/wars.json` |
| `SEAS` | `war/seas` | Войны: Выход к морям и проливам | `WAR_ALL` | Военная | `#38bdf8` | выкл (по умолч.) | 29 | `data/wars.json` |
| `PERIPHERY` | `war/periphery` | Войны: Расширение границ и периферия | `WAR_ALL` | Военная | `#fb923c` | выкл (по умолч.) | 32 | `data/wars.json` |
| `INTERNAL_BUFFER` | `war/internal` | Войны: Усобицы, восстания и гражданские войны | `WAR_ALL` | Военная | `#f43f5e` | выкл (по умолч.) | 22 | `data/wars.json` |
| `WAR_EXPEDITION` | `war/expedition` | Войны: Зарубежные походы и локальные операции | `WAR_ALL` | Военная | `#eab308` | выкл (по умолч.) | 27 | `data/wars.json` |
| `WORLD_CONTEXT` | `world/context` | Мировой геополитический контекст | — | Тематическая | `#a855f7` | выкл (по умолч.) | 23 | `data/world.json` |
| `LITERATURE_ALL` | `lit/all` | Литература: писатели и произведения (общая) | — | Группа (`isGroup`) | `#d946ef` | свёрнута | 0 | `data/writers_bio.json` |
| `WRITERS_BIO` | `culture/writers` | Русские писатели и летописцы | `LITERATURE_ALL` | Тематическая | `#e879f9` | выкл (по умолч.) | 37 | `data/writers_bio.json` |
| `WRITERS_WORKS` | `culture/books` | Ключевые произведения литературы | `LITERATURE_ALL` | Тематическая | `#c084fc` | выкл (по умолч.) | 79 | `data/writers_works.json` |

---

## 3. Активные теги (`syncTags`, `campaignId`, `referenceTags`)

- **`syncTags` / `campaignId`**: синхронная авто-связь для узлов разных веток в окне **±3 года**.
- **`referenceTags`**: внеоконная отсылка (книги, фильмы, исследования) — связывается с носителем тега **через любое число лет** (50, 100+ лет).
- **Канонический тег любого события из раздела 6**: `event-<node.id>` (например, `event-1914-ww1`) работает автоматически даже без правки файла исходного события.

| Тег | Режим | Диапазон лет | Ветки (`task`) | События (`id`) |
| :--- | :---: | :---: | :--- | :--- |
| `era-1` | ref (внеоконный) | 911–1826 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `911-byzantine-treaties` (911 и 944), `946-olga-tax-reform` (946–947), `988-baptism-of-rus-hilarion` (988–1051), `989-sophia-cathedrals-rus-architecture` (989–1052), `1016-russkaya-pravda` (1016–1054), `1050-agapit-pechersky` (ок. 1050–1095), `1054-great-schism` (1054 (июль)), `1073-agapit-pechersky-monastic-medicine` (1073–1095), `1097-liubech-congress` (1097–1103), `1113-povest-vremennykh-let` (1110–1113), `1113-monomakh-statute` (1113), `1130-evpraksia-mazi-treatise` (1130-е годы), `1158-vladimir-suzdal-white-stone` (1158–1197), `1816-karamzin-history-state` (1816–1826) |
| `era-10` | ref (внеоконный) | 1849–2000 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1849-pavlov-ivan` (1849–1936), `1859-gamaleya-nikolay` (1859–1949), `1874-semashko-nikolay` (1874–1949), `1874-vishnevsky-alexander` (1874–1948), `1875-filatov-vladimir` (1875–1956), `1876-burdenko-nikolay` (1876–1946), `1885-anichkov-nikolay` (1885–1964), `1887-vavilov-nikolay` (1887–1943), `1890-bakulev-alexander` (1890–1967), `1892-kondratiev-nikolay` (1892–1938), `1897-yermolyeva-zinaida` (1897–1974), `1898-mhat-diaghilev-ballets-russes` (1898–1929), `1903-kolmogorov-andrey` (1903–1987), `1904-kosygin-aleksey` (1904–1980), `1908-landau-lev` (1908–1968), `1909-chumakov-mikhail` (1909–1993), `1910-russian-avant-garde` (1910–1932), `1912-kantorovich-leonid` (1912–1986), `1916-demikhov-vladimir` (1916–1998), `1917-filatov-ophthalmology-plastic` (1917–1956), `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1917-patriarchate-philosophers-ship` (1917–1922), `1917-tsvetaeva-lebediny-stan` (1917–1921), `1918-blok-dvenadtsat` (1918 (январь)), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1918-semashko-narkomzdrav` (1918–1930), `1920-vavilov-genetics-seed-bank` (1920–1940), `1921-ilizarov-gavriil` (1921–1992), `1923-bulgakov-belaya-gvardiya` (1923–1925), `1924-tsvetaeva-poema-gory-kontsa` (1924–1926), `1925-bulgakov-sobachye-serdtse` (1925), `1925-eisenstein-soviet-montage-cinema` (1925–1945), `1925-sholokhov-tikhiy-don` (1925–1940), `1925-yesenin-anna-snegina` (1925), `1926-blood-transfusion-institute-service` (1926–1945), `1927-fyodorov-svyatoslav` (1927–2000), `1927-mayakovsky-khorosho` (1927), `1927-vishnevsky-local-anesthesia` (1927–1948), `1928-bulgakov-master-i-margarita` (1928–1940 (опубл. 1966)), `1929-chazov-evgeny` (1929–2021), `1932-sholokhov-podnyataya-tselina` (1932–1959), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1935-nabokov-dar` (1935–1938), `1936-shostakovich-prokofiev-symphonism` (1936–1953), `1937-zilber-pavlovsky-encephalitis-focality` (1937–1940), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1941-burdenko-military-neurosurgery-ams` (1941–1946), `1942-yermolyeva-penicillin-stalingrad` (1942–1945), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1946-demikhov-bakulev-cardiac-transplant` (1946–1967), `1951-ilizarov-orthopedics` (1951–1992), `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964), `1954-obninsk-first-npp` (1954 (27 июня)), `1956-sholokhov-sudba-cheloveka` (1956), `1956-soviet-national-medical-centers` (1956–1987), `1957-sputnik-1` (1957 (4 октября)), `1958-zhdanov-chumakov-global-vaccines` (1958–1980), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)), `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)), `1961-gagarin-vostok-1` (1961 (12 апреля)), `1962-tarkovsky-auteur-cinema` (1962–1986), `1972-salt1-abm-treaty` (1963–1979), `1965-kosygin-reform` (1965–1970 («Золотая восьмая пятилетка»)), `1968-sakharov-helsinki-human-rights` (1968–1989), `1970-fyodorov-eye-microsurgery` (1970–2000), `1970-lunokhod-venera` (1970–1975), `2000-alferov-nobel` (1970–2000), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991), `1986-mir-station` (1986–2001), `1988-millennium-baptism-constitution` (1988–1991) |
| `era-11` | ref (внеоконный) | 1927–2000 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT` | `1927-fyodorov-svyatoslav` (1927–2000), `1929-chazov-evgeny` (1929–2021), `1929-primakov-evgeny` (1929–2015), `1970-fyodorov-eye-microsurgery` (1970–2000), `2000-alferov-nobel` (1970–2000), `1987-perestroika-economy` (1985–1990), `1986-mir-station` (1986–2001), `1992-post-soviet-culture-global-stage` (1992–2000), `1992-world-maastricht-www-globalization` (1992–2000), `1993-oms-reform-modern-medicine` (1993–2000), `1993-russian-constitution-civil-society` (1993–1998), `1994-budapest-nato-multipolar-diplomacy` (1994–1999) |
| `era-2` | ref (внеоконный) | 1185–1908 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1185-slovo-o-polku-igoreve` (1185–1187), `1204-fourth-crusade` (1204–1215), `1243-nevsky-kalita-horde-diplomacy` (1243–1340), `1296-alexius-metropolitan` (1296–1378), `1328-kalita-horde-tribute-denga-coinage` (1328–1382), `1337-sergius-radonezh-monastic-revival` (1337–1392), `1347-world-black-death-renaissance` (1347–1353), `1352-black-death-rus-quarantines` (1352–1386), `1378-rublev-theophanes-trinity` (1378–1427), `1816-karamzin-history-state` (1816–1826), `1908-blok-na-pole-kulikovom` (1908) |
| `era-3` | ref (внеоконный) | 1380–1837 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_BIO`, `WRITERS_WORKS` | `1380-zadonshchina` (1380-е годы), `1453-fall-of-constantinople` (1439–1453), `1468-nikitin-khozhdenie-za-tri-morya` (1468–1474), `1475-fioravanti-moscow-kremlin` (1475–1516), `1489-habsburg-embassy` (1489–1517), `1490-non-possessors-third-rome` (1490–1524), `1492-columbus-reformation` (1492–1553), `1497-sudebnik-ivan3` (1497 (сентябрь)), `1528-kurbsky-peresvetov` (1528–1583), `1551-stoglav-patriarchate-1589` (1551–1589), `1555-saint-basil-cathedral` (1555–1561), `1564-ivan-fyodorov-apostol` (1564 (1 марта)), `1564-ivan-kurbsky-correspondence` (1564–1579), `1816-karamzin-history-state` (1816–1826), `1825-pushkin-boris-godunov` (1825), `1837-lermontov-borodino-kalashnikov` (1837) |
| `era-4` | ref (внеоконный) | 1492–1842 | `ARTS_CULTURE`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1492-columbus-reformation` (1492–1553), `1535-glinskaya-money-reform` (1535–1538), `1549-chosen-council-sudebnik` (1549–1556), `1565-oprichnina` (1565–1572), `1578-pozharsky-minin` (1578–1642), `1581-aptekarsky-prikaz` (1581–1620), `1605-ordin-nashchokin-afanasy` (1605–1680), `1632-kiev-mohyla-simeon-polotsky` (1632–1680), `1648-dezhnev-bering-strait` (1648 (июнь–октябрь)), `1654-moscow-plague-lekarskaya-shkola` (1654–1655), `1660-simon-ushakov-naryshkin-baroque` (1660–1699), `1816-karamzin-history-state` (1816–1826), `1825-pushkin-boris-godunov` (1825), `1835-gogol-taras-bulba` (1835–1842) |
| `era-5` | ref (внеоконный) | 1581–1833 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_BIO`, `WRITERS_WORKS` | `1581-aptekarsky-prikaz` (1581–1620), `1617-stolbovo-deulino` (1617–1634), `1618-thirty-years-westphalia` (1618–1648), `1649-sobornoye-ulozhenie` (1649 (январь)), `1653-church-schism-nikon` (1653–1667), `1654-pereyaslav-andrusovo` (1654–1667), `1660-simon-ushakov-naryshkin-baroque` (1660–1699), `1667-new-trade-statute` (1667–1682), `1670-bidloo-nikolay` (1670–1735), `1672-zhitie-avvakuma` (1672–1675), `1686-eternal-peace-nerchinsk` (1686–1689), `1687-slavyano-greko-latinskaya` (1687), `1703-saint-petersburg-baroque-academy` (1703–1762), `1703-trediakovsky-kantemir` (1703–1769), `1717-yunosti-chestnoe-zertsalo-prokopovich` (1717–1725), `1721-peter-holy-synod` (1721–1725), `1833-pushkin-medny-vsadnik` (1833) |
| `era-6` | ref (внеоконный) | 1670–1870 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_BIO`, `WRITERS_WORKS` | `1670-bidloo-nikolay` (1670–1735), `1703-saint-petersburg-baroque-academy` (1703–1762), `1703-trediakovsky-kantemir` (1703–1769), `1707-bidloo-moscow-hospital-school` (1707–1735), `1724-academy-of-sciences` (1724–1725), `1730-konditsii-tatishchev-history` (1730–1750), `1733-great-northern-expedition-bering` (1733–1743), `1735-hospital-reglament-medical-collegium` (1735–1763), `1735-trediakovsky-lomonosov-versification` (1735–1739), `1739-potemkin-grigory` (1739–1791), `1743-abo-peace-diplomatic-revolution` (1743–1756), `1756-volkov-russian-public-theatre` (1756–1763), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870) |
| `era-7` | ref (внеоконный) | 1739–1921 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1739-potemkin-grigory` (1739–1791), `1744-samoilovich-daniil` (1744–1805), `1755-moscow-university` (1755 (25 января)), `1763-first-civil-hospitals-empire` (1763–1779), `1768-catherine-variolation-dimsdale` (1768–1770), `1768-russian-classicism-empire` (1768–1834), `1769-russian-enlightenment-novikov-radishchev` (1769–1790), `1771-samoilovich-moscow-plague` (1771–1772), `1772-speransky-mikhail` (1772–1839), `1774-kankrin-egor` (1774–1845), `1776-mudrov-matvey` (1776–1831), `1780-haass-fyodor` (1780–1853), `1782-derzhavin-felitsa` (1782), `1782-fonvizin-nedorosl` (1782), `1791-derzhavin-vodopad` (1791–1794), `1791-jassy-treaty` (1791–1795), `1798-imperial-military-medical-academy` (1798–1808), `1802-moscow-charitable-hospitals-sheremetev` (1802–1844), `1809-mudrov-clinical-school` (1809–1831), `1812-krylov-basni-1812` (1811–1812), `1812-zhukovsky-svetlana-pevets` (1812), `1820-antarctica-bellingshausen-lazarev` (1820 (28 января)), `1822-griboedov-gore-ot-uma` (1822–1824), `1823-pushkin-evgeny-onegin` (1823–1831), `1842-gogol-mertvye-dushi` (1835–1842), `1836-chaadaev-westernizers-slavophiles` (1836–1860), `1836-glinka-russian-classical-music` (1836–1848), `1836-gogol-revizor` (1836), `1836-pushkin-kapitanskaya-dochka` (1836), `1837-lermontov-borodino-kalashnikov` (1837), `1840-lermontov-geroy-nashego-vremeni` (1838–1840), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1863-tolstoy-voyna-i-mir` (1863–1869), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1871-nekrasov-russkie-zhenshchiny` (1871–1872), `1881-leskov-levsha` (1881), `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)), `1921-yesenin-pugachev` (1921) |
| `era-8` | ref (внеоконный) | 1776–1949 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1776-mudrov-matvey` (1776–1831), `1780-haass-fyodor` (1780–1853), `1798-gorchakov-alexander` (1798–1883), `1802-moscow-charitable-hospitals-sheremetev` (1802–1844), `1810-pirogov-nikolay` (1810–1881), `1816-milyutin-dmitry` (1816–1912), `1826-lobachevsky-geometry` (1826–1829), `1829-sechenov-ivan` (1829–1905), `1832-botkin-sergey` (1832–1889), `1836-sklifosovsky-nikolay` (1836–1904), `1842-erisman-fyodor` (1842–1915), `1845-mechnikov-ilya` (1845–1916), `1847-filatov-nil` (1847–1902), `1847-pirogov-anesthesia-crimea` (1847–1855), `1847-turgenev-zapiski-okhotnika` (1847–1852), `1849-pavlov-ivan` (1849–1936), `1849-witte-sergey` (1849–1915), `1854-korsakov-sergey` (1854–1900), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1858-goncharov-fregat-pallada` (1855–1858), `1857-bekhterev-vladimir` (1857–1927), `1857-herzen-chicherin-narodnichestvo` (1857–1881), `1858-aigun-beijing` (1858–1867), `1859-gamaleya-nikolay` (1859–1949), `1859-goncharov-oblomov` (1859), `1859-ostrovsky-groza` (1859), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1861-botkin-clinical-therapy` (1861–1889), `1862-tchaikovsky-mighty-handful` (1862–1893), `1862-turgenev-ottsy-i-deti` (1862), `1863-nekrasov-komu-na-rusi` (1863–1877), `1864-ivanovsky-dmitry` (1864–1920), `1864-zemstvo-medicine` (1864–1917), `1866-dostoevsky-prestuplenie-i-nakazanie` (1866), `1866-tyutchev-umom-rossiyu-ne-ponyat` (1866), `1867-russian-red-cross-women-doctors` (1867–1872), `1869-mendeleev-periodic-law` (1869–1871), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1870-peredvizhniki-tretyakov-gallery` (1870–1892), `1871-dostoevsky-besy` (1871–1872), `1873-leskov-ocharovanny-strannik` (1873), `1873-tolstoy-anna-karenina` (1873–1877), `1874-korotkov-nikolay` (1874–1920), `1875-shchedrin-gospoda-golovlevy` (1875–1880), `1876-sklifosovsky-antiseptic-surgery` (1876–1904), `1878-ostrovsky-bespridannitsa` (1878), `1878-san-stefano-berlin` (1878 (февраль — июль)), `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918), `1879-dostoevsky-bratya-karamazovy` (1879–1880), `1880-lunin-vitamins-hygiene-school` (1880–1891), `1883-fet-vechernie-ogni` (1883–1891), `1883-mechnikov-phagocytosis-odessa-station` (1883–1908), `1887-korsakov-psychiatry-filatov-pediatrics` (1887–1900), `1890-iem-devichye-pole-clinics` (1887–1899), `1892-chekhov-palata-6-sakhalin` (1892–1895), `1892-ivanovsky-virology` (1892–1902), `1895-popov-radio` (1895–1900), `1904-pavlov-nobel` (1903–1904), `1905-portsmouth-treaty` (1905–1907), `1935-nabokov-dar` (1935–1938) |
| `era-9` | ref (внеоконный) | 1845–1991 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1845-mechnikov-ilya` (1845–1916), `1849-pavlov-ivan` (1849–1936), `1849-witte-sergey` (1849–1915), `1857-bekhterev-vladimir` (1857–1927), `1859-gamaleya-nikolay` (1859–1949), `1862-stolypin-pyotr` (1862–1911), `1864-ivanovsky-dmitry` (1864–1920), `1864-zemstvo-medicine` (1864–1917), `1874-korotkov-nikolay` (1874–1920), `1874-semashko-nikolay` (1874–1949), `1874-vishnevsky-alexander` (1874–1948), `1875-filatov-vladimir` (1875–1956), `1876-burdenko-nikolay` (1876–1946), `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918), `1883-mechnikov-phagocytosis-odessa-station` (1883–1908), `1885-anichkov-nikolay` (1885–1964), `1892-ivanovsky-virology` (1892–1902), `1896-chekhov-chayka-tri-sestry` (1896–1901), `1898-mhat-diaghilev-ballets-russes` (1898–1929), `1902-gorky-na-dne` (1902), `1903-chekhov-vishnevy-sad` (1903–1904), `1905-korotkov-blood-pressure-anichkov-atherosclerosis` (1905–1913), `1905-world-relativity-july-crisis` (1905–1914), `1906-gorky-mat` (1906–1907), `1907-bekhterev-psychoneurology` (1907–1927), `1908-blok-na-pole-kulikovom` (1908), `1910-russian-avant-garde` (1910–1932), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1917-filatov-ophthalmology-plastic` (1917–1956), `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1918-semashko-narkomzdrav` (1918–1930), `1920-goelro-plan` (1920–1931), `1921-nep-reform` (1921–1928), `1925-sholokhov-tikhiy-don` (1925–1940), `1925-yesenin-anna-snegina` (1925), `1926-blood-transfusion-institute-service` (1926–1945), `1926-nabokov-mashenka` (1926), `1929-great-depression` (1929–1933), `1938-kapitsa-superfluidity` (1938–1941), `1939-molotov-ribbentrop` (1939–1941), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-yalta-potsdam-treaties` (1943–1945), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `event-1237-batu-invasion` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826) |
| `event-1378-vozha-kulikovo` | ref (внеоконный) | 1337–1908 | `ARTS_CULTURE`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1337-sergius-radonezh-monastic-revival` (1337–1392), `1378-rublev-theophanes-trinity` (1378–1427), `1816-karamzin-history-state` (1816–1826), `1908-blok-na-pole-kulikovom` (1908) |
| `event-1480-ugra-standing` | ref (внеоконный) | 1475–1826 | `ARTS_CULTURE`, `WRITERS_WORKS` | `1475-fioravanti-moscow-kremlin` (1475–1516), `1816-karamzin-history-state` (1816–1826) |
| `event-1545-kazan-astrakhan` | ref (внеоконный) | 1555–1826 | `ARTS_CULTURE`, `WRITERS_WORKS` | `1555-saint-basil-cathedral` (1555–1561), `1816-karamzin-history-state` (1816–1826) |
| `event-1609-time-of-troubles-intervention` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826), `1825-pushkin-boris-godunov` (1825) |
| `event-1654-rus-polish-swedish-war` | ref (внеоконный) | 1654–1842 | `MEDICINE_HEALTH`, `WRITERS_WORKS` | `1654-moscow-plague-lekarskaya-shkola` (1654–1655), `1835-gogol-taras-bulba` (1835–1842) |
| `event-1700-northern-war` | ref (внеоконный) | 1703–1833 | `ARTS_CULTURE`, `MEDICINE_HEALTH`, `WRITERS_WORKS` | `1703-saint-petersburg-baroque-academy` (1703–1762), `1707-bidloo-moscow-hospital-school` (1707–1735), `1833-pushkin-medny-vsadnik` (1833) |
| `event-1721-nystad-treaty` | ref (внеоконный) | 1833–1833 | `WRITERS_WORKS` | `1833-pushkin-medny-vsadnik` (1833) |
| `event-1768-rus-turk` | ref (внеоконный) | 1771–1772 | `MEDICINE_HEALTH` | `1771-samoilovich-moscow-plague` (1771–1772) |
| `event-1771-plague-riot` | ref (внеоконный) | 1771–1772 | `MEDICINE_HEALTH` | `1771-samoilovich-moscow-plague` (1771–1772) |
| `event-1773-pugachev` | ref (внеоконный) | 1836–1921 | `WRITERS_WORKS` | `1836-pushkin-kapitanskaya-dochka` (1836), `1921-yesenin-pugachev` (1921) |
| `event-1787-rus-turk` | ref (внеоконный) | 1791–1794 | `WRITERS_WORKS` | `1791-derzhavin-vodopad` (1791–1794) |
| `event-1801-caucasian-war` | ref (внеоконный) | 1838–1904 | `WRITERS_WORKS` | `1840-lermontov-geroy-nashego-vremeni` (1838–1840), `1873-leskov-ocharovanny-strannik` (1873), `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)) |
| `event-1805-coalitions-3-4` | ref (внеоконный) | 1863–1869 | `WRITERS_WORKS` | `1863-tolstoy-voyna-i-mir` (1863–1869) |
| `event-1807-tilsit-treaty` | ref (внеоконный) | 1863–1869 | `WRITERS_WORKS` | `1863-tolstoy-voyna-i-mir` (1863–1869) |
| `event-1812-patriotic-war` | ref (внеоконный) | 1768–1869 | `ARTS_CULTURE`, `MEDICINE_HEALTH`, `WRITERS_WORKS` | `1768-russian-classicism-empire` (1768–1834), `1809-mudrov-clinical-school` (1809–1831), `1812-krylov-basni-1812` (1811–1812), `1812-zhukovsky-svetlana-pevets` (1812), `1837-lermontov-borodino-kalashnikov` (1837), `1863-tolstoy-voyna-i-mir` (1863–1869) |
| `event-1825-decembrists` | ref (внеоконный) | 1822–1872 | `WRITERS_WORKS` | `1822-griboedov-gore-ot-uma` (1822–1824), `1863-tolstoy-voyna-i-mir` (1863–1869), `1871-nekrasov-russkie-zhenshchiny` (1871–1872) |
| `event-1853-crimean-war` | ref (внеоконный) | 1855–1881 | `WRITERS_WORKS` | `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1858-goncharov-fregat-pallada` (1855–1858), `1881-leskov-levsha` (1881) |
| `event-1861-reform-emancipation` | ref (внеоконный) | 1847–1917 | `ARTS_CULTURE`, `MEDICINE_HEALTH`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1847-turgenev-zapiski-okhotnika` (1847–1852), `1857-herzen-chicherin-narodnichestvo` (1857–1881), `1859-goncharov-oblomov` (1859), `1862-turgenev-ottsy-i-deti` (1862), `1863-nekrasov-komu-na-rusi` (1863–1877), `1864-zemstvo-medicine` (1864–1917), `1870-peredvizhniki-tretyakov-gallery` (1870–1892) |
| `event-1877-rus-turk` | ref (внеоконный) | 1873–1904 | `MEDICINE_HEALTH`, `WRITERS_WORKS` | `1873-tolstoy-anna-karenina` (1873–1877), `1876-sklifosovsky-antiseptic-surgery` (1876–1904) |
| `event-1905-first-revolution` | ref (внеоконный) | 1878–1955 | `ARTS_CULTURE`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918), `1906-gorky-mat` (1906–1907), `1925-eisenstein-soviet-montage-cinema` (1925–1945), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)) |
| `event-1906-reform-stolypin` | ref (внеоконный) | 1971–1991 | `WRITERS_WORKS` | `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `event-1914-ww1` | ref (внеоконный) | 1914–1991 | `MEDICINE_HEALTH`, `WRITERS_WORKS` | `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1917-filatov-ophthalmology-plastic` (1917–1956), `1925-sholokhov-tikhiy-don` (1925–1940), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `event-1917-civil-war` | ref (внеоконный) | 1910–1991 | `ARTS_CULTURE`, `MEDICINE_HEALTH`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1910-russian-avant-garde` (1910–1932), `1917-patriarchate-philosophers-ship` (1917–1922), `1917-tsvetaeva-lebediny-stan` (1917–1921), `1918-blok-dvenadtsat` (1918 (январь)), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1918-semashko-narkomzdrav` (1918–1930), `1923-bulgakov-belaya-gvardiya` (1923–1925), `1925-sholokhov-tikhiy-don` (1925–1940), `1925-yesenin-anna-snegina` (1925), `1926-nabokov-mashenka` (1926), `1927-mayakovsky-khorosho` (1927), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `event-1918-reform-war-communism` | ref (внеоконный) | 1917–1930 | `MEDICINE_HEALTH`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1917-patriarchate-philosophers-ship` (1917–1922), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1918-semashko-narkomzdrav` (1918–1930), `1925-bulgakov-sobachye-serdtse` (1925) |
| `event-1920-peasant-uprisings` | ref (внеоконный) | 1921–1940 | `WRITERS_WORKS` | `1921-yesenin-pugachev` (1921), `1925-sholokhov-tikhiy-don` (1925–1940) |
| `event-1928-reform-five-year` | ref (внеоконный) | 1932–1973 | `WRITERS_WORKS` | `1932-sholokhov-podnyataya-tselina` (1932–1959), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)) |
| `event-1941-ww2` | ref (внеоконный) | 1874–1974 | `ARTS_CULTURE`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `WRITERS_WORKS` | `1874-vishnevsky-alexander` (1874–1948), `1876-burdenko-nikolay` (1876–1946), `1897-yermolyeva-zinaida` (1897–1974), `1917-filatov-ophthalmology-plastic` (1917–1956), `1925-eisenstein-soviet-montage-cinema` (1925–1945), `1926-blood-transfusion-institute-service` (1926–1945), `1927-vishnevsky-local-anesthesia` (1927–1948), `1936-shostakovich-prokofiev-symphonism` (1936–1953), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1941-burdenko-military-neurosurgery-ams` (1941–1946), `1942-yermolyeva-penicillin-stalingrad` (1942–1945), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1956-sholokhov-sudba-cheloveka` (1956), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)) |
| `kulikovo` | sync (±3 г.) | 1378–1380 | `WAR_CONTINENTAL` | `1378-vozha-kulikovo` (1378–1380) |
| `napoleonic` | sync + ref | 1805–1869 | `WAR_CONTINENTAL`, `WAR_EXPEDITION`, `WRITERS_WORKS` | `1805-coalitions-3-4` (1805–1807), `1812-krylov-basni-1812` (1811–1812), `1812-patriotic-war` (1812), `1812-zhukovsky-svetlana-pevets` (1812), `1813-foreign-campaigns` (1813–1814 (и 1815)), `1837-lermontov-borodino-kalashnikov` (1837), `1863-tolstoy-voyna-i-mir` (1863–1869) |
| `northern-war` | sync + ref | 1700–1833 | `SEAS`, `WRITERS_WORKS` | `1700-northern-war` (1700–1721), `1833-pushkin-medny-vsadnik` (1833) |
| `person-afanasy-nikitin` | sync (±3 г.) | 1468–1474 | `WRITERS_WORKS` | `1468-nikitin-khozhdenie-za-tri-morya` (1468–1474) |
| `person-agapit-pechersky` | sync (±3 г.) | 1050–1095 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1050-agapit-pechersky` (ок. 1050–1095), `1073-agapit-pechersky-monastic-medicine` (1073–1095) |
| `person-akhmatova-anna` | sync (±3 г.) | 1889–1966 | `WRITERS_BIO`, `WRITERS_WORKS` | `1889-akhmatova-anna` (1889–1966), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1940-akhmatova-poema-bez-geroya` (1940–1962) |
| `person-alexius-metropolitan` | sync (±3 г.) | 1296–1378 | `STATESMEN_BIO` | `1296-alexius-metropolitan` (1296–1378) |
| `person-alferov` | sync (±3 г.) | 1930–2000 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1930-alferov-zhores` (1930–2000), `2000-alferov-nobel` (1970–2000), `1986-mir-station` (1986–2001) |
| `person-anichkov-nikolay` | sync (±3 г.) | 1885–1964 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1885-anichkov-nikolay` (1885–1964), `1905-korotkov-blood-pressure-anichkov-atherosclerosis` (1905–1913) |
| `person-avvakum-petrov` | sync (±3 г.) | 1620–1682 | `REFORMS_ECO`, `WRITERS_BIO`, `WRITERS_WORKS` | `1620-avvakum-petrov` (1620–1682), `1653-church-schism-nikon` (1653–1667), `1672-zhitie-avvakuma` (1672–1675) |
| `person-bakulev-alexander` | sync (±3 г.) | 1890–1987 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1890-bakulev-alexander` (1890–1967), `1946-demikhov-bakulev-cardiac-transplant` (1946–1967), `1956-soviet-national-medical-centers` (1956–1987) |
| `person-bakunin-mikhail` | sync (±3 г.) | 1857–1881 | `THOUGHT_RELIGION` | `1857-herzen-chicherin-narodnichestvo` (1857–1881) |
| `person-basov-nikolay` | sync (±3 г.) | 1951–1964 | `SCIENCE_DISCOVERIES` | `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964) |
| `person-bazhenov-vasily` | sync (±3 г.) | 1768–1834 | `ARTS_CULTURE` | `1768-russian-classicism-empire` (1768–1834) |
| `person-bekhterev-vladimir` | sync (±3 г.) | 1857–1927 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1857-bekhterev-vladimir` (1857–1927), `1907-bekhterev-psychoneurology` (1907–1927) |
| `person-belinsky-vissarion` | sync (±3 г.) | 1836–1860 | `THOUGHT_RELIGION` | `1836-chaadaev-westernizers-slavophiles` (1836–1860) |
| `person-bellingshausen-faddey` | sync (±3 г.) | 1820–1820 | `SCIENCE_DISCOVERIES` | `1820-antarctica-bellingshausen-lazarev` (1820 (28 января)) |
| `person-berdyaev-nikolay` | sync (±3 г.) | 1878–1922 | `THOUGHT_RELIGION` | `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918), `1917-patriarchate-philosophers-ship` (1917–1922) |
| `person-bering-vitus` | sync (±3 г.) | 1733–1743 | `SCIENCE_DISCOVERIES` | `1733-great-northern-expedition-bering` (1733–1743) |
| `person-bestuzhev-ryumin` | sync (±3 г.) | 1743–1756 | `DIPLOMACY_TREATIES` | `1743-abo-peace-diplomatic-revolution` (1743–1756) |
| `person-bidloo-nikolay` | sync (±3 г.) | 1670–1735 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1670-bidloo-nikolay` (1670–1735), `1707-bidloo-moscow-hospital-school` (1707–1735) |
| `person-blok-alexander` | sync (±3 г.) | 1880–1921 | `WRITERS_BIO`, `WRITERS_WORKS` | `1880-blok-alexander` (1880–1921), `1908-blok-na-pole-kulikovom` (1908), `1918-blok-dvenadtsat` (1918 (январь)) |
| `person-botkin-sergey` | sync (±3 г.) | 1832–1889 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1832-botkin-sergey` (1832–1889), `1861-botkin-clinical-therapy` (1861–1889) |
| `person-bryullov-karl` | sync (±3 г.) | 1768–1834 | `ARTS_CULTURE` | `1768-russian-classicism-empire` (1768–1834) |
| `person-bulgakov-mikhail` | sync (±3 г.) | 1891–1940 | `WRITERS_BIO`, `WRITERS_WORKS` | `1891-bulgakov-mikhail` (1891–1940), `1923-bulgakov-belaya-gvardiya` (1923–1925), `1925-bulgakov-sobachye-serdtse` (1925), `1928-bulgakov-master-i-margarita` (1928–1940 (опубл. 1966)) |
| `person-bunin-ivan` | sync (±3 г.) | 1870–1953 | `WRITERS_BIO`, `WRITERS_WORKS` | `1870-bunin-ivan` (1870–1953), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)) |
| `person-burdenko-nikolay` | sync (±3 г.) | 1876–1946 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1876-burdenko-nikolay` (1876–1946), `1941-burdenko-military-neurosurgery-ams` (1941–1946) |
| `person-chaadaev-pyotr` | sync (±3 г.) | 1836–1860 | `THOUGHT_RELIGION` | `1836-chaadaev-westernizers-slavophiles` (1836–1860) |
| `person-chazov-evgeny` | sync (±3 г.) | 1929–2000 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1929-chazov-evgeny` (1929–2021), `1956-soviet-national-medical-centers` (1956–1987), `1993-oms-reform-modern-medicine` (1993–2000) |
| `person-chekhov-anton` | sync + ref | 1860–1929 | `ARTS_CULTURE`, `MEDICINE_HEALTH`, `WRITERS_BIO`, `WRITERS_WORKS` | `1860-chekhov-anton` (1860–1904), `1864-zemstvo-medicine` (1864–1917), `1892-chekhov-palata-6-sakhalin` (1892–1895), `1896-chekhov-chayka-tri-sestry` (1896–1901), `1898-mhat-diaghilev-ballets-russes` (1898–1929), `1903-chekhov-vishnevy-sad` (1903–1904) |
| `person-chicherin-boris` | sync (±3 г.) | 1857–1881 | `THOUGHT_RELIGION` | `1857-herzen-chicherin-narodnichestvo` (1857–1881) |
| `person-chirikov-aleksey` | sync (±3 г.) | 1733–1743 | `SCIENCE_DISCOVERIES` | `1733-great-northern-expedition-bering` (1733–1743) |
| `person-chumakov-mikhail` | sync (±3 г.) | 1909–1993 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1909-chumakov-mikhail` (1909–1993), `1937-zilber-pavlovsky-encephalitis-focality` (1937–1940), `1958-zhdanov-chumakov-global-vaccines` (1958–1980) |
| `person-demikhov-vladimir` | sync (±3 г.) | 1916–1998 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1916-demikhov-vladimir` (1916–1998), `1946-demikhov-bakulev-cardiac-transplant` (1946–1967) |
| `person-derzhavin-gavrila` | sync (±3 г.) | 1743–1816 | `WRITERS_BIO`, `WRITERS_WORKS` | `1743-derzhavin-gavrila` (1743–1816), `1782-derzhavin-felitsa` (1782), `1791-derzhavin-vodopad` (1791–1794) |
| `person-dezhnev-semyon` | sync (±3 г.) | 1648–1648 | `SCIENCE_DISCOVERIES` | `1648-dezhnev-bering-strait` (1648 (июнь–октябрь)) |
| `person-diaghilev-sergey` | sync (±3 г.) | 1898–1929 | `ARTS_CULTURE` | `1898-mhat-diaghilev-ballets-russes` (1898–1929) |
| `person-dimsdale-thomas` | sync (±3 г.) | 1768–1770 | `MEDICINE_HEALTH` | `1768-catherine-variolation-dimsdale` (1768–1770) |
| `person-dostoevsky-fyodor` | sync (±3 г.) | 1821–1881 | `WRITERS_BIO`, `WRITERS_WORKS` | `1821-dostoevsky-fyodor` (1821–1881), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1866-dostoevsky-prestuplenie-i-nakazanie` (1866), `1871-dostoevsky-besy` (1871–1872), `1879-dostoevsky-bratya-karamazovy` (1879–1880) |
| `person-eisenstein-sergey` | sync (±3 г.) | 1925–1945 | `ARTS_CULTURE` | `1925-eisenstein-soviet-montage-cinema` (1925–1945) |
| `person-erisman-fyodor` | sync (±3 г.) | 1842–1917 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1842-erisman-fyodor` (1842–1915), `1864-zemstvo-medicine` (1864–1917), `1880-lunin-vitamins-hygiene-school` (1880–1891) |
| `person-evpraksia-mstislavna` | sync (±3 г.) | 1130–1136 | `MEDICINE_HEALTH` | `1130-evpraksia-mazi-treatise` (1130-е годы) |
| `person-fet-afanasy` | sync (±3 г.) | 1820–1892 | `WRITERS_BIO`, `WRITERS_WORKS` | `1820-fet-afanasy` (1820–1892), `1850-fet-shepot-robkoe-dykhanie` (1850), `1883-fet-vechernie-ogni` (1883–1891) |
| `person-filatov-nil` | sync (±3 г.) | 1847–1902 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1847-filatov-nil` (1847–1902), `1887-korsakov-psychiatry-filatov-pediatrics` (1887–1900) |
| `person-filatov-vladimir` | sync (±3 г.) | 1875–1956 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1875-filatov-vladimir` (1875–1956), `1917-filatov-ophthalmology-plastic` (1917–1956) |
| `person-fioravanti-aristotele` | sync (±3 г.) | 1475–1516 | `ARTS_CULTURE` | `1475-fioravanti-moscow-kremlin` (1475–1516) |
| `person-florensky-pavel` | sync (±3 г.) | 1878–1918 | `THOUGHT_RELIGION` | `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918) |
| `person-fonvizin-denis` | sync (±3 г.) | 1745–1792 | `WRITERS_BIO`, `WRITERS_WORKS` | `1745-fonvizin-denis` (1745–1792), `1782-fonvizin-nedorosl` (1782) |
| `person-fyodorov-ivan` | sync (±3 г.) | 1564–1564 | `SCIENCE_DISCOVERIES` | `1564-ivan-fyodorov-apostol` (1564 (1 марта)) |
| `person-fyodorov-svyatoslav` | sync (±3 г.) | 1927–2000 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1927-fyodorov-svyatoslav` (1927–2000), `1970-fyodorov-eye-microsurgery` (1970–2000) |
| `person-gamaleya-nikolay` | sync (±3 г.) | 1859–1949 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1859-gamaleya-nikolay` (1859–1949), `1883-mechnikov-phagocytosis-odessa-station` (1883–1908) |
| `person-gergiev-valery` | sync (±3 г.) | 1992–2000 | `ARTS_CULTURE` | `1992-post-soviet-culture-global-stage` (1992–2000) |
| `person-glinka-mikhail` | sync (±3 г.) | 1836–1848 | `ARTS_CULTURE` | `1836-glinka-russian-classical-music` (1836–1848) |
| `person-gogol-nikolay` | sync (±3 г.) | 1809–1852 | `WRITERS_BIO`, `WRITERS_WORKS` | `1809-gogol-nikolay` (1809–1852), `1835-gogol-taras-bulba` (1835–1842), `1842-gogol-mertvye-dushi` (1835–1842), `1836-gogol-revizor` (1836) |
| `person-goncharov-ivan` | sync (±3 г.) | 1812–1891 | `WRITERS_BIO`, `WRITERS_WORKS` | `1812-goncharov-ivan` (1812–1891), `1858-goncharov-fregat-pallada` (1855–1858), `1859-goncharov-oblomov` (1859) |
| `person-gorchakov-alexander` | sync (±3 г.) | 1798–1883 | `STATESMEN_BIO` | `1798-gorchakov-alexander` (1798–1883) |
| `person-gorky-maxim` | sync (±3 г.) | 1868–1936 | `WRITERS_BIO`, `WRITERS_WORKS` | `1868-gorky-maxim` (1868–1936), `1902-gorky-na-dne` (1902), `1906-gorky-mat` (1906–1907) |
| `person-griboedov-aleksandr` | sync (±3 г.) | 1795–1829 | `WRITERS_BIO`, `WRITERS_WORKS` | `1795-griboedov-aleksandr` (1795–1829), `1822-griboedov-gore-ot-uma` (1822–1824) |
| `person-haass-fyodor` | sync (±3 г.) | 1780–1853 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1780-haass-fyodor` (1780–1853), `1802-moscow-charitable-hospitals-sheremetev` (1802–1844) |
| `person-herzen-alexander` | sync (±3 г.) | 1857–1881 | `THOUGHT_RELIGION` | `1857-herzen-chicherin-narodnichestvo` (1857–1881) |
| `person-hilarion-metropolitan` | sync (±3 г.) | 988–1051 | `THOUGHT_RELIGION` | `988-baptism-of-rus-hilarion` (988–1051) |
| `person-ilizarov-gavriil` | sync (±3 г.) | 1921–1992 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1921-ilizarov-gavriil` (1921–1992), `1951-ilizarov-orthopedics` (1951–1992) |
| `person-iov-patriarch` | sync (±3 г.) | 1551–1589 | `THOUGHT_RELIGION` | `1551-stoglav-patriarchate-1589` (1551–1589) |
| `person-ivanovsky-dmitry` | sync (±3 г.) | 1864–1920 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1864-ivanovsky-dmitry` (1864–1920), `1892-ivanovsky-virology` (1892–1902) |
| `person-jacob-robert` | sync (±3 г.) | 1581–1620 | `MEDICINE_HEALTH` | `1581-aptekarsky-prikaz` (1581–1620) |
| `person-kandinsky-vasily` | sync (±3 г.) | 1910–1932 | `ARTS_CULTURE` | `1910-russian-avant-garde` (1910–1932) |
| `person-kankrin-egor` | sync (±3 г.) | 1774–1845 | `STATESMEN_BIO` | `1774-kankrin-egor` (1774–1845) |
| `person-kantemir-antiokh` | sync (±3 г.) | 1703–1769 | `WRITERS_BIO` | `1703-trediakovsky-kantemir` (1703–1769) |
| `person-kantorovich-leonid` | sync (±3 г.) | 1912–1986 | `SCIENTISTS_BIO` | `1912-kantorovich-leonid` (1912–1986) |
| `person-kapitsa` | sync (±3 г.) | 1894–1984 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1894-kapitsa-pyotr` (1894–1984), `1938-kapitsa-superfluidity` (1938–1941) |
| `person-karamzin-nikolay` | sync (±3 г.) | 1766–1826 | `WRITERS_BIO`, `WRITERS_WORKS` | `1766-karamzin-nikolay` (1766–1826), `1792-karamzin-bednaya-liza` (1792), `1816-karamzin-history-state` (1816–1826) |
| `person-khomyakov-aleksey` | sync (±3 г.) | 1836–1860 | `THOUGHT_RELIGION` | `1836-chaadaev-westernizers-slavophiles` (1836–1860) |
| `person-kolmogorov-andrey` | sync (±3 г.) | 1903–1987 | `SCIENTISTS_BIO` | `1903-kolmogorov-andrey` (1903–1987) |
| `person-kondoidi-pavel` | sync (±3 г.) | 1735–1763 | `MEDICINE_HEALTH` | `1735-hospital-reglament-medical-collegium` (1735–1763) |
| `person-kondratiev-nikolay` | sync (±3 г.) | 1892–1938 | `SCIENTISTS_BIO` | `1892-kondratiev-nikolay` (1892–1938) |
| `person-korolev` | sync (±3 г.) | 1907–1975 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1907-korolev-sergey` (1907–1966), `1957-sputnik-1` (1957 (4 октября)), `1961-gagarin-vostok-1` (1961 (12 апреля)), `1970-lunokhod-venera` (1970–1975) |
| `person-korotkov-nikolay` | sync (±3 г.) | 1874–1920 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1874-korotkov-nikolay` (1874–1920), `1905-korotkov-blood-pressure-anichkov-atherosclerosis` (1905–1913) |
| `person-korsakov-sergey` | sync (±3 г.) | 1854–1900 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1854-korsakov-sergey` (1854–1900), `1887-korsakov-psychiatry-filatov-pediatrics` (1887–1900) |
| `person-kosygin-aleksey` | sync (±3 г.) | 1904–1980 | `STATESMEN_BIO` | `1904-kosygin-aleksey` (1904–1980) |
| `person-krylov-ivan` | sync (±3 г.) | 1769–1844 | `WRITERS_BIO`, `WRITERS_WORKS` | `1769-krylov-ivan` (1769–1844), `1812-krylov-basni-1812` (1811–1812) |
| `person-kulibin` | sync (±3 г.) | 1724–1818 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1724-academy-of-sciences` (1724–1725), `1735-kulibin-ivan` (1735–1818) |
| `person-kurbsky-andrey` | sync (±3 г.) | 1528–1583 | `WRITERS_BIO`, `WRITERS_WORKS` | `1528-kurbsky-peresvetov` (1528–1583), `1564-ivan-kurbsky-correspondence` (1564–1579) |
| `person-kurchatov` | sync (±3 г.) | 1903–1960 | `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1903-kurchatov-igor` (1903–1960), `1949-reform-nuclear` (1945–1953), `1954-obninsk-first-npp` (1954 (27 июня)) |
| `person-landau-lev` | sync (±3 г.) | 1908–1968 | `SCIENTISTS_BIO` | `1908-landau-lev` (1908–1968) |
| `person-lazarev-mikhail` | sync (±3 г.) | 1820–1820 | `SCIENCE_DISCOVERIES` | `1820-antarctica-bellingshausen-lazarev` (1820 (28 января)) |
| `person-lebedev-sergey` | sync (±3 г.) | 1951–1964 | `SCIENCE_DISCOVERIES` | `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964) |
| `person-lermontov-mikhail` | sync (±3 г.) | 1814–1841 | `WRITERS_BIO`, `WRITERS_WORKS` | `1814-lermontov-mikhail` (1814–1841), `1837-lermontov-borodino-kalashnikov` (1837), `1840-lermontov-geroy-nashego-vremeni` (1838–1840) |
| `person-leskov-nikolay` | sync (±3 г.) | 1831–1895 | `WRITERS_BIO`, `WRITERS_WORKS` | `1831-leskov-nikolay` (1831–1895), `1873-leskov-ocharovanny-strannik` (1873), `1881-leskov-levsha` (1881) |
| `person-likhachev-dmitry` | sync (±3 г.) | 1988–1991 | `THOUGHT_RELIGION` | `1988-millennium-baptism-constitution` (1988–1991) |
| `person-lobachevsky` | sync (±3 г.) | 1792–1856 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1792-lobachevsky-nikolay` (1792–1856), `1826-lobachevsky-geometry` (1826–1829) |
| `person-lomonosov` | sync (±3 г.) | 1687–1765 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO`, `WRITERS_WORKS` | `1687-slavyano-greko-latinskaya` (1687), `1711-lomonosov-mikhail` (1711–1765), `1724-academy-of-sciences` (1724–1725), `1735-trediakovsky-lomonosov-versification` (1735–1739), `1755-moscow-university` (1755 (25 января)) |
| `person-lunin-nikolay` | sync (±3 г.) | 1880–1891 | `MEDICINE_HEALTH` | `1880-lunin-vitamins-hygiene-school` (1880–1891) |
| `person-makary-metropolitan` | sync (±3 г.) | 1551–1589 | `THOUGHT_RELIGION` | `1551-stoglav-patriarchate-1589` (1551–1589) |
| `person-malevich-kazimir` | sync (±3 г.) | 1910–1932 | `ARTS_CULTURE` | `1910-russian-avant-garde` (1910–1932) |
| `person-mayakovsky-vladimir` | sync (±3 г.) | 1893–1930 | `WRITERS_BIO`, `WRITERS_WORKS` | `1893-mayakovsky-vladimir` (1893–1930), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1927-mayakovsky-khorosho` (1927) |
| `person-mechnikov-ilya` | sync (±3 г.) | 1845–1916 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1845-mechnikov-ilya` (1845–1916), `1883-mechnikov-phagocytosis-odessa-station` (1883–1908) |
| `person-mendeleev` | sync (±3 г.) | 1834–1907 | `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1834-mendeleev-dmitry` (1834–1907), `1869-mendeleev-periodic-law` (1869–1871), `1891-reform-transsib` (1891–1903) |
| `person-milyutin-dmitry` | sync (±3 г.) | 1816–1912 | `STATESMEN_BIO` | `1816-milyutin-dmitry` (1816–1912) |
| `person-minin-kuzma` | sync (±3 г.) | 1578–1642 | `STATESMEN_BIO` | `1578-pozharsky-minin` (1578–1642) |
| `person-mogila-pyotr` | sync (±3 г.) | 1632–1680 | `THOUGHT_RELIGION` | `1632-kiev-mohyla-simeon-polotsky` (1632–1680) |
| `person-mudrov-matvey` | sync (±3 г.) | 1776–1831 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1776-mudrov-matvey` (1776–1831), `1809-mudrov-clinical-school` (1809–1831) |
| `person-mussorgsky-modest` | sync (±3 г.) | 1862–1893 | `ARTS_CULTURE` | `1862-tchaikovsky-mighty-handful` (1862–1893) |
| `person-nabokov-vladimir` | sync (±3 г.) | 1899–1977 | `WRITERS_BIO`, `WRITERS_WORKS` | `1899-nabokov-vladimir` (1899–1977), `1926-nabokov-mashenka` (1926), `1935-nabokov-dar` (1935–1938) |
| `person-nekrasov-nikolay` | sync (±3 г.) | 1821–1878 | `WRITERS_BIO`, `WRITERS_WORKS` | `1821-nekrasov-nikolay` (1821–1878), `1863-nekrasov-komu-na-rusi` (1863–1877), `1871-nekrasov-russkie-zhenshchiny` (1871–1872) |
| `person-nestor-chronicler` | sync (±3 г.) | 1056–1114 | `WRITERS_BIO`, `WRITERS_WORKS` | `1056-nestor-chronicler` (1056–1114), `1113-povest-vremennykh-let` (1110–1113) |
| `person-novikov-nikolay` | sync (±3 г.) | 1769–1790 | `THOUGHT_RELIGION` | `1769-russian-enlightenment-novikov-radishchev` (1769–1790) |
| `person-ordin-nashchokin-afanasy` | sync (±3 г.) | 1605–1680 | `STATESMEN_BIO` | `1605-ordin-nashchokin-afanasy` (1605–1680) |
| `person-orlov-yury` | sync (±3 г.) | 1968–1989 | `THOUGHT_RELIGION` | `1968-sakharov-helsinki-human-rights` (1968–1989) |
| `person-ostrovsky-aleksandr` | sync (±3 г.) | 1823–1886 | `WRITERS_BIO`, `WRITERS_WORKS` | `1823-ostrovsky-aleksandr` (1823–1886), `1859-ostrovsky-groza` (1859), `1878-ostrovsky-bespridannitsa` (1878) |
| `person-pasternak-boris` | sync (±3 г.) | 1890–1960 | `WRITERS_BIO`, `WRITERS_WORKS` | `1890-pasternak-boris` (1890–1960), `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)) |
| `person-pavlov` | sync (±3 г.) | 1849–1936 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1849-pavlov-ivan` (1849–1936), `1861-botkin-clinical-therapy` (1861–1889), `1890-iem-devichye-pole-clinics` (1887–1899), `1904-pavlov-nobel` (1903–1904), `1907-bekhterev-psychoneurology` (1907–1927) |
| `person-pirogov` | sync (±3 г.) | 1810–1904 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1810-pirogov-nikolay` (1810–1881), `1847-pirogov-anesthesia-crimea` (1847–1855), `1876-sklifosovsky-antiseptic-surgery` (1876–1904) |
| `person-polotsky-simeon` | sync (±3 г.) | 1632–1680 | `THOUGHT_RELIGION` | `1632-kiev-mohyla-simeon-polotsky` (1632–1680) |
| `person-popov` | sync (±3 г.) | 1859–1906 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1859-popov-alexander` (1859–1906), `1895-popov-radio` (1895–1900) |
| `person-postnik-yakovlev` | sync (±3 г.) | 1555–1561 | `ARTS_CULTURE` | `1555-saint-basil-cathedral` (1555–1561) |
| `person-potemkin-grigory` | sync (±3 г.) | 1739–1791 | `STATESMEN_BIO` | `1739-potemkin-grigory` (1739–1791) |
| `person-pozharsky-dmitry` | sync (±3 г.) | 1578–1642 | `STATESMEN_BIO` | `1578-pozharsky-minin` (1578–1642) |
| `person-primakov-evgeny` | sync (±3 г.) | 1929–2000 | `STATESMEN_BIO` | `1929-primakov-evgeny` (1929–2015) |
| `person-prokhorov-alexander` | sync (±3 г.) | 1951–1964 | `SCIENCE_DISCOVERIES` | `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964) |
| `person-prokofiev-sergey` | sync (±3 г.) | 1936–1953 | `ARTS_CULTURE` | `1936-shostakovich-prokofiev-symphonism` (1936–1953) |
| `person-prokopovich-feofan` | sync (±3 г.) | 1717–1725 | `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1717-yunosti-chestnoe-zertsalo-prokopovich` (1717–1725), `1721-peter-holy-synod` (1721–1725) |
| `person-pushkin-alexander` | sync + ref | 1799–1938 | `ARTS_CULTURE`, `WRITERS_BIO`, `WRITERS_WORKS` | `1799-pushkin-alexander` (1799–1837), `1823-pushkin-evgeny-onegin` (1823–1831), `1825-pushkin-boris-godunov` (1825), `1833-pushkin-medny-vsadnik` (1833), `1836-glinka-russian-classical-music` (1836–1848), `1836-pushkin-kapitanskaya-dochka` (1836), `1935-nabokov-dar` (1935–1938) |
| `person-radishchev-alexander` | sync (±3 г.) | 1769–1790 | `THOUGHT_RELIGION` | `1769-russian-enlightenment-novikov-radishchev` (1769–1790) |
| `person-rastrelli-francesco` | sync (±3 г.) | 1703–1762 | `ARTS_CULTURE` | `1703-saint-petersburg-baroque-academy` (1703–1762) |
| `person-repin-ilya` | sync (±3 г.) | 1870–1892 | `ARTS_CULTURE` | `1870-peredvizhniki-tretyakov-gallery` (1870–1892) |
| `person-rimsky-korsakov-nikolay` | sync (±3 г.) | 1862–1893 | `ARTS_CULTURE` | `1862-tchaikovsky-mighty-handful` (1862–1893) |
| `person-rodchenko-alexander` | sync (±3 г.) | 1910–1932 | `ARTS_CULTURE` | `1910-russian-avant-garde` (1910–1932) |
| `person-rossi-karl` | sync (±3 г.) | 1768–1834 | `ARTS_CULTURE` | `1768-russian-classicism-empire` (1768–1834) |
| `person-rublev-andrey` | sync (±3 г.) | 1378–1427 | `ARTS_CULTURE` | `1378-rublev-theophanes-trinity` (1378–1427) |
| `person-sakharov` | sync (±3 г.) | 1921–1989 | `REFORMS_ECO`, `SCIENTISTS_BIO`, `THOUGHT_RELIGION` | `1921-sakharov-andrey` (1921–1989), `1949-reform-nuclear` (1945–1953), `1968-sakharov-helsinki-human-rights` (1968–1989) |
| `person-saltykov-shchedrin-mikhail` | sync (±3 г.) | 1826–1889 | `WRITERS_BIO`, `WRITERS_WORKS` | `1826-saltykov-shchedrin-mikhail` (1826–1889), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1875-shchedrin-gospoda-golovlevy` (1875–1880) |
| `person-samoilovich-daniil` | sync (±3 г.) | 1744–1805 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1744-samoilovich-daniil` (1744–1805), `1771-samoilovich-moscow-plague` (1771–1772) |
| `person-sechenov` | sync (±3 г.) | 1829–1927 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1829-sechenov-ivan` (1829–1905), `1861-botkin-clinical-therapy` (1861–1889), `1904-pavlov-nobel` (1903–1904), `1907-bekhterev-psychoneurology` (1907–1927) |
| `person-semashko-nikolay` | sync (±3 г.) | 1874–1949 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1874-semashko-nikolay` (1874–1949), `1918-semashko-narkomzdrav` (1918–1930) |
| `person-sergius-radonezh` | sync (±3 г.) | 1337–1392 | `THOUGHT_RELIGION` | `1337-sergius-radonezh-monastic-revival` (1337–1392) |
| `person-shnitke-alfred` | sync (±3 г.) | 1962–1986 | `ARTS_CULTURE` | `1962-tarkovsky-auteur-cinema` (1962–1986) |
| `person-sholokhov-mikhail` | sync (±3 г.) | 1905–1984 | `WRITERS_BIO`, `WRITERS_WORKS` | `1905-sholokhov-mikhail` (1905–1984), `1925-sholokhov-tikhiy-don` (1925–1940), `1932-sholokhov-podnyataya-tselina` (1932–1959), `1956-sholokhov-sudba-cheloveka` (1956) |
| `person-shostakovich-dmitri` | sync (±3 г.) | 1936–1953 | `ARTS_CULTURE` | `1936-shostakovich-prokofiev-symphonism` (1936–1953) |
| `person-shumakov-valery` | sync (±3 г.) | 1956–2000 | `MEDICINE_HEALTH` | `1956-soviet-national-medical-centers` (1956–1987), `1993-oms-reform-modern-medicine` (1993–2000) |
| `person-sklifosovsky-nikolay` | sync (±3 г.) | 1836–1904 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1836-sklifosovsky-nikolay` (1836–1904), `1876-sklifosovsky-antiseptic-surgery` (1876–1904), `1890-iem-devichye-pole-clinics` (1887–1899) |
| `person-smorodintsev-anatoly` | sync (±3 г.) | 1937–1980 | `MEDICINE_HEALTH` | `1937-zilber-pavlovsky-encephalitis-focality` (1937–1940), `1958-zhdanov-chumakov-global-vaccines` (1958–1980) |
| `person-sofoniy-ryazanets` | sync (±3 г.) | 1350–1405 | `WRITERS_BIO`, `WRITERS_WORKS` | `1350-sofoniy-ryazanets` (вт. пол. XIV — нач. XV в.), `1380-zadonshchina` (1380-е годы) |
| `person-sokurov-alexander` | sync (±3 г.) | 1992–2000 | `ARTS_CULTURE` | `1992-post-soviet-culture-global-stage` (1992–2000) |
| `person-solovyov-vladimir` | sync (±3 г.) | 1878–1918 | `THOUGHT_RELIGION` | `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918) |
| `person-solzhenitsyn-alexander` | sync (±3 г.) | 1918–2008 | `WRITERS_BIO`, `WRITERS_WORKS` | `1918-solzhenitsyn-alexander` (1918–2008), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)), `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `person-sorokin-pitirim` | sync (±3 г.) | 1917–1922 | `THOUGHT_RELIGION` | `1917-patriarchate-philosophers-ship` (1917–1922) |
| `person-sorsky-nil` | sync (±3 г.) | 1490–1524 | `THOUGHT_RELIGION` | `1490-non-possessors-third-rome` (1490–1524) |
| `person-speransky-mikhail` | sync (±3 г.) | 1772–1839 | `STATESMEN_BIO` | `1772-speransky-mikhail` (1772–1839) |
| `person-stanislavsky-konstantin` | sync (±3 г.) | 1898–1929 | `ARTS_CULTURE` | `1898-mhat-diaghilev-ballets-russes` (1898–1929) |
| `person-stolypin-pyotr` | sync (±3 г.) | 1862–1911 | `STATESMEN_BIO` | `1862-stolypin-pyotr` (1862–1911) |
| `person-stravinsky-igor` | sync (±3 г.) | 1898–1929 | `ARTS_CULTURE` | `1898-mhat-diaghilev-ballets-russes` (1898–1929) |
| `person-surikov-vasily` | sync (±3 г.) | 1870–1892 | `ARTS_CULTURE` | `1870-peredvizhniki-tretyakov-gallery` (1870–1892) |
| `person-suslova-nadezhda` | sync (±3 г.) | 1867–1872 | `MEDICINE_HEALTH` | `1867-russian-red-cross-women-doctors` (1867–1872) |
| `person-tarkovsky-andrey` | sync (±3 г.) | 1962–1986 | `ARTS_CULTURE` | `1962-tarkovsky-auteur-cinema` (1962–1986) |
| `person-tatishchev-vasily` | sync (±3 г.) | 1730–1750 | `THOUGHT_RELIGION` | `1730-konditsii-tatishchev-history` (1730–1750) |
| `person-tchaikovsky-pyotr` | sync (±3 г.) | 1862–1893 | `ARTS_CULTURE` | `1862-tchaikovsky-mighty-handful` (1862–1893) |
| `person-theophanes-greek` | sync (±3 г.) | 1378–1427 | `ARTS_CULTURE` | `1378-rublev-theophanes-trinity` (1378–1427) |
| `person-tikhon-patriarch` | sync (±3 г.) | 1917–1922 | `THOUGHT_RELIGION` | `1917-patriarchate-philosophers-ship` (1917–1922) |
| `person-tolstoy-leo` | sync (±3 г.) | 1828–1910 | `WRITERS_BIO`, `WRITERS_WORKS` | `1828-tolstoy-leo` (1828–1910), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1863-tolstoy-voyna-i-mir` (1863–1869), `1873-tolstoy-anna-karenina` (1873–1877), `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)) |
| `person-trediakovsky-vasily` | sync (±3 г.) | 1703–1769 | `WRITERS_BIO`, `WRITERS_WORKS` | `1703-trediakovsky-kantemir` (1703–1769), `1735-trediakovsky-lomonosov-versification` (1735–1739) |
| `person-tretyakov-pavel` | sync (±3 г.) | 1870–1892 | `ARTS_CULTURE` | `1870-peredvizhniki-tretyakov-gallery` (1870–1892) |
| `person-trezzini-domenico` | sync (±3 г.) | 1703–1762 | `ARTS_CULTURE` | `1703-saint-petersburg-baroque-academy` (1703–1762) |
| `person-tsiolkovsky` | sync (±3 г.) | 1857–2000 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1857-tsiolkovsky-konstantin` (1857–1935), `1957-sputnik-1` (1957 (4 октября)), `1961-gagarin-vostok-1` (1961 (12 апреля)), `1986-mir-station` (1986–2001) |
| `person-tsvetaeva-marina` | sync (±3 г.) | 1892–1941 | `WRITERS_BIO`, `WRITERS_WORKS` | `1892-tsvetaeva-marina` (1892–1941), `1917-tsvetaeva-lebediny-stan` (1917–1921), `1924-tsvetaeva-poema-gory-kontsa` (1924–1926) |
| `person-turgenev-ivan` | sync (±3 г.) | 1818–1883 | `WRITERS_BIO`, `WRITERS_WORKS` | `1818-turgenev-ivan` (1818–1883), `1847-turgenev-zapiski-okhotnika` (1847–1852), `1862-turgenev-ottsy-i-deti` (1862) |
| `person-tyutchev-fyodor` | sync (±3 г.) | 1803–1873 | `WRITERS_BIO`, `WRITERS_WORKS` | `1803-tyutchev-fyodor` (1803–1873), `1830-tyutchev-silentium` (1830), `1866-tyutchev-umom-rossiyu-ne-ponyat` (1866) |
| `person-ushakov-simon` | sync (±3 г.) | 1660–1699 | `ARTS_CULTURE` | `1660-simon-ushakov-naryshkin-baroque` (1660–1699) |
| `person-vavilov-nikolay` | sync (±3 г.) | 1887–1943 | `SCIENCE_DISCOVERIES`, `SCIENTISTS_BIO` | `1887-vavilov-nikolay` (1887–1943), `1920-vavilov-genetics-seed-bank` (1920–1940) |
| `person-vernadsky` | sync (±3 г.) | 1863–1945 | `SCIENTISTS_BIO` | `1863-vernadsky-vladimir` (1863–1945) |
| `person-vertov-dziga` | sync (±3 г.) | 1925–1945 | `ARTS_CULTURE` | `1925-eisenstein-soviet-montage-cinema` (1925–1945) |
| `person-vishnevsky-alexander` | sync (±3 г.) | 1874–1948 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1874-vishnevsky-alexander` (1874–1948), `1927-vishnevsky-local-anesthesia` (1927–1948) |
| `person-volkov-fedor` | sync (±3 г.) | 1756–1763 | `ARTS_CULTURE` | `1756-volkov-russian-public-theatre` (1756–1763) |
| `person-volotsky-joseph` | sync (±3 г.) | 1490–1524 | `THOUGHT_RELIGION` | `1490-non-possessors-third-rome` (1490–1524) |
| `person-witte-sergey` | sync (±3 г.) | 1849–1915 | `STATESMEN_BIO` | `1849-witte-sergey` (1849–1915) |
| `person-yermolyeva-zinaida` | sync (±3 г.) | 1897–1974 | `DOCTORS_BIO`, `MEDICINE_HEALTH` | `1897-yermolyeva-zinaida` (1897–1974), `1942-yermolyeva-penicillin-stalingrad` (1942–1945) |
| `person-yesenin-sergey` | sync (±3 г.) | 1895–1925 | `WRITERS_BIO`, `WRITERS_WORKS` | `1895-yesenin-sergey` (1895–1925), `1921-yesenin-pugachev` (1921), `1925-yesenin-anna-snegina` (1925) |
| `person-yudin-sergey` | sync (±3 г.) | 1926–1945 | `MEDICINE_HEALTH` | `1926-blood-transfusion-institute-service` (1926–1945) |
| `person-zhdanov-viktor` | sync (±3 г.) | 1958–1980 | `MEDICINE_HEALTH` | `1958-zhdanov-chumakov-global-vaccines` (1958–1980) |
| `person-zhukovsky-vasily` | sync (±3 г.) | 1783–1852 | `WRITERS_BIO`, `WRITERS_WORKS` | `1783-zhukovsky-vasily` (1783–1852), `1812-zhukovsky-svetlana-pevets` (1812) |
| `person-zybelin-semyon` | sync (±3 г.) | 1735–1763 | `MEDICINE_HEALTH` | `1735-hospital-reglament-medical-collegium` (1735–1763) |
| `reform-assignats` | sync (±3 г.) | 1769–1785 | `REFORMS_ECO` | `1769-reform-assignats` (1769–1785) |
| `reform-chosen-council` | sync (±3 г.) | 1549–1556 | `REFORMS_ECO` | `1549-chosen-council-sudebnik` (1549–1556) |
| `reform-church-schism` | sync (±3 г.) | 1653–1675 | `REFORMS_ECO`, `WRITERS_WORKS` | `1653-church-schism-nikon` (1653–1667), `1672-zhitie-avvakuma` (1672–1675) |
| `reform-customs-1754` | sync (±3 г.) | 1754–1754 | `REFORMS_ECO` | `1754-reform-customs` (1754) |
| `reform-denga-coinage-1380` | sync (±3 г.) | 1328–1382 | `REFORMS_ECO` | `1328-kalita-horde-tribute-denga-coinage` (1328–1382) |
| `reform-glinskaya-money` | sync (±3 г.) | 1535–1538 | `REFORMS_ECO` | `1535-glinskaya-money-reform` (1535–1538) |
| `reform-great-reforms` | sync (±3 г.) | 1861–1874 | `REFORMS_ECO` | `1861-reform-emancipation` (1861–1874) |
| `reform-horde-tribute-kalita` | sync (±3 г.) | 1328–1382 | `REFORMS_ECO` | `1328-kalita-horde-tribute-denga-coinage` (1328–1382) |
| `reform-industrialization` | sync (±3 г.) | 1920–1937 | `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `WORLD_CONTEXT` | `1920-goelro-plan` (1920–1931), `1928-reform-five-year` (1928–1937), `1929-great-depression` (1929–1933) |
| `reform-kankrin-money` | sync (±3 г.) | 1837–1843 | `REFORMS_ECO` | `1839-reform-kankrin` (1837–1843) |
| `reform-kosygin-1965` | sync (±3 г.) | 1965–1970 | `REFORMS_ECO` | `1965-kosygin-reform` (1965–1970 («Золотая восьмая пятилетка»)) |
| `reform-market-1990s` | sync (±3 г.) | 1992–1998 | `REFORMS_ECO` | `1992-reform-market-crisis` (1992–1998) |
| `reform-ministries` | sync (±3 г.) | 1802–1811 | `REFORMS_ECO` | `1802-reform-ministries` (1802–1811) |
| `reform-new-trade-statute` | sync (±3 г.) | 1667–1682 | `REFORMS_ECO` | `1667-new-trade-statute` (1667–1682) |
| `reform-nuclear-project` | sync (±3 г.) | 1945–1954 | `REFORMS_ECO`, `SCIENCE_DISCOVERIES` | `1949-reform-nuclear` (1945–1953), `1954-obninsk-first-npp` (1954 (27 июня)) |
| `reform-oil-boom` | sync (±3 г.) | 1973–1984 | `REFORMS_ECO` | `1973-reform-oil-boom` (1973–1984) |
| `reform-olga-pogosts` | sync (±3 г.) | 946–947 | `REFORMS_ECO` | `946-olga-tax-reform` (946–947) |
| `reform-oprichnina` | sync (±3 г.) | 1565–1572 | `REFORMS_ECO` | `1565-oprichnina` (1565–1572) |
| `reform-perestroika-eco` | sync (±3 г.) | 1985–1990 | `REFORMS_ECO` | `1987-perestroika-economy` (1985–1990) |
| `reform-peter-army` | sync (±3 г.) | 1699–1705 | `REFORMS_ECO` | `1699-reform-army` (1699–1705) |
| `reform-poll-tax` | sync (±3 г.) | 1718–1724 | `REFORMS_ECO` | `1718-reform-poll-tax` (1718–1724) |
| `reform-russkaya-pravda` | sync (±3 г.) | 1016–1113 | `REFORMS_ECO` | `1016-russkaya-pravda` (1016–1054), `1113-monomakh-statute` (1113) |
| `reform-rvsn` | sync (±3 г.) | 1954–1962 | `REFORMS_ECO` | `1959-reform-rvsn` (1954–1962) |
| `reform-sobornoye-ulozhenie` | sync (±3 г.) | 1649–1649 | `REFORMS_ECO` | `1649-sobornoye-ulozhenie` (1649 (январь)) |
| `reform-stolypin` | sync (±3 г.) | 1905–1911 | `REFORMS_ECO` | `1906-reform-stolypin` (1905–1911) |
| `reform-sudebnik-1497` | sync (±3 г.) | 1497–1497 | `REFORMS_ECO` | `1497-sudebnik-ivan3` (1497 (сентябрь)) |
| `reform-war-communism` | sync (±3 г.) | 1917–1928 | `REFORMS_ECO` | `1918-reform-war-communism` (1917–1920), `1921-nep-reform` (1921–1928) |
| `reform-witte-transsib` | sync (±3 г.) | 1891–1903 | `REFORMS_ECO` | `1891-reform-transsib` (1891–1903) |
| `ruler-alexander-1` | ref (внеоконный) | 1768–1881 | `ARTS_CULTURE`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `WRITERS_WORKS` | `1768-russian-classicism-empire` (1768–1834), `1772-speransky-mikhail` (1772–1839), `1776-mudrov-matvey` (1776–1831), `1780-haass-fyodor` (1780–1853), `1798-imperial-military-medical-academy` (1798–1808), `1802-moscow-charitable-hospitals-sheremetev` (1802–1844), `1809-mudrov-clinical-school` (1809–1831), `1812-krylov-basni-1812` (1811–1812), `1812-zhukovsky-svetlana-pevets` (1812), `1820-antarctica-bellingshausen-lazarev` (1820 (28 января)), `1822-griboedov-gore-ot-uma` (1822–1824), `1823-pushkin-evgeny-onegin` (1823–1831), `1837-lermontov-borodino-kalashnikov` (1837), `1863-tolstoy-voyna-i-mir` (1863–1869), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1881-leskov-levsha` (1881) |
| `ruler-alexander-2` | ref (внеоконный) | 1798–1917 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1798-gorchakov-alexander` (1798–1883), `1810-pirogov-nikolay` (1810–1881), `1816-milyutin-dmitry` (1816–1912), `1829-sechenov-ivan` (1829–1905), `1832-botkin-sergey` (1832–1889), `1836-sklifosovsky-nikolay` (1836–1904), `1842-erisman-fyodor` (1842–1915), `1847-turgenev-zapiski-okhotnika` (1847–1852), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1858-goncharov-fregat-pallada` (1855–1858), `1857-herzen-chicherin-narodnichestvo` (1857–1881), `1858-aigun-beijing` (1858–1867), `1859-goncharov-oblomov` (1859), `1859-ostrovsky-groza` (1859), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1861-botkin-clinical-therapy` (1861–1889), `1862-tchaikovsky-mighty-handful` (1862–1893), `1862-turgenev-ottsy-i-deti` (1862), `1863-nekrasov-komu-na-rusi` (1863–1877), `1864-zemstvo-medicine` (1864–1917), `1866-dostoevsky-prestuplenie-i-nakazanie` (1866), `1866-tyutchev-umom-rossiyu-ne-ponyat` (1866), `1867-russian-red-cross-women-doctors` (1867–1872), `1869-mendeleev-periodic-law` (1869–1871), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870), `1870-peredvizhniki-tretyakov-gallery` (1870–1892), `1871-dostoevsky-besy` (1871–1872), `1873-leskov-ocharovanny-strannik` (1873), `1873-tolstoy-anna-karenina` (1873–1877), `1875-shchedrin-gospoda-golovlevy` (1875–1880), `1876-sklifosovsky-antiseptic-surgery` (1876–1904), `1878-ostrovsky-bespridannitsa` (1878), `1878-san-stefano-berlin` (1878 (февраль — июль)), `1879-dostoevsky-bratya-karamazovy` (1879–1880), `1880-lunin-vitamins-hygiene-school` (1880–1891) |
| `ruler-alexander-3` | ref (внеоконный) | 1829–1918 | `ARTS_CULTURE`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1829-sechenov-ivan` (1829–1905), `1832-botkin-sergey` (1832–1889), `1836-sklifosovsky-nikolay` (1836–1904), `1842-erisman-fyodor` (1842–1915), `1847-filatov-nil` (1847–1902), `1849-witte-sergey` (1849–1915), `1854-korsakov-sergey` (1854–1900), `1861-botkin-clinical-therapy` (1861–1889), `1862-tchaikovsky-mighty-handful` (1862–1893), `1870-peredvizhniki-tretyakov-gallery` (1870–1892), `1876-sklifosovsky-antiseptic-surgery` (1876–1904), `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918), `1880-lunin-vitamins-hygiene-school` (1880–1891), `1883-fet-vechernie-ogni` (1883–1891), `1883-mechnikov-phagocytosis-odessa-station` (1883–1908), `1887-korsakov-psychiatry-filatov-pediatrics` (1887–1900), `1890-iem-devichye-pole-clinics` (1887–1899), `1892-chekhov-palata-6-sakhalin` (1892–1895), `1892-ivanovsky-virology` (1892–1902) |
| `ruler-alexander-nevsky` | ref (внеоконный) | 1243–1340 | `DIPLOMACY_TREATIES` | `1243-nevsky-kalita-horde-diplomacy` (1243–1340) |
| `ruler-alexey-mikhailovich` | ref (внеоконный) | 1581–1699 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1581-aptekarsky-prikaz` (1581–1620), `1605-ordin-nashchokin-afanasy` (1605–1680), `1618-thirty-years-westphalia` (1618–1648), `1632-kiev-mohyla-simeon-polotsky` (1632–1680), `1648-dezhnev-bering-strait` (1648 (июнь–октябрь)), `1649-sobornoye-ulozhenie` (1649 (январь)), `1653-church-schism-nikon` (1653–1667), `1654-moscow-plague-lekarskaya-shkola` (1654–1655), `1654-pereyaslav-andrusovo` (1654–1667), `1660-simon-ushakov-naryshkin-baroque` (1660–1699), `1667-new-trade-statute` (1667–1682), `1672-zhitie-avvakuma` (1672–1675) |
| `ruler-anna-ioannovna` | ref (внеоконный) | 1730–1750 | `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1730-konditsii-tatishchev-history` (1730–1750), `1735-trediakovsky-lomonosov-versification` (1735–1739) |
| `ruler-boris-godunov` | ref (внеоконный) | 1551–1826 | `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1551-stoglav-patriarchate-1589` (1551–1589), `1816-karamzin-history-state` (1816–1826), `1825-pushkin-boris-godunov` (1825) |
| `ruler-brezhnev` | ref (внеоконный) | 1904–2000 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION` | `1904-kosygin-aleksey` (1904–1980), `1951-ilizarov-orthopedics` (1951–1992), `1956-soviet-national-medical-centers` (1956–1987), `1958-zhdanov-chumakov-global-vaccines` (1958–1980), `1962-tarkovsky-auteur-cinema` (1962–1986), `1972-salt1-abm-treaty` (1963–1979), `1965-kosygin-reform` (1965–1970 («Золотая восьмая пятилетка»)), `1968-sakharov-helsinki-human-rights` (1968–1989), `1970-fyodorov-eye-microsurgery` (1970–2000), `1970-lunokhod-venera` (1970–1975), `2000-alferov-nobel` (1970–2000) |
| `ruler-catherine-1` | ref (внеоконный) | 1724–1725 | `SCIENCE_DISCOVERIES` | `1724-academy-of-sciences` (1724–1725) |
| `ruler-catherine-2` | ref (внеоконный) | 1735–1921 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1735-hospital-reglament-medical-collegium` (1735–1763), `1739-potemkin-grigory` (1739–1791), `1744-samoilovich-daniil` (1744–1805), `1763-first-civil-hospitals-empire` (1763–1779), `1768-catherine-variolation-dimsdale` (1768–1770), `1768-russian-classicism-empire` (1768–1834), `1769-russian-enlightenment-novikov-radishchev` (1769–1790), `1771-samoilovich-moscow-plague` (1771–1772), `1782-derzhavin-felitsa` (1782), `1782-fonvizin-nedorosl` (1782), `1791-derzhavin-vodopad` (1791–1794), `1791-jassy-treaty` (1791–1795), `1836-pushkin-kapitanskaya-dochka` (1836), `1921-yesenin-pugachev` (1921) |
| `ruler-dmitry-donskoy` | ref (внеоконный) | 1296–1908 | `ARTS_CULTURE`, `REFORMS_ECO`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1296-alexius-metropolitan` (1296–1378), `1328-kalita-horde-tribute-denga-coinage` (1328–1382), `1337-sergius-radonezh-monastic-revival` (1337–1392), `1378-rublev-theophanes-trinity` (1378–1427), `1380-zadonshchina` (1380-е годы), `1816-karamzin-history-state` (1816–1826), `1908-blok-na-pole-kulikovom` (1908) |
| `ruler-elizabeth` | ref (внеоконный) | 1703–1769 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION`, `WRITERS_BIO`, `WRITERS_WORKS` | `1703-saint-petersburg-baroque-academy` (1703–1762), `1703-trediakovsky-kantemir` (1703–1769), `1730-konditsii-tatishchev-history` (1730–1750), `1733-great-northern-expedition-bering` (1733–1743), `1735-hospital-reglament-medical-collegium` (1735–1763), `1735-trediakovsky-lomonosov-versification` (1735–1739), `1743-abo-peace-diplomatic-revolution` (1743–1756), `1755-moscow-university` (1755 (25 января)), `1756-volkov-russian-public-theatre` (1756–1763) |
| `ruler-false-dmitry-1` | ref (внеоконный) | 1825–1825 | `WRITERS_WORKS` | `1825-pushkin-boris-godunov` (1825) |
| `ruler-fyodor-3` | ref (внеоконный) | 1632–1699 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION` | `1632-kiev-mohyla-simeon-polotsky` (1632–1680), `1660-simon-ushakov-naryshkin-baroque` (1660–1699), `1667-new-trade-statute` (1667–1682), `1686-eternal-peace-nerchinsk` (1686–1689), `1687-slavyano-greko-latinskaya` (1687) |
| `ruler-gorbachev` | ref (внеоконный) | 1956–2000 | `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION` | `1956-soviet-national-medical-centers` (1956–1987), `1968-sakharov-helsinki-human-rights` (1968–1989), `1970-fyodorov-eye-microsurgery` (1970–2000), `1987-perestroika-economy` (1985–1990), `1986-mir-station` (1986–2001), `1988-millennium-baptism-constitution` (1988–1991) |
| `ruler-igor` | ref (внеоконный) | 911–944 | `DIPLOMACY_TREATIES` | `911-byzantine-treaties` (911 и 944) |
| `ruler-ivan-3` | ref (внеоконный) | 1439–1826 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `REFORMS_ECO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1453-fall-of-constantinople` (1439–1453), `1468-nikitin-khozhdenie-za-tri-morya` (1468–1474), `1475-fioravanti-moscow-kremlin` (1475–1516), `1489-habsburg-embassy` (1489–1517), `1490-non-possessors-third-rome` (1490–1524), `1492-columbus-reformation` (1492–1553), `1497-sudebnik-ivan3` (1497 (сентябрь)), `1816-karamzin-history-state` (1816–1826) |
| `ruler-ivan-4` | ref (внеоконный) | 1492–1837 | `ARTS_CULTURE`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_BIO`, `WRITERS_WORKS` | `1492-columbus-reformation` (1492–1553), `1528-kurbsky-peresvetov` (1528–1583), `1535-glinskaya-money-reform` (1535–1538), `1549-chosen-council-sudebnik` (1549–1556), `1551-stoglav-patriarchate-1589` (1551–1589), `1555-saint-basil-cathedral` (1555–1561), `1564-ivan-fyodorov-apostol` (1564 (1 марта)), `1564-ivan-kurbsky-correspondence` (1564–1579), `1565-oprichnina` (1565–1572), `1581-aptekarsky-prikaz` (1581–1620), `1816-karamzin-history-state` (1816–1826), `1837-lermontov-borodino-kalashnikov` (1837) |
| `ruler-ivan-kalita` | ref (внеоконный) | 1243–1382 | `DIPLOMACY_TREATIES`, `REFORMS_ECO` | `1243-nevsky-kalita-horde-diplomacy` (1243–1340), `1328-kalita-horde-tribute-denga-coinage` (1328–1382) |
| `ruler-izyaslav-1` | ref (внеоконный) | 1054–1054 | `WORLD_CONTEXT` | `1054-great-schism` (1054 (июль)) |
| `ruler-khrushchev` | ref (внеоконный) | 1946–1992 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `WRITERS_WORKS` | `1946-demikhov-bakulev-cardiac-transplant` (1946–1967), `1951-ilizarov-orthopedics` (1951–1992), `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964), `1954-obninsk-first-npp` (1954 (27 июня)), `1956-sholokhov-sudba-cheloveka` (1956), `1956-soviet-national-medical-centers` (1956–1987), `1957-sputnik-1` (1957 (4 октября)), `1958-zhdanov-chumakov-global-vaccines` (1958–1980), `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)), `1961-gagarin-vostok-1` (1961 (12 апреля)), `1962-tarkovsky-auteur-cinema` (1962–1986), `1972-salt1-abm-treaty` (1963–1979) |
| `ruler-lenin` | ref (внеоконный) | 1874–1973 | `DOCTORS_BIO`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1874-semashko-nikolay` (1874–1949), `1907-bekhterev-psychoneurology` (1907–1927), `1917-patriarchate-philosophers-ship` (1917–1922), `1917-tsvetaeva-lebediny-stan` (1917–1921), `1918-blok-dvenadtsat` (1918 (январь)), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1918-semashko-narkomzdrav` (1918–1930), `1920-goelro-plan` (1920–1931), `1921-nep-reform` (1921–1928), `1923-bulgakov-belaya-gvardiya` (1923–1925), `1925-sholokhov-tikhiy-don` (1925–1940), `1925-yesenin-anna-snegina` (1925), `1927-mayakovsky-khorosho` (1927), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)) |
| `ruler-mikhail-romanov` | ref (внеоконный) | 1578–1648 | `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH`, `STATESMEN_BIO`, `WORLD_CONTEXT` | `1578-pozharsky-minin` (1578–1642), `1581-aptekarsky-prikaz` (1581–1620), `1617-stolbovo-deulino` (1617–1634), `1618-thirty-years-westphalia` (1618–1648) |
| `ruler-monomakh` | ref (внеоконный) | 1050–1136 | `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `WRITERS_WORKS` | `1050-agapit-pechersky` (ок. 1050–1095), `1073-agapit-pechersky-monastic-medicine` (1073–1095), `1097-liubech-congress` (1097–1103), `1113-povest-vremennykh-let` (1110–1113), `1113-monomakh-statute` (1113), `1130-evpraksia-mazi-treatise` (1130-е годы) |
| `ruler-nicholas-1` | ref (внеоконный) | 1768–1904 | `ARTS_CULTURE`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1768-russian-classicism-empire` (1768–1834), `1772-speransky-mikhail` (1772–1839), `1774-kankrin-egor` (1774–1845), `1776-mudrov-matvey` (1776–1831), `1780-haass-fyodor` (1780–1853), `1802-moscow-charitable-hospitals-sheremetev` (1802–1844), `1809-mudrov-clinical-school` (1809–1831), `1810-pirogov-nikolay` (1810–1881), `1823-pushkin-evgeny-onegin` (1823–1831), `1826-lobachevsky-geometry` (1826–1829), `1842-gogol-mertvye-dushi` (1835–1842), `1836-chaadaev-westernizers-slavophiles` (1836–1860), `1836-glinka-russian-classical-music` (1836–1848), `1836-gogol-revizor` (1836), `1840-lermontov-geroy-nashego-vremeni` (1838–1840), `1847-pirogov-anesthesia-crimea` (1847–1855), `1847-turgenev-zapiski-okhotnika` (1847–1852), `1855-tolstoy-sevastopolskie-rasskazy` (1855–1856), `1858-goncharov-fregat-pallada` (1855–1858), `1860-dostoevsky-zapiski-mertvogo-doma` (1860–1862), `1871-nekrasov-russkie-zhenshchiny` (1871–1872), `1881-leskov-levsha` (1881), `1896-tolstoy-khadzhi-murat` (1896–1904 (опубл. 1912)) |
| `ruler-nicholas-2` | ref (внеоконный) | 1836–1991 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1836-sklifosovsky-nikolay` (1836–1904), `1847-filatov-nil` (1847–1902), `1849-witte-sergey` (1849–1915), `1854-korsakov-sergey` (1854–1900), `1862-stolypin-pyotr` (1862–1911), `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918), `1883-mechnikov-phagocytosis-odessa-station` (1883–1908), `1887-korsakov-psychiatry-filatov-pediatrics` (1887–1900), `1890-iem-devichye-pole-clinics` (1887–1899), `1892-ivanovsky-virology` (1892–1902), `1895-popov-radio` (1895–1900), `1896-chekhov-chayka-tri-sestry` (1896–1901), `1898-mhat-diaghilev-ballets-russes` (1898–1929), `1902-gorky-na-dne` (1902), `1903-chekhov-vishnevy-sad` (1903–1904), `1904-pavlov-nobel` (1903–1904), `1905-korotkov-blood-pressure-anichkov-atherosclerosis` (1905–1913), `1905-portsmouth-treaty` (1905–1907), `1905-world-relativity-july-crisis` (1905–1914), `1906-gorky-mat` (1906–1907), `1907-bekhterev-psychoneurology` (1907–1927), `1908-blok-na-pole-kulikovom` (1908), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1925-sholokhov-tikhiy-don` (1925–1940), `1926-nabokov-mashenka` (1926), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `ruler-oleg` | ref (внеоконный) | 911–1113 | `DIPLOMACY_TREATIES`, `WRITERS_WORKS` | `911-byzantine-treaties` (911 и 944), `1113-povest-vremennykh-let` (1110–1113) |
| `ruler-olga` | ref (внеоконный) | 946–947 | `REFORMS_ECO` | `946-olga-tax-reform` (946–947) |
| `ruler-paul-1` | ref (внеоконный) | 1798–1870 | `MEDICINE_HEALTH`, `WRITERS_WORKS` | `1798-imperial-military-medical-academy` (1798–1808), `1869-shchedrin-istoriya-odnogo-goroda` (1869–1870) |
| `ruler-peter-1` | ref (внеоконный) | 1670–1833 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `DOCTORS_BIO`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1670-bidloo-nikolay` (1670–1735), `1686-eternal-peace-nerchinsk` (1686–1689), `1703-saint-petersburg-baroque-academy` (1703–1762), `1707-bidloo-moscow-hospital-school` (1707–1735), `1717-yunosti-chestnoe-zertsalo-prokopovich` (1717–1725), `1721-peter-holy-synod` (1721–1725), `1724-academy-of-sciences` (1724–1725), `1833-pushkin-medny-vsadnik` (1833) |
| `ruler-provisional-govt` | ref (внеоконный) | 1917–1991 | `WRITERS_WORKS` | `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1925-yesenin-anna-snegina` (1925), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `ruler-rurik` | ref (внеоконный) | 1110–1113 | `WRITERS_WORKS` | `1113-povest-vremennykh-let` (1110–1113) |
| `ruler-ryurik` | ref (внеоконный) | 1816–1826 | `WRITERS_WORKS` | `1816-karamzin-history-state` (1816–1826) |
| `ruler-stalin` | ref (внеоконный) | 1904–1980 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH`, `REFORMS_ECO`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1904-kosygin-aleksey` (1904–1980), `1920-goelro-plan` (1920–1931), `1920-vavilov-genetics-seed-bank` (1920–1940), `1921-nep-reform` (1921–1928), `1924-tsvetaeva-poema-gory-kontsa` (1924–1926), `1925-bulgakov-sobachye-serdtse` (1925), `1927-mayakovsky-khorosho` (1927), `1928-bulgakov-master-i-margarita` (1928–1940 (опубл. 1966)), `1929-great-depression` (1929–1933), `1932-sholokhov-podnyataya-tselina` (1932–1959), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1936-shostakovich-prokofiev-symphonism` (1936–1953), `1937-zilber-pavlovsky-encephalitis-focality` (1937–1940), `1938-kapitsa-superfluidity` (1938–1941), `1939-molotov-ribbentrop` (1939–1941), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1941-burdenko-military-neurosurgery-ams` (1941–1946), `1942-yermolyeva-penicillin-stalingrad` (1942–1945), `1945-yalta-potsdam-treaties` (1943–1945), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1946-demikhov-bakulev-cardiac-transplant` (1946–1967), `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964), `1956-sholokhov-sudba-cheloveka` (1956), `1968-solzhenitsyn-arkhipelag-gulag` (1958–1968 (изд. 1973)), `1959-solzhenitsyn-odin-den` (1959 (опубл. 1962)) |
| `ruler-svyatopolk-2` | ref (внеоконный) | 1097–1103 | `DIPLOMACY_TREATIES` | `1097-liubech-congress` (1097–1103) |
| `ruler-vasily-2` | ref (внеоконный) | 1439–1453 | `WORLD_CONTEXT` | `1453-fall-of-constantinople` (1439–1453) |
| `ruler-vasily-3` | ref (внеоконный) | 1475–1524 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `THOUGHT_RELIGION` | `1475-fioravanti-moscow-kremlin` (1475–1516), `1489-habsburg-embassy` (1489–1517), `1490-non-possessors-third-rome` (1490–1524) |
| `ruler-vladimir-1` | ref (внеоконный) | 988–1826 | `ARTS_CULTURE`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `988-baptism-of-rus-hilarion` (988–1051), `989-sophia-cathedrals-rus-architecture` (989–1052), `1113-povest-vremennykh-let` (1110–1113), `1816-karamzin-history-state` (1816–1826) |
| `ruler-vsevolod-big-nest` | ref (внеоконный) | 1158–1215 | `ARTS_CULTURE`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1158-vladimir-suzdal-white-stone` (1158–1197), `1185-slovo-o-polku-igoreve` (1185–1187), `1204-fourth-crusade` (1204–1215) |
| `ruler-yaroslav-wise` | ref (внеоконный) | 988–1826 | `ARTS_CULTURE`, `REFORMS_ECO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `988-baptism-of-rus-hilarion` (988–1051), `989-sophia-cathedrals-rus-architecture` (989–1052), `1016-russkaya-pravda` (1016–1054), `1054-great-schism` (1054 (июль)), `1113-povest-vremennykh-let` (1110–1113), `1816-karamzin-history-state` (1816–1826) |
| `ruler-yeltsin` | ref (внеоконный) | 1929–2000 | `ARTS_CULTURE`, `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH`, `SCIENCE_DISCOVERIES`, `STATESMEN_BIO`, `THOUGHT_RELIGION`, `WORLD_CONTEXT` | `1929-primakov-evgeny` (1929–2015), `1970-fyodorov-eye-microsurgery` (1970–2000), `2000-alferov-nobel` (1970–2000), `1986-mir-station` (1986–2001), `1992-post-soviet-culture-global-stage` (1992–2000), `1992-world-maastricht-www-globalization` (1992–2000), `1993-oms-reform-modern-medicine` (1993–2000), `1993-russian-constitution-civil-society` (1993–1998), `1994-budapest-nato-multipolar-diplomacy` (1994–1999) |
| `smuta` | sync (±3 г.) | 1609–1618 | `WAR_CONTINENTAL` | `1609-time-of-troubles-intervention` (1609–1618) |
| `topic-antibiotics` | sync (±3 г.) | 1942–1945 | `MEDICINE_HEALTH` | `1942-yermolyeva-penicillin-stalingrad` (1942–1945) |
| `topic-architecture` | sync (±3 г.) | 989–2000 | `ARTS_CULTURE` | `989-sophia-cathedrals-rus-architecture` (989–1052), `1158-vladimir-suzdal-white-stone` (1158–1197), `1475-fioravanti-moscow-kremlin` (1475–1516), `1555-saint-basil-cathedral` (1555–1561), `1660-simon-ushakov-naryshkin-baroque` (1660–1699), `1703-saint-petersburg-baroque-academy` (1703–1762), `1768-russian-classicism-empire` (1768–1834), `1910-russian-avant-garde` (1910–1932), `1992-post-soviet-culture-global-stage` (1992–2000) |
| `topic-church-history` | sync (±3 г.) | 988–1991 | `ARTS_CULTURE`, `THOUGHT_RELIGION` | `988-baptism-of-rus-hilarion` (988–1051), `989-sophia-cathedrals-rus-architecture` (989–1052), `1337-sergius-radonezh-monastic-revival` (1337–1392), `1490-non-possessors-third-rome` (1490–1524), `1551-stoglav-patriarchate-1589` (1551–1589), `1632-kiev-mohyla-simeon-polotsky` (1632–1680), `1721-peter-holy-synod` (1721–1725), `1917-patriarchate-philosophers-ship` (1917–1922), `1988-millennium-baptism-constitution` (1988–1991) |
| `topic-cinema` | sync (±3 г.) | 1925–2000 | `ARTS_CULTURE` | `1925-eisenstein-soviet-montage-cinema` (1925–1945), `1962-tarkovsky-auteur-cinema` (1962–1986), `1992-post-soviet-culture-global-stage` (1992–2000) |
| `topic-clinical-medicine` | sync (±3 г.) | 1763–2000 | `MEDICINE_HEALTH` | `1763-first-civil-hospitals-empire` (1763–1779), `1802-moscow-charitable-hospitals-sheremetev` (1802–1844), `1809-mudrov-clinical-school` (1809–1831), `1861-botkin-clinical-therapy` (1861–1889), `1887-korsakov-psychiatry-filatov-pediatrics` (1887–1900), `1905-korotkov-blood-pressure-anichkov-atherosclerosis` (1905–1913), `1956-soviet-national-medical-centers` (1956–1987), `1993-oms-reform-modern-medicine` (1993–2000) |
| `topic-computing` | sync (±3 г.) | 1951–2000 | `SCIENCE_DISCOVERIES`, `WORLD_CONTEXT` | `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964), `1992-world-maastricht-www-globalization` (1992–2000) |
| `topic-economics` | ref (внеоконный) | 1892–1986 | `SCIENTISTS_BIO` | `1892-kondratiev-nikolay` (1892–1938), `1912-kantorovich-leonid` (1912–1986) |
| `topic-enlightenment` | sync (±3 г.) | 1564–1790 | `SCIENCE_DISCOVERIES`, `THOUGHT_RELIGION`, `WRITERS_WORKS` | `1564-ivan-fyodorov-apostol` (1564 (1 марта)), `1632-kiev-mohyla-simeon-polotsky` (1632–1680), `1717-yunosti-chestnoe-zertsalo-prokopovich` (1717–1725), `1769-russian-enlightenment-novikov-radishchev` (1769–1790) |
| `topic-epidemiology` | sync (±3 г.) | 1347–1980 | `MEDICINE_HEALTH`, `WORLD_CONTEXT` | `1347-world-black-death-renaissance` (1347–1353), `1352-black-death-rus-quarantines` (1352–1386), `1654-moscow-plague-lekarskaya-shkola` (1654–1655), `1768-catherine-variolation-dimsdale` (1768–1770), `1771-samoilovich-moscow-plague` (1771–1772), `1883-mechnikov-phagocytosis-odessa-station` (1883–1908), `1890-iem-devichye-pole-clinics` (1887–1899), `1892-ivanovsky-virology` (1892–1902), `1918-semashko-narkomzdrav` (1918–1930), `1937-zilber-pavlovsky-encephalitis-focality` (1937–1940), `1942-yermolyeva-penicillin-stalingrad` (1942–1945), `1958-zhdanov-chumakov-global-vaccines` (1958–1980) |
| `topic-fine-arts` | sync (±3 г.) | 1378–1932 | `ARTS_CULTURE` | `1378-rublev-theophanes-trinity` (1378–1427), `1660-simon-ushakov-naryshkin-baroque` (1660–1699), `1703-saint-petersburg-baroque-academy` (1703–1762), `1768-russian-classicism-empire` (1768–1834), `1870-peredvizhniki-tretyakov-gallery` (1870–1892), `1910-russian-avant-garde` (1910–1932) |
| `topic-genetics` | sync (±3 г.) | 1920–1940 | `SCIENCE_DISCOVERIES` | `1920-vavilov-genetics-seed-bank` (1920–1940) |
| `topic-geography` | sync (±3 г.) | 1648–1820 | `SCIENCE_DISCOVERIES` | `1648-dezhnev-bering-strait` (1648 (июнь–октябрь)), `1733-great-northern-expedition-bering` (1733–1743), `1820-antarctica-bellingshausen-lazarev` (1820 (28 января)) |
| `topic-immunology` | sync (±3 г.) | 1883–1980 | `MEDICINE_HEALTH` | `1883-mechnikov-phagocytosis-odessa-station` (1883–1908), `1892-ivanovsky-virology` (1892–1902), `1937-zilber-pavlovsky-encephalitis-focality` (1937–1940), `1958-zhdanov-chumakov-global-vaccines` (1958–1980) |
| `topic-law` | sync (±3 г.) | 1730–1998 | `STATESMEN_BIO`, `THOUGHT_RELIGION` | `1730-konditsii-tatishchev-history` (1730–1750), `1772-speransky-mikhail` (1772–1839), `1857-herzen-chicherin-narodnichestvo` (1857–1881), `1968-sakharov-helsinki-human-rights` (1968–1989), `1993-russian-constitution-civil-society` (1993–1998) |
| `topic-medical-education` | sync (±3 г.) | 1654–1899 | `MEDICINE_HEALTH` | `1654-moscow-plague-lekarskaya-shkola` (1654–1655), `1707-bidloo-moscow-hospital-school` (1707–1735), `1735-hospital-reglament-medical-collegium` (1735–1763), `1798-imperial-military-medical-academy` (1798–1808), `1809-mudrov-clinical-school` (1809–1831), `1867-russian-red-cross-women-doctors` (1867–1872), `1890-iem-devichye-pole-clinics` (1887–1899) |
| `topic-medicine` | ref (внеоконный) | 1845–1916 | `DOCTORS_BIO` | `1845-mechnikov-ilya` (1845–1916) |
| `topic-music` | sync (±3 г.) | 1836–2000 | `ARTS_CULTURE` | `1836-glinka-russian-classical-music` (1836–1848), `1862-tchaikovsky-mighty-handful` (1862–1893), `1898-mhat-diaghilev-ballets-russes` (1898–1929), `1936-shostakovich-prokofiev-symphonism` (1936–1953), `1992-post-soviet-culture-global-stage` (1992–2000) |
| `topic-neuroscience` | sync (±3 г.) | 1903–1927 | `MEDICINE_HEALTH` | `1904-pavlov-nobel` (1903–1904), `1907-bekhterev-psychoneurology` (1907–1927) |
| `topic-ophthalmology` | sync (±3 г.) | 1917–2000 | `MEDICINE_HEALTH` | `1917-filatov-ophthalmology-plastic` (1917–1956), `1970-fyodorov-eye-microsurgery` (1970–2000) |
| `topic-pharmacology` | sync (±3 г.) | 1130–1620 | `MEDICINE_HEALTH` | `1130-evpraksia-mazi-treatise` (1130-е годы), `1581-aptekarsky-prikaz` (1581–1620) |
| `topic-physics` | sync (±3 г.) | 1951–1964 | `SCIENCE_DISCOVERIES` | `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964) |
| `topic-public-health` | sync (±3 г.) | 1073–2000 | `MEDICINE_HEALTH` | `1073-agapit-pechersky-monastic-medicine` (1073–1095), `1352-black-death-rus-quarantines` (1352–1386), `1581-aptekarsky-prikaz` (1581–1620), `1735-hospital-reglament-medical-collegium` (1735–1763), `1763-first-civil-hospitals-empire` (1763–1779), `1768-catherine-variolation-dimsdale` (1768–1770), `1771-samoilovich-moscow-plague` (1771–1772), `1802-moscow-charitable-hospitals-sheremetev` (1802–1844), `1864-zemstvo-medicine` (1864–1917), `1867-russian-red-cross-women-doctors` (1867–1872), `1880-lunin-vitamins-hygiene-school` (1880–1891), `1918-semashko-narkomzdrav` (1918–1930), `1926-blood-transfusion-institute-service` (1926–1945), `1941-burdenko-military-neurosurgery-ams` (1941–1946), `1993-oms-reform-modern-medicine` (1993–2000) |
| `topic-science` | ref (внеоконный) | 1887–1987 | `SCIENTISTS_BIO` | `1887-vavilov-nikolay` (1887–1943), `1903-kolmogorov-andrey` (1903–1987), `1908-landau-lev` (1908–1968), `1912-kantorovich-leonid` (1912–1986) |
| `topic-silver-age` | sync (±3 г.) | 1870–1966 | `ARTS_CULTURE`, `THOUGHT_RELIGION`, `WRITERS_BIO`, `WRITERS_WORKS` | `1870-bunin-ivan` (1870–1953), `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918), `1880-blok-alexander` (1880–1921), `1889-akhmatova-anna` (1889–1966), `1890-pasternak-boris` (1890–1960), `1892-tsvetaeva-marina` (1892–1941), `1893-mayakovsky-vladimir` (1893–1930), `1895-yesenin-sergey` (1895–1925), `1898-mhat-diaghilev-ballets-russes` (1898–1929), `1908-blok-na-pole-kulikovom` (1908), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1917-pasternak-sestra-moya-zhizn` (1917 (изд. 1922)), `1917-tsvetaeva-lebediny-stan` (1917–1921), `1918-blok-dvenadtsat` (1918 (январь)), `1918-bunin-okayannye-dni` (1918–1920 (изд. 1925)), `1921-yesenin-pugachev` (1921), `1924-tsvetaeva-poema-gory-kontsa` (1924–1926), `1925-yesenin-anna-snegina` (1925), `1927-mayakovsky-khorosho` (1927), `1935-akhmatova-rekviem` (1935–1940 (опубл. 1963/1987)), `1940-akhmatova-poema-bez-geroya` (1940–1962), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)) |
| `topic-social-thought` | sync (±3 г.) | 988–1998 | `THOUGHT_RELIGION`, `WRITERS_BIO`, `WRITERS_WORKS` | `988-baptism-of-rus-hilarion` (988–1051), `1337-sergius-radonezh-monastic-revival` (1337–1392), `1490-non-possessors-third-rome` (1490–1524), `1528-kurbsky-peresvetov` (1528–1583), `1564-ivan-kurbsky-correspondence` (1564–1579), `1721-peter-holy-synod` (1721–1725), `1730-konditsii-tatishchev-history` (1730–1750), `1769-russian-enlightenment-novikov-radishchev` (1769–1790), `1836-chaadaev-westernizers-slavophiles` (1836–1860), `1857-herzen-chicherin-narodnichestvo` (1857–1881), `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918), `1917-patriarchate-philosophers-ship` (1917–1922), `1968-sakharov-helsinki-human-rights` (1968–1989), `1988-millennium-baptism-constitution` (1988–1991), `1993-russian-constitution-civil-society` (1993–1998) |
| `topic-statecraft` | sync (±3 г.) | 1243–2000 | `DIPLOMACY_TREATIES`, `STATESMEN_BIO` | `1243-nevsky-kalita-horde-diplomacy` (1243–1340), `1296-alexius-metropolitan` (1296–1378), `1578-pozharsky-minin` (1578–1642), `1605-ordin-nashchokin-afanasy` (1605–1680), `1739-potemkin-grigory` (1739–1791), `1772-speransky-mikhail` (1772–1839), `1774-kankrin-egor` (1774–1845), `1798-gorchakov-alexander` (1798–1883), `1816-milyutin-dmitry` (1816–1912), `1849-witte-sergey` (1849–1915), `1862-stolypin-pyotr` (1862–1911), `1904-kosygin-aleksey` (1904–1980), `1929-primakov-evgeny` (1929–2015) |
| `topic-surgery` | sync (±3 г.) | 1707–2000 | `MEDICINE_HEALTH` | `1707-bidloo-moscow-hospital-school` (1707–1735), `1798-imperial-military-medical-academy` (1798–1808), `1847-pirogov-anesthesia-crimea` (1847–1855), `1876-sklifosovsky-antiseptic-surgery` (1876–1904), `1917-filatov-ophthalmology-plastic` (1917–1956), `1926-blood-transfusion-institute-service` (1926–1945), `1927-vishnevsky-local-anesthesia` (1927–1948), `1941-burdenko-military-neurosurgery-ams` (1941–1946), `1946-demikhov-bakulev-cardiac-transplant` (1946–1967), `1951-ilizarov-orthopedics` (1951–1992), `1970-fyodorov-eye-microsurgery` (1970–2000) |
| `topic-theatre` | sync (±3 г.) | 1756–1986 | `ARTS_CULTURE` | `1756-volkov-russian-public-theatre` (1756–1763), `1898-mhat-diaghilev-ballets-russes` (1898–1929), `1962-tarkovsky-auteur-cinema` (1962–1986) |
| `topic-transplantology` | sync (±3 г.) | 1946–1987 | `MEDICINE_HEALTH` | `1946-demikhov-bakulev-cardiac-transplant` (1946–1967), `1956-soviet-national-medical-centers` (1956–1987) |
| `treaty-abo-1743` | sync (±3 г.) | 1743–1756 | `DIPLOMACY_TREATIES` | `1743-abo-peace-diplomatic-revolution` (1743–1756) |
| `treaty-aigun-beijing` | sync (±3 г.) | 1858–1867 | `DIPLOMACY_TREATIES` | `1858-aigun-beijing` (1858–1867) |
| `treaty-belovezha` | sync (±3 г.) | 1991–1997 | `DIPLOMACY_TREATIES` | `1991-belovezha-budapest` (1991–1997) |
| `treaty-brest-1918` | sync (±3 г.) | 1918–1922 | `DIPLOMACY_TREATIES` | `1918-brest-molotov` (1918–1922) |
| `treaty-budapest-1994` | sync (±3 г.) | 1994–1999 | `DIPLOMACY_TREATIES` | `1994-budapest-nato-multipolar-diplomacy` (1994–1999) |
| `treaty-byzantium-911` | sync (±3 г.) | 911–1113 | `DIPLOMACY_TREATIES`, `WRITERS_WORKS` | `911-byzantine-treaties` (911 и 944), `1113-povest-vremennykh-let` (1110–1113) |
| `treaty-eternal-peace-1686` | sync (±3 г.) | 1686–1689 | `DIPLOMACY_TREATIES` | `1686-eternal-peace-nerchinsk` (1686–1689) |
| `treaty-horde-yarlyk-diplomacy` | sync (±3 г.) | 1243–1340 | `DIPLOMACY_TREATIES` | `1243-nevsky-kalita-horde-diplomacy` (1243–1340) |
| `treaty-jassy-1791` | sync (±3 г.) | 1791–1795 | `DIPLOMACY_TREATIES` | `1791-jassy-treaty` (1791–1795) |
| `treaty-kuchuk-kainarji` | sync (±3 г.) | 1774–1783 | `DIPLOMACY_TREATIES` | `1774-kuchuk-kainarji` (1774–1783) |
| `treaty-liubech-1097` | sync (±3 г.) | 1097–1103 | `DIPLOMACY_TREATIES` | `1097-liubech-congress` (1097–1103) |
| `treaty-molotov-ribbentrop` | sync (±3 г.) | 1939–1941 | `DIPLOMACY_TREATIES` | `1939-molotov-ribbentrop` (1939–1941) |
| `treaty-moscow-sovereignty` | sync (±3 г.) | 1489–1517 | `DIPLOMACY_TREATIES` | `1489-habsburg-embassy` (1489–1517) |
| `treaty-nerchinsk-1689` | sync (±3 г.) | 1686–1689 | `DIPLOMACY_TREATIES` | `1686-eternal-peace-nerchinsk` (1686–1689) |
| `treaty-nystad` | sync (±3 г.) | 1721–1721 | `DIPLOMACY_TREATIES` | `1721-nystad-treaty` (1721 (30 августа)) |
| `treaty-paris-berlin` | sync (±3 г.) | 1856–1878 | `DIPLOMACY_TREATIES` | `1856-paris-berlin` (1856–1871), `1878-san-stefano-berlin` (1878 (февраль — июль)) |
| `treaty-pereyaslav-andrusovo` | sync (±3 г.) | 1654–1667 | `DIPLOMACY_TREATIES` | `1654-pereyaslav-andrusovo` (1654–1667) |
| `treaty-portsmouth-1905` | sync (±3 г.) | 1905–1907 | `DIPLOMACY_TREATIES` | `1905-portsmouth-treaty` (1905–1907) |
| `treaty-russia-nato-1997` | sync (±3 г.) | 1994–1999 | `DIPLOMACY_TREATIES` | `1994-budapest-nato-multipolar-diplomacy` (1994–1999) |
| `treaty-salt-abm` | sync (±3 г.) | 1963–1979 | `DIPLOMACY_TREATIES` | `1972-salt1-abm-treaty` (1963–1979) |
| `treaty-stolbovo-deulino` | sync (±3 г.) | 1617–1634 | `DIPLOMACY_TREATIES` | `1617-stolbovo-deulino` (1617–1634) |
| `treaty-tilsit` | sync (±3 г.) | 1807–1812 | `DIPLOMACY_TREATIES` | `1807-tilsit-treaty` (1807–1812) |
| `treaty-yalta-potsdam` | sync (±3 г.) | 1943–1945 | `DIPLOMACY_TREATIES` | `1945-yalta-potsdam-treaties` (1943–1945) |
| `war-crimean` | sync (±3 г.) | 1847–1871 | `DIPLOMACY_TREATIES`, `MEDICINE_HEALTH` | `1847-pirogov-anesthesia-crimea` (1847–1855), `1856-paris-berlin` (1856–1871) |
| `war-great-northern` | sync (±3 г.) | 1721–1721 | `DIPLOMACY_TREATIES` | `1721-nystad-treaty` (1721 (30 августа)) |
| `war-kulikovo-1380` | sync (±3 г.) | 1380–1390 | `WRITERS_WORKS` | `1380-zadonshchina` (1380-е годы) |
| `war-polovtsian-steppe` | sync (±3 г.) | 1185–1187 | `WRITERS_WORKS` | `1185-slovo-o-polku-igoreve` (1185–1187) |
| `war-rus-byzantine` | sync (±3 г.) | 911–1113 | `DIPLOMACY_TREATIES`, `WRITERS_WORKS` | `911-byzantine-treaties` (911 и 944), `1113-povest-vremennykh-let` (1110–1113) |
| `war-rus-jap` | sync (±3 г.) | 1905–1907 | `DIPLOMACY_TREATIES` | `1905-portsmouth-treaty` (1905–1907) |
| `war-rus-turk-1877` | sync (±3 г.) | 1878–1878 | `DIPLOMACY_TREATIES` | `1878-san-stefano-berlin` (1878 (февраль — июль)) |
| `war-ww2-eastern` | sync (±3 г.) | 1943–1945 | `DIPLOMACY_TREATIES` | `1945-yalta-potsdam-treaties` (1943–1945) |
| `world-austrian-succession` | sync (±3 г.) | 1740–1748 | `WORLD_CONTEXT` | `1740-world-austrian` (1740–1748) |
| `world-axis-munich` | sync (±3 г.) | 1933–1938 | `WORLD_CONTEXT` | `1933-world-axis` (1933–1938) |
| `world-black-death-1347` | sync (±3 г.) | 1347–1353 | `WORLD_CONTEXT` | `1347-world-black-death-renaissance` (1347–1353) |
| `world-constantinople-1453` | sync (±3 г.) | 1439–1453 | `WORLD_CONTEXT` | `1453-fall-of-constantinople` (1439–1453) |
| `world-crusade-1204` | sync (±3 г.) | 1204–1215 | `WORLD_CONTEXT` | `1204-fourth-crusade` (1204–1215) |
| `world-discovery-reformation` | sync (±3 г.) | 1492–1553 | `WORLD_CONTEXT` | `1492-columbus-reformation` (1492–1553) |
| `world-entente-1907` | sync (±3 г.) | 1891–1907 | `WORLD_CONTEXT` | `1907-world-entente` (1891–1907) |
| `world-french-rev` | sync (±3 г.) | 1775–1794 | `WORLD_CONTEXT` | `1776-world-usa-france` (1775–1794) |
| `world-german-unification` | sync (±3 г.) | 1870–1871 | `WORLD_CONTEXT` | `1871-world-germany` (1870–1871) |
| `world-glorious-rev` | sync (±3 г.) | 1688–1697 | `WORLD_CONTEXT` | `1688-world-glorious` (1688–1697) |
| `world-great-depression` | sync (±3 г.) | 1929–1933 | `WORLD_CONTEXT` | `1929-great-depression` (1929–1933) |
| `world-great-schism-1054` | sync (±3 г.) | 1054–1054 | `WORLD_CONTEXT` | `1054-great-schism` (1054 (июль)) |
| `world-helsinki-1975` | sync (±3 г.) | 1963–1979 | `DIPLOMACY_TREATIES`, `WORLD_CONTEXT` | `1972-salt1-abm-treaty` (1963–1979), `1975-world-helsinki` (1973–1979) |
| `world-july-crisis-1914` | sync (±3 г.) | 1905–1914 | `WORLD_CONTEXT` | `1905-world-relativity-july-crisis` (1905–1914) |
| `world-maastricht-www-1992` | sync (±3 г.) | 1992–2000 | `WORLD_CONTEXT` | `1992-world-maastricht-www-globalization` (1992–2000) |
| `world-nato-1999` | sync (±3 г.) | 1989–1999 | `WORLD_CONTEXT` | `1999-world-nato-expansion` (1989–1999) |
| `world-spanish-succession` | sync (±3 г.) | 1701–1714 | `WORLD_CONTEXT` | `1701-world-spanish-succ` (1701–1714) |
| `world-spring-of-nations` | sync (±3 г.) | 1848–1849 | `WORLD_CONTEXT` | `1848-world-spring` (1848–1849) |
| `world-versailles` | sync (±3 г.) | 1919–1922 | `WORLD_CONTEXT` | `1919-world-versailles` (1919–1922) |
| `world-vienna-congress` | sync (±3 г.) | 1814–1815 | `WORLD_CONTEXT` | `1815-world-vienna` (1814–1815) |
| `world-warsaw-pact` | sync (±3 г.) | 1955–1961 | `WORLD_CONTEXT` | `1955-world-warsaw-pact` (1955–1961) |
| `world-westphalia-1648` | sync (±3 г.) | 1618–1648 | `WORLD_CONTEXT` | `1618-thirty-years-westphalia` (1618–1648) |
| `world-yalta-nato` | sync (±3 г.) | 1946–1949 | `WORLD_CONTEXT` | `1945-world-yalta-nato` (1946–1949) |
| `ww1` | sync + ref | 1905–1991 | `WAR_CONTINENTAL`, `WORLD_CONTEXT`, `WRITERS_WORKS` | `1905-world-relativity-july-crisis` (1905–1914), `1914-mayakovsky-oblako-v-shtanakh` (1914–1915), `1914-ww1` (1914–1918), `1915-bunin-gospodin-iz-san-frantsisko` (1915), `1925-sholokhov-tikhiy-don` (1925–1940), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1971-solzhenitsyn-krasnoe-koleso` (1971–1991) |
| `ww2` | sync + ref | 1940–1962 | `WAR_CONTINENTAL`, `WRITERS_WORKS` | `1940-akhmatova-poema-bez-geroya` (1940–1962), `1941-ww2` (1941–1945), `1945-pasternak-doktor-zhivago` (1945–1955 (изд. 1957)), `1956-sholokhov-sudba-cheloveka` (1956) |

---

## 4. Макро-периоды (`ERA_1`–`ERA_11`) и наполнение

| `id` | Диапазон | Название | Событий | Правителей |
| :--- | :--- | :--- | :---: | :---: |
| `ERA_1` | до 1223 | Период I: Генезис и Древняя Русь | 27 | 25 |
| `ERA_2` | 1223–1462 | Период II: Эпоха монгольского владычества | 19 | 18 |
| `ERA_3` | 1462–1605 | Период III: Между Азией и Европой | 24 | 6 |
| `ERA_4` | 1605–1682 | Период IV: Век Смуты и первых Романовых | 23 | 7 |
| `ERA_5` | 1682–1725 | Период V: Азиатская европеизация | 25 | 1 |
| `ERA_6` | 1725–1762 | Период VI: Эпоха цариц | 25 | 4 |
| `ERA_7` | 1762–1855 | Период VII: Первая сверхдержава | 119 | 4 |
| `ERA_8` | 1855–1894 | Период VIII: Эпоха Великих реформ | 97 | 2 |
| `ERA_9` | 1894–1917 | Период IX: Агония и крах империи | 84 | 2 |
| `ERA_10` | 1917–1992 | Период X: СССР | 156 | 7 |
| `ERA_11` | 1992–2000 | Период XI: Новая история | 25 | 1 |

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

### `ARTS_CULTURE` — Искусство, архитектура, музыка и кино (`feat/arts-culture`, 18)

- `989-sophia-cathedrals-rus-architecture` (989–1052) — Каменное зодчество Древней Руси: Десятинная церковь и Софийские соборы Киева, Новгорода и Полоцка — теги: `#topic-architecture` `#topic-church-history` · отсылки: `@era-1` `@ruler-vladimir-1` `@ruler-yaroslav-wise`
- `1158-vladimir-suzdal-white-stone` (1158–1197) — Белокаменное зодчество Владимиро-Суздальской Руси: Покрова на Нерли, Успенский и Дмитриевский соборы — теги: `#topic-architecture` · отсылки: `@era-1` `@ruler-vsevolod-big-nest`
- `1378-rublev-theophanes-trinity` (1378–1427) — Золотой век древнерусской иконописи: Феофан Грек и «Троица» Андрея Рублёва — теги: `#person-rublev-andrey` `#person-theophanes-greek` `#topic-fine-arts` · отсылки: `@era-2` `@ruler-dmitry-donskoy` `@event-1378-vozha-kulikovo`
- `1475-fioravanti-moscow-kremlin` (1475–1516) — Перестройка Московского Кремля: Аристотель Фиораванти и русско-итальянский Ренессанс — теги: `#person-fioravanti-aristotele` `#topic-architecture` · отсылки: `@era-3` `@ruler-ivan-3` `@ruler-vasily-3` `@event-1480-ugra-standing`
- `1555-saint-basil-cathedral` (1555–1561) — Собор Василия Блаженного (Покровский собор на Рву) и расцвет русского шатрового зодчества — теги: `#person-postnik-yakovlev` `#topic-architecture` · отсылки: `@era-3` `@ruler-ivan-4` `@event-1545-kazan-astrakhan`
- `1660-simon-ushakov-naryshkin-baroque` (1660–1699) — Обмирщение культуры XVII века: Симон Ушаков, парсуна и московское (нарышкинское) барокко — теги: `#person-ushakov-simon` `#topic-architecture` `#topic-fine-arts` · отсылки: `@era-4` `@era-5` `@ruler-alexey-mikhailovich` `@ruler-fyodor-3`
- `1703-saint-petersburg-baroque-academy` (1703–1762) — Рождение ансамбля Санкт-Петербурга, елизаветинское барокко и Императорская Академия художеств (1757) — теги: `#person-rastrelli-francesco` `#person-trezzini-domenico` `#topic-architecture` `#topic-fine-arts` · отсылки: `@era-5` `@era-6` `@ruler-peter-1` `@ruler-elizabeth` `@event-1700-northern-war`
- `1756-volkov-russian-public-theatre` (1756–1763) — Фёдор Волков и учреждение первого русского профессионального публичного театра (1756) — теги: `#person-volkov-fedor` `#topic-theatre` · отсылки: `@era-6` `@ruler-elizabeth`
- `1768-russian-classicism-empire` (1768–1834) — Русский классицизм и ампир: Баженов, Казаков, Росси, Левицкий и Эрмитаж — теги: `#person-bazhenov-vasily` `#person-rossi-karl` `#person-bryullov-karl` `#topic-architecture` `#topic-fine-arts` · отсылки: `@era-7` `@ruler-catherine-2` `@ruler-alexander-1` `@ruler-nicholas-1` `@event-1812-patriotic-war`
- `1836-glinka-russian-classical-music` (1836–1848) — Рождение русской классической музыки: оперы и симфонизм Михаила Глинки — теги: `#person-glinka-mikhail` `#topic-music` · отсылки: `@era-7` `@ruler-nicholas-1` `@person-pushkin-alexander`
- `1862-tchaikovsky-mighty-handful` (1862–1893) — Русские консерватории, «Могучая кучка» и мировой триумф Петра Чайковского — теги: `#person-tchaikovsky-pyotr` `#person-mussorgsky-modest` `#person-rimsky-korsakov-nikolay` `#topic-music` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3`
- `1870-peredvizhniki-tretyakov-gallery` (1870–1892) — Товарищество передвижников и Третьяковская галерея: золотой век русского реализма — теги: `#person-repin-ilya` `#person-surikov-vasily` `#person-tretyakov-pavel` `#topic-fine-arts` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3` `@event-1861-reform-emancipation`
- `1898-mhat-diaghilev-ballets-russes` (1898–1929) — Революция театра и балета: МХТ Станиславского (1898) и «Русские сезоны» Сергея Дягилева (1909–1929) — теги: `#person-stanislavsky-konstantin` `#person-diaghilev-sergey` `#person-stravinsky-igor` `#topic-silver-age` `#topic-theatre` `#topic-music` · отсылки: `@era-9` `@era-10` `@ruler-nicholas-2` `@person-chekhov-anton`
- `1910-russian-avant-garde` (1910–1932) — Русский авангард и конструктивизм: Кандинский, Малевич, Татлин, Родченко и ВХУТЕМАС — теги: `#person-kandinsky-vasily` `#person-malevich-kazimir` `#person-rodchenko-alexander` `#topic-fine-arts` `#topic-architecture` · отсылки: `@era-9` `@era-10` `@event-1917-civil-war`
- `1925-eisenstein-soviet-montage-cinema` (1925–1945) — Советская школа монтажного кино: Сергей Эйзенштейн, Дзига Вертов и Всеволод Пудовкин — теги: `#person-eisenstein-sergey` `#person-vertov-dziga` `#topic-cinema` · отсылки: `@era-10` `@event-1905-first-revolution` `@event-1941-ww2`
- `1936-shostakovich-prokofiev-symphonism` (1936–1953) — Советский музыкальный гений XX века: Дмитрий Шостакович, Сергей Прокофьев и исполнительская школа — теги: `#person-shostakovich-dmitri` `#person-prokofiev-sergey` `#topic-music` · отсылки: `@era-10` `@ruler-stalin` `@event-1941-ww2`
- `1962-tarkovsky-auteur-cinema` (1962–1986) — Поэтическое кино Оттепели и эпоха Андрея Тарковского — теги: `#person-tarkovsky-andrey` `#person-shnitke-alfred` `#topic-cinema` `#topic-theatre` · отсылки: `@era-10` `@ruler-khrushchev` `@ruler-brezhnev`
- `1992-post-soviet-culture-global-stage` (1992–2000) — Культура России 1990-х: возвращение наследия, интеграция в мировой арт-рынок и новая сцена — теги: `#person-gergiev-valery` `#person-sokurov-alexander` `#topic-cinema` `#topic-music` `#topic-architecture` · отсылки: `@era-11` `@ruler-yeltsin`

### `DIPLOMACY_TREATIES` — Дипломатия, союзы и мирные договоры (`diplomacy/treaties`, 22)

- `911-byzantine-treaties` (911 и 944) — Русско-византийские договоры князей Олега (911) и Игоря (944) — теги: `#treaty-byzantium-911` `#war-rus-byzantine` · отсылки: `@era-1` `@ruler-oleg` `@ruler-igor`
- `1097-liubech-congress` (1097–1103) — Любечский (1097) и Долобский (1103) съезды русских князей — теги: `#treaty-liubech-1097` · отсылки: `@era-1` `@ruler-svyatopolk-2` `@ruler-monomakh`
- `1243-nevsky-kalita-horde-diplomacy` (1243–1340) — Дипломатия Александра Невского и Ивана Калиты: поездки в Орду и выбор между Востоком и Западом — теги: `#treaty-horde-yarlyk-diplomacy` `#topic-statecraft` · отсылки: `@era-2` `@ruler-alexander-nevsky` `@ruler-ivan-kalita`
- `1489-habsburg-embassy` (1489–1517) — Выход Москвы на европейскую арену: посольства к Габсбургам и Вечный мир с Литвой (1503) — теги: `#treaty-moscow-sovereignty` · отсылки: `@era-3` `@ruler-ivan-3` `@ruler-vasily-3`
- `1617-stolbovo-deulino` (1617–1634) — Столбовский мир (1617), Деулинское перемирие (1618) и Поляновский мир (1634) — теги: `#treaty-stolbovo-deulino` · отсылки: `@era-5` `@ruler-mikhail-romanov`
- `1654-pereyaslav-andrusovo` (1654–1667) — Переяславская рада (1654) и Андрусовское перемирие (1667) — теги: `#treaty-pereyaslav-andrusovo` · отсылки: `@era-5` `@ruler-alexey-mikhailovich`
- `1686-eternal-peace-nerchinsk` (1686–1689) — «Вечный мир» с Речью Посполитой (1686) и Нерчинский договор с Китаем (1689) — теги: `#treaty-eternal-peace-1686` `#treaty-nerchinsk-1689` · отсылки: `@era-5` `@ruler-fyodor-3` `@ruler-peter-1`
- `1721-nystad-treaty` (1721 (30 августа)) — Ништадтский мирный договор и провозглашение Российской империи — теги: `#treaty-nystad` `#war-great-northern`
- `1743-abo-peace-diplomatic-revolution` (1743–1756) — Абоский мир со Швецией (1743) и «Дипломатическая революция» А. П. Бестужева-Рюмина — теги: `#treaty-abo-1743` `#person-bestuzhev-ryumin` · отсылки: `@era-6` `@ruler-elizabeth`
- `1774-kuchuk-kainarji` (1774–1783) — Кючук-Кайнарджийский мир (1774), присоединение Крыма и Георгиевский трактат (1783) — теги: `#treaty-kuchuk-kainarji`
- `1791-jassy-treaty` (1791–1795) — Ясский мирный договор (1791) и разделы Речи Посполитой (1772, 1793, 1795) — теги: `#treaty-jassy-1791` · отсылки: `@era-7` `@ruler-catherine-2`
- `1807-tilsit-treaty` (1807–1812) — Тильзитский мир (1807), Фридрихсгамский (1809) и Бухарестский мир (1812) — теги: `#treaty-tilsit`
- `1856-paris-berlin` (1856–1871) — Парижский трактат (1856) и Лондонская конвенция А. М. Горчакова (1871) — теги: `#treaty-paris-berlin` `#war-crimean`
- `1858-aigun-beijing` (1858–1867) — Айгунский (1858) и Пекинский (1860) договоры с Китаем; продажа Аляски (1867) — теги: `#treaty-aigun-beijing` · отсылки: `@era-8` `@ruler-alexander-2`
- `1878-san-stefano-berlin` (1878 (февраль — июль)) — Сан-Стефанский прелиминарный мир и Берлинский конгресс (1878) — теги: `#treaty-paris-berlin` `#war-rus-turk-1877` · отсылки: `@era-8` `@ruler-alexander-2`
- `1905-portsmouth-treaty` (1905–1907) — Портсмутский мир с Японией (1905) и англо-русская конвенция (Антанта, 1907) — теги: `#treaty-portsmouth-1905` `#war-rus-jap` · отсылки: `@era-8` `@ruler-nicholas-2`
- `1918-brest-molotov` (1918–1922) — Брестский мир (1918), Рижский мир (1921) и Рапалльский договор (1922) — теги: `#treaty-brest-1918`
- `1939-molotov-ribbentrop` (1939–1941) — Договор о ненападении с Германией (1939) и пакт о нейтралитете с Японией (1941) — теги: `#treaty-molotov-ribbentrop` · отсылки: `@era-9` `@ruler-stalin`
- `1945-yalta-potsdam-treaties` (1943–1945) — Тегеранская (1943), Ялтинская и Потсдамская (1945) конференции «Большой тройки» — теги: `#treaty-yalta-potsdam` `#war-ww2-eastern` · отсылки: `@era-9` `@ruler-stalin`
- `1972-salt1-abm-treaty` (1963–1979) — Договоры о ядерном сдерживании и Разрядка: ПРО, ОСВ-1 (1972), Хельсинки (1975) и ОСВ-2 — теги: `#treaty-salt-abm` `#world-helsinki-1975` · отсылки: `@era-10` `@ruler-khrushchev` `@ruler-brezhnev`
- `1991-belovezha-budapest` (1991–1997) — Беловежские соглашения (1991), статус РФ как правопреемника СССР в СБ ООН и Договор о создании Союзного государства — теги: `#treaty-belovezha`
- `1994-budapest-nato-multipolar-diplomacy` (1994–1999) — Будапештский меморандум (1994), Основополагающий акт Россия — НАТО (1997) и поворот к многополярной дипломатии — теги: `#treaty-budapest-1994` `#treaty-russia-nato-1997` · отсылки: `@era-11` `@ruler-yeltsin`

### `DOCTORS_BIO` — Выдающиеся врачи и учёные-медики (`med/doctors`, 30)

- `1050-agapit-pechersky` (ок. 1050–1095) — Агапит Печерский — теги: `#person-agapit-pechersky` · отсылки: `@era-1` `@ruler-monomakh`
- `1670-bidloo-nikolay` (1670–1735) — Николай Ламбертович Бидлоо — теги: `#person-bidloo-nikolay` · отсылки: `@era-5` `@era-6` `@ruler-peter-1`
- `1744-samoilovich-daniil` (1744–1805) — Даниил Самойлович Самойлович — теги: `#person-samoilovich-daniil` · отсылки: `@era-7` `@ruler-catherine-2`
- `1776-mudrov-matvey` (1776–1831) — Матвей Яковлевич Мудров — теги: `#person-mudrov-matvey` · отсылки: `@era-7` `@era-8` `@ruler-alexander-1` `@ruler-nicholas-1`
- `1780-haass-fyodor` (1780–1853) — Фёдор Петрович Гааз — теги: `#person-haass-fyodor` · отсылки: `@era-7` `@era-8` `@ruler-alexander-1` `@ruler-nicholas-1`
- `1810-pirogov-nikolay` (1810–1881) — Николай Иванович Пирогов — теги: `#person-pirogov` · отсылки: `@era-8` `@ruler-nicholas-1` `@ruler-alexander-2`
- `1829-sechenov-ivan` (1829–1905) — Иван Михайлович Сеченов — теги: `#person-sechenov` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3`
- `1832-botkin-sergey` (1832–1889) — Сергей Петрович Боткин — теги: `#person-botkin-sergey` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3`
- `1836-sklifosovsky-nikolay` (1836–1904) — Николай Васильевич Склифосовский — теги: `#person-sklifosovsky-nikolay` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3` `@ruler-nicholas-2`
- `1842-erisman-fyodor` (1842–1915) — Фёдор Фёдорович Эрисман — теги: `#person-erisman-fyodor` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3`
- `1845-mechnikov-ilya` (1845–1916) — Илья Ильич Мечников — теги: `#person-mechnikov-ilya` · отсылки: `@era-8` `@era-9` `@topic-medicine`
- `1847-filatov-nil` (1847–1902) — Нил Фёдорович Филатов — теги: `#person-filatov-nil` · отсылки: `@era-8` `@ruler-alexander-3` `@ruler-nicholas-2`
- `1849-pavlov-ivan` (1849–1936) — Иван Петрович Павлов — теги: `#person-pavlov` · отсылки: `@era-8` `@era-9` `@era-10`
- `1854-korsakov-sergey` (1854–1900) — Сергей Сергеевич Корсаков — теги: `#person-korsakov-sergey` · отсылки: `@era-8` `@ruler-alexander-3` `@ruler-nicholas-2`
- `1857-bekhterev-vladimir` (1857–1927) — Владимир Михайлович Бехтерев — теги: `#person-bekhterev-vladimir` · отсылки: `@era-8` `@era-9`
- `1859-gamaleya-nikolay` (1859–1949) — Николай Фёдорович Гамалея — теги: `#person-gamaleya-nikolay` · отсылки: `@era-8` `@era-9` `@era-10`
- `1864-ivanovsky-dmitry` (1864–1920) — Дмитрий Иосифович Ивановский — теги: `#person-ivanovsky-dmitry` · отсылки: `@era-8` `@era-9`
- `1874-korotkov-nikolay` (1874–1920) — Николай Сергеевич Коротков — теги: `#person-korotkov-nikolay` · отсылки: `@era-8` `@era-9`
- `1874-vishnevsky-alexander` (1874–1948) — Александр Васильевич Вишневский — теги: `#person-vishnevsky-alexander` · отсылки: `@era-9` `@era-10` `@event-1941-ww2`
- `1874-semashko-nikolay` (1874–1949) — Николай Александрович Семашко — теги: `#person-semashko-nikolay` · отсылки: `@era-9` `@era-10` `@ruler-lenin`
- `1875-filatov-vladimir` (1875–1956) — Владимир Петрович Филатов — теги: `#person-filatov-vladimir` · отсылки: `@era-9` `@era-10`
- `1876-burdenko-nikolay` (1876–1946) — Николай Нилович Бурденко — теги: `#person-burdenko-nikolay` · отсылки: `@era-9` `@era-10` `@event-1941-ww2`
- `1885-anichkov-nikolay` (1885–1964) — Николай Николаевич Аничков — теги: `#person-anichkov-nikolay` · отсылки: `@era-9` `@era-10`
- `1890-bakulev-alexander` (1890–1967) — Александр Николаевич Бакулев — теги: `#person-bakulev-alexander` · отсылки: `@era-10`
- `1897-yermolyeva-zinaida` (1897–1974) — Зинаида Виссарионовна Ермольева — теги: `#person-yermolyeva-zinaida` · отсылки: `@era-10` `@event-1941-ww2`
- `1909-chumakov-mikhail` (1909–1993) — Михаил Петрович Чумаков — теги: `#person-chumakov-mikhail` · отсылки: `@era-10`
- `1916-demikhov-vladimir` (1916–1998) — Владимир Петрович Демихов — теги: `#person-demikhov-vladimir` · отсылки: `@era-10`
- `1921-ilizarov-gavriil` (1921–1992) — Гавриил Абрамович Илизаров — теги: `#person-ilizarov-gavriil` · отсылки: `@era-10`
- `1927-fyodorov-svyatoslav` (1927–2000) — Святослав Николаевич Фёдоров — теги: `#person-fyodorov-svyatoslav` · отсылки: `@era-10` `@era-11`
- `1929-chazov-evgeny` (1929–2021) — Евгений Иванович Чазов — теги: `#person-chazov-evgeny` · отсылки: `@era-10` `@era-11`

### `REFORMS_ECO` — Экономика, право и госреформы (`economy/reforms`, 29)

- `946-olga-tax-reform` (946–947) — Налоговая реформа княгини Ольги («Уроки и погосты») — теги: `#reform-olga-pogosts` · отсылки: `@era-1` `@ruler-olga`
- `1016-russkaya-pravda` (1016–1054) — «Русская Правда» Ярослава Мудрого и Правда Ярославичей — теги: `#reform-russkaya-pravda` · отсылки: `@era-1` `@ruler-yaroslav-wise`
- `1113-monomakh-statute` (1113) — «Устав Владимира Мономаха» о резах и закупах — теги: `#reform-russkaya-pravda` · отсылки: `@era-1` `@ruler-monomakh`
- `1328-kalita-horde-tribute-denga-coinage` (1328–1382) — Ордынский «выход» Ивана Калиты, рождение рубля и возобновление чеканки серебряной монеты (денги) в Москве — теги: `#reform-denga-coinage-1380` `#reform-horde-tribute-kalita` · отсылки: `@era-2` `@ruler-ivan-kalita` `@ruler-dmitry-donskoy`
- `1497-sudebnik-ivan3` (1497 (сентябрь)) — Судебник Ивана III и правило Юрьева дня — теги: `#reform-sudebnik-1497` · отсылки: `@era-3` `@ruler-ivan-3`
- `1535-glinskaya-money-reform` (1535–1538) — Денежная и губная реформы Елены Глинской — теги: `#reform-glinskaya-money` · отсылки: `@era-4` `@ruler-ivan-4`
- `1549-chosen-council-sudebnik` (1549–1556) — Реформы Избранной рады: первый Земский собор, Судебник 1550 г. и Уложение о службе — теги: `#reform-chosen-council` · отсылки: `@era-4` `@ruler-ivan-4`
- `1565-oprichnina` (1565–1572) — Опричнина Ивана Грозного и введение «заповедных лет» — теги: `#reform-oprichnina` · отсылки: `@era-4` `@ruler-ivan-4`
- `1649-sobornoye-ulozhenie` (1649 (январь)) — Соборное уложение царя Алексея Михайловича — теги: `#reform-sobornoye-ulozhenie` · отсылки: `@era-5` `@ruler-alexey-mikhailovich`
- `1653-church-schism-nikon` (1653–1667) — Церковная реформа патриарха Никона и Раскол Русской церкви — теги: `#reform-church-schism` `#person-avvakum-petrov` · отсылки: `@era-5` `@ruler-alexey-mikhailovich`
- `1667-new-trade-statute` (1667–1682) — Новоторговый устав А. Л. Ордина-Нащокина и отмена местничества (1682) — теги: `#reform-new-trade-statute` · отсылки: `@era-5` `@ruler-alexey-mikhailovich` `@ruler-fyodor-3`
- `1699-reform-army` (1699–1705) — Военная реформа Петра I и введение рекрутской повинности — теги: `#reform-peter-army`
- `1718-reform-poll-tax` (1718–1724) — Подушная подать, коллегии и «Табель о рангах» Петра I — теги: `#reform-poll-tax`
- `1754-reform-customs` (1754) — Таможенная реформа П. И. Шувалова и первые Государственные банки — теги: `#reform-customs-1754`
- `1769-reform-assignats` (1769–1785) — Введение ассигнаций, Губернская реформа и Жалованные грамоты Екатерины II — теги: `#reform-assignats`
- `1802-reform-ministries` (1802–1811) — Учреждение министерств, Госсовета и реформы М. М. Сперанского — теги: `#reform-ministries`
- `1839-reform-kankrin` (1837–1843) — Денежная реформа Е. Ф. Канкрина, реформа П. Д. Киселёва и начало железных дорог — теги: `#reform-kankrin-money`
- `1861-reform-emancipation` (1861–1874) — Великие реформы Александра II: отмена крепостного права, земства, суд и всеобщая воинская повинность — теги: `#reform-great-reforms`
- `1891-reform-transsib` (1891–1903) — Индустриальный рывок С. Ю. Витте, Транссиб и золотой стандарт рубля (1897) — теги: `#reform-witte-transsib` `#person-mendeleev`
- `1906-reform-stolypin` (1905–1911) — Манифест 17 октября, Государственная дума и Столыпинская аграрная реформа — теги: `#reform-stolypin`
- `1918-reform-war-communism` (1917–1920) — Первые декреты советской власти и политика «военного коммунизма» — теги: `#reform-war-communism`
- `1921-nep-reform` (1921–1928) — Новая экономическая политика (НЭП) и денежная реформа Г. Я. Сокольникова — теги: `#reform-war-communism` · отсылки: `@era-9` `@ruler-lenin` `@ruler-stalin`
- `1928-reform-five-year` (1928–1937) — Первые пятилетки: форсированная индустриализация и сплошная коллективизация — теги: `#reform-industrialization`
- `1949-reform-nuclear` (1945–1953) — Атомный проект СССР, послевоенное восстановление и денежная реформа 1947 года — теги: `#reform-nuclear-project` `#person-kurchatov` `#person-sakharov`
- `1959-reform-rvsn` (1954–1962) — Освоение целины, массовое жилищное строительство («хрущёвки») и создание РВСН — теги: `#reform-rvsn`
- `1965-kosygin-reform` (1965–1970 («Золотая восьмая пятилетка»)) — Косыгинская экономическая реформа (хозрасчёт и рентабельность) — теги: `#reform-kosygin-1965` · отсылки: `@era-10` `@ruler-brezhnev`
- `1973-reform-oil-boom` (1973–1984) — Освоение нефтегазовой провинции Западной Сибири, БАМ и «нефтедолларовый» бум — теги: `#reform-oil-boom`
- `1987-perestroika-economy` (1985–1990) — Экономические реформы Перестройки: законы о госпредприятии и кооперации — теги: `#reform-perestroika-eco` · отсылки: `@era-11` `@ruler-gorbachev`
- `1992-reform-market-crisis` (1992–1998) — Рыночные реформы 1990-х, Конституция 1993 года, приватизация и дефолт 1998 года — теги: `#reform-market-1990s`

### `MEDICINE_HEALTH` — Медицина: институты, клиники и открытия (`med/milestones`, 39)

- `1073-agapit-pechersky-monastic-medicine` (1073–1095) — Монастырская медицина Древней Руси и врачевание Агапита Печерского — теги: `#person-agapit-pechersky` `#topic-public-health` · отсылки: `@era-1` `@ruler-monomakh`
- `1130-evpraksia-mazi-treatise` (1130-е годы) — Медицинский трактат «Алимма» («Мази») княжны Евпраксии-Добродеи Мстиславны — теги: `#person-evpraksia-mstislavna` `#topic-pharmacology` · отсылки: `@era-1` `@ruler-monomakh`
- `1352-black-death-rus-quarantines` (1352–1386) — «Чёрная смерть» на Руси и первые городские карантинные меры — теги: `#topic-epidemiology` `#topic-public-health` · отсылки: `@era-2`
- `1581-aptekarsky-prikaz` (1581–1620) — Первая государева аптека (1581) и учреждение Аптекарского приказа (1620) — теги: `#person-jacob-robert` `#topic-public-health` `#topic-pharmacology` · отсылки: `@era-4` `@era-5` `@ruler-ivan-4` `@ruler-mikhail-romanov` `@ruler-alexey-mikhailovich`
- `1654-moscow-plague-lekarskaya-shkola` (1654–1655) — Первая государственная лекарская школа (1654) и карантинная система XVII века — теги: `#topic-medical-education` `#topic-epidemiology` · отсылки: `@era-4` `@ruler-alexey-mikhailovich` `@event-1654-rus-polish-swedish-war`
- `1707-bidloo-moscow-hospital-school` (1707–1735) — Московский госпиталь и первая медико-хирургическая школа Николая Бидлоо — теги: `#person-bidloo-nikolay` `#topic-surgery` `#topic-medical-education` · отсылки: `@era-6` `@ruler-peter-1` `@event-1700-northern-war`
- `1735-hospital-reglament-medical-collegium` (1735–1763) — Генеральный регламент о госпиталях (1735), реформы Павла Кондоиди и учреждение Медицинской коллегии (1763) — теги: `#person-kondoidi-pavel` `#person-zybelin-semyon` `#topic-medical-education` `#topic-public-health` · отсылки: `@era-6` `@ruler-elizabeth` `@ruler-catherine-2`
- `1763-first-civil-hospitals-empire` (1763–1779) — Первые общедоступные гражданские больницы империи: Павловская, Екатерининская и Обуховская — теги: `#topic-public-health` `#topic-clinical-medicine` · отсылки: `@era-7` `@ruler-catherine-2`
- `1768-catherine-variolation-dimsdale` (1768–1770) — Первое государственное оспопрививание: Екатерина II и Томас Димсдейл — теги: `#person-dimsdale-thomas` `#topic-epidemiology` `#topic-public-health` · отсылки: `@era-7` `@ruler-catherine-2`
- `1771-samoilovich-moscow-plague` (1771–1772) — Противоэпидемическая борьба с Московской чумой и труды Даниила Самойловича — теги: `#person-samoilovich-daniil` `#topic-epidemiology` `#topic-public-health` · отсылки: `@era-7` `@ruler-catherine-2` `@event-1771-plague-riot` `@event-1768-rus-turk`
- `1798-imperial-military-medical-academy` (1798–1808) — Основание Императорской Медико-хирургической (Военно-медицинской) академии в Санкт-Петербурге — теги: `#topic-medical-education` `#topic-surgery` · отсылки: `@era-7` `@ruler-paul-1` `@ruler-alexander-1`
- `1802-moscow-charitable-hospitals-sheremetev` (1802–1844) — Благотворительные клиники Москвы: Голицынская больница, Странноприимный дом Шереметева и больница Гааза — теги: `#person-haass-fyodor` `#topic-public-health` `#topic-clinical-medicine` · отсылки: `@era-7` `@era-8` `@ruler-alexander-1` `@ruler-nicholas-1`
- `1809-mudrov-clinical-school` (1809–1831) — Клиническая школа Матвея Мудрова и принцип «лечить не болезнь, а больного» — теги: `#person-mudrov-matvey` `#topic-clinical-medicine` `#topic-medical-education` · отсылки: `@era-7` `@ruler-alexander-1` `@ruler-nicholas-1` `@event-1812-patriotic-war`
- `1847-pirogov-anesthesia-crimea` (1847–1855) — Военно-полевая хирургия, эфирный наркоз и триаж Н. И. Пирогова — теги: `#person-pirogov` `#war-crimean` `#topic-surgery` · отсылки: `@era-8` `@ruler-nicholas-1`
- `1861-botkin-clinical-therapy` (1861–1889) — Экспериментальная клиника Сергея Боткина и физиологическое направление в медицине — теги: `#person-botkin-sergey` `#person-pavlov` `#person-sechenov` `#topic-clinical-medicine` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3`
- `1864-zemstvo-medicine` (1864–1917) — Становление земской медицины — первой в мире модели общедоступного сельского здравоохранения — теги: `#person-erisman-fyodor` `#person-chekhov-anton` `#topic-public-health` · отсылки: `@era-8` `@era-9` `@ruler-alexander-2` `@event-1861-reform-emancipation`
- `1867-russian-red-cross-women-doctors` (1867–1872) — Российское общество Красного Креста (1867) и Высшие женские врачебные курсы (1872) — теги: `#person-suslova-nadezhda` `#topic-medical-education` `#topic-public-health` · отсылки: `@era-8` `@ruler-alexander-2`
- `1876-sklifosovsky-antiseptic-surgery` (1876–1904) — Антисептика, асептика и клиническая хирургия Николая Склифосовского — теги: `#person-sklifosovsky-nikolay` `#person-pirogov` `#topic-surgery` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3` `@event-1877-rus-turk`
- `1880-lunin-vitamins-hygiene-school` (1880–1891) — Открытие витаминов Николаем Луниным (1880) и школа научной гигиены Фёдора Эрисмана — теги: `#person-lunin-nikolay` `#person-erisman-fyodor` `#topic-public-health` · отсылки: `@era-8` `@ruler-alexander-2` `@ruler-alexander-3`
- `1883-mechnikov-phagocytosis-odessa-station` (1883–1908) — Фагоцитарная теория И. И. Мечникова, Одесская пастеровская станция (1886) и Нобелевская премия (1908) — теги: `#person-mechnikov-ilya` `#person-gamaleya-nikolay` `#topic-immunology` `#topic-epidemiology` · отсылки: `@era-8` `@era-9` `@ruler-alexander-3` `@ruler-nicholas-2`
- `1887-korsakov-psychiatry-filatov-pediatrics` (1887–1900) — Отечественные школы психиатрии и педиатрии: Сергей Корсаков и Нил Филатов — теги: `#person-korsakov-sergey` `#person-filatov-nil` `#topic-clinical-medicine` · отсылки: `@era-8` `@ruler-alexander-3` `@ruler-nicholas-2`
- `1890-iem-devichye-pole-clinics` (1887–1899) — Институт экспериментальной медицины (ИЭМ, 1890) и Клинический городок на Девичьем поле — теги: `#person-pavlov` `#person-sklifosovsky-nikolay` `#topic-medical-education` `#topic-epidemiology` · отсылки: `@era-8` `@ruler-alexander-3` `@ruler-nicholas-2`
- `1892-ivanovsky-virology` (1892–1902) — Открытие вирусов Дмитрием Ивановским — рождение мировой вирусологии — теги: `#person-ivanovsky-dmitry` `#topic-epidemiology` `#topic-immunology` · отсылки: `@era-8` `@era-9` `@ruler-alexander-3` `@ruler-nicholas-2`
- `1904-pavlov-nobel` (1903–1904) — Учение об условных рефлексах и Нобелевская премия И. П. Павлова — теги: `#person-pavlov` `#person-sechenov` `#topic-neuroscience` · отсылки: `@era-8` `@ruler-nicholas-2`
- `1905-korotkov-blood-pressure-anichkov-atherosclerosis` (1905–1913) — Прорывы в кардиологии и патологии: тоны Короткова (1905) и теория атеросклероза Аничкова (1912) — теги: `#person-korotkov-nikolay` `#person-anichkov-nikolay` `#topic-clinical-medicine` · отсылки: `@era-9` `@ruler-nicholas-2`
- `1907-bekhterev-psychoneurology` (1907–1927) — Психоневрологический институт Владимира Бехтерева и нейронаука начала XX века — теги: `#person-bekhterev-vladimir` `#person-sechenov` `#person-pavlov` `#topic-neuroscience` · отсылки: `@era-9` `@ruler-nicholas-2` `@ruler-lenin`
- `1917-filatov-ophthalmology-plastic` (1917–1956) — Восстановительная хирургия и офтальмология Владимира Филатова — теги: `#person-filatov-vladimir` `#topic-ophthalmology` `#topic-surgery` · отсылки: `@era-9` `@era-10` `@event-1914-ww1` `@event-1941-ww2`
- `1918-semashko-narkomzdrav` (1918–1930) — Учреждение Наркомздрава РСФСР (1918) и система здравоохранения Николая Семашко — теги: `#person-semashko-nikolay` `#topic-public-health` `#topic-epidemiology` · отсылки: `@era-9` `@era-10` `@ruler-lenin` `@event-1917-civil-war` `@event-1918-reform-war-communism`
- `1926-blood-transfusion-institute-service` (1926–1945) — Первый в мире Институт переливания крови (1926) и советская служба донорства — теги: `#person-yudin-sergey` `#topic-surgery` `#topic-public-health` · отсылки: `@era-9` `@era-10` `@event-1941-ww2`
- `1927-vishnevsky-local-anesthesia` (1927–1948) — Метод местной анестезии и масляно-бальзамическая повязка Александра Вишневского — теги: `#person-vishnevsky-alexander` `#topic-surgery` · отсылки: `@era-10` `@event-1941-ww2`
- `1937-zilber-pavlovsky-encephalitis-focality` (1937–1940) — Открытие вируса клещевого энцефалита и учение о природной очаговости болезней — теги: `#person-chumakov-mikhail` `#person-smorodintsev-anatoly` `#topic-epidemiology` `#topic-immunology` · отсылки: `@era-10` `@ruler-stalin`
- `1941-burdenko-military-neurosurgery-ams` (1941–1946) — Военно-полевая хирургия Николая Бурденко и создание АМН СССР (1944) — теги: `#person-burdenko-nikolay` `#topic-surgery` `#topic-public-health` · отсылки: `@era-10` `@ruler-stalin` `@event-1941-ww2`
- `1942-yermolyeva-penicillin-stalingrad` (1942–1945) — Отечественный пенициллин Зинаиды Ермольевой и защита Сталинграда от холеры — теги: `#person-yermolyeva-zinaida` `#topic-antibiotics` `#topic-epidemiology` · отсылки: `@era-10` `@ruler-stalin` `@event-1941-ww2`
- `1946-demikhov-bakulev-cardiac-transplant` (1946–1967) — Пионеры мировой трансплантологии и кардиохирургии: Владимир Демихов и Александр Бакулев — теги: `#person-demikhov-vladimir` `#person-bakulev-alexander` `#topic-transplantology` `#topic-surgery` · отсылки: `@era-10` `@ruler-stalin` `@ruler-khrushchev`
- `1951-ilizarov-orthopedics` (1951–1992) — Аппарат и метод чрескостного остеосинтеза Гавриила Илизарова — теги: `#person-ilizarov-gavriil` `#topic-surgery` · отсылки: `@era-10` `@ruler-khrushchev` `@ruler-brezhnev`
- `1956-soviet-national-medical-centers` (1956–1987) — Национальные клинические центры СССР: кардиология, онкология и трансплантология — теги: `#person-bakulev-alexander` `#person-chazov-evgeny` `#person-shumakov-valery` `#topic-clinical-medicine` `#topic-transplantology` · отсылки: `@era-10` `@ruler-khrushchev` `@ruler-brezhnev` `@ruler-gorbachev`
- `1958-zhdanov-chumakov-global-vaccines` (1958–1980) — Глобальные триумфы советской вирусологии: ликвидация оспы в мире и вакцина от полиомиелита — теги: `#person-zhdanov-viktor` `#person-chumakov-mikhail` `#person-smorodintsev-anatoly` `#topic-epidemiology` `#topic-immunology` · отсылки: `@era-10` `@ruler-khrushchev` `@ruler-brezhnev`
- `1970-fyodorov-eye-microsurgery` (1970–2000) — Микрохирургия глаза Святослава Фёдорова и создание МНТК (1986) — теги: `#person-fyodorov-svyatoslav` `#topic-ophthalmology` `#topic-surgery` · отсылки: `@era-10` `@era-11` `@ruler-brezhnev` `@ruler-gorbachev` `@ruler-yeltsin`
- `1993-oms-reform-modern-medicine` (1993–2000) — Переход к обязательному медицинскому страхованию (ОМС) и интеграция в доказательную медицину — теги: `#person-chazov-evgeny` `#person-shumakov-valery` `#topic-public-health` `#topic-clinical-medicine` · отсылки: `@era-11` `@ruler-yeltsin`

### `SCIENCE_DISCOVERIES` — Научные открытия, академии и технопрорывы (`science/discoveries`, 20)

- `1564-ivan-fyodorov-apostol` (1564 (1 марта)) — Начало русского книгопечатания: «Апостол» Ивана Фёдорова и Петра Мстиславца — теги: `#person-fyodorov-ivan` `#topic-enlightenment` · отсылки: `@era-3` `@ruler-ivan-4`
- `1648-dezhnev-bering-strait` (1648 (июнь–октябрь)) — Открытие пролива между Азией и Америкой экспедицией Семёна Дежнёва — теги: `#person-dezhnev-semyon` `#topic-geography` · отсылки: `@era-4` `@ruler-alexey-mikhailovich`
- `1687-slavyano-greko-latinskaya` (1687) — Основание Славяно-греко-латинской академии — теги: `#person-lomonosov` · отсылки: `@era-5` `@ruler-fyodor-3`
- `1724-academy-of-sciences` (1724–1725) — Учреждение Петербургской Академии наук — теги: `#person-lomonosov` `#person-kulibin` · отсылки: `@era-6` `@ruler-peter-1` `@ruler-catherine-1`
- `1733-great-northern-expedition-bering` (1733–1743) — Великая Северная (Вторая Камчатская) экспедиция Витуса Беринга и Алексея Чирикова — теги: `#person-bering-vitus` `#person-chirikov-aleksey` `#topic-geography` · отсылки: `@era-6` `@ruler-elizabeth`
- `1755-moscow-university` (1755 (25 января)) — Основание Императорского Московского университета — теги: `#person-lomonosov` · отсылки: `@era-7` `@ruler-elizabeth`
- `1820-antarctica-bellingshausen-lazarev` (1820 (28 января)) — Открытие Антарктиды русской экспедицией Фаддея Беллинсгаузена и Михаила Лазарева — теги: `#person-bellingshausen-faddey` `#person-lazarev-mikhail` `#topic-geography` · отсылки: `@era-7` `@ruler-alexander-1`
- `1826-lobachevsky-geometry` (1826–1829) — Создание неевклидовой геометрии Н. И. Лобачевского — теги: `#person-lobachevsky` · отсылки: `@era-8` `@ruler-nicholas-1`
- `1869-mendeleev-periodic-law` (1869–1871) — Открытие Периодического закона химических элементов Д. И. Менделеевым — теги: `#person-mendeleev` · отсылки: `@era-8` `@ruler-alexander-2`
- `1895-popov-radio` (1895–1900) — Изобретение радио А. С. Поповым и первая спасательная радиолиния — теги: `#person-popov` · отсылки: `@era-8` `@ruler-nicholas-2`
- `1920-goelro-plan` (1920–1931) — План ГОЭЛРО: единая научно-техническая программа электрификации страны — теги: `#reform-industrialization` · отсылки: `@era-9` `@ruler-lenin` `@ruler-stalin`
- `1920-vavilov-genetics-seed-bank` (1920–1940) — Генетика и мировой банк семян Николая Вавилова: закон гомологических рядов и центры происхождения растений — теги: `#person-vavilov-nikolay` `#topic-genetics` · отсылки: `@era-10` `@ruler-stalin`
- `1938-kapitsa-superfluidity` (1938–1941) — Открытие сверхтекучести жидкого гелия П. Л. Капицей и теория Л. Д. Ландау — теги: `#person-kapitsa` · отсылки: `@era-9` `@ruler-stalin`
- `1951-lebedev-mesm-basov-prokhorov-laser` (1951–1964) — Первая советская ЭВМ МЭСМ Сергея Лебедева (1951) и открытие лазеров Басовым и Прохоровым (1964) — теги: `#person-lebedev-sergey` `#person-basov-nikolay` `#person-prokhorov-alexander` `#topic-computing` `#topic-physics` · отсылки: `@era-10` `@ruler-stalin` `@ruler-khrushchev`
- `1954-obninsk-first-npp` (1954 (27 июня)) — Пуск Первой в мире атомной электростанции в Обнинске — теги: `#person-kurchatov` `#reform-nuclear-project` · отсылки: `@era-10` `@ruler-khrushchev`
- `1957-sputnik-1` (1957 (4 октября)) — Запуск Первого искусственного спутника Земли («Спутник-1») — теги: `#person-korolev` `#person-tsiolkovsky` · отсылки: `@era-10` `@ruler-khrushchev`
- `1961-gagarin-vostok-1` (1961 (12 апреля)) — Первый полёт человека в космос: Юрий Гагарин на корабле «Восток-1» — теги: `#person-korolev` `#person-tsiolkovsky` · отсылки: `@era-10` `@ruler-khrushchev`
- `1970-lunokhod-venera` (1970–1975) — Первые планетоходы «Луноход-1» и посадки станций «Венера» — теги: `#person-korolev` · отсылки: `@era-10` `@ruler-brezhnev`
- `2000-alferov-nobel` (1970–2000) — Полупроводниковые гетероструктуры и Нобелевская премия Ж. И. Алфёрова — теги: `#person-alferov` · отсылки: `@era-10` `@era-11` `@ruler-brezhnev` `@ruler-yeltsin`
- `1986-mir-station` (1986–2001) — Орбитальная научная станция «Мир» — первый модульный дом в космосе — теги: `#person-alferov` `#person-tsiolkovsky` · отсылки: `@era-10` `@era-11` `@ruler-gorbachev` `@ruler-yeltsin`

### `SCIENTISTS_BIO` — Выдающиеся учёные и конструкторы (`science/scientists`, 17)

- `1711-lomonosov-mikhail` (1711–1765) — Михаил Васильевич Ломоносов — теги: `#person-lomonosov`
- `1735-kulibin-ivan` (1735–1818) — Иван Петрович Кулибин — теги: `#person-kulibin`
- `1792-lobachevsky-nikolay` (1792–1856) — Николай Иванович Лобачевский — теги: `#person-lobachevsky`
- `1834-mendeleev-dmitry` (1834–1907) — Дмитрий Иванович Менделеев — теги: `#person-mendeleev`
- `1857-tsiolkovsky-konstantin` (1857–1935) — Константин Эдуардович Циолковский — теги: `#person-tsiolkovsky`
- `1859-popov-alexander` (1859–1906) — Александр Степанович Попов — теги: `#person-popov`
- `1863-vernadsky-vladimir` (1863–1945) — Владимир Иванович Вернадский — теги: `#person-vernadsky`
- `1887-vavilov-nikolay` (1887–1943) — Николай Иванович Вавилов — теги: `#person-vavilov-nikolay` · отсылки: `@era-10` `@topic-science`
- `1892-kondratiev-nikolay` (1892–1938) — Николай Дмитриевич Кондратьев — теги: `#person-kondratiev-nikolay` · отсылки: `@era-10` `@topic-economics`
- `1894-kapitsa-pyotr` (1894–1984) — Пётр Леонидович Капица — теги: `#person-kapitsa`
- `1903-kurchatov-igor` (1903–1960) — Игорь Васильевич Курчатов — теги: `#person-kurchatov`
- `1903-kolmogorov-andrey` (1903–1987) — Андрей Николаевич Колмогоров — теги: `#person-kolmogorov-andrey` · отсылки: `@era-10` `@topic-science`
- `1907-korolev-sergey` (1907–1966) — Сергей Павлович Королёв — теги: `#person-korolev`
- `1908-landau-lev` (1908–1968) — Лев Давидович Ландау — теги: `#person-landau-lev` · отсылки: `@era-10` `@topic-science`
- `1912-kantorovich-leonid` (1912–1986) — Леонид Витальевич Канторович — теги: `#person-kantorovich-leonid` · отсылки: `@era-10` `@topic-economics` `@topic-science`
- `1921-sakharov-andrey` (1921–1989) — Андрей Дмитриевич Сахаров — теги: `#person-sakharov`
- `1930-alferov-zhores` (1930–2000) — Жорес Иванович Алфёров — теги: `#person-alferov`

### `STATESMEN_BIO` — Государственные деятели, дипломаты и реформаторы (`feat/statesmen-bio`, 12)

- `1296-alexius-metropolitan` (1296–1378) — Митрополит Алексий (Елевферий Бяконт) — теги: `#person-alexius-metropolitan` `#topic-statecraft` · отсылки: `@era-2` `@ruler-dmitry-donskoy`
- `1578-pozharsky-minin` (1578–1642) — Князь Дмитрий Михайлович Пожарский и Кузьма Минин — теги: `#person-pozharsky-dmitry` `#person-minin-kuzma` `#topic-statecraft` · отсылки: `@era-4` `@ruler-mikhail-romanov`
- `1605-ordin-nashchokin-afanasy` (1605–1680) — Афанасий Лаврентьевич Ордин-Нащокин — теги: `#person-ordin-nashchokin-afanasy` `#topic-statecraft` · отсылки: `@era-4` `@ruler-alexey-mikhailovich`
- `1739-potemkin-grigory` (1739–1791) — Светлейший князь Григорий Александрович Потёмкин-Таврический — теги: `#person-potemkin-grigory` `#topic-statecraft` · отсылки: `@era-6` `@era-7` `@ruler-catherine-2`
- `1772-speransky-mikhail` (1772–1839) — Граф Михаил Михайлович Сперанский — теги: `#person-speransky-mikhail` `#topic-statecraft` `#topic-law` · отсылки: `@era-7` `@ruler-alexander-1` `@ruler-nicholas-1`
- `1774-kankrin-egor` (1774–1845) — Граф Егор Францевич Канкрин — теги: `#person-kankrin-egor` `#topic-statecraft` · отсылки: `@era-7` `@ruler-nicholas-1`
- `1798-gorchakov-alexander` (1798–1883) — Светлейший князь Александр Михайлович Горчаков — теги: `#person-gorchakov-alexander` `#topic-statecraft` · отсылки: `@era-8` `@ruler-alexander-2`
- `1816-milyutin-dmitry` (1816–1912) — Граф Дмитрий Алексеевич Милютин — теги: `#person-milyutin-dmitry` `#topic-statecraft` · отсылки: `@era-8` `@ruler-alexander-2`
- `1849-witte-sergey` (1849–1915) — Граф Сергей Юльевич Витте — теги: `#person-witte-sergey` `#topic-statecraft` · отсылки: `@era-8` `@era-9` `@ruler-alexander-3` `@ruler-nicholas-2`
- `1862-stolypin-pyotr` (1862–1911) — Пётр Аркадьевич Столыпин — теги: `#person-stolypin-pyotr` `#topic-statecraft` · отсылки: `@era-9` `@ruler-nicholas-2`
- `1904-kosygin-aleksey` (1904–1980) — Алексей Николаевич Косыгин — теги: `#person-kosygin-aleksey` `#topic-statecraft` · отсылки: `@era-10` `@ruler-stalin` `@ruler-brezhnev`
- `1929-primakov-evgeny` (1929–2015) — Евгений Максимович Примаков — теги: `#person-primakov-evgeny` `#topic-statecraft` · отсылки: `@era-11` `@ruler-yeltsin`

### `THOUGHT_RELIGION` — Религия, просвещение и общественная мысль (`feat/thought-religion`, 15)

- `988-baptism-of-rus-hilarion` (988–1051) — Крещение Руси (988) и «Слово о законе и благодати» митрополита Илариона — теги: `#person-hilarion-metropolitan` `#topic-church-history` `#topic-social-thought` · отсылки: `@era-1` `@ruler-vladimir-1` `@ruler-yaroslav-wise`
- `1337-sergius-radonezh-monastic-revival` (1337–1392) — Преподобный Сергий Радонежский и «монастырская колонизация» Северо-Восточной Руси — теги: `#person-sergius-radonezh` `#topic-church-history` `#topic-social-thought` · отсылки: `@era-2` `@ruler-dmitry-donskoy` `@event-1378-vozha-kulikovo`
- `1490-non-possessors-third-rome` (1490–1524) — Спор нестяжателей и иосифлян (Нил Сорский и Иосиф Волоцкий) и доктрина «Москва — Третий Рим» — теги: `#person-sorsky-nil` `#person-volotsky-joseph` `#topic-church-history` `#topic-social-thought` · отсылки: `@era-3` `@ruler-ivan-3` `@ruler-vasily-3`
- `1551-stoglav-patriarchate-1589` (1551–1589) — Стоглавый собор (1551) и учреждение Московского патриаршества (1589) — теги: `#person-makary-metropolitan` `#person-iov-patriarch` `#topic-church-history` · отсылки: `@era-3` `@ruler-ivan-4` `@ruler-boris-godunov`
- `1632-kiev-mohyla-simeon-polotsky` (1632–1680) — Киево-Могилянская коллегия (1632) и просветительство Симеона Полоцкого — теги: `#person-mogila-pyotr` `#person-polotsky-simeon` `#topic-enlightenment` `#topic-church-history` · отсылки: `@era-4` `@ruler-alexey-mikhailovich` `@ruler-fyodor-3`
- `1721-peter-holy-synod` (1721–1725) — «Духовный регламент» (1721) и учреждение Святейшего Правительствующего Синода — теги: `#person-prokopovich-feofan` `#topic-church-history` `#topic-social-thought` · отсылки: `@era-5` `@ruler-peter-1`
- `1730-konditsii-tatishchev-history` (1730–1750) — «Кондиции» 1730 года и «История Российская» В. Н. Татищева — становление политической и исторической мысли Просвещения — теги: `#person-tatishchev-vasily` `#topic-social-thought` `#topic-law` · отсылки: `@era-6` `@ruler-anna-ioannovna` `@ruler-elizabeth`
- `1769-russian-enlightenment-novikov-radishchev` (1769–1790) — Русское Просвещение: журналы Николая Новикова и «Путешествие из Петербурга в Москву» Александра Радищева — теги: `#person-novikov-nikolay` `#person-radishchev-alexander` `#topic-enlightenment` `#topic-social-thought` · отсылки: `@era-7` `@ruler-catherine-2`
- `1836-chaadaev-westernizers-slavophiles` (1836–1860) — «Философическое письмо» Петра Чаадаева и великий спор западников и славянофилов — теги: `#person-chaadaev-pyotr` `#person-khomyakov-aleksey` `#person-belinsky-vissarion` `#topic-social-thought` · отсылки: `@era-7` `@ruler-nicholas-1`
- `1857-herzen-chicherin-narodnichestvo` (1857–1881) — Вольная печать Герцена («Колокол»), русское правовое либеральное государствоведение и народничество — теги: `#person-herzen-alexander` `#person-chicherin-boris` `#person-bakunin-mikhail` `#topic-social-thought` `#topic-law` · отсылки: `@era-8` `@ruler-alexander-2` `@event-1861-reform-emancipation`
- `1878-solovyov-silver-age-philosophy-vekhi` (1878–1918) — Русская религиозная философия Серебряного века: Владимир Соловьёв, сборник «Вехи» (1909) и Павел Флоренский — теги: `#person-solovyov-vladimir` `#person-berdyaev-nikolay` `#person-florensky-pavel` `#topic-silver-age` `#topic-social-thought` · отсылки: `@era-8` `@era-9` `@ruler-alexander-3` `@ruler-nicholas-2` `@event-1905-first-revolution`
- `1917-patriarchate-philosophers-ship` (1917–1922) — Поместный собор 1917–1918 годов, восстановление патриаршества и «Философский пароход» (1922) — теги: `#person-tikhon-patriarch` `#person-berdyaev-nikolay` `#person-sorokin-pitirim` `#topic-church-history` `#topic-social-thought` · отсылки: `@era-10` `@ruler-lenin` `@event-1917-civil-war` `@event-1918-reform-war-communism`
- `1968-sakharov-helsinki-human-rights` (1968–1989) — Правозащитное движение в СССР: Андрей Сахаров и Московская Хельсинкская группа (1976) — теги: `#person-sakharov` `#person-orlov-yury` `#topic-social-thought` `#topic-law` · отсылки: `@era-10` `@ruler-brezhnev` `@ruler-gorbachev`
- `1988-millennium-baptism-constitution` (1988–1991) — Тысячелетие Крещения Руси (1988) и Закон о свободе совести (1990) — теги: `#person-likhachev-dmitry` `#topic-church-history` `#topic-social-thought` · отсылки: `@era-10` `@ruler-gorbachev`
- `1993-russian-constitution-civil-society` (1993–1998) — Конституция Российской Федерации (1993), идеологический плюрализм и правовое пространство постсоветской России — теги: `#topic-law` `#topic-social-thought` · отсылки: `@era-11` `@ruler-yeltsin`

### `WAR_CONTINENTAL` — Войны: Большие и мировые войны (`war/continental`, 21)

- `1068-polovtsian-wars` (1068–1116) — Русско-половецкие войны и степные походы Владимира Мономаха
- `1185-igor-polovtsy-campaign` (1185 (весна)) — Поход князя Игоря Святославича против половцев
- `1223-kalka-battle` (1223 (31 мая)) — Битва на реке Калке
- `1237-batu-invasion` (1237–1241) — Монгольское (Батыево) нашествие на Русь
- `1240-nevsky-ice-battle` (1240–1242) — Отражение шведской и ливонской агрессии (Невская битва и Ледовое побоище)
- `1268-rakovor-livonia` (1268–1269) — Раковорская битва и оборона Пскова от Ливонского ордена
- `1368-lithuanian-moscow-wars` (1368–1372) — Московско-литовская война («Литовщина»)
- `1378-vozha-kulikovo` (1378–1380) — Битва на реке Воже и Куликовская битва — теги: `#kulikovo`
- `1382-tokhtamysh-edigu` (1382–1408) — Нашествие хана Тохтамыша (1382) и поход Едигея (1408)
- `1480-ugra-standing` (1480 (октябрь–ноябрь)) — Стояние на реке Угре и свержение ордынского ига
- `1487-rus-lithuanian-wars` (1487–1537) — Русско-литовские войны за возвращение западнорусских земель и Смоленска
- `1571-devlet-giray-molodi` (1571–1572) — Походы крымского хана Девлет-Гирея и битва при Молодях
- `1609-time-of-troubles-intervention` (1609–1618) — Освободительная война против польско-литовской и шведской интервенции (Смутное время) — теги: `#smuta`
- `1632-smolensk-azov` (1632–1642) — Смоленская война (1632–1634) и «Азовское осадное сидение» (1637–1642)
- `1654-rus-polish-swedish-war` (1654–1667) — Русско-польская война за Левобережную Украину, Киев и Смоленск (и Русско-шведская 1656–1658)
- `1756-seven-years` (1756–1763) — Семилетняя война
- `1805-coalitions-3-4` (1805–1807) — Войны Третьей и Четвертой антифранцузских коалиций — теги: `#napoleonic`
- `1812-patriotic-war` (1812) — Отечественная война 1812 года — теги: `#napoleonic`
- `1914-ww1` (1914–1918) — Первая мировая война — теги: `#ww1`
- `1919-soviet-polish` (1919–1921) — Советско-польская война
- `1941-ww2` (1941–1945) — Великая Отечественная война (и Советско-японская война 1945 г.) — теги: `#ww2`

### `SEAS` — Войны: Выход к морям и проливам (`war/seas`, 29)

- `907-byzantine-oleg` (907–911) — Походы Олега Вещего на Царьград (Византию)
- `941-byzantine-igor` (941–945) — Русско-византийская война Игоря Рюриковича и Древлянское восстание
- `968-svyatoslav-danube` (968–971) — Дунайские походы Святослава и русско-византийская война
- `988-korsun-vladimir` (988–997) — Корсунский поход Владимира Святого и оборонительные войны с печенегами
- `1036-pechenegs-byzantium` (1036–1043) — Разгром печенегов под Киевом и последний морской поход на Византию
- `1558-livonian-war` (1558–1583) — Ливонская война
- `1590-rus-swedish-war` (1590–1595) — Русско-шведская война и Тявзинский мир
- `1672-chigirin-rus-turk` (1672–1681) — Русско-турецкая война (Чигиринские походы)
- `1686-rus-turk` (1686–1700) — Русско-турецкая война (Крымские и Азовские походы)
- `1700-northern-war` (1700–1721) — Великая Северная война — теги: `#northern-war`
- `1710-pruth` (1710–1713) — Русско-турецкая война (и Прутский поход 1711 г.)
- `1722-persian` (1722–1723) — Персидский (Каспийский) поход Петра I
- `1735-rus-turk` (1735–1739) — Русско-турецкая война
- `1741-rus-swed` (1741–1743) — Русско-шведская война
- `1768-rus-turk` (1768–1774) — Русско-турецкая война (1768–1774)
- `1783-crimea-annex` (1783) — Ликвидация и аннексия Крымского ханства
- `1787-rus-turk` (1787–1791) — Русско-турецкая война (1787–1791)
- `1788-rus-swed` (1788–1790) — Русско-шведская война
- `1806-rus-turk` (1806–1812) — Русско-турецкая война (1806–1812)
- `1807-anglo-rus` (1807–1812) — Англо-русская война
- `1808-finnish-war` (1808–1809) — Русско-шведская (Финляндская) война
- `1827-navarino` (1827) — Наваринское сражение
- `1828-rus-turk` (1828–1829) — Русско-турецкая война
- `1833-bosphorus` (1833) — Босфорская экспедиция
- `1853-crimean-war` (1853–1856) — Крымская (Восточная) война
- `1877-rus-turk` (1877–1878) — Русско-турецкая война (1877–1878)
- `1904-rus-japanese` (1904–1905) — Русско-японская война
- `1939-winter-war` (1939–1940) — Советско-финляндская («Зимняя») война
- `1967-arab-israeli` (1967–1973) — Арабо-израильские войны (включая операцию «Кавказ» 1970 г.)

### `PERIPHERY` — Войны: Расширение границ и периферия (`war/periphery`, 32)

- `964-svyatoslav-eastern` (964–966) — Восточные походы Святослава: разгром Хазарского каганата
- `1471-novgorod-campaigns` (1471–1478) — Новгородские походы Ивана III и присоединение Новгорода
- `1545-kazan-astrakhan` (1545–1556) — Казанские и Астраханские походы Ивана IV Грозного
- `1581-yermak-siberia` (1581–1598) — Поход Ермака Тимофеевича и присоединение Сибирского ханства
- `1717-khiva` (1717) — Хивинский поход Бековича-Черкасского
- `1735-bashkir-2` (1735–1740) — Подавление Башкирских восстаний
- `1746-chukchi` (1746–1770-е) — Русско-чукотские войны
- `1794-kosciuszko` (1794) — Подавление восстания Тадеуша Костюшко
- `1796-zubov-persia` (1796) — Персидский поход Зубова
- `1801-caucasian-war` (1801–1864) — Кавказская война
- `1802-tlingit` (1802–1805) — Русско-тлинкитская война
- `1804-rus-persian` (1804–1813) — Русско-персидская война (1804–1813)
- `1826-rus-persian` (1826–1828) — Русско-персидская война
- `1830-polish-november` (1830–1831) — Подавление Польского (Ноябрьского) восстания
- `1837-kenesary` (1837–1847) — Подавление восстания Кенесары Касымова
- `1839-khiva-winter` (1839–1840) — Зимний Хивинский поход генерала Перовского
- `1853-central-asia` (1853–1895) — Среднеазиатские походы (завоевание Туркестана)
- `1863-polish-january` (1863–1864) — Подавление Польского (Январского) восстания
- `1916-central-asia-revolt` (1916) — Подавление Среднеазиатского восстания
- `1918-baltic-finnish` (1918–1920) — Войны с государствами Балтии и Финляндией
- `1918-basmachi` (1918–1934 (основные бои до 1926 г.)) — Борьба с басмачеством в Средней Азии
- `1921-second-finnish` (1921–1922) — Вторая советско-финская война (Карельское восстание)
- `1938-khasan` (1938 (июль–август)) — Бои у озера Хасан
- `1939-polish-campaign` (1939 (сентябрь)) — Польский поход Красной армии
- `1940-baltics-bessarabia` (1940 (июнь–август)) — Присоединение стран Балтии и Бессарабии
- `1944-upa-forest-brothers` (1944–1950-е) — Подавление антисоветского подполья в Западной Украине и Прибалтике
- `1969-damansky` (1969 (март и август)) — Пограничные конфликты с Китаем (Даманский и Жаланашколь)
- `1988-ussr-collapse` (1988–1991) — Войсковые операции на фоне распада СССР
- `1991-transnistria` (1991–1992) — Приднестровский конфликт (Молдова)
- `1991-abkhazia-ossetia` (1991–1993) — Вооруженные конфликты в Южной Осетии и Абхазии
- `1994-first-chechen` (1994–1996) — Первая чеченская война
- `1999-dagestan-second-chechen` (1999–2000 (активная войсковая фаза)) — Отражение вторжения в Дагестан и Вторая чеченская кампания (КТО на Северном Кавказе)

### `INTERNAL_BUFFER` — Войны: Усобицы, восстания и гражданские войны (`war/internal`, 22)

- `1015-feudal-strife-1` (1015–1019) — Междоусобная война сыновей Владимира Святого
- `1146-princely-wars-kiev` (1146–1174) — Княжеские усобицы за Киев и взятие Киева войсками Андрея Боголюбского
- `1317-moscow-tver-horde` (1317–1328) — Война Москвы и Твери за великое княжение и Тверское восстание
- `1425-feudal-war-moscow` (1425–1453) — Великая феодальная война в Московском княжестве
- `1606-bolotnikov-uprising` (1606–1607) — Восстание под предводительством Ивана Болотникова
- `1648-urban-copper-riots` (1648–1662) — Городские восстания «бунташного века» (Соляной, Хлебный и Медный бунты)
- `1667-stepan-razin-solovki` (1667–1676) — Крестьянская война под предводительством Степана Разина и Соловецкое восстание
- `1698-streltsy` (1698) — Подавление Стрелецкого бунта
- `1704-bashkir` (1704–1711) — Подавление Башкирского восстания
- `1705-astrakhan` (1705–1706) — Подавление Астраханского восстания
- `1707-bulavin` (1707–1708) — Подавление Булавинского восстания
- `1771-plague-riot` (1771) — Подавление Чумного бунта в Москве
- `1773-pugachev` (1773–1775) — Крестьянская война под предводительством Емельяна Пугачева
- `1825-decembrists` (1825 (декабрь)) — Подавление восстания декабристов
- `1905-first-revolution` (1905–1907) — Подавление Первой русской революции
- `1917-civil-war` (1917–1922) — Гражданская война и завоевание национальных окраин
- `1920-peasant-uprisings` (1920–1924) — Подавление антибольшевистских крестьянских и военных восстаний
- `1920s-north-caucasus` (1920-е — 1930-е) — Войсковые операции на Северном Кавказе
- `1944-deportations` (1944) — Войсковые операции по депортации народов (операция «Чечевица»)
- `1962-novocherkassk` (1962 (июнь)) — Новочеркасский расстрел
- `1992-prigorodny` (1992 (октябрь–ноябрь)) — Осетино-ингушский конфликт в Пригородном районе
- `1993-white-house` (1993 (октябрь)) — Силовой разгон Верховного Совета РФ (события октября 1993 г.)

### `WAR_EXPEDITION` — Войны: Зарубежные походы и локальные операции (`war/expedition`, 27)

- `1733-polish-succession` (1733–1735) — Война за польское наследство
- `1768-bar-confed` (1768–1772) — Война с Барской конфедерацией
- `1792-rus-polish` (1792) — Русско-польская война
- `1798-second-coalition` (1798–1800) — Война Второй антифранцузской коалиции
- `1813-foreign-campaigns` (1813–1814 (и 1815)) — Заграничные походы русской армии — теги: `#napoleonic`
- `1849-hungary` (1849) — Венгерский поход
- `1899-boxer-rebellion` (1899–1901) — Подавление Ихэтуаньского («Боксерского») восстания в Китае
- `1909-persian-intervention` (1909–1911) — Персидская интервенция
- `1921-mongolia` (1921) — Монгольская операция
- `1929-afghan-raid` (1929 (апрель–май)) — Афганский поход Красной армии
- `1929-kvzhd` (1929 (октябрь–ноябрь)) — Конфликт на КВЖД
- `1934-xinjiang` (1934 и 1937) — Синьцзянские интервенции
- `1936-spain` (1936–1939) — Гражданская война в Испании (операция «X»)
- `1937-china-z` (1937–1941) — Военная помощь Китаю (операция «Z»)
- `1939-khalkhin-gol` (1939 (май–сентябрь)) — Бои на реке Халхин-Гол
- `1941-iran-consent` (1941 (август–сентябрь)) — Иранская операция (операция «Согласие»)
- `1950-korean-war` (1950–1953) — Корейская война
- `1953-gdr-uprising` (1953 (июнь)) — Подавление восстания в ГДР
- `1956-hungary-whirlwind` (1956 (октябрь–ноябрь)) — Венгерское восстание (операция «Вихрь»)
- `1962-cuban-crisis` (1962 (октябрь)) — Карибский кризис (операция «Анадырь»)
- `1965-vietnam` (1965–1974) — Война во Вьетнаме
- `1968-prague-danube` (1968 (август)) — Ввод войск в Чехословакию (операция «Дунай»)
- `1975-angola` (1975–1991) — Гражданская война в Анголе (и Мозамбике)
- `1977-ogaden` (1977–1978) — Эфиопо-сомалийская (Огаденская) война
- `1979-afghan-war` (1979–1989) — Афганская война
- `1992-tajikistan` (1992–1997) — Гражданская война в Таджикистане
- `1999-pristina` (1999 (июнь)) — Марш-бросок на Приштину (Косово)

### `WORLD_CONTEXT` — Мировой геополитический контекст (`world/context`, 23)

- `1054-great-schism` (1054 (июль)) — Великая схизма: разделение Христианской церкви на Православную и Католическую — теги: `#world-great-schism-1054` · отсылки: `@era-1` `@ruler-yaroslav-wise` `@ruler-izyaslav-1`
- `1204-fourth-crusade` (1204–1215) — Захват Константинополя крестоносцами (1204) и Великая хартия вольностей в Англии (1215) — теги: `#world-crusade-1204` · отсылки: `@era-2` `@ruler-vsevolod-big-nest`
- `1347-world-black-death-renaissance` (1347–1353) — «Чёрная смерть» в Евразии (1347–1353), Столетняя война и заря итальянского Возрождения — теги: `#world-black-death-1347` `#topic-epidemiology` · отсылки: `@era-2`
- `1453-fall-of-constantinople` (1439–1453) — Флорентийская уния (1439), автокефалия Русской церкви (1448) и падение Константинополя (1453) — теги: `#world-constantinople-1453` · отсылки: `@era-3` `@ruler-vasily-2` `@ruler-ivan-3`
- `1492-columbus-reformation` (1492–1553) — Великие географические открытия (1492), Реформация в Европе (1517) и открытие морского пути в Архангельск (1553) — теги: `#world-discovery-reformation` · отсылки: `@era-3` `@era-4` `@ruler-ivan-3` `@ruler-ivan-4`
- `1618-thirty-years-westphalia` (1618–1648) — Тридцатилетняя война в Европе и Вестфальский мир (1648) — теги: `#world-westphalia-1648` · отсылки: `@era-5` `@ruler-mikhail-romanov` `@ruler-alexey-mikhailovich`
- `1688-world-glorious` (1688–1697) — «Славная революция» в Англии и Война Аугсбургской лиги в Европе — теги: `#world-glorious-rev`
- `1701-world-spanish-succ` (1701–1714) — Война за испанское наследство в Западной Европе — теги: `#world-spanish-succession`
- `1740-world-austrian` (1740–1748) — Война за австрийское наследство и возвышение Пруссии Фридриха II — теги: `#world-austrian-succession`
- `1776-world-usa-france` (1775–1794) — Война за независимость США (1776), «Вооружённый нейтралитет» Екатерины II и Великая французская революция (1789) — теги: `#world-french-rev`
- `1815-world-vienna` (1814–1815) — Венский конгресс и создание «Священного союза» монархов Европы — теги: `#world-vienna-congress`
- `1848-world-spring` (1848–1849) — «Весна народов»: волна европейских революций 1848–1849 годов — теги: `#world-spring-of-nations`
- `1871-world-germany` (1870–1871) — Франко-прусская война и провозглашение Германской империи в Версале — теги: `#world-german-unification`
- `1907-world-entente` (1891–1907) — Раскол Европы на два военных блока: Тройственный союз и Антанта — теги: `#world-entente-1907`
- `1905-world-relativity-july-crisis` (1905–1914) — Научная революция XX века (Эйнштейн, 1905), Синьхайская революция и Июльский кризис 1914 года — теги: `#world-july-crisis-1914` `#ww1` · отсылки: `@era-9` `@ruler-nicholas-2`
- `1919-world-versailles` (1919–1922) — Версальско-Вашингтонская система и создание Лиги Наций — теги: `#world-versailles`
- `1929-great-depression` (1929–1933) — «Великая депрессия»: мировой экономический кризис на Западе — теги: `#world-great-depression` `#reform-industrialization` · отсылки: `@era-9` `@ruler-stalin`
- `1933-world-axis` (1933–1938) — Приход Гитлера к власти (1933), ось Берлин — Рим — Токио и Мюнхенский сговор (1938) — теги: `#world-axis-munich`
- `1945-world-yalta-nato` (1946–1949) — Начало Холодной войны: Фултонская речь Черчилля, план Маршалла и создание блока НАТО (1949) — теги: `#world-yalta-nato`
- `1955-world-warsaw-pact` (1955–1961) — Создание Организации Варшавского договора (1955), распад колониальной системы и Берлинская стена (1961) — теги: `#world-warsaw-pact`
- `1975-world-helsinki` (1973–1979) — Мировой нефтяной шок (1973) и Хельсинкский Заключительный акт СБСЕ (1975) — теги: `#world-helsinki-1975`
- `1999-world-nato-expansion` (1989–1999) — Падение Берлинской стены (1989), первая волна расширения НАТО на Восток и бомбардировки Югославии (1999) — теги: `#world-nato-1999`
- `1992-world-maastricht-www-globalization` (1992–2000) — Маастрихтский договор (ЕС, 1992), революция Всемирной паутины (WWW) и глобализация конца XX века — теги: `#world-maastricht-www-1992` `#topic-computing` · отсылки: `@era-11` `@ruler-yeltsin`

### `WRITERS_BIO` — Русские писатели и летописцы (`culture/writers`, 37)

- `1056-nestor-chronicler` (1056–1114) — Нестор Летописец — теги: `#person-nestor-chronicler`
- `1350-sofoniy-ryazanets` (вт. пол. XIV — нач. XV в.) — Софоний Рязанец и Епифаний Премудрый — теги: `#person-sofoniy-ryazanets`
- `1528-kurbsky-peresvetov` (1528–1583) — Князь Андрей Михайлович Курбский и публицисты XVI века — теги: `#person-kurbsky-andrey` `#topic-social-thought` · отсылки: `@era-3` `@ruler-ivan-4`
- `1620-avvakum-petrov` (1620–1682) — Протопоп Аввакум Петров — теги: `#person-avvakum-petrov`
- `1703-trediakovsky-kantemir` (1703–1769) — Василий Кириллович Тредиаковский и Антиох Дмитриевич Кантемир — теги: `#person-trediakovsky-vasily` `#person-kantemir-antiokh` · отсылки: `@era-5` `@era-6` `@ruler-elizabeth`
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

### `WRITERS_WORKS` — Ключевые произведения литературы (`culture/books`, 79)

- `1113-povest-vremennykh-let` (1110–1113) — Нестор Летописец — «Повесть временных лет» — теги: `#person-nestor-chronicler` `#treaty-byzantium-911` `#war-rus-byzantine` · отсылки: `@era-1` `@ruler-rurik` `@ruler-oleg` `@ruler-vladimir-1` `@ruler-yaroslav-wise` `@ruler-monomakh`
- `1185-slovo-o-polku-igoreve` (1185–1187) — «Слово о полку Игореве» — теги: `#war-polovtsian-steppe` · отсылки: `@era-2` `@ruler-vsevolod-big-nest`
- `1380-zadonshchina` (1380-е годы) — Софоний Рязанец — «Задонщина» и «Сказание о Мамаевом побоище» — теги: `#person-sofoniy-ryazanets` `#war-kulikovo-1380` · отсылки: `@era-3` `@ruler-dmitry-donskoy`
- `1468-nikitin-khozhdenie-za-tri-morya` (1468–1474) — Афанасий Никитин — «Хожение за три моря» — теги: `#person-afanasy-nikitin` · отсылки: `@era-3` `@ruler-ivan-3`
- `1564-ivan-kurbsky-correspondence` (1564–1579) — Переписка царя Ивана IV Грозного с князем Андреем Курбским — теги: `#person-kurbsky-andrey` `#topic-social-thought` · отсылки: `@era-3` `@ruler-ivan-4`
- `1672-zhitie-avvakuma` (1672–1675) — Протопоп Аввакум — «Житие протопопа Аввакума, им самим написанное» — теги: `#person-avvakum-petrov` `#reform-church-schism` · отсылки: `@era-5` `@ruler-alexey-mikhailovich`
- `1717-yunosti-chestnoe-zertsalo-prokopovich` (1717–1725) — Словесность петровской эпохи: «Юности честное зерцало» (1717) и ораторская проза Феофана Прокоповича — теги: `#person-prokopovich-feofan` `#topic-enlightenment` · отсылки: `@era-5` `@ruler-peter-1`
- `1735-trediakovsky-lomonosov-versification` (1735–1739) — Реформа русского стихосложения: трактат В. К. Тредиаковского (1735) и «Письмо о правилах российского стихотворства» М. В. Ломоносова (1739) — теги: `#person-trediakovsky-vasily` `#person-lomonosov` · отсылки: `@era-6` `@ruler-anna-ioannovna` `@ruler-elizabeth`
- `1782-derzhavin-felitsa` (1782) — Г. Р. Державин — ода «Фелица» — теги: `#person-derzhavin-gavrila` · отсылки: `@ruler-catherine-2` `@era-7`
- `1782-fonvizin-nedorosl` (1782) — Д. И. Фонвизин — «Недоросль» — теги: `#person-fonvizin-denis` · отсылки: `@ruler-catherine-2` `@era-7`
- `1791-derzhavin-vodopad` (1791–1794) — Г. Р. Державин — «Водопад» и ода «На взятие Измаила» — теги: `#person-derzhavin-gavrila` · отсылки: `@event-1787-rus-turk` `@ruler-catherine-2` `@era-7`
- `1792-karamzin-bednaya-liza` (1792) — Н. М. Карамзин — «Бедная Лиза» — теги: `#person-karamzin-nikolay`
- `1812-krylov-basni-1812` (1811–1812) — И. А. Крылов — басни «Квартет» и «Волк на псарне» — теги: `#person-krylov-ivan` `#napoleonic` · отсылки: `@event-1812-patriotic-war` `@ruler-alexander-1` `@era-7`
- `1812-zhukovsky-svetlana-pevets` (1812) — В. А. Жуковский — баллада «Светлана» и «Певец во стане русских воинов» — теги: `#person-zhukovsky-vasily` `#napoleonic` · отсылки: `@event-1812-patriotic-war` `@ruler-alexander-1` `@era-7`
- `1816-karamzin-history-state` (1816–1826) — Н. М. Карамзин — «История государства Российского» (12 томов) — теги: `#person-karamzin-nikolay` · отсылки: `@event-1237-batu-invasion` `@event-1378-vozha-kulikovo` `@event-1480-ugra-standing` `@event-1545-kazan-astrakhan` `@event-1609-time-of-troubles-intervention` `@era-1` `@era-2` `@era-3` `@era-4` `@ruler-ryurik` `@ruler-vladimir-1` `@ruler-yaroslav-wise` `@ruler-dmitry-donskoy` `@ruler-ivan-3` `@ruler-ivan-4` `@ruler-boris-godunov`
- `1822-griboedov-gore-ot-uma` (1822–1824) — А. С. Грибоедов — «Горе от ума» — теги: `#person-griboedov-aleksandr` · отсылки: `@event-1825-decembrists` `@ruler-alexander-1` `@era-7`
- `1823-pushkin-evgeny-onegin` (1823–1831) — А. С. Пушкин — «Евгений Онегин» — теги: `#person-pushkin-alexander` · отсылки: `@ruler-alexander-1` `@ruler-nicholas-1` `@era-7`
- `1825-pushkin-boris-godunov` (1825) — А. С. Пушкин — трагедия «Борис Годунов» — теги: `#person-pushkin-alexander` · отсылки: `@event-1609-time-of-troubles-intervention` `@ruler-boris-godunov` `@ruler-false-dmitry-1` `@era-3` `@era-4`
- `1830-tyutchev-silentium` (1830) — Ф. И. Тютчев — «Silentium!» («Молчи, скрывайся и таи...») — теги: `#person-tyutchev-fyodor`
- `1833-pushkin-medny-vsadnik` (1833) — А. С. Пушкин — поэма «Медный всадник» — теги: `#person-pushkin-alexander` · отсылки: `@event-1700-northern-war` `@event-1721-nystad-treaty` `@northern-war` `@ruler-peter-1` `@era-5`
- `1835-gogol-taras-bulba` (1835–1842) — Н. В. Гоголь — «Тарас Бульба» — теги: `#person-gogol-nikolay` · отсылки: `@event-1654-rus-polish-swedish-war` `@era-4`
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
- `1908-blok-na-pole-kulikovom` (1908) — А. А. Блок — цикл «На поле Куликовом» — теги: `#person-blok-alexander` `#topic-silver-age` · отсылки: `@event-1378-vozha-kulikovo` `@ruler-dmitry-donskoy` `@era-2` `@ruler-nicholas-2` `@era-9`
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
