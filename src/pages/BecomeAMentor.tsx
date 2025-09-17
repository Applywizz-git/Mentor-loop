import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/ui/navbar";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/applywizz-logo.png";

import { supabase } from "@/lib/supabase";

// Supabase-backed helpers (from src/lib/data.ts)
import {
  saveBasicInfo,                     // { profileId, email?, phone?, name? }
  uploadResume,                      // (file, userIdOrFolder) -> returns storage key
  upsertMentorApplication,           // { userId, profileId, resumePath?, specialties?, experience? }
  submitPublicMentorApplication,     // { name,email,phone,profileUrl?,specialties,experience,bio? }
  // NEW (minimal additions):
  markMentorIntent,                  // sets profiles.role = 'mentor_pending'
  getEmailConfirmed,                 // checks if the current user's email is confirmed
} from "@/lib/data";

type Step = 1 | 2 | 3 | 4;

const CATEGORIES = [
  "Software",
  "Product",
  "Data Science",
  "AI/ML",
  "Career Coaching",
  "Design",
  "Marketing",
];

const LANGS = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Spanish", "French"];

// Local type for employment history blocks (no global typing changes needed)
type EmploymentBlock = {
  company: string;
  from_year: number;
  to_year?: number | null;
  designation: string;
};

export default function BecomeAMentor() {
  const navigate = useNavigate();

  // Auth/profile (auth is optional)
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [profileId, setProfileId] = useState<string>("");

  // Wizard
  const [step, setStep] = useState<Step>(1);
  const totalSteps = 4;
  const progress = useMemo(() => (step / totalSteps) * 100, [step]);

  // STEP 1 — Basic Info (all required EXCEPT linkedinUrl)
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [photo, setPhoto] = useState<string>("");
  const [linkedinUrl, setLinkedinUrl] = useState<string>(""); // replaced profileUrl

  const emailValid = /^\S+@\S+\.\S+$/.test((email || "").trim());
  const mobileValid = !!(mobile && mobile.replace(/[^\d]/g, "").length >= 10);

  // STEP 2 — Resume (PDF) — REQUIRED
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const resumeOk = useMemo(() => {
    if (!resumeFile) return false;
    const isPdf =
      resumeFile.type === "application/pdf" ||
      resumeFile.name.toLowerCase().endsWith(".pdf");
    const sizeOk = resumeFile.size <= 10 * 1024 * 1024; // 10 MB
    return isPdf && sizeOk;
  }, [resumeFile]);

  // STEP 3 — Expertise
  const [categories, setCategories] = useState<string[]>([]);
  const [years, setYears] = useState<number | "">("");
  const [languages, setLanguages] = useState<string[]>([]); // optional UI only

  // STEP 4 — Employment History (repeating blocks)
  const emptyEmployment = (): EmploymentBlock => ({
    company: "",
    from_year: new Date().getFullYear(),
    to_year: null,
    designation: "",
  });
  const [employment, setEmployment] = useState<EmploymentBlock[]>([emptyEmployment()]);

  const [submitting, setSubmitting] = useState(false);

  // ------- helper: reuse existing profile by user_id (avoid duplicate user_id), insert only if missing
  async function ensureProfile(
    uid: string,
    pid: string,
    base: { name: string; email: string; phone: string }
  ): Promise<string> {
    // Prefer existing row by user_id (unique)
    const { data: byUser, error: e1 } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();
    if (e1) throw e1;

    let resolvedId = byUser?.id ?? (pid || uid);

    // If none by user_id, check by id; insert only if still missing
    if (!byUser) {
      const { data: byId, error: e2 } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", resolvedId)
        .maybeSingle();
      if (e2) throw e2;

      if (!byId) {
        const { error: insErr } = await supabase.from("profiles").insert({
          id: resolvedId,
          user_id: uid,
          name: base.name || null,
          email: base.email || null,
          phone: base.phone || null,
          role: "mentor",
        });
        if (insErr) throw insErr;
      }
    }

    // Normalize/update fields on the resolved row
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        name: base.name || null,
        email: base.email || null,
        phone: base.phone || null,
        role: "mentor",
      })
      .eq("id", resolvedId);
    if (upErr) throw upErr;

    return resolvedId;
  }
  // -------

  // ✅ NEW: helpers to transform employment → experiences JSON & pick current designation
  function toExperiencesPayload(blocks: EmploymentBlock[]) {
    return blocks.map((b) => ({
      company: b.company.trim(),
      title: b.designation.trim(),
      start_year: Number(b.from_year) || null,
      end_year:
        b.to_year === null || b.to_year === undefined || b.to_year === ("" as any)
          ? null
          : Number(b.to_year),
    }));
  }
  function inferCurrentDesignation(blocks: EmploymentBlock[]): string | null {
    if (!blocks.length) return null;
    // Prefer the block with no end_year (present), else the one with highest end_year, else highest start_year.
    const present = blocks.find((b) => b.to_year === null || b.to_year === undefined || (b.to_year as any) === "");
    if (present && present.designation.trim()) return present.designation.trim();

    const withEnd = blocks
      .filter((b) => typeof b.to_year === "number")
      .sort((a, b) => (Number(b.to_year) || 0) - (Number(a.to_year) || 0));
    if (withEnd[0]?.designation?.trim()) return withEnd[0].designation.trim();

    const byStart = [...blocks].sort((a, b) => (Number(b.from_year) || 0) - (Number(a.from_year) || 0));
    return byStart[0]?.designation?.trim() || null;
  }

  // Load current user + prefill if logged in (do NOT block if not logged in)
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth?.user;

        if (authUser?.id) {
          const uid = authUser.id;
          setUserId(uid);

          // Prefill from profiles (id often equals auth uid)
          const { data: prof, error: profErr } = await supabase
            .from("profiles")
            .select("id, name, email, phone, bio, avatar, specialties, experience")
            .eq("id", uid)
            .maybeSingle();
          if (profErr) throw profErr;

          const pid = prof?.id ?? uid;
          setProfileId(pid);

          setName(prof?.name ?? "");
          setEmail(prof?.email ?? authUser.email ?? "");
          setMobile(prof?.phone ?? "");
          setBio((prof as any)?.bio ?? "");
          setPhoto((prof as any)?.avatar ?? "");
          setCategories(Array.isArray(prof?.specialties) ? (prof?.specialties as string[]) : []);
          setYears(typeof prof?.experience === "number" ? prof?.experience : "");
        }
      } catch (e: any) {
        toast({
          title: "Error loading profile",
          description: e?.message ?? String(e),
          variant: "destructive",
        });
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleLanguage = (lng: string) => {
    setLanguages((prev) =>
      prev.includes(lng) ? prev.filter((l) => l !== lng) : [...prev, lng]
    );
  };

  // Employment handlers
  const addEmployment = () => setEmployment((prev) => [...prev, emptyEmployment()]);
  const updateEmployment = (idx: number, patch: Partial<EmploymentBlock>) =>
    setEmployment((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const removeEmployment = (idx: number) =>
    setEmployment((prev) => prev.filter((_, i) => i !== idx));

  const next = async () => {
    try {
      if (step === 1) {
        // All required EXCEPT linkedinUrl
        if (!name.trim() || !emailValid || !mobileValid || !bio.trim()) {
          toast({
            title: "Missing required fields",
            description: "Please complete name, email, mobile, and bio.",
            variant: "destructive",
          });
          return;
        }

        // If signed-in, ensure profile + persist basics; otherwise just continue.
        if (userId) {
          const resolvedId = await ensureProfile(userId, profileId, {
            name: name.trim(),
            email: email.trim(),
            phone: mobile.trim(),
          });
          setProfileId(resolvedId);

          await saveBasicInfo({
            profileId: resolvedId,
            email: email.trim(),
            phone: mobile.trim(),
            name: name.trim(),
          });

          // Save bio/avatar/linkedinUrl if column exists (ignore error)
          try {
            await supabase
              .from("profiles")
              .update({ bio: bio || null, avatar: photo || null, linkedin_url: linkedinUrl || null } as any)
              .eq("id", resolvedId);
          } catch {
            /* noop */
          }
        }

        setStep(2);
        toast({ title: "Saved", description: "Basic info updated." });
      } else if (step === 2) {
        // Resume is REQUIRED for everyone
        if (!resumeFile || !resumeOk) {
          toast({
            title: "Resume required",
            description: "Upload a PDF (≤10MB).",
            variant: "destructive",
          });
          return;
        }
        // If user is not logged in, upload under a generic folder
        const folder = userId || "public";
        const key = await uploadResume(resumeFile, folder);
        setResumePath(key);
        setStep(3);
        toast({ title: "Resume uploaded", description: "Proceed to expertise." });
      } else if (step === 3) {
        // Expertise fields required: at least one category & years value
        if (categories.length === 0 || years === "") {
          toast({
            title: "Almost there",
            description: "Select at least one domain and enter years of experience.",
            variant: "destructive",
          });
          return;
        }
        // Proceed to Step 4 (employment history)
        setStep(4);
      } else if (step === 4) {
        // Final submit
        setSubmitting(true);
        const safeYears = Math.max(0, Number(years || 0));

        // Simple client-side validation for employment rows (optional but helpful)
        const hasInvalidEmployment = employment.some(
          (e) =>
            !e.company.trim() ||
            !e.designation.trim() ||
            !e.from_year ||
            (e.to_year !== null && e.to_year !== undefined && Number(e.to_year) < Number(e.from_year))
        );
        if (hasInvalidEmployment) {
          toast({
            title: "Check employment entries",
            description: "Company, From year, and Designation are required. To year must be ≥ From year or left blank.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }

        // ✅ Build the extra fields for mentors table
        const experiencesPayload = toExperiencesPayload(employment);
        const currentDesignation = inferCurrentDesignation(employment);

        const normalizedEmail = email.trim().toLowerCase();

        if (userId && profileId) {
          // Logged-in flow
          await (upsertMentorApplication as any)({
            userId,
            profileId,
            resumePath,
            specialties: categories,
            experience: safeYears,
            // new fields sent along (backend can ignore if not yet supported)
            linkedinUrl: linkedinUrl?.trim() || null,
            employmentHistory: employment,
          });

          // ✅ Server-side UPSERT via RPC (no 409, bypasses RLS safely)
          try {
            const { error: rpcErr } = await supabase.rpc("save_mentor_application", {
              _user_id: userId || null,
              _email: normalizedEmail,
              _phone: mobile.trim(),
              _linkedin_url: linkedinUrl?.trim() || null,
              _total_experience: safeYears,
              _current_designation: currentDesignation,
              _experiences: experiencesPayload,
              _resume_path: resumePath || null,
            });
            if (rpcErr) throw rpcErr;
          } catch (e) {
            console.warn("[become-mentor] mentors rpc warn:", (e as any)?.message || e);
          }

          // NEW: flag as mentor_pending and enforce email confirmation guidance
          try {
            await markMentorIntent(profileId);
          } catch { /* noop */ }

          try {
            const confirmed = await getEmailConfirmed();
            if (!confirmed) {
              toast({
                title: "Application submitted",
                description: "Please confirm your email. We’ll get back to you soon.",
              });
              setSubmitting(false);
              navigate("/"); // back to home
              return;
            }
          } catch { /* noop */ }

          toast({
            title: "Application submitted",
            description: "We’ll get back to you soon.",
          });
        } else {
          // Public (no-login) flow — pass resumePath along
          await (submitPublicMentorApplication as any)({
            name: name.trim(),
            email: normalizedEmail,
            phone: mobile.trim(),
            // old helper expects profileUrl — we send linkedinUrl too for backend to pick up
            profileUrl: linkedinUrl.trim() || null,
            linkedinUrl: linkedinUrl.trim() || null,
            specialties: categories,
            experience: safeYears,
            bio: bio.trim() || null,
            resumePath: resumePath || null,
            employmentHistory: employment,
          });

          // ✅ Same RPC for public flow
          try {
            const { error: rpcErr } = await supabase.rpc("save_mentor_application", {
              _user_id: null,
              _email: normalizedEmail,
              _phone: mobile.trim(),
              _linkedin_url: linkedinUrl?.trim() || null,
              _total_experience: safeYears,
              _current_designation: currentDesignation,
              _experiences: experiencesPayload,
              _resume_path: resumePath || null,
            });
            if (rpcErr) throw rpcErr;
          } catch (e) {
            console.warn("[become-mentor] public mentors rpc warn:", (e as any)?.message || e);
          }

          toast({
            title: "Application submitted",
            description: "We’ll get back to you soon.",
          });
        }

        setSubmitting(false);
        navigate("/"); // back to home after submit
      }
    } catch (e: any) {
      setSubmitting(false);
      toast({
        title: "Error",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    }
  };

  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  if (loadingUser) {
    return (
      <>
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} className="h-8 w-auto" />
          <h1 className="text-2xl font-bold">Mentor Onboarding</h1>
        </div>

        <Progress value={progress} className="mb-6" />

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {step === 1 && "Step 1: Basic Info"}
              {step === 2 && "Step 2: Resume"}
              {step === 3 && "Step 3: Expertise"}
              {step === 4 && "Step 4: Employment History"}
            </CardTitle>
          </CardHeader>

        <CardContent className="space-y-6">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                    {!emailValid && email.length > 0 && (
                      <p className="text-xs text-red-500 mt-1">Enter a valid email.</p>
                    )}
                  </div>
                  <div>
                    <Label>Mobile number</Label>
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 9xxxx xxxxx"
                    />
                    {!mobileValid && mobile.length > 0 && (
                      <p className="text-xs text-red-500 mt-1">Enter at least 10 digits.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Short Bio</Label>
                    <Textarea
                      rows={6}
                      maxLength={500}
                      placeholder="Tell clients about your background (max 500 chars)"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {bio.length}/500
                    </p>
                  </div>
                  <div>
                    <Label>Profile Photo URL</Label>
                    <Input
                      placeholder="https://..."
                      value={photo}
                      onChange={(e) => setPhoto(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>LinkedIn URL</Label>
                    <Input
                      placeholder="https://linkedin.com/in/your-handle"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end md:col-span-2">
                  <Button
                    onClick={next}
                    // All required EXCEPT linkedinUrl
                    disabled={
                      !name.trim() ||
                      !emailValid ||
                      !mobileValid ||
                      !bio.trim()
                    }
                  >
                    Save & Continue
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="grid gap-4">
                <div>
                  <Label>Resume (PDF, ≤10MB)</Label>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  />
                  {resumeFile && (
                    <p className="text-xs mt-1">
                      Selected: {resumeFile.name} ({Math.round(resumeFile.size / 1024)} KB)
                    </p>
                  )}
                  {!resumeOk && resumeFile && (
                    <p className="text-xs text-red-500 mt-1">
                      Please upload a valid PDF file under 10MB.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Private upload. Admin can view via a signed link.
                  </p>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={back}>
                    Back
                  </Button>
                  <Button onClick={next} disabled={!resumeFile || !resumeOk}>
                    Upload & Continue
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label>Expertise / Specialties</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CATEGORIES.map((c) => (
                      <Button
                        key={c}
                        variant={categories.includes(c) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleCategory(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                  {categories.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">
                      Select at least one domain.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Years of Experience</Label>
                    <Input
                      type="number"
                      min={0}
                      value={years}
                      onChange={(e) =>
                        setYears(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label>Languages (optional)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {LANGS.map((l) => (
                        <Button
                          key={l}
                          variant={languages.includes(l) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleLanguage(l)}
                        >
                          {l}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={back}>
                    Back
                  </Button>
                  <Button
                    onClick={next}
                    disabled={categories.length === 0 || years === ""}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  {employment.map((block, idx) => (
                    <div key={idx} className="rounded-lg border p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Company</Label>
                        <Input
                          value={block.company}
                          onChange={(e) => updateEmployment(idx, { company: e.target.value })}
                          placeholder="Company name"
                        />
                      </div>
                      <div>
                        <Label>From (Year)</Label>
                        <Input
                          type="number"
                          value={block.from_year}
                          onChange={(e) => updateEmployment(idx, { from_year: Number(e.target.value || new Date().getFullYear()) })}
                        />
                      </div>
                      <div>
                        <Label>To (Year)</Label>
                        <Input
                          type="number"
                          value={block.to_year ?? ""}
                          onChange={(e) => updateEmployment(idx, { to_year: e.target.value === "" ? null : Number(e.target.value) })}
                          placeholder="(or leave blank for Present)"
                        />
                      </div>
                      <div>
                        <Label>Designation</Label>
                        <Input
                          value={block.designation}
                          onChange={(e) => updateEmployment(idx, { designation: e.target.value })}
                          placeholder="e.g., Senior Engineer"
                        />
                      </div>
                      {employment.length > 1 && (
                        <div className="md:col-span-4">
                          <Button variant="ghost" onClick={() => removeEmployment(idx)}>Remove</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <div>
                    <Button variant="outline" onClick={addEmployment}>Add</Button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={back}>
                    Back
                  </Button>
                  <Button onClick={next} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit Application"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
