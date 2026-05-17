"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

const MOODS = [
  { value: 1, emoji: "😔", label: "Struggling" },
  { value: 2, emoji: "😐", label: "Meh" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🥰", label: "Great" },
];

const ENERGIES = [
  { value: 1, label: "Drained" },
  { value: 2, label: "Low" },
  { value: 3, label: "Steady" },
  { value: 4, label: "Good" },
  { value: 5, label: "Strong" },
];

const SYMPTOMS = [
  "Nausea",
  "Fatigue",
  "Headache",
  "Injection-site reaction",
  "Constipation",
  "Heartburn",
  "Sleep issues",
  "Joint pain",
  "Anxious",
  "Mood low",
  "Hair shedding",
  "Other",
];

export default function LogMoodPage() {
  const router = useRouter();
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [journal, setJournal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("wellness_entries")
      .select("*")
      .eq("logged_for_date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMood(data.mood_rating);
          setEnergy(data.energy_rating);
          setSymptoms(data.symptoms ?? []);
          setJournal(data.journal_notes ?? "");
        }
      });
  }, [supabase, today]);

  const toggleSymptom = (s: string) => {
    setSymptoms((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("wellness_entries").upsert(
      {
        user_id: user.id,
        logged_for_date: today,
        mood_rating: mood,
        energy_rating: energy,
        symptoms: symptoms.length ? symptoms : null,
        journal_notes: journal || null,
      },
      { onConflict: "user_id,logged_for_date" }
    );
    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }
    router.push("/wellness");
    router.refresh();
  };

  return (
    <div className="px-4 pt-4 pb-8 min-h-dvh flex flex-col">
      <header className="flex items-center justify-between mb-2">
        <Link
          href="/wellness"
          aria-label="Back"
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-serif text-lg font-medium">How are you today?</h1>
        <div className="w-10" />
      </header>

      <section className="mt-4">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Mood
        </p>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              aria-label={m.label}
              className={`py-3 rounded-md text-2xl ${
                mood === m.value
                  ? "bg-primary-soft ring-2 ring-primary"
                  : "bg-surface"
              }`}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Energy
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ENERGIES.map((e) => (
            <button
              key={e.value}
              onClick={() => setEnergy(e.value)}
              className={`py-2.5 rounded-md text-xs ${
                energy === e.value
                  ? "bg-primary-soft ring-2 ring-primary text-text"
                  : "bg-surface text-text-muted"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Any symptoms?
        </p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSymptom(s)}
              className={`px-3 py-1.5 rounded-full text-xs ${
                symptoms.includes(s)
                  ? "bg-accent/30 text-text"
                  : "bg-surface-muted text-text-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Journal
        </p>
        <textarea
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          placeholder="A few words on the day, however you like."
          rows={4}
          className="w-full bg-surface border border-border rounded-md px-4 py-3 text-base resize-none"
        />
      </section>

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
