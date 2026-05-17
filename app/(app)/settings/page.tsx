"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Copy, Check, Trash2, Users, UserPlus, Eye } from "lucide-react";
import type { Profile, CoachInvite } from "@/lib/types";

type LinkedClient = {
  relationship_id: string;
  client_id: string;
  client_name: string | null;
  created_at: string;
};

type LinkedCoach = {
  relationship_id: string;
  coach_id: string;
  coach_name: string | null;
  created_at: string;
};

function makeCode() {
  // 8-char human-friendly code, no ambiguous chars
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [hydrationUnit, setHydrationUnit] = useState<"glasses" | "ml">("glasses");
  const [hydrationTarget, setHydrationTarget] = useState(2000);
  const [treatmentType, setTreatmentType] = useState("");
  const [treatmentStart, setTreatmentStart] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [email, setEmail] = useState("");

  // Coach state
  const [activeInvite, setActiveInvite] = useState<CoachInvite | null>(null);
  const [coachCodeInput, setCoachCodeInput] = useState("");
  const [coachActionMsg, setCoachActionMsg] = useState<string | null>(null);
  const [coachActionError, setCoachActionError] = useState<string | null>(null);
  const [linkedClients, setLinkedClients] = useState<LinkedClient[]>([]);
  const [linkedCoaches, setLinkedCoaches] = useState<LinkedCoach[]>([]);
  const [copied, setCopied] = useState(false);

  // Reset state
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  // Load initial data
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (user.email) setEmail(user.email);

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) {
        setProfile(p as Profile);
        setDisplayName(p.display_name ?? "");
        setUnit(p.unit_system ?? "kg");
        setHydrationUnit(p.hydration_unit ?? "glasses");
        setHydrationTarget(p.hydration_target_ml ?? 2000);
        setTreatmentType(p.treatment_type ?? "");
        setTreatmentStart(p.treatment_start_date ?? "");
      }

      // Active (unused, unexpired) invite
      const { data: inv } = await supabase
        .from("coach_invites")
        .select("*")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (inv) setActiveInvite(inv as CoachInvite);

      // My linked clients (I'm a coach for them)
      const { data: asCoach } = await supabase
        .from("coach_relationships")
        .select("id, client_id, created_at")
        .eq("coach_id", user.id);
      if (asCoach && asCoach.length) {
        const clientIds = asCoach.map((r: any) => r.client_id);
        const { data: clientProfiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", clientIds);
        const nameMap = new Map(
          (clientProfiles ?? []).map((c: any) => [c.id, c.display_name])
        );
        setLinkedClients(
          asCoach.map((r: any) => ({
            relationship_id: r.id,
            client_id: r.client_id,
            client_name: nameMap.get(r.client_id) ?? null,
            created_at: r.created_at,
          }))
        );
      }

      // My coaches (they can see my data)
      const { data: asClient } = await supabase
        .from("coach_relationships")
        .select("id, coach_id, created_at")
        .eq("client_id", user.id);
      if (asClient && asClient.length) {
        const coachIds = asClient.map((r: any) => r.coach_id);
        const { data: coachProfiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", coachIds);
        const nameMap = new Map(
          (coachProfiles ?? []).map((c: any) => [c.id, c.display_name])
        );
        setLinkedCoaches(
          asClient.map((r: any) => ({
            relationship_id: r.id,
            coach_id: r.coach_id,
            coach_name: nameMap.get(r.coach_id) ?? null,
            created_at: r.created_at,
          }))
        );
      }
    };
    load();
  }, [supabase]);

  // Debounced profile auto-save
  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(async () => {
      await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          unit_system: unit,
          hydration_unit: hydrationUnit,
          hydration_target_ml: hydrationTarget,
          treatment_type: treatmentType || null,
          treatment_start_date: treatmentStart || null,
        })
        .eq("id", profile.id);
      setSavedAt(new Date());
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, unit, hydrationUnit, hydrationTarget, treatmentType, treatmentStart]);

  // ---------- Coach actions ----------
  const generateInvite = async () => {
    setCoachActionError(null);
    setCoachActionMsg(null);
    if (!profile) return;
    const code = makeCode();
    const { data, error } = await supabase
      .from("coach_invites")
      .insert({ code, client_id: profile.id })
      .select()
      .single();
    if (error) {
      setCoachActionError(error.message);
      return;
    }
    setActiveInvite(data as CoachInvite);
  };

  const revokeInvite = async () => {
    if (!activeInvite) return;
    await supabase.from("coach_invites").delete().eq("code", activeInvite.code);
    setActiveInvite(null);
  };

  const acceptCode = async () => {
    setCoachActionError(null);
    setCoachActionMsg(null);
    const code = coachCodeInput.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase.rpc("redeem_coach_invite", { invite_code: code });
    if (error) {
      setCoachActionError(error.message);
      return;
    }
    setCoachActionMsg("Linked. You can now see this client in Coach view.");
    setCoachCodeInput("");
    // Refresh linked clients
    router.refresh();
    setTimeout(() => router.refresh(), 400);
  };

  const unlinkRelationship = async (relationshipId: string, kind: "coach" | "client") => {
    await supabase.from("coach_relationships").delete().eq("id", relationshipId);
    if (kind === "coach") {
      setLinkedClients((cs) => cs.filter((c) => c.relationship_id !== relationshipId));
    } else {
      setLinkedCoaches((cs) => cs.filter((c) => c.relationship_id !== relationshipId));
    }
  };

  const copyInvite = async () => {
    if (!activeInvite) return;
    await navigator.clipboard.writeText(activeInvite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ---------- Reset action ----------
  const resetEverything = async () => {
    if (resetConfirmText !== "RESET") return;
    setResetting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Delete in order. RLS will scope to current user automatically.
    await supabase.from("weight_entries").delete().eq("user_id", user.id);
    await supabase.from("food_logs").delete().eq("user_id", user.id);
    await supabase.from("exercise_logs").delete().eq("user_id", user.id);
    await supabase.from("wellness_entries").delete().eq("user_id", user.id);
    await supabase.from("foods").delete().eq("user_id", user.id);
    await supabase.from("coach_invites").delete().eq("client_id", user.id);
    await supabase
      .from("coach_relationships")
      .delete()
      .or(`coach_id.eq.${user.id},client_id.eq.${user.id}`);

    setResetting(false);
    setShowResetForm(false);
    setResetConfirmText("");
    router.push("/");
    router.refresh();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      <header>
        <p className="text-[11px] text-text-muted tracking-wider uppercase">Settings</p>
        <h1 className="font-serif text-2xl font-medium mt-1">Your space</h1>
      </header>

      {/* Profile */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Profile</p>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-bg border border-border rounded-sm px-3 py-2 text-sm"
          />
        </label>
        <div>
          <p className="text-xs text-text-muted">Email</p>
          <p className="text-sm mt-0.5">{email}</p>
        </div>
      </Card>

      {/* Display */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Display</p>
        <div>
          <p className="text-xs text-text-muted mb-1.5">Weight units</p>
          <div className="flex gap-2">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`flex-1 py-2 rounded-sm text-sm ${
                  unit === u
                    ? "bg-primary text-white"
                    : "bg-bg text-text-muted border border-border"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1.5">Theme</p>
          <div className="flex gap-2">
            {(["light", "system", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-2 rounded-sm text-sm capitalize ${
                  theme === t
                    ? "bg-primary text-white"
                    : "bg-bg text-text-muted border border-border"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Hydration */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Hydration</p>
        <div>
          <p className="text-xs text-text-muted mb-1.5">Measure in</p>
          <div className="flex gap-2">
            {(["glasses", "ml"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setHydrationUnit(u)}
                className={`flex-1 py-2 rounded-sm text-sm ${
                  hydrationUnit === u
                    ? "bg-primary text-white"
                    : "bg-bg text-text-muted border border-border"
                }`}
              >
                {u === "glasses" ? "Glasses" : "Millilitres"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Daily target (mL)</span>
          <input
            type="number"
            step={100}
            min={500}
            max={6000}
            value={hydrationTarget}
            onChange={(e) => setHydrationTarget(parseInt(e.target.value) || 2000)}
            className="bg-bg border border-border rounded-sm px-3 py-2 text-sm numeric"
          />
          <span className="text-[11px] text-text-muted">
            {hydrationUnit === "glasses"
              ? `≈ ${Math.round(hydrationTarget / 250)} glasses (250 mL each)`
              : ""}
          </span>
        </label>
      </Card>

      {/* Treatment */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Treatment</p>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Treatment type (optional)</span>
          <input
            value={treatmentType}
            onChange={(e) => setTreatmentType(e.target.value)}
            placeholder="e.g. GLP-1, post-bariatric…"
            className="bg-bg border border-border rounded-sm px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Start date</span>
          <input
            type="date"
            value={treatmentStart}
            onChange={(e) => setTreatmentStart(e.target.value)}
            className="bg-bg border border-border rounded-sm px-3 py-2 text-sm"
          />
        </label>
      </Card>

      {/* Coach access — I'm a client sharing with a coach */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus size={16} className="text-primary" />
          <p className="text-sm font-medium">Share with a coach</p>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Generate a code and share it with your coach. They&apos;ll be able to see your weight,
          food, exercise, and wellness logs in read-only mode. Codes expire after 14 days or once
          used.
        </p>

        {activeInvite ? (
          <div className="bg-surface-muted rounded-sm p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="numeric tracking-widest text-lg font-medium flex-1">
                {activeInvite.code}
              </span>
              <button
                onClick={copyInvite}
                className="w-8 h-8 rounded-sm bg-bg flex items-center justify-center"
                aria-label="Copy code"
              >
                {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-text-muted">
              Expires {new Date(activeInvite.expires_at).toLocaleDateString()}
            </p>
            <button
              onClick={revokeInvite}
              className="text-xs text-text-muted underline"
            >
              Revoke this code
            </button>
          </div>
        ) : (
          <button
            onClick={generateInvite}
            className="w-full bg-primary-soft text-text rounded-sm py-2.5 text-sm"
          >
            Generate coach code
          </button>
        )}

        {linkedCoaches.length > 0 && (
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs text-text-muted">Currently shared with</p>
            {linkedCoaches.map((c) => (
              <div
                key={c.relationship_id}
                className="flex items-center justify-between bg-surface-muted rounded-sm px-3 py-2"
              >
                <span className="text-sm">{c.coach_name ?? "Coach"}</span>
                <button
                  onClick={() => unlinkRelationship(c.relationship_id, "client")}
                  className="text-xs text-text-muted underline"
                >
                  Stop sharing
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Coach access — I'm a coach */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <p className="text-sm font-medium">Coach view</p>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Enter a code from someone who wants to share their data with you.
        </p>
        <div className="flex gap-2">
          <input
            value={coachCodeInput}
            onChange={(e) => setCoachCodeInput(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="flex-1 bg-bg border border-border rounded-sm px-3 py-2 text-sm numeric tracking-widest"
            maxLength={8}
          />
          <button
            onClick={acceptCode}
            disabled={!coachCodeInput}
            className="bg-primary text-white px-4 rounded-sm text-sm disabled:opacity-60"
          >
            Link
          </button>
        </div>
        {coachActionError && (
          <p className="text-xs text-warn bg-surface-muted px-3 py-2 rounded-sm">
            {coachActionError}
          </p>
        )}
        {coachActionMsg && (
          <p className="text-xs text-text bg-primary-soft px-3 py-2 rounded-sm">{coachActionMsg}</p>
        )}

        {linkedClients.length > 0 && (
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs text-text-muted">Your clients</p>
            {linkedClients.map((c) => (
              <div
                key={c.relationship_id}
                className="flex items-center justify-between bg-surface-muted rounded-sm px-3 py-2"
              >
                <span className="text-sm">{c.client_name ?? "Client"}</span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/coach/${c.client_id}`}
                    className="text-xs text-primary flex items-center gap-1"
                  >
                    <Eye size={12} />
                    View
                  </Link>
                  <button
                    onClick={() => unlinkRelationship(c.relationship_id, "coach")}
                    className="text-xs text-text-muted underline"
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ))}
            <Link
              href="/coach"
              className="block text-center text-sm text-primary mt-2 font-medium"
            >
              Open coach dashboard →
            </Link>
          </div>
        )}
      </Card>

      {savedAt && (
        <p className="text-[11px] text-text-muted text-center">
          Saved {savedAt.toLocaleTimeString()}
        </p>
      )}

      {/* Danger zone */}
      <Card className="space-y-3 border border-warn/30">
        <div className="flex items-center gap-2">
          <Trash2 size={16} className="text-warn" />
          <p className="text-sm font-medium">Reset everything</p>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Permanently delete all your logs (weight, food, exercise, wellness), custom foods, and
          coach links. Your account stays — only your data is removed. This cannot be undone.
        </p>
        {!showResetForm ? (
          <button
            onClick={() => setShowResetForm(true)}
            className="w-full bg-surface-muted text-text rounded-sm py-2.5 text-sm"
          >
            Start reset
          </button>
        ) : (
          <div className="space-y-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">
                Type <span className="font-medium text-text">RESET</span> to confirm
              </span>
              <input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                className="bg-bg border border-warn/40 rounded-sm px-3 py-2 text-sm tracking-widest"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowResetForm(false);
                  setResetConfirmText("");
                }}
                className="flex-1 bg-surface-muted text-text rounded-sm py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={resetEverything}
                disabled={resetConfirmText !== "RESET" || resetting}
                className="flex-1 bg-warn text-white rounded-sm py-2 text-sm disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Reset everything"}
              </button>
            </div>
          </div>
        )}
      </Card>

      <button
        onClick={signOut}
        className="w-full bg-surface-muted text-text rounded-md py-3 text-sm mt-2"
      >
        Sign out
      </button>

      <p className="text-[11px] text-text-muted text-center pt-2">Serenity Track · v0.2</p>
    </div>
  );
}