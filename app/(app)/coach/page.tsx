import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ChevronRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rels } = await supabase
    .from("coach_relationships")
    .select("id, client_id, created_at")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  const clientIds = (rels ?? []).map((r: any) => r.client_id);

  let clientProfiles: any[] = [];
  if (clientIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, treatment_type")
      .in("id", clientIds);
    clientProfiles = data ?? [];
  }

  const profileMap = new Map(clientProfiles.map((p: any) => [p.id, p]));

  // Latest weight per client (last 90 days, to get freshness)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  let recentWeights: any[] = [];
  if (clientIds.length) {
    const { data } = await supabase
      .from("weight_entries")
      .select("user_id, weight_kg, logged_at")
      .in("user_id", clientIds)
      .gte("logged_at", ninetyDaysAgo.toISOString())
      .order("logged_at", { ascending: false });
    recentWeights = data ?? [];
  }

  const latestByClient = new Map<string, { weight_kg: number; logged_at: string }>();
  for (const w of recentWeights) {
    if (!latestByClient.has((w as any).user_id)) {
      latestByClient.set((w as any).user_id, {
        weight_kg: (w as any).weight_kg,
        logged_at: (w as any).logged_at,
      });
    }
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      <header>
        <p className="text-[11px] text-text-muted tracking-wider uppercase">Coach</p>
        <h1 className="font-serif text-2xl font-medium mt-1">Your clients</h1>
      </header>

      {(!rels || rels.length === 0) && (
        <Card className="text-center py-10">
          <Users size={28} className="mx-auto text-text-muted mb-3" />
          <p className="text-sm text-text-muted leading-relaxed max-w-[260px] mx-auto">
            No clients yet. Ask a client to generate a code in their Settings, then enter it in
            yours.
          </p>
          <Link
            href="/settings"
            className="inline-block mt-4 text-sm text-primary font-medium"
          >
            Go to settings
          </Link>
        </Card>
      )}

      <div className="space-y-2">
        {(rels ?? []).map((r: any) => {
          const p = profileMap.get(r.client_id) as any;
          const latest = latestByClient.get(r.client_id);
          return (
            <Link key={r.id} href={`/coach/${r.client_id}`}>
              <Card className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">
                    {p?.display_name ?? "Client"}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {p?.treatment_type ?? "—"}
                    {latest ? (
                      <>
                        {" · "}
                        <span className="numeric">{Number(latest.weight_kg).toFixed(1)}</span> kg
                        last logged{" "}
                        {new Date(latest.logged_at).toLocaleDateString()}
                      </>
                    ) : (
                      " · no logs yet"
                    )}
                  </p>
                </div>
                <ChevronRight size={18} className="text-text-muted shrink-0" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}