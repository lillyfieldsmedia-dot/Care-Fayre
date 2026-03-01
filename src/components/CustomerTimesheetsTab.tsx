import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sendEmail } from "@/lib/sendEmail";
import { TimesheetQueryDetails, tsQueryStatusColors, type TimesheetWithQuery } from "@/components/TimesheetQueryHistory";

type TimesheetJob = {
  id: string;
  locked_hourly_rate: number;
  agency_id: string;
  care_requests: {
    postcode: string;
    care_types: string[];
    recipient_name: string | null;
  } | null;
  agency_profiles: {
    agency_name: string;
    logo_url: string | null;
  } | null;
};

type TimesheetWithJob = TimesheetWithQuery & {
  job_id: string;
};

function getEffectiveHours(ts: TimesheetWithQuery): number {
  if (ts.adjusted_hours != null) return ts.adjusted_hours;
  return ts.hours_worked;
}

export function CustomerTimesheetsTab() {
  const [jobs, setJobs] = useState<TimesheetJob[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Query state
  const [queryingTsId, setQueryingTsId] = useState<string | null>(null);
  const [queryNote, setQueryNote] = useState("");
  const [querySuggestedHours, setQuerySuggestedHours] = useState("");
  const [querySubmitting, setQuerySubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: jobData } = await supabase
      .from("jobs")
      .select("id, locked_hourly_rate, agency_id, care_requests(postcode, care_types, recipient_name), agency_profiles(agency_name, logo_url)")
      .eq("customer_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const activeJobs = (jobData as any as TimesheetJob[]) || [];
    setJobs(activeJobs);

    if (activeJobs.length > 0) {
      const results = await Promise.all(
        activeJobs.map((j) =>
          supabase
            .from("timesheets")
            .select("*")
            .eq("job_id", j.id)
            .order("week_starting", { ascending: false })
            .limit(12)
        )
      );

      const allTimesheets: TimesheetWithJob[] = [];
      activeJobs.forEach((j, i) => {
        const ts = (results[i].data as any as TimesheetWithQuery[]) || [];
        ts.forEach((t) => allTimesheets.push({ ...t, job_id: j.id }));
      });

      setTimesheets(allTimesheets);
    }

    setLoading(false);
  }

  function getJobForTimesheet(ts: TimesheetWithJob): TimesheetJob | undefined {
    return jobs.find((j) => j.id === ts.job_id);
  }

  async function handleApproveTimesheet(tsId: string, hours: number, jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    await supabase.from("timesheets").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", tsId);
    const amount = hours * Number(job.locked_hourly_rate);
    await supabase.from("payments").insert({
      job_id: job.id,
      timesheet_id: tsId,
      amount,
      status: "pending",
    });

    toast.success("Timesheet approved");
    loadData();
  }

  async function handleQueryTimesheet(ts: TimesheetWithJob) {
    const job = getJobForTimesheet(ts);
    if (!job || !queryNote.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    const newQueryCount = (ts.query_count || 0) + 1;
    if (newQueryCount > 2) {
      await supabase.from("timesheets").update({
        status: "escalated",
        query_note: queryNote,
        queried_at: new Date().toISOString(),
        query_count: newQueryCount,
      } as any).eq("id", ts.id);

      toast.info("This timesheet has been escalated to Care Fayre support for review.");
      setQueryingTsId(null);
      setQueryNote("");
      setQuerySuggestedHours("");
      loadData();
      return;
    }

    setQuerySubmitting(true);
    const sugHours = querySuggestedHours ? parseFloat(querySuggestedHours) : null;
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("timesheets").update({
      status: "queried",
      query_note: queryNote,
      queried_at: new Date().toISOString(),
      suggested_hours: sugHours,
      response_deadline: deadline,
      query_count: newQueryCount,
    } as any).eq("id", ts.id);

    // Notify agency
    await supabase.from("notifications").insert({
      recipient_id: job.agency_id,
      type: "timesheet_queried",
      message: `A customer has queried the timesheet for week starting ${new Date(ts.week_starting).toLocaleDateString()}. Please respond within 24 hours.`,
      related_job_id: job.id,
    });

    sendEmail({
      userId: job.agency_id,
      subject: "Timesheet Query from Customer",
      bodyText: `A customer has queried the timesheet for the week starting ${new Date(ts.week_starting).toLocaleDateString()}. Please log in to review and respond within 24 hours.`,
      ctaUrl: `${window.location.origin}/job/${job.id}`,
      ctaText: "View Query",
    });

    toast.success("Query sent to agency");
    setQueryingTsId(null);
    setQueryNote("");
    setQuerySuggestedHours("");
    setQuerySubmitting(false);
    loadData();
  }

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h3 className="mt-4 font-serif text-lg text-foreground">No active care arrangements</h3>
        <p className="mt-1 text-sm text-muted-foreground">Timesheets will appear here once care begins.</p>
      </div>
    );
  }

  const actionable = timesheets.filter((ts) => ts.status === "submitted" || ts.status === "resubmitted");
  const recent = timesheets.filter((ts) => ts.status !== "submitted" && ts.status !== "resubmitted");

  function renderTimesheetCard(ts: TimesheetWithJob) {
    const job = getJobForTimesheet(ts);
    if (!job) return null;

    const effectiveHours = getEffectiveHours(ts);
    const amount = effectiveHours * Number(job.locked_hourly_rate);
    const canAct = ts.status === "submitted" || ts.status === "resubmitted";
    const isQueryFormOpen = queryingTsId === ts.id;

    return (
      <div key={ts.id} className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Agency logo */}
            {job.agency_profiles?.logo_url ? (
              <img
                src={job.agency_profiles.logo_url}
                alt={job.agency_profiles.agency_name}
                className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
                {job.agency_profiles?.agency_name?.charAt(0) || "?"}
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/job/${job.id}`} className="font-medium text-foreground hover:underline">
                  {job.agency_profiles?.agency_name || "Agency"}
                </Link>
                <Badge className={tsQueryStatusColors[ts.status] || "bg-muted"}>{ts.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {job.care_requests?.care_types.map((ct) => (
                  <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>Week: {new Date(ts.week_starting).toLocaleDateString()}</span>
                <span>{effectiveHours} hrs</span>
                {ts.adjusted_hours != null && ts.adjusted_hours !== ts.hours_worked && (
                  <span className="text-blue-600 dark:text-blue-400">(adjusted from {ts.hours_worked})</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-serif text-lg text-foreground">£{amount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">@ £{Number(job.locked_hourly_rate).toFixed(2)}/hr</p>
          </div>
        </div>

        {/* Query history */}
        <TimesheetQueryDetails ts={ts} />

        {/* Action buttons */}
        {canAct && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleApproveTimesheet(ts.id, effectiveHours, job.id)}>
                <CheckCircle className="mr-1 h-3 w-3" /> Approve
              </Button>
              {ts.query_count < 2 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
                  onClick={() => {
                    setQueryingTsId(ts.id);
                    setQuerySuggestedHours(String(ts.hours_worked));
                    setQueryNote("");
                  }}
                >
                  <MessageSquare className="mr-1 h-3 w-3" /> Query
                </Button>
              )}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              If you don't respond within 24 hours, this timesheet will be automatically approved and payment will be collected.
            </p>
          </div>
        )}

        {/* Query form */}
        {isQueryFormOpen && (
          <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">What's the issue? *</label>
              <Textarea
                value={queryNote}
                onChange={(e) => setQueryNote(e.target.value)}
                placeholder="Describe the issue with the submitted hours..."
                className="min-h-[80px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Suggested hours (optional)</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={querySuggestedHours}
                onChange={(e) => setQuerySuggestedHours(e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleQueryTimesheet(ts)} disabled={querySubmitting || !queryNote.trim()}>
                {querySubmitting ? "Sending..." : "Send Query"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setQueryingTsId(null)}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">The agency has 24 hours to respond. If they don't respond, your suggested hours will be used.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actionable timesheets */}
      {actionable.length > 0 && (
        <div>
          <h3 className="mb-3 font-medium text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Awaiting Your Review ({actionable.length})
          </h3>
          <div className="space-y-3">
            {actionable.map(renderTimesheetCard)}
          </div>
        </div>
      )}

      {/* Recent timesheets */}
      {recent.length > 0 && (
        <div>
          <h3 className="mb-3 font-medium text-muted-foreground">Recent</h3>
          <div className="space-y-3">
            {recent.map(renderTimesheetCard)}
          </div>
        </div>
      )}

      {actionable.length === 0 && recent.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 font-serif text-lg text-foreground">No timesheets yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Timesheets will appear here when your agency submits them.</p>
        </div>
      )}
    </div>
  );
}
