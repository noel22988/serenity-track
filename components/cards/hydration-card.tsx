"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Minus, Plus, Calendar, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ML_PER_GLASS = 250;

function shiftDateStr(s: string, deltaDays: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function relativeLabel(date: string, today: string): string {
  if (date === today) return "Today";
  const [yA, mA, dA] = date.split("-").map(Number);
  const [yB, mB, dB] = today.split("-").map(Number);
  const diffDays = Math.round(
    (Date.UTC(yA, mA - 1, dA) - Date.UTC(yB, mB - 1, dB)) / 86_400_000
  );
  if (diffDays === -1) return "Yesterday";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `in ${diffDays} days`;
}

export function HydrationCard({
  initialMl,
  userId,
  todayDate,
  realToday,
  unit,
  targetMl,
}: {
  initialMl: number;
  userId: string;
  /** Date currently being viewed (typically dashboard's viewingDate). */
  todayDate: string;
  /** User's actual today in their local tz, used only for "Today/Yesterday" labels.
   *  Defaults to todayDate if not supplied (backward-compat). */
  realToday?: string;
  unit: "glasses" | "ml";
  targetMl: number;
}) {
  const today = realToday ?? todayDate;
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [ml, setMl] = useState(initialMl);
  const [showPicker, setShowPicker] = useState(false);
  const [, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  // If parent prop changes (dashboard navigated to another day), follow it.
  useEffect(() => {
    setSelectedDate(todayDate);
    setMl(initialMl);
  }, [todayDate, initialMl]);

  // Called when the user explicitly picks a date on the card itself (not from parent navigation).
  // Fetches that day's hydration value so the +/- buttons modify the correct row.
  const pickDate = async (newDate: string) => {
    setSelectedDate(newDate);
    if (newDate === todayDate) {
      // Back in sync with the dashboard's date — use whatever the server sent
      setMl(initialMl);
      return;
    }
    const { data } = await supabase
      .from("wellness_entries")
      .select("hydration_ml")
      .eq("user_id", userId)
      .eq("logged_for_date", newDate)
      .maybeSingle();
    setMl(
      (data as { hydration_ml?: number } | null)?.hydration_ml ?? 0
    );
  };

  const save = (nextMl: number) => {
    const clamped = Math.max(0, Math.min(targetMl + 2000, Math.round(nextMl)));
    setMl(clamped);
    startTransition(async () => {
      await supabase.from("wellness_entries").upsert(
        {
          user_id: userId,
          logged_for_date: selectedDate,
          hydration_ml: clamped,
          // Keep glasses in sync for any legacy reads:
          hydration_glasses: Math.round(clamped / ML_PER_GLASS),
        },
        { onConflict: "user_id,logged_for_date" }
      );
    });
  };

  const label = relativeLabel(selectedDate, today);

  // Pretty-format the selected date as "Mon · May 17"
  const [yr, mo, dy] = selectedDate.split("-").map(Number);
  const dateObj = new Date(Date.UTC(yr, mo - 1, dy));
  const dateDisplay = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dateObj);

  const dateToggle = (
    <button
      onClick={() => setShowPicker((s) => !s)}
      className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text"
    >
      <Calendar size={11} />
      <span>
        {label}
        {label !== "Today" && (
          <span className="text-text-muted/70"> · {dateDisplay}</span>
        )}
      </span>
      <ChevronDown
        size={11}
        className={`transition-transform ${showPicker ? "rotate-180" : ""}`}
      />
    </button>
  );

  const datePickerUi = (
    <div className="space-y-2 mt-3 pt-3 border-t border-border">
      <input
        type="date"
        value={selectedDate}
        max={today}
        onChange={(e) => pickDate(e.target.value)}
        className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm numeric"
      />
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => pickDate(today)}
          className="text-xs text-text-muted bg-surface-muted px-2.5 py-1 rounded-sm"
        >
          Today
        </button>
        <button
          onClick={() => pickDate(shiftDateStr(today, -1))}
          className="text-xs text-text-muted bg-surface-muted px-2.5 py-1 rounded-sm"
        >
          Yesterday
        </button>
        <button
          onClick={() => pickDate(shiftDateStr(today, -2))}
          className="text-xs text-text-muted bg-surface-muted px-2.5 py-1 rounded-sm"
        >
          2 days ago
        </button>
      </div>
    </div>
  );

  if (unit === "ml") {
    const pct = Math.min(100, (ml / targetMl) * 100);
    return (
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-text-muted">Hydration</p>
              {dateToggle}
            </div>
            <p className="text-sm">
              <span className="numeric">{ml.toLocaleString()}</span>{" "}
              <span className="text-text-muted">
                / {targetMl.toLocaleString()} mL
              </span>
            </p>
          </div>
          <button
            onClick={() => save(0)}
            className="text-[11px] text-text-muted px-2 py-1"
          >
            Reset
          </button>
        </div>

        <div className="h-2 rounded-full bg-surface-muted overflow-hidden mb-3">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[100, 250, 500, 1000].map((step) => (
            <button
              key={step}
              onClick={() => save(ml + step)}
              className="bg-surface-muted text-text text-xs py-2 rounded-sm numeric"
            >
              +{step}
            </button>
          ))}
        </div>

        {showPicker && datePickerUi}
      </Card>
    );
  }

  // Glasses mode
  const glasses = Math.round(ml / ML_PER_GLASS);
  const target = Math.round(targetMl / ML_PER_GLASS);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-text-muted">Hydration</p>
            {dateToggle}
          </div>
          <p className="text-sm">
            <span className="numeric">{glasses}</span> of {target} glasses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => save(ml - ML_PER_GLASS)}
            disabled={glasses === 0}
            aria-label="Remove glass"
            className="w-9 h-9 rounded-full bg-surface-muted text-text disabled:opacity-40 flex items-center justify-center"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => save(ml + ML_PER_GLASS)}
            aria-label="Add glass"
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="flex gap-1 mt-3">
        {Array.from({ length: target }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 h-4 rounded-sm ${
              i < glasses ? "bg-primary" : "bg-surface-muted"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      {showPicker && datePickerUi}
    </Card>
  );
}