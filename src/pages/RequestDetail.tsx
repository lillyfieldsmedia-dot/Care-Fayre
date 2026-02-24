import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Clock, Users, AlertCircle, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);

  // Bid modal state
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidRate, setBidRate] = useState("");
  const [bidOvernightRate, setBidOvernightRate] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (user) {
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      setUserRole(roleData?.role ?? null);
    }

    const { data: reqData } = await supabase.from("care_requests").select("*").eq("id", id).single();
    setRequest(reqData);

    const { data: bidData } = await supabase
      .from("bids")
      .select("*, agency_profiles(*)")
      .eq("care_request_id", id)
      .eq("status", "active")
      .order("hourly_rate", { ascending: true });
    setBids(bidData || []);
    setLoading(false);
  }

  const hasOvernight = request?.care_types?.includes("Overnight Care") && request?.nights_per_week;

  async function handleAcceptBid(bidId: string) {
    setAcceptingBid(bidId);
    try {
      const bid = bids.find((b) => b.id === bidId);
      if (!bid) return;

      await supabase.from("care_requests").update({ status: "accepted", winning_bid_id: bidId }).eq("id", id);
      await supabase.from("bids").update({ status: "accepted" }).eq("id", bidId);
      await supabase.from("bids").update({ status: "rejected" }).eq("care_request_id", id).neq("id", bidId);

      const { data: jobData, error: jobError } = await supabase.from("jobs").insert({
        care_request_id: id,
        winning_bid_id: bidId,
        customer_id: userId,
        agency_id: bid.bidder_id,
        agency_profile_id: bid.agency_profile_id,
        locked_hourly_rate: bid.hourly_rate,
        agreed_hours_per_week: request.hours_per_week,
        start_date: request.start_date,
        status: "pending",
      }).select("id").single();

      if (jobError) throw jobError;

      const [profileRes, agencyRes] = await Promise.all([
        supabase.from("profiles").select("full_name, postcode").eq("user_id", userId!).single(),
        supabase.from("agency_profiles").select("agency_name, cqc_provider_id").eq("id", bid.agency_profile_id).single(),
      ]);

      const holderProfile = profileRes.data;
      const agencyProfile = agencyRes.data;

      const STANDARD_TERMS = [
        "Either party may cancel with 2 weeks' written notice via the platform.",
        "Payment is collected weekly following timesheet approval.",
        "The hourly rate is locked for the duration of this agreement and cannot be changed without a new agreement.",
        "CareMatch UK acts as payment intermediary only and is not liable for the delivery of care services.",
        "The agency confirms they hold current public liability insurance and all staff are DBS checked.",
        "Any safeguarding concerns must be reported immediately to the relevant local authority.",
      ];

      const overnightSection = hasOvernight
        ? `\nOvernight Shift Rate: £${Number(bid.overnight_rate || 0).toFixed(2)} per night\nNights per Week: ${request.nights_per_week}\nNight Type: ${request.night_type === "sleeping" ? "Sleeping night" : "Waking night"}`
        : "";

      const agreementText = `RATE AGREEMENT

Account Holder: ${holderProfile?.full_name || "—"}
Account Holder Address: ${holderProfile?.postcode || "—"}

Care Recipient: ${request.recipient_name || "—"}
Date of Birth: ${request.recipient_dob ? new Date(request.recipient_dob).toLocaleDateString() : "—"}
Care Address: ${request.recipient_address || "—"}
Relationship to Account Holder: ${request.relationship_to_holder || "—"}

Agency: ${agencyProfile?.agency_name || "—"}
CQC Location ID: ${agencyProfile?.cqc_provider_id || "—"}

Locked Hourly Rate: £${Number(bid.hourly_rate).toFixed(2)}
Hours per Week: ${request.hours_per_week}${overnightSection}
Frequency: ${request.frequency}
Start Date: ${request.start_date ? new Date(request.start_date).toLocaleDateString() : "TBD"}
Care Types: ${(request.care_types || []).join(", ")}

STANDARD TERMS:
${STANDARD_TERMS.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`;

      await supabase.from("contracts").insert({
        job_id: jobData.id,
        customer_id: userId,
        agency_id: bid.bidder_id,
        agreement_text: agreementText,
      });

      await supabase.from("notifications").insert({
        recipient_id: bid.bidder_id,
        type: "agreement_pending",
        message: "A customer has accepted your bid — please review and sign the Rate Agreement",
        related_job_id: jobData.id,
      });

      toast.success("Bid accepted! Please review and sign the Rate Agreement.");
      navigate(`/agreement/${jobData.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to accept bid");
    } finally {
      setAcceptingBid(null);
    }
  }

  async function handlePlaceBid() {
    setSubmittingBid(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: agencyProfile } = await supabase.from("agency_profiles").select("id").eq("user_id", user.id).single();
      if (!agencyProfile) throw new Error("Agency profile not found");

      const rate = parseFloat(bidRate);
      if (isNaN(rate) || rate <= 0) throw new Error("Invalid daytime rate");

      let overnightRate: number | null = null;
      if (hasOvernight) {
        overnightRate = parseFloat(bidOvernightRate);
        if (isNaN(overnightRate) || overnightRate <= 0) throw new Error("Invalid overnight rate");
      }

      const { error } = await supabase.from("bids").insert({
        care_request_id: id,
        bidder_id: user.id,
        agency_profile_id: agencyProfile.id,
        hourly_rate: rate,
        overnight_rate: overnightRate,
        notes: bidNotes,
      } as any);

      if (error) throw error;

      const agencyProfileData = await supabase.from("agency_profiles").select("agency_name").eq("id", agencyProfile.id).single();
      const agencyName = agencyProfileData.data?.agency_name || "An agency";
      const careType = (request.care_types || []).join(", ") || "care";

      await supabase.from("notifications").insert({
        recipient_id: request.creator_id,
        type: "new_bid",
        message: `${agencyName} placed a bid of £${rate.toFixed(2)}/hr on your ${careType} request`,
        related_request_id: id,
      });

      const newLowest = request.lowest_bid_rate ? Math.min(Number(request.lowest_bid_rate), rate) : rate;
      await supabase.from("care_requests").update({
        lowest_bid_rate: newLowest,
        bids_count: (request.bids_count || 0) + 1,
      }).eq("id", id);

      toast.success("Bid placed successfully!");
      setShowBidModal(false);
      setBidRate("");
      setBidOvernightRate("");
      setBidNotes("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to place bid");
    } finally {
      setSubmittingBid(false);
    }
  }

  function calcWeeklyTotal(bid: any) {
    const daytime = Number(bid.hourly_rate) * (request?.hours_per_week || 0);
    const overnight = hasOvernight ? Number(bid.overnight_rate || 0) * (request?.nights_per_week || 0) : 0;
    return { daytime, overnight, total: daytime + overnight };
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-20 text-center text-muted-foreground">Loading...</div>
    </div>
  );

  if (!request) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-20 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 font-serif text-xl text-foreground">Request not found</h2>
      </div>
    </div>
  );

  const isCreator = userId === request.creator_id;
  const isAgency = userRole === "agency";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="mx-auto max-w-3xl">
          {/* Request Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-serif text-2xl text-foreground">{request.postcode}</span>
                  <Badge className={request.status === "open" ? "bg-accent text-accent-foreground" : "bg-muted"}>
                    {request.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {request.care_types?.map((ct: string) => (
                    <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                  ))}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{request.hours_per_week} hrs/week · {request.frequency}</p>
                {hasOvernight && (
                  <p className="flex items-center justify-end gap-1 text-primary">
                    <Moon className="h-3 w-3" />
                    {request.nights_per_week} {request.night_type === "sleeping" ? "sleeping" : "waking"} nights/week
                  </p>
                )}
                {request.bid_deadline && (
                  <p className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    Closes {new Date(request.bid_deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            {request.description && (
              <p className="mt-4 text-sm text-muted-foreground">{request.description}</p>
            )}
            {isAgency && request.status === "open" && (
              <Button className="mt-4" onClick={() => setShowBidModal(true)}>Place a Bid</Button>
            )}
          </div>

          {/* Bids */}
          <div className="mt-8">
            <h2 className="font-serif text-xl text-foreground">
              <Users className="mr-2 inline h-5 w-5" />
              Bids Received ({bids.length})
            </h2>
            {bids.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-card py-12 text-center">
                <p className="text-muted-foreground">No bids yet. Agencies will start bidding soon.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {bids.map((bid, i) => {
                  const weekly = calcWeeklyTotal(bid);
                  return (
                    <div key={bid.id} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--card-shadow-hover)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{bid.agency_profiles?.agency_name || "Agency"}</span>
                            <CQCRatingBadge rating={bid.agency_profiles?.cqc_rating} />
                            {i === 0 && <Badge className="bg-accent text-accent-foreground">Lowest</Badge>}
                          </div>
                          {bid.notes && <p className="mt-2 text-sm text-muted-foreground">{bid.notes}</p>}
                          {bid.distance_miles && <p className="mt-1 text-xs text-muted-foreground">{Number(bid.distance_miles).toFixed(1)} miles away</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-serif text-2xl text-foreground">£{Number(bid.hourly_rate).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">per hour (daytime)</p>
                          {hasOvernight && bid.overnight_rate && (
                            <>
                              <p className="mt-1 font-serif text-lg text-foreground">£{Number(bid.overnight_rate).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">per night ({request.night_type === "sleeping" ? "sleeping" : "waking"})</p>
                            </>
                          )}
                          <div className="mt-2 space-y-0.5 border-t border-border pt-2 text-xs text-muted-foreground">
                            <p>Daytime: £{weekly.daytime.toFixed(2)}/wk</p>
                            {hasOvernight && bid.overnight_rate && (
                              <p>Overnight: £{weekly.overnight.toFixed(2)}/wk</p>
                            )}
                            <p className="font-medium text-foreground">Total: £{weekly.total.toFixed(2)}/wk</p>
                          </div>
                          {isCreator && request.status === "open" && (
                            <Button
                              size="sm"
                              className="mt-3"
                              onClick={() => handleAcceptBid(bid.id)}
                              disabled={acceptingBid === bid.id}
                            >
                              {acceptingBid === bid.id ? "Accepting..." : "Accept Bid"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Place Bid Modal */}
      <Dialog open={showBidModal} onOpenChange={setShowBidModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Place Your Bid</DialogTitle>
            <DialogDescription>
              {request.lowest_bid_rate
                ? `Current lowest bid: £${Number(request.lowest_bid_rate).toFixed(2)}/hr`
                : "No bids yet — be the first!"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {hasOvernight ? "Daytime Hourly Rate (£)" : "Your Hourly Rate (£)"}
              </label>
              <input
                type="number"
                step="0.50"
                min="1"
                value={bidRate}
                onChange={(e) => setBidRate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="e.g. 18.50"
              />
            </div>
            {hasOvernight && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Overnight Shift Rate (£ per night)
                </label>
                <p className="text-xs text-muted-foreground">
                  Fixed rate per {request.night_type === "sleeping" ? "sleeping" : "waking"} night shift · {request.nights_per_week} nights/week
                </p>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={bidOvernightRate}
                  onChange={(e) => setBidOvernightRate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g. 80"
                />
              </div>
            )}
            {/* Weekly cost estimate */}
            {bidRate && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                <p className="font-medium text-foreground">Weekly Cost Estimate</p>
                <div className="mt-1 space-y-1 text-muted-foreground">
                  <p>Daytime: {request.hours_per_week} hrs × £{parseFloat(bidRate || "0").toFixed(2)} = £{(request.hours_per_week * parseFloat(bidRate || "0")).toFixed(2)}</p>
                  {hasOvernight && bidOvernightRate && (
                    <p>Overnight: {request.nights_per_week} nights × £{parseFloat(bidOvernightRate || "0").toFixed(2)} = £{(request.nights_per_week * parseFloat(bidOvernightRate || "0")).toFixed(2)}</p>
                  )}
                  <p className="border-t border-border pt-1 font-medium text-foreground">
                    Combined Total: £{(
                      (request.hours_per_week * parseFloat(bidRate || "0")) +
                      (hasOvernight && bidOvernightRate ? request.nights_per_week * parseFloat(bidOvernightRate || "0") : 0)
                    ).toFixed(2)}/week
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes (optional)</label>
              <textarea
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Tell the customer why they should choose your agency..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBidModal(false)}>Cancel</Button>
            <Button onClick={handlePlaceBid} disabled={submittingBid}>
              {submittingBid ? "Submitting..." : "Submit Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}