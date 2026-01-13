/**
 * Mapping from country slugs to ISO 3166-1 alpha-2 flag codes.
 * Used to look up flag SVGs for country listings.
 *
 * Codes map to files in src/assets/flags/{code}.svg
 * null = no flag available (historical entities, etc.)
 */
export const FLAG_CODES: Record<string, string | null> = {
  // Standard countries (ISO alpha-2)
  'australia': 'au',
  'austria': 'at',
  'azerbaijan': 'az',
  'bahrain': 'bh',
  'belarus': 'by',
  'belgium': 'be',
  'bulgaria': 'bg',
  'canada': 'ca',
  'chile': 'cl',
  'costa-rica': 'cr',
  'croatia': 'hr',
  'cuba': 'cu',
  'cyprus': 'cy',
  'czechia': 'cz',
  'denmark': 'dk',
  'estonia': 'ee',
  'finland': 'fi',
  'france': 'fr',
  'germany': 'de',
  'greece': 'gr',
  'guatemala': 'gt',
  'hungary': 'hu',
  'ireland': 'ie',
  'israel': 'il',
  'italy': 'it',
  'japan': 'jp',
  'latvia': 'lv',
  'lithuania': 'lt',
  'luxembourg': 'lu',
  'malaysia': 'my',
  'maldives': 'mv',
  'mauritius': 'mu',
  'netherlands': 'nl',
  'new-zealand': 'nz',
  'north-macedonia': 'mk',
  'norway': 'no',
  'panama': 'pa',
  'poland': 'pl',
  'portugal': 'pt',
  'qatar': 'qa',
  'russia': 'ru',
  'singapore': 'sg',
  'slovakia': 'sk',
  'slovenia': 'si',
  'spain': 'es',
  'suriname': 'sr',
  'sweden': 'se',
  'switzerland': 'ch',
  'trinidad-and-tobago': 'tt',
  'tunisia': 'tn',
  'ukraine': 'ua',
  'united-kingdom': 'gb',
  'united-states-of-america': 'us',

  // Territories
  'china-hong-kong-sar': 'hk',
  'hong-kong': 'hk',
  'new-caledonia': 'nc',
  'puerto-rico': 'pr',
  'republic-of-korea': 'kr',

  // UK regional entities (flag-icons regional codes)
  'england-and-wales': 'gb-eng',
  'northern-ireland': 'gb-nir',

  // Historical entities - no flags
  'east-germany': null,
  'west-germany': null,
};

/**
 * Get the flag code for a country slug.
 * Returns null if no flag is available.
 */
export function getFlagCode(slug: string): string | null {
  return FLAG_CODES[slug] ?? null;
}
