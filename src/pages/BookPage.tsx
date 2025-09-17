// src/pages/BookPage.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent } from "@/components/ui/card";

export default function BookPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const mentorId = useMemo(() => params.get("mentorId") || "", [params]);
  const slotId = useMemo(() => params.get("slotId") || "", [params]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {!mentorId ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">Missing mentorId.</p>
              <button className="underline" onClick={() => navigate(-1)}>Go back</button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Book Session</h2>
                <p className="text-sm text-muted-foreground">
                  Mentor: <b>{mentorId}</b>{slotId ? <> · Slot: <b>{slotId}</b></> : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  (Your booking widget can be wired here. For now, auth + redirect flow is in place.)
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
