/**
 * ISO 3166-1 alpha-2 country codes for address autocomplete.
 * Used by Google Places API componentRestrictions and the signup country dropdown.
 * Mirrors swift-slate/src/lib/countries.ts (COUNTRY_OPTIONS).
 *
 * El país ya no se elige en los formularios de la app: un dueño opera solo en el
 * país con el que se registró y ese país se lee de `useOwnerCountry()`. La única
 * pantalla que muestra este listado es el registro.
 */
export const COUNTRY_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "mx", label: "Mexico" },
  { value: "gb", label: "United Kingdom" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
  { value: "nl", label: "Netherlands" },
  { value: "br", label: "Brazil" },
  { value: "ar", label: "Argentina" },
  { value: "co", label: "Colombia" },
  { value: "cl", label: "Chile" },
  { value: "pe", label: "Peru" },
  { value: "ec", label: "Ecuador" },
  { value: "ie", label: "Ireland" },
  { value: "nz", label: "New Zealand" },
  { value: "jp", label: "Japan" },
  { value: "in", label: "India" },
  { value: "all", label: "All countries" },
] as const;

/**
 * States/provinces/regions by country code.
 * Mirrors swift-slate/src/lib/countries.ts (STATES_BY_COUNTRY).
 */
export const STATES_BY_COUNTRY: Record<string, string[]> = {
  us: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
  ],
  ca: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Yukon",
  ],
  mx: [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
    "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Guanajuato",
    "Guerrero", "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos", "Nayarit",
    "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
    "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
  ],
  gb: [
    "East Midlands", "East of England", "London", "North East England", "North West England",
    "Northern Ireland", "Scotland", "South East England", "South West England", "Wales",
    "West Midlands", "Yorkshire and the Humber",
  ],
  au: [
    "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
    "South Australia", "Tasmania", "Victoria", "Western Australia",
  ],
  de: [
    "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hesse",
    "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate",
    "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
  ],
  fr: [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Brittany", "Centre-Val de Loire",
    "Corsica", "Grand Est", "Guadeloupe", "Guyane", "Hauts-de-France", "Île-de-France",
    "La Réunion", "Martinique", "Mayotte", "Normandy", "Nouvelle-Aquitaine",
    "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  ],
  es: [
    "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country", "Canary Islands",
    "Cantabria", "Castilla-La Mancha", "Castilla y León", "Catalonia", "Ceuta",
    "Extremadura", "Galicia", "La Rioja", "Madrid", "Melilla", "Murcia", "Navarre", "Valencia",
  ],
  it: [
    "Abruzzo", "Aosta Valley", "Apulia", "Basilicata", "Calabria", "Campania",
    "Emilia-Romagna", "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardy", "Marche",
    "Molise", "Piedmont", "Sardinia", "Sicily", "Trentino-South Tyrol", "Tuscany",
    "Umbria", "Veneto",
  ],
  nl: [
    "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg",
    "North Brabant", "North Holland", "Overijssel", "South Holland", "Utrecht", "Zeeland",
  ],
  br: [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
    "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
    "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro",
    "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima",
    "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
  ],
  ar: [
    "Buenos Aires", "Buenos Aires City (CABA)", "Catamarca", "Chaco", "Chubut", "Córdoba",
    "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
    "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
    "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
  ],
  co: [
    "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá",
    "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca",
    "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño",
    "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia",
    "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
  ],
  cl: [
    "Antofagasta", "Araucanía", "Arica y Parinacota", "Atacama", "Aysén", "Biobío",
    "Coquimbo", "Los Lagos", "Los Ríos", "Magallanes", "Maule", "Metropolitana de Santiago",
    "Ñuble", "O'Higgins", "Tarapacá", "Valparaíso",
  ],
  pe: [
    "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao",
    "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque",
    "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno",
    "San Martín", "Tacna", "Tumbes", "Ucayali",
  ],
  ec: [
    "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro",
    "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí",
    "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena",
    "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora-Chinchipe",
  ],
  ie: [
    "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry",
    "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth",
    "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
    "Waterford", "Westmeath", "Wexford", "Wicklow",
  ],
  nz: [
    "Auckland", "Bay of Plenty", "Canterbury", "Gisborne", "Hawke's Bay",
    "Manawatu-Whanganui", "Marlborough", "Nelson", "Northland", "Otago",
    "Southland", "Taranaki", "Tasman", "Waikato", "Wellington", "West Coast",
  ],
  jp: [
    "Aichi", "Akita", "Aomori", "Chiba", "Ehime", "Fukui", "Fukuoka", "Fukushima",
    "Gifu", "Gunma", "Hiroshima", "Hokkaido", "Hyogo", "Ibaraki", "Ishikawa", "Iwate",
    "Kagawa", "Kagoshima", "Kanagawa", "Kochi", "Kumamoto", "Kyoto", "Mie", "Miyagi",
    "Miyazaki", "Nagano", "Nagasaki", "Nara", "Niigata", "Oita", "Okayama", "Okinawa",
    "Osaka", "Saga", "Saitama", "Shiga", "Shimane", "Shizuoka", "Tochigi", "Tokushima",
    "Tokyo", "Tottori", "Toyama", "Wakayama", "Yamagata", "Yamaguchi", "Yamanashi",
  ],
  in: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
  ],
};

/**
 * Centro del mapa por país — vista inicial antes de tener marcadores que encuadrar.
 * Mirrors swift-slate/src/lib/countries.ts (COUNTRY_CENTER).
 */
export const COUNTRY_CENTER: Record<string, { lat: number; lng: number }> = {
  us: { lat: 39.8283, lng: -98.5795 },
  ca: { lat: 56.13,   lng: -106.35 },
  mx: { lat: 23.63,   lng: -102.55 },
  gb: { lat: 54.0,    lng: -2.5 },
  au: { lat: -25.27,  lng: 133.77 },
  de: { lat: 51.16,   lng: 10.45 },
  fr: { lat: 46.23,   lng: 2.21 },
  es: { lat: 40.46,   lng: -3.75 },
  it: { lat: 41.87,   lng: 12.57 },
  nl: { lat: 52.13,   lng: 5.29 },
  br: { lat: -14.24,  lng: -51.93 },
  ar: { lat: -38.42,  lng: -63.62 },
  co: { lat: 4.57,    lng: -74.3 },
  cl: { lat: -35.68,  lng: -71.54 },
  pe: { lat: -9.19,   lng: -75.02 },
  ec: { lat: -1.83,   lng: -78.18 },
  ie: { lat: 53.14,   lng: -7.69 },
  nz: { lat: -40.9,   lng: 174.89 },
  jp: { lat: 36.2,    lng: 138.25 },
  in: { lat: 20.59,   lng: 78.96 },
};

/** Centro inicial del mapa para el país del dueño. */
export function countryCenter(country: string): { lat: number; lng: number } {
  return COUNTRY_CENTER[country] ?? COUNTRY_CENTER.us;
}

/**
 * Nombre del país que se añade a la dirección antes de geocodificarla.
 *
 * Las direcciones se guardan sin país (calle, ciudad, estado, código postal),
 * así que Google las interpreta en EE. UU. por defecto: "Calle 100, Bogotá"
 * puede caer en cualquier parte. EE. UU. no lleva sufijo porque es el caso que
 * Google ya resuelve sin ayuda.
 *
 * Mirrors swift-slate/src/components/MapView.tsx (COUNTRY_SUFFIX).
 */
export const COUNTRY_SUFFIX: Record<string, string> = {
  ca: "Canada", mx: "Mexico", gb: "United Kingdom", au: "Australia",
  de: "Germany", fr: "France", es: "Spain", it: "Italy", nl: "Netherlands",
  br: "Brazil", ar: "Argentina", co: "Colombia", cl: "Chile", pe: "Peru",
  ec: "Ecuador", ie: "Ireland", nz: "New Zealand", jp: "Japan", in: "India",
};

/**
 * Nombre legible de un país.
 * @param code - ISO alpha-2 en minúsculas
 * @param name - Nombre que ya vino del backend (`country_name`), si lo hay
 */
export function countryLabel(code: string, name?: string | null): string {
  if (name) return name;
  return COUNTRY_OPTIONS.find((c) => c.value === code)?.label ?? code.toUpperCase();
}

// ─── Reglas de dirección por país ─────────────────────────────────────────────
// El formato de código postal y de región cambia por país, y hasta ahora el
// dashboard asumía el de EE. UU. en todas partes (cinco dígitos, estado de dos
// letras). Con el país del dueño como dato fijo, cada regla se resuelve a partir
// de él.
//
// Solo EE. UU. lleva regla estricta: es la que ya existía y la que cubre la data
// histórica. Para el resto se usa una regla tolerante a propósito — una regex
// equivocada bloquea a un usuario real, mientras que una permisiva solo deja
// pasar un typo. Si un país concreto necesita su formato exacto, se añade aquí.

export interface PostalRule {
  /** `true` → el control solo acepta dígitos. */
  numeric:   boolean;
  pattern:   RegExp;
  message:   string;
  maxLength: number;
}

const US_POSTAL: PostalRule = {
  numeric:   true,
  pattern:   /^\d{5}$/,
  message:   "ZIP must be 5 digits",
  maxLength: 5,
};

const GENERIC_POSTAL: PostalRule = {
  numeric:   false,
  pattern:   /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/,
  message:   "Enter a valid postal code",
  maxLength: 12,
};

/** Regla de código postal del país. */
export function postalRule(country: string): PostalRule {
  return country === "us" ? US_POSTAL : GENERIC_POSTAL;
}

export interface StateRule {
  maxLength: number;
  /** `true` → el valor se guarda en mayúsculas (códigos de estado de EE. UU.). */
  uppercase: boolean;
  message:   string;
}

const US_STATE: StateRule = {
  maxLength: 2,
  uppercase: true,
  message:   "Enter the 2-letter state code",
};

const GENERIC_STATE: StateRule = {
  maxLength: 100,
  uppercase: false,
  message:   "State is too long",
};

/** Regla del campo State/Province/Region del país. */
export function stateRule(country: string): StateRule {
  return country === "us" ? US_STATE : GENERIC_STATE;
}

