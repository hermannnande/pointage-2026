"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Clock, Menu, X, ArrowRight, ChevronDown, LogIn, UserPlus, KeyRound, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Fonctionnalités" },
  { href: "/pricing", label: "Tarifs" },
  { href: "#testimonials", label: "Témoignages" },
  { href: "#faq", label: "FAQ" },
];

const menuItems = [
  { label: "Espace Administrateur", type: "heading" as const },
  { href: "/login", label: "Se connecter", icon: LogIn, color: "text-primary", type: "link" as const },
  { href: "/signup", label: "Créer un compte", icon: UserPlus, color: "text-emerald-600", type: "link" as const },
  { type: "separator" as const },
  { label: "Espace Employé", type: "heading" as const },
  { href: "/employe", label: "Connexion employé", icon: Users, color: "text-violet-600", type: "link" as const },
  { type: "separator" as const },
  { href: "/forgot-password", label: "Mot de passe oublié", icon: KeyRound, color: "text-muted-foreground", type: "link" as const },
];

function ConnexionMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <LogIn className="h-4 w-4 text-primary" />
        Connexion
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 animate-in fade-in-0 zoom-in-95 rounded-xl border bg-popover p-1.5 shadow-xl ring-1 ring-foreground/5">
          {menuItems.map((item, i) => {
            if (item.type === "heading") {
              return (
                <p key={i} className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-1">
                  {item.label}
                </p>
              );
            }
            if (item.type === "separator") {
              return <div key={i} className="my-1.5 h-px bg-border/60" />;
            }
            const Icon = item.icon!;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(item.href!);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className={cn("h-4 w-4", item.color)} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b bg-background/90 shadow-sm backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-18 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">OControle</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ConnexionMenu />
          <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20" asChild>
            <Link href="/signup">
              Essai gratuit
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t bg-background transition-all duration-300 md:hidden",
          mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 border-t-0 opacity-0",
        )}
      >
        <div className="space-y-1 px-4 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t pt-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administrateur</p>
            <Button variant="outline" size="sm" asChild className="w-full justify-start gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <LogIn className="h-4 w-4 text-primary" />
                Se connecter
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="w-full justify-start gap-2">
              <Link href="/signup" onClick={() => setMobileOpen(false)}>
                <UserPlus className="h-4 w-4 text-emerald-600" />
                Créer un compte
              </Link>
            </Button>
            <p className="mt-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employé</p>
            <Button variant="outline" size="sm" asChild className="w-full justify-start gap-2">
              <Link href="/employe" onClick={() => setMobileOpen(false)}>
                <Users className="h-4 w-4 text-violet-600" />
                Connexion employé
              </Link>
            </Button>
            <div className="mt-2 border-t pt-3">
              <Button size="sm" asChild className="w-full gap-1.5">
                <Link href="/signup" onClick={() => setMobileOpen(false)}>
                  Essai gratuit
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
