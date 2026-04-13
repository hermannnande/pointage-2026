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
  MessageCircle,
  HelpCircle,
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
  getEmployeeSiteScheduleAction,
  checkEmployeeCompanySubscriptionAction,
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

let cachedPosition: { latitude: number; longitude: number; accuracy: number } | null = null;
let geoWatchId: number | null = null;

function startGeoWatch() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  if (geoWatchId !== null) return;

  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!cachedPosition || pos.coords.accuracy < cachedPosition.accuracy) {
        cachedPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      }
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 10_000 },
  );
}

function stopGeoWatch() {
  if (geoWatchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
}

function getGeoSample(timeoutMs: number): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

async function verifyWithGoogle(
  lat: number,
  lng: number,
): Promise<boolean> {
  try {
    const resp = await fetch(
      `/api/geocode?mode=reverse&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
    if (!resp.ok) return false;
    const data = await resp.json();
    return !!data.display && data.provider === "google";
  } catch {
    return false;
  }
}

async function requestGoogleGeoPosition(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const samples: GeolocationPosition[] = [];

  for (let i = 0; i < 3; i += 1) {
    const sample = await getGeoSample(i === 0 ? 12_000 : 8_000);
    if (sample) {
      samples.push(sample);
      if (sample.coords.accuracy <= 50) break;
    }
    if (i < 2) await new Promise((r) => setTimeout(r, 800));
  }

  if (cachedPosition && (samples.length === 0 || cachedPosition.accuracy < (samples[0]?.coords.accuracy ?? Infinity))) {
    samples.push({
      coords: {
        latitude: cachedPosition.latitude,
        longitude: cachedPosition.longitude,
        accuracy: cachedPosition.accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
  }

  if (samples.length === 0) return null;

  const best = samples.reduce((prev, curr) =>
    curr.coords.accuracy < prev.coords.accuracy ? curr : prev,
  );

  const lat = best.coords.latitude;
  const lng = best.coords.longitude;

  await verifyWithGoogle(lat, lng);

  return { latitude: lat, longitude: lng };
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

  const [workEndTime, setWorkEndTime] = useState<string | null>(null);
  const [subBlocked, setSubBlocked] = useState(false);
  const [subBlockedMsg, setSubBlockedMsg] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    startGeoWatch();
    return () => stopGeoWatch();
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

          const subCheck = await checkEmployeeCompanySubscriptionAction();
          if (!cancelled && subCheck && !subCheck.isAccessible) {
            setSubBlocked(true);
            setSubBlockedMsg(subCheck.message);
          }
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
      const [data, hist, schedule] = await Promise.all([
        getEmployeeTodayAction(),
        getEmployeeRecentHistoryAction(),
        getEmployeeSiteScheduleAction(),
      ]);
      setRecord(data);
      setHistory(hist);
      setWorkEndTime(schedule?.workEndTime ?? null);
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

  const isWorkDayOver = useMemo(() => {
    if (!workEndTime) return true;
    const [hStr, mStr] = workEndTime.split(":");
    const endMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return nowMin >= endMin;
  }, [workEndTime, now]);

  const canReClock = useMemo(
    () => !!record?.clockIn && !!record?.clockOut && !isWorkDayOver,
    [record, isWorkDayOver],
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
      if (canReClock) {
        return {
          label: "Sortie enregistrée",
          detail: `Sortie à ${fmtTime(record.clockOut)} — Vous pouvez reprendre.`,
          Icon: LogIn,
          iconClass: "text-amber-600",
          bgClass: "bg-amber-50",
        };
      }
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
      const geo = await requestGoogleGeoPosition();

      if (!geo) {
        toast.error(
          "Impossible de vous localiser via Google Maps. Activez le GPS puis réessayez.",
        );
        return;
      }

      const res = await employeeClockAction({
        type,
        latitude: geo.latitude,
        longitude: geo.longitude,
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

  if (subBlocked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <LogOut className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Accès suspendu</h2>
            <p className="text-sm text-slate-500">
              {subBlockedMsg}
            </p>
            <div className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Le pointage est temporairement indisponible. Votre administrateur doit renouveler l&apos;abonnement pour rétablir l&apos;accès.
            </div>
            <Button variant="outline" className="mt-4" onClick={() => void handleLogout()}>
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

            {record?.clockOut && canReClock && (
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
                Reprendre mon service
              </Button>
            )}

            {record?.clockOut && !canReClock && (
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

      {/* Help section */}
      <div className="flex flex-col items-center justify-center gap-2 pt-2 pb-6 text-center">
        <p className="text-sm text-muted-foreground">
          Un problème avec l&apos;application ?
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
            <a
              href="https://wa.me/2250778030075?text=Bonjour,%20j'ai%20besoin%20d'aide%20sur%20l'espace%20employé%20OControle."
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              Support WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
            <a
              href="mailto:contact@ocontrole.com"
            >
              <HelpCircle className="h-4 w-4" />
              Centre d&apos;aide
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
