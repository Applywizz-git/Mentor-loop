
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Calendar, CheckCircle, Clock, Eye, Check, X, User as UserIcon, KeyRound, LogOut, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAdminStats,
  listMentors,
  listBookings,
  getCurrentUser,
  logout,
  upsertMentorProfile,
  approveMentor,
  rejectMentor,
} from "@/lib/data";
import { AdminStats, Mentor, Booking } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

// dropdown + dialog
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ✅ use supabase directly
import { supabase } from "@/lib/supabase";

const AdminDashboard = () => {
  const navigate = useNavigate();
  // ✅ make user reference stable
  const user = useMemo(() => getCurrentUser(), []);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // ✅ NEW: pending mentor APPLICATIONS (from mentors table joined with profiles)
  const [pendingApps, setPendingApps] = useState<any[]>([]);

  // Eye dialog state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewMentor, setViewMentor] = useState<Mentor | null>(null);

  // Add-mentor dialog state (extended)
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addExperience, setAddExperience] = useState<number | string>("");
  const [addSpecialties, setAddSpecialties] = useState("");
  const [addAvatar, setAddAvatar] = useState("");
  // ✅ NEW fields
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addResumeFile, setAddResumeFile] = useState<File | null>(null);

  // ✅ guard so data load runs once
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }
    (async () => {
      try {
        const [s, ms, bs] = await Promise.all([
          getAdminStats(),
          listMentors(),
          listBookings(),
        ]);
        setStats(s);
        setMentors(ms);
        setBookings(bs);

        // ✅ fetch pending mentor applications from mentors table
        //    include new fields for designation, total experience, and detailed experiences
        const { data: apps, error: appsErr } = await supabase
          .from("mentors")
          .select(`
    id,
    profile_id,
    user_id,
    resume_url,
    application_status,
    created_at,
    applicant_name,
    applicant_email,
    applicant_phone,
    applicant_specialties,
    applicant_experience,
    current_designation,
    total_experience,
    experiences,
    profiles!left (
      id, user_id, name, email, phone, avatar, title, company, experience, rating, bio, specialties, verified, role, timezone
    )
  `)
          .eq("application_status", "pending")
          .order("created_at", { ascending: false });

        if (appsErr) {
          console.error("Admin mentors query failed:", appsErr);
        }

        if (appsErr) throw appsErr;
        setPendingApps(apps ?? []);
      } catch (e: any) {
        toast({
          title: "Failed to load admin data",
          description: e?.message ?? "Please check your permissions and try again.",
          variant: "destructive",
        });
      }
    })();
  }, [user?.role, navigate]);

  // Derived lists (approved still comes from mentors list which shows verified/public)
  const pendingMentors = useMemo(
    () =>
      mentors.filter(
        (m: any) => (m as any).status === "pending" || (m as any).status === "pending_approval"
      ),
    [mentors]
  );

  const approvedMentors = useMemo(
    () =>
      mentors.filter(
        (m: any) =>
          (m as any).status === "approved" ||
          (m as any).status === "active" ||
          (m as any).verified === true
      ),
    [mentors]
  );

  // ✅ refresh also re-fetches pending mentor applications
  const refresh = async () => {
    try {
      const [ms, s, bs] = await Promise.all([listMentors(), getAdminStats(), listBookings()]);
      setMentors(ms);
      setStats(s);
      setBookings(bs);

      const { data: apps, error: appsErr } = await supabase
        .from("mentors")
        .select(`
          id,
          profile_id,
          user_id,
          resume_url,
          application_status,
          created_at,
          applicant_name,
          applicant_email,
          applicant_phone,
          applicant_specialties,
          applicant_experience,
          current_designation,
          total_experience,
          experiences,
          profiles!left (
            id, user_id, name, email, phone, avatar, title, company, experience, rating, bio, specialties, verified, role, timezone
          )
        `)
        .eq("application_status", "pending")
        .order("created_at", { ascending: false });

      if (appsErr) throw appsErr;
      setPendingApps(apps ?? []);
    } catch (e: any) {
      toast({
        title: "Refresh failed",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    }
  };

  // Existing mentor approve by mentorId (kept)
  const handleApproveMentor = async (mentorId: string) => {
    try {
      await approveMentor(mentorId);
      await refresh();
      toast({ title: "Mentor Approved", description: "Mentor has been successfully approved." });
    } catch (e: any) {
      toast({ title: "Approve failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const handleRejectMentor = async (mentorId: string) => {
    try {
      await rejectMentor(mentorId);
      await refresh();
      toast({ title: "Mentor Rejected", description: "Mentor application has been rejected." });
    } catch (e: any) {
      toast({ title: "Reject failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const handleViewMentor = (mentorId: string) => {
    const m = mentors.find((mt) => mt.id === mentorId) || null;
    setViewMentor(m);
    setViewOpen(true);
  };

  // ✅ Approve/Reject by APPLICATION (has mentorId + maybe profileId)
  const handleApproveApplication = async (app: any) => {
    try {
      const email =
        app?.profiles?.email ||
        app?.applicant_email ||
        "";

      if (!email) {
        throw new Error("Applicant email is missing.");
      }

      // 🔔 Call Edge Function to approve (idempotent) + send invite if needed
      const { data, error } = await supabase.functions.invoke("mentor-invite", {
        body: {
          mentorId: app.id,
          email,
          redirectTo: `${window.location.origin}/set-password`,
        },
      });
      if (error) throw error;

      // ✅ If the user already exists, send reset-pw email to /set-password
      if (data?.alreadyRegistered) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/set-password`,
        });
        if (resetErr) throw resetErr;
        toast({
          title: "Mentor Approved",
          description: "Existing account detected — sent password reset email.",
        });
      } else if (data?.alreadyApproved) {
        toast({
          title: "Already Approved",
          description: "This mentor was already approved. No new email sent.",
        });
      } else {
        toast({
          title: "Mentor Approved",
          description: "Invite email sent with password setup link.",
        });
      }

      // Remove the row locally for snappier UI (server refresh also runs)
      setPendingApps((rows) => rows.filter((r) => r.id !== app.id));
      await refresh();
    } catch (e: any) {
      toast({
        title: "Approve failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectApplication = async (app: any) => {
    try {
      const { error } = await supabase
        .from("mentors")
        .update({ application_status: "rejected" })
        .eq("id", app.id);
    if (error) throw error;

      setPendingApps((rows) => rows.filter((r) => r.id !== app.id));
      await refresh();
      toast({ title: "Mentor Rejected", description: "Application set to rejected." });
    } catch (e: any) {
      toast({ title: "Reject failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  // ✅ view resume (signed URL) – supports both resume_url and resume_path
  const handleViewResume = async (resumePath: string) => {
    try {
      const { data, error } = await supabase.storage.from("resumes").createSignedUrl(resumePath, 120);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "Unable to open resume", description: e?.message ?? "Try again.", variant: "destructive" });
    }
  };

  // ADD NEW MENTOR (updated to use RPC + then mark approved)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!addEmail) {
        toast({ title: "Email required", description: "Enter the mentor's email.", variant: "destructive" });
        return;
      }

      const normalizedEmail = addEmail.trim().toLowerCase();

      // 1) Find profile by email (user must have signed up)
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, user_id")
        .ilike("email", normalizedEmail)
        .maybeSingle();
      if (profErr) throw profErr;
      if (!prof) {
        toast({
          title: "No user found",
          description: "Ask the mentor to sign up first using this email.",
          variant: "destructive",
        });
        return;
      }

      // 2) Update profile details + role=mentor (keep as-is)
      const { error: upProfErr } = await supabase
        .from("profiles")
        .update({ name: addName || null, phone: addPhone || null, role: "mentor" })
        .eq("id", prof.id);
      if (upProfErr) throw upProfErr;

      // 3) Upload resume (optional) — **key must NOT include 'resumes/' prefix**
      let resumePath: string | null = null;
      if (addResumeFile) {
        const ext = addResumeFile.name.split(".").pop()?.toLowerCase() || "pdf";
        const key = `${prof.user_id}/${Date.now()}-resume.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("resumes")
          .upload(key, addResumeFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: addResumeFile.type || "application/pdf",
          });
        if (upErr) throw upErr;
        resumePath = key;
      }

      // 4) Server-side upsert (avoids 409 & RLS issues)
      {
        const { error: rpcErr } = await supabase.rpc("save_mentor_application", {
          _user_id: prof.user_id ?? null,
          _email: normalizedEmail,
          _phone: addPhone || null,
          _linkedin_url: null,
          _total_experience: Number(addExperience) || 0,
          _current_designation: addTitle || null,
          _experiences: null,
          _resume_path: resumePath || null,
        });
        if (rpcErr) throw rpcErr;
      }

      // 5) Find mentors row (by user_id or email), then set approved + approved_at + resume_url if uploaded
      let targetId: string | null = null;
      {
        const { data: byUser, error: byUserErr } = await supabase
          .from("mentors")
          .select("id")
          .eq("user_id", prof.user_id)
          .maybeSingle();
        if (byUserErr) throw byUserErr;
        if (byUser?.id) targetId = byUser.id;
      }
      if (!targetId) {
        const { data: byEmail, error: byEmailErr } = await supabase
          .from("mentors")
          .select("id")
          .ilike("applicant_email", normalizedEmail)
          .maybeSingle();
        if (byEmailErr) throw byEmailErr;
        if (byEmail?.id) targetId = byEmail.id;
      }
      if (targetId) {
        const { error: upStatusErr } = await supabase
          .from("mentors")
          .update({
            application_status: "approved",
            approved_at: new Date().toISOString(),
            // keep the uploaded path in the row for quick access
            resume_url: resumePath || null,
          })
          .eq("id", targetId);
        if (upStatusErr) throw upStatusErr;
      }

      // 6) Save expertise into profile (unchanged)
      const specialArr = addSpecialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const { error: profExpErr } = await supabase
        .from("profiles")
        .update({
          title: addTitle || null,
          experience: Number(addExperience) || 0,
          specialties: specialArr.length ? specialArr : null,
        })
        .eq("id", prof.id);
      if (profExpErr) throw profExpErr;

      // 7) Verify profile (unchanged)
      const { error: verifyErr } = await supabase.rpc("admin_set_verified", {
        _profile_id: prof.id,
        _verified: true,
      });
      if (verifyErr) throw verifyErr;

      await refresh();

      setAddOpen(false);
      setAddName("");
      setAddTitle("");
      setAddExperience("");
      setAddSpecialties("");
      setAddAvatar("");
      setAddEmail("");
      setAddPhone("");
      setAddResumeFile(null);

      toast({ title: "Mentor added", description: "Mentor is now approved and visible in Find Mentors." });
    } catch (e: any) {
      toast({ title: "Add failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  if (!user || user.role !== "admin") return null;

  const statusClasses: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    rescheduled: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-gray-100 text-gray-800",
    no_show: "bg-red-100 text-red-800",
    default: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome back, {user.name}</span>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus:outline-none">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user?.name?.[0] ?? "A"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="space-y-0.5">
                  <div className="text-sm font-semibold leading-none">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate("/admin/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Update Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/password")}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Update Password
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Mentors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMentors}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Mentors</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingMentors}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="mentors" className="space-y-6">
          <TabsList>
            <TabsTrigger value="mentors">Mentors</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          {/* MENTORS TAB */}
          <TabsContent value="mentors" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Mentor Management</h2>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Mentor
              </Button>
            </div>

            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">Pending Applications</TabsTrigger>
                <TabsTrigger value="approved">Approved Mentors</TabsTrigger>
              </TabsList>

              {/* PENDING (applications from mentors with optional profile) */}
              <TabsContent value="pending">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Mentor Applications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mentor</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Specialties</TableHead>
                          <TableHead>Resume</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingApps.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-sm text-muted-foreground">
                              No pending applications.
                            </TableCell>
                          </TableRow>
                        )}
                        {pendingApps.map((app: any) => {
                          const prof = app.profiles; // may be null if public applicant
                          const name = prof?.name || app.applicant_name || "Unknown";
                          const email = prof?.email || app.applicant_email || "";
                          const avatar = prof?.avatar || undefined;

                          // ✅ designation, total experience, and detailed experiences
                          const designation =
                            prof?.title ||
                            app.current_designation ||
                            "—";
                          const totalYears =
                            (typeof app.total_experience === "number" ? app.total_experience : undefined) ??
                            (typeof prof?.experience === "number" ? prof.experience : undefined) ??
                            (typeof app.applicant_experience === "number" ? app.applicant_experience : 0);
                          const expList = Array.isArray(app.experiences) ? app.experiences : [];

                          const specialties: string[] =
                            (Array.isArray(prof?.specialties) && prof?.specialties) ||
                            (Array.isArray(app.applicant_specialties) && app.applicant_specialties) ||
                            [];

                          const resumeKey = app.resume_url || app.resume_path || null;

                          return (
                            <TableRow key={app.id}>
                              <TableCell className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={avatar} />
                                  <AvatarFallback>{(name || "M").charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{name}</div>
                                  <div className="text-sm text-muted-foreground">{email}</div>
                                  <div className="text-xs text-muted-foreground">{designation}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{totalYears ?? 0} years</div>
                                {expList.length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {expList.slice(0, 3).map((e: any, i: number) => (
                                      <div key={i} className="text-xs text-muted-foreground">
                                        {e.company || "Company"} — {e.title || "Designation"}{" "}
                                        ({e.start_year ?? "YYYY"}–{e.end_year ?? "YYYY"})
                                      </div>
                                    ))}
                                    {expList.length > 3 && (
                                      <div className="text-[10px] text-muted-foreground">+{expList.length - 3} more</div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {specialties.slice(0, 3).map((s: string) => (
                                    <Badge key={s} variant="secondary" className="text-xs">
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                {resumeKey ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewResume(resumeKey)}
                                  >
                                    View Resume
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-yellow-600">
                                  Pending
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveApplication(app)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectApplication(app)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* APPROVED (unchanged: uses mentors list) */}
              <TabsContent value="approved">
                <Card>
                  <CardHeader>
                    <CardTitle>Approved Mentors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mentor</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Sessions</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedMentors.map((mentor: any) => (
                          <TableRow key={mentor.id}>
                            <TableCell className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={mentor.avatar} />
                                <AvatarFallback>{mentor?.name?.[0] ?? "M"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{mentor.name}</div>
                                <div className="text-sm text-muted-foreground">{mentor.title}</div>
                              </div>
                            </TableCell>
                            <TableCell>{mentor.experience} years</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span>⭐</span>
                                <span>{mentor.rating ?? 0}</span>
                                <span className="text-muted-foreground">({mentor.reviews ?? 0})</span>
                              </div>
                            </TableCell>
                            <TableCell>{mentor.reviews ?? 0}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      const mentor = mentors.find((m) => m.id === (booking as any).mentorId);
                      const cls = statusClasses[String((booking as any).status)] ?? statusClasses.default;
                      const clientLabel = (booking as any).menteeName ?? (booking as any).clientId ?? "Unknown";
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                          <TableCell>{clientLabel}</TableCell>
                          <TableCell>{mentor?.name || "Unknown"}</TableCell>
                          <TableCell>
                            <Badge className={cls}>{(booking as any).status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">Sarah Chen approved as mentor</span>
                      <span className="text-xs text-muted-foreground ml-auto">2h ago</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm">New booking created</span>
                      <span className="text-xs text-muted-foreground ml-auto">4h ago</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm">Mentor application submitted</span>
                      <span className="text-xs text-muted-foreground ml-auto">6h ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Platform Name</span>
                      <span className="text-sm font-medium">ApplyWizz</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Support Email</span>
                      <span className="text-sm font-medium">support@applywizz.com</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Default Rate Range</span>
                      <span className="text-sm font-medium">$100 - $300</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Eye Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mentor Details</DialogTitle>
          </DialogHeader>

          {viewMentor && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200">
                  {viewMentor.avatar ? (
                    <img src={viewMentor.avatar} alt={viewMentor.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-medium">
                      {viewMentor.name?.[0] ?? "M"}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">{viewMentor.name}</div>
                  <div className="text-sm text-muted-foreground">{viewMentor.title}</div>
                  {viewMentor.company && (
                    <div className="text-xs text-muted-foreground">{viewMentor.company}</div>
                  )}
                </div>
              </div>

              <div className="text-sm">
                <span className="font-medium">Experience:</span> {viewMentor.experience} years
              </div>

              {Array.isArray(viewMentor.specialties) && viewMentor.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {viewMentor.specialties.slice(0, 6).map((s) => (
                    <span key={s} className="px-2 py-1 rounded-md bg-muted text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {viewMentor.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{viewMentor.bio}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Mentor Dialog (updated to collect email/phone/resume) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Mentor (Approve Now)</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* REQUIRED NEW FIELDS */}
              <div className="md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="mentor@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={addName} onChange={(e) => setAddName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="phone">Mobile</Label>
                <Input id="phone" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="+91 ..." />
              </div>

              {/* Expertise */}
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="exp">Experience (years)</Label>
                <Input
                  id="exp"
                  type="number"
                  min={0}
                  value={addExperience}
                  onChange={(e) => setAddExperience(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="specialties">Expertise (comma separated)</Label>
                <Input
                  id="specialties"
                  value={addSpecialties}
                  onChange={(e) => setAddSpecialties(e.target.value)}
                  placeholder="React, Supabase, Tailwind"
                />
              </div>

              {/* Optional visuals */}
              <div className="md:col-span-2">
                <Label htmlFor="avatar">Avatar URL (optional)</Label>
                <Input
                  id="avatar"
                  value={addAvatar}
                  onChange={(e) => setAddAvatar(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Resume */}
              <div className="md:col-span-2">
                <Label htmlFor="resume">Resume (PDF, optional)</Label>
                <Input
                  id="resume"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setAddResumeFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save & Approve</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
;
