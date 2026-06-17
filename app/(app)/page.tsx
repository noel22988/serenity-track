import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { WeightCard } from "@/components/cards/weight-card";
import { NourishmentCard, MovementCard } from "@/components/cards/stat-cards";
import { MoodQuickPick } from "@/components/cards/mood-quick-pick";
import { HydrationCard } from "@/components/cards/hydration-card";
import { StreakBadge } from "@/components/cards/streak-badge";
import { DashboardFoodList } from "@/components/cards/dashboard-food-list";
import { DashboardExerciseList } from "@/components/cards/dashboard-exercise-list";
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

function shiftDate(s: string, n: number) {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = cookies();
  const tz = cookieStore.get("tz")?.value || "UTC";
  const todayStr = dateStringInTz(new Date(), tz);
  const viewingDate =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : todayStr;

const { start: startOfDay, end: endOfDay } = dayBoundsInTz(viewingDate, tz);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Fetch profile first (needed for day counter, units, hydration prefs)
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;
  const unit = profile?.unit_system ?? "kg";

  // Parallel fetch
  const [
    { data: weights },
    { data: foodToday },
    { data: exerciseToday },
    { data: wellness },
    { data: allLoggedDates },
    { data: myClients },
  ] = await Promise.all([
    supabase
      .from("weight_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", ninetyDaysAgo.toISOString())
      .order("logged_at", { ascending: false }),
    supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("eaten_at", startOfDay.toISOString())
      .lte("eaten_at", endOfDay.toISOString())
      .order("eaten_at", { ascending: true }),
    supabase
      .from("exercise_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("performed_at", startOfDay.toISOString())
      .lte("performed_at", endOfDay.toISOString())
      .order("performed_at", { ascending: true }),
    supabase
      .from("wellness_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("logged_for_date", viewingDate)
      .maybeSingle(),
    supabase
      .from("food_logs")
      .select("eaten_at")
      .eq("user_id", user.id)
      .gte("eaten_at", ninetyDaysAgo.toISOString()),
    supabase
      .from("coach_relationships")
      .select("id")
      .eq("coach_id", user.id),
  ]);

  const wellnessForDay = wellness as WellnessEntry | null;
  const foodEntries = (foodToday ?? []) as FoodLog[];
  const exerciseEntries = (exerciseToday ?? []) as ExerciseLog[];
  const clientCount = (myClients ?? []).length;
  const hasClients = clientCount > 0;

  const isViewingToday = viewingDate === todayStr;
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

  const allDates = (allLoggedDates ?? []).map(
    (r: { eaten_at: string }) => new Date(r.eaten_at)
  );
  const streak = calculateStreak(allDates, tz);

  // Format the viewing date header
  const [vy, vm, vd] = viewingDate.split("-").map(Number);
  const viewingDateObj = new Date(Date.UTC(vy, vm - 1, vd));
  const dayHeader = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(viewingDateObj).toUpperCase();

  // Day counter from treatment_start_date
  let dayCount: number | null = null;
  if (profile?.treatment_start_date) {
    const [sy, sm, sd] = profile.treatment_start_date.split("-").map(Number);
    const start = Date.UTC(sy, sm - 1, sd);
    const [ty, tm, td] = todayStr.split("-").map(Number);
    const today = Date.UTC(ty, tm - 1, td);
    dayCount = Math.floor((today - start) / 86_400_000) + 1;
  }

  const greeting = greetingFor(new Date());
  const displayName = profile?.display_name || "friend";

  return (
    <div className="px-4 pt-6 pb-4 space-y-3">
      <TimezoneCookie />

      {/* Coach shortcut — visible if the current user has at least one client */}
      {hasClients && (
        <Link
          href="/coach"
          className="flex items-center justify-between bg-primary-soft text-text rounded-md px-3 py-2.5 text-sm"
        >
          <span className="flex items-center gap-2">
            <Users size={14} />
            Coach dashboard
          </span>
          <span className="text-xs text-text-muted">
            {clientCount} client{clientCount === 1 ? "" : "s"} →
          </span>
        </Link>
      )}

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-surface rounded-md px-3 py-2 border border-border">
        <Link
          href={`/?date=${prevDate}`}
          className="text-text-muted p-1"
          aria-label="Previous day"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider">
            {dayHeader}
          </p>
          {isViewingToday ? (
            <p className="text-sm">Today</p>
          ) : (
            <Link href="/" className="text-[11px] text-primary">
              Back to today
            </Link>
          )}
        </div>
        <Link
          href={`/?date=${nextDate}`}
          className={`text-text-muted p-1 ${
            isViewingToday ? "opacity-30 pointer-events-none" : ""
          }`}
          aria-label="Next day"
        >
          <ChevronRight size={20} />
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-serif font-light">
          {greeting}, {displayName}
        </h1>
        {dayCount !== null && (
          <p className="text-text-muted text-sm mt-1">
            Day {dayCount} of your journey · gentle progress
          </p>
        )}
      </header>

      {streak > 0 && <StreakBadge streak={streak} />}

      <WeightCard
        entries={(weights ?? []) as WeightEntry[]}
        unit={unit}
        forDate={isViewingToday ? undefined : viewingDate}
        weightsForDay={isViewingToday ? undefined : weightsForDay}
        startingWeightKg={profile?.starting_weight_kg}
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

      <DashboardFoodList entries={foodEntries} />
      <DashboardExerciseList entries={exerciseEntries} />

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

      {/* Journal */}
      {wellnessForDay?.journal_notes && (
        <Card>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1.5">
            Journal
          </p>
          <p className="text-sm whitespace-pre-wrap">
            {wellnessForDay.journal_notes}
          </p>
        </Card>
      )}

      {/* Symptoms / notes */}
      {wellnessForDay?.symptoms && wellnessForDay.symptoms.length > 0 && (
        <Card>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
            Today's notes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {wellnessForDay.symptoms.map((s) => (
              <span
                key={s}
                className="text-xs bg-surface-muted text-text px-2.5 py-1 rounded-full"
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
