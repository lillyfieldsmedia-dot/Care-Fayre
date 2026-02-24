import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

type Props = {
  profileId: string;
  initial: {
    phone: string;
    website: string;
    bio: string;
    cqc_explanation: string;
  };
  onSaved: () => void;
};

export function EditAgencyProfileDialog({ profileId, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(initial.phone);
  const [website, setWebsite] = useState(initial.website);
  const [bio, setBio] = useState(initial.bio);
  const [cqcExplanation, setCqcExplanation] = useState(initial.cqc_explanation);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("agency_profiles")
      .update({
        phone,
        website,
        bio,
        cqc_explanation: cqcExplanation,
      })
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Agency Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 020 1234 5678" />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="e.g. www.example.com" />
          </div>
          <div>
            <Label htmlFor="bio">Bio / Description</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your agency..." rows={4} />
          </div>
          <div>
            <Label htmlFor="cqcExplanation">CQC Rating Explanation</Label>
            <Textarea
              id="cqcExplanation"
              value={cqcExplanation}
              onChange={(e) => setCqcExplanation(e.target.value)}
              placeholder="If your CQC rating is below Good, explain improvements made since inspection..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
