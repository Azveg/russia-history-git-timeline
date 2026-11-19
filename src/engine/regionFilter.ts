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
];

const REGION_MATCHERS: Array<{ id: Exclude<MacroRegionId, 'all'>; pattern: RegExp }> = [
  {
    id: 'rus_north_west',
    pattern:
      /петербург|петроград|ленинград|новгород|псков|балти[йк]|ливон|нарв|выборг|карел|архангельск|беломор|белое море|финлянд|прибалтик|кронштадт|ладог|эстлянд|курлянд|ингерманланд|северо-запад|север\s+руси|поморь/i,
  },
  {
    id: 'rus_south_caucasus',
    pattern:
      /крым|севастопол|черномор|ч[её]рное море|азов|дон|кубан|кавказ|закавказ|грузи|армени|азербайджан|дагестан|чечн|новоросси|украин|малоросси|бессараб|дунай|полтав|кишин[её]в|одесс|харьков|ростов|причерномор|таврид|таман|степ|юг\s+росси|южная\s+рус/i,
  },
  {
    id: 'rus_volga_ural',
    pattern:
      /волг|поволж|казан|астрахан|урал|оренбург|туркестан|средн\w+\s+ази|бухар|хив|коканд|казахстан|сталинград|царицын|самар|саратов|симбирск|ульяновск|екатеринбург|перм|вятк|нижн\w+\s+новгород|мерв|геок-тепе|памир|ташкент/i,
  },
  {
    id: 'rus_siberia_fareast',
    pattern:
      /сибир|дальн\w+\s+восток|амур|камчатк|тихоокеан|тих\w+\s+океан|маньчжур|порт-артур|цусим|владивосток|сахалин|курил|аляск|арктик|северн\w+\s+морск|нерчинск|иркутск|тобольск|томск|новосибирск|якут|чукот|хабаровск|байкал|колым/i,
  },
  {
    id: 'europe',
    pattern:
      /европ|франц|париж|герман|прусс|берлин|австр|вен[аеыу]\b|габсбург|польш|варшав|литв|реч\w+\s+посполит|англи|великобритан|лондон|итали|рим\b|венеци|испани|нидерланд|голланд|швеци|стокгольм|швейцар|балкан|греци|серби|болгар|венгри|чехи|праг|норвег|дани|португал|бельги|тильзит|брест|ялтин|потсдам|мюнхен|версал|аустерлиц|ватерлоо|лейпциг|фландр/i,
  },
  {
    id: 'asia_east',
    pattern:
      /кита[йяею]|пекин|цин\b|мин\b|сун\b|япони|токио|эдо\b|инди|дели|могол|коре[ияю]|монгол|вьетнам|индокита|ази[ияю](?!.*средн)|восточн\w+\s+ази|южн\w+\s+ази|тибет|сингапур|индонез/i,
  },
  {
    id: 'middle_east_africa',
    pattern:
      /осман|турц|визант|константинопол|стамбул|перси|иран|сефевид|афганистан|егип|африк|арави|палестин|сири|ирак|месопотам|ближн\w+\s+восток|средн\w+\s+восток|лепант|магриб|эфиоп|алжир|марокко/i,
  },
  {
    id: 'americas_global',
    pattern:
      /сша|америк|вашингтон|нью-йорк|куб[аеыу]|кариб|латинск\w+\s+америк|антарктид|атлантик|миров\w+\s+океан|космос|орбит|оон|глобальн|весь мир|мир\b|канада|мексик|бразил|аргентин|кругосвет/i,
  },
  {
    id: 'rus_center',
    pattern:
      /москв|владимир|киев|суздал|рязан|смоленск|твер|ярославл|костром|тул[аеы]|калуг|курск|ор[её]л|тамбов|воронеж|подмосков|чернигов|переяслав|русь|росси|российск|ссср|рсфср|рф\b|центр|внутренн/i,
  },
];

export function classifyEventMacroRegions(
  ev: Pick<EnrichedEvent, 'region' | 'task'>,
): Array<Exclude<MacroRegionId, 'all'>> {
  const raw = (ev.region || '').trim();
  const matched: Array<Exclude<MacroRegionId, 'all'>> = [];

  for (const { id, pattern } of REGION_MATCHERS) {
    if (pattern.test(raw)) {
      matched.push(id);
    }
  }

  if (matched.length === 0) {
    if (ev.task === 'WORLD_CONTEXT') {
      return ['europe'];
    }
    return ['rus_center'];
  }

  return matched;
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

