"use client";
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";

// Values exposed by the AnalyticsProvider
export type AnalyticsContextValue = {
  userSession: string | null;
  readSession: string | null;
  // Manually update readSession when a server action returns a new id
  setReadSession: (val: string | null) => void;
  // Manually update userSession if needed
  setUserSession: (val: string | null) => void;
  // Refresh both values by re-reading document.cookie (useful after server actions)
  refreshFromCookies: () => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [userSession, setUserSession] = useState<string | null>(null);
  const [readSession, setReadSession] = useState<string | null>(null);

  const refreshFromCookies = useCallback(() => {
    setUserSession(getCookie("user_session"));
    setReadSession(getCookie("read_session"));
  }, []);

  // On mount, read cookies once
  useEffect(() => {
    refreshFromCookies();
  }, [refreshFromCookies]);

  // In case other tabs update cookies (e.g., via navigation), listen to storage events
  // Components can call refreshFromCookies after actions; this is just best-effort cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // Notified when localStorage changes. We can piggy-back a simple flag to signal updates.
      if (e.key === "analytics_cookie_sync" && e.newValue) {
        refreshFromCookies();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshFromCookies]);

  const value = useMemo<AnalyticsContextValue>(() => ({
    userSession,
    readSession,
    setReadSession,
    setUserSession,
    refreshFromCookies,
  }), [userSession, readSession, refreshFromCookies]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return ctx;
}
