"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Building2, CreditCard, Shield, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { getRecentActivityAction } from "../actions";

type ActivityItem = Awaited<ReturnType<typeof getRecentActivityAction>>[number];

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Activity; cls: string }> = {
  new_company: { label: "Nouvelle entreprise", icon: Building2, cls: "bg-blue-100 text-blue-700" },
  payment_success: { label: "Paiement réussi", icon: CreditCard, cls: "bg-green-100 text-green-700" },
  payment_failed: { label: "Paiement échoué", icon: CreditCard, cls: "bg-red-100 text-red-700" },
  payment_initiated: { label: "Paiement initié", icon: CreditCard, cls: "bg-amber-100 text-amber-700" },
  subscription_created: { label: "Abonnement créé", icon: CreditCard, cls: "bg-purple-100 text-purple-700" },
  subscription_cancelled: { label: "Abonnement annulé", icon: CreditCard, cls: "bg-slate-100 text-slate-700" },
  admin_action: { label: "Action admin", icon: Shield, cls: "bg-red-100 text-red-700" },
};

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecentActivityAction(50);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activité plateforme</h1>
          <p className="text-sm text-slate-500">Événements récents sur la plateforme</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-indigo-500" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Aucune activité récente</p>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
              {items.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type] ?? { label: item.type, icon: Activity, cls: "bg-slate-100 text-slate-600" };
                const Icon = cfg.icon;
                return (
                  <div key={i} className="relative flex items-start gap-4 py-3 pl-2">
                    <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.cls}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${cfg.cls}`}>{cfg.label}</Badge>
                        <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleString("fr-FR")}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
