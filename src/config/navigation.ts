import {
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const DASHBOARD_NAV: NavSection[] = [
  {
    title: "Principal",
    items: [
      {
        title: "Tableau de bord",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Pointage en direct",
        href: "/dashboard/attendance",
        icon: Clock,
        permission: "attendance.view",
      },
    ],
  },
  {
    title: "Gestion",
    items: [
      {
        title: "Sites",
        href: "/dashboard/sites",
        icon: Building2,
        permission: "sites.view",
      },
      {
        title: "Employés",
        href: "/dashboard/employees",
        icon: Users,
        permission: "employees.view",
      },
      {
        title: "Planning",
        href: "/dashboard/schedules",
        icon: CalendarDays,
        permission: "schedules.view",
      },
      {
        title: "Congés",
        href: "/dashboard/leaves",
        icon: Calendar,
        permission: "leaves.view",
      },
    ],
  },
  {
    title: "Analyse",
    items: [
      {
        title: "Rapports",
        href: "/dashboard/reports",
        icon: BarChart3,
        permission: "reports.view",
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Facturation",
        href: "/dashboard/billing",
        icon: CreditCard,
        permission: "billing.view",
      },
      {
        title: "Paramètres",
        href: "/dashboard/settings",
        icon: Settings,
        permission: "settings.view",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        title: "Centre d'aide",
        href: "/dashboard/help",
        icon: HelpCircle,
      },
    ],
  },
];
