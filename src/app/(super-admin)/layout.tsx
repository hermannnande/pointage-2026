import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin, getSuperAdminUser } from "@/services/super-admin.service";
import { SidebarNav, MobileNav } from "./super-admin/_components/sidebar-nav";
import { Shield, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const authorized = await isSuperAdmin(user.id);
  if (!authorized) redirect("/dashboard");

  const adminUser = await getSuperAdminUser(user.id);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sidebar — sombre en permanence pour marquer l'espace super-admin */}
      <aside className="hidden w-[264px] flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950 lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">OControle</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-400">
              Super Admin
            </p>
          </div>
        </div>

        <SidebarNav />

        <div className="border-t border-slate-800/80 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-xs font-bold text-red-400 ring-1 ring-red-500/30">
              {adminUser?.fullName?.charAt(0) ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{adminUser?.fullName}</p>
              <p className="truncate text-[10px] text-slate-500">{adminUser?.email}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="mt-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Retour au dashboard
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header mobile */}
        <header className="flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Super Admin</span>
          <div className="flex-1" />
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white">
            ← Dashboard
          </Link>
        </header>

        <MobileNav />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
