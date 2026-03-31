export const APP_NAME = "PointSync";
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
  { code: "CI", name: "Côte d'Ivoire", timezone: "Africa/Abidjan", currency: "XOF" },
  { code: "SN", name: "Sénégal", timezone: "Africa/Dakar", currency: "XOF" },
  { code: "CM", name: "Cameroun", timezone: "Africa/Douala", currency: "XAF" },
  { code: "ML", name: "Mali", timezone: "Africa/Bamako", currency: "XOF" },
  { code: "BF", name: "Burkina Faso", timezone: "Africa/Ouagadougou", currency: "XOF" },
  { code: "BJ", name: "Bénin", timezone: "Africa/Porto-Novo", currency: "XOF" },
  { code: "TG", name: "Togo", timezone: "Africa/Lome", currency: "XOF" },
  { code: "NE", name: "Niger", timezone: "Africa/Niamey", currency: "XOF" },
  { code: "GN", name: "Guinée", timezone: "Africa/Conakry", currency: "GNF" },
  { code: "GA", name: "Gabon", timezone: "Africa/Libreville", currency: "XAF" },
  { code: "CG", name: "Congo", timezone: "Africa/Brazzaville", currency: "XAF" },
  { code: "CD", name: "RD Congo", timezone: "Africa/Kinshasa", currency: "CDF" },
  { code: "MG", name: "Madagascar", timezone: "Indian/Antananarivo", currency: "MGA" },
  { code: "NG", name: "Nigeria", timezone: "Africa/Lagos", currency: "NGN" },
  { code: "GH", name: "Ghana", timezone: "Africa/Accra", currency: "GHS" },
  { code: "MA", name: "Maroc", timezone: "Africa/Casablanca", currency: "MAD" },
  { code: "TN", name: "Tunisie", timezone: "Africa/Tunis", currency: "TND" },
  { code: "DZ", name: "Algérie", timezone: "Africa/Algiers", currency: "DZD" },
] as const;
