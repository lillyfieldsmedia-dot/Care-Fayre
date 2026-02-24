const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationId, providerId } = await req.json();

    let url: string;
    if (locationId) {
      url = `https://api.cqc.org.uk/public/v1/locations/${encodeURIComponent(locationId)}?partnerCode=CAREMATCH`;
    } else if (providerId) {
      url = `https://api.cqc.org.uk/public/v1/providers/${encodeURIComponent(providerId)}?partnerCode=CAREMATCH`;
    } else {
      return new Response(JSON.stringify({ error: "No locationId or providerId provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "CQC API returned " + res.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();

    // Extract what we need
    const overallRating = data.currentRatings?.overall?.rating ?? null;
    const firstReport = Array.isArray(data.reports) && data.reports.length > 0 ? data.reports[0] : null;
    const reportDate = firstReport?.reportDate ?? null;
    const reportUri = firstReport?.reportUri
      ? `https://api.cqc.org.uk/public/v1${firstReport.reportUri}`
      : null;

    return new Response(
      JSON.stringify({ overallRating, reportDate, reportUri }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
