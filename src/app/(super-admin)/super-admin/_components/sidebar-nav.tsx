"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  FlaskConical,
  Activity,
  ScrollText,
  UsersRound,
  Stethoscope,
  Sparkles,
  Smartphone,
  UserPlus,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isNew?: boolean;
};

type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/super-admin", label: "Vue d'ensemble", icon: LayoutDashboard },
      { href: "/super-admin/usage", label: "Utilisation", icon: Sparkles },
      { href: "/super-admin/activity", label: "Activité", icon: Activity },
    ],
  },
  {
    title: "Croissance",
    items: [
      { href: "/super-admin/signups", label: "Inscriptions & blocages", icon: UserPlus, isNew: true },
      { href: "/super-admin/companies", label: "Entreprises", icon: Building2 },
      { href: "/super-admin/employees", label: "Employés", icon: Users },
      { href: "/super-admin/trials", label: "Essais gratuits", icon: FlaskConical },
      { href: "/super-admin/mobile-app", label: "App mobile", icon: Smartphone },
      { href: "/super-admin/whatsapp", label: "Messages WhatsApp", icon: MessageCircle, isNew: true },
    ],
  },
  {
    title: "Revenus",
    items: [
      { href: "/super-admin/payments", label: "Analyse paiements", icon: AlertTriangle, isNew: true },
      { href: "/super-admin/transactions", label: "Transactions", icon: Receipt },
      { href: "/super-admin/subscriptions", label: "Abonnements", icon: CreditCard },
      { href: "/super-admin/billing-debug", label: "Diagnostic Chariow", icon: Stethoscope },
    ],
  },
  {
    title: "Système",
    items: [
      { href: "/super-admin/logs", label: "Journaux", icon: ScrollText },
      { href: "/super-admin/team", label: "Équipe Admin", icon: UsersRound },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/super-admin") return pathname === "/super-admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                    active
                      ? "bg-red-500/10 text-red-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-red-400" : "text-slate-500 group-hover:text-slate-300",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.isNew && (
                    <span className="ml-auto rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-400">
                      New
                    </span>
                  )}
                  {active && !item.isNew && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV_GROUPS.flatMap((g) => g.items);

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 px-2 py-1.5 lg:hidden">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-red-500/10 text-red-400" : "text-slate-400 hover:bg-white/5",
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
