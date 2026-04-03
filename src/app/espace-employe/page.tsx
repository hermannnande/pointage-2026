"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Clock,
  Coffee,
  History,
  Loader2,
  LogIn,
  LogOut,
  Pause,
  Play,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  getEmployeeSession,
  employeeClockAction,
  getEmployeeTodayAction,
  getEmployeeRecentHistoryAction,
} from "./actions";
import { employeeLogoutAction } from "../employe/actions";

import type { EmployeeSessionPayload } from "@/lib/employee-auth";
import type { EventType, AttendanceStatus } from "@prisma/client";

function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGeoPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  });
}

const STATUS_LABELS: Record<AttendanceStatus, { label: string; color: string }> = {
  PRESENT: { label: "Présent", color: "bg-green-100 text-green-700" },
  ABSENT: { label: "Absent", color: "bg-red-100 text-red-700" },
  LATE: { label: "En retard", color: "bg-amber-100 text-amber-700" },
  EARLY_DEPARTURE: { label: "Départ anticipé", color: "bg-orange-100 text-orange-700" },
  HALF_DAY: { label: "Demi-journée", color: "bg-blue-100 text-blue-700" },
  ON_LEAVE: { label: "En congé", color: "bg-purple-100 text-purple-700" },
  HOLIDAY: { label: "Jour férié", color: "bg-indigo-100 text-indigo-700" },
  REST_DAY: { label: "Repos", color: "bg-slate-100 text-slate-700" },
};

type TodayRecord = NonNullable<Awaited<ReturnType<typeof getEmployeeTodayAction>>>;
type HistoryRecord = Awaited<ReturnType<typeof getEmployeeRecentHistoryAction>>[number];
type LoadingAction = EventType | null;

export default function EmployeeSpacePage() {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [session, setSession] = useState<EmployeeSessionPayload | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [record, setRecord] = useState<TodayRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getEmployeeSession();
        if (!cancelled) {
          if (!s) {
            router.replace("/employe");
            return;
          }
          setSession(s);
        }
      } catch {
        if (!cancelled) router.replace("/employe");
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const loadRecord = useCallback(async () => {
    setRecordLoading(true);
    try {
      const [data, hist] = await Promise.all([
        getEmployeeTodayAction(),
        getEmployeeRecentHistoryAction(),
      ]);
      setRecord(data);
      setHistory(hist);
    } catch {
      toast.error("Impossible de charger vos données");
    } finally {
      setRecordLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) void loadRecord();
  }, [session, loadRecord]);

  const openBreak = useMemo(
    () => record?.breaks?.find((b) => !b.endTime) ?? null,
    [record],
  );

  const statusUi = useMemo(() => {
    if (!record?.clockIn) {
      return {
        label: "Pas encore pointé",
        detail: "Appuyez sur le bouton pour pointer votre arrivée.",
        Icon: Clock,
        iconClass: "text-muted-foreground",
        bgClass: "bg-slate-100",
      };
    }
    if (record.clockOut) {
      return {
        label: "Journée terminée",
        detail: `Sortie enregistrée à ${fmtTime(record.clockOut)}`,
        Icon: CheckCircle,
        iconClass: "text-blue-600",
        bgClass: "bg-blue-50",
      };
    }
    if (openBreak) {
      return {
        label: "En pause",
        detail: `Pause depuis ${fmtTime(openBreak.startTime)}`,
        Icon: Pause,
        iconClass: "text-amber-600",
        bgClass: "bg-amber-50",
      };
    }
    return {
      label: "En service",
      detail: `Depuis ${fmtTime(record.clockIn)}`,
      Icon: Play,
      iconClass: "text-green-600",
      bgClass: "bg-green-50",
    };
  }, [record, openBreak]);

  async function runClock(type: EventType) {
    setLoadingAction(type);
    try {
      const geo = await getGeoPosition();
      const res = await employeeClockAction({
        type,
        latitude: geo?.latitude,
        longitude: geo?.longitude,
      });
      if (!res.success) {
        toast.error(res.error ?? "Action impossible");
        return;
      }
      toast.success(
        type === "CLOCK_IN"
          ? "Entrée enregistrée !"
          : type === "CLOCK_OUT"
            ? "Sortie enregistrée !"
            : type === "BREAK_START"
              ? "Pause commencée"
              : "Pause terminée",
      );
      await loadRecord();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await employeeLogoutAction();
    router.replace("/employe");
  }

  const timeLabel = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (sessionLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!session) return null;

  const StatusIcon = statusUi.Icon;

  return (
    <div className="space-y-5">
      {/* Welcome card */}
      <Card className="overflow-hidden rounded-2xl border-0 shadow-md">
        <div className="bg-primary px-5 py-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {session.firstName[0]}
                {session.lastName[0]}
              </div>
              <div>
                <p className="font-semibold">
                  {session.firstName} {session.lastName}
                </p>
                <p className="text-xs text-white/70">
                  {session.siteName} · {session.matricule}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Clock + Status */}
      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="flex flex-col items-center gap-5 p-6">
          <div className="text-center">
            <p className="font-mono text-4xl font-bold tracking-tight">
              {timeLabel}
            </p>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {dateLabel}
            </p>
          </div>

          <div className={cn("flex items-center gap-3 rounded-xl px-4 py-3", statusUi.bgClass)}>
            <StatusIcon className={cn("h-6 w-6", statusUi.iconClass)} />
            <div>
              <p className="font-semibold">{statusUi.label}</p>
              <p className="text-xs text-muted-foreground">{statusUi.detail}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex w-full flex-col gap-3">
            {!record?.clockIn && (
              <Button
                size="lg"
                className="h-14 w-full gap-3 rounded-xl bg-green-600 text-lg font-semibold text-white shadow-lg hover:bg-green-700"
                disabled={recordLoading || loadingAction !== null}
                onClick={() => void runClock("CLOCK_IN")}
              >
                {loadingAction === "CLOCK_IN" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                Pointer mon arrivée
              </Button>
            )}

            {record?.clockIn && !record.clockOut && !openBreak && (
              <>
                <Button
                  size="lg"
                  className="h-14 w-full gap-3 rounded-xl bg-amber-500 text-lg font-semibold text-white shadow-lg hover:bg-amber-600"
                  disabled={recordLoading || loadingAction !== null}
                  onClick={() => void runClock("BREAK_START")}
                >
                  {loadingAction === "BREAK_START" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Coffee className="h-5 w-5" />
                  )}
                  Prendre une pause
                </Button>
                <Button
                  size="lg"
                  className="h-14 w-full gap-3 rounded-xl bg-red-600 text-lg font-semibold text-white shadow-lg hover:bg-red-700"
                  disabled={recordLoading || loadingAction !== null}
                  onClick={() => void runClock("CLOCK_OUT")}
                >
                  {loadingAction === "CLOCK_OUT" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                  Pointer ma sortie
                </Button>
              </>
            )}

            {record?.clockIn && !record.clockOut && openBreak && (
              <Button
                size="lg"
                className="h-14 w-full gap-3 rounded-xl bg-green-600 text-lg font-semibold text-white shadow-lg hover:bg-green-700"
                disabled={recordLoading || loadingAction !== null}
                onClick={() => void runClock("BREAK_END")}
              >
                {loadingAction === "BREAK_END" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Reprendre le travail
              </Button>
            )}

            {record?.clockOut && (
              <div className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-blue-50 text-blue-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Journée terminée — Bonne soirée !</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent history */}
      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-muted-foreground" />
            Mes 7 derniers jours
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {recordLoading && history.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun pointage récent.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => {
                const s = STATUS_LABELS[h.status] ?? { label: h.status, color: "bg-slate-100 text-slate-700" };
                const dateStr = new Date(h.date).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                const hours = h.workedMinutes
                  ? `${Math.floor(h.workedMinutes / 60)}h${String(h.workedMinutes % 60).padStart(2, "0")}`
                  : "—";

                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium capitalize">{dateStr}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtTime(h.clockIn)} → {fmtTime(h.clockOut)}
                          {h.isLate && h.lateMinutes ? ` · ${h.lateMinutes} min retard` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {hours}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", s.color)}
                      >
                        {s.label}
                      </Badge>
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
