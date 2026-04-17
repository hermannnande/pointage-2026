import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/services/tenant.service";
import { checkSubscriptionStatus } from "@/services/billing.service";
import { TRIAL_DAYS } from "@/lib/constants";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Sidebar } from "@/components/layout/sidebar";
import { SubscriptionBanner } from "@/components/billing/subscription-banner";
import { TenantProvider } from "@/components/providers/tenant-provider";

export const dynamic = "force-dynamic";

type SubStatusResult = Awaited<ReturnType<typeof checkSubscriptionStatus>>;

const DEFAULT_SUB_STATUS: SubStatusResult = {
  isAccessible: true,
  status: "TRIALING",
  daysRemaining: TRIAL_DAYS,
  message: "Essai gratuit en cours",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let tenantContext;
  try {
    tenantContext = await getTenantContext(user.id);
  } catch (err) {
    console.error("Erreur getTenantContext dans dashboard layout:", err);
    redirect("/onboarding");
  }

  if (!tenantContext) {
    redirect("/onboarding");
  }

  if (tenantContext.company.onboardingStep < 3) {
    redirect("/onboarding");
  }

  let subStatus = DEFAULT_SUB_STATUS;
  try {
    subStatus = await checkSubscriptionStatus(tenantContext.companyId);
  } catch (err) {
    console.error("Erreur checkSubscriptionStatus:", err);
  }

  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") ?? "";
  const isBillingPage = pathname.startsWith("/dashboard/billing");

  if (!subStatus.isAccessible && !isBillingPage) {
    redirect("/dashboard/billing");
  }

  return (
    <TenantProvider value={tenantContext}>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader companyName={tenantContext.company.name} />
          <main className="flex-1 overflow-y-auto bg-muted/30">
            {subStatus.status !== "ACTIVE" && (
              <div className="px-4 pt-4 sm:px-6 sm:pt-6">
                <SubscriptionBanner
                  status={subStatus.status}
                  message={subStatus.message}
                  daysRemaining={subStatus.daysRemaining}
                />
              </div>
            )}
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
