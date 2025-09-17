// src/routes/RequireAuth.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { setPostAuthRedirect } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [checking, setChecking] = useState(true);
  const [needAuth, setNeedAuth] = useState(false);

  const here = useMemo(() => `${loc.pathname}${loc.search || ""}`, [loc.pathname, loc.search]);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setChecking(false);
        setNeedAuth(false);
        return;
      }

      // not logged in → remember and open auth modal
      setPostAuthRedirect(here);
      setNeedAuth(true);
      setChecking(false);

      // if login happens in this tab, continue automatically
      const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
        if (session?.user) {
          setNeedAuth(false);
          nav(here, { replace: true });
        }
      });
      unsub = sub?.subscription?.unsubscribe;
    })();

    return () => {
      try { unsub?.(); } catch {}
    };
  }, [here, nav]);

  if (checking) return null;

  if (needAuth) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Login / Sign Up</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Please login or create an account to book this session.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => nav(`/login?mode=signup`, { replace: false })}
            >
              Sign Up
            </Button>
            <Button onClick={() => nav(`/login?mode=signin`, { replace: false })}>
              Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
