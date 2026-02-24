import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, Briefcase, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditAgencyProfileDialog } from "@/components/EditAgencyProfileDialog";
import { Button } from "@/components/ui/button";

type CareRequest = {
  id: string;
  postcode: string;
  care_types: string[];
  hours_per_week: number;
  status: string;
  bids_count: number;
  bid_deadline: string | null;
  created_at: string;
  lowest_bid_rate: number | null;
};

type AgencyJob = {
  id: string;
  locked_hourly_rate: number;
  agreed_hours_per_week: number;
  status: string;
  start_date: string | null;
  care_requests: {
    postcode: string;
    care_types: string[];
  } | null;
};

export default function AgencyDashboard() {
  const [tab, setTab] = useState<"available" | "bids" | "jobs">("available");
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [jobs, setJobs] = useState<AgencyJob[]>([]);
  const [agencyProfile, setAgencyProfile] = useState<{ id: string; phone: string; website: string; bio: string; cqc_explanation: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [reqResult, jobResult, apResult] = await Promise.all([
      supabase.from("care_requests").select("*").eq("status", "open").order("created_at", { ascending: false }),
      supabase.from("jobs").select("*, care_requests(postcode, care_types)").eq("agency_id", user.id).order("created_at", { ascending: false }),
      supabase.from("agency_profiles").select("id, phone, website, bio, cqc_explanation").eq("user_id", user.id).single(),
    ]);

    setRequests((reqResult.data as CareRequest[]) || []);
    setJobs((jobResult.data as AgencyJob[]) || []);
    if (apResult.data) setAgencyProfile(apResult.data as any);
    setLoading(false);
  }

  const tabs = [
    { key: "available" as const, label: "Available Requests", icon: MapPin },
    { key: "bids" as const, label: "My Bids", icon: TrendingUp },
    { key: "jobs" as const, label: "My Jobs", icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Agency Dashboard</h1>
            <p className="text-muted-foreground">Browse requests and manage your bids</p>
          </div>
          {agencyProfile && (
            <EditAgencyProfileDialog
              profileId={agencyProfile.id}
              initial={{
                phone: agencyProfile.phone || "",
                website: agencyProfile.website || "",
                bio: agencyProfile.bio || "",
                cqc_explanation: agencyProfile.cqc_explanation || "",
              }}
              onSaved={loadData}
            />
          )}
        </div>

        {/* Profile completion banner */}
        {agencyProfile && (!agencyProfile.bio || !agencyProfile.phone) && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Complete your profile to start receiving care requests</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your contact details, bio, and service area so customers can find and trust your agency.</p>
            </div>
            <EditAgencyProfileDialog
              profileId={agencyProfile.id}
              initial={{
                phone: agencyProfile.phone || "",
                website: agencyProfile.website || "",
                bio: agencyProfile.bio || "",
                cqc_explanation: agencyProfile.cqc_explanation || "",
              }}
              onSaved={loadData}
            />
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {[
            { label: "Open Requests", value: requests.length, icon: MapPin },
            { label: "Active Bids", value: "—", icon: TrendingUp },
            { label: "Active Jobs", value: jobs.filter(j => j.status === "active").length, icon: Briefcase },
            { label: "This Month", value: "—", icon: Clock },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <stat.icon className="h-4 w-4" />
                <p className="text-sm">{stat.label}</p>
              </div>
              <p className="mt-1 font-serif text-2xl text-foreground">{stat.value}</p>
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
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading...</div>
          ) : tab === "available" ? (
            requests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-serif text-lg text-foreground">No open requests nearby</h3>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon for new care requests in your area.</p>
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
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{req.postcode}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {req.care_types.map((ct) => (
                          <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{req.hours_per_week} hrs/week · {req.bids_count} bids</p>
                    </div>
                    <div className="text-right">
                      {req.lowest_bid_rate && (
                        <p className="font-serif text-lg text-foreground">£{Number(req.lowest_bid_rate).toFixed(2)}/hr</p>
                      )}
                      {req.bid_deadline && (
                        <p className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {new Date(req.bid_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            tab === "jobs" ? (
              jobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
                  <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-4 font-serif text-lg text-foreground">No active jobs</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Accept bids to start jobs.</p>
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
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">{job.care_requests?.postcode}</span>
                          <Badge className={job.status === "active" ? "bg-accent text-accent-foreground" : "bg-muted"}>{job.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {job.care_requests?.care_types.map((ct) => (
                            <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{job.agreed_hours_per_week} hrs/week · starts {job.start_date ? new Date(job.start_date).toLocaleDateString() : "TBD"}</p>
                      </div>
                      <p className="font-serif text-xl text-foreground">£{Number(job.locked_hourly_rate).toFixed(2)}/hr</p>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
                <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-serif text-lg text-foreground">My Bids</h3>
                <p className="mt-1 text-sm text-muted-foreground">Your submitted bids will appear here.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
