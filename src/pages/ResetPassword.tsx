import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // When the user lands here via the email link, Supabase sets a recovery session
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthed(true);
        setLoading(false);
      } else if (event === "SIGNED_IN") {
        // some projects emit SIGNED_IN directly
        setAuthed(true);
        setLoading(false);
      }
    });

    // In case the event already happened before this effect
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) { setAuthed(true); }
      setLoading(false);
    })();

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now sign in." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message ?? "Try again", variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="min-h-[50vh] grid place-items-center text-muted-foreground">Preparing reset…</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <Card className="w-full max-w-sm">
          <CardHeader><CardTitle>Reset link invalid or expired</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please request a new password reset link and open it on this device with your dev server running.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] grid place-items-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Set a new password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pw2">Confirm password</Label>
              <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Update password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
