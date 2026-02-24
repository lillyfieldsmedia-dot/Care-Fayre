import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";
import {
  MapPin, Clock, Briefcase, CalendarDays, ArrowLeft, Plus, CheckCircle, AlertCircle,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";

type JobDetail = {
  id: string;
  locked_hourly_rate: number;
  agreed_hours_per_week: number;
  status: string;
  start_date: string | null;
  customer_id: string;
  agency_id: string;
  total_paid_to_date: number;
  care_requests: {
    postcode: string;
    care_types: string[];
    description: string | null;
    frequency: string;
  } | null;
  agency_profiles: {
    agency_name: string;
    cqc_rating: string | null;
    cqc_verified: boolean;
  } | null;
};

type Timesheet = {
  id: string;
  week_starting: string;
  hours_worked: number;
  notes: string | null;
  status: string;
  approved_at: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  timesheet_id: string | null;
};

const statusColors: Record<string, string> = {
  active: "bg-accent text-accent-foreground",
  paused: "bg-muted text-muted-foreground",
  completed: "bg-cqc-good text-primary-foreground",
  pending: "bg-muted text-muted-foreground",
  approved: "bg-accent text-accent-foreground",
  disputed: "bg-destructive/20 text-destructive",
  paid: "bg-cqc-good text-primary-foreground",
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimesheetForm, setShowTimesheetForm] = useState(false);
  const [tsWeek, setTsWeek] = useState("");
  const [tsHours, setTsHours] = useState("");
  const [tsNotes, setTsNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;
    setUserId(user.id);

    const [jobRes, tsRes, payRes] = await Promise.all([
      supabase.from("jobs").select("*, care_requests(postcode, care_types, description, frequency), agency_profiles(agency_name, cqc_rating, cqc_verified)").eq("id", id).single(),
      supabase.from("timesheets").select("*").eq("job_id", id).order("week_starting", { ascending: false }),
      supabase.from("payments").select("*").eq("job_id", id).order("created_at", { ascending: false }),
    ]);

    setJob((jobRes.data as JobDetail) || null);
    setTimesheets((tsRes.data as Timesheet[]) || []);
    setPayments((payRes.data as Payment[]) || []);
    setLoading(false);
  }

  async function handleSubmitTimesheet() {
    if (!job || !userId || !tsWeek || !tsHours) return;
    setSubmitting(true);
    await supabase.from("timesheets").insert({
      job_id: job.id,
      submitted_by: userId,
      week_starting: tsWeek,
      hours_worked: parseFloat(tsHours),
      notes: tsNotes,
    });
    setShowTimesheetForm(false);
    setTsWeek("");
    setTsHours("");
    setTsNotes("");
    setSubmitting(false);
    loadData();
  }

  async function handleApproveTimesheet(tsId: string, hours: number) {
    if (!job) return;
    await supabase.from("timesheets").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", tsId);
    const amount = hours * Number(job.locked_hourly_rate);
    await supabase.from("payments").insert({
      job_id: job.id,
      timesheet_id: tsId,
      amount,
      status: "pending",
    });
    await supabase.from("jobs").update({
      total_paid_to_date: Number(job.total_paid_to_date) + amount,
    }).eq("id", job.id);
    loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h2 className="font-serif text-2xl text-foreground">Job not found</h2>
          <Button asChild className="mt-4"><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const isAgency = userId === job.agency_id;
  const isCustomer = userId === job.customer_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-4xl py-8">
        <Link to={isAgency ? "/agency-dashboard" : "/dashboard"} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Job Summary */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h1 className="font-serif text-2xl text-foreground">{job.care_requests?.postcode}</h1>
                <Badge className={statusColors[job.status] || "bg-muted"}>{job.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {job.care_requests?.care_types.map((ct) => (
                  <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                ))}
              </div>
              {job.care_requests?.description && (
                <p className="mt-1 text-sm text-muted-foreground">{job.care_requests.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-serif text-3xl text-foreground">£{Number(job.locked_hourly_rate).toFixed(2)}<span className="text-lg text-muted-foreground">/hr</span></p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Hours/Week</p>
              <p className="font-serif text-lg text-foreground">{job.agreed_hours_per_week}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Frequency</p>
              <p className="font-serif text-lg text-foreground">{job.care_requests?.frequency}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-serif text-lg text-foreground">{job.start_date ? new Date(job.start_date).toLocaleDateString() : "TBD"}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-serif text-lg text-foreground">£{Number(job.total_paid_to_date).toFixed(2)}</p>
            </div>
          </div>

          {/* Agency Info */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{job.agency_profiles?.agency_name}</p>
              <div className="flex items-center gap-2">
                {job.agency_profiles?.cqc_rating && (
                  <CQCRatingBadge rating={job.agency_profiles.cqc_rating as any} />
                )}
                {job.agency_profiles?.cqc_verified && (
                  <span className="text-xs text-accent">✓ CQC Verified</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timesheets */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-foreground">Timesheets</h2>
            {isAgency && job.status === "active" && (
              <Button size="sm" onClick={() => setShowTimesheetForm(!showTimesheetForm)}>
                <Plus className="mr-1 h-4 w-4" /> Submit Timesheet
              </Button>
            )}
          </div>

          {showTimesheetForm && (
            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Week Starting</label>
                  <input type="date" value={tsWeek} onChange={(e) => setTsWeek(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Hours Worked</label>
                  <input type="number" step="0.5" min="0" value={tsHours} onChange={(e) => setTsHours(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Notes</label>
                  <input type="text" value={tsNotes} onChange={(e) => setTsNotes(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Optional" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleSubmitTimesheet} disabled={submitting || !tsWeek || !tsHours}>
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
                <Button variant="outline" onClick={() => setShowTimesheetForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week Starting</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  {isCustomer && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isCustomer ? 6 : 5} className="py-8 text-center text-muted-foreground">
                      No timesheets submitted yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  timesheets.map((ts) => (
                    <TableRow key={ts.id}>
                      <TableCell>{new Date(ts.week_starting).toLocaleDateString()}</TableCell>
                      <TableCell>{ts.hours_worked}</TableCell>
                      <TableCell>£{(ts.hours_worked * Number(job.locked_hourly_rate)).toFixed(2)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{ts.notes || "—"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[ts.status] || "bg-muted"}>{ts.status}</Badge>
                      </TableCell>
                      {isCustomer && (
                        <TableCell>
                          {ts.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => handleApproveTimesheet(ts.id, ts.hours_worked)}>
                              <CheckCircle className="mr-1 h-3 w-3" /> Approve
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Payments */}
        <div className="mt-8">
          <h2 className="font-serif text-xl text-foreground">Payment History</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No payments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((pay) => (
                    <TableRow key={pay.id}>
                      <TableCell>{new Date(pay.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">£{Number(pay.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[pay.status] || "bg-muted"}>{pay.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
