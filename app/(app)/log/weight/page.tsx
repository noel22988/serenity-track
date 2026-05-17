"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { lbToKg } from "@/lib/utils";

export default function LogWeightPage() {
  const router = useRouter();
  const supabase = createClient();
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("unit_system")
      .single()
      .then(({ data }) => {
        if (data?.unit_system) setUnit(data.unit_system);
      });
  }, [supabase]);

  const append = (ch: string) => {
    setValue((v) => {
      if (ch === "." && v.includes(".")) return v;
      if (v.includes(".") && v.split(".")[1].length >= 1) return v;
      if (v === "" && ch === ".") return "0.";
      return (v + ch).slice(0, 5);
    });
  };
  const backspace = () => setValue((v) => v.slice(0, -1));

  const save = async () => {
    const num = parseFloat(value);
    if (!num || saving) return;
    setSaving(true);
    setError(null);
    const weight_kg = unit === "kg" ? num : lbToKg(num);
    const { error } = await supabase.from("weight_entries").insert({
      weight_kg,
      logged_at: new Date().toISOString(),
      notes: note || null,
    });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    router.push("/");
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
        <button
          onClick={() => setUnit(unit === "kg" ? "lb" : "kg")}
          className="text-sm text-text-muted bg-surface-muted px-3 py-1.5 rounded-sm"
        >
          {unit}
        </button>
      </header>

      <div className="mt-4">
        <h1 className="font-serif text-2xl font-medium">Log your weight</h1>
        <p className="text-text-muted mt-1.5 text-sm leading-relaxed">
          Take your time. Numbers are just one part of the picture.
        </p>
      </div>

      <div className="flex items-baseline justify-center gap-2 mt-12">
        <span className="text-6xl font-light numeric">{value || "0.0"}</span>
        <span className="text-xl text-text-muted">{unit}</span>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note — time of day, how you feel…"
        className="mt-8 w-full bg-surface border border-border rounded-md px-4 py-3 text-base min-h-[68px] resize-none"
        rows={2}
      />

      {error && (
        <p className="text-sm text-warn bg-surface-muted px-3 py-2 rounded-sm mt-3">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <NumberPad onPress={append} onBackspace={backspace} />
        <button
          onClick={save}
          disabled={!value || saving}
          className="w-full bg-primary text-white rounded-md py-4 font-medium mt-4 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function NumberPad({
  onPress,
  onBackspace,
}: {
  onPress: (ch: string) => void;
  onBackspace: () => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => (k === "⌫" ? onBackspace() : onPress(k))}
          className="bg-surface text-text rounded-md py-4 text-2xl font-light active:bg-surface-muted"
        >
          {k}
        </button>
      ))}
    </div>
  );
}
