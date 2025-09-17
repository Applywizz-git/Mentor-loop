// src/pages/SessionsPage.tsx
import { useEffect, useState } from "react";
import { Navbar } from "@/components/ui/navbar"; // Ensure this is the correct import path
import { supabase } from "@/lib/supabase";
import { listBookings } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import ReviewBox from "@/components/ReviewBox";

const SessionsPage = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0); // Add unreadCount state

  useEffect(() => {
    (async () => {
      const { data: uinfo } = await supabase.auth.getUser();
      const id = uinfo?.user?.id;
      if (!id) {
        setLoading(false);
        return;
      }
      const rows = await listBookings({ clientId: id });
      setBookings(rows as any);
      setLoading(false);

      // Fetch unread notifications count (replace with your real logic)
      const fetchedUnreadCount = 3; // For example
      setUnreadCount(fetchedUnreadCount); // Set unreadCount state
    })();
  }, []);

  const future = bookings.filter(
    (b) => b.status === "confirmed" && b.startIso && new Date(b.startIso) > new Date()
  );
  const past = bookings.filter((b) => b.startIso && new Date(b.startIso) <= new Date());

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar unreadCount={unreadCount} /> {/* Pass unreadCount here */}
      <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions {loading ? "" : `(${future.length})`}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : future.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
            ) : (
              future.map((b) => {
                const f = fmt(b.startIso);
                return (
                  <div key={b.id} className="flex justify-between items-center p-3 border rounded mb-2">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {f.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {f.time}</span>
                    </div>
                    <Badge>{b.status}</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Past Sessions {loading ? "" : `(${past.length})`}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : past.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past sessions yet.</p>
            ) : (
              past.map((b) => {
                const f = fmt(b.startIso);
                return (
                  <div key={b.id} className="p-3 border rounded mb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {f.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {f.time}</span>
                      </div>
                      <Badge>{b.status}</Badge>
                    </div>
                    <ReviewBox bookingId={b.id} mentorId={b.mentorId} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionsPage;
