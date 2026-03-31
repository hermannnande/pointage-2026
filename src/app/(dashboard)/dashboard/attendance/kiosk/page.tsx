"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Coffee,
  Delete,
  LogIn,
  LogOut,
  Play,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getSitesForFilterAction, kioskClockAction } from "../actions";

type ClockType = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

type SiteOption = Awaited<ReturnType<typeof getSitesForFilterAction>>[number];

type FeedbackState =
  | { kind: "idle" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const PIN_MAX = 6;
const PIN_MIN = 4;
const INACTIVITY_MS = 10_000;
const FEEDBACK_MS = 3000;

export default function KioskPage() {
  const [now, setNow] = useState(() => new Date());
  const [pin, setPin] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle" });
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSitesLoading(true);
      try {
        const data = await getSitesForFilterAction();
        if (!cancelled) {
          setSites(data);
          if (data.length > 0) {
            setSiteId((prev) => prev || data[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger les sites");
          setSites([]);
        }
      } finally {
        if (!cancelled) setSitesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const schedulePinClear = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      setPin("");
      inactivityTimerRef.current = null;
    }, INACTIVITY_MS);
  }, [clearInactivityTimer]);

  useEffect(() => {
    if (pin.length > 0) {
      schedulePinClear();
    } else {
      clearInactivityTimer();
    }
    return () => clearInactivityTimer();
  }, [pin, schedulePinClear, clearInactivityTimer]);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const showFeedbackThenReset = useCallback(
    (next: FeedbackState) => {
      clearFeedbackTimer();
      setFeedback(next);
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback({ kind: "idle" });
        setPin("");
        feedbackTimerRef.current = null;
      }, FEEDBACK_MS);
    },
    [clearFeedbackTimer],
  );

  useEffect(() => {
    return () => {
      clearInactivityTimer();
      clearFeedbackTimer();
    };
  }, [clearInactivityTimer, clearFeedbackTimer]);

  const appendDigit = (d: string) => {
    if (feedback.kind !== "idle" || submitting) return;
    setPin((p) => (p.length >= PIN_MAX ? p : p + d));
  };

  const backspace = () => {
    if (feedback.kind !== "idle" || submitting) return;
    setPin((p) => p.slice(0, -1));
  };

  const clearPin = () => {
    if (feedback.kind !== "idle" || submitting) return;
    setPin("");
  };

  const handleAction = async (type: ClockType) => {
    if (feedback.kind !== "idle" || submitting) return;
    if (!siteId) {
      toast.error("Veuillez sélectionner un site");
      return;
    }
    if (pin.length < PIN_MIN || pin.length > PIN_MAX) {
      toast.error(`Saisissez un code PIN (${PIN_MIN} à ${PIN_MAX} chiffres)`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await kioskClockAction({ pin, siteId, type });
      if (result.success) {
        showFeedbackThenReset({ kind: "success" });
      } else {
        showFeedbackThenReset({
          kind: "error",
          message: result.error ?? "Pointage refusé",
        });
      }
    } catch (e) {
      showFeedbackThenReset({
        kind: "error",
        message: e instanceof Error ? e.message : "Erreur réseau",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const timeStr = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const keypadRows: (string | "backspace" | "clear")[][] = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "backspace"],
  ];

  return (
    <div className="relative -mx-4 -mt-4 -mb-6 min-h-[calc(100dvh-5rem)] overflow-hidden bg-gray-900 px-4 pb-8 text-white sm:-mx-6 sm:-mt-6 sm:-mb-6 sm:min-h-[calc(100dvh-6rem)] sm:px-6">
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <Select
          value={siteId || undefined}
          onValueChange={(v) => setSiteId(v || "")}
          disabled={sitesLoading || sites.length === 0}
        >
          <SelectTrigger className="w-[min(100vw-2rem,280px)] border-gray-600 bg-gray-800 text-white data-placeholder:text-gray-400">
            <SelectValue placeholder="Choisir un site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mx-auto flex max-w-lg flex-col items-center px-2 pt-16 pb-8 sm:pt-20">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          PointSync
        </h1>

        {feedback.kind === "success" && (
          <div className="mb-10 flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-28 w-28 text-green-500" aria-hidden />
            <p className="text-center text-2xl font-semibold text-green-400">
              Pointage enregistré !
            </p>
          </div>
        )}

        {feedback.kind === "error" && (
          <div className="mb-10 flex flex-col items-center gap-4 py-6">
            <XCircle className="h-28 w-28 text-red-500" aria-hidden />
            <p className="max-w-md text-center text-lg text-red-300">
              {feedback.message}
            </p>
          </div>
        )}

        {feedback.kind === "idle" && (
          <>
            <p
              className="text-6xl font-light font-tabular-nums tracking-tight"
              suppressHydrationWarning
            >
              {timeStr}
            </p>
            <p
              className="mt-2 mb-10 text-center text-lg capitalize text-gray-300"
              suppressHydrationWarning
            >
              {dateStr}
            </p>

            <div
              className="mb-8 flex h-16 min-w-[200px] items-center justify-center rounded-xl border-2 border-gray-600 bg-gray-800/80 px-6 text-3xl tracking-[0.4em]"
              aria-live="polite"
              aria-label="Code PIN masqué"
            >
              {pin.length > 0
                ? "•".repeat(pin.length)
                : "····"}
            </div>

            <div className="mb-10 grid gap-3">
              {keypadRows.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-3">
                  {row.map((key) => {
                    if (key === "backspace") {
                      return (
                        <Button
                          key="bs"
                          type="button"
                          variant="ghost"
                          className="h-16 w-16 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                          onClick={backspace}
                          disabled={submitting}
                          aria-label="Effacer le dernier chiffre"
                        >
                          <Delete className="h-7 w-7" />
                        </Button>
                      );
                    }
                    if (key === "clear") {
                      return (
                        <Button
                          key="clr"
                          type="button"
                          variant="ghost"
                          className="h-16 min-w-16 rounded-full bg-gray-800 px-4 text-lg text-white hover:bg-gray-700"
                          onClick={clearPin}
                          disabled={submitting}
                        >
                          Effacer
                        </Button>
                      );
                    }
                    return (
                      <Button
                        key={key}
                        type="button"
                        variant="ghost"
                        className="h-16 w-16 rounded-full bg-gray-800 text-2xl text-white hover:bg-gray-700"
                        onClick={() => appendDigit(key)}
                        disabled={submitting}
                      >
                        {key}
                      </Button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="grid w-full max-w-md grid-cols-2 gap-4">
              <Button
                type="button"
                className="h-16 gap-2 rounded-xl bg-green-600 text-base text-white hover:bg-green-500"
                onClick={() => void handleAction("CLOCK_IN")}
                disabled={submitting}
              >
                <LogIn className="h-6 w-6" />
                Entrée
              </Button>
              <Button
                type="button"
                className="h-16 gap-2 rounded-xl bg-red-600 text-base text-white hover:bg-red-500"
                onClick={() => void handleAction("CLOCK_OUT")}
                disabled={submitting}
              >
                <LogOut className="h-6 w-6" />
                Sortie
              </Button>
              <Button
                type="button"
                className="h-16 gap-2 rounded-xl bg-amber-500 text-base text-gray-900 hover:bg-amber-400"
                onClick={() => void handleAction("BREAK_START")}
                disabled={submitting}
              >
                <Coffee className="h-6 w-6" />
                Début pause
              </Button>
              <Button
                type="button"
                className="h-16 gap-2 rounded-xl bg-blue-600 text-base text-white hover:bg-blue-500"
                onClick={() => void handleAction("BREAK_END")}
                disabled={submitting}
              >
                <Play className="h-6 w-6" />
                Fin pause
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
