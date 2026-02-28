import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Building2, ArrowLeft } from "lucide-react";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedRole = searchParams.get("role") as "customer" | "agency" | null;

  const [step, setStep] = useState<1 | 2>(preselectedRole ? 2 : 1);
  const [role, setRole] = useState<"customer" | "agency">(preselectedRole || "customer");
  const [loading, setLoading] = useState(false);
  const [maxRadius, setMaxRadius] = useState(25);

  // Common fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");

  // Agency fields
  const [agencyName, setAgencyName] = useState("");
  const [cqcLocationId, setCqcLocationId] = useState("");
  const [serviceRadius, setServiceRadius] = useState(25);
  const [cqcConfirm, setCqcConfirm] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("max_radius_miles").limit(1).single().then(({ data }) => {
      if (data) {
        setMaxRadius(data.max_radius_miles);
        setServiceRadius(data.max_radius_miles);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Signup failed");

      const userId = data.user.id;

      // Update profile
      await supabase.from("profiles").update({ full_name: fullName, phone, postcode }).eq("user_id", userId);

      // Set role
      await supabase.from("user_roles").insert({ user_id: userId, role });

      // Create agency profile if applicable
      if (role === "agency") {
        await supabase.from("agency_profiles").insert({
          user_id: userId,
          agency_name: agencyName,
          cqc_location_id: cqcLocationId,
          service_radius_miles: serviceRadius,
        });
      }

      toast.success("Account created! Please check your email to verify your account.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container flex items-center justify-center py-12">
        <div className="w-full max-w-lg">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="font-serif text-3xl text-foreground">Join Care Fayre</h1>
                <p className="mt-2 text-muted-foreground">How would you like to use Care Fayre?</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  { value: "customer" as const, icon: Heart, title: "I Need Care", desc: "Find trusted care agencies for your family" },
                  { value: "agency" as const, icon: Building2, title: "I'm a Care Agency", desc: "Bid on care requests and grow your business" },
                ]).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setRole(option.value); setStep(2); }}
                    className={`group flex flex-col items-center rounded-xl border-2 border-border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-[var(--card-shadow-hover)] ${role === option.value ? "border-primary shadow-[var(--card-shadow-hover)]" : ""}`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <option.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="mt-4 font-serif text-lg text-foreground">{option.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-3">
                {!preselectedRole && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <h1 className="font-serif text-2xl text-foreground">
                    {role === "customer" ? "Create Your Account" : "Register Your Agency"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {role === "customer" ? "Find trusted home care near you" : "Start receiving care requests"}
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{role === "agency" ? "Contact Person" : "Full Name"}</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">{role === "agency" ? "HQ Postcode" : "Postcode"}</Label>
                  <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. SW1A 1AA" required />
                </div>

                {role === "agency" && (
                  <>
                    <hr className="border-border" />
                    <div className="space-y-2">
                      <Label htmlFor="agencyName">Agency Name</Label>
                      <Input id="agencyName" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cqcLocation">CQC Location ID</Label>
                      <Input id="cqcLocation" value={cqcLocationId} onChange={(e) => setCqcLocationId(e.target.value)} placeholder="1-XXXXXXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="radius">Service Radius (miles): {serviceRadius} (max {maxRadius})</Label>
                      <input
                        type="range"
                        id="radius"
                        min={1}
                        max={maxRadius}
                        value={serviceRadius}
                        onChange={(e) => setServiceRadius(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={cqcConfirm} onChange={(e) => setCqcConfirm(e.target.checked)} required className="mt-1 accent-primary" />
                      <span className="text-muted-foreground">I confirm this agency is registered with the Care Quality Commission</span>
                    </label>
                  </>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
