"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifiedPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the link is opened twice, Supabase may append ?error=...
    const url = new URL(window.location.href);
    const err = url.searchParams.get("error");
    const desc = url.searchParams.get("error_description");
    if (err || desc) setError(desc || err);
  }, []);

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full rounded-2xl border p-6 bg-card">
          <h1 className="text-xl font-semibold mb-2">Verification issue</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Link href="/auth/login" className="inline-flex px-4 py-2 rounded-md bg-black text-white">
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full rounded-2xl border p-6 bg-card">
        <h1 className="text-xl font-semibold mb-2">Email verified 🎉</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your email has been verified successfully. Please login to continue.
        </p>
        <Link href="/auth/login" className="inline-flex px-4 py-2 rounded-md bg-black text-white">
          Go to Login
        </Link>
      </div>
    </main>
  );
}
