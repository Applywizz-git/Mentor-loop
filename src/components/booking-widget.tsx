import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingConfirmation } from "@/components/ui/booking-confirmation";
import { Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { listSlotsForMentor } from "@/lib/data";
import { TimeSlot, Mentor } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { setPostAuthRedirect, setPostAuthAction } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface BookingWidgetProps {
  mentor: Mentor;
}

export const BookingWidget = ({ mentor }: BookingWidgetProps) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [bookingBusy, setBookingBusy] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{ id: string; slot: TimeSlot } | null>(null);

  // Load slots (async)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingSlots(true);
      try {
        const mentorSlots = await listSlotsForMentor(mentor.id);
        if (mounted) setSlots(mentorSlots);
      } catch (err: any) {
        toast({
          title: "Failed to load slots",
          description: err?.message ?? "Please try again later.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mentor.id]);

  // Resume booking after login: listener re-applies selected slot/date
  useEffect(() => {
    function onResume(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { type: "resume_booking"; mentorId: string; slotId?: string; packageId?: string }
        | undefined;
      if (!detail || detail.type !== "resume_booking") return;
      if (detail.mentorId !== mentor.id) return;

      if (detail.slotId) {
        const s = slots.find((x) => x.id === detail.slotId);
        if (s) {
          setSelectedSlot(s);
          setSelectedDate(new Date(s.startIso));
        }
      }
    }
    window.addEventListener("aw:resume-booking", onResume);
    return () => window.removeEventListener("aw:resume-booking", onResume);
  }, [mentor.id, slots]);

  // Build the next 7 days as options, but disable days that have no slots
  const dateOptions = useMemo(() => {
    const days: { date: Date; hasSlots: boolean; label: string }[] = [];
    const today = new Date();

    const availableDateStrs = new Set<string>();
    for (const s of slots) {
      if (!s.available) continue;
      const start = new Date(s.startIso);
      if (start.getTime() <= Date.now()) continue; // only future times
      const key = format(start, "yyyy-MM-dd");
      availableDateStrs.add(key);
    }

    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const key = format(date, "yyyy-MM-dd");
      const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
      const isTomorrow = format(date, "yyyy-MM-dd") === format(addDays(today, 1), "yyyy-MM-dd");
      let label = format(date, "EEE, MMM d");
      if (isToday) label = "Today";
      else if (isTomorrow) label = "Tomorrow";

      days.push({
        date,
        hasSlots: availableDateStrs.has(key),
        label,
      });
    }
    return days;
  }, [slots]);

  // Slots for the selected date (only future, available)
  const selectedDateSlots = useMemo(() => {
    const selectedKey = format(selectedDate, "yyyy-MM-dd");
    return slots
      .filter((slot) => {
        if (!slot.available) return false;
        const slotDate = new Date(slot.startIso);
        if (slotDate.getTime() <= Date.now()) return false; // omit past times
        return format(slotDate, "yyyy-MM-dd") === selectedKey;
      })
      .sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime());
  }, [slots, selectedDate]);

  // Make booking (async + auth check)
  const handleBooking = async () => {
    if (!selectedSlot) return;

    // Ensure user is logged in (and get a user id we can pass to RPC)
    const { data: sessionData } = await supabase.auth.getSession();
    let userId: string | null = sessionData?.session?.user?.id ?? null;

    if (!userId) {
      // Not logged in → remember where to return and what we were doing
      const backTo = `/mentors/${mentor.id}?tab=availability`;
      setPostAuthRedirect(backTo);
      setPostAuthAction({
        type: "resume_booking",
        mentorId: mentor.id,
        slotId: selectedSlot.id,
      });
      navigate("/login");
      return;
    }

    setBookingBusy(true);
    try {
      // Resolve display name/email from session
      const user = sessionData.session!.user;
      const clientName = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Client") as string;
      const clientEmail = user.email ?? "";

      // RPC: book_slot — pass _user_id explicitly (belt & suspenders)
      const { data, error } = await supabase.rpc("book_slot", {
        _mentor_id: mentor.id,
        _slot_id: selectedSlot.id,
        _mentee_name: clientName,
        _mentee_email: clientEmail,
        _user_id: userId,
      });
      if (error) throw error;

      const bookingId = data as string; // book_slot returns uuid

      setConfirmedBooking({ id: bookingId, slot: selectedSlot });
      setShowConfirmation(true);

      // Refresh slots after successful booking
      const updated = await listSlotsForMentor(mentor.id);
      setSlots(updated);
      setSelectedSlot(null);

      // Optional: fire-and-forget email (non-blocking)
      fetch("https://applywizz-mentorship.vercel.app/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "ganesh@applywizz.com",
          subject: "New Ticket raised in ApplyWizz Ticketing Tool For Resume Update",
          htmlBody: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
                <h2 style="color:#1E90FF;">Hello Sriketh (sriketh@applywizz.com)</h2>
                <p>Your ticket has been created successfully.</p>
                <hr style="border:none;border-top:1px solid #eee;" />
                <p>Best regards,<br/> <strong>ApplyWizz Ticketing Tool Support Team.</strong></p>
                <hr style="border:none;border-top:1px solid #eee;" />
                <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
              </body>
            </html>
          `,
        }),
      }).catch(() => {});
    } catch (err: any) {
      console.error("[BookingWidget] book_slot error:", err);
      toast({
        title: "Booking Failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Book a Session
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div>
          <h4 className="font-medium mb-3">Select Date</h4>
          <div className="flex flex-wrap gap-2">
            {dateOptions.map(({ date, hasSlots, label }) => {
              const isSelected =
                format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
              return (
                <Button
                  key={date.toISOString()}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  disabled={!hasSlots || loadingSlots}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  className={!hasSlots ? "opacity-60 cursor-not-allowed" : ""}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Time Selection */}
        <div>
          <h4 className="font-medium mb-3">Available Times</h4>

          {loadingSlots ? (
            <p className="text-muted-foreground text-sm">Loading slots…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {selectedDateSlots.map((slot) => (
                  <Button
                    key={slot.id}
                    variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSlot(slot)}
                    className="justify-start"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {format(new Date(slot.startIso), "h:mm a")}
                  </Button>
                ))}
              </div>

              {selectedDateSlots.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No available slots for this date
                </p>
              )}
            </>
          )}
        </div>

        {/* Confirm Button (creates a *requested* booking; "confirmed" will be via separate action) */}
        <Button
          className="w-full"
          onClick={handleBooking}
          disabled={!selectedSlot || bookingBusy}
          size="lg"
        >
          {bookingBusy ? "Booking…" : "Confirm Booking"}
        </Button>
      </CardContent>

      {/* Booking Confirmation Modal */}
      {confirmedBooking && (
        <BookingConfirmation
          open={showConfirmation}
          onOpenChange={(open) => {
            setShowConfirmation(open);
            if (!open) {
              navigate("/mentors");
            }
          }}
          mentor={mentor}
          slot={confirmedBooking.slot}
          bookingId={confirmedBooking.id}
        />
      )}
    </Card>
  );
};
