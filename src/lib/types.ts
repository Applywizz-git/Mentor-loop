// // ---------- Core & Existing Types ----------
// export type Availability = "high" | "medium" | "low";

// export interface Mentor {
//   id: string;
//   name: string;
//   title: string;
//   company: string;
//   avatar: string;
//   verified: boolean;
//   experience: number;
//   price: number;
//   rating: number;
//   reviews: number;
//   specialties: string[];
//   availability: Availability;
//   timezone?: string;
//   bio?: string;

//   // ---------- New: Onboarding/Profile ----------
//   headline?: string;            // short title line (e.g., "Senior Data Scientist at Google")
//   videoUrl?: string;            // intro video link (YouTube/Vimeo)
//   languages?: string[];         // spoken languages
//   yearsOfExperience?: number;   // explicit years (separate from existing 'experience')

//   // ---------- New: Pricing ----------
//   packages?: SessionPackage[];  // 30/45/60 minute packages with price/currency and active toggle

//   // ---------- New: Availability ----------
//   weeklySchedule?: WeeklySlot[]; // recurring weekly schedule
//   bufferMinutes?: number;        // buffer between sessions
//   timeOff?: TimeOff[];           // vacations/holidays

//   // ---------- New: Payout ----------
//   payout?: PayoutInfo;

//   // ---------- New: Moderation ----------
//   status?: MentorStatus;        // 'draft' | 'pending' | 'verified' | 'rejected'
// }

// export interface TimeSlot {
//   id: string;
//   mentorId: string;
//   startIso: string;  // ISO 8601 start
//   endIso: string;    // ISO 8601 end
//   available: boolean;
// }

// export type BookingStatus = "confirmed" | "rescheduled" | "cancelled";

// export interface RescheduleEntry {
//   atIso: string;
//   fromSlotId: string;
//   toSlotId: string;
//   reason?: string;
// }

// export interface Booking {
//   id: string;
//   mentorId: string;
//   menteeName: string;
//   menteeEmail: string;
//   slotId: string;
//   status: BookingStatus;
//   rescheduleHistory: RescheduleEntry[];
//   createdAt: string;
//   duration: number; // in minutes
// }

// export interface User {
//   id: string;
//   name: string;
//   email: string;
//   role: 'client' | 'mentor' | 'admin';
//   mentorId?: string;            // links a mentor-user to a Mentor profile id (e.g. 'm1')
//   avatar?: string;
//   title?: string;
//   company?: string;
//   experience?: number;
//   rating?: number;
// }

// export interface AdminStats {
//   totalMentors: number;
//   pendingMentors: number;
//   totalBookings: number;
//   upcomingSessions: number;
// }

// export interface ContactForm {
//   name: string;
//   email: string;
//   issue: string;
// }

// // ---------- New: Wizard/Onboarding Supporting Types ----------
// export type MentorStatus = 'draft' | 'pending' | 'verified' | 'rejected';

// export interface SessionPackage {
//   duration: 30 | 45 | 60; // minutes
//   price: number;
//   currency: string;       // 'USD', 'INR', etc.
//   active: boolean;        // toggle availability of the package
// }

// export interface WeeklySlot {
//   day: number;     // 0=Sun ... 6=Sat
//   start: string;   // "18:00"
//   end: string;     // "21:00"
//   enabled: boolean;
// }

// export interface TimeOff {
//   fromIso: string; // "2025-09-10T00:00:00Z"
//   toIso: string;   // "2025-09-15T23:59:59Z"
//   note?: string;
// }

// export type PayoutProvider = 'stripe' | 'paypal';

// export interface PayoutInfo {
//   provider: PayoutProvider | null;
//   accountLink?: string;   // Stripe onboarding link or PayPal.me/email link
// }

// ---------- Core & Existing Types ----------
export type AvailabilityLevel = "high" | "medium" | "low";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type CurrencyCode = "USD" | "INR" | "EUR" | "GBP";

export interface SessionPackage {
  id: string;           // stable id, e.g. "pkg30"
  label: string;        // "30 min"
  minutes: number;      // 30, 45, 60
  price: number;
  currency: CurrencyCode;
  active: boolean;
  // NOTE: many of your older files used `duration`, we normalize that in lib/data.ts
}

export interface WeeklySlot {
  id: string;
  // canonical fields (new)
  weekday: number;      // 0..6
  start: string;        // "HH:MM"
  end: string;          // "HH:MM"
  active: boolean;

  // legacy compatibility (old)
  // We won't rely on these at type-level, but data.ts will accept them and normalize.
  // day?: number;       // 0..6
  // enabled?: boolean;
}

export interface TimeOff {
  id: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  note?: string;
}

export interface TimeSlot {
  id: string;
  mentorId: string;
  startIso: string;
  endIso: string;
  available: boolean;
  packageId?: string;
    
}

export interface Review {
  id: string;
  bookingId: string;
  mentorId: string;
  clientId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  verified: boolean;
  experience: number;
  price: number;         // legacy single price (kept for compatibility)
  rating: number;
  reviews: number;
  specialties: string[];
  availability: AvailabilityLevel;
  timezone: string;
  bio?: string;

  headline?: string;
  videoUrl?: string;
  languages?: string[];
  yearsOfExperience?: number;

  packages?: SessionPackage[];
  weeklySchedule?: WeeklySlot[];
  bufferMinutes?: number;
  timeOff?: TimeOff[];

  payoutProvider?: "stripe" | "paypal";
  payoutConnected?: boolean;
  payoutAccountId?: string;

  status?: "active" | "pending" | "pending_approval" | "rejected";
}

export interface Client {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Booking {
  id: string;
  mentorId: string;
  clientId: string;
  slotId: string;
  packageId?: string;
  status: BookingStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  startIso: string;
  endIso: string;
  price: number;
  currency: CurrencyCode;

  // 👇 add these
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
}

export interface User {
  id: string;
  role: "client" | "mentor" | "admin";
  name: string;
  email: string;
  avatar: string;
  mentorId?: string;
  timezone?: string;
}

export interface AdminStats {
  totalMentors: number;
  pendingMentors: number;
  totalBookings: number;
  upcomingSessions: number;
}

export interface ContactForm {
  name: string;
  email: string;
  issue: string;
}
// Add/extend these types

// src/lib/types.ts

export type Role = 'mentor' | 'client' | 'admin';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;                 // usually = auth user id
  user_id: string;            // auth user id
  name: string | null;
  email: string | null;
  phone: string | null;       // NEW (added in SQL)
  role: Role | null;
  avatar?: string | null;
  company?: string | null;
  experience?: number | null; // years
  bio?: string | null;
  specialties?: string[] | null; // prefer text[] in DB
  verified?: boolean | null;  // true after admin approval
  created_at?: string;
  updated_at?: string;
}

export interface Mentor {
  id: string;
  user_id: string | null;           // null for pre-approval applicants (no account yet)
  profile_id: string | null;        // null for pre-approval applicants
  resume_url?: string | null;       // private storage path in 'resumes' bucket
  application_status: ApplicationStatus; // pending | approved | rejected

  // Applicant-only fields (public “apply without login”)
  applicant_email?: string | null;
  applicant_phone?: string | null;
  applicant_name?: string | null;

  // Lifecycle flags/timestamps
  invited?: boolean;                // admin invited via auth.admin.inviteUserByEmail
  invite_sent_at?: string | null;
  approved_at?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  kind: string;
  title: string;
  body: string;
  payload?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
  
}