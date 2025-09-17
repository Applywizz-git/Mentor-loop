// src/lib/auth.ts
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Clear app caches + any Supabase auth tokens so no stale session lingers.
 */
function clearAppCaches() {
  try {
    const APP_KEYS = [
      "currentMentorId",
      "aw.currentUser",
      "currentUser",
      "user",
      "aw.user",
      "postAuthRedirect",   // post-auth redirect stash
      "aw.postAuthAction",  // post-auth action stash
    ];

    // Remove your app's cached items from both storages
    for (const k of APP_KEYS) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }

    // Remove Supabase auth keys (they're prefixed with "sb-" or "supabase.")
    // from both localStorage and sessionStorage.
    const nukeKeys = (store: Storage) => {
      for (let i = store.length - 1; i >= 0; i--) {
        const key = store.key(i);
        if (!key) continue;
        if (key.startsWith("sb-") || key.startsWith("supabase.")) {
          store.removeItem(key);
        }
      }
    };
    nukeKeys(localStorage);
    nukeKeys(sessionStorage);
  } catch {
    // ignore storage errors
  }
}

/* =======================
   Post-auth redirect stash
   ======================= */

const REDIRECT_KEY = "postAuthRedirect";

/** Save a URL we want to land on after login/signup */
export function setPostAuthRedirect(url: string) {
  try {
    if (url) sessionStorage.setItem(REDIRECT_KEY, url);
  } catch {}
}

/** Read and clear the saved post-auth URL */
export function consumePostAuthRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(REDIRECT_KEY);
    if (v) sessionStorage.removeItem(REDIRECT_KEY);
    return v;
  } catch {
    return null;
  }
}

/* ====================================
   Post-auth ACTION stash (resume flow)
   ==================================== */

/** Action payload for flows we want to resume after auth */
export type PostAuthAction = {
  type: "resume_booking";
  mentorId: string;
  packageId?: string;
  slotId?: string;
};

const ACTION_KEY = "aw.postAuthAction";

export function setPostAuthAction(action: PostAuthAction) {
  try { sessionStorage.setItem(ACTION_KEY, JSON.stringify(action)); } catch {}
}

export function consumePostAuthAction(): PostAuthAction | null {
  try {
    const raw = sessionStorage.getItem(ACTION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ACTION_KEY);
    return JSON.parse(raw) as PostAuthAction;
  } catch { return null; }
}


/** Get current user (or null) */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * If logged in, return the user. If not, stash `redirectUrl` and return null.
 * UI can detect `null` and open the Login/Signup modal.
 */
export async function requireAuthOrRedirect(
  redirectUrl: string
): Promise<User | null> {
  const user = await getCurrentUser();
  if (user) return user;

  // Not logged in → remember where to go after auth
  if (redirectUrl) setPostAuthRedirect(redirectUrl);
  return null;
}

let signingOut = false;

export async function logoutAndGo(to: string = "/") {
  if (signingOut) return;
  signingOut = true;

  try {
    // Proactively close realtime channels to stop any post-logout callbacks
    try {
      const channels = supabase.getChannels();
      for (const ch of channels) supabase.removeChannel(ch);
    } catch {
      // ignore
    }

    // Sign out (local scope is enough for this browser)
    // Race with a short timeout so slow networks never block the redirect
    await Promise.race([
      supabase.auth.signOut({ scope: "local" }),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
  } finally {
    clearAppCaches();
    signingOut = false;

    // Hard redirect so the whole app remounts from a clean auth state
    // (use assign so back button returns to pre-logout page if desired)
    window.location.assign(to);
  }
}
