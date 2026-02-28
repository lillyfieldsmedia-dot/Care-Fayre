import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AgencyLogoUpload } from "@/components/AgencyLogoUpload";

const CARE_TYPE_OPTIONS = [
  "Personal Care", "Dementia Care", "Overnight Care", "Live-in Care",
  "Companionship", "Respite Care", "Palliative Care", "Learning Disability Support",
];

export default function AgencyProfileEdit() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [maxRadius, setMaxRadius] = useState(100);

  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [bio, setBio] = useState("");
  const [yearsInOperation, setYearsInOperation] = useState<number | "">(0);
  const [careTypesOffered, setCareTypesOffered] = useState<string[]>([]);
  const [serviceRadius, setServiceRadius] = useState(25);
  const [serviceAreaPostcodes, setServiceAreaPostcodes] = useState("");
  const [cqcLocationId, setCqcLocationId] = useState("");
  const [cqcRating, setCqcRating] = useState<string | null>(null);
  const [cqcExplanation, setCqcExplanation] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const [{ data: { user } }, { data: settings }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("app_settings").select("max_radius_miles").limit(1).single(),
    ]);
    if (settings) setMaxRadius(settings.max_radius_miles);
    if (!user) return;

    const { data } = await supabase
      .from("agency_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfileId(data.id);
      setAgencyName(data.agency_name || "");
      setPhone(data.phone || "");
      setWebsite(data.website || "");
      setOfficeAddress((data as any).office_address || "");
      setBio(data.bio || "");
      setYearsInOperation(data.years_in_operation ?? "");
      setCareTypesOffered((data as any).care_types_offered || []);
      setServiceRadius(data.service_radius_miles || 25);
      setServiceAreaPostcodes((data.service_area_postcodes || []).join(", "));
      setCqcLocationId(data.cqc_location_id || "");
      setCqcRating(data.cqc_rating || null);
      setCqcExplanation(data.cqc_explanation || "");
      setLogoUrl((data as any).logo_url || null);
    }
    setLoading(false);
  }

  function toggleCareType(ct: string) {
    setCareTypesOffered(prev => prev.includes(ct) ? prev.filter(t => t !== ct) : [...prev, ct]);
  }

  const showCqcExplanation = cqcRating && !["Outstanding", "Good"].includes(cqcRating);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clampedRadius = Math.min(serviceRadius, maxRadius);
      const postcodeArray = serviceAreaPostcodes.split(",").map(s => s.trim()).filter(Boolean);

      const { error } = await supabase
        .from("agency_profiles")
        .update({
          agency_name: agencyName,
          phone,
          website,
          office_address: officeAddress,
          bio,
          years_in_operation: yearsInOperation === "" ? null : Number(yearsInOperation),
          care_types_offered: careTypesOffered,
          service_radius_miles: clampedRadius,
          service_area_postcodes: postcodeArray,
          cqc_explanation: cqcExplanation,
        } as any)
        .eq("id", profileId);

      if (error) throw error;
      toast.success("Agency profile updated!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="mx-auto max-w-lg">
          <h1 className="font-serif text-3xl text-foreground">Agency Profile</h1>
          {loading ? (
            <p className="mt-4 text-muted-foreground">Loading...</p>
          ) : (
            <form onSubmit={handleSave} className="mt-6 space-y-6">
              {/* Basic Info */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 font-serif text-lg text-foreground">Basic Info</h2>
                <div className="space-y-4">
                  <AgencyLogoUpload profileId={profileId} currentLogoUrl={logoUrl} onUploaded={setLogoUrl} />
                  <div className="space-y-2">
                    <Label htmlFor="agencyName">Agency Name</Label>
                    <Input id="agencyName" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="020 1234 5678" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.example.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officeAddress">Office Address</Label>
                    <Textarea id="officeAddress" value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} rows={2} placeholder="Full office address" />
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 font-serif text-lg text-foreground">About</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio / Description</Label>
                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell customers about your agency..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years">Years in Operation</Label>
                    <Input id="years" type="number" min={0} value={yearsInOperation} onChange={(e) => setYearsInOperation(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Care Types Offered</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {CARE_TYPE_OPTIONS.map(ct => (
                        <label key={ct} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={careTypesOffered.includes(ct)} onCheckedChange={() => toggleCareType(ct)} />
                          {ct}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Area */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 font-serif text-lg text-foreground">Service Area</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Service Radius: {serviceRadius} miles (max {maxRadius})</Label>
                    <Slider
                      value={[serviceRadius]}
                      onValueChange={([v]) => setServiceRadius(v)}
                      min={1}
                      max={maxRadius}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcodes">Primary Postcode Areas</Label>
                    <Input id="postcodes" value={serviceAreaPostcodes} onChange={(e) => setServiceAreaPostcodes(e.target.value)} placeholder="e.g. SW1, EC2, W1" />
                    <p className="text-xs text-muted-foreground">Comma-separated postcode areas you cover</p>
                  </div>
                </div>
              </div>

              {/* CQC */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 font-serif text-lg text-foreground">CQC</h2>
                <div className="space-y-4">
                  {cqcLocationId && (
                    <div className="space-y-2">
                      <Label>CQC Location ID</Label>
                      <Input value={cqcLocationId} disabled className="bg-muted" />
                    </div>
                  )}
                  {showCqcExplanation && (
                    <div className="space-y-2">
                      <Label htmlFor="cqcExplanation">CQC Rating Explanation</Label>
                      <Textarea
                        id="cqcExplanation"
                        value={cqcExplanation}
                        onChange={(e) => setCqcExplanation(e.target.value)}
                        placeholder="Explain improvements made since inspection..."
                        rows={4}
                      />
                    </div>
                  )}
                  {!cqcLocationId && !showCqcExplanation && (
                    <p className="text-sm text-muted-foreground">No CQC data to display.</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
