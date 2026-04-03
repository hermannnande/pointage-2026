"use client";

import { useCallback, useEffect, useState } from "react";

type DashboardMode = "simple" | "advanced";

const STORAGE_KEY_MODE = "ocontrole_dashboard_mode";
const STORAGE_KEY_TUTORIAL = "ocontrole_tutorial_seen";

export function useDashboardMode() {
  const [mode, setModeState] = useState<DashboardMode>("simple");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODE);
      if (stored === "advanced" || stored === "simple") {
        setModeState(stored);
      }
    } catch {}
    setLoaded(true);
  }, []);

  const setMode = useCallback((m: DashboardMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY_MODE, m);
    } catch {}
  }, []);

  return { mode, setMode, loaded } as const;
}

export function useTutorialState() {
  const [seen, setSeenState] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TUTORIAL);
      setSeenState(stored === "true");
    } catch {
      setSeenState(false);
    }
    setLoaded(true);
  }, []);

  const markSeen = useCallback(() => {
    setSeenState(true);
    try {
      localStorage.setItem(STORAGE_KEY_TUTORIAL, "true");
    } catch {}
  }, []);

  const reset = useCallback(() => {
    setSeenState(false);
    try {
      localStorage.removeItem(STORAGE_KEY_TUTORIAL);
    } catch {}
  }, []);

  return { seen: seen === true, loaded, markSeen, reset } as const;
}
