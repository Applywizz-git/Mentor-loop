// src/hooks/useAuthUser.ts
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  role?: string | null;
  verified?: boolean | null;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
};

export function useAuthUser() {
  const [user, setUser] = useState<null | { id: string; email?: string | null }>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // prevent double subscription in React 18 StrictMode
  const subscribed = useRef(false);

  async function loadProfile(userId: string) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, role, verified, name, email, avatar")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();
    setProfile(prof ?? null);
  }

  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;

    (async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const s = sessionData.session;
      setUser(s?.user ? { id: s.user.id, email: s.user.email } : null);
      if (s?.user?.id) await loadProfile(s.user.id);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Use the session provided by Supabase (no extra network call)
      const u = session?.user ?? null;
      setUser(u ? { id: u.id, email: u.email } : null);

      if (u?.id) {
        // fire-and-forget; UI updates when profile arrives
        loadProfile(u.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      subscribed.current = false;
    };
  }, []);

  return { user, profile, loading };
}
