import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const CARE_TYPES = [
  "Personal Care", "Dementia Care", "Companionship", "Medication Support",
  "Mobility Assistance", "Overnight Care", "Live-in Care",
];

const FREQUENCIES = ["Daily", "Weekdays Only", "Weekends Only", "3x Per Week", "Custom"];

export default function CreateRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [postcode, setPostcode] = useState("");
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [frequency, setFrequency] = useState("Daily");
  const [startDate, setStartDate] = useState("");
  const [description, setDescription] = useState("");

  function toggleCareType(type: string) {
    setCareTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Geocode postcode via Postcodes.io
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
        const json = await res.json();
        if (json.result) {
          lat = json.result.latitude;
          lng = json.result.longitude;
        }
      } catch {}

      // Get bid window from settings
      const { data: settings } = await supabase.from("app_settings").select("bid_window_hours").limit(1).single();
      const hours = settings?.bid_window_hours ?? 72;
      const deadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("care_requests").insert({
        creator_id: user.id,
        postcode,
        latitude: lat,
        longitude: lng,
        care_types: careTypes,
        hours_per_week: hoursPerWeek,
        frequency,
        start_date: startDate || null,
        description,
        status: "open",
        bid_deadline: deadline,
      });

      if (error) throw error;
      toast.success("Care request posted! Agencies will start bidding soon.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create request");
    } finally {
      setLoading(false);
    }
  }

  const canProceed = [
    () => postcode.trim().length > 0 && careTypes.length > 0,
    () => hoursPerWeek > 0,
    () => description.trim().length > 0,
    () => true,
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-3xl text-foreground">Post a Care Request</h1>

          {/* Progress */}
          <div className="mt-6 flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 4 && <div className={`h-0.5 w-8 transition-colors ${step > s ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl text-foreground">Location & Care Type</h2>
                  <p className="text-sm text-muted-foreground">Where is care needed and what type?</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. SW1A 1AA" required />
                </div>
                <div className="space-y-2">
                  <Label>Type of Care Needed</Label>
                  <div className="flex flex-wrap gap-2">
                    {CARE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleCareType(type)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${careTypes.includes(type) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/50"}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl text-foreground">Schedule</h2>
                  <p className="text-sm text-muted-foreground">How often is care needed?</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours per Week: {hoursPerWeek}</Label>
                  <input type="range" id="hours" min={1} max={80} value={hoursPerWeek} onChange={(e) => setHoursPerWeek(Number(e.target.value))} className="w-full accent-primary" />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <div className="flex flex-wrap gap-2">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${frequency === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/50"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Preferred Start Date</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl text-foreground">About the Care Needed</h2>
                  <p className="text-sm text-muted-foreground">Help agencies understand the situation</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell agencies about the person needing care, any specific requirements, preferences, etc."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">{description.length} characters</p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl text-foreground">Review & Submit</h2>
                  <p className="text-sm text-muted-foreground">Check everything looks right</p>
                </div>
                <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Postcode</span><span className="font-medium text-foreground">{postcode}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Care Types</span><span className="font-medium text-foreground">{careTypes.join(", ")}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Hours/Week</span><span className="font-medium text-foreground">{hoursPerWeek}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Frequency</span><span className="font-medium text-foreground">{frequency}</span></div>
                  {startDate && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Start Date</span><span className="font-medium text-foreground">{startDate}</span></div>}
                  <hr className="border-border" />
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Nav buttons */}
          <div className="mt-6 flex justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as any)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            ) : <div />}
            {step < 4 ? (
              <Button onClick={() => setStep((s) => (s + 1) as any)} disabled={!canProceed[step - 1]()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
