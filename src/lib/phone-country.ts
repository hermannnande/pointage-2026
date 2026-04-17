/**
 * Mapping préfixe téléphonique international → code pays ISO 3166-1 alpha-2.
 * Trié par ordre décroissant de longueur de préfixe pour matcher le plus
 * spécifique en premier (ex. +1242 Bahamas avant +1 USA/Canada).
 */
const PHONE_PREFIX_TO_COUNTRY: Record<string, string> = {
  // Afrique de l'Ouest (UEMOA + CEDEAO)
  "225": "CI", // Côte d'Ivoire
  "221": "SN", // Sénégal
  "223": "ML", // Mali
  "226": "BF", // Burkina Faso
  "229": "BJ", // Bénin
  "228": "TG", // Togo
  "227": "NE", // Niger
  "224": "GN", // Guinée
  "245": "GW", // Guinée-Bissau
  "234": "NG", // Nigeria
  "233": "GH", // Ghana
  "232": "SL", // Sierra Leone
  "231": "LR", // Liberia
  "238": "CV", // Cap-Vert
  "220": "GM", // Gambie
  "222": "MR", // Mauritanie
  // Afrique Centrale (CEMAC)
  "237": "CM", // Cameroun
  "241": "GA", // Gabon
  "242": "CG", // Congo-Brazzaville
  "243": "CD", // RD Congo
  "235": "TD", // Tchad
  "236": "CF", // Centrafrique
  "240": "GQ", // Guinée équatoriale
  "239": "ST", // São Tomé
  // Afrique de l'Est
  "254": "KE", // Kenya
  "255": "TZ", // Tanzanie
  "256": "UG", // Ouganda
  "250": "RW", // Rwanda
  "257": "BI", // Burundi
  "251": "ET", // Éthiopie
  "253": "DJ", // Djibouti
  "252": "SO", // Somalie
  "291": "ER", // Érythrée
  "211": "SS", // Soudan du Sud
  // Afrique Australe
  "27": "ZA", // Afrique du Sud
  "258": "MZ", // Mozambique
  "263": "ZW", // Zimbabwe
  "260": "ZM", // Zambie
  "265": "MW", // Malawi
  "267": "BW", // Botswana
  "264": "NA", // Namibie
  "244": "AO", // Angola
  "268": "SZ", // Eswatini
  "266": "LS", // Lesotho
  // Afrique du Nord
  "212": "MA", // Maroc
  "216": "TN", // Tunisie
  "213": "DZ", // Algérie
  "20": "EG", // Égypte
  "218": "LY", // Libye
  "249": "SD", // Soudan
  // Îles africaines
  "261": "MG", // Madagascar
  "230": "MU", // Maurice
  "248": "SC", // Seychelles
  "269": "KM", // Comores
  "262": "RE", // La Réunion / Mayotte
  // Europe
  "33": "FR", // France
  "32": "BE", // Belgique
  "41": "CH", // Suisse
  "352": "LU", // Luxembourg
  "377": "MC", // Monaco
  "49": "DE", // Allemagne
  "34": "ES", // Espagne
  "351": "PT", // Portugal
  "39": "IT", // Italie
  "31": "NL", // Pays-Bas
  "44": "GB", // Royaume-Uni
  "353": "IE", // Irlande
  "43": "AT", // Autriche
  "48": "PL", // Pologne
  "420": "CZ", // Tchéquie
  "46": "SE", // Suède
  "47": "NO", // Norvège
  "45": "DK", // Danemark
  "358": "FI", // Finlande
  "30": "GR", // Grèce
  "40": "RO", // Roumanie
  "359": "BG", // Bulgarie
  "385": "HR", // Croatie
  "36": "HU", // Hongrie
  "421": "SK", // Slovaquie
  "386": "SI", // Slovénie
  "381": "RS", // Serbie
  "380": "UA", // Ukraine
  "90": "TR", // Turquie
  "7": "RU", // Russie / Kazakhstan
  // Amérique du Nord
  "1": "US", // USA / Canada (alpha-2 par défaut US)
  "52": "MX", // Mexique
  // Caraïbes
  "509": "HT", // Haïti
  "1809": "DO",
  "1829": "DO",
  "1849": "DO", // République dominicaine
  "53": "CU", // Cuba
  "1876": "JM", // Jamaïque
  "1868": "TT", // Trinité-et-Tobago
  "590": "GP", // Guadeloupe / Saint-Martin
  "596": "MQ", // Martinique
  "594": "GF", // Guyane française
  // Amérique du Sud
  "55": "BR", // Brésil
  "54": "AR", // Argentine
  "57": "CO", // Colombie
  "56": "CL", // Chili
  "51": "PE", // Pérou
  "58": "VE", // Venezuela
  "593": "EC", // Équateur
  "598": "UY", // Uruguay
  "595": "PY", // Paraguay
  "591": "BO", // Bolivie
  // Moyen-Orient
  "961": "LB", // Liban
  "971": "AE", // Émirats arabes unis
  "966": "SA", // Arabie saoudite
  "974": "QA", // Qatar
  "965": "KW", // Koweït
  "973": "BH", // Bahreïn
  "968": "OM", // Oman
  "962": "JO", // Jordanie
  "964": "IQ", // Irak
  "972": "IL", // Israël
  "970": "PS", // Palestine
  "967": "YE", // Yémen
  "963": "SY", // Syrie
  "98": "IR", // Iran
  // Asie
  "91": "IN", // Inde
  "86": "CN", // Chine
  "81": "JP", // Japon
  "82": "KR", // Corée du Sud
  "62": "ID", // Indonésie
  "66": "TH", // Thaïlande
  "84": "VN", // Vietnam
  "63": "PH", // Philippines
  "60": "MY", // Malaisie
  "65": "SG", // Singapour
  "92": "PK", // Pakistan
  "880": "BD", // Bangladesh
  "94": "LK", // Sri Lanka
  "977": "NP", // Népal
  "95": "MM", // Myanmar
  "855": "KH", // Cambodge
  "856": "LA", // Laos
  "93": "AF", // Afghanistan
  "998": "UZ", // Ouzbékistan
  // Océanie
  "61": "AU", // Australie
  "64": "NZ", // Nouvelle-Zélande
  "679": "FJ", // Fidji
  "689": "PF", // Polynésie française
  "687": "NC", // Nouvelle-Calédonie
};

const SORTED_PREFIXES = Object.keys(PHONE_PREFIX_TO_COUNTRY).sort(
  (a, b) => b.length - a.length,
);

/**
 * Mapping inverse code pays ISO → préfixe international (sans le "+").
 * Construit à partir de PHONE_PREFIX_TO_COUNTRY (premier prefix associé wins).
 */
const COUNTRY_TO_PHONE_PREFIX: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [prefix, country] of Object.entries(PHONE_PREFIX_TO_COUNTRY)) {
    if (!map[country]) map[country] = prefix;
  }
  // Overrides explicites (cas ambigus +1)
  map.US = "1";
  map.CA = "1";
  return map;
})();

/**
 * Retourne l'indicatif international (sans "+") pour un code pays ISO 3166-1 alpha-2.
 * Exemple : getPhonePrefixForCountry("CI") → "225"
 * Retourne "" si code inconnu.
 */
export function getPhonePrefixForCountry(code: string | null | undefined): string {
  if (!code) return "";
  return COUNTRY_TO_PHONE_PREFIX[code.toUpperCase()] ?? "";
}

/**
 * Convertit un code ISO 3166-1 alpha-2 en emoji drapeau régional.
 * Exemple : isoToFlagEmoji("CI") → "🇨🇮"
 */
export function isoToFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  const codePoints = upper.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

/**
 * Extrait le code pays ISO 3166-1 alpha-2 d'un numéro de téléphone international.
 * Accepte les formats : "+225 07 78 03 00 75", "00225 0778030075", "0778030075", etc.
 *
 * Retourne null si :
 * - Le numéro est vide ou invalide
 * - Aucun préfixe international reconnu (numéro local sans indicatif)
 */
export function getCountryFromPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let digits = phone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else {
    return null;
  }

  if (digits.length < 4) return null;

  for (const prefix of SORTED_PREFIXES) {
    if (digits.startsWith(prefix)) {
      const country = PHONE_PREFIX_TO_COUNTRY[prefix];
      if (country) return country;
    }
  }

  return null;
}

/**
 * Retourne uniquement la partie numéro (sans préfixe international).
 * Utile pour Chariow qui veut le `phone.number` séparé du `phone.country_code`.
 */
export function getLocalPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";

  let digits = phone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else {
    return digits;
  }

  for (const prefix of SORTED_PREFIXES) {
    if (digits.startsWith(prefix)) {
      return digits.slice(prefix.length);
    }
  }

  return digits;
}
