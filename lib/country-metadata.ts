import type { EraId } from './types';
import {
  PALETTE_WARM,
  PALETTE_MUTED,
  PALETTE_COOL,
} from './constants';

// ISO 3166-1 numeric → country name (ported from _legacy/js/data.js)
const COUNTRY_NAMES: Record<string, string> = {
  '004': 'Afghanistan', '008': 'Albania', '012': 'Algeria',
  '016': 'American Samoa', '020': 'Andorra', '024': 'Angola',
  '028': 'Antigua and Barbuda', '032': 'Argentina', '036': 'Australia',
  '040': 'Austria', '044': 'Bahamas', '048': 'Bahrain',
  '050': 'Bangladesh', '051': 'Armenia', '052': 'Barbados',
  '056': 'Belgium', '060': 'Bermuda', '064': 'Bhutan',
  '068': 'Bolivia', '070': 'Bosnia and Herzegovina', '072': 'Botswana',
  '076': 'Brazil', '084': 'Belize', '090': 'Solomon Islands',
  '096': 'Brunei', '100': 'Bulgaria', '104': 'Myanmar',
  '108': 'Burundi', '112': 'Belarus', '116': 'Cambodia',
  '120': 'Cameroon', '124': 'Canada', '140': 'Central African Rep.',
  '144': 'Sri Lanka', '148': 'Chad', '152': 'Chile', '156': 'China',
  '158': 'Taiwan', '170': 'Colombia', '174': 'Comoros',
  '178': 'Congo', '180': 'Dem. Rep. Congo', '188': 'Costa Rica',
  '191': 'Croatia', '192': 'Cuba', '196': 'Cyprus', '203': 'Czechia',
  '204': 'Benin', '208': 'Denmark', '212': 'Dominica',
  '214': 'Dominican Rep.', '218': 'Ecuador', '222': 'El Salvador',
  '226': 'Equatorial Guinea', '231': 'Ethiopia', '232': 'Eritrea',
  '233': 'Estonia', '238': 'Falkland Islands', '242': 'Fiji',
  '246': 'Finland', '250': 'France', '262': 'Djibouti',
  '266': 'Gabon', '268': 'Georgia', '270': 'Gambia',
  '275': 'Palestine', '276': 'Germany', '288': 'Ghana',
  '296': 'Kiribati', '300': 'Greece', '304': 'Greenland',
  '308': 'Grenada', '320': 'Guatemala', '324': 'Guinea',
  '328': 'Guyana', '332': 'Haiti', '340': 'Honduras',
  '344': 'Hong Kong', '348': 'Hungary', '352': 'Iceland',
  '356': 'India', '360': 'Indonesia', '364': 'Iran', '368': 'Iraq',
  '372': 'Ireland', '376': 'Israel', '380': 'Italy',
  '384': 'Ivory Coast', '388': 'Jamaica', '392': 'Japan',
  '398': 'Kazakhstan', '400': 'Jordan', '404': 'Kenya',
  '408': 'North Korea', '410': 'South Korea', '414': 'Kuwait',
  '417': 'Kyrgyzstan', '418': 'Laos', '422': 'Lebanon',
  '426': 'Lesotho', '428': 'Latvia', '430': 'Liberia',
  '434': 'Libya', '438': 'Liechtenstein', '440': 'Lithuania',
  '442': 'Luxembourg', '446': 'Macau', '450': 'Madagascar',
  '454': 'Malawi', '458': 'Malaysia', '462': 'Maldives',
  '466': 'Mali', '470': 'Malta', '478': 'Mauritania',
  '480': 'Mauritius', '484': 'Mexico', '492': 'Monaco',
  '496': 'Mongolia', '498': 'Moldova', '499': 'Montenegro',
  '504': 'Morocco', '508': 'Mozambique', '512': 'Oman',
  '516': 'Namibia', '520': 'Nauru', '524': 'Nepal',
  '528': 'Netherlands', '540': 'New Caledonia', '548': 'Vanuatu',
  '554': 'New Zealand', '558': 'Nicaragua', '562': 'Niger',
  '566': 'Nigeria', '578': 'Norway', '586': 'Pakistan',
  '591': 'Panama', '598': 'Papua New Guinea', '600': 'Paraguay',
  '604': 'Peru', '608': 'Philippines', '616': 'Poland',
  '620': 'Portugal', '624': 'Guinea-Bissau', '626': 'Timor-Leste',
  '630': 'Puerto Rico', '634': 'Qatar', '642': 'Romania',
  '643': 'Russia', '646': 'Rwanda', '659': 'Saint Kitts and Nevis',
  '662': 'Saint Lucia', '670': 'Saint Vincent and Grenadines',
  '674': 'San Marino', '678': 'Sao Tome and Principe',
  '682': 'Saudi Arabia', '686': 'Senegal', '688': 'Serbia',
  '690': 'Seychelles', '694': 'Sierra Leone', '702': 'Singapore',
  '703': 'Slovakia', '704': 'Vietnam', '705': 'Slovenia',
  '706': 'Somalia', '710': 'South Africa', '716': 'Zimbabwe',
  '724': 'Spain', '728': 'South Sudan', '729': 'Sudan',
  '732': 'Western Sahara', '740': 'Suriname', '748': 'Eswatini',
  '752': 'Sweden', '756': 'Switzerland', '760': 'Syria',
  '762': 'Tajikistan', '764': 'Thailand', '768': 'Togo',
  '776': 'Tonga', '780': 'Trinidad and Tobago',
  '784': 'United Arab Emirates', '788': 'Tunisia', '792': 'Turkey',
  '795': 'Turkmenistan', '800': 'Uganda', '804': 'Ukraine',
  '807': 'North Macedonia', '818': 'Egypt', '826': 'United Kingdom',
  '834': 'Tanzania', '840': 'United States', '854': 'Burkina Faso',
  '858': 'Uruguay', '860': 'Uzbekistan', '862': 'Venezuela',
  '882': 'Samoa', '887': 'Yemen', '894': 'Zambia',
  '010': 'Antarctica', '900': 'Kosovo', '-99': 'N. Cyprus',
};

export function getCountryName(id: string | number): string {
  const key = String(id).padStart(3, '0');
  return COUNTRY_NAMES[key] ?? COUNTRY_NAMES[String(id)] ?? `Country ${id}`;
}

export function getFeatureName(feature: GeoJSON.Feature): string {
  const p = feature.properties;
  if (!p) return 'Unknown';
  return (
    p.name ?? p.NAME ?? p.ADMIN ?? p.GEOUNIT ?? p.SOVEREIGNT ??
    (feature.id ? getCountryName(String(feature.id)) : 'Unknown')
  );
}

export function getEraId(year: number): EraId {
  if (year < -1000) return 'ancient';
  if (year < 0) return 'classical';
  if (year < 500) return 'late-antiquity';
  if (year < 1500) return 'medieval';
  if (year < 1800) return 'early-modern';
  if (year < 1914) return 'empires';
  if (year < 1945) return 'world-wars';
  if (year < 1991) return 'cold-war';
  return 'modern';
}

export function getEraLabel(year: number): string {
  const labels: Record<EraId, string> = {
    'ancient': 'Ancient World',
    'classical': 'Classical Antiquity',
    'late-antiquity': 'Late Antiquity',
    'medieval': 'Medieval Period',
    'early-modern': 'Early Modern Period',
    'empires': 'Age of Empires',
    'world-wars': 'World Wars Era',
    'cold-war': 'Cold War Era',
    'modern': 'Modern Era',
  };
  return labels[getEraId(year)];
}

export function getEraPalette(year: number): string[] {
  if (year < 0) return PALETTE_WARM;
  if (year < 1500) return PALETTE_MUTED;
  return PALETTE_COOL;
}

export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

/**
 * Formats a CShapes feature's temporal validity window as a human-readable
 * string. Expects feature properties to contain `gwsyear` (start) and
 * `gweyear` (end). Returns:
 *   - `"1958–present"` when start is valid and end is missing/0
 *   - `"1958–1990"` when both are valid
 *   - `null` when start is missing/invalid (e.g. Natural Earth or pre-CShapes)
 *
 * Uses an en-dash (–) as the range separator.
 */
export function formatBorderDateRange(
  properties: GeoJSON.GeoJsonProperties | null | undefined
): string | null {
  if (!properties) return null;
  const rawStart = properties.gwsyear;
  const start = typeof rawStart === 'number' ? rawStart : Number(rawStart);
  if (!Number.isFinite(start) || start <= 0) return null;

  const rawEnd = properties.gweyear;
  const end = typeof rawEnd === 'number' ? rawEnd : Number(rawEnd);
  if (!Number.isFinite(end) || end <= 0) {
    return `${start}\u2013present`;
  }
  return `${start}\u2013${end}`;
}
