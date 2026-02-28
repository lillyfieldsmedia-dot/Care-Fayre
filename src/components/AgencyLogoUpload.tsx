import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, Building2 } from "lucide-react";

interface AgencyLogoUploadProps {
  profileId: string;
  currentLogoUrl: string | null;
  onUploaded: (url: string | null) => void;
}

export function AgencyLogoUpload({ profileId, currentLogoUrl, onUploaded }: AgencyLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      toast.error("Only JPG, PNG, or WebP images are allowed");
      return;
    }

    setUploading(true);
    try {
      const path = `${profileId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("agency-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("agency-logos")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase
        .from("agency_profiles")
        .update({ logo_url: publicUrl } as any)
        .eq("id", profileId);

      if (updateError) throw updateError;

      onUploaded(publicUrl);
      toast.success("Logo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      // Remove from storage (best-effort, may not exist at exact path)
      await supabase.storage.from("agency-logos").remove([`${profileId}/logo.jpg`, `${profileId}/logo.png`, `${profileId}/logo.webp`, `${profileId}/logo.jpeg`]);

      const { error } = await supabase
        .from("agency_profiles")
        .update({ logo_url: "" } as any)
        .eq("id", profileId);

      if (error) throw error;
      onUploaded(null);
      toast.success("Logo removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {currentLogoUrl ? (
        <img src={currentLogoUrl} alt="Agency logo" className="h-16 w-16 rounded-lg object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="mr-1 h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload Logo"}
          </Button>
          {currentLogoUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
              <X className="mr-1 h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP, max 2MB</p>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
    </div>
  );
}
