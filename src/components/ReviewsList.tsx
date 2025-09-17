// src/components/ReviewsList.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";

type Review = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
};

export default function ReviewsList({ mentorId }: { mentorId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    return Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10;
  }, [reviews]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("mentor_reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("mentor_id", mentorId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!ignore) {
        setReviews(error ? [] : (data as Review[]) || []);
        setLoading(false);
      }
    }
    load();
    // (Optional) Realtime subscribe to new reviews
    const channel = supabase
      .channel(`reviews-${mentorId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_reviews", filter: `mentor_id=eq.${mentorId}` },
        (payload) => setReviews(prev => [payload.new as Review, ...prev])
      )
      .subscribe();
    return () => { ignore = true; supabase.removeChannel(channel); };
  }, [mentorId]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <h3 className="text-xl font-semibold">Reviews</h3>
        {loading ? (
          <span className="text-sm text-muted-foreground">Loading…</span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {reviews.length ? `${avg} / 5 • ${reviews.length} review${reviews.length>1?"s":""}` : "No reviews yet"}
          </span>
        )}
      </div>

      {!loading && reviews.map(r => (
        <Card key={r.id} className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{Array.from({length: r.rating}).map((_,i)=>"★").join("")}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <p className="mt-2 text-sm leading-6">{r.comment}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
