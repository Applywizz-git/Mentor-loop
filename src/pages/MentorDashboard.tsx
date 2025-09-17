import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/ui/navbar";
import { Calendar, Clock, User, Settings } from "lucide-react";
import MentorGate from "@/components/MentorGate";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import {
  getCurrentMentorId,
  getMentor,
  listBookings,
  listSlotsForMentor,
  updateMentorProfile,
  getMyMentorId,
  listUpcomingForMentor,
  rescheduleBookingDb,
  setCurrentMentorId,
  declineBookingDb,
  getMentorApprovalStatus,
  listPendingRequestsForMentor,
} from "@/lib/data";

import type { Booking, TimeSlot, Mentor, SessionPackage, WeeklySlot } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchUnreadNotifications } from "@/lib/notificationUtils";

const MentorDashboard = () => {
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newSlotId, setNewSlotId] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({ name: "", title: "", company: "" });

  // Pricing editor
  const [currency, setCurrency] = useState("USD");
  const [packagesState, setPackagesState] = useState<SessionPackage[]>([
    { id: "pkg30-ui", label: "30 min", minutes: 30, price: 30, currency: "USD" as any, active: true },
    { id: "pkg45-ui", label: "45 min", minutes: 45, price: 40, currency: "USD" as any, active: true },
    { id: "pkg60-ui", label: "60 min", minutes: 60, price: 50, currency: "USD" as any, active: true },
  ]);

  // Availability editor
  const [weeklyEdit, setWeeklyEdit] = useState<WeeklySlot[]>([]);
  const [bufferEdit, setBufferEdit] = useState<number>(15);

  // Earnings
  const [mtd, setMtd] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [pending, setPending] = useState(0);
  const [tx, setTx] = useState<{ id: string; date: string; client: string; amount: number; status: "pending" | "paid" }[]>([]);

  // DB-backed upcoming rows
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [declineNote, setDeclineNote] = useState<string>("");

  const { toast } = useToast();

  // 🔒 Approval gate state
  const [approved, setApproved] = useState<boolean>(false);
  const [appStatus, setAppStatus] = useState<"pending" | "approved" | "rejected" | "none">("none");
  const [loadingGate, setLoadingGate] = useState<boolean>(true);

  // Unread notifications count
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Load current approval once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) { setLoadingGate(false); return; }
      try {
        const s = await getMentorApprovalStatus(uid);
        const effectiveApproved = Boolean(s.approved) || s.application_status === "approved";
        setApproved(effectiveApproved);
        setAppStatus((s.application_status ?? (effectiveApproved ? "approved" : "pending")) as any);
      } catch {
        setApproved(false);
        setAppStatus("none");
      } finally {
        setLoadingGate(false);
      }
    })();
  }, []);

  // Fetch unread notifications when mentor is logged in
  useEffect(() => {
    if (mentor?.user_id) {
      const load = async () => {
        const notifications = await fetchUnreadNotifications(mentor.user_id);
        setUnreadNotifications(notifications);
        setUnreadCount(notifications.length);
      };
      load();
    }
  }, [mentor]);

  // Real-time update for approval status
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;

      channel = supabase
        .channel("mentor-approval-watch")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "mentors", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row: any = payload.new;
            const ok =
              Boolean(row?.approved) ||
              row?.application_status === "approved" ||
              Boolean(row?.approved_at);
            setApproved(ok);
            setAppStatus(row?.application_status ?? (ok ? "approved" : "pending"));
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Force home on SIGNED_OUT
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.assign("/");
    });
    return () => {
      try { sub?.subscription?.unsubscribe(); } catch {}
    };
  }, []);

  // Single, fast loader
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        let mid = getCurrentMentorId();
        if (!mid || mid === "fallback") {
          mid = (await getMyMentorId()) || "";
          if (mid) setCurrentMentorId(mid);
        }
        if (!mid) return;

        const [mentorData, allBookings, pend, sl, upc] = await Promise.all([
          getMentor(mid),
          listBookings({ mentorId: mid }),
          listPendingRequestsForMentor(mid),
          listSlotsForMentor(mid),
          listUpcomingForMentor(mid),
        ]);

        if (!alive) return;

        if (mentorData) {
          setMentor(mentorData);
          setProfileData({
            name: mentorData.name,
            title: mentorData.title,
            company: mentorData.company
          });
          setCurrency(mentorData.packages?.[0]?.currency ?? "USD");
          setPackagesState(
            mentorData.packages?.length
              ? mentorData.packages
              : [
                  { id: "pkg30-ui", label: "30 min", minutes: 30, price: mentorData.price, currency: (mentorData.packages?.[0]?.currency ?? "USD") as any, active: true },
                  { id: "pkg45-ui", label: "45 min", minutes: 45, price: Math.round(mentorData.price * 1.3), currency: (mentorData.packages?.[0]?.currency ?? "USD") as any, active: true },
                  { id: "pkg60-ui", label: "60 min", minutes: 60, price: Math.round(mentorData.price * 1.6), currency: (mentorData.packages?.[0]?.currency ?? "USD") as any, active: true },
                ]
          );
          setWeeklyEdit(mentorData.weeklySchedule ?? []);
          setBufferEdit(mentorData.bufferMinutes ?? 15);
        }

        setBookings(allBookings);
        setPendingBookings(pend);
        setSlots(sl);
        setUpcoming(upc);

        // earnings (local calc)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const completedOrConfirmed = allBookings.filter(b => b.status !== "cancelled");
        const mtdSum = completedOrConfirmed
          .filter(b => new Date(b.startIso) >= startOfMonth && new Date(b.startIso) <= now)
          .reduce((acc, b) => acc + (b.price || 0), 0);
        const lifeSum = completedOrConfirmed.reduce((acc, b) => acc + (b.price || 0), 0);
        const pendingSum = 0;
        const txRows = completedOrConfirmed.slice(-10).map(b => ({
          id: b.id,
          date: b.startIso,
          client: b.clientId,
          amount: b.price || 0,
          status: "paid" as const
        }));

        setMtd(mtdSum);
        setLifetime(lifeSum);
        setPending(pendingSum);
        setTx(txRows);
      } catch (e: any) {
        toast({ title: "Load failed", description: e?.message ?? "Please retry.", variant: "destructive" });
      }
    })();

    return () => { alive = false; };
  }, [toast]);

  const refreshAll = async (mid: string) => {
    const [allB, pendB, sl, upc] = await Promise.all([
      listBookings({ mentorId: mid }),
      listBookings({ mentorId: mid, status: "pending" as any }),
      listSlotsForMentor(mid),
      listUpcomingForMentor(mid),
    ]);
    setBookings(allB);
    setPendingBookings(pendB);
    setSlots(sl);
    setUpcoming(upc);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  const getBookingSlot = (slotId: string) => slots.find(s => s.id === slotId);
  const getAvailableSlots = (excludeSlotId?: string) => slots.filter(s => s.available && s.id !== excludeSlotId);

  const isWithin24Hours = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;
    const now = new Date();
    const slotTime = new Date(slot.startIso);
    const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilSlot <= 24;
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !newSlotId) return;
    const within24h = isWithin24Hours(selectedBooking.slotId);
    const reason = within24h ? rescheduleReason.trim() : undefined;

    try {
      await rescheduleBookingDb(selectedBooking.id, newSlotId, reason);
      toast({ title: "Session rescheduled!", description: "The mentee has been notified of the change." });
      if (mentor) await refreshAll(mentor.id);
      setSelectedBooking(null);
      setNewSlotId("");
      setRescheduleReason("");
    } catch (e: any) {
      toast({ title: "Reschedule failed", description: e?.message ?? "Please try another slot.", variant: "destructive" });
    }
  };

  const handleSaveProfile = () => {
    if (!mentor) return;
    updateMentorProfile(mentor.id, profileData);
    setMentor({ ...mentor, ...profileData });
    toast({ title: "Profile updated!", description: "Your profile information has been saved." });
    setEditProfileOpen(false);
  };

  const togglePackageActive = (minutes: 30|45|60, active: boolean) => {
    setPackagesState(prev => prev.map(p => p.minutes === minutes ? { ...p, active } : p));
  };
  const setPackagePrice = (minutes: 30|45|60, price: number) => {
    setPackagesState(prev => prev.map(p => p.minutes === minutes ? { ...p, price } : p));
  };
  const savePricing = () => {
    if (!mentor) return;
    const normalized = packagesState.map(p => ({
      ...p,
      currency: currency as any,
      label: p.label || `${p.minutes} min`,
      id: p.id || `pkg-${p.minutes}`
    }));
    updateMentorProfile(mentor.id, { packages: normalized });
    setMentor({ ...mentor, packages: normalized });
    toast({ title: "Pricing updated", description: "Your session packages were saved." });
  };

  const toggleDay = (weekday: number, active: boolean) => {
    setWeeklyEdit(prev => prev.map(s => s.weekday === weekday ? { ...s, active } : s));
  };
  const setTimeForDay = (weekday: number, key: "start" | "end", value: string) => {
    setWeeklyEdit(prev => prev.map(s => s.weekday === weekday ? { ...s, [key]: value } : s));
  };
  const saveAvailability = () => {
    if (!mentor) return;
    updateMentorProfile(mentor.id, { weeklySchedule: weeklyEdit, bufferMinutes: bufferEdit });
    setMentor({ ...mentor, weeklySchedule: weeklyEdit, bufferMinutes: bufferEdit });
    toast({ title: "Availability updated", description: "Your weekly schedule was saved." });
  };

  // Upcoming list preferring DB-backed rows; fallback to legacy local
  const legacyUpcoming = bookings.filter(b => {
    const slot = getBookingSlot(b.slotId);
    return b.status === "confirmed" && slot && new Date(slot.startIso) > new Date();
    });
  const upcomingBookings = (upcoming && upcoming.length > 0)
    ? upcoming.filter((b: any) => b.status === "confirmed" && new Date(b.startIso) > new Date())
    : legacyUpcoming;

  // ✅ Approval gate UI
  if (loadingGate) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar unreadCount={unreadCount} />
        <div className="max-w-2xl mx-auto p-8">Loading…</div>
      </div>
    );
  }
  if (!approved) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar unreadCount={unreadCount}/>
        <div className="max-w-2xl mx-auto p-6">
          <Alert>
            <AlertTitle>Approval pending</AlertTitle>
            <AlertDescription>
              Your mentor application status: <b>{appStatus}</b>. You’ll get access to the mentor dashboard once an admin approves you.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <MentorGate>
      <div className="min-h-screen bg-background">
        <Navbar unreadCount={unreadCount} />

        <div className="px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {mentor ? `Welcome back, ${mentor.name}` : "Loading your dashboard…"}
                </h1>
                {mentor && <p className="text-muted-foreground">{mentor.title} at {mentor.company}</p>}
              </div>
              {mentor && (
                <div className="flex items-center gap-2">
                  {!approved ? (
                    <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">⏳ Pending Approval</Badge>
                  ) : mentor.verified ? (
                    <Badge className="bg-verified-green text-white">✓ Verified</Badge>
                  ) : null}
                  <Badge variant="secondary">{mentor.rating} rating</Badge>
                  {unreadNotifications.length > 0 && (
                    <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                  )}
                </div>
              )}
            </div>

            <Tabs defaultValue="upcoming" className="space-y-6">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="requests">Requests</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
              </TabsList>

              {/* Requests */}
              <TabsContent value="requests">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pendingBookings.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No pending booking requests</p>
                        <p className="text-sm text-muted-foreground mt-2">New requests will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingBookings.map((b) => {
                          const slot = getBookingSlot(b.slotId) || slots.find(s => s.id === b.slotId);
                          const d = slot ? new Date(slot.startIso) : null;
                          const when = d
                            ? `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                            : "(time not loaded)";

                          return (
                            <div key={b.id} className="p-4 border rounded flex items-start justify-between gap-4">
                              <div>
                                <div className="font-medium">
                                  {b.clientName || `Client: ${b.clientId}`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {b.clientEmail || "—"}{b.clientPhone ? ` • ${b.clientPhone}` : ""}
                                </div>
                                <div className="text-sm text-muted-foreground">{when}</div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={async () => {
                                    try {
                                      // ✅ call RPC with the correct argument names + mentor user id
                                      const { data: { session } } = await supabase.auth.getSession();
                                      if (!session) throw new Error("User not authenticated");

                                      console.log("[confirm] booking id / user:", b.id, session.user.id);

                                      const { data, error } = await supabase.rpc("confirm_booking", {
                                        _booking_id: b.id,             // <-- correct param name
                                        _user_id: session.user.id,     // <-- pass mentor’s user id
                                      });
                                      if (error) throw error;

                                      toast({ title: "Booking confirmed" });
                                      if (mentor) await refreshAll(mentor.id);
                                    } catch (e: any) {
                                      console.error("[confirm_booking] failed", e);
                                      toast({ title: "Confirm failed", description: e?.message ?? "Try again.", variant: "destructive" });
                                    }
                                  }}
                                >
                                  Confirm
                                </Button>

                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="destructive">Decline</Button>
                                  </DialogTrigger>
                                  <DialogContent aria-describedby={undefined}>
                                    <DialogHeader>
                                      <DialogTitle>Decline Booking</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-3">
                                      <p className="text-sm text-muted-foreground">
                                        Optionally add a note for the client:
                                      </p>
                                      <Textarea value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} />
                                      <div className="flex gap-2 justify-end">
                                        <Button variant="outline" onClick={() => setDeclineNote("")}>Cancel</Button>
                                        <Button
                                          variant="destructive"
                                          onClick={async () => {
                                            try {
                                              await declineBookingDb(b.id, declineNote.trim() || undefined);
                                              setDeclineNote("");
                                              toast({ title: "Booking declined" });
                                              if (mentor) await refreshAll(mentor.id);
                                            } catch (e: any) {
                                              toast({ title: "Decline failed", description: e?.message ?? "Try again.", variant: "destructive" });
                                            }
                                          }}
                                        >
                                          Confirm decline
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Upcoming */}
              <TabsContent value="upcoming">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Upcoming Sessions ({upcomingBookings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingBookings.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No upcoming sessions</p>
                        <p className="text-sm text-muted-foreground mt-2">New bookings will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingBookings.map((booking: any) => {
                          const startIso: string =
                            booking.startIso ||
                            getBookingSlot(booking.slotId)?.startIso ||
                            "";

                          if (!startIso) return null;
                          const date = new Date(startIso).toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
                          const time = new Date(startIso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

                          return (
                            <div key={booking.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{booking.clientId}</h4>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {date}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {time}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                                  {booking.status}
                                </Badge>

                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedBooking(booking)}
                                    >
                                      Reschedule
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent aria-describedby={undefined}>
                                    <DialogHeader>
                                      <DialogTitle>Reschedule Session</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Current Session</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {booking.clientId} - {date} at {time}
                                        </p>
                                      </div>

                                      <div>
                                        <Label>New Time Slot</Label>
                                        <Select value={newSlotId} onValueChange={setNewSlotId}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select new time slot" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {getAvailableSlots(booking.slotId).map((slot) => {
                                              const d2 = new Date(slot.startIso);
                                              const nd = d2.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
                                              const nt = d2.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                                              return (
                                                <SelectItem key={slot.id} value={slot.id}>
                                                  {nd} at {nt}
                                                </SelectItem>
                                              );
                                            })}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {isWithin24Hours(booking.slotId) && (
                                        <div>
                                          <Label>Reason (Required for last-minute changes)</Label>
                                          <Textarea
                                            value={rescheduleReason}
                                            onChange={(e) => setRescheduleReason(e.target.value)}
                                            placeholder="Please provide a reason for the reschedule..."
                                          />
                                        </div>
                                      )}

                                      <div className="flex gap-2">
                                        <Button
                                          onClick={handleReschedule}
                                          disabled={!newSlotId || (isWithin24Hours(booking.slotId) && !rescheduleReason.trim())}
                                          className="flex-1"
                                        >
                                          Confirm Reschedule
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Past */}
              <TabsContent value="past">
                <Card>
                  <CardHeader>
                    <CardTitle>Past Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bookings.filter(b => {
                      const slot = getBookingSlot(b.slotId);
                      return slot && new Date(slot.startIso) <= new Date();
                    }).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No past sessions yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bookings
                          .filter(b => {
                            const slot = getBookingSlot(b.slotId);
                            return slot && new Date(slot.startIso) <= new Date();
                          })
                          .map((b) => {
                            const slot = getBookingSlot(b.slotId)!;
                            const date = new Date(slot.startIso).toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
                            const time = new Date(slot.startIso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                            return (
                              <div key={b.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                                <div>
                                  <div className="font-medium">{b.clientId}</div>
                                  <div className="text-sm text-muted-foreground">{date} • {time}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={b.status === 'cancelled' ? 'secondary' : 'default'}>{b.status}</Badge>
                                  <Button variant="outline" size="sm">View Feedback</Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Profile */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Profile Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {mentor && (
                      <>
                        <div className="flex items-center gap-4">
                          <img
                            src={mentor.avatar}
                            alt={mentor.name}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="text-lg font-semibold">{mentor.name}</h3>
                            <p className="text-muted-foreground">{mentor.title}</p>
                            {!approved ? (
                              <Badge className="mt-1 bg-yellow-100 text-yellow-800 border border-yellow-300">⏳ Pending Approval</Badge>
                            ) : (
                              <Badge className="mt-1 bg-verified-green text-white">✓ Verified</Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-2">Profile Information</h4>
                            <div className="space-y-2 text-sm">
                              <p><span className="font-medium">Name:</span> {mentor.name}</p>
                              <p><span className="font-medium">Title:</span> {mentor.title}</p>
                              <p><span className="font-medium">Company:</span> {mentor.company}</p>
                              <p><span className="font-medium">Experience:</span> {mentor.experience} years</p>
                              <p><span className="font-medium">Rating:</span> {mentor.rating}/5.0 ({mentor.reviews} reviews)</p>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Specialties</h4>
                            <div className="flex flex-wrap gap-2">
                              {mentor.specialties.map((specialty) => (
                                <Badge key={specialty} variant="secondary">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
                          <DialogTrigger asChild>
                            <Button>Edit Profile Details</Button>
                          </DialogTrigger>
                          <DialogContent aria-describedby={undefined}>
                            <DialogHeader>
                              <DialogTitle>Edit Profile</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="name">Name</Label>
                                <Input
                                  id="name"
                                  value={profileData.name}
                                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="title">Title</Label>
                                <Input
                                  id="title"
                                  value={profileData.title}
                                  onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="company">Company</Label>
                                <Input
                                  id="company"
                                  value={profileData.company}
                                  onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                                />
                              </div>
                              <Button onClick={handleSaveProfile} className="w-full">
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Availability */}
              <TabsContent value="availability" className="p-4">
                <h2 className="text-xl font-semibold mb-4">Availability Management</h2>
                {getCurrentMentorId() ? (
                  <AvailabilityCalendar mentorId={getCurrentMentorId()} />
                ) : (
                  <p className="text-sm text-muted-foreground">Loading mentor profile…</p>
                )}
              </TabsContent>

              {/* Pricing */}
              <TabsContent value="pricing">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing & Packages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Currency</Label>
                      <Input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} placeholder="USD / INR" />
                    </div>
                    {([30,45,60] as const).map(mins => {
                      const pkg = packagesState.find(p => p.minutes === mins) ||
                        { id: `pkg-${mins}`, label: `${mins} min`, minutes: mins, price: 0, currency: currency as any, active: false };
                      return (
                        <div key={mins} className="grid md:grid-cols-3 gap-4 items-center">
                          <div className="text-sm font-medium">{mins} min</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{pkg.active ? "Active" : "Inactive"}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePackageActive(mins as 30|45|60, !pkg.active)}
                            >
                              {pkg.active ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                          <div>
                            <Label>Price ({currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              value={pkg.price}
                              onChange={e => setPackagePrice(mins as 30|45|60, parseFloat(e.target.value || "0"))}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-end">
                      <Button onClick={savePricing}>Save Pricing</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Earnings */}
              <TabsContent value="earnings">
                <Card>
                  <CardHeader>
                    <CardTitle>Earnings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">Month to date</div>
                        <div className="text-2xl font-bold">${mtd}</div>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">Lifetime</div>
                        <div className="text-2xl font-bold">${lifetime}</div>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">Pending payouts</div>
                        <div className="text-2xl font-bold">${pending}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Transactions</h4>
                      {tx.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No transactions yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-muted-foreground border-b">
                                <th className="py-2 pr-2">Booking ID</th>
                                <th className="py-2 pr-2">Date</th>
                                <th className="py-2 pr-2">Client</th>
                                <th className="py-2 pr-2">Amount</th>
                                <th className="py-2 pr-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tx.map(row => (
                                <tr key={row.id} className="border-b last:border-0">
                                  <td className="py-2 pr-2">{row.id}</td>
                                  <td className="py-2 pr-2">{new Date(row.date).toLocaleString()}</td>
                                  <td className="py-2 pr-2">{row.client}</td>
                                  <td className="py-2 pr-2">${row.amount}</td>
                                  <td className="py-2 pr-2">
                                    <Badge variant={row.status === "pending" ? "secondary" : "default"}>
                                      {row.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MentorGate>
  );
};

export default MentorDashboard;
