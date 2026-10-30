"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const measurementId = "G-6HL74P0882";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  "ga-disable-G-6HL74P0882"?: boolean;
};

export function GoogleAnalytics() {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    const analyticsWindow = window as AnalyticsWindow;
    // The tag can remain loaded after client navigation into the admin area.
    analyticsWindow["ga-disable-G-6HL74P0882"] = isAdmin;
    if (isAdmin) {
      lastPage.current = null;
      return;
    }

    analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
    if (!analyticsWindow.gtag) {
      analyticsWindow.gtag = function () {
        // gtag's command queue uses Arguments objects.
        // eslint-disable-next-line prefer-rest-params
        analyticsWindow.dataLayer!.push(arguments);
      };
      analyticsWindow.gtag("js", new Date());
      // Send page views explicitly so admin routes are excluded.
      analyticsWindow.gtag("config", measurementId, { send_page_view: false });
    }

    if (lastPage.current !== pathname) {
      analyticsWindow.gtag("event", "page_view", {
        send_to: measurementId,
        page_location: window.location.href,
        page_path: pathname,
        page_title: document.title,
      });
      lastPage.current = pathname;
    }
  }, [isAdmin, pathname]);

  if (isAdmin) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
    />
  );
}
