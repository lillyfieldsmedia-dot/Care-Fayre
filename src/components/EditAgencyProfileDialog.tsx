import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

const CARE_TYPE_OPTIONS = [
  "Personal Care", "Dementia Care", "Overnight Care", "Live-in Care",
  "Companionship", "Respite Care", "Palliative Care", "Learning Disability Support",
];

type Props = {
  profileId: string;
  initial: {
    phone: string;
    website: string;
    bio: string;
    cqc_explanation: string;
    agency_name?: string;
    office_address?: string;
    years_in_operation?: number | null;
    care_types_offered?: string[];
    service_radius_miles?: number;
    service_area_postcodes?: string[];
    cqc_location_id?: string;
    cqc_rating?: string | null;
  };
  onSaved: () => void;
};

export function EditAgencyProfileDialog({ profileId, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maxRadius, setMaxRadius] = useState(100);

  // Fields
  const [agencyName, setAgencyName] = useState(initial.agency_name || "");
  const [phone, setPhone] = useState(initial.phone);
  const [website, setWebsite] = useState(initial.website);
  const [officeAddress, setOfficeAddress] = useState(initial.office_address || "");
  const [bio, setBio] = useState(initial.bio);
  const [yearsInOperation, setYearsInOperation] = useState<number | "">(initial.years_in_operation ?? "");
  const [careTypesOffered, setCareTypesOffered] = useState<string[]>(initial.care_types_offered || []);
  const [serviceRadius, setServiceRadius] = useState(initial.service_radius_miles || 25);
  const [serviceAreaPostcodes, setServiceAreaPostcodes] = useState((initial.service_area_postcodes || []).join(", "));
  const [cqcExplanation, setCqcExplanation] = useState(initial.cqc_explanation);

  useEffect(() => {
    supabase.from("app_settings").select("max_radius_miles").limit(1).single().then(({ data }) => {
      if (data) setMaxRadius(data.max_radius_miles);
    });
  }, []);

  // Reset fields when dialog opens with fresh initial values
  useEffect(() => {
    if (open) {
      setAgencyName(initial.agency_name || "");
      setPhone(initial.phone);
      setWebsite(initial.website);
      setOfficeAddress(initial.office_address || "");
      setBio(initial.bio);
      setYearsInOperation(initial.years_in_operation ?? "");
      setCareTypesOffered(initial.care_types_offered || []);
      setServiceRadius(initial.service_radius_miles || 25);
      setServiceAreaPostcodes((initial.service_area_postcodes || []).join(", "));
      setCqcExplanation(initial.cqc_explanation);
    }
  }, [open, initial]);

  function toggleCareType(ct: string) {
    setCareTypesOffered(prev => prev.includes(ct) ? prev.filter(t => t !== ct) : [...prev, ct]);
  }

  const showCqcExplanation = initial.cqc_rating && !["Outstanding", "Good"].includes(initial.cqc_rating);

  async function handleSave() {
    setSaving(true);
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

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Profile updated");
      setOpen(false);
      onSaved();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1 h-4 w-4" /> Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Agency Profile</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Basic Info */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Info</h3>
              <div>
                <Label htmlFor="agencyName">Agency Name</Label>
                <Input id="agencyName" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="020 1234 5678" />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.example.com" />
                </div>
              </div>
              <div>
                <Label htmlFor="officeAddress">Office Address</Label>
                <Textarea id="officeAddress" value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} placeholder="Full office address" rows={2} />
              </div>
            </section>

            {/* About */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About</h3>
              <div>
                <Label htmlFor="bio">Bio / Description</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your agency..." rows={4} />
              </div>
              <div>
                <Label htmlFor="years">Years in Operation</Label>
                <Input id="years" type="number" min={0} value={yearsInOperation} onChange={(e) => setYearsInOperation(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 5" />
              </div>
              <div>
                <Label>Care Types Offered</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CARE_TYPE_OPTIONS.map(ct => (
                    <label key={ct} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={careTypesOffered.includes(ct)} onCheckedChange={() => toggleCareType(ct)} />
                      {ct}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* Service Area */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Service Area</h3>
              <div>
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
              <div>
                <Label htmlFor="postcodes">Primary Postcode Areas</Label>
                <Input id="postcodes" value={serviceAreaPostcodes} onChange={(e) => setServiceAreaPostcodes(e.target.value)} placeholder="e.g. SW1, EC2, W1" />
                <p className="mt-1 text-xs text-muted-foreground">Comma-separated postcode areas you cover</p>
              </div>
            </section>

            {/* CQC */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">CQC</h3>
              {initial.cqc_location_id && (
                <div>
                  <Label>CQC Location ID</Label>
                  <Input value={initial.cqc_location_id} disabled className="bg-muted" />
                </div>
              )}
              {showCqcExplanation && (
                <div>
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
            </section>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
