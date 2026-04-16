"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  Clock,
  Megaphone,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  getEmployeeNotificationsAction,
  markNotificationReadAction,
  dismissNotificationAction,
} from "@/app/espace-employe/actions";

interface EmployeeNotif {
  id: string;
  title: string;
  message: string;
  priority: "LOW" | "NORMAL" | "URGENT";
  target: string;
  createdAt: Date;
  expiresAt: Date;
  isRead: boolean;
  isDismissed: boolean;
}

const PRIORITY_CONFIG = {
  LOW: {
    bg: "bg-slate-50 border-slate-200",
    icon: "text-slate-500",
    badge: "bg-slate-100 text-slate-600",
    label: "Info",
  },
  NORMAL: {
    bg: "bg-blue-50 border-blue-200",
    icon: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    label: "Notification",
  },
  URGENT: {
    bg: "bg-red-50 border-red-200",
    icon: "text-red-600",
    badge: "bg-red-100 text-red-700",
    label: "Urgent",
  },
} as const;

function timeAgo(d: Date | string): string {
  const now = Date.now();
  const then = new Date(d).getTime();
  const diffMin = Math.floor((now - then) / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  return `Il y a ${Math.floor(diffH / 24)}j`;
}

export function EmployeeNotifications() {
  const [notifications, setNotifications] = useState<EmployeeNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState<EmployeeNotif | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getEmployeeNotificationsAction();
      setNotifications(data as EmployeeNotif[]);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => void loadNotifications(), 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (notifications.length === 0) return;

    const unread = notifications.filter((n) => !n.isRead && !n.isDismissed);
    const urgent = unread.find((n) => n.priority === "URGENT");
    const first = urgent ?? unread[0];

    if (first) {
      setShowPopup(first);
      void markNotificationReadAction(first.id);
    }
  }, [notifications]);

  async function handleDismiss(id: string) {
    try {
      await dismissNotificationAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isDismissed: true, isRead: true } : n)),
      );
      if (showPopup?.id === id) setShowPopup(null);
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await markNotificationReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      // ignore
    }
  }

  const visible = notifications.filter((n) => !n.isDismissed);
  const unreadCount = visible.filter((n) => !n.isRead).length;

  if (loading || visible.length === 0) return null;

  return (
    <>
      {/* Popup overlay for urgent/new notifications */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            className={cn(
              "w-full max-w-sm animate-in fade-in-0 zoom-in-95 rounded-2xl border-2 p-0 shadow-2xl",
              showPopup.priority === "URGENT"
                ? "border-red-300 bg-white"
                : "border-blue-200 bg-white",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3 rounded-t-2xl px-5 py-4",
                showPopup.priority === "URGENT"
                  ? "bg-red-50"
                  : showPopup.priority === "NORMAL"
                    ? "bg-blue-50"
                    : "bg-slate-50",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  showPopup.priority === "URGENT"
                    ? "bg-red-100"
                    : showPopup.priority === "NORMAL"
                      ? "bg-blue-100"
                      : "bg-slate-100",
                )}
              >
                {showPopup.priority === "URGENT" ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <BellRing className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {PRIORITY_CONFIG[showPopup.priority].label}
                </p>
                <h3 className="font-bold text-slate-900">{showPopup.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => setShowPopup(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {showPopup.message}
              </p>
              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {timeAgo(showPopup.createdAt)}
              </p>
            </div>

            <div className="flex gap-2 border-t px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  void handleDismiss(showPopup.id);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Fermer
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  void handleMarkRead(showPopup.id);
                  setShowPopup(null);
                }}
              >
                <Check className="h-3.5 w-3.5" />
                Compris
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notification list card */}
      <Card className="rounded-2xl border-0 shadow-md overflow-hidden">
        <CardHeader
          className="cursor-pointer pb-3"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="relative">
              <Megaphone className="h-4 w-4 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            Messages de votre employeur
            <Badge variant="outline" className="ml-auto text-xs">
              {visible.length}
            </Badge>
          </CardTitle>
        </CardHeader>

        {expanded && (
          <CardContent className="px-4 pb-4 space-y-2">
            {visible.map((n) => {
              const config = PRIORITY_CONFIG[n.priority];
              return (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-xl border p-3 transition-all",
                    config.bg,
                    !n.isRead && "ring-2 ring-primary/20",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        n.priority === "URGENT" ? "bg-red-100" : n.priority === "NORMAL" ? "bg-blue-100" : "bg-slate-100",
                      )}
                    >
                      {n.priority === "URGENT" ? (
                        <AlertTriangle className={cn("h-4 w-4", config.icon)} />
                      ) : (
                        <Bell className={cn("h-4 w-4", config.icon)} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{n.title}</h4>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {n.message}
                      </p>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => void handleMarkRead(n.id)}
                        >
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => void handleDismiss(n.id)}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>
    </>
  );
}
