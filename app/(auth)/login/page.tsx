"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-12 gap-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-text">Welcome back</h1>
        <p className="text-text-muted mt-2 leading-relaxed">
          Take a breath. You&apos;re in the right place.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
            autoComplete="current-password"
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

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white rounded-md px-4 py-3.5 font-medium mt-2 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-text-muted text-center">
        New here?{" "}
        <Link href="/signup" className="text-primary font-medium">
          Create an account
        </Link>
      </p>
    </main>
  );
}
