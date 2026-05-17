import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { WeightCard } from "@/components/cards/weight-card";
import { NourishmentCard, MovementCard } from "@/components/cards/stat-cards";
import { MoodQuickPick } from "@/components/cards/mood-quick-pick";
import { HydrationCard } from "@/components/cards/hydration-card";
import { StreakBadge } from "@/components/cards/streak-badge";
import { calculateStreak, greetingFor } from "@/lib/utils";
import type { Profile, WeightEntry, FoodLog, ExerciseLog, WellnessEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile
  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: Profile | null };

  // Date boundaries
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const startOfToday = new Date(todayStr + "T00:00:00");
  const endOfToday = new Date(todayStr + "T23:59:59");
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Parallel fetch
  const [
    { data: weights },
    { data: foodToday },
    { data: exerciseToday },
    { data: wellness },
    { data: allLoggedDates },
  ] = await Promise.all([
    supabase
      .from("weight_entries")
      .select("*")
      .gte("logged_at", ninetyDaysAgo.toISOString())
      .order("logged_at", { ascending: false }),
    supabase
      .from("food_logs")
      .select("*")
      .gte("eaten_at", startOfToday.toISOString())
      .lte("eaten_at", endOfToday.toISOString())
      .order("eaten_at", { ascending: false }),
    supabase
      .from("exercise_logs")
      .select("*")
      .gte("performed_at", startOfToday.toISOString())
      .lte("performed_at", endOfToday.toISOString())
      .order("performed_at", { ascending: false }),
    supabase
      .from("wellness_entries")
      .select("*")
      .eq("logged_for_date", todayStr)
      .maybeSingle(),
    supabase
      .from("food_logs")
      .select("eaten_at")
      .gte("eaten_at", ninetyDaysAgo.toISOString()),
  ]);

  const wellnessToday = wellness as WellnessEntry | null;

  // Streak: count days with at least one food log (or weight, or exercise — generous)
  const allDates: Date[] = [
    ...(weights ?? []).map((w: WeightEntry) => new Date(w.logged_at)),
    ...(allLoggedDates ?? []).map((f: { eaten_at: string }) => new Date(f.eaten_at)),
  ];
  const streak = calculateStreak(allDates);

  const unit = profile?.unit_system ?? "kg";
  const greeting = greetingFor(now);
  const dayNumber = profile?.treatment_start_date
    ? Math.max(
        1,
        Math.floor(
          (now.getTime() - new Date(profile.treatment_start_date).getTime()) /
            86400000
        ) + 1
      )
    : null;

  return (
    <div className="px-4 pt-6 pb-4 space-y-3">
      <header className="mb-2">
        <p className="text-[11px] text-text-muted tracking-wider uppercase">
          {format(now, "EEEE · MMM d")}
        </p>
        <h1 className="font-serif text-2xl font-medium mt-1">
          {greeting}
          {profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        {dayNumber !== null && (
          <p className="text-xs text-text-muted mt-1">
            Day {dayNumber} of your journey · gentle progress
          </p>
        )}
      </header>

      <StreakBadge streak={streak} />

      <WeightCard entries={(weights ?? []) as WeightEntry[]} unit={unit} />

      <div className="flex gap-3">
        <NourishmentCard logs={(foodToday ?? []) as FoodLog[]} />
        <MovementCard logs={(exerciseToday ?? []) as ExerciseLog[]} />
      </div>

      <MoodQuickPick
        initialMood={wellnessToday?.mood_rating ?? null}
        userId={user.id}
        todayDate={todayStr}
      />

      <HydrationCard
        initialGlasses={wellnessToday?.hydration_glasses ?? 0}
        userId={user.id}
        todayDate={todayStr}
      />
    </div>
  );
}
