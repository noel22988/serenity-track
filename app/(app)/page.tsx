import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WeightCard } from "@/components/cards/weight-card";
import { NourishmentCard, MovementCard } from "@/components/cards/stat-cards";
import { MoodQuickPick } from "@/components/cards/mood-quick-pick";
import { HydrationCard } from "@/components/cards/hydration-card";
import { StreakBadge } from "@/components/cards/streak-badge";
import { TimezoneCookie } from "@/components/timezone-cookie";
import { Card } from "@/components/ui/card";
import { calculateStreak, greetingFor } from "@/lib/utils";
import { dateStringInTz, dayBoundsInTz } from "@/lib/timezone";
import type {
  Profile,
  WeightEntry,
  FoodLog,
  ExerciseLog,
  WellnessEntry,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// Shift a YYYY-MM-DD date string by n days
function shiftDate(s: string, deltaDays: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

// Relative human-readable label for a date vs today
function relativeLabel(viewingDate: string, todayStr: string): string {
  if (viewingDate === todayStr) return "Today";
  if (viewingDate === shiftDate(todayStr, -1)) return "Yesterday";
  if (viewingDate === shiftDate(todayStr, 1)) return "Tomorrow";
  const a = new Date(viewingDate);
  const b = new Date(todayStr);
  const diff = Math.round((a.getTime() - b.getTime()) / 86_400_000);
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `in ${diff} days`;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: Profile | null };

  const tz = cookies().get("tz")?.value || "UTC";
  const now = new Date();
  const todayStr = dateStringInTz(now, tz);

  // Which day are we viewing?
  const viewingDate =
    searchParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : todayStr;
  const isViewingToday = viewingDate === todayStr;
  const isFuture = viewingDate > todayStr;

  const { start: startOfDay, end: endOfDay } = dayBoundsInTz(viewingDate, tz);
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
      .gte("eaten_at", startOfDay.toISOString())
      .lte("eaten_at", endOfDay.toISOString())
      .order("eaten_at", { ascending: true }),
    supabase
      .from("exercise_logs")
      .select("*")
      .gte("performed_at", startOfDay.toISOString())
      .lte("performed_at", endOfDay.toISOString())
      .order("performed_at", { ascending: true }),
    supabase
      .from("wellness_entries")
      .select("*")
      .eq("logged_for_date", viewingDate)
      .maybeSingle(),
    supabase
      .from("food_logs")
      .select("eaten_at")
      .gte("eaten_at", ninetyDaysAgo.toISOString()),
  ]);

  const wellnessForDay = wellness as WellnessEntry | null;
  const foodEntries = (foodToday ?? []) as FoodLog[];
  const exerciseEntries = (exerciseToday ?? []) as ExerciseLog[];

  // Streak (always based on real today, not viewing date)
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

  const prevDate = shiftDate(viewingDate, -1);
  const nextDate = shiftDate(viewingDate, 1);

  // Filter weight entries to those falling on the viewed date in the user's tz
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weightsForDay = ((weights ?? []) as WeightEntry[]).filter(
    (w) => dateFormatter.format(new Date(w.logged_at)) === viewingDate
  );

  // Format the viewed date for display
  const viewedDateObj = new Date(viewingDate + "T12:00:00Z"); // mid-day to dodge tz edges
  const viewedWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
  }).format(viewedDateObj);
  const viewedMonthDay = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(viewedDateObj);

  // Group food entries by meal type
  const mealOrder: FoodLog["meal_type"][] = ["breakfast", "lunch", "dinner", "snack"];
  const foodByMeal = new Map<FoodLog["meal_type"], FoodLog[]>();
  for (const f of foodEntries) {
    if (!foodByMeal.has(f.meal_type)) foodByMeal.set(f.meal_type, []);
    foodByMeal.get(f.meal_type)!.push(f);
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-3">
      <TimezoneCookie />

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-surface rounded-md px-2 py-2">
        <Link
          href={`/?date=${prevDate}`}
          aria-label="Previous day"
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="text-center">
          <p className="text-[11px] text-text-muted tracking-wider uppercase">
            {viewedWeekday} · {viewedMonthDay}
          </p>
          <p className="text-xs text-text mt-0.5">
            {relativeLabel(viewingDate, todayStr)}
            {!isViewingToday && (
              <>
                {" · "}
                <Link href="/" className="text-primary font-medium">
                  Back to today
                </Link>
              </>
            )}
          </p>
        </div>
        <Link
          href={isFuture ? "#" : `/?date=${nextDate}`}
          aria-label="Next day"
          aria-disabled={nextDate > todayStr}
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            nextDate > todayStr
              ? "text-border pointer-events-none"
              : "text-text-muted hover:bg-surface-muted"
          }`}
        >
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* Greeting (only when viewing today) */}
      {isViewingToday && (
        <header className="mb-2">
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
      )}

      {isViewingToday && <StreakBadge streak={streak} />}

      <WeightCard
        entries={(weights ?? []) as WeightEntry[]}
        unit={unit}
        forDate={isViewingToday ? undefined : viewingDate}
        weightsForDay={isViewingToday ? undefined : weightsForDay}
      />

      <div className="flex gap-3">
        <NourishmentCard
          logs={foodEntries}
          forDate={isViewingToday ? undefined : viewingDate}
        />
        <MovementCard
          logs={exerciseEntries}
          forDate={isViewingToday ? undefined : viewingDate}
        />
      </div>

      {/* Detailed food log for the day */}
      {foodEntries.length > 0 && (
        <Card>
          <p className="text-sm font-medium mb-3">What was eaten</p>
          <div className="space-y-3">
            {mealOrder.map((meal) => {
              const items = foodByMeal.get(meal);
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
                        className="flex items-baseline justify-between text-sm"
                      >
                        <span className="text-text truncate flex-1 pr-2">
                          {item.food_name_snapshot}
                          {Number(item.servings) !== 1 && (
                            <span className="text-text-muted text-xs ml-1">
                              × {item.servings}
                            </span>
                          )}
                        </span>
                        <span className="text-text-muted text-xs numeric shrink-0">
                          {Math.round(Number(item.calories))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Detailed exercise log for the day */}
      {exerciseEntries.length > 0 && (
        <Card>
          <p className="text-sm font-medium mb-3">Movement</p>
          <ul className="space-y-2">
            {exerciseEntries.map((ex) => (
              <li
                key={ex.id}
                className="flex items-baseline justify-between text-sm"
              >
                <span className="text-text">
                  {ex.exercise_type}
                  <span className="text-text-muted text-xs ml-1 capitalize">
                    · {ex.intensity}
                  </span>
                </span>
                <span className="text-text-muted text-xs numeric shrink-0">
                  {ex.duration_minutes} min
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <MoodQuickPick
        initialMood={wellnessForDay?.mood_rating ?? null}
        userId={user.id}
        todayDate={viewingDate}
      />

      <HydrationCard
        initialMl={wellnessForDay?.hydration_ml ?? 0}
        userId={user.id}
        todayDate={viewingDate}
        realToday={todayStr}
        unit={profile?.hydration_unit ?? "glasses"}
        targetMl={profile?.hydration_target_ml ?? 2000}
      />

      {/* Show journal notes if there are any for the day */}
      {wellnessForDay?.journal_notes && (
        <Card>
          <p className="text-sm font-medium mb-2">Journal</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-text">
            {wellnessForDay.journal_notes}
          </p>
        </Card>
      )}

      {/* Show symptoms if any */}
      {wellnessForDay?.symptoms && wellnessForDay.symptoms.length > 0 && (
        <Card>
          <p className="text-sm font-medium mb-2">Symptoms noted</p>
          <div className="flex flex-wrap gap-1.5">
            {wellnessForDay.symptoms.map((s) => (
              <span
                key={s}
                className="text-xs bg-accent/30 text-text px-2.5 py-1 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}