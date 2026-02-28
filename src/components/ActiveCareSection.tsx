import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";
import type { Database } from "@/integrations/supabase/types";

type JobStatus = Database["public"]["Enums"]["job_status"];

type ActiveJob = {
  id: string;
  locked_hourly_rate: number;
  agreed_hours_per_week: number;
  status: string;
  start_date: string | null;
  care_requests: {
    postcode: string;
    care_types: string[];
  } | null;
  agency_profiles: {
    agency_name: string;
    cqc_rating: string | null;
  } | null;
};

const ACTIVE_STATUSES: JobStatus[] = ["pending", "assessment_pending", "assessment_complete", "active"];

const statusBadgeClass: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  assessment_pending: "bg-primary/20 text-primary",
  assessment_complete: "bg-accent/80 text-accent-foreground",
  active: "bg-cqc-good text-primary-foreground",
};

const statusLabel: Record<string, string> = {
  pending: "Pending Agreement",
  assessment_pending: "Assessment Pending",
  assessment_complete: "Assessment Complete",
  active: "Active",
};

interface Props {
  variant: "customer" | "agency";
}

export function ActiveCareSection({ variant }: Props) {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [alerts, setAlerts] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const col = variant === "customer" ? "customer_id" : "agency_id";
    const { data } = await supabase
      .from("jobs")
      .select("id, locked_hourly_rate, agreed_hours_per_week, status, start_date, care_requests(postcode, care_types), agency_profiles(agency_name, cqc_rating)")
      .eq(col, user.id)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false });

    const activeJobs = (data as ActiveJob[]) || [];
    setJobs(activeJobs);

    // Fetch contextual alerts for active jobs
    const activeIds = activeJobs.filter(j => j.status === "active").map(j => j.id);
    if (activeIds.length > 0) {
      const alertMap: Record<string, string> = {};

      if (variant === "customer") {
        // Check for pending_approval timesheets
        const { data: ts } = await supabase
          .from("timesheets")
          .select("job_id")
          .in("job_id", activeIds)
          .eq("status", "pending");
        if (ts) {
          ts.forEach((t: any) => {
            alertMap[t.job_id] = "Timesheet awaiting your approval";
          });
        }
      } else {
        // For agency: check if most recent week is missing a timesheet
        for (const id of activeIds) {
          const { data: ts } = await supabase
            .from("timesheets")
            .select("week_starting")
            .eq("job_id", id)
            .order("week_starting", { ascending: false })
            .limit(1);

          const job = activeJobs.find(j => j.id === id);
          if (!job?.start_date) continue;

          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
          const weekStr = startOfWeek.toISOString().split("T")[0];

          if (!ts || ts.length === 0 || ts[0].week_starting < weekStr) {
            alertMap[id] = "Timesheet due for submission";
          }
        }
      }
      setAlerts(alertMap);
    }

    setLoaded(true);
  }

  if (!loaded || jobs.length === 0) return null;

  const customerAlerts: Record<string, string> = {
    pending: "Rate Agreement needs signing",
    assessment_pending: "Assessment being arranged",
    assessment_complete: "Assessment complete — confirm to proceed",
  };

  const agencyAlerts: Record<string, string> = {
    pending: "Rate Agreement needs signing",
    assessment_pending: "Arrange assessment with client",
    assessment_complete: "Waiting for customer to confirm",
  };

  const statusAlerts = variant === "customer" ? customerAlerts : agencyAlerts;

  function getAlert(job: ActiveJob): string | null {
    if (job.status !== "active") return statusAlerts[job.status] || null;
    return alerts[job.id] || null;
  }

  const title = variant === "customer" ? "Your Care" : "Your Clients";

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-serif text-xl text-foreground">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
        {jobs.map((job) => {
          const alert = getAlert(job);
          return (
            <Link
              key={job.id}
              to={`/job/${job.id}`}
              className="flex min-w-[280px] flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--card-shadow-hover)] sm:min-w-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {variant === "customer" ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">
                        {job.agency_profiles?.agency_name || "Agency"}
                      </span>
                      <CQCRatingBadge rating={job.agency_profiles?.cqc_rating || null} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-foreground">{job.care_requests?.postcode}</span>
                    </div>
                  )}
                </div>
                <Badge className={statusBadgeClass[job.status] || "bg-muted"}>
                  {statusLabel[job.status] || job.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1">
                {job.care_requests?.care_types.map((ct) => (
                  <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{job.agreed_hours_per_week} hrs/week · £{Number(job.locked_hourly_rate).toFixed(2)}/hr</span>
                <span>{job.start_date ? new Date(job.start_date).toLocaleDateString() : "TBD"}</span>
              </div>

              {alert && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {alert}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
