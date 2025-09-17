// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  console.warn(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Create .env.local and restart the dev server."
  );
}

// Use a global to reuse the client between HMR reloads
const g = globalThis as unknown as {
  __sb?: ReturnType<typeof createClient<any>>; // 👈 note the <any>
};

// 👇 The <any> generic prevents the 'never' overload errors in your .insert/.rpc calls
export const supabase =
  g.__sb ??
  createClient<any>(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "mentorloop-auth-v1",
    },
  });

g.__sb = supabase;
