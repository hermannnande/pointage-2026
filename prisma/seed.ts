import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AttendanceStatus,
  BillingCycle,
  ContractType,
  EventType,
  EventSource,
  LeaveStatus,
  PrismaClient,
  SubStatus,
} from "@prisma/client";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/** Slugs stables pour le seed (réutilisables dans les upserts). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function atTime(d: Date, h: number, m: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m, 0, 0),
  );
}

/* -------------------------------------------------------------------------- */
/* Aligné sur src/config/permissions.ts (inline pour exécution tsx)           */
/* -------------------------------------------------------------------------- */

const P = {
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

const ALL_PERMISSIONS_SEED: {
  slug: string;
  name: string;
  category: string;
  description: string;
}[] = [
  { slug: P.SITES_VIEW, name: "Voir les sites", category: "sites", description: "Consulter la liste des sites" },
  { slug: P.SITES_CREATE, name: "Créer un site", category: "sites", description: "Ajouter un nouveau site" },
  { slug: P.SITES_UPDATE, name: "Modifier un site", category: "sites", description: "Modifier les informations d'un site" },
  { slug: P.SITES_DELETE, name: "Supprimer un site", category: "sites", description: "Supprimer un site" },
  { slug: P.EMPLOYEES_VIEW, name: "Voir les employés", category: "employees", description: "Consulter la liste des employés" },
  { slug: P.EMPLOYEES_CREATE, name: "Ajouter un employé", category: "employees", description: "Créer un nouvel employé" },
  { slug: P.EMPLOYEES_UPDATE, name: "Modifier un employé", category: "employees", description: "Modifier les informations d'un employé" },
  { slug: P.EMPLOYEES_DELETE, name: "Supprimer un employé", category: "employees", description: "Supprimer un employé" },
  { slug: P.EMPLOYEES_IMPORT, name: "Importer des employés", category: "employees", description: "Importer des employés depuis un fichier" },
  { slug: P.ATTENDANCE_VIEW, name: "Voir le pointage", category: "attendance", description: "Consulter les pointages" },
  { slug: P.ATTENDANCE_CLOCK, name: "Pointer", category: "attendance", description: "Effectuer un pointage" },
  { slug: P.ATTENDANCE_CORRECT, name: "Corriger un pointage", category: "attendance", description: "Demander une correction de pointage" },
  { slug: P.ATTENDANCE_APPROVE, name: "Approuver une correction", category: "attendance", description: "Valider ou refuser une correction" },
  { slug: P.SCHEDULES_VIEW, name: "Voir les plannings", category: "schedules", description: "Consulter les plannings" },
  { slug: P.SCHEDULES_MANAGE, name: "Gérer les plannings", category: "schedules", description: "Créer et modifier les plannings" },
  { slug: P.LEAVES_VIEW, name: "Voir les congés", category: "leaves", description: "Consulter les demandes de congé" },
  { slug: P.LEAVES_REQUEST, name: "Demander un congé", category: "leaves", description: "Soumettre une demande de congé" },
  { slug: P.LEAVES_APPROVE, name: "Approuver un congé", category: "leaves", description: "Valider ou refuser un congé" },
  { slug: P.REPORTS_VIEW, name: "Voir les rapports", category: "reports", description: "Consulter les rapports" },
  { slug: P.REPORTS_EXPORT, name: "Exporter les rapports", category: "reports", description: "Télécharger les rapports" },
  { slug: P.BILLING_VIEW, name: "Voir la facturation", category: "billing", description: "Consulter l'abonnement" },
  { slug: P.BILLING_MANAGE, name: "Gérer la facturation", category: "billing", description: "Modifier l'abonnement et payer" },
  { slug: P.SETTINGS_VIEW, name: "Voir les paramètres", category: "settings", description: "Consulter les paramètres" },
  { slug: P.SETTINGS_MANAGE, name: "Gérer les paramètres", category: "settings", description: "Modifier les paramètres" },
  { slug: P.AUDIT_VIEW, name: "Voir l'audit", category: "audit", description: "Consulter les logs d'audit" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: Object.values(P),
  admin: Object.values(P).filter((slug) => slug !== P.BILLING_MANAGE),
  manager: [
    P.SITES_VIEW,
    P.SITES_UPDATE,
    P.EMPLOYEES_VIEW,
    P.ATTENDANCE_VIEW,
    P.ATTENDANCE_CLOCK,
    P.ATTENDANCE_CORRECT,
    P.ATTENDANCE_APPROVE,
    P.SCHEDULES_VIEW,
    P.SCHEDULES_MANAGE,
    P.LEAVES_VIEW,
    P.LEAVES_REQUEST,
    P.LEAVES_APPROVE,
    P.REPORTS_VIEW,
  ],
  hr: [
    P.SITES_VIEW,
    P.EMPLOYEES_VIEW,
    P.EMPLOYEES_CREATE,
    P.EMPLOYEES_UPDATE,
    P.EMPLOYEES_IMPORT,
    P.ATTENDANCE_VIEW,
    P.ATTENDANCE_CORRECT,
    P.ATTENDANCE_APPROVE,
    P.SCHEDULES_VIEW,
    P.SCHEDULES_MANAGE,
    P.LEAVES_VIEW,
    P.LEAVES_REQUEST,
    P.LEAVES_APPROVE,
    P.REPORTS_VIEW,
    P.REPORTS_EXPORT,
  ],
  employee: [
    P.ATTENDANCE_VIEW,
    P.ATTENDANCE_CLOCK,
    P.LEAVES_VIEW,
    P.LEAVES_REQUEST,
    P.SCHEDULES_VIEW,
  ],
};

const SYSTEM_ROLES = [
  { slug: "owner", name: "Propriétaire", description: "Propriétaire de l'entreprise — accès total" },
  { slug: "admin", name: "Administrateur", description: "Administrateur — accès complet sauf facturation" },
  { slug: "manager", name: "Manager", description: "Responsable de site — accès limité à son/ses site(s)" },
  { slug: "hr", name: "RH", description: "Ressources Humaines — gestion employés et paie" },
  { slug: "employee", name: "Employé", description: "Employé — pointage et consultation personnelle" },
] as const;

async function main() {
  console.log("Démarrage du seed de démonstration OControle…");

  console.log("Plans : création ou mise à jour…");
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      description: "Pour les petits commerces et entrepreneurs",
      priceMonthly: 4500,
      priceYearly: 43200,
      currency: "XOF",
      maxEmployees: 50,
      maxSites: 3,
      features: {
        attendance: true,
        geofence: true,
        dashboard: true,
        schedules: true,
        basicReports: true,
        csvExport: true,
        leaves: false,
        excelExport: false,
        kiosk: false,
        emailNotifications: false,
        corrections: false,
        auditLogs: false,
        api: false,
      },
      isActive: true,
      sortOrder: 1,
      isPopular: false,
    },
    {
      name: "Growth",
      slug: "growth",
      description: "Pour les PME en croissance",
      priceMonthly: 7900,
      priceYearly: 75840,
      currency: "XOF",
      maxEmployees: 200,
      maxSites: 10,
      features: {
        attendance: true,
        geofence: true,
        dashboard: true,
        schedules: true,
        basicReports: true,
        advancedReports: true,
        csvExport: true,
        excelExport: true,
        leaves: true,
        kiosk: true,
        multiManagers: true,
        emailNotifications: true,
        corrections: false,
        auditLogs: false,
        api: false,
      },
      isActive: true,
      sortOrder: 2,
      isPopular: true,
    },
    {
      name: "Business",
      slug: "business",
      description: "Pour les entreprises multisites",
      priceMonthly: 14900,
      priceYearly: 143040,
      currency: "XOF",
      maxEmployees: 500,
      maxSites: 30,
      features: {
        attendance: true,
        geofence: true,
        dashboard: true,
        schedules: true,
        basicReports: true,
        advancedReports: true,
        csvExport: true,
        excelExport: true,
        leaves: true,
        kiosk: true,
        multiManagers: true,
        emailNotifications: true,
        corrections: true,
        auditLogs: true,
        api: true,
        prioritySupport: true,
      },
      isActive: true,
      sortOrder: 3,
      isPopular: false,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
    console.log(`  Plan « ${plan.name} » enregistré.`);
  }

  console.log("Permissions système…");
  for (const perm of ALL_PERMISSIONS_SEED) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {
        name: perm.name,
        category: perm.category,
        description: perm.description,
      },
      create: perm,
    });
  }
  console.log(`  ${ALL_PERMISSIONS_SEED.length} permissions synchronisées.`);

  const companySlug = slugify("Boutique Amara");
  console.log(`Entreprise : ${companySlug}…`);
  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    create: {
      name: "Boutique Amara",
      slug: companySlug,
      email: "contact@boutique-amara.ci",
      phone: "+225 07 12 34 56 78",
      sector: "Commerce de détail",
      country: "CI",
      city: "Abidjan",
      timezone: "Africa/Abidjan",
      currency: "XOF",
      onboardingStep: 3,
      isActive: true,
    },
    update: {
      name: "Boutique Amara",
      email: "contact@boutique-amara.ci",
      phone: "+225 07 12 34 56 78",
      sector: "Commerce de détail",
      country: "CI",
      city: "Abidjan",
      timezone: "Africa/Abidjan",
      currency: "XOF",
      isActive: true,
    },
  });
  console.log(`  Société « ${company.name} » prête.`);

  let sitePlateau = await prisma.site.findFirst({
    where: { companyId: company.id, name: "Boutique Plateau" },
  });
  if (sitePlateau) {
    sitePlateau = await prisma.site.update({
      where: { id: sitePlateau.id },
      data: {
        address: "Boulevard de la République, Plateau",
        city: "Abidjan",
        latitude: 5.3364,
        longitude: -4.0267,
        geofenceRadius: 200,
        workStartTime: "08:00",
        workEndTime: "17:00",
        graceMinutes: 15,
        isActive: true,
        clockInEnabled: true,
      },
    });
  } else {
    sitePlateau = await prisma.site.create({
      data: {
        companyId: company.id,
        name: "Boutique Plateau",
        address: "Boulevard de la République, Plateau",
        city: "Abidjan",
        latitude: 5.3364,
        longitude: -4.0267,
        geofenceRadius: 200,
        workStartTime: "08:00",
        workEndTime: "17:00",
        graceMinutes: 15,
        isActive: true,
        clockInEnabled: true,
      },
    });
  }
  console.log("  Site « Boutique Plateau » enregistré.");

  let siteYop = await prisma.site.findFirst({
    where: { companyId: company.id, name: "Dépôt Yopougon" },
  });
  if (siteYop) {
    siteYop = await prisma.site.update({
      where: { id: siteYop.id },
      data: {
        address: "Zone industrielle, Yopougon",
        city: "Abidjan",
        latitude: 5.311,
        longitude: -4.0988,
        geofenceRadius: 200,
        workStartTime: "08:00",
        workEndTime: "17:00",
        graceMinutes: 15,
        isActive: true,
        clockInEnabled: true,
      },
    });
  } else {
    siteYop = await prisma.site.create({
      data: {
        companyId: company.id,
        name: "Dépôt Yopougon",
        address: "Zone industrielle, Yopougon",
        city: "Abidjan",
        latitude: 5.311,
        longitude: -4.0988,
        geofenceRadius: 200,
        workStartTime: "08:00",
        workEndTime: "17:00",
        graceMinutes: 15,
        isActive: true,
        clockInEnabled: true,
      },
    });
  }
  console.log("  Site « Dépôt Yopougon » enregistré.");

  let deptVentes = await prisma.department.findFirst({
    where: { companyId: company.id, name: "Ventes" },
  });
  if (deptVentes) {
    deptVentes = await prisma.department.update({
      where: { id: deptVentes.id },
      data: {
        description: "Équipe vente et relation client",
        siteId: sitePlateau.id,
        isActive: true,
      },
    });
  } else {
    deptVentes = await prisma.department.create({
      data: {
        companyId: company.id,
        siteId: sitePlateau.id,
        name: "Ventes",
        description: "Équipe vente et relation client",
        isActive: true,
      },
    });
  }
  console.log("  Département « Ventes » enregistré.");

  console.log("Utilisateur démo…");
  const demoUser = await prisma.user.upsert({
    where: { supabaseUid: "demo-owner-uid" },
    create: {
      supabaseUid: "demo-owner-uid",
      email: "demo@pointsync.com",
      fullName: "Amara Koné",
      lastLoginAt: new Date(),
    },
    update: {
      email: "demo@pointsync.com",
      fullName: "Amara Koné",
      lastLoginAt: new Date(),
    },
  });
  console.log(`  Utilisateur « ${demoUser.fullName} » synchronisé.`);

  console.log("Rôles système et liaisons permissions…");
  const permRows = await prisma.permission.findMany();
  const permMap = new Map(permRows.map((p) => [p.slug, p.id]));

  const roleBySlug = new Map<string, { id: string; slug: string }>();

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        slug_companyId: { slug: roleDef.slug, companyId: company.id },
      },
      create: {
        name: roleDef.name,
        slug: roleDef.slug,
        description: roleDef.description,
        isSystem: true,
        companyId: company.id,
      },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });
    roleBySlug.set(roleDef.slug, { id: role.id, slug: role.slug });
    console.log(`  Rôle « ${role.name} » prêt.`);
  }

  const seededRoleIds = [...roleBySlug.values()].map((r) => r.id);
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: seededRoleIds } },
  });

  for (const roleDef of SYSTEM_ROLES) {
    const roleId = roleBySlug.get(roleDef.slug)!.id;
    const slugs = ROLE_PERMISSIONS[roleDef.slug] ?? [];
    const rows = slugs
      .map((slug) => {
        const permissionId = permMap.get(slug);
        if (!permissionId) return null;
        return { roleId, permissionId };
      })
      .filter(Boolean) as { roleId: string; permissionId: string }[];

    if (rows.length > 0) {
      await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
    }
  }
  console.log("  Permissions par rôle appliquées.");

  const ownerRoleId = roleBySlug.get("owner")!.id;
  await prisma.membership.upsert({
    where: {
      userId_companyId: { userId: demoUser.id, companyId: company.id },
    },
    create: {
      userId: demoUser.id,
      companyId: company.id,
      roleId: ownerRoleId,
      isOwner: true,
      isActive: true,
    },
    update: {
      roleId: ownerRoleId,
      isOwner: true,
      isActive: true,
    },
  });
  console.log("  Adhésion propriétaire liée au compte démo.");

  type EmpSeed = {
    matricule: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    position?: string;
    contractType: ContractType;
    siteKey: "plateau" | "yopougon";
    department: boolean;
    linkUser: boolean;
    hireOffsetMonths: number;
  };

  const employeesSeed: EmpSeed[] = [
    {
      matricule: "EMP001",
      firstName: "Amara",
      lastName: "Koné",
      email: "demo@pointsync.com",
      phone: "+225 05 11 22 33 44",
      position: "Gérante & fondatrice",
      contractType: ContractType.CDI,
      siteKey: "plateau",
      department: true,
      linkUser: true,
      hireOffsetMonths: 36,
    },
    {
      matricule: "EMP002",
      firstName: "Aya",
      lastName: "Traoré",
      email: "aya.traore@boutique-amara.ci",
      position: "Vendeuse senior",
      contractType: ContractType.CDI,
      siteKey: "plateau",
      department: true,
      linkUser: false,
      hireOffsetMonths: 24,
    },
    {
      matricule: "EMP003",
      firstName: "Yao",
      lastName: "Kouassi",
      email: "yao.kouassi@boutique-amara.ci",
      position: "Magasinier",
      contractType: ContractType.CDI,
      siteKey: "yopougon",
      department: false,
      linkUser: false,
      hireOffsetMonths: 18,
    },
    {
      matricule: "EMP004",
      firstName: "Fatou",
      lastName: "Diabaté",
      email: "fatou.diabate@boutique-amara.ci",
      position: "Conseillère vente",
      contractType: ContractType.CDD,
      siteKey: "plateau",
      department: true,
      linkUser: false,
      hireOffsetMonths: 8,
    },
    {
      matricule: "EMP005",
      firstName: "Koffi",
      lastName: "N'Guessan",
      email: "koffi.nguessan@boutique-amara.ci",
      position: "Chef d'équipe logistique",
      contractType: ContractType.CDI,
      siteKey: "yopougon",
      department: false,
      linkUser: false,
      hireOffsetMonths: 30,
    },
    {
      matricule: "EMP006",
      firstName: "Mariam",
      lastName: "Ouattara",
      email: "mariam.ouattara@boutique-amara.ci",
      position: "Caissière",
      contractType: ContractType.CDI,
      siteKey: "plateau",
      department: true,
      linkUser: false,
      hireOffsetMonths: 14,
    },
    {
      matricule: "EMP007",
      firstName: "Serge",
      lastName: "Yao",
      email: "serge.yao@boutique-amara.ci",
      position: "Vendeur",
      contractType: ContractType.CDI,
      siteKey: "yopougon",
      department: true,
      linkUser: false,
      hireOffsetMonths: 6,
    },
    {
      matricule: "EMP008",
      firstName: "Adjoua",
      lastName: "Brou",
      email: "adjoua.brou@boutique-amara.ci",
      position: "Responsable ventes",
      contractType: ContractType.CDI,
      siteKey: "plateau",
      department: true,
      linkUser: false,
      hireOffsetMonths: 22,
    },
  ];

  const now = new Date();
  const employees: { id: string; matricule: string; siteId: string }[] = [];

  console.log("Employés…");
  for (const e of employeesSeed) {
    const siteId = e.siteKey === "plateau" ? sitePlateau.id : siteYop.id;
    const hireDate = addDays(now, -e.hireOffsetMonths * 30);
    const emp = await prisma.employee.upsert({
      where: {
        companyId_matricule: { companyId: company.id, matricule: e.matricule },
      },
      create: {
        companyId: company.id,
        siteId,
        departmentId: e.department ? deptVentes.id : null,
        userId: e.linkUser ? demoUser.id : null,
        matricule: e.matricule,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email ?? null,
        phone: e.phone ?? null,
        position: e.position ?? null,
        contractType: e.contractType,
        hireDate,
        isActive: true,
      },
      update: {
        siteId,
        departmentId: e.department ? deptVentes.id : null,
        userId: e.linkUser ? demoUser.id : null,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email ?? null,
        phone: e.phone ?? null,
        position: e.position ?? null,
        contractType: e.contractType,
        hireDate,
        isActive: true,
      },
    });
    employees.push({ id: emp.id, matricule: e.matricule, siteId });
    console.log(`  ${e.matricule} — ${e.firstName} ${e.lastName}`);
  }

  console.log("Planning « Horaires standard »…");
  let schedule = await prisma.schedule.findFirst({
    where: { companyId: company.id, name: "Horaires standard" },
  });
  if (schedule) {
    await prisma.shift.deleteMany({ where: { scheduleId: schedule.id } });
    schedule = await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        description: "Lun–Ven 08:00–17:00, pause 60 min — week-end repos",
        isTemplate: true,
        isActive: true,
      },
    });
  } else {
    schedule = await prisma.schedule.create({
      data: {
        companyId: company.id,
        name: "Horaires standard",
        description: "Lun–Ven 08:00–17:00, pause 60 min — week-end repos",
        isTemplate: true,
        isActive: true,
      },
    });
  }

  const shiftDays = [0, 1, 2, 3, 4, 5, 6];
  await prisma.shift.createMany({
    data: shiftDays.map((dayOfWeek) => {
      const isWork = dayOfWeek >= 1 && dayOfWeek <= 5;
      return {
        scheduleId: schedule.id,
        dayOfWeek,
        startTime: "08:00",
        endTime: "17:00",
        breakMinutes: isWork ? 60 : 0,
        isWorkDay: isWork,
      };
    }),
  });
  console.log("  7 shifts créés (lun–ven travail, sam–dim repos).");

  const assignStart = addDays(toDateOnly(now), -45);
  await prisma.scheduleAssignment.deleteMany({
    where: {
      scheduleId: schedule.id,
      employeeId: { in: employees.map((e) => e.id) },
    },
  });
  await prisma.scheduleAssignment.createMany({
    data: employees.map((e) => ({
      scheduleId: schedule.id,
      employeeId: e.id,
      startDate: assignStart,
      endDate: null,
      isActive: true,
    })),
  });
  console.log("  Affectations horaires pour les 8 employés.");

  console.log("Types de congé…");
  const leaveTypeDefs = [
    {
      name: "Congé annuel",
      slug: "conge-annuel",
      color: "#3B82F6",
      defaultDays: 21,
      isPaid: true,
      requiresDoc: false,
    },
    {
      name: "Congé maladie",
      slug: "conge-maladie",
      color: "#EF4444",
      defaultDays: 15,
      isPaid: true,
      requiresDoc: true,
    },
    {
      name: "Congé personnel",
      slug: "conge-personnel",
      color: "#F59E0B",
      defaultDays: 5,
      isPaid: false,
      requiresDoc: false,
    },
  ];

  const leaveTypes: { id: string; slug: string }[] = [];
  for (const lt of leaveTypeDefs) {
    const row = await prisma.leaveType.upsert({
      where: {
        companyId_slug: { companyId: company.id, slug: lt.slug },
      },
      create: {
        companyId: company.id,
        name: lt.name,
        slug: lt.slug,
        color: lt.color,
        defaultDays: lt.defaultDays,
        isPaid: lt.isPaid,
        requiresDoc: lt.requiresDoc,
        isActive: true,
      },
      update: {
        name: lt.name,
        color: lt.color,
        defaultDays: lt.defaultDays,
        isPaid: lt.isPaid,
        requiresDoc: lt.requiresDoc,
        isActive: true,
      },
    });
    leaveTypes.push({ id: row.id, slug: row.slug });
    console.log(`  « ${lt.name} »`);
  }

  const growthPlan = await prisma.plan.findUniqueOrThrow({ where: { slug: "growth" } });
  const periodStart = toDateOnly(now);
  const trialEnd = addDays(now, 7);
  const periodEnd = addDays(periodStart, 30);

  await prisma.subscription.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      planId: growthPlan.id,
      status: SubStatus.TRIALING,
      billingCycle: BillingCycle.MONTHLY,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: trialEnd,
    },
    update: {
      planId: growthPlan.id,
      status: SubStatus.TRIALING,
      billingCycle: BillingCycle.MONTHLY,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: trialEnd,
    },
  });
  console.log("Abonnement démo : essai 7 jours (plan Growth).");

  const annualLt = leaveTypes.find((l) => l.slug === "conge-annuel")!;
  const emp4 = employees.find((e) => e.matricule === "EMP004")!;
  await prisma.leaveRequest.deleteMany({
    where: { employeeId: emp4.id, leaveTypeId: annualLt.id },
  });
  await prisma.leaveRequest.create({
    data: {
      employeeId: emp4.id,
      leaveTypeId: annualLt.id,
      startDate: addDays(toDateOnly(now), 14),
      endDate: addDays(toDateOnly(now), 18),
      totalDays: 5,
      reason: "Congé familial à Korhogo",
      status: LeaveStatus.PENDING,
    },
  });
  console.log("  Une demande de congé exemple créée (EMP004).");

  console.log("Pointages (aujourd'hui et 5 jours précédents)…");
  const today = toDateOnly(now);
  const days: Date[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    days.push(addDays(today, -i));
  }

  function dayKind(d: Date): "weekend" | "weekday" {
    const dow = d.getUTCDay();
    return dow === 0 || dow === 6 ? "weekend" : "weekday";
  }

  type DayScenario =
    | { kind: "rest" }
    | {
        kind: "work";
        status: AttendanceStatus;
        inH: number;
        inM: number;
        outH: number;
        outM: number;
        breakM: number;
        withBreakEvents: boolean;
        lateMin: number;
        earlyMin: number;
      };

  const scenariosByIndex: DayScenario[] = [
    {
      kind: "work",
      status: AttendanceStatus.PRESENT,
      inH: 8,
      inM: 2,
      outH: 17,
      outM: 5,
      breakM: 60,
      withBreakEvents: true,
      lateMin: 0,
      earlyMin: 0,
    },
    {
      kind: "work",
      status: AttendanceStatus.LATE,
      inH: 8,
      inM: 42,
      outH: 17,
      outM: 12,
      breakM: 60,
      withBreakEvents: true,
      lateMin: 27,
      earlyMin: 0,
    },
    { kind: "rest" },
    { kind: "rest" },
    {
      kind: "work",
      status: AttendanceStatus.PRESENT,
      inH: 8,
      inM: 0,
      outH: 16,
      outM: 55,
      breakM: 60,
      withBreakEvents: false,
      lateMin: 0,
      earlyMin: 5,
    },
    {
      kind: "work",
      status: AttendanceStatus.HALF_DAY,
      inH: 8,
      inM: 5,
      outH: 12,
      outM: 30,
      breakM: 0,
      withBreakEvents: false,
      lateMin: 0,
      earlyMin: 0,
    },
  ];

  for (let di = 0; di < days.length; di += 1) {
    const d = days[di]!;
    const dk = dayKind(d);
    const scen = scenariosByIndex[di]!;

    for (let ei = 0; ei < employees.length; ei += 1) {
      const emp = employees[ei]!;
      let status: AttendanceStatus;
      let clockIn: Date | null = null;
      let clockOut: Date | null = null;
      let breakMinutes = 0;
      let workedMinutes = 0;
      let lateMinutes = 0;
      let earlyMinutes = 0;
      let isLate = false;
      let isEarlyDeparture = false;
      let withBreakEvents = false;

      if (dk === "weekend") {
        status = AttendanceStatus.REST_DAY;
      } else if (scen.kind === "rest") {
        status = AttendanceStatus.ABSENT;
      } else {
        const rot = (ei + di) % 5;
        if (rot === 0) {
          status = AttendanceStatus.ON_LEAVE;
        } else if (rot === 1) {
          status = AttendanceStatus.HALF_DAY;
          clockIn = atTime(d, 8, 10);
          clockOut = atTime(d, 12, 15);
          workedMinutes = 245;
          breakMinutes = 0;
        } else {
          status = scen.status;
          clockIn = atTime(d, scen.inH, scen.inM);
          clockOut = atTime(d, scen.outH, scen.outM);
          breakMinutes = scen.breakM;
          lateMinutes = scen.lateMin;
          earlyMinutes = scen.earlyMin;
          isLate = scen.lateMin > 0;
          isEarlyDeparture = scen.earlyMin > 0;
          withBreakEvents = scen.withBreakEvents;
          const gross =
            (clockOut.getTime() - clockIn.getTime()) / 60000 - breakMinutes;
          workedMinutes = Math.max(0, Math.round(gross));
        }
      }

      const record = await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: { employeeId: emp.id, date: d },
        },
        create: {
          companyId: company.id,
          employeeId: emp.id,
          siteId: emp.siteId,
          date: d,
          status,
          clockIn,
          clockOut,
          breakMinutes,
          workedMinutes,
          overtimeMinutes: 0,
          lateMinutes,
          earlyMinutes,
          isLate,
          isEarlyDeparture,
          isManualEntry: false,
          notes:
            status === AttendanceStatus.ON_LEAVE
              ? "Congé enregistré (données de démo)"
              : null,
        },
        update: {
          siteId: emp.siteId,
          status,
          clockIn,
          clockOut,
          breakMinutes,
          workedMinutes,
          overtimeMinutes: 0,
          lateMinutes,
          earlyMinutes,
          isLate,
          isEarlyDeparture,
          isManualEntry: false,
        },
      });

      await prisma.attendanceEvent.deleteMany({ where: { recordId: record.id } });

      if (clockIn && clockOut) {
        const lat = emp.siteId === sitePlateau.id ? 5.3364 : 5.311;
        const lng = emp.siteId === sitePlateau.id ? -4.0267 : -4.0988;
        const events: {
          recordId: string;
          employeeId: string;
          type: EventType;
          timestamp: Date;
          latitude: number;
          longitude: number;
          deviceInfo: string;
          source: EventSource;
        }[] = [
          {
            recordId: record.id,
            employeeId: emp.id,
            type: EventType.CLOCK_IN,
            timestamp: clockIn,
            latitude: lat,
            longitude: lng,
            deviceInfo: "OControle Mobile / Android 14",
            source: EventSource.MOBILE_WEB,
          },
        ];

        if (withBreakEvents) {
          const bStart = new Date(clockIn.getTime() + 3.5 * 60 * 60 * 1000);
          const bEnd = new Date(bStart.getTime() + breakMinutes * 60 * 1000);
          events.push({
            recordId: record.id,
            employeeId: emp.id,
            type: EventType.BREAK_START,
            timestamp: bStart,
            latitude: lat,
            longitude: lng,
            deviceInfo: "OControle Mobile / Android 14",
            source: EventSource.MOBILE_WEB,
          });
          events.push({
            recordId: record.id,
            employeeId: emp.id,
            type: EventType.BREAK_END,
            timestamp: bEnd,
            latitude: lat,
            longitude: lng,
            deviceInfo: "OControle Mobile / Android 14",
            source: EventSource.MOBILE_WEB,
          });
        }

        events.push({
          recordId: record.id,
          employeeId: emp.id,
          type: EventType.CLOCK_OUT,
          timestamp: clockOut,
          latitude: lat,
          longitude: lng,
          deviceInfo: "OControle Mobile / Android 14",
          source: EventSource.MOBILE_WEB,
        });

        await prisma.attendanceEvent.createMany({ data: events });
      }
    }
  }
  console.log("  Présences et événements de pointage générés.");

  console.log("Seed terminé avec succès.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Échec du seed :", e);
    await prisma.$disconnect();
    process.exit(1);
  });
