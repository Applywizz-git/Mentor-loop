import {
  Mentor, WeeklySlot, TimeOff, TimeSlot, SessionPackage,
  Booking, BookingStatus, User, AdminStats, ContactForm, CurrencyCode,
  ApplicationStatus,
} from "./types";
import { supabase } from "@/lib/supabase";
import { Notification } from "./types";
import { getCurrentUser as getAuthCurrentUser } from "@/lib/auth";

export type EmploymentBlock = {
  company: string;
  from_year: number;
  to_year?: number | null;
  designation: string;
};

/* =========================================================
   LocalStorage helpers (kept so your UI doesn't break)
   ========================================================= */
const LS = (() => {
  try { return window?.localStorage ?? null } catch { return null }
})();
const MENTOR_ID_CACHE_KEY = "currentMentorId";
const KEY = {
  users: 'mc.users',
  mentors: 'mc.mentors',
  slots: 'mc.slots',
  bookings: 'mc.bookings',
  reviews: 'mc.reviews',
  currentUser: 'mc.currentUser',
  currentMentorId: 'mc.currentMentorId',
  contact: 'mc.contact',
  auth: 'mc.auth',
} as const;

type Id = string;

const nowIso = () => new Date().toISOString();
const uuid = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

function read<T>(k: string, fallback: T): T {
  if (!LS) return fallback;
  const raw = LS.getItem(k);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T } catch { return fallback }
}
function write<T>(k: string, v: T) {
  if (!LS) return;
  LS.setItem(k, JSON.stringify(v));
}
function upsert<T extends { id: Id }>(k: string, item: T) {
  const arr = read<T[]>(k, []);
  const idx = arr.findIndex(x => x.id === item.id);
  if (idx >= 0) arr[idx] = item; else arr.push(item);
  write(k, arr);
  return item;
}
/** Supabase FK joins sometimes return an array; sometimes an object. */
function firstOrUndefined<T = any>(x: any): T | undefined {
  return Array.isArray(x) ? (x[0] as T | undefined) : (x as T | undefined);
}

/** Normalize any DB status string to our union type */
function normalizeStatus(x: any, fallback: ApplicationStatus): ApplicationStatus {
  const raw = String(x ?? fallback).toLowerCase();
  if (raw === "approved" || raw === "pending" || raw === "rejected") {
    return raw as ApplicationStatus;
  }
  return fallback;
}

/* =========================================================
   0) Seed: NO-OP (prevents demo overwrites)
   ========================================================= */
export function seedDemoData() {
  // no-op
}

/* =========================================================
   1) AUTH — Supabase-backed, but also keeps your cache in sync
   ========================================================= */
type RoleLite = "client" | "mentor" | "admin";
type AuthUser = {
  id: Id;
  email: string;
  mobile: string;
  role: RoleLite;
  password: string;
};

function getAuthUsers(): AuthUser[] { return read<AuthUser[]>(KEY.auth, []); }
function saveAuthUsers(list: AuthUser[]) { write(KEY.auth, list); }

function cacheCurrentUser(u: { id: string; role: RoleLite; name: string; email: string; avatar?: string; mentorId?: string }) {
  write(KEY.currentUser, u as User);
}

export async function registerUser(args: {
  email: string;
  mobile: string;
  role: RoleLite;
  password: string;
}) {
  const email = args.email.trim();
  const mobile = args.mobile.trim();
  const role = args.role;
  const password = args.password;

  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { mobile, role } },
  });
  if (signUpErr) throw signUpErr;

  if (!signUpData.session) {
    const { data: s2, error: e2 } = await supabase.auth.signInWithPassword({ email, password });
    if (e2) throw e2;
  }

  await claimApprovedMentorForCurrentUser();

  const { data: uinfo } = await supabase.auth.getUser();
  const uid = uinfo?.user?.id;
  if (!uid) throw new Error("No session after sign up");

  const { data: profUp, error: profErr } = await supabase
    .from("profiles")
    .upsert(
      {
        id: uid,
        user_id: uid,
        name: email.split("@")[0],
        email,
        role,
        phone: mobile,
        verified: role === "client",
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();
  if (profErr) throw profErr;
  const profileId = profUp?.id;

  if (role === "mentor" && profileId) {
    const { data: existingMentor, error: selErr } = await supabase
      .from("mentors")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();
    if (selErr) throw selErr;

    if (!existingMentor?.id) {
      const { error: insErr } = await supabase
        .from("mentors")
        .insert({
          user_id: uid,
          profile_id: profileId,
          availability: "high",
          reviews: 0,
          application_status: 'pending' as ApplicationStatus
        });
      if (insErr) throw insErr;
    }
  }

  cacheCurrentUser({ id: uid, role, name: email.split("@")[0], email });

  const exists = getAuthUsers().some(u => u.email.toLowerCase() === email.toLowerCase());
  if (!exists) {
    const authRec: AuthUser = { id: uid, email, mobile, role, password };
    const auths = getAuthUsers(); auths.push(authRec); saveAuthUsers(auths);
  }

  return { id: uid, role, name: email.split("@")[0], email } as User;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return null;

  const { data: uinfo } = await supabase.auth.getUser();
  const uid = uinfo?.user?.id;
  if (!uid) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role, name, email, avatar")
    .eq("user_id", uid)
    .maybeSingle();

  if (!existing) {
    const roleFromMeta = (uinfo.user?.user_metadata?.role as "client" | "mentor" | "admin") ?? "client";
    const mobileFromMeta = (uinfo.user?.user_metadata?.mobile as string | undefined) ?? null;
    const nameFromEmail = (uinfo.user?.email ?? "").split("@")[0];

    const { data: prof, error: upErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: uid,
          user_id: uid,
          name: nameFromEmail,
          email: uinfo.user?.email ?? "",
          role: roleFromMeta,
          phone: mobileFromMeta,
          verified: roleFromMeta === "client",
        },
        { onConflict: "id" }
      )
      .select("id, role, name, email, avatar")
      .single();
    if (upErr) throw upErr;

    if (prof?.id && roleFromMeta === "mentor") {
      const { data: mExisting, error: mSelErr } = await supabase
        .from("mentors")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (mSelErr) throw mSelErr;

      if (!mExisting?.id) {
        const { error: mInsErr } = await supabase
          .from("mentors")
          .insert({
            user_id: uid,
            profile_id: prof.id,
            availability: "high",
            reviews: 0,
            application_status: 'pending' as ApplicationStatus
          });
        if (mInsErr) throw mInsErr;
      }
    }
  }

  try {
    const { data: m } = await supabase
      .from("mentors")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();
    if (m?.id) {
      setCurrentMentorId(m.id);
    }
  } catch {}

  const { data: prof2 } = await supabase
    .from("profiles")
    .select("user_id, name, email, role, avatar")
    .eq("user_id", uid)
    .maybeSingle();

  const name = prof2?.name ?? (email.split("@")[0]);
  const role = (prof2?.role as "client" | "mentor" | "admin") ?? "client";
  const avatar = prof2?.avatar ?? "";

  const current: User = { id: uid, role, name, email, avatar };
  cacheCurrentUser(current);
  return current;
}

export function isAuthenticated(): boolean {
  return !!read<User | null>(KEY.currentUser, null);
}
export function getCurrentUser(): User {
  const u = read<User | null>(KEY.currentUser, null);
  if (!u) return { id: 'anon', role: 'client', name: 'Guest', email: 'guest@local', avatar: '' };
  return u;
}
export async function logout() {
  await supabase.auth.signOut();
  LS?.removeItem(KEY.currentUser);
  LS?.removeItem(KEY.currentMentorId);
}

export function setCurrentUser(user: User | null) {
  if (user) write(KEY.currentUser, user);
  else LS?.removeItem(KEY.currentUser);
}
export function setCurrentMentorId(id: string) { write(KEY.currentMentorId, id); }

/* Safer mentor ID handling */
export function getCurrentMentorId(): string {
  const cached = read<string>(KEY.currentMentorId, "");
  if (!cached || cached === "fallback") return "";
  return cached;
}

export async function getOrLoadMentorId(): Promise<string | null> {
  const { data: au } = await supabase.auth.getUser();
  const uid = au?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("mentors")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/* =========================================================
   1.b) Become-a-Mentor helpers
   ========================================================= */
export async function saveBasicInfo({
  profileId,
  email,
  mobile,
  phone,
  name,
}: {
  profileId: string;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  name?: string | null;
}) {
  const phoneValue = (mobile ?? phone) ?? null;
  const { error } = await supabase
    .from("profiles")
    .update({ email: email ?? null, phone: phoneValue, name: name ?? null })
    .eq("id", profileId);
  if (error) throw error;
}

export async function uploadResume(file: File, userId: string) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const key = `${userId}/${Date.now()}-resume.${ext}`;
  const { error } = await supabase.storage.from('resumes').upload(key, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/pdf',
  });
  if (error) throw error;
  return key;
}

export async function getResumeSignedUrl(path: string, expiresInSeconds = 60) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function upsertMentorApplication(args: {
  userId: string;
  profileId: string;
  resumePath?: string | null;
  specialties?: string[] | null;
  experience?: number | null;
  linkedinUrl?: string | null;
  employmentHistory?: Array<{
    company: string;
    designation: string;
    from_year: number;
    to_year?: number | null;
  }>;
}) {
  const {
    userId,
    profileId,
    resumePath = null,
    specialties = null,
    experience = null,
    linkedinUrl = null,
    employmentHistory = [],
  } = args;

  const { error: appErr } = await supabase
    .from("mentor_applications")
    .upsert(
      {
        user_id: userId,
        profile_id: profileId,
        resume_path: resumePath,
        specialties,
        experience,
        linkedin_url: linkedinUrl,
        employment_history: employmentHistory,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (appErr) throw appErr;
}

/* =========================================================
   2) MENTORS — Supabase reads
   ========================================================= */
export async function listMentors(): Promise<Mentor[]> {
  const { data, error } = await supabase
    .from("mentors")
    .select(`
      id,
      user_id,
      profile_id,
      availability,
      reviews,
      application_status,
      resume_url,
      profiles:profiles!mentors_profile_id_fkey (
        name, email, phone, avatar, title, company, experience, rating, bio, verified, price, specialties, timezone
      )
    `);
  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const p = firstOrUndefined<any>(row.profiles) || {};
    const m: Mentor = {
      id: row.id,
      user_id: row.user_id,
      profile_id: row.profile_id,
      application_status: normalizeStatus(row.application_status, "pending"),
      name: p.name,
      title: p.title,
      company: p.company,
      avatar: p.avatar,
      verified: !!p.verified,
      experience: p.experience ?? 0,
      price: p.price ?? 0,
      rating: p.rating ?? 0,
      reviews: row.reviews ?? 0,
      specialties: p.specialties ?? [],
      availability: row.availability ?? 'high',
      timezone: p.timezone ?? "UTC",
      bio: p.bio ?? '',
      headline: p.title ? `${p.title} @ ${p.company ?? ""}`.trim() : "",
      languages: [],
      yearsOfExperience: p.experience ?? 0,
      packages: [],
      weeklySchedule: [],
      bufferMinutes: 15,
      timeOff: [],
      status: 'active',
      payoutConnected: false,
    };
    return m;
  });
}

/** NEW: for Find Mentors — only approved mentors */
export async function listApprovedMentors(): Promise<Mentor[]> {
  // NOTE: No comments inside the select string; use a stable FK join alias.
  const { data, error } = await supabase
    .from("mentors")
    .select(`
      id,
      user_id,
      profile_id,
      application_status,
      availability,
      reviews,
      profiles:profiles!mentors_profile_id_fkey (*)
    `);

  if (error) {
    console.error("[listApprovedMentors] supabase error", error);
    throw error;
  }

  // Case-insensitive approved filter
  const rows = (data ?? []).filter(
    (r: any) => String(r.application_status ?? "").toLowerCase() === "approved"
  );

  const mapped: Mentor[] = rows.map((row: any) => {
    const p = firstOrUndefined<any>(row.profiles) || {};

    // Safely derive languages from any plausible field
    const rawLangs =
      Array.isArray(p.languages) ? p.languages :
      Array.isArray(row.languages) ? row.languages :
      p.language ? [p.language] :
      p.lang ? [p.lang] :
      [];

    return {
      id: row.id,
      user_id: row.user_id,
      profile_id: row.profile_id,
      application_status: (String(row.application_status).toLowerCase() as ApplicationStatus) ?? "approved",

      name: p.name ?? "",
      title: p.title ?? "",
      company: p.company ?? "",
      avatar: p.avatar ?? "",
      verified: !!p.verified,

      experience: Number(p.experience ?? 0),
      yearsOfExperience: Number(p.experience ?? 0),
      price: Number(p.price ?? 0),
      rating: Number(p.rating ?? 0),
      reviews: Number(row.reviews ?? 0),

      specialties: Array.isArray(p.specialties) ? p.specialties : [],
      availability: row.availability ?? "high",
      timezone: p.timezone ?? "UTC",
      bio: p.bio ?? "",
      headline: p.title ? `${p.title}${p.company ? ` @ ${p.company}` : ""}` : "",

      languages: rawLangs.map((l: any) => String(l)).filter(Boolean),
    } as Mentor;
  });

  console.info("[listApprovedMentors] mapped mentors:", mapped.length, mapped.slice(0, 3));
  return mapped;
}

export async function getMentor(id: string): Promise<Mentor | null> {
  const { data, error } = await supabase
    .from("mentors")
    .select(`
      id,
      user_id,
      profile_id,
      availability,
      reviews,
      application_status,
      resume_url,
      profiles:profiles!mentors_profile_id_fkey (
        name, email, phone, avatar, title, company, experience, rating, bio, verified, price, specialties, timezone
      )
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = firstOrUndefined<any>((data as any).profiles) || {};

  const m: Mentor = {
    id: data.id,
    user_id: data.user_id,
    profile_id: data.profile_id,
    application_status: normalizeStatus(data.application_status, "pending"),

    name: p.name,
    title: p.title,
    company: p.company,
    avatar: p.avatar,
    verified: !!p.verified,
    experience: p.experience ?? 0,
    price: p.price ?? 0,
    rating: p.rating ?? 0,
    reviews: data.reviews ?? 0,
    specialties: p.specialties ?? [],
    availability: data.availability ?? 'high',
    timezone: p.timezone ?? "UTC",
    bio: p.bio ?? '',
    headline: p.title ? `${p.title} @ ${p.company ?? ""}`.trim() : "",
    languages: [],
    yearsOfExperience: p.experience ?? 0,
    packages: [],
    weeklySchedule: [],
    bufferMinutes: 15,
    timeOff: [],
    status: 'active',
    payoutConnected: false,
  };
  return m;
}

/** Resolve the mentor row for the logged-in user (by auth.uid). */
export async function getMyMentorId(): Promise<string | null> {
  const { data: uinfo } = await supabase.auth.getUser();
  const uid = uinfo?.user?.id ?? "";
  if (!uid) return null;

  const { data, error } = await supabase
    .from("mentors")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

export async function listUpcomingForMentor(mentorId: string) {
  const nowIsoVal = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, mentor_id, client_id, slot_id, status, created_at, updated_at,
      time_slots!inner ( start_iso, end_iso )
    `)
    .eq("mentor_id", mentorId)
    .gt("time_slots.start_iso", nowIsoVal)
    .order("start_iso", { ascending: true, foreignTable: "time_slots" });

  if (error) throw error;

  return (data ?? []).map((b: any) => ({
    id: b.id,
    mentorId: b.mentor_id,
    clientId: b.client_id,
    slotId: b.slot_id,
    status: b.status ?? "confirmed",
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    startIso: b.time_slots?.start_iso ?? "",
    endIso: b.time_slots?.end_iso ?? "",
    price: 0,
    currency: "USD",
  }));
}

export function upsertMentorProfile(mentor: Mentor) {
  return upsert<Mentor>(KEY.mentors, mentor);
}
export function updateMentorProfile(id: string, patch: Partial<Mentor>) {
  const m = read<Mentor[]>(KEY.mentors, []).find(x => x.id === id);
  if (!m) return null;
  const updated = { ...m, ...patch };
  upsertMentorProfile(updated);
  if (patch.weeklySchedule || typeof patch.bufferMinutes !== "undefined" || patch.timeOff) {
    regenerateSlotsForMentor(updated);
  }
  return updated;
}
export function clearCurrentMentorId() {
  try { localStorage.removeItem(MENTOR_ID_CACHE_KEY); } catch {}
}

export function clearUserCache() {
  const keys = [
    "aw.currentUser",
    "currentUser",
    "user",
    "aw.user",
  ];
  try { keys.forEach(k => localStorage.removeItem(k)); } catch {}
  try { keys.forEach(k => sessionStorage.removeItem(k)); } catch {}
}

/* =========================================================
   3) SLOTS — Supabase reads
   ========================================================= */
export async function listSlotsForMentor(mentorId: string): Promise<TimeSlot[]> {
  const { data, error } = await supabase
    .from("time_slots")
    .select("id, mentor_id, start_iso, end_iso, available")
    .eq("mentor_id", mentorId)
    .order("start_iso", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((s: any) => ({
    id: s.id,
    mentorId: s.mentor_id,
    startIso: s.start_iso,
    endIso: s.end_iso,
    available: s.available,
  }));
}

export async function submitPublicMentorApplication(args: {
  name: string;
  email: string;
  phone: string;
  profileUrl?: string | null;
  linkedinUrl?: string | null;
  specialties: string[];
  experience: number;
  bio?: string | null;
  resumePath?: string | null;
  employmentHistory?: Array<{
    company: string;
    designation: string;
    from_year: number;
    to_year?: number | null;
  }>;
}) {
  return { ok: true };
}

export async function linkMentorToUserOnLogin(userId: string, email: string) {
  const normalized = (email || "").trim().toLowerCase();
  if (!userId || !normalized) return;

  const { data: byUser, error: e1 } = await supabase
    .from("mentors")
    .select("id, user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (e1) return;
  if (byUser?.id) return;

  const { data: byEmail, error: e2 } = await supabase
    .from("mentors")
    .select("id, user_id")
    .ilike("applicant_email", normalized)
    .maybeSingle();
  if (e2 || !byEmail?.id) return;

  if (!byEmail.user_id) {
    await supabase.from("mentors").update({ user_id: userId }).eq("id", byEmail.id);
  }
}

/* =========================================================
   4) BOOKINGS — Supabase list + atomic RPC booking
   ========================================================= */
type ListArgs = {
  mentorId?: string;
  clientId?: string;
  status?: string; // e.g. "pending" | "confirmed" | ...
};

export async function listBookings(args: ListArgs): Promise<Booking[]> {
  const { mentorId, clientId, status } = args || {};

  // Only select columns that certainly exist on your table.
  let q = supabase
    .from("bookings")
    .select("id, mentor_id, client_id, slot_id, status, created_at, updated_at")
    .order("id", { ascending: false }); // safer than created_at if unsure

  if (mentorId) q = q.eq("mentor_id", mentorId);
  if (clientId) q = q.eq("client_id", clientId);
  if (status)   q = q.eq("status", status);   // ensure this value actually exists (see sanity check below)

  const { data: bookings, error: bErr } = await q;
  if (bErr) throw bErr;
  if (!bookings || bookings.length === 0) return [];

  const clientIds = Array.from(new Set(bookings.map(b => b.client_id).filter(Boolean)));
  const slotIds   = Array.from(new Set(bookings.map(b => b.slot_id).filter(Boolean)));

  const [{ data: profiles, error: pErr }, { data: slots, error: sErr }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, phone").in("id", clientIds),
    supabase.from("time_slots").select("id, start_iso, end_iso").in("id", slotIds),
  ]);
  if (pErr) throw pErr;
  if (sErr) throw sErr;

  const profileById = new Map((profiles ?? []).map(p => [p.id, p]));
  const slotById    = new Map((slots ?? []).map(s => [s.id, s]));

  return bookings.map((b: any) => {
    const prof = profileById.get(b.client_id);
    const ts   = slotById.get(b.slot_id);

    return {
      id: b.id,
      mentorId: b.mentor_id,
      clientId: b.client_id,
      slotId: b.slot_id,
      status: b.status,
      createdAt: b.created_at ?? null,
      updatedAt: b.updated_at ?? null,
      // price/currency may not exist in bookings; keep optional/defaults
      price: (b as any).price ?? 0,
      currency: ((b as any).currency ?? "USD") as any,
      startIso: ts?.start_iso ?? "",
      endIso: ts?.end_iso ?? "",
      clientName: prof?.name ?? null,
      clientEmail: prof?.email ?? null,
      clientPhone: prof?.phone ?? null,
    } as Booking;
  });
}




export async function bookSlot(
  mentorId: string,
  slotId: string,
  a?: any,
  b?: any,
  c?: any
): Promise<Booking | null> {
  let menteeName = "";
  let menteeEmail = "";

  if (typeof a === "string" && typeof b === "string" && !c) {
    menteeName = a.trim();
    menteeEmail = b.trim();
  }

  // --- Get a guaranteed userId (fixes “Cannot find name 'userId'”) ---
  const { data: { session } } = await supabase.auth.getSession();
  let userId: string | null = session?.user?.id ?? null;

  // Fallback to your helper (if session not yet hydrated)
  if (!userId) {
    const currentUser = await getAuthCurrentUser();
    userId = currentUser?.id ?? null;
  }

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Reasonable fallbacks
  if (!menteeName) {
    menteeName =
      (session?.user?.user_metadata?.full_name ??
        session?.user?.user_metadata?.name ??
        "") as string;
  }
  if (!menteeEmail) {
    menteeEmail = session?.user?.email ?? "";
  }

  if (!mentorId) throw new Error("Missing mentorId");
  if (!slotId) throw new Error("Missing slotId");
  if (!menteeEmail) throw new Error("Missing menteeEmail");

  // --- RPC call: pass explicit _user_id (belt-and-suspenders) ---
  const { data: bookingId, error } = await supabase.rpc("book_slot", {
    _mentor_id: mentorId,
    _slot_id: slotId,
    _mentee_name: menteeName,
    _mentee_email: menteeEmail,
    _user_id: userId, // <-- defined above
  });

  if (error) {
    console.error("[bookSlot] RPC error:", error);
    throw error;
  }
  if (!bookingId) return null;

  // Load the created booking in the shape your UI expects
  const { data, error: getErr } = await supabase
    .from("bookings")
    .select(`
      id, mentor_id, client_id, slot_id, status, created_at, updated_at, mentee_name, mentee_email,
      time_slots:slot_id ( start_iso, end_iso )
    `)
    .eq("id", bookingId as string)
    .single();

  if (getErr) {
    console.error("[bookSlot] Select booking error:", getErr);
    throw getErr;
  }

  const ts = firstOrUndefined<any>((data as any).time_slots) || {};

  const mapped: Booking = {
    id: data.id,
    mentorId: data.mentor_id,
    clientId: data.client_id,
    slotId: data.slot_id,
    status: (data.status ?? "pending") as BookingStatus,
    createdAt: data.created_at ?? nowIso(),
    updatedAt: data.updated_at ?? nowIso(),
    startIso: ts.start_iso ?? "",
    endIso: ts.end_iso ?? "",
    price: 0,
    currency: "USD",
  };

  return mapped;
}
export async function confirmBooking(bookingId: string): Promise<string> {
  // get a guaranteed user id (works even if session hydration is slow)
  const { data: { session } } = await supabase.auth.getSession();
  let userId: string | null = session?.user?.id ?? null;
  if (!userId) {
    const currentUser = await getAuthCurrentUser();
    userId = currentUser?.id ?? null;
  }
  if (!userId) throw new Error("User not authenticated");

  const { data, error } = await supabase.rpc("confirm_booking", {
    _booking_id: bookingId,
    _user_id: userId,     // belt-and-suspenders: pass explicitly
  });
  if (error) throw error;
  return data as string;   // returns the booking id
}

/* =========================================================
   5) Reschedule/Cancel — DB-backed via RPC
   ========================================================= */
export async function rescheduleBooking(bookingId: string, newSlotId: string, reason?: string) {
  const { data, error } = await supabase.rpc("reschedule_booking", {
    _booking_id: bookingId,
    _new_slot_id: newSlotId,
    _reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}
export async function rescheduleBookingDb(bookingId: string, newSlotId: string, reason?: string) {
  const { data, error } = await supabase.rpc("reschedule_booking", {
    _booking_id: bookingId,
    _new_slot_id: newSlotId,
    _reason: reason ?? null,
  });
  if (error) throw error;
  return data as string;
}
export async function cancelBooking(bookingId: string, reason?: string) {
  const { data, error } = await supabase.rpc("cancel_booking", {
    _booking_id: bookingId,
    _reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}
export async function confirmBookingDb(bookingId: string) {
  const { data, error } = await supabase.rpc("confirm_booking", { _booking_id: bookingId });
  if (error) throw error;
  return data as string;
}
export async function declineBookingDb(bookingId: string, reason?: string) {
  const { data, error } = await supabase.rpc("decline_booking", {
    _booking_id: bookingId,
    _reason: reason ?? null,
  });
  if (error) throw error;
  return data as string;
}

/* =========================================================
   6) Admin / Contact — DB-backed
   ========================================================= */
export async function listMentorApplicants(status?: ApplicationStatus) {
  let q = supabase
    .from("mentors")
    .select(`
      id,
      user_id,
      profile_id,
      resume_url,
      application_status,
      created_at,
      profiles:profiles!mentors_profile_id_fkey (
        id, name, email, phone, role, verified, specialties, experience
      )
    `)
    .order("created_at", { ascending: false });

  if (status) q = q.eq("application_status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function findProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, name, email, phone, role, verified")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setProfileRole(profileId: string, role: "mentor" | "client" | "admin") {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw error;
}

export async function adminCreateOrUpdateMentor({
  userId,
  profileId,
  resumePath,
  specialties,
  experience,
  status,
}: {
  userId: string;
  profileId: string;
  resumePath: string | null;
  specialties?: string[] | string | null;
  experience?: number | null;
  status: ApplicationStatus;
}) {
  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      specialties: Array.isArray(specialties) ? specialties : specialties ?? null,
      experience: experience ?? null,
    })
    .eq("id", profileId);
  if (profErr) throw profErr;

  const { data: existing, error: selErr } = await supabase
    .from("mentors")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) throw selErr;

  const payload = {
    user_id: userId,
    profile_id: profileId,
    resume_url: resumePath,
    application_status: status,
  };

  if (existing?.id) {
    const { error } = await supabase.from("mentors").update(payload).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  } else {
    const { data, error } = await supabase.from("mentors").insert(payload).select("id").single();
    if (error) throw error;
    return data.id as string;
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  const { count: mentorsCount } = await supabase
    .from("mentors")
    .select("id", { count: "exact" });

  const { data: bookingsData, error: bookingsErr } = await supabase
    .from("bookings")
    .select(`
      id, status,
      time_slots:slot_id ( start_iso )
    `);
  if (bookingsErr) throw bookingsErr;

  const totalBookings = bookingsData?.length ?? 0;
  const upcomingSessions = (bookingsData ?? []).filter(b => {
    const ts = firstOrUndefined<any>(b.time_slots);
    const start = ts?.start_iso ? new Date(ts.start_iso) : null;
    return start && start > new Date() && b.status !== 'cancelled';
  }).length;

  const { count: pendingMentors } = await supabase
    .from("mentors")
    .select("id", { count: "exact" })
    .eq("application_status", "pending");

  return {
    totalMentors: mentorsCount ?? 0,
    pendingMentors: pendingMentors ?? 0,
    totalBookings,
    upcomingSessions,
  };
}

export async function submitContactForm(form: ContactForm) {
  const anyForm = form as any;
  const name = anyForm.name ?? anyForm.fullName ?? "";
  const email = anyForm.email ?? anyForm.contactEmail ?? "";
  const message =
    anyForm.message ??
    anyForm.body ??
    anyForm.content ??
    anyForm.notes ??
    "";

  const { error } = await supabase.from("contact_forms").insert({
    name,
    email,
    message,
  });
  if (error) throw error;
  return true;
}

/* =========================================================
   7) Weekly schedule & pricing — DB-backed
   ========================================================= */
export async function updateMentorPricing(mentorId: string, packagesInput: any[]) {
  const { error: delErr } = await supabase.from("mentor_packages").delete().eq("mentor_id", mentorId);
  if (delErr) throw delErr;

  const rows = (packagesInput ?? []).map((p: any) => ({
    mentor_id: mentorId,
    name: String(p.name ?? p.label ?? "Session"),
    duration_min: Number(p.durationMin ?? p.minutes ?? 60),
    price: Number(p.price ?? 0),
  }));

  if (rows.length) {
    const { error: insErr } = await supabase.from("mentor_packages").insert(rows);
    if (insErr) throw insErr;
  }
  return true;
}

type WeeklyInput = { day: string; times: string[]; durationMin: number };
function dayNameToIndex(d: string): number {
  const map: Record<string, number> = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
  return map[d.slice(0,3).toLowerCase()];
}

export async function updateMentorWeeklySchedule(
  mentorId: string,
  weeklyInput: WeeklyInput[],
  bufferMinutes?: number,
  horizonDays = 30
) {
  const nowISO = new Date().toISOString();
  const { error: delErr } = await supabase
    .from("time_slots")
    .delete()
    .eq("mentor_id", mentorId)
    .gt("start_iso", nowISO);
  if (delErr) throw delErr;

  const slotsToInsert: any[] = [];
  const now = new Date();
  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();

    const matches = weeklyInput.filter(w => dayNameToIndex(w.day) === dow);
    for (const w of matches) {
      for (const t of w.times) {
        const [HH, MM] = t.split(":").map(Number);
        const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), HH, MM, 0));
        const end = new Date(start.getTime() + (w.durationMin * 60_000));

        slotsToInsert.push({
          mentor_id: mentorId,
          start_iso: start.toISOString(),
          end_iso: end.toISOString(),
          available: true,
        });

        if (bufferMinutes && bufferMinutes > 0) {
          // UI should account for buffer when generating times list
        }
      }
    }
  }

  if (slotsToInsert.length) {
    const { error: insErr } = await supabase.from("time_slots").insert(slotsToInsert);
    if (insErr) throw insErr;
  }
  return { inserted: slotsToInsert.length };
}

export async function getEarningsForMentor(mentorId: string) {
  const { data: mentor, error: mErr } = await supabase
    .from("mentors")
    .select("id, profile_id, profiles:profiles!mentors_profile_id_fkey ( price )")
    .eq("id", mentorId)
    .single();
  if (mErr) throw mErr;
  const prof = firstOrUndefined<any>(mentor?.profiles);
  const price = prof?.price ?? 0;

  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select(`
      id, status, created_at,
      time_slots:slot_id ( start_iso )
    `)
    .eq("mentor_id", mentorId);
  if (bErr) throw bErr;

  const confirmed = (bookings ?? []).filter(b => b.status === "confirmed");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthToDate = confirmed
    .filter(b => {
      const ts = firstOrUndefined<any>(b.time_slots);
      const s = ts?.start_iso ? new Date(ts.start_iso) : null;
      return s && s >= startOfMonth && s <= now;
    }).length * price;

  const lifetime = confirmed.length * price;
  const pendingPayouts = confirmed.length * price;

  const transactions = confirmed.slice(-10).map(b => ({
    id: b.id,
    date: (firstOrUndefined<any>(b.time_slots)?.start_iso) ?? b.created_at,
    client: "",
    amount: price,
    status: "pending" as "pending" | "paid",
  }));

  return { monthToDate, lifetime, pendingPayouts, transactions };
}

async function getProfileIdForMentor(mentorId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("mentors")
    .select("profile_id")
    .eq("id", mentorId)
    .maybeSingle();
  if (error) return null;
  return data?.profile_id ?? null;
}

export async function approveMentor(mentorId: string) {
  const profileId = await getProfileIdForMentor(mentorId);
  if (!profileId) throw new Error("Profile not found for mentor");

  const { error: vErr } = await supabase.rpc("admin_set_verified", { _profile_id: profileId, _verified: true });
  if (vErr) throw vErr;

  const { error: aErr } = await supabase
    .from("mentors")
    .update({ application_status: 'approved' as ApplicationStatus })
    .eq("id", mentorId);
  if (aErr) throw aErr;

  return true;
}

export async function rejectMentor(mentorId: string) {
  const profileId = await getProfileIdForMentor(mentorId);
  if (!profileId) throw new Error("Profile not found for mentor");

  const { error: vErr } = await supabase.rpc("admin_set_verified", { _profile_id: profileId, _verified: false });
  if (vErr) throw vErr;

  const { error: aErr } = await supabase
    .from("mentors")
    .update({ application_status: 'rejected' as ApplicationStatus })
    .eq("id", mentorId);
  if (aErr) throw aErr;

  return true;
}

export async function markMentorPending(mentorId: string) {
  const profileId = await getProfileIdForMentor(mentorId);
  if (!profileId) throw new Error("Profile not found for mentor");

  const { error: vErr } = await supabase.rpc("admin_set_verified", { _profile_id: profileId, _verified: false });
  if (vErr) throw vErr;

  const { error: aErr } = await supabase
    .from("mentors")
    .update({ application_status: 'pending' as ApplicationStatus })
    .eq("id", mentorId);
  if (aErr) throw aErr;

  return true;
}

export async function createSlotsForDates(
  mentorId: string,
  dates: Date[],
  startHHMM: string,
  endHHMM: string,
  durationMin: number
) {
  if (!dates?.length) return { inserted: 0 };
  const [sH, sM] = startHHMM.split(":").map(Number);
  const [eH, eM] = endHHMM.split(":").map(Number);

  function toUTCISO(d: Date, h: number, m: number) {
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0));
    return dt.toISOString();
  }

  const rows: any[] = [];
  for (const d of dates) {
    let cursor = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), sH, sM, 0));
    const end = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), eH, eM, 0));
    while (new Date(cursor.getTime() + durationMin * 60_000) <= end) {
      const slotEnd = new Date(cursor.getTime() + durationMin * 60_000);
      rows.push({
        mentor_id: mentorId,
        start_iso: cursor.toISOString(),
        end_iso: slotEnd.toISOString(),
        available: true,
      });
      cursor = slotEnd;
    }
  }

  if (!rows.length) return { inserted: 0 };
  const { error } = await supabase.from("time_slots").insert(rows);
  if (error) throw error;
  return { inserted: rows.length };
}

/* =========================================================
   8) Compatibility helpers (unchanged local utilities)
   ========================================================= */
function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}
function addMinutes(d: Date, minutes: number) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + minutes);
  return x;
}
function isWithinTimeOff(date: Date, timeOff: TimeOff[]) {
  const d = new Date(date.toISOString().slice(0, 10));
  return timeOff?.some(off => {
    const start = new Date(off.startDate);
    const end = new Date(off.endDate);
    return d >= start && d <= end;
  }) ?? false;
}
export function generateSlotsFromWeekly(m: Mentor, horizonDays = 30): TimeSlot[] {
  const slots: TimeSlot[] = [];
  if (!m.weeklySchedule?.length) return slots;

  const buffer = m.bufferMinutes ?? 0;
  const pkgMin = Math.min(...(m.packages?.filter(p => p.active).map(p => p.minutes) ?? [30]));

  const now = new Date();
  for (let delta = 0; delta < horizonDays; delta++) {
    const day = new Date(now);
    day.setDate(now.getDate() + delta);
    const weekday = day.getDay();

    const wslots = m.weeklySchedule.filter(w => w.weekday === weekday && w.active);
    if (!wslots.length) continue;
    if (isWithinTimeOff(day, m.timeOff ?? [])) continue;

    for (const w of wslots) {
      const { h: sh, m: sm } = parseHHMM(w.start);
      const { h: eh, m: em } = parseHHMM(w.end);

      const start = new Date(day);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(day);
      end.setHours(eh, em, 0, 0);

      let cursor = new Date(start);
      while (addMinutes(cursor, pkgMin) <= end) {
        const slotEnd = addMinutes(cursor, pkgMin);
        slots.push({
          id: uuid(),
          mentorId: m.id,
          startIso: cursor.toISOString(),
          endIso: slotEnd.toISOString(),
          available: true,
        });
        cursor = addMinutes(slotEnd, buffer);
      }
    }
  }
  return slots;
}
function regenerateSlotsForMentor(m: Mentor) {
  const all = read<TimeSlot[]>(KEY.slots, []);
  const filtered = all.filter(s => s.mentorId !== m.id);
  const newOnes = generateSlotsFromWeekly(m);
  write(KEY.slots, [...filtered, ...newOnes]);
}

function normalizePackages(input: any[], currencyFallback: CurrencyCode = "USD"): SessionPackage[] {
  return input.map((p) => {
    const minutes = typeof p.minutes === "number" ? p.minutes :
                    typeof p.duration === "number" ? p.duration : 30;
    const id: string = p.id ?? `pkg-${minutes}`;
    const label: string = p.label ?? `${minutes} min`;
    const price: number = typeof p.price === "number" ? p.price : 0;
    const currency: CurrencyCode = (p.currency ?? currencyFallback) as CurrencyCode;
    const active: boolean = typeof p.active === "boolean" ? p.active : true;
    return { id, label, minutes, price, currency, active };
  });
}
function normalizeWeekly(weekly: any[]): WeeklySlot[] {
  return weekly.map((w: any) => {
    const weekday: number = typeof w.weekday === "number" ? w.weekday :
                            typeof w.day === "number" ? w.day : 1;
    const active: boolean = typeof w.active === "boolean" ? w.active :
                            typeof w.enabled === "boolean" ? w.enabled : true;
    const start: string = w.start ?? "18:00";
    const end: string = w.end ?? "21:00";
    const id: string = w.id ?? uuid();
    return { id, weekday, start, end, active };
  });
}

/**
 * Claim an approved mentor application for the current user.
 */
export async function claimApprovedMentorForCurrentUser() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return;

  const { data: prof } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("user_id", uid)
    .maybeSingle();
  if (!prof) return;

  const { data: row } = await supabase
    .from("mentors")
    .select("id, user_id, profile_id, application_status")
    .or(`user_id.eq.${uid},profile_id.eq.${prof.id},applicant_email.eq.${prof.email}`)
    .eq("application_status", "approved")
    .maybeSingle();

  if (!row) return;

  if (row.user_id !== uid || row.profile_id !== prof.id) {
    await supabase.from("mentors").update({
      user_id: uid,
      profile_id: prof.id
    }).eq("id", row.id);
  }

  await supabase.from("profiles").update({ verified: true, role: "mentor" }).eq("id", prof.id);
}

export async function getEmailConfirmed() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const confirmedAt =
    (data.user?.email_confirmed_at as unknown as string | null) ??
    (data.user?.confirmed_at as unknown as string | null) ??
    null;
  return Boolean(confirmedAt);
}

export async function markMentorIntent(profileId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "mentor_pending" })
    .eq("id", profileId);
  if (error) throw error;
}

export async function getMentorApprovalStatus(userId: string) {
  const { data, error } = await supabase
    .from("mentors")
    .select("approved_at, approved, application_status")
    .eq("user_id", userId)
    .order("approved_at", { ascending: false, nullsFirst: false })
    .maybeSingle();

  if (error) throw error;

  const approved =
    Boolean(data?.approved_at) ||
    Boolean(data?.approved) ||
    data?.application_status === "approved";

  const application_status =
    data?.application_status ?? (approved ? "approved" : "pending");

  return { approved, application_status };
}
export async function listPendingRequestsForMentor(mentorId: string): Promise<Booking[]> {
  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select("id, mentor_id, client_id, slot_id, status, created_at, updated_at")
    .eq("mentor_id", mentorId)
    .eq("status", "pending") // verify this value exists (see sanity check)
    .order("id", { ascending: false });

  if (bErr) throw bErr;
  if (!bookings || bookings.length === 0) return [];

  const clientIds = Array.from(new Set(bookings.map(b => b.client_id).filter(Boolean)));
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, name, email, phone")
    .in("id", clientIds);
  if (pErr) throw pErr;

  const slotIds = Array.from(new Set(bookings.map(b => b.slot_id).filter(Boolean)));
  const { data: slots, error: sErr } = await supabase
    .from("time_slots")
    .select("id, start_iso, end_iso")
    .in("id", slotIds);
  if (sErr) throw sErr;

  const profileById = new Map((profiles ?? []).map(p => [p.id, p]));
  const slotById    = new Map((slots ?? []).map(s => [s.id, s]));

  return bookings.map((b: any) => {
    const prof = profileById.get(b.client_id);
    const ts   = slotById.get(b.slot_id);

    return {
      id: b.id,
      mentorId: b.mentor_id,
      clientId: b.client_id,
      slotId: b.slot_id,
      status: b.status,
      createdAt: b.created_at ?? null,
      updatedAt: b.updated_at ?? null,
      price: (b as any).price ?? 0,
      currency: ((b as any).currency ?? "USD") as any,
      startIso: ts?.start_iso ?? "",
      endIso: ts?.end_iso ?? "",
      clientName: prof?.name ?? null,
      clientEmail: prof?.email ?? null,
      clientPhone: prof?.phone ?? null,
    } as Booking;
  });
}
export async function listNotifications(opts?: { unreadOnly?: boolean; limit?: number }) {
  let q = supabase
    .from("notifications")
    .select("id, recipient_id, kind, title, body, payload, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 20);

  if (opts?.unreadOnly) {
    q = q.eq("is_read", false);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((n: any): Notification => ({
    id: n.id,
    recipientId: n.recipient_id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    payload: n.payload ?? null,
    isRead: !!n.is_read,
    createdAt: n.created_at,
  }));
}

// ✅ get unread count
export async function unreadCount() {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

// ✅ mark one notification as read
export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw error;
}

// ✅ realtime subscription for notifications
export function subscribeNotifications(userId: string, onChange: () => void) {
  return supabase
    .channel("notifs-" + userId)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
      onChange
    )
    .subscribe();
}