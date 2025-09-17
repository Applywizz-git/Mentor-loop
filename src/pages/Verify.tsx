import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function Verify() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isMentorIntent = useMemo(() => params.get("intent") === "mentor", [params]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        // Not logged in -> show verify screen.
        if (!user) {
          if (!cancelled) setChecking(false);
          return;
        }

        const confirmed =
          (user.email_confirmed_at as any) || (user.confirmed_at as any) || false;

        // Logged in but not confirmed -> show verify screen
        if (!confirmed) {
          if (!cancelled) setChecking(false);
          return;
        }

        // ✅ REQUIREMENT: already confirmed
        if (isMentorIntent) {
          if (!cancelled) navigate("/become-mentor", { replace: true });
          return;
        }

        if (!cancelled) navigate("/", { replace: true });
      } catch {
        // On any auth error, show verify page so user can finalize via email
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [navigate, isMentorIntent]);

  // Full-screen verify page (only visible when not logged-in OR not-confirmed)
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="max-w-lg w-full px-6 text-center">
        <h1 className="text-3xl font-bold mb-3">Confirm your email to continue</h1>
        <p className="text-muted-foreground mb-6">
          We’ve sent a verification link to your email. Please click the link to verify your account.
          {isMentorIntent && " After verification, we’ll take you to the Become-Mentor application."}
        </p>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Didn’t receive the email? Check your spam folder.</p>
          <p>
            Opened the link already?{" "}
            <Link
              className="text-primary underline underline-offset-4"
              to={isMentorIntent ? "/auth/complete?intent=mentor" : "/auth/complete"}
            >
              Click here to finalize
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
