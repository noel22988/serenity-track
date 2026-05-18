"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Detects the browser's IANA timezone, writes it to a `tz` cookie so server
 * components can compute date boundaries in the user's local time, and also
 * persists it to profiles.timezone so coach views can group a client's data
 * by the client's local day instead of UTC.
 */
export function TimezoneCookie() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = document.cookie.match(/(?:^|;\s*)tz=([^;]+)/);
    const existing = match ? decodeURIComponent(match[1]) : null;
    const cookieChanged = existing !== tz;

    if (cookieChanged) {
      document.cookie =
        "tz=" +
        encodeURIComponent(tz) +
        "; path=/; max-age=31536000; samesite=lax";
    }

    // Persist to profiles.timezone. Coaches reading a client's data use this
    // to format dates in the client's local time.
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ timezone: tz })
          .eq("id", user.id);
      }
    })();

    if (cookieChanged) router.refresh();
  }, [router]);

  return null;
}