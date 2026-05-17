"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split("@")[0] },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      setInfo("Check your email to confirm your account, then come back to sign in.");
    }
  };

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-12 gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-text">Create your space</h1>
        <p className="text-text-muted mt-2 leading-relaxed">
          A gentle place to track your journey, at your own pace.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-muted">Name (optional)</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-surface border border-border rounded-md px-4 py-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-surface border border-border rounded-md px-4 py-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-muted">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface border border-border rounded-md px-4 py-3 text-base"
          />
        </label>

        {error && (
          <p className="text-sm text-warn bg-surface-muted px-3 py-2 rounded-sm">
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm text-text bg-primary-soft px-3 py-2 rounded-sm">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white rounded-md px-4 py-3.5 font-medium mt-2 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-text-muted text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium">
          Sign in
        </Link>
      </p>
    </main>
  );
}
