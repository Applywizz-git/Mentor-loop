import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function Complete() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const go = async () => {
      try {
        // Allow up to ~10s for Supabase to hydrate session from URL tokens
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getUser();
          const user = data.user;
          const confirmed =
            (user?.email_confirmed_at as any) ||
            (user?.confirmed_at as any) ||
            false;

          if (user && confirmed) {
            const mentorIntent =
              params.get("intent") === "mentor" || user.user_metadata?.mentor_intent;

            // ✅ REQUIREMENT: after confirmation, go straight to Become-Mentor form
            if (mentorIntent) {
              if (!cancelled) navigate("/become-mentor", { replace: true });
              return;
            }

            // Non-mentor intents -> home
            if (!cancelled) navigate("/", { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void go();
    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="max-w-lg w-full px-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Confirming your email…</h1>
        <p className="text-muted-foreground">
          Please wait a moment. You’ll be redirected automatically after confirmation.
        </p>
      </div>
    </div>
  );
}
