"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Star, Plus, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { defaultMealType } from "@/lib/utils";
import type { Food, FoodLog } from "@/lib/types";

const MEALS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

type Bin = { food: Food; servings: number };

export default function LogFoodPage() {
  const router = useRouter();
  const supabase = createClient();
  const [meal, setMeal] = useState<FoodLog["meal_type"]>(defaultMealType());
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [recent, setRecent] = useState<Food[]>([]);
  const [bin, setBin] = useState<Bin[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  useEffect(() => {
    // Fetch all foods (public + user's own) — limited
    supabase
      .from("foods")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("name", { ascending: true })
      .limit(500)
      .then(({ data }) => setFoods((data ?? []) as Food[]));

    // Recent: last 20 distinct foods user has logged
    supabase
      .from("food_logs")
      .select("food_id, food_name_snapshot, calories, servings")
      .order("eaten_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const seen = new Set<string>();
        const r: Food[] = [];
        for (const row of data ?? []) {
          const key = row.food_name_snapshot;
          if (seen.has(key)) continue;
          seen.add(key);
          r.push({
            id: row.food_id ?? `recent-${key}`,
            user_id: null,
            name: row.food_name_snapshot,
            calories_per_serving: Number(row.calories) / Number(row.servings || 1),
            serving_size: null,
            is_custom: false,
            is_favorite: false,
          });
        }
        setRecent(r.slice(0, 8));
      });
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!query) return foods.slice(0, 30);
    const q = query.toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 30);
  }, [query, foods]);

  const addToBin = (food: Food) => {
    setBin((b) => {
      const existing = b.find((x) => x.food.id === food.id);
      if (existing) {
        return b.map((x) =>
          x.food.id === food.id ? { ...x, servings: x.servings + 1 } : x
        );
      }
      return [...b, { food, servings: 1 }];
    });
  };

  const adjustServings = (id: string, delta: number) => {
    setBin((b) =>
      b
        .map((x) =>
          x.food.id === id
            ? { ...x, servings: Math.max(0, x.servings + delta) }
            : x
        )
        .filter((x) => x.servings > 0)
    );
  };

  const totalCalories = bin.reduce(
    (s, x) => s + x.food.calories_per_serving * x.servings,
    0
  );

  const save = async () => {
    if (bin.length === 0 || saving) return;
    setSaving(true);
    const rows = bin.map((b) => ({
      food_id: b.food.id.startsWith("recent-") ? null : b.food.id,
      food_name_snapshot: b.food.name,
      calories: b.food.calories_per_serving * b.servings,
      servings: b.servings,
      meal_type: meal,
      eaten_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("food_logs").insert(rows);
    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  const toggleFavorite = async (food: Food) => {
    if (!food.user_id && !food.is_custom) {
      // Public food: just toggle locally for now (favorites are own-row only)
      return;
    }
    await supabase
      .from("foods")
      .update({ is_favorite: !food.is_favorite })
      .eq("id", food.id);
    setFoods((fs) =>
      fs.map((f) => (f.id === food.id ? { ...f, is_favorite: !f.is_favorite } : f))
    );
  };

  return (
    <div className="px-4 pt-4 pb-32 min-h-dvh">
      <header className="flex items-center justify-between mb-3">
        <Link
          href="/"
          aria-label="Back"
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-serif text-lg font-medium">Log food</h1>
        <div className="w-10" />
      </header>

      {/* Meal type chips */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-3">
        {MEALS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMeal(m.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              meal === m.value
                ? "bg-primary text-white"
                : "bg-surface-muted text-text-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods…"
          className="w-full bg-surface border border-border rounded-md pl-10 pr-3 py-3 text-base"
        />
      </div>

      {/* Recent foods */}
      {!query && recent.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
            Recent
          </p>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {recent.map((f) => (
              <button
                key={f.id}
                onClick={() => addToBin(f)}
                className="shrink-0 bg-surface px-3 py-2 rounded-md text-sm border border-border"
              >
                <span className="block text-text">{f.name}</span>
                <span className="block text-[11px] text-text-muted numeric">
                  {Math.round(f.calories_per_serving)} kcal
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Food list */}
      <div className="mt-4 space-y-1.5">
        {filtered.map((f) => (
          <FoodRow
            key={f.id}
            food={f}
            onAdd={() => addToBin(f)}
            onFavorite={() => toggleFavorite(f)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-6">
            <p className="text-text-muted text-sm">No results.</p>
            <button
              onClick={() => setShowCustomForm(true)}
              className="mt-3 text-primary text-sm font-medium"
            >
              + Create custom food
            </button>
          </div>
        )}
        {!showCustomForm && (
          <button
            onClick={() => setShowCustomForm(true)}
            className="w-full text-primary text-sm font-medium py-3"
          >
            + Create custom food
          </button>
        )}
      </div>

      {showCustomForm && (
        <CustomFoodForm
          onCreated={(food) => {
            setFoods((fs) => [food, ...fs]);
            addToBin(food);
            setShowCustomForm(false);
            setQuery("");
          }}
          onCancel={() => setShowCustomForm(false)}
        />
      )}

      {/* Bin (multi-add tray) */}
      {bin.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 max-w-[480px] mx-auto bg-surface border-t border-border p-4 z-30">
          <div className="max-h-48 overflow-y-auto mb-3 space-y-1.5">
            {bin.map((b) => (
              <div
                key={b.food.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex-1 truncate">{b.food.name}</span>
                <span className="numeric text-text-muted text-xs w-14 text-right">
                  {Math.round(b.food.calories_per_serving * b.servings)} kcal
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustServings(b.food.id, -1)}
                    className="w-7 h-7 bg-surface-muted rounded-sm flex items-center justify-center"
                    aria-label="Less"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="numeric text-sm w-6 text-center">
                    {b.servings}
                  </span>
                  <button
                    onClick={() => adjustServings(b.food.id, 1)}
                    className="w-7 h-7 bg-surface-muted rounded-sm flex items-center justify-center"
                    aria-label="More"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-primary text-white rounded-md py-3.5 font-medium disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : `Log ${Math.round(totalCalories)} kcal · ${MEALS.find((m) => m.value === meal)?.label}`}
          </button>
        </div>
      )}
    </div>
  );
}

function FoodRow({
  food,
  onAdd,
  onFavorite,
}: {
  food: Food;
  onAdd: () => void;
  onFavorite: () => void;
}) {
  return (
    <div className="w-full bg-surface rounded-md flex items-center border border-border/50 active:bg-surface-muted">
      <button
        onClick={onAdd}
        className="flex-1 text-left px-4 py-3 min-w-0"
      >
        <p className="text-sm text-text truncate">{food.name}</p>
        <p className="text-[11px] text-text-muted numeric">
          {Math.round(food.calories_per_serving)} kcal
          {food.serving_size ? ` · ${food.serving_size}` : ""}
        </p>
      </button>
      <button
        onClick={onFavorite}
        aria-label="Favorite"
        className="px-3 py-3"
      >
        <Star
          size={16}
          className={food.is_favorite ? "fill-warn text-warn" : "text-text-muted"}
        />
      </button>
    </div>
  );
}

function CustomFoodForm({
  onCreated,
  onCancel,
}: {
  onCreated: (food: Food) => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [serving, setServing] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cals = parseFloat(calories);
    if (!name || !cals || saving) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("foods")
      .insert({
        user_id: user.id,
        name,
        calories_per_serving: cals,
        serving_size: serving || null,
        is_custom: true,
      })
      .select()
      .single();
    setSaving(false);
    if (data && !error) onCreated(data as Food);
  };

  return (
    <div className="bg-surface p-4 rounded-md border border-border mt-3 space-y-3">
      <p className="text-sm font-medium">New custom food</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="w-full bg-bg border border-border rounded-sm px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Calories"
          className="flex-1 bg-bg border border-border rounded-sm px-3 py-2 text-sm numeric"
        />
        <input
          value={serving}
          onChange={(e) => setServing(e.target.value)}
          placeholder="Serving (optional)"
          className="flex-1 bg-bg border border-border rounded-sm px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 bg-surface-muted text-text rounded-sm py-2 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!name || !calories || saving}
          className="flex-1 bg-primary text-white rounded-sm py-2 text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
