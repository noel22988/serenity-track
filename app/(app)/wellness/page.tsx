import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import type { WellnessEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

const MOOD_EMOJI = ["😔", "😐", "🙂", "😊", "🥰"];

export default async function WellnessPage() {
  const supabase = createClient();
  const { data: entries } = await supabase
    .from("wellness_entries")
    .select("*")
    .order("logged_for_date", { ascending: false })
    .limit(60);

  const list = (entries ?? []) as WellnessEntry[];

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-text-muted tracking-wider uppercase">
            Wellness
          </p>
          <h1 className="font-serif text-2xl font-medium mt-1">How you&apos;ve been</h1>
        </div>
        <Link
          href="/log/mood"
          className="bg-primary text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <Pencil size={14} />
          Today
        </Link>
      </header>

      {/* Mood calendar (last 30 days) */}
      <Card>
        <p className="text-sm text-text-muted mb-3">Mood — last 30 days</p>
        <MoodCalendar entries={list} />
      </Card>

      {/* Symptom frequency */}
      <SymptomCard entries={list} />

      {/* Journal entries */}
      <section>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Journal
        </p>
        <div className="space-y-2">
          {list
            .filter((e) => e.journal_notes)
            .slice(0, 10)
            .map((e) => (
              <Card key={e.id}>
                <p className="text-xs text-text-muted">
                  {format(new Date(e.logged_for_date), "EEEE, MMM d")}
                </p>
                <p className="mt-1.5 text-sm whitespace-pre-wrap leading-relaxed">
                  {e.journal_notes}
                </p>
              </Card>
            ))}
          {list.filter((e) => e.journal_notes).length === 0 && (
            <p className="text-center text-text-muted text-sm py-6">
              Nothing journaled yet. Whenever you&apos;re ready.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function MoodCalendar({ entries }: { entries: WellnessEntry[] }) {
  const byDate = new Map(entries.map((e) => [e.logged_for_date, e]));
  const days: { date: Date; entry: WellnessEntry | null }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = format(d, "yyyy-MM-dd");
    days.push({ date: d, entry: byDate.get(key) ?? null });
  }
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {days.map((d) => {
        const m = d.entry?.mood_rating;
        return (
          <div
            key={d.date.toISOString()}
            className="aspect-square rounded-sm flex items-center justify-center text-xs"
            style={{
              backgroundColor: m
                ? `color-mix(in srgb, var(--primary) ${m * 18}%, var(--surface-muted))`
                : "var(--surface-muted)",
            }}
            title={`${format(d.date, "MMM d")}${m ? ` · ${MOOD_EMOJI[m - 1]}` : ""}`}
          >
            {m ? MOOD_EMOJI[m - 1] : ""}
          </div>
        );
      })}
    </div>
  );
}

function SymptomCard({ entries }: { entries: WellnessEntry[] }) {
  const counts = new Map<string, number>();
  for (const e of entries) {
    for (const s of e.symptoms ?? []) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (sorted.length === 0) return null;
  const max = sorted[0][1];
  return (
    <Card>
      <p className="text-sm text-text-muted mb-3">Most logged symptoms</p>
      <ul className="space-y-2.5">
        {sorted.map(([name, count]) => (
          <li key={name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text">{name}</span>
              <span className="text-text-muted numeric">
                {count} day{count > 1 ? "s" : ""}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
