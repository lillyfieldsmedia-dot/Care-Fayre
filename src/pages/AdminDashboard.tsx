import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  FileText,
  CreditCard,
  Settings,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { CQCRatingBadge } from "@/components/CQCRatingBadge";

type UnverifiedAgency = {
  id: string;
  agency_name: string;
  cqc_provider_id: string | null;
  cqc_location_id: string | null;
  cqc_rating: string | null;
  created_at: string;
};

type CareRequest = {
  id: string;
  postcode: string;
  care_types: string[];
  hours_per_week: number;
  status: string;
  bids_count: number;
  created_at: string;
  lowest_bid_rate: number | null;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  job_id: string;
};

type AppSettings = {
  id: string;
  min_bid_decrement: number;
  platform_fee_pct: number;
  bid_window_hours: number;
  max_radius_miles: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"agencies" | "requests" | "payments" | "settings">("agencies");
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<UnverifiedAgency[]>([]);
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      toast.error("Access denied — admin only");
      navigate("/");
      return;
    }

    await loadAll();
  }

  async function loadAll() {
    setLoading(true);
    const [agRes, reqRes, payRes, setRes] = await Promise.all([
      supabase.from("agency_profiles").select("id, agency_name, cqc_provider_id, cqc_location_id, cqc_rating, created_at").eq("cqc_verified", false),
      supabase.from("care_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("*").limit(1).single(),
    ]);

    setAgencies((agRes.data as UnverifiedAgency[]) || []);
    setRequests((reqRes.data as CareRequest[]) || []);
    setPayments((payRes.data as Payment[]) || []);
    if (setRes.data) setSettings(setRes.data as AppSettings);
    setLoading(false);
  }

  async function verifyAgency(agencyId: string) {
    setVerifying(agencyId);
    const { error } = await supabase
      .from("agency_profiles")
      .update({ cqc_verified: true })
      .eq("id", agencyId);

    if (error) {
      toast.error("Failed to verify agency");
    } else {
      toast.success("Agency verified successfully");
      setAgencies((prev) => prev.filter((a) => a.id !== agencyId));
    }
    setVerifying(null);
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        min_bid_decrement: settings.min_bid_decrement,
        platform_fee_pct: settings.platform_fee_pct,
        bid_window_hours: settings.bid_window_hours,
        max_radius_miles: settings.max_radius_miles,
      })
      .eq("id", settings.id);

    if (error) toast.error("Failed to save settings");
    else toast.success("Settings saved");
    setSaving(false);
  }

  const filteredRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const tabs = [
    { key: "agencies" as const, label: "Agency Verification", icon: ShieldCheck },
    { key: "requests" as const, label: "All Requests", icon: FileText },
    { key: "payments" as const, label: "Payments", icon: CreditCard },
    { key: "settings" as const, label: "App Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage agencies, requests, payments and settings</p>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {/* ===== AGENCY VERIFICATION ===== */}
          {tab === "agencies" && (
            agencies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-accent" />
                <h3 className="mt-4 font-serif text-lg text-foreground">All agencies verified</h3>
                <p className="mt-1 text-sm text-muted-foreground">No pending verification requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agency Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">CQC Location ID</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">CQC Location ID</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">CQC Rating</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Registered</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agencies.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{a.agency_name}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{a.cqc_provider_id || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{a.cqc_location_id || "—"}</td>
                        <td className="px-4 py-3">
                          {a.cqc_rating ? <CQCRatingBadge rating={a.cqc_rating as any} /> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => verifyAgency(a.id)}
                            disabled={verifying === a.id}
                          >
                            {verifying === a.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                            Verify
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ===== ALL CARE REQUESTS ===== */}
          {tab === "requests" && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Label className="text-sm text-muted-foreground">Filter by status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="accepting_bids">Accepting Bids</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-4 font-serif text-lg text-foreground">No requests found</h3>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Postcode</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Care Types</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hrs/Wk</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bids</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lowest Rate</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium text-foreground">{r.postcode}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {r.care_types.map((ct) => (
                                <span key={ct} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ct}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{r.hours_per_week}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.bids_count}</td>
                          <td className="px-4 py-3 text-foreground">{r.lowest_bid_rate ? `£${Number(r.lowest_bid_rate).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-3">
                            <Badge variant={r.status === "open" ? "default" : "secondary"}>{r.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ===== PAYMENTS ===== */}
          {tab === "payments" && (
            payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
                <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-serif text-lg text-foreground">No payments yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Payments will appear once timesheets are approved.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment ID</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Paid At</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3 font-medium text-foreground">£{Number(p.amount).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" disabled={p.status === "paid"} onClick={() => toast.info("Manual payout — coming soon")}>
                            Mark Paid
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ===== APP SETTINGS ===== */}
          {tab === "settings" && settings && (
            <div className="max-w-lg rounded-xl border border-border bg-card p-6">
              <h2 className="font-serif text-xl text-foreground">Platform Settings</h2>
              <p className="mb-6 text-sm text-muted-foreground">Configure marketplace parameters</p>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="min_bid">Minimum Bid Decrement (£)</Label>
                  <Input
                    id="min_bid"
                    type="number"
                    step="0.5"
                    value={settings.min_bid_decrement}
                    onChange={(e) => setSettings({ ...settings, min_bid_decrement: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fee">Platform Fee (%)</Label>
                  <Input
                    id="fee"
                    type="number"
                    step="0.5"
                    value={settings.platform_fee_pct}
                    onChange={(e) => setSettings({ ...settings, platform_fee_pct: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="window">Bid Window (hours)</Label>
                  <Input
                    id="window"
                    type="number"
                    value={settings.bid_window_hours}
                    onChange={(e) => setSettings({ ...settings, bid_window_hours: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="radius">Max Radius (miles)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={settings.max_radius_miles}
                    onChange={(e) => setSettings({ ...settings, max_radius_miles: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>

                <Button onClick={saveSettings} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
