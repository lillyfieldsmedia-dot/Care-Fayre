import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ChevronDown, ChevronUp, FileText, MessageSquare, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { sendEmail } from "@/lib/sendEmail";
import { TimesheetQueryDetails, tsQueryStatusColors, type TimesheetWithQuery } from "@/components/TimesheetQueryHistory";

type TimesheetJob = {
  id: string;
  locked_hourly_rate: number;
  customer_id: string;
  care_requests: {
    postcode: string;
    care_types: string[];
    recipient_name: string | null;
  } | null;
};

function getMostRecentMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function AgencyTimesheetsTab() {
  const [jobs, setJobs] = useState<TimesheetJob[]>([]);
  const [timesheets, setTimesheets] = useState<Record<string, TimesheetWithQuery[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [weekStarting, setWeekStarting] = useState<Date>(getMostRecentMonday());
  const [hoursWorked, setHoursWorked] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Agency response state
  const [respondingTsId, setRespondingTsId] = useState<string | null>(null);
  const [respondMode, setRespondMode] = useState<"adjust" | "respond" | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [adjustedHours, setAdjustedHours] = useState("");
  const [responseSubmitting, setResponseSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: jobData } = await supabase
      .from("jobs")
      .select("id, locked_hourly_rate, customer_id, care_requests(postcode, care_types, recipient_name)")
      .eq("agency_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const activeJobs = (jobData as any as TimesheetJob[]) || [];
    setJobs(activeJobs);

    if (activeJobs.length > 0) {
      const tsMap: Record<string, TimesheetWithQuery[]> = {};
      const results = await Promise.all(
        activeJobs.map((j) =>
          supabase
            .from("timesheets")
            .select("*")
            .eq("job_id", j.id)
            .order("week_starting", { ascending: false })
            .limit(8)
        )
      );
      activeJobs.forEach((j, i) => {
        tsMap[j.id] = (results[i].data as any as TimesheetWithQuery[]) || [];
      });
      setTimesheets(tsMap);
    }

    setLoading(false);
  }

  async function handleSubmit(jobId: string) {
    if (!hoursWorked || Number(hoursWorked) <= 0) {
      toast.error("Please enter hours worked");
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("timesheets").insert({
      job_id: jobId,
      submitted_by: user.id,
      week_starting: format(weekStarting, "yyyy-MM-dd"),
      hours_worked: Number(hoursWorked),
      notes: notes || null,
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit timesheet: " + error.message);
    } else {
      toast.success("Timesheet submitted");
      setExpandedJobId(null);
      setHoursWorked("");
      setNotes("");
      setWeekStarting(getMostRecentMonday());
      loadData();
    }
  }

  async function handleAgencyRespond(ts: TimesheetWithQuery, job: TimesheetJob) {
    if (!responseNote.trim()) {
      toast.error("Please provide a response");
      return;
    }
    setResponseSubmitting(true);
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const adjHours = respondMode === "adjust" && adjustedHours ? parseFloat(adjustedHours) : null;

    await supabase.from("timesheets").update({
      status: "resubmitted",
      query_response: responseNote,
      adjusted_hours: adjHours,
      response_deadline: deadline,
    } as any).eq("id", ts.id);

    // Notify customer
    await supabase.from("notifications").insert({
      recipient_id: job.customer_id,
      type: "timesheet_resubmitted",
      message: `The agency has responded to your timesheet query for week starting ${new Date(ts.week_starting).toLocaleDateString()}. Please review.`,
      related_job_id: job.id,
    });

    sendEmail({
      userId: job.customer_id,
      subject: "Timesheet Response from Agency",
      bodyText: `The agency has responded to your timesheet query for the week starting ${new Date(ts.week_starting).toLocaleDateString()}. Please log in to review and approve.`,
      ctaUrl: `${window.location.origin}/job/${job.id}`,
      ctaText: "Review Response",
    });

    toast.success("Response sent");
    setRespondingTsId(null);
    setRespondMode(null);
    setResponseNote("");
    setAdjustedHours("");
    setResponseSubmitting(false);
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

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const jobTimesheets = timesheets[job.id] || [];
        const latestStatus = jobTimesheets[0]?.status || null;
        const isExpanded = expandedJobId === job.id;

        return (
          <div key={job.id} className="rounded-xl border border-border bg-card">
            {/* Job header */}
            <div className="flex items-center justify-between p-5">
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="font-medium text-foreground">
                  {job.care_requests?.recipient_name || job.care_requests?.postcode}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {job.care_requests?.care_types.map((ct) => (
                    <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                  ))}
                  <span className="text-xs text-muted-foreground">· £{Number(job.locked_hourly_rate).toFixed(2)}/hr</span>
                </div>
                {latestStatus && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Latest timesheet:</span>
                    <Badge className={tsQueryStatusColors[latestStatus] || "bg-muted"}>
                      {latestStatus}
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isExpanded) {
                    setExpandedJobId(null);
                  } else {
                    setExpandedJobId(job.id);
                    setWeekStarting(getMostRecentMonday());
                    setHoursWorked("");
                    setNotes("");
                  }
                }}
                className="shrink-0 gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Submit Timesheet
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Inline form */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="border-t border-border px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Week Starting</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                          <Clock className="mr-2 h-3.5 w-3.5" />
                          {format(weekStarting, "dd MMM yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={weekStarting}
                          onSelect={(d) => d && setWeekStarting(d)}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Hours Worked</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                      placeholder="e.g. 20"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes..."
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => handleSubmit(job.id)} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setExpandedJobId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>

            {/* Recent timesheets */}
            {jobTimesheets.length > 0 && (
              <div className="border-t border-border p-3 space-y-2">
                {jobTimesheets.map((ts) => {
                  const isRespondFormOpen = respondingTsId === ts.id;
                  const canAct = ts.status === "queried";

                  return (
                    <div key={ts.id} className="rounded-lg border border-border/50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {new Date(ts.week_starting).toLocaleDateString()}
                            </span>
                            <Badge className={tsQueryStatusColors[ts.status] || "bg-muted"}>{ts.status}</Badge>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>{ts.hours_worked} hrs</span>
                            {ts.adjusted_hours != null && ts.adjusted_hours !== ts.hours_worked && (
                              <span className="text-blue-600 dark:text-blue-400">{ts.adjusted_hours} hrs adjusted</span>
                            )}
                            {ts.notes && <span className="truncate max-w-[200px]">{ts.notes}</span>}
                          </div>
                        </div>

                        {/* Agency action buttons */}
                        {canAct && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setRespondingTsId(ts.id);
                                setRespondMode("adjust");
                                setAdjustedHours(String(ts.hours_worked));
                                setResponseNote("");
                              }}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" /> Adjust
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setRespondingTsId(ts.id);
                                setRespondMode("respond");
                                setResponseNote("");
                              }}
                            >
                              <MessageSquare className="mr-1 h-3 w-3" /> Respond
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Query history */}
                      <TimesheetQueryDetails ts={ts} />

                      {/* Agency response form */}
                      {isRespondFormOpen && (
                        <div className="mt-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
                          {respondMode === "adjust" && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-foreground">Adjusted hours</label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={adjustedHours}
                                onChange={(e) => setAdjustedHours(e.target.value)}
                                className="h-8 w-32 text-xs"
                              />
                            </div>
                          )}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-foreground">
                              {respondMode === "adjust" ? "Explanation" : "Why the original hours are correct"}
                            </label>
                            <Textarea
                              value={responseNote}
                              onChange={(e) => setResponseNote(e.target.value)}
                              placeholder={respondMode === "adjust" ? "Explain the adjustment..." : "Explain why the submitted hours are correct..."}
                              className="min-h-[60px] text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAgencyRespond(ts, job)} disabled={responseSubmitting || !responseNote.trim()}>
                              {responseSubmitting ? "Sending..." : respondMode === "adjust" ? "Resubmit" : "Send Response"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRespondingTsId(null); setRespondMode(null); }}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
