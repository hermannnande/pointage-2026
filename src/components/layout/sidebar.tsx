"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Clock, LogOut } from "lucide-react";

import { DASHBOARD_NAV } from "@/config/navigation";

import { cn } from "@/lib/utils";

import { useTenant, useHasPermission } from "@/hooks/use-tenant";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { logoutAction } from "@/app/(auth)/actions";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Responsable",
  hr: "Gestionnaire RH",
  employee: "Employé",
};

function NavItemLink({
  href,
  icon: Icon,
  title,
  badge,
  permission,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  permission?: string;
}) {
  const pathname = usePathname();
  const hasPermission = useHasPermission(permission || "");

  if (permission && !hasPermission) return null;

  const isActive =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        isActive
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")} />
      {title}
      {badge && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const tenant = useTenant();
  const router = useRouter();

  async function handleLogout() {
    await logoutAction();
    router.refresh();
  }

  const initials = tenant.user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = ROLE_LABELS[tenant.role] ?? tenant.role;

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Clock className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
            OControle
          </span>
          <span className="max-w-[140px] truncate text-[10px] text-muted-foreground">
            {tenant.company.name}
          </span>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav data-tour="sidebar-nav" className="space-y-6">
          {DASHBOARD_NAV.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItemLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    title={item.title}
                    badge={item.badge}
                    permission={item.permission}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User */}
      <div className="border-t p-3">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{tenant.user.fullName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <Separator className="mb-2" />
        <form action={handleLogout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl text-sm text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </form>
      </div>
    </aside>
  );
}
