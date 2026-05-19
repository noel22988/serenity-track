"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import type { ExerciseLog } from "@/lib/types";

export function DashboardExerciseList({
  entries,
}: {
  entries: ExerciseLog[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (entries.length === 0) return null;

  const handleDelete = async (id: string, type: string) => {
    if (!confirm(`Delete "${type}"?`)) return;
    setPendingId(id);
    const { error } = await supabase
      .from("exercise_logs")
      .delete()
      .eq("id", id);
    if (error) {
      alert(error.message);
      setPendingId(null);
      return;
    }
    startTransition(() => router.refresh());
  };

  return (
    <Card>
      <p className="text-sm font-medium mb-3">Movement</p>
      <ul className="space-y-2">
        {entries.map((ex) => (
          <li
            key={ex.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-text truncate flex-1 pr-2">
              {ex.exercise_type}
              <span className="text-text-muted text-xs ml-1 capitalize">
                · {ex.intensity}
              </span>
            </span>
            <span className="text-text-muted text-xs numeric shrink-0 mr-1">
              {ex.duration_minutes} min
            </span>
            <button
              onClick={() => handleDelete(ex.id, ex.exercise_type)}
              disabled={pendingId === ex.id}
              aria-label={`Delete ${ex.exercise_type}`}
              className="text-text-muted/40 hover:text-warn p-1.5 -mr-1 disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}