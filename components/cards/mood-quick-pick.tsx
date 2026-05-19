"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const MOODS = [
  { value: 1, emoji: "😔", label: "Struggling" },
  { value: 2, emoji: "😐", label: "Meh" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🥰", label: "Great" },
];

export function MoodQuickPick({
  initialMood,
  userId,
  todayDate,
}: {
  initialMood: number | null;
  userId: string;
  todayDate: string;
}) {
  const [mood, setMood] = useState<number | null>(initialMood);
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  // When the dashboard navigates between days, the parent passes new
  // `todayDate` and `initialMood` props. Reset the local selection to match
  // the date being viewed; otherwise the previous day's emoji stays sticky.
  useEffect(() => {
    setMood(initialMood);
  }, [todayDate, initialMood]);

  const setMoodValue = (v: number) => {
    setMood(v);
    startTransition(async () => {
      await supabase.from("wellness_entries").upsert(
        {
          user_id: userId,
          logged_for_date: todayDate,
          mood_rating: v,
        },
        { onConflict: "user_id,logged_for_date" }
      );
    });
  };

  return (
    <Card>
      <p className="text-sm text-text-muted mb-3">How are you feeling?</p>
      <div className="flex justify-between gap-1">
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMoodValue(m.value)}
            aria-label={m.label}
            aria-pressed={mood === m.value}
            className={`flex-1 rounded-md py-2 text-2xl transition-colors ${
              mood === m.value
                ? "bg-primary-soft ring-2 ring-primary"
                : "bg-surface-muted hover:bg-primary-soft/50"
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      {isPending && (
        <p className="text-[11px] text-text-muted mt-2">Saving…</p>
      )}
    </Card>
  );
}