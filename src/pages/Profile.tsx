import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email || "");
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setPostcode(data.postcode || "");
      setFullAddress((data as any).full_address || "");
      setEmergencyContactName((data as any).emergency_contact_name || "");
      setEmergencyContactPhone((data as any).emergency_contact_phone || "");
      setPreferredContactMethod((data as any).preferred_contact_method || "");
    }
    setLoading(false);
  }

  const completionFields = [fullName, phone, postcode, fullAddress, emergencyContactName, emergencyContactPhone, preferredContactMethod];
  const filledCount = completionFields.filter(f => f.trim().length > 0).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  const missingItems: string[] = [];
  if (!fullName.trim()) missingItems.push("name");
  if (!phone.trim()) missingItems.push("phone");
  if (!fullAddress.trim()) missingItems.push("address");
  if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) missingItems.push("emergency contact");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        phone,
        postcode,
        full_address: fullAddress,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        preferred_contact_method: preferredContactMethod,
      } as any).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated!");
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
          <h1 className="font-serif text-3xl text-foreground">Profile</h1>
          {loading ? (
            <p className="mt-4 text-muted-foreground">Loading...</p>
          ) : (
            <form onSubmit={handleSave} className="mt-6 space-y-6">
              {/* Completion indicator */}
              {completionPct < 100 && (
                <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Profile {completionPct}% complete</p>
                      <span className="text-xs text-muted-foreground">{filledCount}/{completionFields.length}</span>
                    </div>
                    <Progress value={completionPct} className="mt-2 h-2" />
                    {missingItems.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">Add your {missingItems.join(", ")} to complete your profile.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Personal Details */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 font-serif text-lg text-foreground">Personal Details</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={email} disabled className="bg-muted" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullAddress">Full Address</Label>
                    <Textarea id="fullAddress" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} rows={2} placeholder="Your full home address" />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 font-serif text-lg text-foreground">Emergency Contact</h2>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyName">Contact Name</Label>
                      <Input id="emergencyName" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="e.g. Jane Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Contact Phone</Label>
                      <Input id="emergencyPhone" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="e.g. 07123 456789" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactMethod">Preferred Contact Method</Label>
                    <Select value={preferredContactMethod} onValueChange={setPreferredContactMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Phone">Phone</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Text Message">Text Message</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
