"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ML_PER_GLASS = 250;

export function HydrationCard({
  initialMl,
  userId,
  todayDate,
  unit,
  targetMl,
}: {
  initialMl: number;
  userId: string;
  todayDate: string;
  unit: "glasses" | "ml";
  targetMl: number;
}) {
  const [ml, setMl] = useState(initialMl);
  const [, startTransition] = useTransition();
  const supabase = createClient();

  const save = (nextMl: number) => {
    const clamped = Math.max(0, Math.min(targetMl + 2000, Math.round(nextMl)));
    setMl(clamped);
    startTransition(async () => {
      await supabase.from("wellness_entries").upsert(
        {
          user_id: userId,
          logged_for_date: todayDate,
          hydration_ml: clamped,
          // Keep glasses in sync for any legacy reads:
          hydration_glasses: Math.round(clamped / ML_PER_GLASS),
        },
        { onConflict: "user_id,logged_for_date" }
      );
    });
  };

  if (unit === "ml") {
    const pct = Math.min(100, (ml / targetMl) * 100);
    return (
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-text-muted">Hydration</p>
            <p className="text-sm mt-0.5">
              <span className="numeric">{ml.toLocaleString()}</span>{" "}
              <span className="text-text-muted">/ {targetMl.toLocaleString()} mL</span>
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
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
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
          <p className="text-xs text-text-muted">Hydration</p>
          <p className="text-sm mt-0.5">
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
    </Card>
  );
}