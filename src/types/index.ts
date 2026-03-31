import type { PermissionSlug } from "@/config/permissions";

export interface TenantContext {
  userId: string;
  companyId: string;
  membershipId: string;
  role: string;
  isOwner: boolean;
  permissions: PermissionSlug[];
  company: {
    name: string;
    slug: string;
    onboardingStep: number;
    sector: string | null;
    country: string;
    city: string | null;
    timezone: string;
    currency: string;
    email: string | null;
  };
  user: {
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}
