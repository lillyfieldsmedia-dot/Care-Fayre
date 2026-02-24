import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";
import { ArrowLeft, Briefcase, Globe, Phone, Building2, CalendarDays, FileText, Star } from "lucide-react";
import { CQCLiveInfo } from "@/components/CQCLiveInfo";
import { Button } from "@/components/ui/button";

type AgencyProfileData = {
  id: string;
  agency_name: string;
  bio: string | null;
  website: string | null;
  phone: string | null;
  cqc_rating: string | null;
  cqc_provider_id: string | null;
  cqc_location_id: string | null;
  cqc_verified: boolean;
  cqc_explanation: string | null;
  years_in_operation: number | null;
  active_jobs_count: number;
};

type Review = {
  id: string;
  star_rating: number;
  comment: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
};

export default function AgencyProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<AgencyProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase
        .from("agency_profiles")
        .select("id, agency_name, bio, website, phone, cqc_rating, cqc_provider_id, cqc_location_id, cqc_verified, cqc_explanation, years_in_operation")
        .eq("id", id)
        .single(),
      supabase
        .from("reviews")
        .select("id, star_rating, comment, created_at, customer_id")
        .eq("agency_profile_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("agency_profile_id", id)
        .eq("status", "active"),
    ]).then(async ([profileRes, reviewsRes, jobsCountRes]) => {
      const profileData = profileRes.data ? { ...profileRes.data, active_jobs_count: jobsCountRes.count ?? 0 } : null;
      setProfile(profileData as AgencyProfileData | null);

      // Fetch reviewer names from profiles
      const rawReviews = (reviewsRes.data || []) as any[];
      if (rawReviews.length > 0) {
        const customerIds = rawReviews.map((r: any) => r.customer_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", customerIds);
        const nameMap = new Map((profilesData || []).map((p: any) => [p.user_id, p.full_name]));
        setReviews(rawReviews.map((r: any) => ({
          id: r.id,
          star_rating: r.star_rating,
          comment: r.comment,
          created_at: r.created_at,
          profiles: { full_name: nameMap.get(r.customer_id) || "Anonymous" },
        })));
      } else {
        setReviews([]);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h2 className="font-serif text-2xl text-foreground">Agency not found</h2>
          <Button asChild className="mt-4"><Link to="/">Go Home</Link></Button>
        </div>
      </div>
    );
  }

  const showExplanation =
    profile.cqc_explanation &&
    profile.cqc_rating &&
    !["Outstanding", "Good"].includes(profile.cqc_rating);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.star_rating, 0) / reviews.length
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-3xl py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="rounded-xl border border-border bg-card p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl text-foreground">{profile.agency_name}</h1>
              <div className="mt-2 flex items-center gap-3">
                <CQCRatingBadge rating={profile.cqc_rating} />
                {profile.cqc_verified && (
                  <span className="text-xs text-accent font-medium">✓ CQC Verified</span>
                )}
                {avgRating !== null && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="text-sm font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <div className="text-center">
                <p className="font-serif text-2xl text-foreground">{profile.active_jobs_count}</p>
                <p className="text-xs text-muted-foreground">Active Clients</p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {profile.cqc_provider_id && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">CQC Provider ID</p>
                  <p className="text-sm font-medium text-foreground">{profile.cqc_provider_id}</p>
                </div>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground">{profile.phone}</p>
                </div>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              </div>
            )}
            {profile.years_in_operation != null && (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Years in Operation</p>
                  <p className="text-sm font-medium text-foreground">{profile.years_in_operation}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-6">
              <h2 className="mb-2 font-serif text-lg text-foreground">About</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* CQC Explanation */}
          {showExplanation && (
            <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-serif text-lg text-foreground">CQC Rating Explanation</h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{profile.cqc_explanation}</p>
            </div>
          )}

          {/* Live CQC Data */}
          <CQCLiveInfo locationId={profile.cqc_location_id} providerId={profile.cqc_provider_id} />
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <h2 className="font-serif text-xl text-foreground">
            Reviews
            {avgRating !== null && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                — {avgRating.toFixed(1)} avg from {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>

          {reviews.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card py-12 text-center">
              <Star className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= review.star_rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-foreground">{review.profiles?.full_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
