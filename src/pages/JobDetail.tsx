import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";
import {
  MapPin, Clock, Briefcase, CalendarDays, ChevronRight, Plus, CheckCircle, AlertCircle, User, Phone, Home, FileText, XCircle,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";

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
    recipient_name: string;
    recipient_dob: string | null;
    recipient_address: string;
    relationship_to_holder: string;
  } | null;
  agency_profiles: {
    id: string;
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
  assessment_pending: "bg-primary/20 text-primary",
  assessment_complete: "bg-primary/30 text-primary",
  cancelled_pre_care: "bg-destructive/20 text-destructive",
  approved: "bg-accent text-accent-foreground",
  disputed: "bg-destructive/20 text-destructive",
  paid: "bg-cqc-good text-primary-foreground",
};

const statusLabels: Record<string, string> = {
  assessment_pending: "Assessment Pending",
  assessment_complete: "Assessment Complete",
  cancelled_pre_care: "Cancelled (Pre-Care)",
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
  const [cancelling, setCancelling] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{ full_name: string; phone: string | null } | null>(null);
  const [contract, setContract] = useState<{ customer_agreed_at: string | null; agency_agreed_at: string | null } | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;
    setUserId(user.id);

    const [jobRes, tsRes, payRes, contractRes] = await Promise.all([
      supabase.from("jobs").select("*, care_requests(postcode, care_types, description, frequency, recipient_name, recipient_dob, recipient_address, relationship_to_holder), agency_profiles(id, agency_name, cqc_rating, cqc_verified)").eq("id", id).single(),
      supabase.from("timesheets").select("*").eq("job_id", id).order("week_starting", { ascending: false }),
      supabase.from("payments").select("*").eq("job_id", id).order("created_at", { ascending: false }),
      supabase.from("contracts").select("customer_agreed_at, agency_agreed_at").eq("job_id", id).maybeSingle(),
    ]);

    const jobData = (jobRes.data as any as JobDetail) || null;
    setJob(jobData);
    setTimesheets((tsRes.data as Timesheet[]) || []);
    setPayments((payRes.data as Payment[]) || []);
    setContract((contractRes.data as any) || null);

    if (jobData) {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("user_id", jobData.customer_id).single();
      setCustomerProfile(profile as any);
    }

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

  async function handleCancelPreCare() {
    if (!job || !userId) return;
    setCancelling(true);

    const { error } = await supabase.from("jobs").update({ status: "cancelled_pre_care" } as any).eq("id", job.id);
    if (error) {
      toast.error("Failed to cancel: " + error.message);
      setCancelling(false);
      return;
    }

    const agencyName = job.agency_profiles?.agency_name || "the agency";
    const customerName = customerProfile?.full_name || "the customer";
    const isCustomerAction = userId === job.customer_id;

    await Promise.all([
      supabase.from("notifications").insert({
        recipient_id: job.customer_id,
        type: "cancelled_pre_care",
        message: isCustomerAction
          ? `You cancelled the arrangement with ${agencyName} before care began. No charges apply.`
          : `${agencyName} has cancelled the arrangement before care began. No charges apply.`,
        related_job_id: job.id,
      }),
      supabase.from("notifications").insert({
        recipient_id: job.agency_id,
        type: "cancelled_pre_care",
        message: isCustomerAction
          ? `${customerName} has cancelled the arrangement before care began. No charges apply.`
          : `You cancelled the arrangement with ${customerName} before care began. No charges apply.`,
        related_job_id: job.id,
      }),
    ]);

    toast.success("Arrangement cancelled. No charges apply.");
    setCancelling(false);
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
  const showRecipientDetails = isAgency && ["active", "completed", "assessment_pending", "assessment_complete"].includes(job.status);
  const recipientName = job.care_requests?.recipient_name;
  const holderName = customerProfile?.full_name;
  const agencyNeedsToSign = isAgency && job.status === "pending" && contract && !contract.agency_agreed_at;
  const showAgreementButton = contract && contract.customer_agreed_at;
  const isPreCare = job.status === "assessment_pending" || job.status === "assessment_complete";
  const canCancel = (isCustomer || isAgency) && isPreCare;
  const isBillingActive = job.status === "active";
  const displayStatus = statusLabels[job.status] || job.status;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-4xl py-8">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to={isAgency ? "/agency-dashboard" : "/dashboard"} className="hover:text-foreground">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={isAgency ? "/agency-dashboard" : "/dashboard"} className="hover:text-foreground">{isAgency ? "My Clients" : "My Care"}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Job Details</span>
        </nav>

        {/* Pending Agreement Banner for Agency */}
        {agencyNeedsToSign && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-foreground">Action required: Please sign the Intent to Proceed to begin the assessment stage</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">The customer has signed. Review and sign to proceed.</p>
                </div>
              </div>
              <Button asChild>
                <Link to={`/agreement/${job.id}`}>
                  <FileText className="mr-2 h-4 w-4" /> Review &amp; Sign
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Pre-care cancellation banner */}
        {job.status === "cancelled_pre_care" && (
          <div className="mb-6 rounded-xl border border-muted bg-muted/30 p-5 text-center">
            <XCircle className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 font-medium text-foreground">This arrangement was cancelled before care began</p>
            <p className="text-sm text-muted-foreground">No charges were applied.</p>
          </div>
        )}

        {/* Job Summary */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl text-foreground">
                  {recipientName || job.care_requests?.postcode}
                </h1>
                <Badge className={statusColors[job.status] || "bg-muted"}>{displayStatus}</Badge>
              </div>
              {recipientName && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span><MapPin className="mr-1 inline h-3.5 w-3.5" />{job.care_requests?.postcode}</span>
                  {holderName && <span><User className="mr-1 inline h-3.5 w-3.5" />Account holder: {holderName}</span>}
                </div>
              )}
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
              <Link to={`/agency/${job.agency_profiles?.id}`} className="font-medium text-primary hover:underline">{job.agency_profiles?.agency_name}</Link>
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

          {/* View Intent to Proceed Button — visible once customer has signed */}
          {showAgreementButton && (
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link to={`/agreement/${job.id}`}>
                  <FileText className="mr-2 h-4 w-4" /> View Intent to Proceed
                </Link>
              </Button>
            </div>
          )}

          {/* Cancel Pre-Care Button */}
          {canCancel && (
            <div className="mt-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleCancelPreCare}
                disabled={cancelling}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {cancelling ? "Cancelling..." : "Cancel Arrangement (No Charge)"}
              </Button>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Either party may cancel before care begins with no penalty.
              </p>
            </div>
          )}
        </div>

        {/* Care Recipient Details — agency only, assessment/active/completed jobs */}
        {showRecipientDetails && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <h2 className="font-serif text-xl text-foreground">Care Recipient Details</h2>
            <p className="mb-4 text-sm text-muted-foreground">This information is confidential and shared for care delivery purposes only.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <User className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium text-foreground">{job.care_requests?.recipient_name || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="font-medium text-foreground">{job.care_requests?.recipient_dob ? new Date(job.care_requests.recipient_dob).toLocaleDateString() : "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3 sm:col-span-2">
                <Home className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Full Care Address</p>
                  <p className="font-medium text-foreground whitespace-pre-line">{job.care_requests?.recipient_address || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <User className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Relationship to Account Holder</p>
                  <p className="font-medium text-foreground">{job.care_requests?.relationship_to_holder || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Phone className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Account Holder ({holderName || "—"})</p>
                  <p className="font-medium text-foreground">{customerProfile?.phone || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timesheets — only when billing is active */}
        {isBillingActive && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-foreground">Timesheets</h2>
              {isAgency && (
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
        )}

        {/* Payments — only when billing is active */}
        {isBillingActive && (
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
        )}

        {/* Assessment stage info */}
        {isPreCare && (
          <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <Clock className="mx-auto h-6 w-6 text-primary" />
            <h3 className="mt-2 font-serif text-lg text-foreground">Assessment Stage</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {job.status === "assessment_pending"
                ? "The agency will contact the care recipient to arrange an initial assessment. Billing and timesheets will become available once the job is activated."
                : "The assessment is complete. Billing and timesheets will become available once the job is activated."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
