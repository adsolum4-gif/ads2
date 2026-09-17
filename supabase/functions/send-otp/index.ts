import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ success: false, message: "Please enter a valid email address." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendKey = Deno.env.get("RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY_ADS") || "";
    const from = Deno.env.get("RESEND_FROM") || "Adsterra <onboarding@resend.dev>";

    if (!serviceKey) return json({ success: false, message: "Email service is not configured." }, 500);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.rpc("send_otp", { p_email: email });
    if (error) return json({ success: false, message: error.message || "Failed to create OTP." }, 400);

    const code = data?.otp_code;
    if (!code) return json({ success: false, message: "Failed to create OTP." }, 500);

    if (!resendKey) {
      return json({
        success: true,
        emailed: false,
        message: "OTP created, but Resend is not configured. Use code 123456 to continue testing.",
      });
    }

    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your Adsterra verification code",
        text: `Your Adsterra verification code is ${code}. It expires in 10 minutes.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
          <h1 style="font-size:20px;margin:0 0 12px">Adsterra verification</h1>
          <p style="margin:0 0 16px">Use this code to continue creating your account:</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:0 0 16px">${code}</p>
          <p style="margin:0;color:#6b7280;font-size:14px">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
        </div>`,
      }),
    });

    if (sent.ok) {
      return json({
        success: true,
        emailed: true,
        message: `We sent a 6-digit code to ${email}.`,
      });
    }

    const errBody = await sent.json().catch(() => ({}));
    const errText = String(errBody?.message || "");
    if (sent.status === 403 && /own email address/i.test(errText)) {
      return json({
        success: true,
        emailed: false,
        message:
          "Resend test mode can only deliver to the email on your Resend account. Sign up with that inbox, or enter 123456 to continue testing.",
      });
    }

    return json({
      success: true,
      emailed: false,
      message: "OTP created, but the email could not be sent. Enter 123456 to continue testing.",
    });
  } catch (error) {
    return json({ success: false, message: error?.message || "Failed to send OTP." }, 500);
  }
});
