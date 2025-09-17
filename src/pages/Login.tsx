import { useEffect, useState } from "react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  authenticateUser,
  // setCurrentUser,              // ⛔ removed: it likely upserts profiles with on_conflict=user_id
  setCurrentMentorId,
  registerUser,
  // getOrLoadMentorId,          // not used here
} from "@/lib/data";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/applywizz-logo.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { consumePostAuthRedirect, consumePostAuthAction } from "@/lib/auth"; // ✅ keep

type LoginProps = {
  initialMode?: "signin" | "signup";
  redirectTo?: string;
};

const Login = ({ initialMode, redirectTo }: LoginProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");

  // Allow /login?mode=signup to open sign-up directly when not embedded in dialog
  useEffect(() => {
    if (initialMode) return; // dialog controls it
    const q = new URLSearchParams(location.search).get("mode");
    if (q === "signup") setMode("signup");
    if (q === "signin") setMode("signin");
  }, [location.search, initialMode]);

  // ✅ react to password-setup redirects
  useEffect(() => {
    const sp = new URLSearchParams(location.search);

    // From /set-password after successful save
    if (sp.get("pwd_set") === "1") {
      const emailFromSet = (sp.get("email") || "").toLowerCase();
      setMode("signin");
      if (emailFromSet) {
        setLoginData((p) => ({ ...p, email: emailFromSet }));
      }
      toast({
        title: "Password created successfully",
        description: "Please sign in with your new credentials.",
      });
    }

    // Legacy case (if you still land here with ?invited=1)
    if (sp.get("invited") === "1") {
      setMode("signin");
      toast({
        title: "Almost done",
        description: "Please set your password using the link we sent, then sign in.",
      });
    }
  }, [location.search]);

  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const [signupData, setSignupData] = useState({
    email: "",
    mobile: "",
    role: "client" as "client" | "mentor",
    password: "",
    confirm: "",
  });

  const from = (location.state as any)?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginData.email.trim().toLowerCase();
    const password = loginData.password;

    try {
      const user = await authenticateUser(email, password);

      if (user) {
        // ⛔ DO NOT call setCurrentUser(user) here.
        // That helper likely upserts profiles with on_conflict=user_id → 409.
        // We'll proceed without touching profiles table from here.

        // ✅ NEW (single line change): safely link EXACTLY ONE mentors row to this user (no UNIQUE conflicts)
        try {
          await supabase.rpc("link_user_to_single_mentor", {
            p_user_id: user.id,
            p_email: email,
          });
        } catch (rpcErr) {
          // non-fatal; continue login flow even if linking didn't change anything
          console.warn("[login] mentor link rpc error", rpcErr);
        }

        // ✅ Mentor: short-circuit to dashboard if already approved
        if (user.role === "mentor") {
          try {
            // Try by user_id first
            let { data: ment, error: mErr } = await supabase
              .from("mentors")
              .select("id, application_status")
              .eq("user_id", user.id)
              .single();

            // Fallback: match by applicant_email (in case SetPassword linking hasn't run yet)
            if ((mErr || !ment) && email) {
              const res = await supabase
                .from("mentors")
                .select("id, application_status")
                .ilike("applicant_email", email)
                .maybeSingle();
              ment = res.data ?? ment;
            }

            if (ment?.id) setCurrentMentorId(ment.id);

            if (ment?.application_status === "approved") {
              navigate("/dashboard/mentor", { replace: true });
              toast({ title: "Welcome back!", description: "Redirected to your mentor dashboard." });
              return; // ⛔ stop further routing
            }
          } catch {
            // ignore lookup errors; fall through to normal routing below
          }
        }

        // ⚠️ Do not INSERT mentors here. Only read to attach mentor id.
        if (user.role === "mentor") {
          try {
            const { data: m } = await supabase
              .from("mentors")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle();
            if (m?.id) setCurrentMentorId(m.id);
          } catch {}
        }

        // ✅ If we have a pending "resume booking" action, handle it
        const pendingAction = consumePostAuthAction?.();
        if (pendingAction?.type === "resume_booking") {
          const target = `/book/${pendingAction.mentorId}`; // ⬅️ CHANGED to match card flow
          navigate(target, { replace: true });
          try {
            (window as any).dispatchEvent(new CustomEvent("aw:resume-booking", { detail: pendingAction }));
          } catch {}
          toast({ title: "Welcome back!", description: "Continue booking your session." });
          return;
        }

        // Prefer explicit redirectTo prop, then stashed redirect
        const back = redirectTo || consumePostAuthRedirect();
        const finalBack = back && back.startsWith("/book") ? "/mentors" : back;

        // never bounce back to /auth/*
        const unsafe = ["/auth/verify", "/auth/complete"];
        const safeFrom = unsafe.includes(from) ? "/" : from;

        if (user.role === "admin") {
          navigate("/admin", { replace: true });
        } else if (finalBack) {
          navigate(finalBack, { replace: true });
        } else if (user.role === "mentor") {
          // If we reach here, mentor isn't approved yet (or no mentor row found)
          toast({ title: "Application pending", description: "We’ll notify you once approved." });
          navigate("/mentors", { replace: true });
        } else {
          navigate(safeFrom === "/" ? "/mentors" : safeFrom, { replace: true });
        }

        toast({ title: "Welcome back!", description: `Logged in as ${user.role}` });
      } else {
        toast({ title: "Login failed", description: "Invalid credentials.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("[login] supabase error:", err);
      toast({
        title: "Login error",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = signupData.email.trim().toLowerCase();
    const mobile = signupData.mobile.trim();
    const role = signupData.role;
    const password = signupData.password;
    const confirm = signupData.confirm;

    // Basic checks common to both roles
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email like name@example.com",
        variant: "destructive",
      });
      return;
    }
    if (!mobile || mobile.length < 8) {
      toast({ title: "Enter a valid mobile number", variant: "destructive" });
      return;
    }

    const isMentor = role === "mentor";

    // ✅ Mentor flow: skip password fields and go straight to Become Mentor form
    if (isMentor) {
      try {
        // Still block if the email already exists to avoid conflicts later
        const { data: exists, error: existsErr } = await supabase.rpc("email_exists", { _email: email });
        if (existsErr) {
          console.error("[signup] email_exists RPC error:", existsErr);
          toast({ title: "Sign up failed", description: "Please try again.", variant: "destructive" });
          return;
        }
        if (exists) {
          toast({
            title: "Email already exists",
            description: "Try signing in instead or use a different email.",
            variant: "destructive",
          });
          return;
        }

        // No account creation here — just move to mentor application
        const q = new URLSearchParams({ email, mobile }).toString();
        navigate(`/become-mentor?${q}`, { replace: true });
        return;
      } catch (err: any) {
        console.error("[mentor-intent] error:", err);
        toast({
          title: "Sign up failed",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Client flow: require password + confirm and proceed as before
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    try {
      // ✅ STEP 1: check duplicate via secure RPC (no email sent)
      const { data: exists, error: existsErr } = await supabase.rpc("email_exists", { _email: email });
      if (existsErr) {
        console.error("[signup] email_exists RPC error:", existsErr);
        toast({ title: "Sign up failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      if (exists) {
        toast({
          title: "Email already exists",
          description: "Try signing in instead or use a different email.",
          variant: "destructive",
        });
        return;
      }

      // Client flow: create profile, then sign in
      const user = await registerUser({ email, mobile, role, password });

      // Immediately sign them in
      try { await authenticateUser(email, password); } catch {}

      // ⛔ DO NOT call setCurrentUser(user) here either.
      // Avoids profiles upsert with on_conflict=user_id.

      // ✅ NEW: resume booking if a pending action exists
     const pendingAction = consumePostAuthAction();
if (pendingAction?.type === "resume_booking" && pendingAction.mentorId) {
  navigate(`/mentor/${pendingAction.mentorId}?tab=availability`, { replace: true });
  toast({ title: "Welcome back!", description: "Continue booking your session." });
  return;
}


      // Prefer explicit redirectTo prop, then stashed redirect
      const back = redirectTo || consumePostAuthRedirect();
      const finalBack = back && back.startsWith("/book") ? "/mentors" : back;

      toast({ title: "Account created", description: "Welcome! You're signed in as client." });
      navigate(finalBack || "/mentors", { replace: true });
    } catch (err: any) {
      console.error("[register] supabase error:", err);
      toast({
        title: "Sign up failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src={logo} alt="ApplyWizz" className="h-12 mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "signin" ? "Sign in to your account" : "Sign up to get started"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Sign In" : "Sign Up"}</CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "signin" ? (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                  </div>

                  <Button type="submit" className="w-full">Sign In</Button>
                </form>

                <p className="text-center text-sm mt-3">
                  Don’t have an account?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-primary underline underline-offset-4">
                    Sign up
                  </button>
                </p>
              </>
            ) : (
              <>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="su-mobile">Mobile Number</Label>
                    <Input
                      id="su-mobile"
                      type="tel"
                      value={signupData.mobile}
                      onChange={(e) => setSignupData((prev) => ({ ...prev, mobile: e.target.value }))}
                      placeholder="e.g., 9876543210"
                    />
                  </div>

                  <div>
                    <Label>Mentor / Client</Label>
                    <Select
                      value={signupData.role}
                      onValueChange={(v) => setSignupData((prev) => ({ ...prev, role: v as "client" | "mentor" }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="mentor">Mentor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Only show password fields for Client signups */}
                  {signupData.role === "client" && (
                    <>
                      <div>
                        <Label htmlFor="su-pass">Create Password</Label>
                        <Input
                          id="su-pass"
                          type="password"
                          value={signupData.password}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                      </div>

                      <div>
                        <Label htmlFor="su-confirm">Confirm Password</Label>
                        <Input
                          id="su-confirm"
                          type="password"
                          value={signupData.confirm}
                          onChange={(e) => setSignupData((prev) => ({ ...prev, confirm: e.target.value }))}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full">
                    {signupData.role === "mentor" ? "Next" : "Create account"}
                  </Button>
                </form>

                <p className="text-center text-sm mt-3">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="text-primary underline underline-offset-4">
                    Sign in
                  </button>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
