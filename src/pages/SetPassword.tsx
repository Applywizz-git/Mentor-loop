// src/pages/SetPassword.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Navbar } from "@/components/ui/navbar";

export default function SetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Parse helpers (support code param and hash tokens)
  function getQueryParam(name: string) {
    return new URLSearchParams(location.search).get(name);
  }
  function getHashParam(name: string) {
    const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
    const params = new URLSearchParams(hash);
    return params.get(name);
  }

  // 1) Establish a session from the email link and CLAIM mentor row
  useEffect(() => {
    (async () => {
      try {
        setExchanging(true);

        // Prefer the newer "code" param (GoTrue PKCE)
        const code = getQueryParam("code");
        if (code) {
          // Use string signature for current supabase-js version
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          const userEmail = data.user?.email ?? "";
          setEmail(userEmail);

          // ✅ Link mentor row to this user (no-op if already linked)
          if (userEmail) {
            const { error: claimErr } = await supabase.rpc("claim_mentor_by_email", { _email: userEmail });
            if (claimErr) {
              // non-fatal, just log
              console.warn("[SetPassword] claim_mentor_by_email error:", claimErr.message);
            }
          }

          setLoading(false);
          setExchanging(false);
          return;
        }

        // Fallback: older hash tokens (#access_token & #refresh_token)
        const access_token = getHashParam("access_token");
        const refresh_token = getHashParam("refresh_token");
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;

          const userEmail = data.user?.email ?? "";
          setEmail(userEmail);

          // ✅ Link mentor row (no-op if already linked)
          if (userEmail) {
            const { error: claimErr } = await supabase.rpc("claim_mentor_by_email", { _email: userEmail });
            if (claimErr) {
              console.warn("[SetPassword] claim_mentor_by_email error:", claimErr.message);
            }
          }

          setLoading(false);
          setExchanging(false);
          return;
        }

        // If we get here, there was no token — ask user to use the email link again
        toast({
          title: "Link invalid or expired",
          description: "Please open the password setup link from your email again.",
          variant: "destructive",
        });
        setLoading(false);
        setExchanging(false);
      } catch (e: any) {
        toast({
          title: "Session error",
          description: e?.message ?? "Could not verify your link. Please click the email link again.",
          variant: "destructive",
        });
        setLoading(false);
        setExchanging(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(
    () => pw.length >= 8 && pw === confirm && !!email,
    [pw, confirm, email]
  );

  // 2) Update password, then go DIRECTLY to Mentor Dashboard
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setUpdating(true);

      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      toast({
        title: "Password created successfully",
        description: "Welcome! Taking you to your mentor dashboard.",
      });

      // Optional: small wait so toast appears before route change
      setTimeout(() => {
        navigate("/dashboard/mentor", { replace: true });
      }, 150);
    } catch (e: any) {
      toast({
        title: "Could not set password",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Set Your Password</CardTitle>
          </CardHeader>
        <CardContent>
            {loading || exchanging ? (
              <p className="text-sm text-muted-foreground">Preparing your account…</p>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={email} readOnly />
                </div>
                <div>
                  <Label>Create Password</Label>
                  <Input
                    type="password"
                    placeholder="At least 8 characters"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!canSubmit || updating}>
                  {updating ? "Saving…" : "Save & Continue"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  After saving, you’ll be redirected straight to your mentor dashboard.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
