export interface PlanFeature {
  name: string;
  included: boolean;
}

export interface Plan {
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxEmployees: number;
  maxSites: number;
  isPopular: boolean;
  features: PlanFeature[];
}

export const PLANS: Plan[] = [
  {
    slug: "starter",
    name: "Starter",
    description: "Pour les petits commerces et entrepreneurs",
    priceMonthly: 4500,
    priceYearly: 43200,
    currency: "XOF",
    maxEmployees: 50,
    maxSites: 3,
    isPopular: false,
    features: [
      { name: "Jusqu'à 50 employés", included: true },
      { name: "Jusqu'à 3 sites", included: true },
      { name: "Pointage entrée / sortie / pause", included: true },
      { name: "Géolocalisation et géofence", included: true },
      { name: "Dashboard temps réel", included: true },
      { name: "Gestion des horaires", included: true },
      { name: "Rapports basiques", included: true },
      { name: "Export CSV", included: true },
      { name: "Gestion des congés", included: false },
      { name: "Export Excel", included: false },
      { name: "Mode kiosque", included: false },
      { name: "Notifications email", included: false },
    ],
  },
  {
    slug: "growth",
    name: "Growth",
    description: "Pour les PME en croissance",
    priceMonthly: 7900,
    priceYearly: 75840,
    currency: "XOF",
    maxEmployees: 200,
    maxSites: 10,
    isPopular: true,
    features: [
      { name: "Jusqu'à 200 employés", included: true },
      { name: "Jusqu'à 10 sites", included: true },
      { name: "Pointage entrée / sortie / pause", included: true },
      { name: "Géolocalisation et géofence", included: true },
      { name: "Dashboard temps réel", included: true },
      { name: "Gestion des horaires", included: true },
      { name: "Rapports basiques et avancés", included: true },
      { name: "Export CSV et Excel", included: true },
      { name: "Gestion des congés", included: true },
      { name: "Mode kiosque", included: true },
      { name: "Multi-managers", included: true },
      { name: "Notifications email", included: true },
    ],
  },
  {
    slug: "business",
    name: "Business",
    description: "Pour les entreprises multisites",
    priceMonthly: 14900,
    priceYearly: 143040,
    currency: "XOF",
    maxEmployees: 500,
    maxSites: 30,
    isPopular: false,
    features: [
      { name: "Jusqu'à 500 employés", included: true },
      { name: "Jusqu'à 30 sites", included: true },
      { name: "Toutes les fonctionnalités Growth", included: true },
      { name: "Corrections avec approbation", included: true },
      { name: "Audit logs complets", included: true },
      { name: "Accès API", included: true },
      { name: "Support prioritaire", included: true },
      { name: "Rapports personnalisés", included: true },
    ],
  },
];

export const ENTERPRISE_PLAN = {
  slug: "enterprise",
  name: "Enterprise",
  description: "Pour les grandes entreprises",
  features: [
    "Employés illimités",
    "Sites illimités",
    "Toutes les fonctionnalités Business",
    "SSO / SAML",
    "Account manager dédié",
    "SLA garanti",
    "Déploiement sur mesure",
    "Formation équipe",
  ],
};

export function formatPrice(amount: number, currency = "XOF"): string {
  if (currency === "XOF" || currency === "XAF") {
    return `${amount.toLocaleString("fr-FR")} FCFA`;
  }
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}
