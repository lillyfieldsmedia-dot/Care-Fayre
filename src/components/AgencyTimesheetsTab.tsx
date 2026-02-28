import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TimesheetJob = {
  id: string;
  locked_hourly_rate: number;
  care_requests: {
    postcode: string;
    care_types: string[];
    recipient_name: string | null;
  } | null;
};

type Timesheet = {
  id: string;
  week_starting: string;
  hours_worked: number;
  status: string;
  notes: string | null;
};

const tsStatusClass: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-cqc-good text-primary-foreground",
  disputed: "bg-destructive/20 text-destructive",
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
  const [timesheets, setTimesheets] = useState<Record<string, Timesheet[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [weekStarting, setWeekStarting] = useState<Date>(getMostRecentMonday());
  const [hoursWorked, setHoursWorked] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: jobData } = await supabase
      .from("jobs")
      .select("id, locked_hourly_rate, care_requests(postcode, care_types, recipient_name)")
      .eq("agency_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const activeJobs = (jobData as TimesheetJob[]) || [];
    setJobs(activeJobs);

    if (activeJobs.length > 0) {
      const tsMap: Record<string, Timesheet[]> = {};
      const results = await Promise.all(
        activeJobs.map((j) =>
          supabase
            .from("timesheets")
            .select("id, week_starting, hours_worked, status, notes")
            .eq("job_id", j.id)
            .order("week_starting", { ascending: false })
            .limit(4)
        )
      );
      activeJobs.forEach((j, i) => {
        tsMap[j.id] = (results[i].data as Timesheet[]) || [];
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
                    <Badge className={tsStatusClass[latestStatus] || "bg-muted"}>
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
              <div className="border-t border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-5 py-2 text-left font-medium">Week</th>
                      <th className="px-5 py-2 text-left font-medium">Hours</th>
                      <th className="px-5 py-2 text-left font-medium">Status</th>
                      <th className="px-5 py-2 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobTimesheets.map((ts) => (
                      <tr key={ts.id} className="border-t border-border/50">
                        <td className="px-5 py-2 text-foreground">{new Date(ts.week_starting).toLocaleDateString()}</td>
                        <td className="px-5 py-2 text-foreground">{ts.hours_worked}</td>
                        <td className="px-5 py-2">
                          <Badge className={tsStatusClass[ts.status] || "bg-muted"}>{ts.status}</Badge>
                        </td>
                        <td className="px-5 py-2 text-muted-foreground truncate max-w-[200px]">{ts.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
