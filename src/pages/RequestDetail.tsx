import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Clock, Users, AlertCircle } from "lucide-react";
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
  const [request, setRequest] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);

  // Bid modal state
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidRate, setBidRate] = useState("");
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

  async function handleAcceptBid(bidId: string) {
    setAcceptingBid(bidId);
    try {
      const bid = bids.find((b) => b.id === bidId);
      if (!bid) return;

      await supabase.from("care_requests").update({ status: "accepted", winning_bid_id: bidId }).eq("id", id);
      await supabase.from("bids").update({ status: "accepted" }).eq("id", bidId);
      await supabase.from("bids").update({ status: "rejected" }).eq("care_request_id", id).neq("id", bidId);

      await supabase.from("jobs").insert({
        care_request_id: id,
        winning_bid_id: bidId,
        customer_id: userId,
        agency_id: bid.bidder_id,
        agency_profile_id: bid.agency_profile_id,
        locked_hourly_rate: bid.hourly_rate,
        agreed_hours_per_week: request.hours_per_week,
        start_date: request.start_date,
      });

      toast.success("Bid accepted! A job has been created.");
      loadData();
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
      if (isNaN(rate) || rate <= 0) throw new Error("Invalid rate");

      const { error } = await supabase.from("bids").insert({
        care_request_id: id,
        bidder_id: user.id,
        agency_profile_id: agencyProfile.id,
        hourly_rate: rate,
        notes: bidNotes,
      });

      if (error) throw error;

      // Update lowest_bid_rate and bids_count
      const newLowest = request.lowest_bid_rate ? Math.min(Number(request.lowest_bid_rate), rate) : rate;
      await supabase.from("care_requests").update({
        lowest_bid_rate: newLowest,
        bids_count: (request.bids_count || 0) + 1,
      }).eq("id", id);

      toast.success("Bid placed successfully!");
      setShowBidModal(false);
      setBidRate("");
      setBidNotes("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to place bid");
    } finally {
      setSubmittingBid(false);
    }
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
                {bids.map((bid, i) => (
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
                        <p className="text-xs text-muted-foreground">per hour</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          ≈ £{(Number(bid.hourly_rate) * request.hours_per_week).toFixed(2)}/week
                        </p>
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
                ))}
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
              <label className="text-sm font-medium text-foreground">Your Hourly Rate (£)</label>
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
