"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [treatmentType, setTreatmentType] = useState("");
  const [treatmentStart, setTreatmentStart] = useState("");
  const [savingTimer, setSavingTimer] = useState<NodeJS.Timeout | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
    supabase
      .from("profiles")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setDisplayName(data.display_name ?? "");
          setUnit(data.unit_system);
          setTreatmentType(data.treatment_type ?? "");
          setTreatmentStart(data.treatment_start_date ?? "");
        }
      });
  }, [supabase]);

  // Debounced auto-save
  useEffect(() => {
    if (!profile) return;
    if (savingTimer) clearTimeout(savingTimer);
    const t = setTimeout(async () => {
      await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          unit_system: unit,
          treatment_type: treatmentType || null,
          treatment_start_date: treatmentStart || null,
        })
        .eq("id", profile.id);
      setSavedAt(new Date());
    }, 600);
    setSavingTimer(t);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, unit, treatmentType, treatmentStart]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      <header>
        <p className="text-[11px] text-text-muted tracking-wider uppercase">
          Settings
        </p>
        <h1 className="font-serif text-2xl font-medium mt-1">Your space</h1>
      </header>

      <Card className="space-y-3">
        <p className="text-sm font-medium">Profile</p>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-bg border border-border rounded-sm px-3 py-2 text-sm"
          />
        </label>
        <div>
          <p className="text-xs text-text-muted">Email</p>
          <p className="text-sm mt-0.5">{email}</p>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium">Display</p>
        <div>
          <p className="text-xs text-text-muted mb-1.5">Units</p>
          <div className="flex gap-2">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`flex-1 py-2 rounded-sm text-sm ${
                  unit === u ? "bg-primary text-white" : "bg-bg text-text-muted border border-border"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1.5">Theme</p>
          <div className="flex gap-2">
            {(["light", "system", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-2 rounded-sm text-sm capitalize ${
                  theme === t ? "bg-primary text-white" : "bg-bg text-text-muted border border-border"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium">Treatment</p>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Treatment type (optional)</span>
          <input
            value={treatmentType}
            onChange={(e) => setTreatmentType(e.target.value)}
            placeholder="e.g. GLP-1, post-bariatric…"
            className="bg-bg border border-border rounded-sm px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Start date</span>
          <input
            type="date"
            value={treatmentStart}
            onChange={(e) => setTreatmentStart(e.target.value)}
            className="bg-bg border border-border rounded-sm px-3 py-2 text-sm"
          />
        </label>
        <p className="text-[11px] text-text-muted">
          Used only to show your day count on the dashboard.
        </p>
      </Card>

      {savedAt && (
        <p className="text-[11px] text-text-muted text-center">
          Saved {savedAt.toLocaleTimeString()}
        </p>
      )}

      <button
        onClick={signOut}
        className="w-full bg-surface-muted text-text rounded-md py-3 text-sm mt-4"
      >
        Sign out
      </button>

      <p className="text-[11px] text-text-muted text-center pt-2">
        Serenity Track · v0.1
      </p>
    </div>
  );
}
