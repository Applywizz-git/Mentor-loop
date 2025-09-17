"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; 

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr(null); setMsg(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After clicking the email, Supabase redirects here:
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verified`
      }
    });

    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Check your inbox for a verification link.");
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="max-w-sm w-full space-y-4 border p-6 rounded-2xl bg-card">
        <h1 className="text-xl font-semibold">Create account</h1>
        <input
          className="w-full border rounded-md p-2"
          type="email" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)} required
        />
        <input
          className="w-full border rounded-md p-2"
          type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)} required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black text-white py-2 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Sign up"}
        </button>

        {msg && <p className="text-green-600 text-sm">{msg}</p>}
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </form>
    </main>
  );
}
