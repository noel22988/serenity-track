import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { ArrowLeft, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { kgToLb } from "@/lib/utils";
import type {
  Profile,
  WeightEntry,
  FoodLog,
  ExerciseLog,
  WellnessEntry,
} from "@/lib/types";
import { ClientWeightChart } from "./weight-chart-client";

export const dynamic = "force-dynamic";

export default async function CoachClientPage({
  params,
}: {
  params: { clientId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify the coach relationship exists (RLS would also block, but a friendly 404 is nicer)
  const { data: rel } = await supabase
    .from("coach_relationships")
    .select("id")
    .eq("coach_id", user.id)
    .eq("client_id", params.clientId)
    .maybeSingle();
  if (!rel) notFound();

  // Client profile + their unit preference
  const { data: clientProfile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.clientId)
    .single()) as { data: Profile | null };

  if (!clientProfile) notFound();

  const ninetyDaysAgo = subDays(new Date(), 90).toISOString();
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  const [
    { data: weights },
    { data: recentFoods },
    { data: recentExercise },
    { data: recentWellness },
  ] = await Promise.all([
    supabase
      .from("weight_entries")
      .select("*")
      .eq("user_id", params.clientId)
      .gte("logged_at", ninetyDaysAgo)
      .order("logged_at", { ascending: true }),
    supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", params.clientId)
      .gte("eaten_at", sevenDaysAgo)
      .order("eaten_at", { ascending: false }),
    supabase
      .from("exercise_logs")
      .select("*")
      .eq("user_id", params.clientId)
      .gte("performed_at", sevenDaysAgo)
      .order("performed_at", { ascending: false }),
    supabase
      .from("wellness_entries")
      .select("*")
      .eq("user_id", params.clientId)
      .gte("logged_for_date", sevenDaysAgo.slice(0, 10))
      .order("logged_for_date", { ascending: false }),
  ]);

  const ws = (weights ?? []) as WeightEntry[];
  const fs = (recentFoods ?? []) as FoodLog[];
  const es = (recentExercise ?? []) as ExerciseLog[];
  const ms = (recentWellness ?? []) as WellnessEntry[];

  const unit = clientProfile.unit_system;
  const latest = ws[ws.length - 1];

  // Use the CLIENT's timezone (from their profile) to bucket entries by their
  // local day, not UTC. Falls back to UTC if the client hasn't loaded the app
  // since timezone-persist went live.
  const clientTz = clientProfile.timezone || "UTC";
  const localDayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: clientTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: clientTz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Group food logs by client's local date
  const foodByDay = new Map<string, FoodLog[]>();
  for (const f of fs) {
    const day = localDayFormatter.format(new Date(f.eaten_at));
    if (!foodByDay.has(day)) foodByDay.set(day, []);
    foodByDay.get(day)!.push(f);
  }

  // Group exercise logs by client's local date
  const exerciseByDay = new Map<string, ExerciseLog[]>();
  for (const e of es) {
    const day = localDayFormatter.format(new Date(e.performed_at));
    if (!exerciseByDay.has(day)) exerciseByDay.set(day, []);
    exerciseByDay.get(day)!.push(e);
  }

  // Weekly avg mood
  const moodVals = ms.map((m) => m.mood_rating).filter((x): x is number => x !== null);
  const avgMood = moodVals.length
    ? moodVals.reduce((s, x) => s + x, 0) / moodVals.length
    : null;

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      <header className="flex items-center justify-between">
        <Link
          href="/coach"
          aria-label="Back to clients"
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted bg-surface-muted px-2.5 py-1 rounded-sm">
          <Eye size={11} />
          Read only
        </div>
      </header>

      <div>
        <p className="text-[11px] text-text-muted tracking-wider uppercase">Client</p>
        <h1 className="font-serif text-2xl font-medium mt-1">
          {clientProfile.display_name ?? "Client"}
        </h1>
        {clientProfile.treatment_type && (
          <p className="text-xs text-text-muted mt-1">
            {clientProfile.treatment_type}
            {clientProfile.treatment_start_date && (
              <>
                {" "}
                · started {format(new Date(clientProfile.treatment_start_date), "MMM d, yyyy")}
              </>
            )}
          </p>
        )}
      </div>

      {/* Weight overview */}
      <Card>
        <p className="text-sm text-text-muted">Current weight</p>
        <div className="flex items-baseline gap-2 mt-1">
          {latest ? (
            <>
              <span className="text-3xl font-light numeric">
                {unit === "kg"
                  ? Number(latest.weight_kg).toFixed(1)
                  : kgToLb(Number(latest.weight_kg)).toFixed(1)}
              </span>
              <span className="text-text-muted">{unit}</span>
              <span className="text-xs text-text-muted ml-2">
                {format(new Date(latest.logged_at), "MMM d")}
              </span>
            </>
          ) : (
            <span className="text-sm text-text-muted">Not logged yet</span>
          )}
        </div>
        {ws.length >= 2 && (
          <div className="mt-4 h-44 -ml-1">
            <ClientWeightChart
              data={ws.map((w) => ({
                date: format(new Date(w.logged_at), "MMM d"),
                value:
                  unit === "kg"
                    ? Number(w.weight_kg)
                    : kgToLb(Number(w.weight_kg)),
              }))}
              unit={unit}
            />
          </div>
        )}
      </Card>

      {/* Week summary */}
      <Card>
        <p className="text-sm font-medium mb-3">Last 7 days</p>
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-[11px] text-text-muted">Weighed</dt>
            <dd className="text-base numeric mt-0.5">
              {ws.filter((w) => new Date(w.logged_at) >= subDays(new Date(), 7)).length}×
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-text-muted">Meals logged</dt>
            <dd className="text-base numeric mt-0.5">{fs.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-text-muted">Movement</dt>
            <dd className="text-base numeric mt-0.5">
              {es.reduce((s, e) => s + e.duration_minutes, 0)} min
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-text-muted">Avg mood</dt>
            <dd className="text-base mt-0.5">
              {avgMood !== null
                ? ["😔", "😐", "🙂", "😊", "🥰"][Math.round(avgMood) - 1]
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-text-muted">Wellness logs</dt>
            <dd className="text-base numeric mt-0.5">{ms.length}</dd>
          </div>
        </dl>
      </Card>

      {/* Recent symptoms */}
      {ms.some((m) => m.symptoms && m.symptoms.length) && (
        <Card>
          <p className="text-sm font-medium mb-2">Recent symptoms</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(
              ms.flatMap((m) => m.symptoms ?? []).reduce((map, s) => {
                map.set(s, (map.get(s) ?? 0) + 1);
                return map;
              }, new Map<string, number>())
            )
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <span
                  key={name}
                  className="text-xs bg-accent/30 text-text px-2.5 py-1 rounded-full"
                >
                  {name} · {count}
                </span>
              ))}
          </div>
        </Card>
      )}

      {/* Food by day */}
      <section>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Food log (last 7 days)
        </p>
        <div className="space-y-2">
          {Array.from(foodByDay.entries()).map(([day, items]) => {
            const total = Math.round(items.reduce((s, i) => s + Number(i.calories), 0));
            return (
              <Card key={day}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    {format(new Date(day), "EEE, MMM d")}
                  </p>
                  <p className="text-xs text-text-muted numeric">{total} kcal</p>
                </div>
                <ul className="text-xs text-text-muted space-y-1">
                  {items.slice(0, 8).map((i) => (
                    <li key={i.id} className="flex justify-between">
                      <span className="truncate">
                        <span className="capitalize">{i.meal_type}</span>
                        <span className="text-text-muted/70">
                          {" "}· {localTimeFormatter.format(new Date(i.eaten_at))}
                        </span>{" "}
                        · {i.food_name_snapshot}
                        {i.servings !== 1 && ` × ${i.servings}`}
                      </span>
                      <span className="numeric shrink-0 ml-2">
                        {Math.round(Number(i.calories))}
                      </span>
                    </li>
                  ))}
                  {items.length > 8 && (
                    <li className="text-text-muted">+ {items.length - 8} more</li>
                  )}
                </ul>
              </Card>
            );
          })}
          {foodByDay.size === 0 && (
            <p className="text-center text-text-muted text-sm py-6">
              No food logs in the past week.
            </p>
          )}
        </div>
      </section>

      {/* Exercise by day */}
      <section>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Movement log (last 7 days)
        </p>
        <div className="space-y-2">
          {Array.from(exerciseByDay.entries()).map(([day, items]) => {
            const totalMin = items.reduce((s, i) => s + i.duration_minutes, 0);
            return (
              <Card key={day}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    {format(new Date(day), "EEE, MMM d")}
                  </p>
                  <p className="text-xs text-text-muted numeric">{totalMin} min</p>
                </div>
                <ul className="text-xs text-text-muted space-y-1">
                  {items.map((i) => (
                    <li key={i.id} className="flex justify-between">
                      <span className="truncate">
                        <span className="text-text-muted/70">
                          {localTimeFormatter.format(new Date(i.performed_at))}
                        </span>{" "}
                        · {i.exercise_type}
                        <span className="capitalize"> · {i.intensity}</span>
                      </span>
                      <span className="numeric shrink-0 ml-2">{i.duration_minutes} min</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
          {exerciseByDay.size === 0 && (
            <p className="text-center text-text-muted text-sm py-6">
              No movement logged in the past week.
            </p>
          )}
        </div>
      </section>

      {/* Journal */}
      {ms.some((m) => m.journal_notes) && (
        <section>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Journal</p>
          <div className="space-y-2">
            {ms
              .filter((m) => m.journal_notes)
              .map((m) => (
                <Card key={m.id}>
                  <p className="text-xs text-text-muted">
                    {format(new Date(m.logged_for_date), "EEE, MMM d")}
                  </p>
                  <p className="mt-1.5 text-sm whitespace-pre-wrap leading-relaxed">
                    {m.journal_notes}
                  </p>
                </Card>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}