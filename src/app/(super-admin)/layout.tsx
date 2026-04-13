import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin, getSuperAdminUser } from "@/services/super-admin.service";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  FlaskConical,
  Activity,
  ScrollText,
  Shield,
  LogOut,
  UsersRound,
} from "lucide-react";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/companies", label: "Entreprises", icon: Building2 },
  { href: "/super-admin/employees", label: "Employés", icon: Users },
  { href: "/super-admin/subscriptions", label: "Abonnements", icon: CreditCard },
  { href: "/super-admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/super-admin/trials", label: "Essais gratuits", icon: FlaskConical },
  { href: "/super-admin/activity", label: "Activité", icon: Activity },
  { href: "/super-admin/logs", label: "Journaux", icon: ScrollText },
  { href: "/super-admin/team", label: "Équipe Admin", icon: UsersRound },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const authorized = await isSuperAdmin(user.id);
  if (!authorized) redirect("/dashboard");

  const adminUser = await getSuperAdminUser(user.id);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
          <Shield className="h-6 w-6 text-red-600" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">OControle</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-red-600">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700 dark:bg-red-900/50 dark:text-red-300">
              {adminUser?.fullName?.charAt(0) ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-900 dark:text-white">{adminUser?.fullName}</p>
              <p className="truncate text-[10px] text-slate-500">{adminUser?.email}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="mt-3 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <LogOut className="h-3 w-3" />
            Retour au dashboard
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <Shield className="h-5 w-5 text-red-600" />
          <span className="text-sm font-bold">Super Admin</span>
          <div className="flex-1" />
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
