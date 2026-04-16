"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  Coffee,
  Loader2,
  LogIn,
  LogOut,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { clockInOutAction, getTodayRecordAction } from "../actions";
import { getMyEmployeeAction } from "./actions";

import type { EventType } from "@prisma/client";

function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

let cachedPosition: { latitude: number; longitude: number } | null = null;
let geoWatchId: number | null = null;

function startGeoWatch() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  if (geoWatchId !== null) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      cachedPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    },
    () => {},
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
  );

  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      cachedPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    },
    () => {},
    { enableHighAccuracy: false, maximumAge: 60_000 },
  );
}

function stopGeoWatch() {
  if (geoWatchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
}

function getCachedGeo() {
  return cachedPosition;
}

function requestSingleGeoPosition(): Promise<{ data: { latitude: number; longitude: number } | null; errorMsg: string | null }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ data: null, errorMsg: "Localisation non supportée par votre navigateur." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          data: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          errorMsg: null,
        }),
      (err) => {
        let msg = "Erreur inconnue.";
        if (err.code === 1) {
          msg = "Permission refusée. Vous devez autoriser la localisation dans les paramètres de votre navigateur (Chrome/Safari) pour cette page.";
        } else if (err.code === 2) {
          msg = "Position introuvable. Assurez-vous que le GPS est activé sur votre téléphone.";
        } else if (err.code === 3) {
          msg = "Délai d'attente dépassé. Réessayez dans un endroit dégagé.";
        }
        resolve({ data: null, errorMsg: msg });
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 0 },
    );
  });
}

const EVENT_LABELS: Record<EventType, string> = {
  CLOCK_IN: "Entrée",
  CLOCK_OUT: "Sortie",
  BREAK_START: "Début de pause",
  BREAK_END: "Fin de pause",
};

function eventIcon(type: EventType) {
  switch (type) {
    case "CLOCK_IN":
      return LogIn;
    case "CLOCK_OUT":
      return LogOut;
    case "BREAK_START":
      return Coffee;
    case "BREAK_END":
      return Play;
    default:
      return Clock;
  }
}

type TodayRecord = NonNullable<
  Awaited<ReturnType<typeof getTodayRecordAction>>
>;

type LoadingAction = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | null;

export default function EmployeeClockPage() {
  const [now, setNow] = useState(() => new Date());
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [recordLoading, setRecordLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [record, setRecord] = useState<TodayRecord | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);

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
      setEmployeeLoading(true);
      try {
        const emp = await getMyEmployeeAction();
        if (!cancelled) {
          setEmployeeId(emp?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger votre profil employé");
          setEmployeeId(null);
        }
      } finally {
        if (!cancelled) setEmployeeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRecord = useCallback(async () => {
    if (!employeeId) {
      setRecord(null);
      setRecordLoading(false);
      return;
    }
    setRecordLoading(true);
    try {
      const data = await getTodayRecordAction(employeeId);
      setRecord(data);
    } catch {
      toast.error("Impossible de charger le pointage du jour");
      setRecord(null);
    } finally {
      setRecordLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  const openBreak = useMemo(
    () => record?.breaks?.find((b) => !b.endTime) ?? null,
    [record],
  );

  const sortedEvents = useMemo(() => {
    const ev = record?.events ?? [];
    return [...ev].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [record?.events]);

  const statusUi = useMemo(() => {
    if (!record?.clockIn) {
      return {
        label: "Non pointé",
        detail: "Vous n'avez pas encore pointé aujourd'hui.",
        Icon: Clock,
        iconClass: "text-muted-foreground",
      };
    }
    if (record.clockOut) {
      return {
        label: "Journée terminée",
        detail: `Sortie à ${fmtTime(record.clockOut)}`,
        Icon: CheckCircle,
        iconClass: "text-blue-600 dark:text-blue-400",
      };
    }
    if (openBreak) {
      return {
        label: "En pause",
        detail: `En pause depuis ${fmtTime(openBreak.startTime)}`,
        Icon: Pause,
        iconClass: "text-amber-600 dark:text-amber-400",
      };
    }
    return {
      label: "En service",
      detail: `En service depuis ${fmtTime(record.clockIn)}`,
      Icon: Play,
      iconClass: "text-green-600 dark:text-green-400",
    };
  }, [record, openBreak]);

  async function runClock(type: EventType) {
    if (!employeeId) return;
    setLoadingAction(type);
    try {
      let geo = getCachedGeo();
      if (!geo) {
        const res = await requestSingleGeoPosition();
        if (res.data) {
          geo = res.data;
          cachedPosition = geo;
          startGeoWatch();
        } else {
          toast.error(res.errorMsg || "Localisation obligatoire.");
          return;
        }
      }
      if (!geo) {
        toast.error(
          "Localisation obligatoire: activez la géolocalisation puis réessayez.",
        );
        return;
      }
      const res = await clockInOutAction({
        employeeId,
        type,
        latitude: geo.latitude,
        longitude: geo.longitude,
        source: "WEB",
      });
      if (!res.success) {
        toast.error(res.error ?? "Action impossible");
        return;
      }
      toast.success(
        type === "CLOCK_IN"
          ? "Entrée enregistrée"
          : type === "CLOCK_OUT"
            ? "Sortie enregistrée"
            : type === "BREAK_START"
              ? "Pause commencée"
              : "Pause terminée",
      );
      await loadRecord();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de pointage");
    } finally {
      setLoadingAction(null);
    }
  }

  const dateLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const StatusIcon = statusUi.Icon;

  if (employeeLoading) {
    return (
      <>
        <PageHeader
          title="Mon pointage"
          description="Pointez votre entrée, sortie et pauses"
        />
        <Skeleton className="mx-auto h-80 max-w-md rounded-xl" />
      </>
    );
  }

  if (!employeeId) {
    return (
      <>
        <PageHeader
          title="Mon pointage"
          description="Pointez votre entrée, sortie et pauses"
        />
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Profil non lié</CardTitle>
            <CardDescription>
              Aucun profil employé actif n'est associé à votre compte. Contactez
              un administrateur pour lier votre utilisateur à une fiche employé.
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Mon pointage"
        description="Pointez votre entrée, sortie et pauses"
      />

      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div
            className={cn(
              "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted",
            )}
          >
            <StatusIcon className={cn("h-10 w-10", statusUi.iconClass)} />
          </div>
          <CardTitle className="text-xl">{statusUi.label}</CardTitle>
          <CardDescription>{statusUi.detail}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="text-center">
            <p className="font-mono text-3xl font-semibold tracking-tight">
              {timeLabel}
            </p>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {dateLabel}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {!record?.clockIn && (
              <Button
                size="lg"
                className="w-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                disabled={recordLoading || loadingAction !== null}
                onClick={() => void runClock("CLOCK_IN")}
              >
                {loadingAction === "CLOCK_IN" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Pointer mon entrée
              </Button>
            )}

            {record?.clockIn && !record.clockOut && !openBreak && (
              <>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/40"
                  disabled={recordLoading || loadingAction !== null}
                  onClick={() => void runClock("BREAK_START")}
                >
                  {loadingAction === "BREAK_START" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Début de pause
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full"
                  disabled={recordLoading || loadingAction !== null}
                  onClick={() => void runClock("CLOCK_OUT")}
                >
                  {loadingAction === "CLOCK_OUT" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Pointer ma sortie
                </Button>
              </>
            )}

            {record?.clockIn && !record.clockOut && openBreak && (
              <Button
                size="lg"
                className="w-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                disabled={recordLoading || loadingAction !== null}
                onClick={() => void runClock("BREAK_END")}
              >
                {loadingAction === "BREAK_END" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Fin de pause
              </Button>
            )}

            {record?.clockOut && (
              <Button size="lg" className="w-full" disabled>
                <CheckCircle className="h-4 w-4" />
                Journée terminée
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="mx-auto mt-10 max-w-md">
        <h2 className="mb-4 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Fil du jour
        </h2>
        {recordLoading && !record ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : sortedEvents.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Aucun événement pour le moment.
          </p>
        ) : (
          <ul className="relative space-y-0 border-l border-border pl-6">
            {sortedEvents.map((ev) => {
              const Icon = eventIcon(ev.type);
              return (
                <li key={ev.id} className="relative pb-6 last:pb-0">
                  <span className="absolute -left-[25px] flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {fmtTime(ev.timestamp)}
                    </span>
                    <Badge variant="outline">{EVENT_LABELS[ev.type]}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
