"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Detects the browser's IANA timezone and writes it to a `tz` cookie so
 * server components can compute date boundaries in the user's local time.
 * If the cookie was missing or wrong, triggers a router refresh so the
 * server re-renders with the correct timezone.
 */
export function TimezoneCookie() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = document.cookie.match(/(?:^|;\s*)tz=([^;]+)/);
    const existing = match ? decodeURIComponent(match[1]) : null;

    if (existing !== tz) {
      document.cookie =
        "tz=" + encodeURIComponent(tz) + "; path=/; max-age=31536000; samesite=lax";
      router.refresh();
    }
  }, [router]);

  return null;
}