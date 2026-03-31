"use client";

import { createContext, useContext } from "react";

import type { TenantContext } from "@/types";

export const TenantCtx = createContext<TenantContext | null>(null);

export function useTenant(): TenantContext {
  const ctx = useContext(TenantCtx);
  if (!ctx) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return ctx;
}

export function useHasPermission(permission: string): boolean {
  const ctx = useTenant();
  if (ctx.role === "owner") return true;
  return ctx.permissions.includes(permission as never);
}
