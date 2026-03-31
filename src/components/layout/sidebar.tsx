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
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
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

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Clock className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
            PointSync
          </span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {tenant.company.name}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {DASHBOARD_NAV.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

      <div className="border-t p-3">
        <div className="mb-3 flex items-center gap-3 px-3 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">{tenant.user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{tenant.role === "owner" ? "Propriétaire" : tenant.role}</p>
          </div>
        </div>
        <Separator className="mb-2" />
        <form action={handleLogout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-sm text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </form>
      </div>
    </aside>
  );
}
