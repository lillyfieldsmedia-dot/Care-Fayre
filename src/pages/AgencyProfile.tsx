import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";
import { ArrowLeft, Briefcase, Globe, Phone, Building2, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type AgencyProfileData = {
  id: string;
  agency_name: string;
  bio: string | null;
  website: string | null;
  phone: string | null;
  cqc_rating: string | null;
  cqc_provider_id: string | null;
  cqc_verified: boolean;
  cqc_explanation: string | null;
  years_in_operation: number | null;
  active_jobs_count: number;
};

export default function AgencyProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<AgencyProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("agency_profiles")
      .select("id, agency_name, bio, website, phone, cqc_rating, cqc_provider_id, cqc_verified, cqc_explanation, years_in_operation, active_jobs_count")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setProfile(data as AgencyProfileData | null);
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
              <div className="mt-2 flex items-center gap-2">
                <CQCRatingBadge rating={profile.cqc_rating} />
                {profile.cqc_verified && (
                  <span className="text-xs text-accent font-medium">✓ CQC Verified</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <div className="text-center">
                <p className="font-serif text-2xl text-foreground">{profile.active_jobs_count}</p>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
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
        </div>
      </div>
    </div>
  );
}
