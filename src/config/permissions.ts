export const PERMISSIONS = {
  SITES_VIEW: "sites.view",
  SITES_CREATE: "sites.create",
  SITES_UPDATE: "sites.update",
  SITES_DELETE: "sites.delete",

  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_UPDATE: "employees.update",
  EMPLOYEES_DELETE: "employees.delete",
  EMPLOYEES_IMPORT: "employees.import",

  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_CLOCK: "attendance.clock",
  ATTENDANCE_CORRECT: "attendance.correct",
  ATTENDANCE_APPROVE: "attendance.approve",

  SCHEDULES_VIEW: "schedules.view",
  SCHEDULES_MANAGE: "schedules.manage",

  LEAVES_VIEW: "leaves.view",
  LEAVES_REQUEST: "leaves.request",
  LEAVES_APPROVE: "leaves.approve",

  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  BILLING_VIEW: "billing.view",
  BILLING_MANAGE: "billing.manage",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",

  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: {
  slug: string;
  name: string;
  category: string;
  description: string;
}[] = [
  { slug: PERMISSIONS.SITES_VIEW, name: "Voir les sites", category: "sites", description: "Consulter la liste des sites" },
  { slug: PERMISSIONS.SITES_CREATE, name: "Créer un site", category: "sites", description: "Ajouter un nouveau site" },
  { slug: PERMISSIONS.SITES_UPDATE, name: "Modifier un site", category: "sites", description: "Modifier les informations d'un site" },
  { slug: PERMISSIONS.SITES_DELETE, name: "Supprimer un site", category: "sites", description: "Supprimer un site" },

  { slug: PERMISSIONS.EMPLOYEES_VIEW, name: "Voir les employés", category: "employees", description: "Consulter la liste des employés" },
  { slug: PERMISSIONS.EMPLOYEES_CREATE, name: "Ajouter un employé", category: "employees", description: "Créer un nouvel employé" },
  { slug: PERMISSIONS.EMPLOYEES_UPDATE, name: "Modifier un employé", category: "employees", description: "Modifier les informations d'un employé" },
  { slug: PERMISSIONS.EMPLOYEES_DELETE, name: "Supprimer un employé", category: "employees", description: "Supprimer un employé" },
  { slug: PERMISSIONS.EMPLOYEES_IMPORT, name: "Importer des employés", category: "employees", description: "Importer des employés depuis un fichier" },

  { slug: PERMISSIONS.ATTENDANCE_VIEW, name: "Voir le pointage", category: "attendance", description: "Consulter les pointages" },
  { slug: PERMISSIONS.ATTENDANCE_CLOCK, name: "Pointer", category: "attendance", description: "Effectuer un pointage" },
  { slug: PERMISSIONS.ATTENDANCE_CORRECT, name: "Corriger un pointage", category: "attendance", description: "Demander une correction de pointage" },
  { slug: PERMISSIONS.ATTENDANCE_APPROVE, name: "Approuver une correction", category: "attendance", description: "Valider ou refuser une correction" },

  { slug: PERMISSIONS.SCHEDULES_VIEW, name: "Voir les plannings", category: "schedules", description: "Consulter les plannings" },
  { slug: PERMISSIONS.SCHEDULES_MANAGE, name: "Gérer les plannings", category: "schedules", description: "Créer et modifier les plannings" },

  { slug: PERMISSIONS.LEAVES_VIEW, name: "Voir les congés", category: "leaves", description: "Consulter les demandes de congé" },
  { slug: PERMISSIONS.LEAVES_REQUEST, name: "Demander un congé", category: "leaves", description: "Soumettre une demande de congé" },
  { slug: PERMISSIONS.LEAVES_APPROVE, name: "Approuver un congé", category: "leaves", description: "Valider ou refuser un congé" },

  { slug: PERMISSIONS.REPORTS_VIEW, name: "Voir les rapports", category: "reports", description: "Consulter les rapports" },
  { slug: PERMISSIONS.REPORTS_EXPORT, name: "Exporter les rapports", category: "reports", description: "Télécharger les rapports" },

  { slug: PERMISSIONS.BILLING_VIEW, name: "Voir la facturation", category: "billing", description: "Consulter l'abonnement" },
  { slug: PERMISSIONS.BILLING_MANAGE, name: "Gérer la facturation", category: "billing", description: "Modifier l'abonnement et payer" },

  { slug: PERMISSIONS.SETTINGS_VIEW, name: "Voir les paramètres", category: "settings", description: "Consulter les paramètres" },
  { slug: PERMISSIONS.SETTINGS_MANAGE, name: "Gérer les paramètres", category: "settings", description: "Modifier les paramètres" },

  { slug: PERMISSIONS.AUDIT_VIEW, name: "Voir l'audit", category: "audit", description: "Consulter les logs d'audit" },
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: Object.values(PERMISSIONS),
  admin: Object.values(PERMISSIONS).filter(
    (p) => p !== PERMISSIONS.BILLING_MANAGE,
  ),
  manager: [
    PERMISSIONS.SITES_VIEW,
    PERMISSIONS.SITES_UPDATE,
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.ATTENDANCE_CORRECT,
    PERMISSIONS.ATTENDANCE_APPROVE,
    PERMISSIONS.SCHEDULES_VIEW,
    PERMISSIONS.SCHEDULES_MANAGE,
    PERMISSIONS.LEAVES_VIEW,
    PERMISSIONS.LEAVES_REQUEST,
    PERMISSIONS.LEAVES_APPROVE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  hr: [
    PERMISSIONS.SITES_VIEW,
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_UPDATE,
    PERMISSIONS.EMPLOYEES_IMPORT,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_CORRECT,
    PERMISSIONS.ATTENDANCE_APPROVE,
    PERMISSIONS.SCHEDULES_VIEW,
    PERMISSIONS.SCHEDULES_MANAGE,
    PERMISSIONS.LEAVES_VIEW,
    PERMISSIONS.LEAVES_REQUEST,
    PERMISSIONS.LEAVES_APPROVE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  employee: [
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_CLOCK,
    PERMISSIONS.LEAVES_VIEW,
    PERMISSIONS.LEAVES_REQUEST,
    PERMISSIONS.SCHEDULES_VIEW,
  ],
};

export const SYSTEM_ROLES = [
  { slug: "owner", name: "Propriétaire", description: "Propriétaire de l'entreprise — accès total" },
  { slug: "admin", name: "Administrateur", description: "Administrateur — accès complet sauf facturation" },
  { slug: "manager", name: "Manager", description: "Responsable de site — accès limité à son/ses site(s)" },
  { slug: "hr", name: "RH", description: "Ressources Humaines — gestion employés et paie" },
  { slug: "employee", name: "Employé", description: "Employé — pointage et consultation personnelle" },
] as const;
