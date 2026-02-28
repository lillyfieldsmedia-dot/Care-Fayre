import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/sendEmail";
import { Badge } from "@/components/ui/badge";
import { AgencyLogo } from "@/components/AgencyLogo";
import { Button } from "@/components/ui/button";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  MapPin, Clock, Briefcase, CalendarDays, ChevronRight, Plus, CheckCircle, AlertCircle, User, Phone, Home, FileText, XCircle, CalendarIcon, Pencil,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
    logo_url: string | null;
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
  const [markingAssessment, setMarkingAssessment] = useState(false);
  const [confirmingCare, setConfirmingCare] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{ full_name: string; phone: string | null } | null>(null);
  const [contract, setContract] = useState<{ customer_agreed_at: string | null; agency_agreed_at: string | null } | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentStartDate, setAssessmentStartDate] = useState<Date | undefined>(undefined);
  const [assessmentTbc, setAssessmentTbc] = useState(false);
  const [showEditStartDate, setShowEditStartDate] = useState(false);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>(undefined);
  const [editStartTbc, setEditStartTbc] = useState(false);
  const [savingStartDate, setSavingStartDate] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;
    setUserId(user.id);

    const [jobRes, tsRes, payRes, contractRes] = await Promise.all([
      supabase.from("jobs").select("*, care_requests(postcode, care_types, description, frequency, recipient_name, recipient_dob, recipient_address, relationship_to_holder), agency_profiles(id, agency_name, cqc_rating, cqc_verified, logo_url)").eq("id", id).single(),
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

  async function handleMarkAssessmentComplete() {
    if (!job || !userId) return;
    setMarkingAssessment(true);
    const startDateValue = assessmentTbc || !assessmentStartDate ? null : format(assessmentStartDate, "yyyy-MM-dd");
    const { error } = await supabase.from("jobs").update({ status: "assessment_complete", start_date: startDateValue } as any).eq("id", job.id);
    if (error) {
      toast.error("Failed to update: " + error.message);
      setMarkingAssessment(false);
      return;
    }
    const agencyName = job.agency_profiles?.agency_name || "the agency";
    // Assessment complete notification
    await supabase.from("notifications").insert({
      recipient_id: job.customer_id,
      type: "assessment_complete",
      message: `Your assessment with ${agencyName} has taken place. Please confirm on Care Fayre whether you wish to proceed with care.`,
      related_job_id: job.id,
    });

    // Email: assessment marked complete
    sendEmail({
      userId: job.customer_id,
      subject: `Your assessment with ${agencyName} has taken place`,
      bodyText: `Your assessment with ${agencyName} has taken place. Please log in to confirm whether you wish to proceed with care.`,
      ctaUrl: `${window.location.origin}/job/${job.id}`,
      ctaText: "Confirm or Decline",
    });
    // Start date notification
    if (startDateValue) {
      await supabase.from("notifications").insert({
        recipient_id: job.customer_id,
        type: "start_date_set",
        message: `Your care start date with ${agencyName} has been confirmed as ${format(assessmentStartDate!, "d MMMM yyyy")}.`,
        related_job_id: job.id,
      });
    } else {
      await supabase.from("notifications").insert({
        recipient_id: job.customer_id,
        type: "start_date_tbc",
        message: `Your care start date is still to be confirmed. ${agencyName} will be in touch.`,
        related_job_id: job.id,
      });
    }
    toast.success("Assessment marked as complete. The customer has been notified.");
    setMarkingAssessment(false);
    setShowAssessmentModal(false);
    setAssessmentStartDate(undefined);
    setAssessmentTbc(false);
    loadData();
  }

  async function handleSaveStartDate() {
    if (!job || !userId) return;
    setSavingStartDate(true);
    const startDateValue = editStartTbc || !editStartDate ? null : format(editStartDate, "yyyy-MM-dd");
    const { error } = await supabase.from("jobs").update({ start_date: startDateValue }).eq("id", job.id);
    if (error) {
      toast.error("Failed to update: " + error.message);
      setSavingStartDate(false);
      return;
    }
    const agencyName = job.agency_profiles?.agency_name || "the agency";
    if (startDateValue) {
      await supabase.from("notifications").insert({
        recipient_id: job.customer_id,
        type: "start_date_set",
        message: `Your care start date with ${agencyName} has been confirmed as ${format(editStartDate!, "d MMMM yyyy")}.`,
        related_job_id: job.id,
      });
    } else {
      await supabase.from("notifications").insert({
        recipient_id: job.customer_id,
        type: "start_date_tbc",
        message: `Your care start date is still to be confirmed. ${agencyName} will be in touch.`,
        related_job_id: job.id,
      });
    }
    toast.success("Start date updated.");
    setSavingStartDate(false);
    setShowEditStartDate(false);
    loadData();
  }

  async function handleConfirmCare() {
    if (!job || !userId) return;
    setConfirmingCare(true);
    const { error } = await supabase.from("jobs").update({ status: "active" } as any).eq("id", job.id);
    if (error) {
      toast.error("Failed to activate: " + error.message);
      setConfirmingCare(false);
      return;
    }
    const customerName = customerProfile?.full_name || "The customer";
    await supabase.from("notifications").insert({
      recipient_id: job.agency_id,
      type: "care_confirmed",
      message: `${customerName} has confirmed they wish to proceed. Care is now active — you can begin submitting timesheets.`,
      related_job_id: job.id,
    });

    // Email: customer confirmed care
    sendEmail({
      userId: job.agency_id,
      subject: "The customer has confirmed they wish to proceed with care",
      bodyText: `${customerName} has confirmed they wish to proceed following the assessment. Care is now active and you can begin submitting timesheets.`,
      ctaUrl: `${window.location.origin}/job/${job.id}`,
      ctaText: "View Job",
    });
    toast.success("Care is now active!");
    setConfirmingCare(false);
    loadData();
  }

  async function handleDeclineCare() {
    if (!job || !userId) return;
    setCancelling(true);
    const { error } = await supabase.from("jobs").update({ status: "cancelled_pre_care" } as any).eq("id", job.id);
    if (error) {
      toast.error("Failed to cancel: " + error.message);
      setCancelling(false);
      return;
    }
    const customerName = customerProfile?.full_name || "The customer";
    await supabase.from("notifications").insert({
      recipient_id: job.agency_id,
      type: "cancelled_pre_care",
      message: `${customerName} has decided not to proceed following the assessment. No charges apply.`,
      related_job_id: job.id,
    });
    toast.success("Arrangement cancelled. No charges apply.");
    setCancelling(false);
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

    // Email: cancellation notification to the OTHER party
    if (isCustomerAction) {
      // Customer cancelled → email the agency
      sendEmail({
        userId: job.agency_id,
        subject: "A care arrangement has been cancelled by the customer",
        bodyText: `${customerName} has cancelled the care arrangement before care began. No charges apply.`,
        ctaUrl: `${window.location.origin}/job/${job.id}`,
        ctaText: "View Details",
      });
    } else {
      // Agency cancelled → email the customer
      sendEmail({
        userId: job.customer_id,
        subject: `Your care arrangement with ${agencyName} has been cancelled`,
        bodyText: `${agencyName} has cancelled the care arrangement before care began. No charges apply.`,
        ctaUrl: `${window.location.origin}/job/${job.id}`,
        ctaText: "View Details",
      });
    }

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
    <>
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
                  <p className="font-medium text-foreground">Action required: Please sign the Rate Agreement to begin the assessment stage</p>
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

        {/* Agency: Mark Assessment Complete button */}
        {isAgency && job.status === "assessment_pending" && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Has the care assessment taken place?</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Once marked complete, the customer will be asked to confirm whether they wish to proceed.</p>
                </div>
              </div>
              <Button onClick={() => setShowAssessmentModal(true)} disabled={markingAssessment}>
                {markingAssessment ? "Updating..." : "Mark Assessment Complete"}
              </Button>
            </div>
          </div>
        )}

        {/* Customer: Post-assessment confirmation */}
        {isCustomer && job.status === "assessment_complete" && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-8 w-8 text-primary" />
              <div>
                <p className="text-lg font-semibold text-foreground">Your assessment has taken place. Do you wish to proceed with care?</p>
                <p className="mt-1 text-sm text-muted-foreground">Choosing to proceed will activate billing and timesheets.</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleConfirmCare} disabled={confirmingCare || cancelling}>
                  {confirmingCare ? "Activating..." : "Yes, proceed with care"}
                </Button>
                <Button variant="destructive" onClick={handleDeclineCare} disabled={cancelling || confirmingCare}>
                  {cancelling ? "Cancelling..." : "No, cancel arrangement"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Cancelling at this stage incurs no charges.</p>
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Start Date</p>
                {isAgency && ["assessment_complete", "active"].includes(job.status) && (
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    onClick={() => {
                      setEditStartDate(job.start_date ? new Date(job.start_date) : undefined);
                      setEditStartTbc(!job.start_date);
                      setShowEditStartDate(true);
                    }}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                )}
              </div>
              <p className="font-serif text-lg text-foreground">{job.start_date ? new Date(job.start_date).toLocaleDateString() : "To Be Confirmed"}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-serif text-lg text-foreground">£{Number(job.total_paid_to_date).toFixed(2)}</p>
            </div>
          </div>

          {/* Agency Info */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-3">
            <AgencyLogo logoUrl={job.agency_profiles?.logo_url} agencyName={job.agency_profiles?.agency_name || "Agency"} size="md" />
            {!job.agency_profiles?.logo_url && <Briefcase className="h-5 w-5 text-primary" />}
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

          {/* View Rate Agreement Button — visible once customer has signed */}
          {showAgreementButton && (
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link to={`/agreement/${job.id}`}>
                  <FileText className="mr-2 h-4 w-4" /> View Rate Agreement
                </Link>
              </Button>
            </div>
          )}

          {/* Cancel Pre-Care Button — agency at assessment_pending, or agency at assessment_complete */}
          {isAgency && isPreCare && (
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
          {/* Cancel Pre-Care Button — customer at assessment_pending only (assessment_complete has inline buttons) */}
          {isCustomer && job.status === "assessment_pending" && (
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

      {/* Assessment Complete Modal */}
      <Dialog open={showAssessmentModal} onOpenChange={setShowAssessmentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Assessment Complete</DialogTitle>
            <DialogDescription>
              Set an agreed start date for care, or leave it to be confirmed later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Agreed Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !assessmentStartDate && "text-muted-foreground"
                    )}
                    disabled={assessmentTbc}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {assessmentStartDate ? format(assessmentStartDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={assessmentStartDate}
                    onSelect={setAssessmentStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tbc"
                checked={assessmentTbc}
                onCheckedChange={(checked) => {
                  setAssessmentTbc(!!checked);
                  if (checked) setAssessmentStartDate(undefined);
                }}
              />
              <label htmlFor="tbc" className="text-sm text-foreground cursor-pointer">To Be Confirmed (e.g. waiting for hospital discharge)</label>
            </div>
            <p className="text-xs text-muted-foreground">You can update the start date later from the job detail page.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssessmentModal(false)}>Cancel</Button>
            <Button onClick={handleMarkAssessmentComplete} disabled={markingAssessment}>
              {markingAssessment ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Start Date Modal */}
      <Dialog open={showEditStartDate} onOpenChange={setShowEditStartDate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Start Date</DialogTitle>
            <DialogDescription>
              Update the agreed care start date. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Agreed Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editStartDate && "text-muted-foreground"
                    )}
                    disabled={editStartTbc}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editStartDate ? format(editStartDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editStartDate}
                    onSelect={setEditStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-tbc"
                checked={editStartTbc}
                onCheckedChange={(checked) => {
                  setEditStartTbc(!!checked);
                  if (checked) setEditStartDate(undefined);
                }}
              />
              <label htmlFor="edit-tbc" className="text-sm text-foreground cursor-pointer">To Be Confirmed</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditStartDate(false)}>Cancel</Button>
            <Button onClick={handleSaveStartDate} disabled={savingStartDate}>
              {savingStartDate ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
