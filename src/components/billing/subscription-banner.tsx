"use client";

import Link from "next/link";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SubscriptionBannerProps {
  status: string;
  message: string;
  daysRemaining: number;
}

export function SubscriptionBanner({ status, message, daysRemaining }: SubscriptionBannerProps) {
  if (status === "ACTIVE") return null;

  const config: Record<string, { icon: typeof Clock; bg: string; text: string; border: string }> = {
    TRIALING: { icon: Clock, bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-800 dark:text-blue-200", border: "border-blue-200 dark:border-blue-900" },
    PAST_DUE: { icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-800 dark:text-red-200", border: "border-red-200 dark:border-red-900" },
    GRACE_PERIOD: { icon: AlertTriangle, bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-800 dark:text-amber-200", border: "border-amber-200 dark:border-amber-900" },
    EXPIRED: { icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-800 dark:text-red-200", border: "border-red-200 dark:border-red-900" },
    CANCELLED: { icon: CreditCard, bg: "bg-gray-50 dark:bg-gray-900/30", text: "text-gray-800 dark:text-gray-200", border: "border-gray-200 dark:border-gray-800" },
  };

  const c = config[status] ?? config.CANCELLED;
  const Icon = c.icon;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 text-sm font-medium">{message}</span>
      {(status === "TRIALING" || status === "PAST_DUE" || status === "GRACE_PERIOD") && (
        <Button size="sm" variant="outline" className="shrink-0" asChild>
          <Link href="/dashboard/billing">
            {status === "TRIALING" ? "Choisir un plan" : "Payer maintenant"}
          </Link>
        </Button>
      )}
    </div>
  );
}
