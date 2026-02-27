import { supabase } from "@/integrations/supabase/client";

type SendEmailParams = {
  userId: string;
  subject: string;
  bodyText: string;
  ctaUrl?: string;
  ctaText?: string;
};

export async function sendEmail({ userId, subject, bodyText, ctaUrl, ctaText }: SendEmailParams): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: { userId, subject, bodyText, ctaUrl, ctaText },
    });
    if (error) {
      console.error("Email send failed:", error);
    }
  } catch (e) {
    // Fire-and-forget — don't block the UI flow
    console.error("Email send error:", e);
  }
}
