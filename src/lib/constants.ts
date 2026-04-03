export const APP_NAME = "OControle";
export const APP_DESCRIPTION =
  "Plateforme SaaS de pointage et gestion de présence pour les entreprises africaines";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const DEFAULT_CURRENCY = "XOF";
export const DEFAULT_TIMEZONE = "Africa/Abidjan";
export const DEFAULT_LOCALE = "fr";
export const DEFAULT_COUNTRY = "CI";

export const TRIAL_DAYS = 14;
export const GRACE_PERIOD_DAYS = 7;
export const GEOFENCE_DEFAULT_RADIUS_METERS = 200;
export const LATE_GRACE_MINUTES = 15;

export const QUOTA_WARNING_THRESHOLD = 0.8;

export const SECTORS = [
  { value: "retail", label: "Commerce / Boutique" },
  { value: "restaurant", label: "Restauration" },
  { value: "beauty", label: "Salon de beauté / Coiffure" },
  { value: "health", label: "Santé / Pharmacie" },
  { value: "education", label: "Éducation / Formation" },
  { value: "construction", label: "Construction / BTP" },
  { value: "logistics", label: "Logistique / Transport" },
  { value: "manufacturing", label: "Industrie / Atelier" },
  { value: "services", label: "Services / Consulting" },
  { value: "technology", label: "Technologie / IT" },
  { value: "agriculture", label: "Agriculture" },
  { value: "other", label: "Autre" },
] as const;

export const COUNTRIES = [
  // --- Afrique de l'Ouest (UEMOA/CEDEAO) ---
  { code: "CI", name: "🇨🇮 Côte d'Ivoire", timezone: "Africa/Abidjan", currency: "XOF" },
  { code: "SN", name: "🇸🇳 Sénégal", timezone: "Africa/Dakar", currency: "XOF" },
  { code: "ML", name: "🇲🇱 Mali", timezone: "Africa/Bamako", currency: "XOF" },
  { code: "BF", name: "🇧🇫 Burkina Faso", timezone: "Africa/Ouagadougou", currency: "XOF" },
  { code: "BJ", name: "🇧🇯 Bénin", timezone: "Africa/Porto-Novo", currency: "XOF" },
  { code: "TG", name: "🇹🇬 Togo", timezone: "Africa/Lome", currency: "XOF" },
  { code: "NE", name: "🇳🇪 Niger", timezone: "Africa/Niamey", currency: "XOF" },
  { code: "GN", name: "🇬🇳 Guinée", timezone: "Africa/Conakry", currency: "GNF" },
  { code: "GW", name: "🇬🇼 Guinée-Bissau", timezone: "Africa/Bissau", currency: "XOF" },
  { code: "NG", name: "🇳🇬 Nigeria", timezone: "Africa/Lagos", currency: "NGN" },
  { code: "GH", name: "🇬🇭 Ghana", timezone: "Africa/Accra", currency: "GHS" },
  { code: "SL", name: "🇸🇱 Sierra Leone", timezone: "Africa/Freetown", currency: "SLL" },
  { code: "LR", name: "🇱🇷 Liberia", timezone: "Africa/Monrovia", currency: "LRD" },
  { code: "CV", name: "🇨🇻 Cap-Vert", timezone: "Atlantic/Cape_Verde", currency: "CVE" },
  { code: "GM", name: "🇬🇲 Gambie", timezone: "Africa/Banjul", currency: "GMD" },
  { code: "MR", name: "🇲🇷 Mauritanie", timezone: "Africa/Nouakchott", currency: "MRU" },
  // --- Afrique Centrale (CEMAC) ---
  { code: "CM", name: "🇨🇲 Cameroun", timezone: "Africa/Douala", currency: "XAF" },
  { code: "GA", name: "🇬🇦 Gabon", timezone: "Africa/Libreville", currency: "XAF" },
  { code: "CG", name: "🇨🇬 Congo-Brazzaville", timezone: "Africa/Brazzaville", currency: "XAF" },
  { code: "CD", name: "🇨🇩 RD Congo", timezone: "Africa/Kinshasa", currency: "CDF" },
  { code: "TD", name: "🇹🇩 Tchad", timezone: "Africa/Ndjamena", currency: "XAF" },
  { code: "CF", name: "🇨🇫 Centrafrique", timezone: "Africa/Bangui", currency: "XAF" },
  { code: "GQ", name: "🇬🇶 Guinée équatoriale", timezone: "Africa/Malabo", currency: "XAF" },
  { code: "ST", name: "🇸🇹 São Tomé-et-Príncipe", timezone: "Africa/Sao_Tome", currency: "STN" },
  // --- Afrique de l'Est ---
  { code: "KE", name: "🇰🇪 Kenya", timezone: "Africa/Nairobi", currency: "KES" },
  { code: "TZ", name: "🇹🇿 Tanzanie", timezone: "Africa/Dar_es_Salaam", currency: "TZS" },
  { code: "UG", name: "🇺🇬 Ouganda", timezone: "Africa/Kampala", currency: "UGX" },
  { code: "RW", name: "🇷🇼 Rwanda", timezone: "Africa/Kigali", currency: "RWF" },
  { code: "BI", name: "🇧🇮 Burundi", timezone: "Africa/Bujumbura", currency: "BIF" },
  { code: "ET", name: "🇪🇹 Éthiopie", timezone: "Africa/Addis_Ababa", currency: "ETB" },
  { code: "DJ", name: "🇩🇯 Djibouti", timezone: "Africa/Djibouti", currency: "DJF" },
  { code: "SO", name: "🇸🇴 Somalie", timezone: "Africa/Mogadishu", currency: "SOS" },
  { code: "ER", name: "🇪🇷 Érythrée", timezone: "Africa/Asmara", currency: "ERN" },
  { code: "SS", name: "🇸🇸 Soudan du Sud", timezone: "Africa/Juba", currency: "SSP" },
  // --- Afrique Australe ---
  { code: "ZA", name: "🇿🇦 Afrique du Sud", timezone: "Africa/Johannesburg", currency: "ZAR" },
  { code: "MZ", name: "🇲🇿 Mozambique", timezone: "Africa/Maputo", currency: "MZN" },
  { code: "ZW", name: "🇿🇼 Zimbabwe", timezone: "Africa/Harare", currency: "ZWL" },
  { code: "ZM", name: "🇿🇲 Zambie", timezone: "Africa/Lusaka", currency: "ZMW" },
  { code: "MW", name: "🇲🇼 Malawi", timezone: "Africa/Lilongwe", currency: "MWK" },
  { code: "BW", name: "🇧🇼 Botswana", timezone: "Africa/Gaborone", currency: "BWP" },
  { code: "NA", name: "🇳🇦 Namibie", timezone: "Africa/Windhoek", currency: "NAD" },
  { code: "AO", name: "🇦🇴 Angola", timezone: "Africa/Luanda", currency: "AOA" },
  { code: "SZ", name: "🇸🇿 Eswatini", timezone: "Africa/Mbabane", currency: "SZL" },
  { code: "LS", name: "🇱🇸 Lesotho", timezone: "Africa/Maseru", currency: "LSL" },
  // --- Afrique du Nord ---
  { code: "MA", name: "🇲🇦 Maroc", timezone: "Africa/Casablanca", currency: "MAD" },
  { code: "TN", name: "🇹🇳 Tunisie", timezone: "Africa/Tunis", currency: "TND" },
  { code: "DZ", name: "🇩🇿 Algérie", timezone: "Africa/Algiers", currency: "DZD" },
  { code: "EG", name: "🇪🇬 Égypte", timezone: "Africa/Cairo", currency: "EGP" },
  { code: "LY", name: "🇱🇾 Libye", timezone: "Africa/Tripoli", currency: "LYD" },
  { code: "SD", name: "🇸🇩 Soudan", timezone: "Africa/Khartoum", currency: "SDG" },
  // --- Îles ---
  { code: "MG", name: "🇲🇬 Madagascar", timezone: "Indian/Antananarivo", currency: "MGA" },
  { code: "MU", name: "🇲🇺 Maurice", timezone: "Indian/Mauritius", currency: "MUR" },
  { code: "SC", name: "🇸🇨 Seychelles", timezone: "Indian/Mahe", currency: "SCR" },
  { code: "KM", name: "🇰🇲 Comores", timezone: "Indian/Comoro", currency: "KMF" },
  // --- Europe & Monde Francophone ---
  { code: "FR", name: "🇫🇷 France", timezone: "Europe/Paris", currency: "EUR" },
  { code: "BE", name: "🇧🇪 Belgique", timezone: "Europe/Brussels", currency: "EUR" },
  { code: "CH", name: "🇨🇭 Suisse", timezone: "Europe/Zurich", currency: "CHF" },
  { code: "LU", name: "🇱🇺 Luxembourg", timezone: "Europe/Luxembourg", currency: "EUR" },
  { code: "MC", name: "🇲🇨 Monaco", timezone: "Europe/Monaco", currency: "EUR" },
  // --- Amérique & Caraïbes ---
  { code: "CA", name: "🇨🇦 Canada", timezone: "America/Toronto", currency: "CAD" },
  { code: "HT", name: "🇭🇹 Haïti", timezone: "America/Port-au-Prince", currency: "HTG" },
  // --- Moyen-Orient ---
  { code: "LB", name: "🇱🇧 Liban", timezone: "Asia/Beirut", currency: "LBP" },
  { code: "AE", name: "🇦🇪 Émirats arabes unis", timezone: "Asia/Dubai", currency: "AED" },
  { code: "SA", name: "🇸🇦 Arabie saoudite", timezone: "Asia/Riyadh", currency: "SAR" },
] as const;
