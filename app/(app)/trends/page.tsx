"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { kgToLb } from "@/lib/utils";
import type { Profile, WeightEntry, FoodLog, WellnessEntry } from "@/lib/types";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 3650 },
];

export default function TrendsPage() {
  const supabase = createClient();
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [range, setRange] = useState(30);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const since = subDays(new Date(), range).toISOString();
    setLoading(true);
    Promise.all([
      supabase.from("profiles").select("unit_system").single(),
      supabase
        .from("weight_entries")
        .select("*")
        .gte("logged_at", since)
        .order("logged_at", { ascending: true }),
      supabase
        .from("food_logs")
        .select("*")
        .gte("eaten_at", since)
        .order("eaten_at", { ascending: true }),
      supabase
        .from("wellness_entries")
        .select("*")
        .gte("logged_for_date", since.slice(0, 10))
        .order("logged_for_date", { ascending: true }),
    ]).then(([p, w, f, m]) => {
      if (p.data?.unit_system) setUnit(p.data.unit_system as "kg" | "lb");
      setWeights((w.data ?? []) as WeightEntry[]);
      setFoodLogs((f.data ?? []) as FoodLog[]);
      setWellnessLogs((m.data ?? []) as WellnessEntry[]);
      setLoading(false);
    });
  }, [range, supabase]);

  const chartData = useMemo(() => {
    return weights.map((w) => ({
      date: format(new Date(w.logged_at), "MMM d"),
      value: unit === "kg" ? Number(w.weight_kg) : kgToLb(Number(w.weight_kg)),
    }));
  }, [weights, unit]);

  const weeklySummary = useMemo(() => {
    const lastWeek = weights.filter(
      (w) => new Date(w.logged_at) >= subDays(new Date(), 7)
    );
    const avg = lastWeek.length
      ? lastWeek.reduce((s, x) => s + Number(x.weight_kg), 0) / lastWeek.length
      : null;
    const change =
      lastWeek.length >= 2
        ? Number(lastWeek[lastWeek.length - 1].weight_kg) -
          Number(lastWeek[0].weight_kg)
        : 0;
    const moodAvg = wellnessLogs
      .filter((w) => new Date(w.logged_for_date) >= subDays(new Date(), 7))
      .reduce(
        (acc, w) => {
          if (w.mood_rating) {
            acc.sum += w.mood_rating;
            acc.n++;
          }
          return acc;
        },
        { sum: 0, n: 0 }
      );
    const daysLogged = new Set(
      [
        ...foodLogs
          .filter((f) => new Date(f.eaten_at) >= subDays(new Date(), 7))
          .map((f) => f.eaten_at.slice(0, 10)),
        ...lastWeek.map((w) => w.logged_at.slice(0, 10)),
      ]
    ).size;
    return {
      avg,
      change,
      daysLogged,
      moodAvg: moodAvg.n ? moodAvg.sum / moodAvg.n : null,
    };
  }, [weights, foodLogs, wellnessLogs]);

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      <header>
        <p className="text-[11px] text-text-muted tracking-wider uppercase">
          Trends
        </p>
        <h1 className="font-serif text-2xl font-medium mt-1">Your patterns</h1>
      </header>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.days)}
            className={`flex-1 py-2 rounded-md text-sm ${
              range === r.days
                ? "bg-primary text-white"
                : "bg-surface text-text-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Card>
        <p className="text-sm text-text-muted mb-3">Weight ({unit})</p>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-text-muted text-sm">
            Loading…
          </div>
        ) : chartData.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-text-muted text-sm text-center px-4">
            Log a few weights to see your trend here.
          </div>
        ) : (
          <div className="h-48 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 0.5", "dataMax + 0.5"]}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text-muted)" }}
                  formatter={(v: number) => [`${v.toFixed(1)} ${unit}`, "Weight"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: "var(--primary)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-sm text-text-muted mb-3">Last 7 days</p>
        <dl className="grid grid-cols-2 gap-y-3 gap-x-4">
          <div>
            <dt className="text-xs text-text-muted">Average weight</dt>
            <dd className="text-lg numeric mt-0.5">
              {weeklySummary.avg !== null
                ? `${(unit === "kg" ? weeklySummary.avg : kgToLb(weeklySummary.avg)).toFixed(1)} ${unit}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Change</dt>
            <dd className="text-lg numeric mt-0.5">
              {weeklySummary.change !== 0
                ? `${weeklySummary.change > 0 ? "+" : ""}${(unit === "kg" ? weeklySummary.change : kgToLb(weeklySummary.change)).toFixed(1)} ${unit}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Days logged</dt>
            <dd className="text-lg numeric mt-0.5">{weeklySummary.daysLogged}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Average mood</dt>
            <dd className="text-lg mt-0.5">
              {weeklySummary.moodAvg !== null
                ? ["😔", "😐", "🙂", "😊", "🥰"][
                    Math.round(weeklySummary.moodAvg) - 1
                  ]
                : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <ExportCard />
    </div>
  );
}

function ExportCard() {
  const supabase = createClient();
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    const [{ data: weights }, { data: foods }, { data: ex }, { data: well }] =
      await Promise.all([
        supabase.from("weight_entries").select("*"),
        supabase.from("food_logs").select("*"),
        supabase.from("exercise_logs").select("*"),
        supabase.from("wellness_entries").select("*"),
      ]);

    const toCsv = (rows: any[]) => {
      if (!rows.length) return "";
      const keys = Object.keys(rows[0]);
      const escape = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      };
      return [
        keys.join(","),
        ...rows.map((r) => keys.map((k) => escape(r[k])).join(",")),
      ].join("\n");
    };

    const sections = [
      "=== WEIGHT ===\n" + toCsv(weights ?? []),
      "\n\n=== FOOD ===\n" + toCsv(foods ?? []),
      "\n\n=== EXERCISE ===\n" + toCsv(ex ?? []),
      "\n\n=== WELLNESS ===\n" + toCsv(well ?? []),
    ];
    const blob = new Blob([sections.join("")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `serenity-track-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <Card>
      <p className="text-sm font-medium">Export your data</p>
      <p className="text-xs text-text-muted mt-1 mb-3">
        Download everything as a CSV file you can share or keep safe.
      </p>
      <button
        onClick={exportCsv}
        disabled={exporting}
        className="w-full bg-surface-muted text-text rounded-md py-2.5 text-sm disabled:opacity-60"
      >
        {exporting ? "Preparing…" : "Download CSV"}
      </button>
    </Card>
  );
}
