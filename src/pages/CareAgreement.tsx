import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ContractData = {
  id: string;
  job_id: string;
  customer_id: string;
  agency_id: string;
  agreement_text: string;
  customer_agreed_at: string | null;
  agency_agreed_at: string | null;
};

type JobData = {
  id: string;
  locked_hourly_rate: number;
  agreed_hours_per_week: number;
  start_date: string | null;
  status: string;
  care_requests: {
    postcode: string;
    care_types: string[];
    frequency: string;
    recipient_name: string;
    recipient_dob: string | null;
    recipient_address: string;
    relationship_to_holder: string;
  } | null;
  agency_profiles: {
    agency_name: string;
    cqc_provider_id: string | null;
  } | null;
};

const AGREEMENT_TERMS = [
  "Both parties have agreed to the hourly rate above, which is fixed and cannot be changed for the duration of this care arrangement.",
  "The Agency will contact the Customer to arrange an initial care assessment.",
  "Following the assessment, both parties must confirm on CareMatch that they wish to proceed before care begins.",
  "Either party may withdraw following the assessment with no penalty and no charges.",
  "Once care begins, the Agency will submit weekly timesheets via CareMatch. Payment will be collected by CareMatch and disbursed to the Agency minus a platform fee.",
  "This agreement does not constitute a contract of care. A separate care contract may be provided by the Agency at the assessment stage.",
];

export default function CareAgreement() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [holderProfile, setHolderProfile] = useState<{ full_name: string; postcode: string | null } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [jobId]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !jobId) return;
    setUserId(user.id);

    const [contractRes, jobRes] = await Promise.all([
      supabase.from("contracts").select("*").eq("job_id", jobId).single(),
      supabase.from("jobs").select("*, care_requests(postcode, care_types, frequency, recipient_name, recipient_dob, recipient_address, relationship_to_holder), agency_profiles(agency_name, cqc_provider_id)").eq("id", jobId).single(),
    ]);

    setContract((contractRes.data as any) || null);
    const jobData = (jobRes.data as any) || null;
    setJob(jobData);

    if (jobData) {
      const { data: profile } = await supabase.from("profiles").select("full_name, postcode").eq("user_id", jobData.customer_id).single();
      setHolderProfile(profile as any);
    }

    setLoading(false);
  }

  async function handleAgree() {
    if (!contract || !userId || !job) return;
    setSubmitting(true);

    const isCustomer = userId === contract.customer_id;
    const isAgency = userId === contract.agency_id;

    const updateField = isCustomer
      ? { customer_agreed_at: new Date().toISOString() }
      : isAgency
        ? { agency_agreed_at: new Date().toISOString() }
        : null;

    if (!updateField) return;

    const { error } = await supabase.from("contracts").update(updateField).eq("id", contract.id);
    if (error) {
      toast.error("Failed to record agreement: " + error.message);
      setSubmitting(false);
      return;
    }

    // Check if both parties have now agreed
    const otherAgreed = isCustomer ? contract.agency_agreed_at : contract.customer_agreed_at;
    if (otherAgreed) {
      // Both agreed — set to assessment_pending (not active)
      await supabase.from("jobs").update({ status: "assessment_pending" } as any).eq("id", contract.job_id);

      // Send notifications to both parties
      const agencyName = job.agency_profiles?.agency_name || "the agency";
      const customerName = holderProfile?.full_name || "the customer";

      await Promise.all([
        supabase.from("notifications").insert({
          recipient_id: contract.customer_id,
          type: "assessment_pending",
          message: `Your Rate Agreement with ${agencyName} has been signed. They will be in touch shortly to arrange a care assessment.`,
          related_job_id: contract.job_id,
        }),
        supabase.from("notifications").insert({
          recipient_id: contract.agency_id,
          type: "assessment_pending",
          message: `Your Rate Agreement with ${customerName} is signed. Please contact them as soon as possible to arrange a care assessment.`,
          related_job_id: contract.job_id,
        }),
      ]);

      toast.success("Both parties have signed! The agency will arrange a care assessment.");
      navigate(`/job/${contract.job_id}`);
    } else {
      toast.success("Agreement recorded. Waiting for the other party to sign.");
      loadData();
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!contract || !job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h2 className="font-serif text-2xl text-foreground">Agreement not found</h2>
          <Button asChild className="mt-4"><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const isCustomer = userId === contract.customer_id;
  const isAgency = userId === contract.agency_id;
  const alreadyAgreed = isCustomer ? !!contract.customer_agreed_at : isAgency ? !!contract.agency_agreed_at : false;
  const bothAgreed = !!contract.customer_agreed_at && !!contract.agency_agreed_at;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-3xl py-8">
        <Link
          to={isAgency ? "/agency-dashboard" : "/dashboard"}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-2xl text-foreground">Rate Agreement</h1>
            {bothAgreed ? (
              <Badge className="bg-accent text-accent-foreground"><CheckCircle className="mr-1 h-3 w-3" /> Fully Signed</Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground"><Clock className="mr-1 h-3 w-3" /> Pending Signature</Badge>
            )}
          </div>

          {/* Agreement Details */}
          <div className="mt-6 space-y-6">
            {/* Preamble */}
            <p className="text-sm text-foreground leading-relaxed">
              This Rate Agreement is between <span className="font-medium">{holderProfile?.full_name || "—"}</span> ("the Customer") and <span className="font-medium">{job.agency_profiles?.agency_name || "—"}</span> ("the Agency"), facilitated by CareMatch.
            </p>

            {/* Key Details */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agreed Terms</h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Agreed Hourly Rate</p>
                  <p className="font-serif text-lg font-medium text-foreground">£{Number(job.locked_hourly_rate).toFixed(2)}/hr</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Estimated Hours per Week</p>
                  <p className="font-medium text-foreground">{job.agreed_hours_per_week}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Care Type</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {job.care_requests?.care_types.map((ct) => (
                      <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium text-foreground">{job.start_date ? new Date(job.start_date).toLocaleDateString() : "To Be Confirmed"}</p>
                </div>
              </div>
            </section>

            {/* Agreement Terms */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">This Agreement Confirms That</h3>
              <ol className="mt-2 space-y-2">
                {AGREEMENT_TERMS.map((term, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="shrink-0 font-medium text-muted-foreground">{i + 1}.</span>
                    {term}
                  </li>
                ))}
              </ol>
            </section>

            {/* Agreement Status */}
            <section className="rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="text-sm font-semibold text-foreground">Signature Status</h3>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {contract.customer_agreed_at ? (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-foreground">
                    Customer: {contract.customer_agreed_at ? `Signed on ${new Date(contract.customer_agreed_at).toLocaleString()}` : "Pending"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {contract.agency_agreed_at ? (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-foreground">
                    Agency: {contract.agency_agreed_at ? `Signed on ${new Date(contract.agency_agreed_at).toLocaleString()}` : "Pending"}
                  </span>
                </div>
              </div>
            </section>

            {/* Sign Button */}
            {!alreadyAgreed && (isCustomer || isAgency) && (
              <div className="border-t border-border pt-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="agree" className="text-sm text-foreground cursor-pointer">
                    I agree to this Rate Agreement and all the terms listed above.
                  </label>
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={!agreed || submitting}
                  onClick={handleAgree}
                >
                  {submitting ? "Submitting..." : "Sign Rate Agreement"}
                </Button>
              </div>
            )}

            {alreadyAgreed && !bothAgreed && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-accent" />
                <p className="mt-2 font-medium text-foreground">You have signed this Rate Agreement</p>
                <p className="text-sm text-muted-foreground">Waiting for the other party to sign before the assessment stage begins.</p>
                <Button asChild className="mt-3" variant="outline">
                  <Link to={`/job/${contract.job_id}`}>View Job Details</Link>
                </Button>
              </div>
            )}

            {bothAgreed && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-accent" />
                <p className="mt-2 font-medium text-foreground">Both parties have signed</p>
                <p className="text-sm text-muted-foreground">The assessment stage is now underway.</p>
                <Button asChild className="mt-3" variant="outline">
                  <Link to={`/job/${contract.job_id}`}>View Job</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
