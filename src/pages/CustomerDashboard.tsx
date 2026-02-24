import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Briefcase, Bell, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type CareRequest = {
  id: string;
  postcode: string;
  care_types: string[];
  hours_per_week: number;
  status: string;
  bids_count: number;
  bid_deadline: string | null;
  created_at: string;
};

type Job = {
  id: string;
  locked_hourly_rate: number;
  agreed_hours_per_week: number;
  status: string;
  start_date: string | null;
  agency_profile_id: string;
  care_requests: {
    postcode: string;
    care_types: string[];
  } | null;
  agency_profiles: {
    agency_name: string;
    cqc_rating: string | null;
  } | null;
};

type ReviewableJob = {
  id: string;
  agency_profile_id: string;
  agency_name: string;
};

const statusColors: Record<string, string> = {
  open: "bg-accent text-accent-foreground",
  accepted: "bg-cqc-good text-primary-foreground",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/20 text-destructive",
};

export default function CustomerDashboard() {
  const [tab, setTab] = useState<"requests" | "jobs" | "notifications">("requests");
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewableJobs, setReviewableJobs] = useState<ReviewableJob[]>([]);
  const [reviewingJobId, setReviewingJobId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [reqResult, jobResult, existingReviews] = await Promise.all([
      supabase.from("care_requests").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }),
      supabase.from("jobs").select("*, care_requests(postcode, care_types), agency_profiles(agency_name, cqc_rating)").eq("customer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("job_id").eq("customer_id", user.id),
    ]);

    setRequests((reqResult.data as CareRequest[]) || []);
    const allJobs = (jobResult.data as Job[]) || [];
    setJobs(allJobs);

    const reviewedJobIds = new Set((existingReviews.data || []).map((r: any) => r.job_id));

    const reviewable = allJobs
      .filter(j =>
        (j.status === "active" || j.status === "completed") &&
        j.start_date &&
        new Date(j.start_date).toISOString() <= fourteenDaysAgo &&
        !reviewedJobIds.has(j.id)
      )
      .map(j => ({
        id: j.id,
        agency_profile_id: j.agency_profile_id,
        agency_name: j.agency_profiles?.agency_name || "Unknown Agency",
      }));

    setReviewableJobs(reviewable);
    setLoading(false);
  }

  async function handleSubmitReview(job: ReviewableJob) {
    if (reviewRating < 1) { toast.error("Please select a star rating"); return; }
    setSubmittingReview(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("reviews").insert({
      job_id: job.id,
      customer_id: user.id,
      agency_profile_id: job.agency_profile_id,
      star_rating: reviewRating,
      comment: reviewComment,
    } as any);

    setSubmittingReview(false);
    if (error) {
      toast.error("Failed to submit review: " + error.message);
    } else {
      toast.success("Review submitted — thank you!");
      setReviewableJobs(prev => prev.filter(j => j.id !== job.id));
      setReviewingJobId(null);
      setReviewRating(0);
      setReviewComment("");
    }
  }

  const tabs = [
    { key: "requests" as const, label: "My Requests", icon: FileText, count: requests.length },
    { key: "jobs" as const, label: "My Jobs", icon: Briefcase, count: jobs.length },
    { key: "notifications" as const, label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Manage your care requests and jobs</p>
          </div>
          <Button asChild variant="hero">
            <Link to="/create-request"><Plus className="mr-2 h-4 w-4" /> Post a Care Request</Link>
          </Button>
        </div>

        {/* Review Banners */}
        {reviewableJobs.map((rj) => (
          <div key={rj.id} className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  <Star className="mr-1 inline h-4 w-4 text-primary" />
                  How is your care with <span className="font-semibold">{rj.agency_name}</span>?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Leave a review to help other families find great care.</p>
              </div>
              {reviewingJobId !== rj.id && (
                <Button size="sm" onClick={() => { setReviewingJobId(rj.id); setReviewRating(0); setReviewComment(""); }}>
                  Write a Review
                </Button>
              )}
            </div>
            {reviewingJobId === rj.id && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-1 text-sm font-medium text-foreground">Rating</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setReviewRating(s)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-7 w-7 ${s <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  placeholder="Tell others about your experience (optional)..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleSubmitReview(rj)} disabled={submittingReview}>
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                  <Button variant="outline" onClick={() => setReviewingJobId(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active Requests", value: requests.filter(r => r.status === "open").length },
            { label: "Active Jobs", value: jobs.filter(j => j.status === "active").length },
            { label: "Total Requests", value: requests.length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 font-serif text-3xl text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-1 rounded-lg border border-border bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && <span className="text-xs">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading...</div>
          ) : tab === "requests" ? (
            requests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-serif text-lg text-foreground">No care requests yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Post your first request to start receiving bids from agencies.</p>
                <Button asChild className="mt-6"><Link to="/create-request">Post a Care Request</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <Link
                    key={req.id}
                    to={`/request/${req.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--card-shadow-hover)]"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{req.postcode}</span>
                        <Badge className={statusColors[req.status] || "bg-muted"}>{req.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {req.care_types.map((ct) => (
                          <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{req.hours_per_week} hrs/week</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{req.bids_count} bids</p>
                      {req.bid_deadline && (
                        <p className="text-xs text-muted-foreground">
                          Closes {new Date(req.bid_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : tab === "jobs" ? (
            jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-serif text-lg text-foreground">No active jobs</h3>
                <p className="mt-1 text-sm text-muted-foreground">Accept a bid to create your first job.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/job/${job.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--card-shadow-hover)]"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{job.care_requests?.postcode}</span>
                        <Badge className={job.status === "active" ? "bg-accent text-accent-foreground" : "bg-muted"}>{job.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {job.care_requests?.care_types.map((ct) => (
                          <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {job.agency_profiles?.agency_name} · {job.agreed_hours_per_week} hrs/week · starts {job.start_date ? new Date(job.start_date).toLocaleDateString() : "TBD"}
                      </p>
                    </div>
                    <p className="font-serif text-xl text-foreground">£{Number(job.locked_hourly_rate).toFixed(2)}/hr</p>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <Bell className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 font-serif text-lg text-foreground">Notifications</h3>
              <p className="mt-1 text-sm text-muted-foreground">You'll see notifications about bids and jobs here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
