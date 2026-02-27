import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildEmailHtml(subject: string, bodyText: string, ctaUrl?: string, ctaText?: string): string {
  const ctaButton = ctaUrl && ctaText
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background-color:#1e3a5f;border-radius:6px;">
            <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;">
              ${ctaText}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #e4e4e7;">
              <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1e3a5f;letter-spacing:0.5px;">Care Fayre</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 12px 32px;">
              <h1 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:20px;font-weight:600;color:#18181b;">${subject}</h1>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#3f3f46;">${bodyText}</p>
              ${ctaButton}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">© 2026 Care Fayre UK. All rights reserved.</p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#a1a1aa;">This is an automated notification from Care Fayre.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("send-email: Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the caller's token using getUser (reliable across all supabase-js versions)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("send-email: Auth validation failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`send-email: Authenticated caller: ${userData.user.id}`);

    const { userId, subject, bodyText, ctaUrl, ctaText } = await req.json();
    console.log(`send-email: Request to send email to userId=${userId}, subject="${subject}"`);

    if (!userId || !subject || !bodyText) {
      console.error("send-email: Missing required fields", { userId, subject: !!subject, bodyText: !!bodyText });
      return new Response(JSON.stringify({ error: "Missing required fields: userId, subject, bodyText" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up recipient email using service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: recipientData, error: recipientError } = await adminClient.auth.admin.getUserById(userId);

    if (recipientError || !recipientData?.user?.email) {
      console.error("send-email: Could not find user email for userId:", userId, "error:", recipientError?.message);
      return new Response(JSON.stringify({ error: "Recipient email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = recipientData.user.email;
    console.log(`send-email: Resolved recipient email: ${recipientEmail}`);

    const html = buildEmailHtml(subject, bodyText, ctaUrl, ctaText);

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("send-email: RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Care Fayre <noreply@carefayre.co.uk>",
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.text();
    console.log(`send-email: Resend response status=${resendRes.status}, body=${resendBody}`);

    if (!resendRes.ok) {
      console.error(`send-email: Resend API error for ${recipientEmail}:`, resendBody);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`send-email: Successfully sent email to ${recipientEmail}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email: Unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
