import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Safe JSON parse
    const raw = await req.text();
    const { email, mentorId, sessionDate, clientEmail, redirectTo } = JSON.parse(raw || "{}") as {
      email?: string;
      mentorId?: string;
      sessionDate?: string;
      clientEmail?: string;
      redirectTo?: string;
    };

    if (!email || !mentorId || !sessionDate || !clientEmail) {
      return new Response(JSON.stringify({ error: "email, mentorId, sessionDate, and clientEmail are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL")!;
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRole);

    // Load mentor row if mentorId provided (admin approval path)
    let mentor: any | null = null;
    if (mentorId) {
      const { data, error } = await sb.from("mentors").select("*").eq("id", mentorId).single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      mentor = data;

      // If already approved AND invite already sent -> idempotent short-circuit
      if (mentor.application_status === "approved" && mentor.invite_sent === true) {
        return new Response(JSON.stringify({ ok: true, alreadyApproved: true, alreadyRegistered: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If not approved yet, approve now + stamp approved_at
      if (mentor.application_status !== "approved") {
        const { error: upErr } = await sb
          .from("mentors")
          .update({ application_status: "approved", approved_at: new Date().toISOString() })
          .eq("id", mentorId);
        if (upErr) throw upErr;
      }
    }

    // Insert booking record into the "bookings" table
    const { data: bookingData, error: bookingError } = await sb
      .from("bookings")
      .insert([{ client_email: clientEmail, mentor_id: mentorId, session_date: sessionDate }])
      .single();

    if (bookingError) {
      throw new Error(bookingError.message);
    }

    // Send notifications to mentor and client
    const mentorNotification = {
      user_id: mentor.user_id,
      message: `You have a new session booked by ${clientEmail} for ${sessionDate}`,
      read: false,
      type: "mentor",
    };

    const clientNotification = {
      user_id: clientEmail, // Assuming client has a user_id or email linked to user_id in profiles
      message: `Your session with ${mentor.name} has been booked for ${sessionDate}`,
      read: false,
      type: "client",
    };

    await sb.from("notifications").insert([mentorNotification, clientNotification]);

    // Send email to mentor
    await sb.auth.api.sendEmail(
      mentor.email,
      "New Session Booking",
      `You have a new session booked by ${clientEmail} for ${sessionDate}`
    );

    // Send email to client
    await sb.auth.api.sendEmail(
      clientEmail,
      "Session Booking Confirmation",
      `Your session with ${mentor.name} has been booked for ${sessionDate}`
    );

    return new Response(
      JSON.stringify({
        ok: true,
        alreadyRegistered: false,
        userId: mentor.user_id ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
