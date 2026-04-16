"use client";

import Link from "next/link";

import { Bell, Clock, Menu, Search } from "lucide-react";

import { useTenant } from "@/hooks/use-tenant";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MobileNav } from "@/components/layout/mobile-nav";

interface DashboardHeaderProps {
  companyName?: string;
}

export function DashboardHeader({ companyName }: DashboardHeaderProps) {
  const tenant = useTenant();
  const displayName = companyName || tenant.company.name;

  const initials = tenant.user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-md sm:px-6">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="shrink-0 lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          }
        />
        <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <MobileNav />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2.5 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Clock className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="max-w-[140px] truncate text-sm font-bold">{displayName}</span>
      </div>

      <div className="hidden flex-1 md:block">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un employé, un lieu..."
            className="rounded-xl border-0 bg-muted/50 pl-9"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Link href="/dashboard/notifications">
          <Button variant="ghost" size="icon" className="relative rounded-xl">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="sr-only">Notifications</span>
          </Button>
        </Link>

        <Button variant="ghost" size="icon" className="rounded-full">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
        </Button>
      </div>
    </header>
  );
}
