"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["Walk", "Yoga", "Swim", "Strength", "Cycle", "Stretch", "Other"];
const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90];
const INTENSITIES = [
  { value: "light", label: "Light", dots: 1 },
  { value: "medium", label: "Medium", dots: 2 },
  { value: "hard", label: "Hard", dots: 3 },
] as const;

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function defaultPerformedAt(dateParam: string | null): string {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [y, m, d] = dateParam.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return toLocalInputValue(dt);
  }
  return toLocalInputValue(new Date());
}

export default function LogExercisePage() {
  return (
    <Suspense>
      <LogExercisePageInner />
    </Suspense>
  );
}

function LogExercisePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date") ?? null;
  const supabase = createClient();
  const [type, setType] = useState("Walk");
  const [duration, setDuration] = useState(20);
  const [intensity, setIntensity] = useState<"light" | "medium" | "hard">("light");
  const [notes, setNotes] = useState("");
  const [performedAt, setPerformedAt] = useState<string>(defaultPerformedAt(dateParam));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase.from("exercise_logs").insert({
      exercise_type: type,
      duration_minutes: duration,
      intensity,
      notes: notes || null,
      performed_at: new Date(performedAt).toISOString(),
    });
    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }
    router.push(dateParam ? `/?date=${dateParam}` : "/");
    router.refresh();
  };

  return (
    <div className="px-4 pt-4 pb-8 min-h-dvh flex flex-col">
      <header className="flex items-center justify-between mb-2">
        <Link
          href="/"
          aria-label="Back"
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-serif text-lg font-medium">Log movement</h1>
        <div className="w-10" />
      </header>

      <p className="text-text-muted text-sm leading-relaxed mt-2">
        Any amount counts. We log it here just so you can see your patterns.
      </p>

      <section className="mt-6">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Type
        </p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-full text-sm ${
                type === t
                  ? "bg-primary text-white"
                  : "bg-surface-muted text-text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
          <Calendar size={14} />
          <span className="uppercase tracking-wider">When</span>
        </div>
        <input
          type="datetime-local"
          value={performedAt}
          max={toLocalInputValue(new Date())}
          onChange={(e) => setPerformedAt(e.target.value)}
          className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm numeric"
        />
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setPerformedAt(toLocalInputValue(new Date()))}
            className="text-xs text-text-muted bg-surface-muted px-2.5 py-1 rounded-sm"
          >
            Now
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              d.setHours(12, 0, 0, 0);
              setPerformedAt(toLocalInputValue(d));
            }}
            className="text-xs text-text-muted bg-surface-muted px-2.5 py-1 rounded-sm"
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 2);
              d.setHours(12, 0, 0, 0);
              setPerformedAt(toLocalInputValue(d));
            }}
            className="text-xs text-text-muted bg-surface-muted px-2.5 py-1 rounded-sm"
          >
            2 days ago
          </button>
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Duration
        </p>
        <div className="flex items-baseline justify-center gap-1.5 mb-3">
          <span className="text-5xl font-light numeric">{duration}</span>
          <span className="text-text-muted">min</span>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`w-12 h-10 rounded-sm text-sm numeric ${
                duration === d
                  ? "bg-primary text-white"
                  : "bg-surface text-text-muted border border-border"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Intensity
        </p>
        <div className="grid grid-cols-3 gap-2">
          {INTENSITIES.map((i) => (
            <button
              key={i.value}
              onClick={() => setIntensity(i.value)}
              className={`py-3 rounded-md flex flex-col items-center gap-1.5 ${
                intensity === i.value
                  ? "bg-primary-soft ring-2 ring-primary"
                  : "bg-surface"
              }`}
            >
              <div className="flex gap-1">
                {[1, 2, 3].map((d) => (
                  <span
                    key={d}
                    className={`w-1.5 h-1.5 rounded-full ${
                      d <= i.dots ? "bg-primary" : "bg-surface-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm">{i.label}</span>
            </button>
          ))}
        </div>
      </section>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes — how did it feel?"
        rows={3}
        className="mt-6 w-full bg-surface border border-border rounded-md px-4 py-3 text-base resize-none"
      />

      <button
        onClick={save}
        disabled={saving}
        className="mt-auto w-full bg-primary text-white rounded-md py-4 font-medium disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}