"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Clock, LogOut } from "lucide-react";

import { DASHBOARD_NAV } from "@/config/navigation";

import { cn } from "@/lib/utils";

import { useTenant, useHasPermission } from "@/hooks/use-tenant";

import { Button } from "@/components/ui/button";

import { logoutAction } from "@/app/(auth)/actions";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietaire",
  admin: "Administrateur",
  manager: "Responsable",
  hr: "Gestionnaire RH",
  employee: "Employe",
};

function MobileNavItem({
  href,
  icon: Icon,
  title,
  badge,
  permission,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  permission?: string;
  isActive: boolean;
}) {
  const hasPermission = useHasPermission(permission || "");
  if (permission && !hasPermission) return null;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
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

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const tenant = useTenant();

  const initials = tenant.user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = ROLE_LABELS[tenant.role] ?? tenant.role;

  async function handleLogout() {
    await logoutAction();
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Clock className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight">OControle</span>
          <span className="max-w-[160px] truncate text-[10px] text-muted-foreground">
            {tenant.company.name}
          </span>
        </div>
      </div>

      {/* Navigation - min-h-0 ensures flex child scrolls properly */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <nav className="space-y-5">
          {DASHBOARD_NAV.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));

                  return (
                    <MobileNavItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      title={item.title}
                      badge={item.badge}
                      permission={item.permission}
                      isActive={isActive}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User info + Logout - always visible at bottom */}
      <div className="shrink-0 border-t bg-background p-3">
        <div className="mb-2.5 flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{tenant.user.fullName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <form action={handleLogout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl text-sm text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Se deconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
