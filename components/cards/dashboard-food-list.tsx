"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import type { FoodLog } from "@/lib/types";

const MEAL_ORDER: FoodLog["meal_type"][] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export function DashboardFoodList({ entries }: { entries: FoodLog[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (entries.length === 0) return null;

  const byMeal = new Map<FoodLog["meal_type"], FoodLog[]>();
  for (const f of entries) {
    if (!byMeal.has(f.meal_type)) byMeal.set(f.meal_type, []);
    byMeal.get(f.meal_type)!.push(f);
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setPendingId(id);
    const { error } = await supabase.from("food_logs").delete().eq("id", id);
    if (error) {
      alert(error.message);
      setPendingId(null);
      return;
    }
    startTransition(() => router.refresh());
  };

  return (
    <Card>
      <p className="text-sm font-medium mb-3">What was eaten</p>
      <div className="space-y-3">
        {MEAL_ORDER.map((meal) => {
          const items = byMeal.get(meal);
          if (!items || items.length === 0) return null;
          const mealTotal = Math.round(
            items.reduce((s, i) => s + Number(i.calories), 0)
          );
          return (
            <div key={meal}>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs text-text-muted uppercase tracking-wider capitalize">
                  {meal}
                </p>
                <p className="text-[11px] text-text-muted numeric">
                  {mealTotal} kcal
                </p>
              </div>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text truncate flex-1 pr-2">
                      {item.food_name_snapshot}
                      {Number(item.servings) !== 1 && (
                        <span className="text-text-muted text-xs ml-1">
                          × {item.servings}
                        </span>
                      )}
                    </span>
                    <span className="text-text-muted text-xs numeric shrink-0 mr-1">
                      {Math.round(Number(item.calories))}
                    </span>
                    <button
                      onClick={() =>
                        handleDelete(item.id, item.food_name_snapshot)
                      }
                      disabled={pendingId === item.id}
                      aria-label={`Delete ${item.food_name_snapshot}`}
                      className="text-text-muted/40 hover:text-warn p-1.5 -mr-1 disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}