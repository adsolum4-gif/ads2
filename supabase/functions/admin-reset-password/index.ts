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
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return json({ message: "Not authenticated" }, 401);
    }

    const { data: isAdmin, error: adminErr } = await userClient.rpc("is_admin");
    if (adminErr || !isAdmin) {
      return json({ message: "Not authorized" }, 403);
    }

    const body = await req.json();
    const userId = body.user_id;
    const password = String(body.password || "");
    const adminPassword = String(body.admin_password || "");

    if (!userId) return json({ message: "User is required" }, 400);
    if (password.length < 6) return json({ message: "Password must be at least 6 characters" }, 400);
    if (!adminPassword) return json({ message: "Administrator password is required" }, 400);

    const verifier = createClient(supabaseUrl, anonKey);
    const email = authData.user.email;
    if (!email) return json({ message: "Admin account is missing an email" }, 400);

    const { error: pwErr } = await verifier.auth.signInWithPassword({ email, password: adminPassword });
    if (pwErr) return json({ message: "Administrator password is incorrect" }, 403);

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (updateErr) return json({ message: updateErr.message || "Failed to reset password" }, 400);

    return json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return json({ message: error?.message || "Failed to reset password" }, 500);
  }
});
