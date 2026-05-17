"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TARGET = 8;

export function HydrationCard({
  initialGlasses,
  userId,
  todayDate,
}: {
  initialGlasses: number;
  userId: string;
  todayDate: string;
}) {
  const [glasses, setGlasses] = useState(initialGlasses);
  const [, startTransition] = useTransition();
  const supabase = createClient();

  const save = (next: number) => {
    const clamped = Math.max(0, Math.min(TARGET + 4, next));
    setGlasses(clamped);
    startTransition(async () => {
      await supabase.from("wellness_entries").upsert(
        {
          user_id: userId,
          logged_for_date: todayDate,
          hydration_glasses: clamped,
        },
        { onConflict: "user_id,logged_for_date" }
      );
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">Hydration</p>
          <p className="text-sm mt-0.5">
            <span className="numeric">{glasses}</span> of {TARGET} glasses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => save(glasses - 1)}
            disabled={glasses === 0}
            aria-label="Remove glass"
            className="w-9 h-9 rounded-full bg-surface-muted text-text disabled:opacity-40 flex items-center justify-center"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => save(glasses + 1)}
            aria-label="Add glass"
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="flex gap-1 mt-3">
        {Array.from({ length: TARGET }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 h-4 rounded-sm ${
              i < glasses ? "bg-primary" : "bg-surface-muted"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </Card>
  );
}
