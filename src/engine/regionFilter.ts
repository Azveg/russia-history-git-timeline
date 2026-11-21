import type { EnrichedEvent, MacroRegionId } from '../types/timeline';

export interface MacroRegionOption {
  id: MacroRegionId;
  label: string;
  shortLabel: string;
}

export const MACRO_REGION_OPTIONS: MacroRegionOption[] = [
  { id: 'all', label: 'Все макрорегионы', shortLabel: 'Все регионы' },
  { id: 'rus_center', label: 'Центральная Россия и Древняя Русь', shortLabel: 'Центр / Русь' },
  { id: 'rus_north_west', label: 'Северо-Запад, Новгород и Балтика', shortLabel: 'Северо-Запад' },
  { id: 'rus_south_caucasus', label: 'Юг, Причерноморье, Крым и Кавказ', shortLabel: 'Юг и Кавказ' },
  { id: 'rus_volga_ural', label: 'Поволжье, Урал и Средняя Азия', shortLabel: 'Поволжье / Урал' },
  { id: 'rus_siberia_fareast', label: 'Сибирь, Дальний Восток и Арктика', shortLabel: 'Сибирь / Д. Восток' },
  { id: 'europe', label: 'Зарубежная Европа', shortLabel: 'Европа' },
  { id: 'asia_east', label: 'Восточная и Южная Азия', shortLabel: 'Вост. и Юж. Азия' },
  { id: 'middle_east_africa', label: 'Ближний Восток, Византия и Африка', shortLabel: 'Ближ. Восток' },
  { id: 'americas_global', label: 'Америка, Мировой океан и глобальный мир', shortLabel: 'Америка / Мир' },
  { id: 'unknown', label: 'Макрорегион не определён', shortLabel: 'Регион не определён' },
];

const REGION_MATCHERS: Array<{ id: Exclude<MacroRegionId, 'all'>; pattern: RegExp }> = [
  {
    id: 'rus_north_west',
    pattern:
      /петербург|петроград|ленинград|новгород|псков|балти[йк]|ливон|нарв|выборг|карел|архангельск|беломор|белое море|финлянд|прибалтик|кронштадт|ладог|эстлянд|курлянд|ингерманланд|северо-запад|север\s+руси|поморь/iu,
  },
  {
    id: 'rus_south_caucasus',
    pattern:
      /крым|севастопол|черномор|ч[её]рное море|азов|дон(?:а|у|ом|е|ск\p{L}*|ецк\p{L}*)?(?!\p{L})|кубан|кавказ|закавказ|грузи|армени|азербайджан|дагестан|чечн|новоросси|украин|малоросси|бессараб|дунай|полтав|кишин[её]в|одесс|харьков|ростов|причерномор|таврид|таман|степ|юг\s+росси|южная\s+рус/iu,
  },
  {
    id: 'rus_volga_ural',
    pattern:
      /волг|поволж|казан|астрахан|урал|оренбург|туркестан|средн\p{L}+\s+ази|бухар|хив|коканд|казахстан|сталинград|царицын|самар|саратов|симбирск|ульяновск|екатеринбург|перм|вятк|нижн\p{L}+\s+новгород|мерв|геок-тепе|памир|ташкент/iu,
  },
  {
    id: 'rus_siberia_fareast',
    pattern:
      /сибир|дальн\p{L}+\s+восток|амур|камчатк|тихоокеан|тих\p{L}+\s+океан|маньчжур|порт-артур|цусим|владивосток|сахалин|курил|аляск|арктик|северн\p{L}+\s+морск|нерчинск|иркутск|тобольск|томск|новосибирск|якут|чукот|хабаровск|байкал|колым/iu,
  },
  {
    id: 'europe',
    pattern:
      /европ|франц|париж|герман|прусс|берлин|австр|вен[аеыу]|габсбург|польш|варшав|литв|реч\p{L}+\s+посполит|англи|великобритан|лондон|паду|базел|итали|рим|венеци|испани|нидерланд|голланд|швеци|стокгольм|швейцар|балкан|греци|серби|болгар|венгри|чехи|праг|норвег|дани|португал|бельги|тильзит|брест|ялтин|потсдам|мюнхен|версал|аустерлиц|ватерлоо|лейпциг|фландр/iu,
  },
  {
    id: 'asia_east',
    pattern:
      /кита[йяею]|пекин|цин|мин|сун|япони|токио|эдо|инди|дели|могол|коре[ияю]|монгол|вьетнам|индокита|восточн\p{L}+\s+ази|южн\p{L}+\s+ази|тибет|сингапур|индонез/iu,
  },
  {
    id: 'middle_east_africa',
    pattern:
      /осман|турц|визант|константинопол|стамбул|перси|иран|сефевид|афганистан|егип|африк|арави|палестин|сири|ирак|месопотам|ближн\p{L}+\s+восток|средн\p{L}+\s+восток|лепант|магриб|эфиоп|алжир|марокко/iu,
  },
  {
    id: 'americas_global',
    pattern:
      /сша|америк|вашингтон|нью-йорк|куб[аеыу]|кариб|латинск\p{L}+\s+америк|антарктид|атлантик|миров\p{L}+\s+океан|космос|орбит|оон|глобальн|весь мир|мир|канада|мексик|бразил|аргентин|кругосвет/iu,
  },
  {
    id: 'rus_center',
    pattern:
      /москв|владимир|киев|суздал|рязан|смоленск|твер|ярославл|костром|тул[аеы]|калуг|курск|ор[её]л|тамбов|воронеж|подмосков|чернигов|переяслав|русь|росси|российск|ссср|рсфср|рф|центр|внутренн/iu,
  },
];

const regionPatterns = REGION_MATCHERS.map(({ id, pattern }) => ({
  id,
  pattern: new RegExp(`(?:^|[^\\p{L}\\p{M}])(?:${pattern.source})`, pattern.flags),
}));

export function classifyEventMacroRegions(
  ev: Pick<EnrichedEvent, 'region' | 'task'>,
): Array<Exclude<MacroRegionId, 'all'>> {
  const raw = (ev.region || '').normalize('NFC').trim();
  const matched: Array<Exclude<MacroRegionId, 'all'>> = [];

  for (const { id, pattern } of regionPatterns) {
    if (pattern.test(raw)) {
      matched.push(id);
    }
  }

  return matched.length > 0 ? matched : ['unknown'];
}

export function doesEventMatchMacroRegion(
  ev: Pick<EnrichedEvent, 'region' | 'task'>,
  selectedRegion: MacroRegionId | undefined,
): boolean {
  if (!selectedRegion || selectedRegion === 'all') return true;
  return classifyEventMacroRegions(ev).includes(selectedRegion);
}

export function computeMacroRegionCounts(
  events: Array<Pick<EnrichedEvent, 'region' | 'task'>>,
): Record<MacroRegionId, number> {
  const counts: Record<MacroRegionId, number> = {
    all: events.length,
    rus_center: 0,
    rus_north_west: 0,
    rus_south_caucasus: 0,
    rus_volga_ural: 0,
    rus_siberia_fareast: 0,
    europe: 0,
    asia_east: 0,
    middle_east_africa: 0,
    americas_global: 0,
    unknown: 0,
  };

  for (const ev of events) {
    const regions = classifyEventMacroRegions(ev);
    for (const r of regions) {
      counts[r] += 1;
    }
  }

  return counts;
}

export function getMacroRegionOption(id: MacroRegionId): MacroRegionOption {
  return MACRO_REGION_OPTIONS.find((opt) => opt.id === id) ?? MACRO_REGION_OPTIONS[0];
}

export function parseMacroRegionParam(raw: string | null | undefined): MacroRegionId {
  if (!raw) return 'all';
  const normalized = raw.trim() as MacroRegionId;
  return MACRO_REGION_OPTIONS.some((opt) => opt.id === normalized) ? normalized : 'all';
}

