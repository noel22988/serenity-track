"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { kgToLb } from "@/lib/utils";
import type { WeightEntry, FoodLog, WellnessEntry } from "@/lib/types";

const RANGES = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
  { value: 9999, label: "All" },
] as const;

type AllTimeStats = {
  totalChangeKg: number;
  daysLogged: number;
  avgMood: number | null;
  longestStreak: number;
  startDate: string | null;
};

export default function TrendsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [range, setRange] = useState<number>(30);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [allTime, setAllTime] = useState<AllTimeStats | null>(null);

  useEffect(() => {
    const since = subDays(new Date(), range).toISOString();
    setLoading(true);
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const [p, w, m] = await Promise.all([
        supabase
          .from("profiles")
          .select("unit_system")
          .eq("id", user.id)
          .single(),
        supabase
          .from("weight_entries")
          .select("*")
          .eq("user_id", user.id)
          .gte("logged_at", since)
          .order("logged_at", { ascending: true }),
        supabase
          .from("wellness_entries")
          .select("*")
          .eq("user_id", user.id)
          .gte("logged_for_date", since.slice(0, 10))
          .order("logged_for_date", { ascending: true }),
      ]);
      if (p.data?.unit_system) setUnit(p.data.unit_system as "kg" | "lb");
      setWeights((w.data ?? []) as WeightEntry[]);
      setWellnessLogs((m.data ?? []) as WellnessEntry[]);
      setLoading(false);

      // All-time stats — fetched once per page load, ignores range
      const [
        { data: allWeights },
        { data: allWellness },
        { data: allFoodDates },
      ] = await Promise.all([
        supabase
          .from("weight_entries")
          .select("weight_kg, logged_at")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: true }),
        supabase
          .from("wellness_entries")
          .select("mood_rating, logged_for_date")
          .eq("user_id", user.id)
          .not("mood_rating", "is", null),
        supabase
          .from("food_logs")
          .select("eaten_at")
          .eq("user_id", user.id),
      ]);

      // Total weight change (first to last entry, in kg)
      const weightsAsc = (allWeights ?? []) as {
        weight_kg: number;
        logged_at: string;
      }[];
      const firstWeight = weightsAsc[0];
      const lastWeight = weightsAsc[weightsAsc.length - 1];
      const totalChangeKg =
        firstWeight && lastWeight
          ? Number(lastWeight.weight_kg) - Number(firstWeight.weight_kg)
          : 0;

      // Average mood across all entries
      const moods = (allWellness ?? [])
        .map((row: { mood_rating: number | null }) => Number(row.mood_rating))
        .filter((n) => Number.isFinite(n));
      const avgMood =
        moods.length > 0
          ? moods.reduce((s, n) => s + n, 0) / moods.length
          : null;

      // Days logged + longest streak (over all food log dates)
      const uniqueDays = new Set<string>();
      const fmt = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      for (const r of allFoodDates ?? []) {
        uniqueDays.add(fmt.format(new Date((r as { eaten_at: string }).eaten_at)));
      }
      const sortedDays = Array.from(uniqueDays).sort();
      const shiftDay = (s: string, n: number) => {
        const [y, mo, d] = s.split("-").map(Number);
        const dt = new Date(Date.UTC(y, mo - 1, d + n));
        return dt.toISOString().slice(0, 10);
      };
      let longestStreak = 0;
      let currentRun = 0;
      let prev: string | null = null;
      for (const d of sortedDays) {
        if (prev === null || d === shiftDay(prev, 1)) {
          currentRun++;
        } else {
          longestStreak = Math.max(longestStreak, currentRun);
          currentRun = 1;
        }
        prev = d;
      }
      longestStreak = Math.max(longestStreak, currentRun);

      setAllTime({
        totalChangeKg,
        daysLogged: uniqueDays.size,
        avgMood,
        longestStreak,
        startDate: firstWeight?.logged_at ?? null,
      });
    })();
  }, [range, supabase]);

  // Last 7 days stats
  const last7Since = subDays(new Date(), 7).getTime();
  const last7Weights = weights.filter(
    (w) => new Date(w.logged_at).getTime() >= last7Since
  );
  const avgWeight =
    last7Weights.length > 0
      ? last7Weights.reduce((s, w) => s + Number(w.weight_kg), 0) /
        last7Weights.length
      : 0;
  const changeKg =
    last7Weights.length >= 2
      ? Number(last7Weights[last7Weights.length - 1].weight_kg) -
        Number(last7Weights[0].weight_kg)
      : 0;
  const daysLogged7 = new Set(
    last7Weights.map((w) => format(new Date(w.logged_at), "yyyy-MM-dd"))
  ).size;

  const moodLast7 = wellnessLogs
    .filter((w) => new Date(w.logged_for_date).getTime() >= last7Since)
    .map((w) => w.mood_rating)
    .filter((n): n is number => n !== null);
  const avgMood7 =
    moodLast7.length > 0
      ? moodLast7.reduce((s, n) => s + n, 0) / moodLast7.length
      : null;

  // Chart data
  const chartData = weights.map((w) => ({
    date: format(new Date(w.logged_at), "MMM d"),
    weight: unit === "kg" ? Number(w.weight_kg) : kgToLb(Number(w.weight_kg)),
  }));

  const weightValues = chartData.map((d) => d.weight);
  const yMin =
    weightValues.length > 0 ? Math.floor(Math.min(...weightValues) - 1) : 0;
  const yMax =
    weightValues.length > 0 ? Math.ceil(Math.max(...weightValues) + 1) : 100;

  // CSV export
  const exportCsv = async () => {
    setExporting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setExporting(false);
      return;
    }
    const [
      { data: allW },
      { data: allF },
      { data: allE },
      { data: allWell },
    ] = await Promise.all([
      supabase.from("weight_entries").select("*").eq("user_id", user.id),
      supabase.from("food_logs").select("*").eq("user_id", user.id),
      supabase.from("exercise_logs").select("*").eq("user_id", user.id),
      supabase.from("wellness_entries").select("*").eq("user_id", user.id),
    ]);

    const sheets: { name: string; rows: Record<string, unknown>[] }[] = [
      { name: "weights", rows: (allW ?? []) as Record<string, unknown>[] },
      { name: "food", rows: (allF ?? []) as Record<string, unknown>[] },
      { name: "exercise", rows: (allE ?? []) as Record<string, unknown>[] },
      { name: "wellness", rows: (allWell ?? []) as Record<string, unknown>[] },
    ];

    let csv = "";
    for (const sheet of sheets) {
      csv += `=== ${sheet.name} ===\n`;
      if (sheet.rows.length === 0) {
        csv += "(no data)\n\n";
        continue;
      }
      const keys = Object.keys(sheet.rows[0]);
      csv += keys.join(",") + "\n";
      for (const row of sheet.rows) {
        csv +=
          keys
            .map((k) => {
              const v = row[k];
              if (v === null || v === undefined) return "";
              const s = String(v);
              return s.includes(",") || s.includes('"') || s.includes("\n")
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            })
            .join(",") + "\n";
      }
      csv += "\n";
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `serenity-track-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      <header>
        <p className="text-xs text-text-muted uppercase tracking-wider">
          Trends
        </p>
        <h1 className="text-3xl font-serif font-light">Your patterns</h1>
      </header>

      {/* Range tabs */}
      <div className="flex gap-2 bg-surface-muted rounded-full p-1">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.value)}
            className={`flex-1 text-sm py-2 rounded-full transition-colors ${
              range === r.value ? "bg-primary text-white" : "text-text-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Weight chart */}
      <Card>
        <p className="text-sm text-text-muted mb-3">Weight ({unit})</p>
        {loading ? (
          <p className="text-text-muted text-sm py-8 text-center">Loading…</p>
        ) : chartData.length < 2 ? (
          <p className="text-text-muted text-sm py-8 text-center">
            Log a few more weights to see your trend.
          </p>
        ) : (
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  domain={[yMin, yMax]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Last 7 days */}
      <Card>
        <p className="text-sm text-text-muted mb-3">Last 7 days</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <p className="text-xs text-text-muted">Average weight</p>
            <p className="text-2xl font-light numeric">
              {avgWeight > 0
                ? `${
                    unit === "kg"
                      ? avgWeight.toFixed(1)
                      : kgToLb(avgWeight).toFixed(1)
                  } ${unit}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Change</p>
            <p className="text-2xl font-light numeric">
              {last7Weights.length >= 2
                ? `${changeKg > 0 ? "+" : ""}${
                    unit === "kg"
                      ? changeKg.toFixed(1)
                      : (changeKg / 0.45359237).toFixed(1)
                  } ${unit}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Days logged</p>
            <p className="text-2xl font-light numeric">{daysLogged7}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Average mood</p>
            <p className="text-2xl font-light numeric">
              {avgMood7 !== null ? avgMood7.toFixed(1) : "—"}
            </p>
          </div>
        </div>
      </Card>

      {/* All time */}
      {allTime && (
        <Card>
          <p className="text-sm text-text-muted mb-3">All time</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <p className="text-xs text-text-muted">Total change</p>
              <p className="text-2xl font-light numeric">
                {allTime.totalChangeKg !== 0
                  ? `${allTime.totalChangeKg > 0 ? "+" : ""}${
                      unit === "kg"
                        ? allTime.totalChangeKg.toFixed(1)
                        : (allTime.totalChangeKg / 0.45359237).toFixed(1)
                    } ${unit}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Days logged</p>
              <p className="text-2xl font-light numeric">
                {allTime.daysLogged}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Average mood</p>
              <p className="text-2xl font-light numeric">
                {allTime.avgMood !== null ? allTime.avgMood.toFixed(1) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Longest streak</p>
              <p className="text-2xl font-light numeric">
                {allTime.longestStreak}
                <span className="text-base text-text-muted ml-1">days</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Export your data */}
      <Card>
        <p className="text-sm font-medium mb-1">Export your data</p>
        <p className="text-xs text-text-muted mb-3">
          Download everything as a CSV file you can share or keep safe.
        </p>
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="flex items-center gap-2 bg-surface-muted text-text px-4 py-2 rounded-sm text-sm disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </Card>
    </div>
  );
}
