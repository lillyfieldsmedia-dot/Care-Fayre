import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Briefcase, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [reqResult, jobResult] = await Promise.all([
      supabase.from("care_requests").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }),
      supabase.from("jobs").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }),
    ]);

    setRequests((reqResult.data as CareRequest[]) || []);
    setJobs((jobResult.data as Job[]) || []);
    setLoading(false);
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
                    <div>
                      <Badge className={job.status === "active" ? "bg-accent text-accent-foreground" : "bg-muted"}>{job.status}</Badge>
                      <p className="mt-1 text-sm text-muted-foreground">{job.agreed_hours_per_week} hrs/week</p>
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
