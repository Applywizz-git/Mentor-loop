import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type GateState = "checking" | "approved" | "pending" | "none" | "error";

export default function MentorGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<GateState>("checking");
  const [message, setMessage] = useState<string>("");

  async function getCurrentUserId(): Promise<string | null> {
    // Fast path: session is read from memory/storage without network
    const { data: sess } = await supabase.auth.getSession();
    const fastUserId = sess?.session?.user?.id ?? null;
    if (fastUserId) return fastUserId;

    // Fallback (rare): may do a network call
    const { data: auth } = await supabase.auth.getUser();
    return auth?.user?.id ?? null;
  }

  async function checkStatus() {
    try {
      setState("checking");

      // 1) Auth user
      const userId = await getCurrentUserId();
      if (!userId) {
        // IMPORTANT: leave "checking" state to avoid blank screen while we redirect
        setState("none");
        // ⬅️ go to HOME, not /login
        navigate("/", { replace: true });
        return;
      }

      // 2) Load profile in a single query (handles both legacy rows and new rows)
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, verified, email")
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();
      if (profErr) throw profErr;

      const profileId = profile?.id ?? null;

      // 3) Find mentor row for THIS user/profile (single call)
      const { data: mentor, error: mentorErr } = await supabase
        .from("mentors")
        .select("id, application_status, user_id, profile_id")
        .or(
          [
            `user_id.eq.${userId}`,
            profileId ? `profile_id.eq.${profileId}` : "",
          ]
            .filter(Boolean)
            .join(",")
        )
        .maybeSingle();
      if (mentorErr) throw mentorErr;

      // No mentor row yet -> hasn't applied
      if (!mentor) {
        setMessage("You haven’t started a mentor application yet.");
        setState("none");
        return;
      }

      // 4) Approved -> just let them in (NO writes here)
      if (mentor.application_status === "approved") {
        setMessage("");
        setState("approved");
        return;
      }

      // 5) Not approved yet
      setMessage("Your mentor application is pending admin approval.");
      setState("pending");
    } catch (e: any) {
      setMessage(e?.message ?? "Something went wrong while checking your status.");
      setState("error");
    }
  }

  useEffect(() => {
    checkStatus();

    // Re-check on auth changes; use session from callback to decide fast
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      if (!uid) {
        // signed out -> leave checking state and go home
        setState("none");
        navigate("/", { replace: true });
        return;
      }
      // signed in -> re-run gate check
      checkStatus();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "checking") return null; // no flash

  if (state === "approved") return <>{children}</>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Mentor Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">{message}</p>

          <div className="flex gap-2 pt-2">
            {state === "none" && (
              <Button asChild>
                <a href="/become-mentor">Apply to become a mentor</a>
              </Button>
            )}

            {(state === "pending" || state === "none" || state === "error") && (
              <Button variant="outline" onClick={checkStatus}>
                Refresh status
              </Button>
            )}

            <Button variant="ghost" onClick={() => navigate("/")}>
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
