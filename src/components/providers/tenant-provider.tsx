"use client";

import type { TenantContext } from "@/types";

import { TenantCtx } from "@/hooks/use-tenant";

interface TenantProviderProps {
  value: TenantContext;
  children: React.ReactNode;
}

export function TenantProvider({ value, children }: TenantProviderProps) {
  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}
